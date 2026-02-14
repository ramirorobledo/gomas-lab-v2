import { NextRequest, NextResponse } from 'next/server';
import { initUpload, addChunk, finalizeUpload, hasUpload } from '@/lib/chunk-store';

export const dynamic = 'force-dynamic';

const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const chunk = formData.get('chunk') as File;
        const uploadId = formData.get('uploadId') as string;
        const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
        const totalChunks = parseInt(formData.get('totalChunks') as string, 10);
        const totalSize = parseInt(formData.get('totalSize') as string, 10);
        const filename = formData.get('filename') as string;

        if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (chunk.size > MAX_CHUNK_SIZE) {
            return NextResponse.json(
                { error: `Chunk too large: ${chunk.size} bytes (max ${MAX_CHUNK_SIZE})` },
                { status: 413 }
            );
        }

        if (totalSize > MAX_TOTAL_SIZE) {
            return NextResponse.json(
                { error: `File too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max 50MB)` },
                { status: 413 }
            );
        }

        if (chunkIndex < 0 || chunkIndex >= totalChunks) {
            return NextResponse.json(
                { error: `Invalid chunkIndex ${chunkIndex} for totalChunks ${totalChunks}` },
                { status: 400 }
            );
        }

        const sessionId = request.headers.get('X-Session-ID') || 'unknown';

        if (!hasUpload(uploadId)) {
            initUpload({ uploadId, sessionId, filename, totalChunks, totalSize });
            console.log(`[upload-chunk] New upload ${uploadId}: ${filename}, ${totalChunks} chunks, ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
        }

        const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
        const status = addChunk(uploadId, chunkIndex, chunkBuffer);

        console.log(`[upload-chunk] ${uploadId}: chunk ${chunkIndex + 1}/${totalChunks}`);

        if (status.complete) {
            finalizeUpload(uploadId);
            console.log(`[upload-chunk] ${uploadId}: finalized, all ${totalChunks} chunks assembled`);
        }

        return NextResponse.json({
            success: true,
            uploadId,
            receivedChunks: status.receivedCount,
            totalChunks: status.totalChunks,
            complete: status.complete,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Chunk upload failed';
        console.error('[upload-chunk] Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
