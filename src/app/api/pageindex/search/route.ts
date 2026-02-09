import { NextRequest, NextResponse } from "next/server";
import { deserializeTree, searchInTree } from "@/lib/pageindex";

export async function POST(request: NextRequest) {
    try {
        // 1. Parse request
        const body = await request.json();
        const { tree_serialized, query, max_results } = body;

        if (!tree_serialized || !query) {
            return NextResponse.json(
                { error: "tree_serialized and query are required" },
                { status: 400 }
            );
        }

        // 2. Deserializar árbol
        let tree;
        try {
            tree = deserializeTree(tree_serialized);
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid tree format" },
                { status: 400 }
            );
        }

        // 3. Buscar en árbol
        const results = searchInTree(tree, query, max_results || 5);

        // 4. Formatear respuesta
        const formattedResults = results.map((node) => ({
            id: node.id,
            title: node.title,
            level: node.level,
            content: node.content.substring(0, 500), // Primeros 500 chars
            type: node.metadata.type,
            expediente: node.metadata.expediente,
        }));

        return NextResponse.json(
            {
                success: true,
                query,
                results_count: formattedResults.length,
                results: formattedResults,
                message: `Found ${formattedResults.length} matching sections`,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error searching PageIndex tree:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}