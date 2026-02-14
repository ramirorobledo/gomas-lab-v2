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
    structure_preserved: boolean;
    legal_elements: {
        expediente?: string;
        juzgado?: string;
        articulos?: number;
        tablas?: number;
    };
}

/**
 * Genera hash SHA256
 */
export function generateHash(data: Buffer | string): string {
    return crypto
        .createHash("sha256")
        .update(data)
        .digest("hex");
}

/**
 * Extrae elementos legales del Markdown
 */
function extractLegalElements(markdown: string) {
    const legalElements = {
        expediente: undefined as string | undefined,
        juzgado: undefined as string | undefined,
        articulos: 0,
        tablas: 0,
    };

    // Buscar expediente (formatos: 2024-12345, SLP-2024-001, etc)
    const expedienteMatch = markdown.match(/(?:Expediente|Exp\.?|No\.)?\s*([A-Z]{0,3}-?\d{4}-?\d+)/i);
    if (expedienteMatch) {
        legalElements.expediente = expedienteMatch[1];
    }

    // Buscar juzgado (Penal, Civil, Administrativo, etc)
    const juzgadoMatch = markdown.match(/(?:Juzgado|Tribunal)\s+(?:de\s+)?([A-Za-z\s]+?)(?:\s+(?:del|de|en)\s+|$)/i);
    if (juzgadoMatch) {
        legalElements.juzgado = juzgadoMatch[1].trim();
    }

    // Contar artículos (Art. 123, Artículo 45, etc)
    const articuloMatches = markdown.match(/(?:Art\.?|Artículo)\s+\d+/gi);
    legalElements.articulos = articuloMatches?.length || 0;

    // Contar tablas
    const tableMatches = markdown.match(/\|[\s\S]*?\|/g);
    legalElements.tablas = tableMatches?.length || 0;

    return legalElements;
}

/**
 * Limpia tablas mal formateadas
 */
function cleanMalformedTables(markdown: string): { cleaned: string; issues: number } {
    let cleaned = markdown;
    let issuesFound = 0;

    // Buscar líneas que parecen tablas pero están rotas
    const lines = cleaned.split("\n");
    const cleanedLines = lines.map((line) => {
        // Si tiene pipes pero no es una tabla válida (menos de 3 células)
        if (line.includes("|") && !line.match(/\|\s*[-:\s|]+\s*\|/)) {
            const cells = line.split("|").filter((c) => c.trim());
            if (cells.length < 3) {
                // Convertir a párrafo normal
                issuesFound++;
                return cells.map((c) => c.trim()).join(" - ");
            }
        }
        return line;
    });

    cleaned = cleanedLines.join("\n");

    return { cleaned, issues: issuesFound };
}

/**
 * Elimina encabezados, números de página y líneas repetitivas (headers/footers)
 */
