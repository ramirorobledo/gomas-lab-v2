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
    // Count actual table blocks by counting separator rows (|---|---|)
    const tableSeparators = markdown.match(/^\|?\s*[-:\s]+(\|\s*[-:\s]+)+\|?\s*$/gm);
    legalElements.tablas = tableSeparators?.length || 0;

    return legalElements;
}

/**
 * Limpia tablas mal formateadas (procesamiento por bloques)
 *
 * Detecta bloques de tabla (líneas consecutivas con pipes) y valida su estructura.
 * Solo convierte a párrafos las tablas que carecen de fila separadora válida
 * (|---|---|) Y tienen menos de 2 filas de datos.
 * Preserva tablas de 2+ columnas con estructura válida.
 */
function cleanMalformedTables(markdown: string): { cleaned: string; issues: number } {
    let issuesFound = 0;
    const lines = markdown.split("\n");
    const result: string[] = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        // Detectar inicio de bloque de tabla (línea con al menos un pipe)
        if (line.includes("|") && line.trim().length > 1) {
            // Recolectar todo el bloque de líneas con pipes consecutivas
            const block: string[] = [];
            while (i < lines.length && lines[i].includes("|") && lines[i].trim().length > 1) {
                block.push(lines[i]);
                i++;
            }

            // Validar estructura del bloque
            const hasSeparator = block.some((l) =>
                /^\|?\s*[-:\s]+(\|\s*[-:\s]+)+\|?\s*$/.test(l.trim())
            );
            const dataRows = block.filter(
                (l) => !(/^\|?\s*[-:\s]+(\|\s*[-:\s]+)+\|?\s*$/.test(l.trim()))
            );

            if (hasSeparator && dataRows.length >= 1) {
                // Tabla válida con separador: preservar completa
                result.push(...block);
            } else if (!hasSeparator && dataRows.length >= 3) {
                // Muchas filas sin separador: intentar reparar agregando separador
                const firstRow = block[0];
                const cellCount = firstRow.split("|").filter((c) => c.trim()).length;
                if (cellCount >= 2) {
                    // Insertar separador después de la primera fila
                    result.push(block[0]);
                    result.push(
                        "|" + " --- |".repeat(cellCount)
                    );
                    result.push(...block.slice(1));
                    issuesFound++;
                } else {
                    // Una sola columna, no es tabla real
                    for (const row of block) {
                        const cells = row.split("|").filter((c) => c.trim());
                        result.push(cells.map((c) => c.trim()).join(" – "));
                    }
                    issuesFound++;
                }
            } else if (!hasSeparator && dataRows.length <= 2) {
                // Pocas filas sin separador: verificar si parece tabla de pares clave-valor
                const firstRow = dataRows[0];
                const cellCount = firstRow
                    .split("|")
                    .filter((c) => c.trim()).length;
                if (cellCount >= 2) {
                    // Parece clave-valor, preservar como tabla con separador
                    result.push(block[0]);
                    result.push("|" + " --- |".repeat(cellCount));
                    result.push(...block.slice(1));
                    issuesFound++;
                } else {
                    // Una sola columna, convertir a texto
                    for (const row of block) {
                        const cells = row.split("|").filter((c) => c.trim());
                        result.push(cells.map((c) => c.trim()).join(" – "));
                    }
                    issuesFound++;
                }
            } else {
                // Fallback: preservar tal cual
                result.push(...block);
            }
        } else {
            result.push(line);
            i++;
        }
    }

    return { cleaned: result.join("\n"), issues: issuesFound };
}

/**
 * Transforma líderes de puntos de tabla de contenidos (PageIndex-style)
 * "Capítulo 1.......123" → "Capítulo 1: 123"
 */
function transformTocDots(markdown: string): string {
    // 5+ puntos consecutivos → ": "
    let result = markdown.replace(/\.{5,}/g, ": ");
    // 5+ puntos separados por espacios
    result = result.replace(/(?:\.\s){5,}\.?/g, ": ");
    return result;
}

/**
 * Elimina encabezados, números de página, footers repetitivos y artefactos de PDF
 *
 * FASE 1: Transforma TOC dots
 * FASE 2: Detecta patrones repetidos (frecuencia >= MIN_REPEATS)
 * FASE 3: Filtra líneas por reglas específicas:
 *   - Números de página (Página X, Page X, Pág X, Folio X, Foja X, X de Y, romanos)
 *   - Separadores de página
 *   - Headers markdown duplicados consecutivos
 *   - Patrones repetidos (headers/footers de PDF)
 *   - Confidencialidad / watermarks repetidos
 */
