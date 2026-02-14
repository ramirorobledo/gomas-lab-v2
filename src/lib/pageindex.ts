interface TreeNode {
    id: string;
    title: string;
    level: number;
    content: string;
    children: TreeNode[];
    metadata: {
        page?: number;
        type?: "title" | "section" | "subsection" | "paragraph";
        expediente?: string;
    };
}

interface PageIndexTree {
    root: TreeNode;
    metadata: {
        expediente?: string;
        juzgado?: string;
        total_sections: number;
        total_paragraphs: number;
        depth: number;
    };
}

/**
 * Detecta y elimina líneas que se repiten en múltiples páginas (headers/footers)
 * Incluye: números de página sueltos, Folio/Foja, "X de Y", romanos, watermarks
 */
function filterRepeatedHeadersFooters(lines: string[]): string[] {
    const MIN_REPEATS = 3;
    const lineFrequency = new Map<string, number>();

    // Contar frecuencia de cada línea no vacía (normalizada)
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^#{1,6}\s+/.test(trimmed)) continue; // no contar headers markdown
        const normalized = trimmed
            .replace(/\d+/g, "#")
            .replace(/\s+/g, " ");
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

    // Filtrar
    return lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        if (/^#{1,6}\s+/.test(trimmed)) return true;

        // Números de página sueltos (excluir años)
        if (/^\d{1,4}$/.test(trimmed)) {
            const num = parseInt(trimmed, 10);
            if (num < 1900 || num > 2099) return false;
        }

        // Página X, Folio X, Foja X, X de Y
        if (/^\s*(?:Página|Page|Pág\.?|Folio|Foja)s?\s+\d+/i.test(trimmed)) return false;
        if (/^\s*\d{1,4}\s+de\s+\d{1,4}\s*$/i.test(trimmed)) return false;

        // Romanos sueltos
        if (/^[ivxlcdm]{1,6}$/i.test(trimmed)) return false;

        // Patrones repetidos
        const normalized = trimmed.replace(/\d+/g, "#").replace(/\s+/g, " ");
        if (repeatedPatterns.has(normalized)) return false;

        return true;
    });
}

/**
 * Parsea Markdown y construye árbol jerárquico (PageIndex-like)
 */
export function buildPageIndexTree(
    markdown: string,
    legalMetadata?: {
        expediente?: string;
        juzgado?: string;
    }
): PageIndexTree {
    const rawLines = markdown.split("\n");
    const lines = filterRepeatedHeadersFooters(rawLines);
    const root: TreeNode = {
        id: "root",
        title: "Document",
        level: 0,
        content: "",
        children: [],
        metadata: {
            type: "title",
            expediente: legalMetadata?.expediente,
        },
    };

    let currentNode = root;
    const stack: TreeNode[] = [root];
    let sectionCount = 0;
    let paragraphCount = 0;
    let maxDepth = 0;

    lines.forEach((line, idx) => {
        // Detectar encabezados
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headerMatch) {
            const level = headerMatch[1].length;
            const title = headerMatch[2].trim();

            // Ajustar stack según nivel
            while (stack.length > 1 && stack[stack.length - 1].metadata.type !== "title") {
                if (stack[stack.length - 1].level >= level) {
                    stack.pop();
                } else {
                    break;
                }
            }

            const newNode: TreeNode = {
                id: `section-${sectionCount}`,
                title,
                level,
                content: "",
                children: [],
                metadata: {
                    page: Math.floor(idx / 50), // Estimación
                    type: level === 1 ? "section" : level === 2 ? "subsection" : "paragraph",
                    expediente: legalMetadata?.expediente,
                },
            };

            sectionCount++;
            maxDepth = Math.max(maxDepth, level);

            // Agregar al nodo actual
            currentNode.children.push(newNode);
            stack.push(newNode);
            currentNode = newNode;
        } else if (line.trim()) {
            // Párrafo regular
            if (currentNode.content) {
                currentNode.content += "\n" + line;
            } else {
                currentNode.content = line;
            }
            paragraphCount++;
        }
    });

    return {
        root,
        metadata: {
            expediente: legalMetadata?.expediente,
            juzgado: legalMetadata?.juzgado,
            total_sections: sectionCount,
            total_paragraphs: paragraphCount,
            depth: maxDepth,
        },
    };
}

/**
 * Busca en el árbol (tree search como PageIndex)
 */
export function searchInTree(
    tree: PageIndexTree,
    query: string,
    maxResults: number = 5
): TreeNode[] {
    const results: TreeNode[] = [];
    const queryLower = query.toLowerCase();

    function traverse(node: TreeNode) {
        if (results.length >= maxResults) return;

        // Buscar en título
        if (node.title.toLowerCase().includes(queryLower)) {
            results.push(node);
            return;
        }

        // Buscar en contenido
        if (node.content.toLowerCase().includes(queryLower)) {
            results.push(node);
            return;
        }

        // Recursivamente en hijos
        for (const child of node.children) {
            traverse(child);
            if (results.length >= maxResults) break;
        }
    }

    traverse(tree.root);
    return results;
}

/**
 * Serializa árbol a JSON
 */
export function serializeTree(tree: PageIndexTree): string {
    return JSON.stringify(tree, null, 2);
}

/**
 * Deserializa árbol desde JSON
 */
export function deserializeTree(json: string): PageIndexTree {
    return JSON.parse(json);
}

/**
 * Genera resumen ejecutivo del árbol
 */
export function generateTreeSummary(tree: PageIndexTree): {
    summary: string;
    toc: string;
} {
    let toc = "# Tabla de Contenidos\n\n";
    let summary = `Documento: ${tree.root.title}\n`;
    summary += `Expediente: ${tree.metadata.expediente || "No detectado"}\n`;
    summary += `Juzgado: ${tree.metadata.juzgado || "No detectado"}\n`;
    summary += `Secciones: ${tree.metadata.total_sections}\n`;
    summary += `Profundidad: ${tree.metadata.depth}\n\n`;

    function traverseTOC(node: TreeNode, depth: number = 0) {
        if (depth > 0) {
            const indent = "  ".repeat(depth - 1);
            toc += `${indent}- ${node.title}\n`;
        }
        for (const child of node.children) {
            traverseTOC(child, depth + 1);
        }
    }

    traverseTOC(tree.root);

    return { summary, toc };
}