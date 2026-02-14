import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';
import { validateAndCleanMarkdown, generateForensicCertificate } from '@/lib/validation';
import { buildPageIndexTree } from '@/lib/pageindex';
import { getActualPageCount } from '@/lib/pdf-utils';
import { calculateOptimalChunks } from '@/lib/pdf-splitter';
import { GEMINI_API_KEY } from '@/lib/env';
import { assembleFile, cleanupChunks } from '@/lib/db-chunk-store';
import { extractPDFPages } from '@/lib/pdf-page-extractor';
import { updateJobProgress } from '@/lib/job-store';
import type { ExtractionRange } from '@/lib/types';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function processJobInternal(jobId: string, uploadId: string | null, fileBuffer: Buffer | null, filename: string, ranges: ExtractionRange[] = []) {
    const startTime = Date.now();

    try {
        await updateJobProgress(jobId, { status: 'processing', current_step: 'Initializing' });

        let originalBuffer: Buffer;
        let fileSize = 0;

        // 1. Reassembly / Loading
        if (uploadId) {
            await updateJobProgress(jobId, { current_step: 'Reassembling Chunks' });
            console.log(`Job ${jobId}: Reassembling file from chunks: ${uploadId}`);
            originalBuffer = await assembleFile(uploadId);
            fileSize = originalBuffer.length;
            // cleanupChunks(uploadId).catch(err => console.error('Cleanup error:', err)); // Do this at the end
        } else if (fileBuffer) {
            originalBuffer = fileBuffer;
            fileSize = originalBuffer.length;
        } else {
            throw new Error('No file source provided');
        }

        const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`File too large. Max 500MB, received ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
        }

        // 2. Page Counting
        await updateJobProgress(jobId, { current_step: 'Analyzing PDF Structure' });
        const uint8Array = new Uint8Array(originalBuffer);
        const totalPages = await getActualPageCount(uint8Array.buffer);
        console.log(`Job ${jobId}: Total pages detected: ${totalPages}`);

        await updateJobProgress(jobId, {
            total_pages: totalPages,
            current_step: `Preparing ${totalPages} pages for OCR`
        });

        // 3. Gemini Processing
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { maxOutputTokens: 32000 }
        }, { timeout: 120_000 });

        const GEMINI_PROMPT = `Extrae TODO el texto de este documento en Markdown bien estructurado.
REGLAS DE FORMATO:
- Usa # para títulos principales, ## para secciones, ### para subsecciones
- TABLAS: SIEMPRE usa formato Markdown válido con fila separadora.
- NO incluyas números de página sueltos
- Preserva negritas (**texto**) y cursivas (*texto*)
- Sé minucioso y preciso.`;

        const chunks = calculateOptimalChunks(totalPages);
        let markdown = '';

        if (chunks.length === 1) {
            await updateJobProgress(jobId, { current_step: 'OCR Scanning (Full Document)' });
            const base64 = originalBuffer.toString('base64');
            const response = await model.generateContent([
                { inlineData: { mimeType: 'application/pdf', data: base64 } },
                { text: GEMINI_PROMPT },
            ]);
            markdown = response.response.text();
            await updateJobProgress(jobId, { processed_pages: totalPages });
        } else {
            console.log(`Job ${jobId}: Splitting into ${chunks.length} chunks`);
            let fullMarkdown = '';

            for (let ci = 0; ci < chunks.length; ci++) {
                const chunk = chunks[ci];
                await updateJobProgress(jobId, {
                    current_step: `OCR Chunk ${ci + 1}/${chunks.length} (Pages ${chunk.startPage}-${chunk.endPage})`,
                    processed_pages: chunk.startPage - 1
                });

                const chunkBase64 = await extractPDFPages(originalBuffer, chunk.startPage, chunk.endPage);
                const chunkResponse = await model.generateContent([
                    { inlineData: { mimeType: 'application/pdf', data: chunkBase64 } },
                    { text: `${GEMINI_PROMPT}\n\nPages ${chunk.startPage}-${chunk.endPage}.` },
                ]);

                fullMarkdown += chunkResponse.response.text();
                if (ci < chunks.length - 1) fullMarkdown += '\n\n';

                await updateJobProgress(jobId, { processed_pages: chunk.endPage });
            }
            markdown = fullMarkdown;
        }

        // 4. Validation & Formatting
        await updateJobProgress(jobId, { current_step: 'Forensic Validation' });
        const validation = validateAndCleanMarkdown(markdown, originalBuffer);
        const cleanedMarkdown = validation.cleaned_markdown;
        const certificate = generateForensicCertificate(validation, 'gemini-2.0-flash');

        // 5. Page Indexing
        await updateJobProgress(jobId, { current_step: 'Building Index' });
        const pageIndexTree = buildPageIndexTree(cleanedMarkdown, {
            expediente: validation.legal_elements.expediente,
            juzgado: validation.legal_elements.juzgado,
        });

        // 6. Score
        const highCount = validation.anomalies.filter(a => a.severity === 'high').length;
        const mediumCount = validation.anomalies.filter(a => a.severity === 'medium').length;
        const validationScore = Math.max(0, 1.0 - (highCount * 0.3) - (mediumCount * 0.1));

        // 7. Range Extractions
        const extractions: { name: string; from: number; to: number; markdown: string }[] = [];
        if (ranges.length > 0) {
            await updateJobProgress(jobId, { current_step: 'Extracting Ranges' });
            for (const range of ranges) {
                const rangeBase64 = await extractPDFPages(originalBuffer, range.from, range.to);
                const rangeResponse = await model.generateContent([
                    { inlineData: { mimeType: 'application/pdf', data: rangeBase64 } },
                    { text: `${GEMINI_PROMPT}\n\nPages ${range.from}-${range.to}.` },
                ]);
                extractions.push({
                    name: range.name,
                    from: range.from,
                    to: range.to,
                    markdown: rangeResponse.response.text(),
                });
            }
        }

        const resultData = {
            conversionId: randomUUID(),
            filename,
            markdown: cleanedMarkdown,
            extractions,
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
            processingTime: Date.now() - startTime,
        };

        await updateJobProgress(jobId, {
            status: 'completed',
            current_step: 'Done',
            result_data: resultData
        });

        if (uploadId) {
            cleanupChunks(uploadId).catch(err => console.error('Cleanup error:', err));
        }

    } catch (error: unknown) {
        console.error(`Job ${jobId} failed:`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobProgress(jobId, {
            status: 'failed',
            error_message: message,
            current_step: 'Failed'
        });
    }
}