export function removePageHeaders(markdown: string): { cleaned: string; removed: number } {
    let removed = 0;

    // FASE 1: Transformar TOC dots
    const withoutDots = transformTocDots(markdown);
    const lines = withoutDots.split("\n");

    // FASE 2: Detectar líneas que se repiten frecuentemente (headers/footers de PDF)
    const MIN_REPEATS = 3;
    const lineFrequency = new Map<string, number>();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.match(/^#{1,6}\s+/)) continue; // no contar headers markdown
        // no contar filas separadoras de tabla (|---|---|)
        if (/^\|?\s*[-:\s]+(\|\s*[-:\s]+)+\|?\s*$/.test(trimmed)) continue;

        // Normalizar: quitar números variables para detectar patrones
        const normalized = trimmed
            .replace(/\d+/g, "#")
            .replace(/\s+/g, " ");

        // Rango ampliado: capturar desde headers cortos hasta largos
        if (normalized.length > 2 && normalized.length < 200) {
            lineFrequency.set(normalized, (lineFrequency.get(normalized) || 0) + 1);
        }
    }

    const repeatedPatterns = new Set<string>();
    for (const [pattern, count] of lineFrequency) {
        if (count >= MIN_REPEATS) {
            repeatedPatterns.add(pattern);
        }
    }

    // FASE 3: Filtrar líneas
    const processedLines: string[] = [];
    let lastHeader = "";

    lines.forEach((line) => {
        const trimmed = line.trim();

        // --- Números de página explícitos ---
        // "Página 3", "Page 12", "Pág. 5"
        if (/^\s*(?:Página|Page|Pág\.?)\s+\d+\s*$/i.test(trimmed)) {
            removed++;
            return;
        }

        // "Folio 3", "Foja 12", "Foja(s) 5"
        if (/^\s*(?:Folio|Foja)s?\s+\d+\s*$/i.test(trimmed)) {
            removed++;
            return;
        }

        // "3 de 45", "Página 3 de 45"
        if (/^\s*(?:Página|Page|Pág\.?)?\s*\d{1,4}\s+de\s+\d{1,4}\s*$/i.test(trimmed)) {
            removed++;
            return;
        }

        // Números romanos sueltos como páginas: "i", "iv", "xii", "XXIII"
        if (/^[ivxlcdm]{1,8}$/i.test(trimmed) && trimmed.length <= 6) {
            removed++;
            return;
        }

        // --- Separadores de página ---
        // "--- página X ---", "=== 3 ===", "____"
        if (/^[-—–=_\s]*(?:página|page|pág\.?)?\s*\d*\s*[-—–=_\s]*$/i.test(trimmed) &&
            trimmed.length >= 3 && /[-—–=_]/.test(trimmed)) {
            removed++;
            return;
        }

        // --- Números sueltos (páginas) ---
        // Solo 1-4 dígitos, pero NO años (1900-2099)
        if (/^\d{1,4}$/.test(trimmed)) {
            const num = parseInt(trimmed, 10);
            if (num < 1900 || num > 2099) {
                removed++;
                return;
            }
        }

        // --- Encabezados markdown duplicados consecutivos ---
        if (/^#{1,6}\s+/.test(trimmed)) {
            if (line === lastHeader) {
                removed++;
                return;
            }
            lastHeader = line;
        }

        // --- Patrones de confidencialidad/watermarks repetidos ---
        if (/^\s*(?:CONFIDENCIAL|BORRADOR|DRAFT|COPIA|COPIA\s+SIMPLE)\s*$/i.test(trimmed)) {
            // Solo eliminar si se repite (está en patrones)
            const normalized = trimmed.replace(/\d+/g, "#").replace(/\s+/g, " ");
            if (repeatedPatterns.has(normalized)) {
                removed++;
                return;
            }
        }

        // --- Líneas repetidas frecuentemente (headers/footers de PDF) ---
        // Nunca eliminar filas separadoras de tabla
        if (/^\|?\s*[-:\s]+(\|\s*[-:\s]+)+\|?\s*$/.test(trimmed)) {
            processedLines.push(line);
            return;
        }
        if (trimmed && !/^#{1,6}\s+/.test(trimmed)) {
            const normalized = trimmed
                .replace(/\d+/g, "#")
                .replace(/\s+/g, " ");
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
        integrity_hash: generateHash(
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