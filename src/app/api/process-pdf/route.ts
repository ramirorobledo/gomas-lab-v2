import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';
import { validateAndCleanMarkdown, generateForensicCertificate } from '@/lib/validation';
import { buildPageIndexTree } from '@/lib/pageindex';

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
        const file = formData.get('file') as File;
        const rangesStr = formData.get('ranges') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Max 50MB, received ${(file.size / 1024 / 1024).toFixed(2)}MB` },
                { status: 413 }
            );
        }

        console.log(`Processing: ${file.name}`);

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Primero: Obtener número total de páginas
        const countResponse = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                },
            },
            {
                text: '¿Cuántas páginas tiene este PDF? Responde SOLO con un número.',
            },
        ]);

        const pageCountStr = countResponse.response.text().trim();
        const totalPages = parseInt(pageCountStr) || 1;

        console.log(`Total pages detected: ${totalPages}`);

        // Segundo: Extraer documento completo
        const response = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                },
            },
            {
                text: 'Extrae TODO el texto de este documento legal en Markdown bien estructurado. Sé minucioso.',
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
                                    text: `Extrae SOLO y ÚNICAMENTE el contenido de las páginas ${chunk.start} a ${chunk.end} (inclusive) de este PDF. No incluyas nada de otras páginas. Formatea en Markdown bien estructurado.`,
                                },
                            ])
                        );

                        const chunkResponses = await Promise.all(chunkPromises);
                        const concatenatedMarkdown = chunkResponses
                            .map((resp) => resp.response.text())
                            .join('\n\n---CHUNK SEPARATOR---\n\n');

                        extractions.push({
                            name: range.name,
                            from: range.from,
                            to: range.to,
                            markdown: concatenatedMarkdown,
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
                                text: `Extrae SOLO y ÚNICAMENTE el contenido de las páginas ${range.from} a ${range.to} (inclusive) de este PDF. No incluyas nada de otras páginas. Formatea en Markdown bien estructurado.`,
                            },
                        ]);

                        extractions.push({
                            name: range.name,
                            from: range.from,
                            to: range.to,
                            markdown: extractResponse.response.text(),
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
            filename: file.name,
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
