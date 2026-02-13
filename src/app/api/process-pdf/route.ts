import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ExtractionRange {
    from: number;
    to: number;
    name: string;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const rangesStr = formData.get('ranges') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

        // Tercero: Si hay rangos, procesarlos
        let extractions = [];
        if (rangesStr) {
            try {
                const ranges: ExtractionRange[] = JSON.parse(rangesStr);

                for (const range of ranges) {
                    console.log(`Extracting pages ${range.from}-${range.to}`);

                    const extractResponse = await model.generateContent([
                        {
                            inlineData: {
                                mimeType: 'application/pdf',
                                data: base64,
                            },
                        },
                        {
                            text: `Extrae SOLO y ÚNICAMENTE el contenido de las páginas ${range.from} a ${range.to} (inclusive) de este PDF. No incluyas nada de otras páginas. Si una página no existe, indica que no existe. Formatea el resultado en Markdown bien estructurado.`,
                        },
                    ]);

                    const extractedMarkdown = extractResponse.response.text();
                    extractions.push({
                        name: range.name,
                        from: range.from,
                        to: range.to,
                        markdown: extractedMarkdown
                    });
                }
            } catch (e) {
                console.error('Error parsing ranges:', e);
            }
        }

        const endTime = Date.now();

        return NextResponse.json({
            success: true,
            conversionId: randomUUID(),
            filename: file.name,
            markdown,
            extractions: extractions.map((ext) => ({
                id: randomUUID(),
                name: ext.name,
                from: ext.from,
                to: ext.to,
                markdown: ext.markdown,
            })),
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
