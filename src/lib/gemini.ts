import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ProcessResult {
    markdown: string;
    anomalies: string[];
    confidence: number;
}

export async function processWithGemini(
    imageBuffer: Buffer,
    mimeType: string
): Promise<ProcessResult> {
    const base64Image = imageBuffer.toString("base64");

    const model = client.getGenerativeModel({
        model: "gemini-2.0-flash",
    });

    const prompt = `Eres un experto OCR especializado en documentos jurídicos mexicanos.

Analiza esta imagen/PDF y:
1. Extrae TODO el texto con máxima precisión
2. Estructura en Markdown limpio con jerarquía clara
3. CORRIGE AUTOMÁTICAMENTE:
   - ❌ Encabezados repetitivos → Elimina duplicados
   - ❌ Números de página innecesarios → Filtra
   - ❌ Tablas mal formateadas → Rehace en Markdown
   - ❌ Espacios excesivos → Normaliza
4. DETECTA anomalías (tablas rotas, texto cortado, sellos ilegibles)
5. RETORNA COMO JSON:

{
  "markdown": "# Documento\\n\\n## Sección 1\\n...",
  "anomalies": ["tabla_rota_en_pagina_3", "texto_cortado_lado_derecho"],
  "confidence": 0.95,
  "warnings": []
}

IMPORTANTE: El Markdown debe ser:
- Limpio y estructurado
- Sin líneas en blanco excesivas
- Con # para títulos, ## para subtítulos, ### para sub-subtítulos
- Tablas en formato Markdown
- Listas con - o *`;

    const response = await model.generateContent([
        {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        },
        prompt,
    ]);

    const responseText = response.response.text();

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Failed to parse Gemini response as JSON");
    }

    const parsed: ProcessResult = JSON.parse(jsonMatch[0]);

    return {
        markdown: parsed.markdown,
        anomalies: parsed.anomalies || [],
        confidence: parsed.confidence || 0.9,
    };
}