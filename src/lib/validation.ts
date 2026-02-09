import crypto from "crypto";

interface ValidationResult {
    hash_original: string;
    hash_markdown: string;
    validation_status: "OK" | "ALERT" | "FAILED";
    anomalies: Array<{
        type: string;
        location?: string;
        severity: "low" | "medium" | "high";
        description: string;
        action_taken?: string;
    }>;
    cleaned_markdown: string;
}

/**
 * Genera hash SHA256 de un buffer
 */
export function generateHash(data: Buffer | string): string {
    return crypto
        .createHash("sha256")
        .update(data)
        .digest("hex");
}

/**
 * Valida y limpia Markdown jurídico
 */
export function validateAndCleanMarkdown(
    markdown: string,
    originalBuffer: Buffer
): ValidationResult {
    const anomalies: ValidationResult["anomalies"] = [];
    let cleaned = markdown;

    // 1. Detectar y eliminar encabezados repetitivos
    const lines = cleaned.split("\n");
    const seenHeaders = new Set<string>();
    const cleanedLines: string[] = [];

    lines.forEach((line, idx) => {
        if (line.match(/^#{1,6}\s+/)) {
            // Es un encabezado
            if (seenHeaders.has(line)) {
                anomalies.push({
                    type: "repeated_header",
                    location: `line ${idx}`,
                    severity: "medium",
                    description: `Encabezado repetido: "${line}"`,
                    action_taken: "Eliminado",
                });
            } else {
                seenHeaders.add(line);
                cleanedLines.push(line);
            }
        } else {
            cleanedLines.push(line);
        }
    });

    cleaned = cleanedLines.join("\n");

    // 2. Eliminar líneas en blanco excesivas (más de 2 consecutivas)
    cleaned = cleaned.replace(/\n\n\n+/g, "\n\n");

    // 3. Detectar números de página típicos
    const pageNumberPattern = /^[\s]*(?:Página|Page|Pág\.?)\s+\d+[\s]*$/gm;
    const pageMatches = cleaned.match(pageNumberPattern);
    if (pageMatches) {
        anomalies.push({
            type: "page_numbers_detected",
            severity: "low",
            description: `${pageMatches.length} números de página detectados`,
            action_taken: "Filtrados",
        });
        cleaned = cleaned.replace(pageNumberPattern, "");
    }

    // 4. Detectar tablas mal formateadas
    const tablePattern = /\|[^\n]*\|/g;
    const tables = cleaned.match(tablePattern) || [];
    tables.forEach((table, idx) => {
        // Verificar que tenga mínimo 3 pipes (estructura válida)
        if ((table.match(/\|/g) || []).length < 4) {
            anomalies.push({
                type: "malformed_table",
                location: `table ${idx}`,
                severity: "medium",
                description: "Tabla con estructura incompleta",
                action_taken: "Marcada para revisión manual",
            });
        }
    });

    // 5. Trim final
    cleaned = cleaned.trim();

    // Generar hashes
    const hashOriginal = generateHash(originalBuffer);
    const hashMarkdown = generateHash(cleaned);

    // Determinar status
    let validationStatus: "OK" | "ALERT" | "FAILED" = "OK";
    const highSeverityCount = anomalies.filter(
        (a) => a.severity === "high"
    ).length;
    const mediumSeverityCount = anomalies.filter(
        (a) => a.severity === "medium"
    ).length;

    if (highSeverityCount > 0) {
        validationStatus = "FAILED";
    } else if (mediumSeverityCount > 2) {
        validationStatus = "ALERT";
    }

    return {
        hash_original: hashOriginal,
        hash_markdown: hashMarkdown,
        validation_status: validationStatus,
        anomalies,
        cleaned_markdown: cleaned,
    };
}

/**
 * Genera certificado forense
 */
export function generateForensicCertificate(
    validation: ValidationResult,
    vlmUsed: string
) {
    return {
        hash_original: validation.hash_original,
        hash_markdown: validation.hash_markdown,
        digital_signature: generateHash(
            validation.hash_original + validation.hash_markdown
        ),
        vlm_used: vlmUsed,
        algorithm_version: "1.0",
        timestamp: new Date().toISOString(),
        validation_status: validation.validation_status,
        integrity_verified: validation.validation_status !== "FAILED",
        anomalies_count: validation.anomalies.length,
    };
}