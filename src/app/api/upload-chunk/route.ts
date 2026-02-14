import { NextRequest, NextResponse } from 'next/server';
import { saveChunk } from '@/lib/db-chunk-store';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const uploadId = formData.get('uploadId') as string;
        const chunkIndex = parseInt(formData.get('chunkIndex') as string);
        const totalChunks = parseInt(formData.get('totalChunks') as string);
        const chunk = formData.get('chunk') as File;

        if (!uploadId || isNaN(chunkIndex) || !chunk) {
            return NextResponse.json({ error: 'Missing chunk data' }, { status: 400 });
        }

        const buffer = Buffer.from(await chunk.arrayBuffer());
        await saveChunk(uploadId, chunkIndex, buffer);

        return NextResponse.json({
            success: true,
            receivedChunks: chunkIndex + 1,
            totalChunks,
            complete: chunkIndex + 1 === totalChunks,
        });
    } catch (error: unknown) {
        console.error('Upload Chunk API Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