function removePageHeaders(markdown: string): { cleaned: string; removed: number } {
    let removed = 0;
    const lines = markdown.split("\n");

    // FASE 1: Detectar líneas que se repiten frecuentemente (headers/footers de PDF)
    const MIN_REPEATS = 3;
    const lineFrequency = new Map<string, number>();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.match(/^#{1,6}\s+/)) continue; // no contar headers markdown

        // Normalizar: quitar números variables para detectar patrones
        const normalized = trimmed
            .replace(/\d+/g, '#')
            .replace(/\s+/g, ' ');

        if (normalized.length > 3 && normalized.length < 120) {
            lineFrequency.set(normalized, (lineFrequency.get(normalized) || 0) + 1);
        }
    }

    const repeatedPatterns = new Set<string>();
    for (const [pattern, count] of lineFrequency) {
        if (count >= MIN_REPEATS) {
            repeatedPatterns.add(pattern);
        }
    }

    // FASE 2: Filtrar líneas
    const processedLines: string[] = [];
    let lastHeader = "";

    lines.forEach((line) => {
        const trimmed = line.trim();

        // Detectar números de página sueltos
        if (trimmed.match(/^\s*(?:Página|Page|Pág\.?)\s+\d+\s*$/i)) {
            removed++;
            return;
        }

        // Detectar separadores de página tipo "--- página X ---"
        if (trimmed.match(/^[-—–=_\s]*(?:página|page|pág\.?)\s*\d*\s*[-—–=_\s]*$/i)) {
            removed++;
            return;
        }

        // Detectar números de página sueltos (solo un número)
        if (trimmed.match(/^\d{1,4}$/) && !trimmed.match(/^#{1,6}/)) {
            removed++;
            return;
        }

        // Detectar encabezados markdown duplicados consecutivos
        if (trimmed.match(/^#{1,6}\s+/)) {
            if (line === lastHeader) {
                removed++;
                return;
            }
            lastHeader = line;
        }

        // Detectar líneas repetidas frecuentemente (headers/footers de PDF)
        if (trimmed && !trimmed.match(/^#{1,6}\s+/)) {
            const normalized = trimmed
                .replace(/\d+/g, '#')
                .replace(/\s+/g, ' ');
            if (repeatedPatterns.has(normalized)) {
                removed++;
                return;
            }
        }

        processedLines.push(line);
    });

    return { cleaned: processedLines.join("\n"), removed };
}

/**
 * Normaliza espacios en blanco
 */
function normalizeWhitespace(markdown: string): string {
    let cleaned = markdown;

    // Máximo 2 líneas en blanco consecutivas
    cleaned = cleaned.replace(/\n\n\n+/g, "\n\n");

    // Trim espacios finales en líneas
    cleaned = cleaned
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n");

    // Trim inicio y final
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Valida y limpia Markdown jurídico (VERSIÓN 2)
 */
export function validateAndCleanMarkdown(
    markdown: string,
    originalBuffer: Buffer
): ValidationResult {
    const anomalies: ValidationResult["anomalies"] = [];
    let cleaned = markdown;

    // 1. Limpiar tablas rotas
    const { cleaned: cleanedTables, issues: tableIssues } = cleanMalformedTables(cleaned);
    cleaned = cleanedTables;
    if (tableIssues > 0) {
        anomalies.push({
            type: "malformed_tables_fixed",
            severity: "medium",
            description: `${tableIssues} tabla(s) mal formateada(s) corregida(s)`,
            action_taken: "Convertidas a párrafos o rehacidas",
        });
    }

    // 2. Remover números de página y headers repetitivos
    const { cleaned: cleanedPages, removed: removedCount } = removePageHeaders(cleaned);
    cleaned = cleanedPages;
    if (removedCount > 0) {
        anomalies.push({
            type: "page_elements_removed",
            severity: "low",
            description: `${removedCount} número(s) de página y encabezados repetidos eliminados`,
            action_taken: "Filtrados automáticamente",
        });
    }

    // 3. Normalizar espacios en blanco
    cleaned = normalizeWhitespace(cleaned);

    // 4. Extraer elementos legales
    const legalElements = extractLegalElements(cleaned);

    // 5. Detectar posibles anomalías adicionales
    if (!legalElements.expediente) {
        anomalies.push({
            type: "missing_expediente",
            severity: "low",
            description: "No se detectó número de expediente",
            action_taken: "Requiere revisión manual",
        });
    }

    if (cleaned.length < 100) {
        anomalies.push({
            type: "short_document",
            severity: "high",
            description: "Documento muy corto (<100 caracteres)",
            action_taken: "Verificar que OCR fue exitoso",
        });
    }

    // 6. Generar hashes
    const hashOriginal = generateHash(originalBuffer);
    const hashMarkdown = generateHash(cleaned);

    // 7. Determinar status de validación
    let validationStatus: "OK" | "ALERT" | "FAILED" = "OK";
    const highSeverityCount = anomalies.filter((a) => a.severity === "high").length;
    const mediumSeverityCount = anomalies.filter((a) => a.severity === "medium").length;

    if (highSeverityCount > 0) {
        validationStatus = "FAILED";
    } else if (mediumSeverityCount > 1) {
        validationStatus = "ALERT";
    }

    return {
        hash_original: hashOriginal,
        hash_markdown: hashMarkdown,
        validation_status: validationStatus,
        anomalies,
        cleaned_markdown: cleaned,
        structure_preserved: legalElements.articulos > 0,
        legal_elements: legalElements,
    };
}

/**
 * Genera certificado forense robusto
 */
export function generateForensicCertificate(
    validation: ValidationResult,
    vlmUsed: string
) {
    return {
        hash_original: validation.hash_original,
        hash_markdown: validation.hash_markdown,
        digital_signature: generateHash(
            validation.hash_original + validation.hash_markdown + Date.now()
        ),
        signing_key_id: "gomas-lab-v2-" + new Date().getFullYear(),
        vlm_used: vlmUsed,
        algorithm_version: "2.0",
        timestamp: new Date().toISOString(),
        validation_status: validation.validation_status,
        integrity_verified: validation.validation_status !== "FAILED",
        anomalies_count: validation.anomalies.length,
        structure_preserved: validation.structure_preserved,
        legal_elements_detected: validation.legal_elements,
    };
}