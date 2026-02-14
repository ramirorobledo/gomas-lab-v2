interface ChunkUpload {
    sessionId: string;
    filename: string;
    totalChunks: number;
    totalSize: number;
    receivedChunks: Map<number, Buffer>;
    createdAt: number;
    lastActivityAt: number;
    assembledBuffer: Buffer | null;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const SWEEP_INTERVAL_MS = 60 * 1000;

// Use globalThis to persist across Next.js HMR module reloads
const globalForStore = globalThis as unknown as {
    __chunkUploads?: Map<string, ChunkUpload>;
};
if (!globalForStore.__chunkUploads) {
    globalForStore.__chunkUploads = new Map();
}
const uploads = globalForStore.__chunkUploads;

// TTL sweep - runs once at module scope
const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, upload] of uploads) {
        if (now - upload.lastActivityAt > TTL_MS) {
            uploads.delete(id);
            console.log(`[chunk-store] TTL expired, deleted upload ${id}`);
        }
    }
}, SWEEP_INTERVAL_MS);

if (typeof sweepTimer === 'object' && 'unref' in sweepTimer) {
    sweepTimer.unref();
}

export function initUpload(params: {
    uploadId: string;
    sessionId: string;
    filename: string;
    totalChunks: number;
    totalSize: number;
}): void {
    const now = Date.now();
    uploads.set(params.uploadId, {
        sessionId: params.sessionId,
        filename: params.filename,
        totalChunks: params.totalChunks,
        totalSize: params.totalSize,
        receivedChunks: new Map(),
        createdAt: now,
        lastActivityAt: now,
        assembledBuffer: null,
    });
}

export function addChunk(
    uploadId: string,
    chunkIndex: number,
    data: Buffer
): { receivedCount: number; totalChunks: number; complete: boolean } {
    const upload = uploads.get(uploadId);
    if (!upload) throw new Error(`Upload ${uploadId} not found`);
    if (chunkIndex < 0 || chunkIndex >= upload.totalChunks) {
        throw new Error(`Invalid chunkIndex ${chunkIndex}`);
    }

    // Idempotent: skip if already received (safe retries)
    if (!upload.receivedChunks.has(chunkIndex)) {
        upload.receivedChunks.set(chunkIndex, data);
    }
    upload.lastActivityAt = Date.now();

    const complete = upload.receivedChunks.size === upload.totalChunks;
    return {
        receivedCount: upload.receivedChunks.size,
        totalChunks: upload.totalChunks,
        complete,
    };
}

export function finalizeUpload(uploadId: string): Buffer {
    const upload = uploads.get(uploadId);
    if (!upload) throw new Error(`Upload ${uploadId} not found`);
    if (upload.receivedChunks.size !== upload.totalChunks) {
        throw new Error(`Missing chunks: ${upload.receivedChunks.size}/${upload.totalChunks}`);
    }

    // Concatenate in order
    const ordered = Array.from({ length: upload.totalChunks }, (_, i) => {
        const chunk = upload.receivedChunks.get(i);
        if (!chunk) throw new Error(`Chunk ${i} missing`);
        return chunk;
    });

    const assembled = Buffer.concat(ordered);
    upload.assembledBuffer = assembled;
    upload.receivedChunks.clear(); // Free individual chunk memory
    upload.lastActivityAt = Date.now();

    return assembled;
}

export function getUpload(uploadId: string): {
    buffer: Buffer;
    filename: string;
    totalSize: number;
} | null {
    const upload = uploads.get(uploadId);
    if (!upload || !upload.assembledBuffer) return null;

    return {
        buffer: upload.assembledBuffer,
        filename: upload.filename,
        totalSize: upload.totalSize,
    };
}

export function deleteUpload(uploadId: string): void {
    uploads.delete(uploadId);
}

export function hasUpload(uploadId: string): boolean {
    return uploads.has(uploadId);
}
