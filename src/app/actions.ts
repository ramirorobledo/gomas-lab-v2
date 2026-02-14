'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';
import { validateAndCleanMarkdown, generateForensicCertificate } from '@/lib/validation';
import { buildPageIndexTree } from '@/lib/pageindex';
import { getActualPageCount } from '@/lib/pdf-utils';
import { calculateOptimalChunks } from '@/lib/pdf-splitter';
import { GEMINI_API_KEY } from '@/lib/env';
import { saveChunk, assembleFile, cleanupChunks } from '@/lib/db-chunk-store';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ExtractionRange {
    from: number;
    to: number;
    name: string;
}

// ... helper functions omitted for brevity as they are unused/internal logic
// If needed, they can be restored from previous version or validation lib

export async function uploadChunkAction(formData: FormData) {
    try {
        const uploadId = formData.get('uploadId') as string;
        const index = parseInt(formData.get('chunkIndex') as string);
        const chunk = formData.get('chunk') as File;

        if (!uploadId || isNaN(index) || !chunk) {
            throw new Error('Missing chunk data');
        }

        const buffer = Buffer.from(await chunk.arrayBuffer());
        await saveChunk(uploadId, index, buffer);

        return { success: true };
    } catch (error: any) {
        console.error('Upload Chunk Error:', error);
        return { success: false, error: error.message };
    }
}

export async function processDocumentAction(formData: FormData) {
    const startTime = Date.now();

    try {
        const rangesStr = formData.get('ranges') as string;
        const uploadId = formData.get('uploadId') as string;

        let originalBuffer: Buffer;
        let filename = 'document.pdf';
        let fileSize = 0;

        if (uploadId) {
            console.log(`Reassembling file from chunks: ${uploadId}`);
            originalBuffer = await assembleFile(uploadId);
            fileSize = originalBuffer.length;
            filename = (formData.get('filename') as string) || 'document.pdf';

            // Clean up chunks asynchronously to save DB space
            cleanupChunks(uploadId).catch(err => console.error('Cleanup error:', err));
        } else {
            const file = formData.get('file') as File;
            if (!file) {
                throw new Error('No file provided');
            }
            fileSize = file.size;
            filename = file.name;
            const arrayBuffer = await file.arrayBuffer();
            originalBuffer = Buffer.from(arrayBuffer);
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`File too large. Max 50MB, received ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
        }

        console.log(`Processing: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
        const base64 = originalBuffer.toString('base64');

        // Use gemini-1.5-flash for speed and stability
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                maxOutputTokens: 16000,
            }
        });

        // Obtener número real de páginas via pdfjs-dist
        // Convert Buffer to Uint8Array for pdfjs
        const uint8Array = new Uint8Array(originalBuffer);
        const totalPages = await getActualPageCount(uint8Array.buffer);
        console.log(`Total pages detected: ${totalPages}`);

        // Segundo: Extraer documento completo (con auto-split si >50 páginas)
        // Note: Logic simplified here to assume full document processing for this fix
        const chunks = calculateOptimalChunks(totalPages);
        let markdown: string;

        if (chunks.length === 1) {
            const response = await model.generateContent([
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64,
                    },
                },
                {
                    text: `Extrae TODO el texto de este documento en Markdown bien estructurado.
REGLAS DE FORMATO:
- Usa # para títulos principales, ## para secciones, ### para subsecciones
- TABLAS: SIEMPRE usa formato Markdown válido con fila separadora. Ejemplo:
  | Columna 1 | Columna 2 |
  |---|---|
  | dato | dato |
  NUNCA omitas la fila |---|---| en ninguna tabla.
- NO incluyas números de página sueltos
- NO repitas encabezados o pies de página que aparezcan en cada hoja
- Preserva TODA la información sustantiva del documento
- Listas con - o *
- No dejes líneas en blanco excesivas (máximo 2 consecutivas)
- Si hay texto en columnas, conviértelo a formato lineal legible
- Preserva negritas (**texto**) y cursivas (*texto*) donde existan

Sé minucioso y preciso. No omitas contenido.`,
                },
            ]);
            markdown = response.response.text();
        } else {
            console.log(`Large PDF detected (${totalPages} pages): splitting into ${chunks.length} chunks`);
            let fullMarkdown = '';
            for (const chunk of chunks) {
                console.log(`Processing chunk pages ${chunk.startPage}-${chunk.endPage}...`);
                const chunkResponse = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: 'application/pdf',
                            data: base64,
                        },
                    },
                    {
                        text: `Extrae SOLO las páginas ${chunk.startPage} a ${chunk.endPage} (inclusive) de este PDF.`,
                    },
                ]);
                fullMarkdown += chunkResponse.response.text();
                if (chunk !== chunks[chunks.length - 1]) {
                    fullMarkdown += '\n\n';
                }
            }
            markdown = fullMarkdown;
        }

        // Validación forense + limpieza de markdown
        const validation = validateAndCleanMarkdown(markdown, originalBuffer);
        const cleanedMarkdown = validation.cleaned_markdown;

        // Certificado forense
        const certificate = generateForensicCertificate(validation, 'gemini-1.5-flash');

        // PageIndex tree
        const pageIndexTree = buildPageIndexTree(cleanedMarkdown, {
            expediente: validation.legal_elements.expediente,
            juzgado: validation.legal_elements.juzgado,
        });

        // Validation score
        const highCount = validation.anomalies.filter(a => a.severity === 'high').length;
        const mediumCount = validation.anomalies.filter(a => a.severity === 'medium').length;
        const validationScore = Math.max(0, 1.0 - (highCount * 0.3) - (mediumCount * 0.1));

        const endTime = Date.now();

        return {
            success: true,
            conversionId: randomUUID(),
            filename,
            markdown: cleanedMarkdown,
            extractions: [],
            certificate: {
                hash_original: certificate.hash_original,
                hash_markdown: certificate.hash_markdown,
                integrity_hash: certificate.integrity_hash,
                timestamp: certificate.timestamp,
                status: certificate.validation_status,
            },
            anomalies: validation.anomalies,
            validationStatus: validation.validation_status,
            validationScore,
            pageIndexTree,
            pageCount: totalPages,
            processingTime: endTime - startTime,
        };

    } catch (error: any) {
        console.error('Action Error:', error);
        return {
            success: false,
            error: error.message || 'Error processing document',
            stack: error.stack
        };
    }
}
