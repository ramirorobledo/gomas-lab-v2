import { NextRequest, NextResponse } from "next/server";
import { processWithGemini } from "@/lib/gemini";
import { validateAndCleanMarkdown, generateForensicCertificate } from "@/lib/validation";

export async function POST(request: NextRequest) {
    try {
        // 1. Parse FormData
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const vlmProvider = (formData.get("vlmProvider") as string) || "gemini";

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // 2. Validar tipo archivo
        if (!file.type.includes("pdf") && !file.type.includes("image")) {
            return NextResponse.json(
                { error: "Only PDF or image files are supported" },
                { status: 400 }
            );
        }

        // 3. Validar tamaño (máx 50MB)
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "File too large (max 50MB)" },
                { status: 400 }
            );
        }

        // 4. Convertir a Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        console.log(`Processing file: ${file.name} (${file.size} bytes)`);

        // 5. Procesar con Gemini VLM
        const startTime = Date.now();

        let processResult;
        if (vlmProvider === "gemini") {
            processResult = await processWithGemini(buffer, file.type);
        } else {
            return NextResponse.json(
                { error: `VLM provider ${vlmProvider} not supported` },
                { status: 400 }
            );
        }

        const processingTime = Date.now() - startTime;

        // 6. Validar y limpiar Markdown
        const validation = validateAndCleanMarkdown(processResult.markdown, buffer);

        // 7. Generar certificado forense
        const certificado = generateForensicCertificate(validation, vlmProvider);

        // 8. Estimar costo
        // Costo base: $0.075 por imagen (Gemini 2.0 Flash)
        const cost = vlmProvider === "gemini" ? 0.075 : 0.30;

        // 9. Retornar respuesta
        return NextResponse.json(
            {
                success: true,
                markdown: validation.cleaned_markdown,
                certificateData: {
                    ...certificado,
                    processing_time_ms: processingTime,
                },
                anomalies: validation.anomalies,
                validation_status: validation.validation_status,
                cost: cost,
                file_info: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in process-pdf:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}