import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { name, markdown } = await request.json();

        if (!markdown || !name) {
            return NextResponse.json(
                { error: 'Missing parameters' },
                { status: 400 }
            );
        }

        // Crear archivo Markdown
        const buffer = Buffer.from(markdown, 'utf-8');

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="${name}.md"`,
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json(
            { error: 'Error generating download' },
            { status: 500 }
        );
    }
}