import { NextRequest, NextResponse } from 'next/server';

function sanitizeFilename(name: string): string {
    return name
        .replace(/["\n\r\0]/g, '')
        .replace(/[^a-z0-9._\-]/gi, '_')
        .slice(0, 255);
}

export async function POST(request: NextRequest) {
    try {
        const { name, markdown } = await request.json();

        if (!markdown || !name) {
            return NextResponse.json(
                { error: 'Missing parameters' },
                { status: 400 }
            );
        }

        const safeName = sanitizeFilename(name);
        const buffer = Buffer.from(markdown, 'utf-8');

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="${safeName}.md"`,
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