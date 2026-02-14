import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';
import { validateAndCleanMarkdown, generateForensicCertificate } from '@/lib/validation';
import { buildPageIndexTree } from '@/lib/pageindex';
import { getUpload, deleteUpload } from '@/lib/chunk-store';
import { getActualPageCount } from '@/lib/pdf-utils';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ExtractionRange {
    from: number;
    to: number;
    name: string;
}

function estimateRangeSize(
    totalBase64Length: number,
    totalPages: number,
    rangeStart: number,
    rangeEnd: number
): number {
    const bytesPerPage = totalBase64Length / totalPages;
    const rangePages = rangeEnd - rangeStart + 1;
    return bytesPerPage * rangePages;
}

function shouldSplitRange(
    totalBase64Length: number,
    totalPages: number,
    rangeStart: number,
    rangeEnd: number
): boolean {
    const GEMINI_LIMIT = 20 * 1024 * 1024; // 20MB
    const estimatedSize = estimateRangeSize(
        totalBase64Length,
        totalPages,
        rangeStart,
        rangeEnd
    );
    return estimatedSize > GEMINI_LIMIT;
}

function splitRangeIntoChunks(
    totalBase64Length: number,
    totalPages: number,
    rangeStart: number,
    rangeEnd: number
): Array<{ start: number; end: number }> {
    const GEMINI_LIMIT = 20 * 1024 * 1024;
    const bytesPerPage = totalBase64Length / totalPages;
    const maxPagesPerChunk = Math.floor(GEMINI_LIMIT / bytesPerPage);

    const chunks: Array<{ start: number; end: number }> = [];
    let currentStart = rangeStart;

    while (currentStart <= rangeEnd) {
        const currentEnd = Math.min(currentStart + maxPagesPerChunk - 1, rangeEnd);
        chunks.push({ start: currentStart, end: currentEnd });
        currentStart = currentEnd + 1;
    }

    return chunks;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const sessionId = request.headers.get('X-Session-ID') || 'unknown';
        console.log(`Processing for session: ${sessionId}`);

        const formData = await request.formData();
        const rangesStr = formData.get('ranges') as string;
        const uploadId = formData.get('uploadId') as string | null;

        let arrayBuffer: ArrayBuffer;
        let filename: string;
        let fileSize: number;

        if (uploadId) {
            // Chunked upload path: retrieve assembled buffer from store
            const stored = getUpload(uploadId);
            if (!stored) {
                return NextResponse.json(
                    { error: 'Upload not found or expired. Please re-upload.' },
                    { status: 404 }
                );
            }
            arrayBuffer = new Uint8Array(stored.buffer).buffer as ArrayBuffer;
            filename = stored.filename;
            fileSize = stored.totalSize;
            deleteUpload(uploadId);
            console.log(`[process-pdf] Using pre-uploaded file: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
        } else {
            // Direct upload path (original behavior)
            const file = formData.get('file') as File;
            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }
            fileSize = file.size;
            filename = file.name;
            arrayBuffer = await file.arrayBuffer();
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Max 50MB, received ${(fileSize / 1024 / 1024).toFixed(2)}MB` },
                { status: 413 }
            );
        }

        console.log(`Processing: ${filename}`);

        const base64 = Buffer.from(arrayBuffer).toString('base64');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Obtener número real de páginas via pdfjs-dist
        const totalPages = await getActualPageCount(arrayBuffer);
        console.log(`Total pages detected (PDF library): ${totalPages}`);

        // Segundo: Extraer documento completo con prompt mejorado
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
- Las tablas deben tener formato Markdown correcto con fila separadora |---|---|
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

        const markdown = response.response.text();

        // Validación forense + limpieza de markdown
        const originalBuffer = Buffer.from(arrayBuffer);
        const validation = validateAndCleanMarkdown(markdown, originalBuffer);
        const cleanedMarkdown = validation.cleaned_markdown;

        // Certificado forense
        const certificate = generateForensicCertificate(validation, 'gemini-2.0-flash');

        // PageIndex tree
        const pageIndexTree = buildPageIndexTree(cleanedMarkdown, {
            expediente: validation.legal_elements.expediente,
            juzgado: validation.legal_elements.juzgado,
        });

        // Validation score (derived from anomalies)
        const highCount = validation.anomalies.filter(a => a.severity === 'high').length;
        const mediumCount = validation.anomalies.filter(a => a.severity === 'medium').length;
        const validationScore = Math.max(0, 1.0 - (highCount * 0.3) - (mediumCount * 0.1));

        // Tercero: Si hay rangos, procesarlos (auto-divide si > 20MB)
        let extractions = [];
        if (rangesStr) {
            try {
                const ranges: ExtractionRange[] = JSON.parse(rangesStr);

                for (const range of ranges) {
                    const base64Length = base64.length;

                    // Verificar si el rango necesita dividirse
                    if (shouldSplitRange(base64Length, totalPages, range.from, range.to)) {
                        console.log(`Range ${range.from}-${range.to} exceeds 20MB, splitting...`);

                        const chunks = splitRangeIntoChunks(
                            base64Length,
                            totalPages,
                            range.from,
                            range.to
                        );

                        console.log(`Split into ${chunks.length} chunks`);

                        // Procesar todos los chunks en paralelo
                        const chunkPromises = chunks.map((chunk) =>
                            model.generateContent([
                                {
                                    inlineData: {
                                        mimeType: 'application/pdf',
                                        data: base64,
                                    },
                                },
                                {
                                    text: `Extrae SOLO el contenido de las páginas ${chunk.start} a ${chunk.end} (inclusive). No incluyas contenido de otras páginas. Usa Markdown bien estructurado: # títulos, ## secciones, tablas con |---|---| separador. NO incluyas números de página ni encabezados/pies repetidos.`,
                                },
                            ])
                        );

                        const chunkResponses = await Promise.all(chunkPromises);
                        const concatenatedMarkdown = chunkResponses
                            .map((resp) => resp.response.text())
                            .join('\n\n---CHUNK SEPARATOR---\n\n');

                        // Limpiar markdown del rango chunkeado
                        const chunkValidation = validateAndCleanMarkdown(
                            concatenatedMarkdown,
                            originalBuffer
                        );

                        extractions.push({
                            name: range.name,
                            from: range.from,
                            to: range.to,
                            markdown: chunkValidation.cleaned_markdown,
                            chunked: true,
                            chunkCount: chunks.length,
                        });
                    } else {
                        // Rango pequeño, procesar normalmente
                        console.log(`Extracting pages ${range.from}-${range.to}`);

                        const extractResponse = await model.generateContent([
                            {
                                inlineData: {
                                    mimeType: 'application/pdf',
                                    data: base64,
                                },
                            },
                            {
                                text: `Extrae SOLO el contenido de las páginas ${range.from} a ${range.to} (inclusive). No incluyas contenido de otras páginas. Usa Markdown bien estructurado: # títulos, ## secciones, tablas con |---|---| separador. NO incluyas números de página ni encabezados/pies repetidos.`,
                            },
                        ]);

                        // Limpiar markdown del rango
                        const rangeValidation = validateAndCleanMarkdown(
                            extractResponse.response.text(),
                            originalBuffer
                        );

                        extractions.push({
                            name: range.name,
                            from: range.from,
                            to: range.to,
                            markdown: rangeValidation.cleaned_markdown,
                            chunked: false,
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing ranges:', e);
            }
        }

        const endTime = Date.now();

        return NextResponse.json({
            success: true,
            sessionId,
            conversionId: randomUUID(),
            filename,
            markdown: cleanedMarkdown,
            extractions: extractions.map((ext) => ({
                id: randomUUID(),
                name: ext.name,
                from: ext.from,
                to: ext.to,
                markdown: ext.markdown,
            })),
            certificate: {
                hash_original: certificate.hash_original,
                hash_markdown: certificate.hash_markdown,
                digital_signature: certificate.digital_signature,
                timestamp: certificate.timestamp,
                status: certificate.validation_status,
            },
            anomalies: validation.anomalies,
            validationStatus: validation.validation_status,
            validationScore,
            pageIndexTree,
            pageCount: totalPages,
            processingTime: endTime - startTime,
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Error processing PDF' },
            { status: 500 }
        );
    }
}
