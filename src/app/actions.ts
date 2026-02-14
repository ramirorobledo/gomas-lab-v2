'use server';

import { randomUUID } from 'crypto';
import { saveChunk } from '@/lib/db-chunk-store';
import { createJob, getJob } from '@/lib/job-store';
import { processJobInternal } from '@/lib/processor';
import type { ExtractionRange } from '@/lib/types';

export async function uploadChunkAction(formData: FormData) {
    try {
        const uploadId = formData.get('uploadId') as string;
        const index = parseInt(formData.get('chunkIndex') as string);
        const chunk = formData.get('chunk') as File;

        if (!uploadId || isNaN(index) || !chunk) {
            throw new Error('Missing chunk data');
        }

        const buffer = Buffer.from(await chunk.arrayBuffer());
        await saveChunk(uploadId, index, buffer);

        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Upload Chunk Error:', error);
        return { success: false, error: message };
    }
}

export async function startProcessingAction(formData: FormData) {
    try {
        const uploadId = formData.get('uploadId') as string;
        let filename = 'document.pdf';
        let buffer: Buffer | null = null;

        if (uploadId) {
            filename = (formData.get('filename') as string) || 'document.pdf';
        } else {
            const file = formData.get('file') as File;
            if (!file) throw new Error('No file provided');
            filename = file.name;
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        const rangesRaw = formData.get('ranges') as string | null;
        const ranges: ExtractionRange[] = rangesRaw ? JSON.parse(rangesRaw) : [];

        const jobId = randomUUID();
        await createJob(jobId, filename);

        // TRIGGER BACKGROUND PROCESSING (Fire & Forget)
        // Note on Vercel: This might terminate if the response returns too fast.
        // In a real production env, this pushes to a Queue.
        // Here we use a floating promise for local/VPS support.
        processJobInternal(jobId, uploadId || null, buffer, filename, ranges);

        return { success: true, jobId };
    } catch (error: unknown) {
        console.error('Start Action Error:', error);
        const message = error instanceof Error ? error.message : 'Error starting process';
        return { success: false, error: message };
    }
}

export async function checkJobStatusAction(jobId: string) {
    try {
        const job = await getJob(jobId);
        if (!job) return { success: false, error: 'Job not found' };

        return {
            success: true,
            status: job.status,
            step: job.current_step,
            progress: {
                total: job.total_pages,
                current: job.processed_pages
            },
            result: job.result_data,
            error: job.error_message
        };
    } catch (error) {
        return { success: false, error: 'Failed to check status' };
    }
}
