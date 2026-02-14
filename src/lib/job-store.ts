import { getDb } from './db';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobState {
    id: string;
    status: JobStatus;
    filename: string;
    total_pages: number;
    processed_pages: number;
    current_step: string; // e.g., "OCR Scanning", "Analyzing Tables"
    result_data?: any;
    error_message?: string;
    created_at: Date;
    updated_at: Date;
}

// Lazy init table
export async function initJobsTable() {
    const client = await getDb().connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS processing_jobs (
                id UUID PRIMARY KEY,
                status TEXT NOT NULL,
                filename TEXT NOT NULL,
                total_pages INTEGER DEFAULT 0,
                processed_pages INTEGER DEFAULT 0,
                current_step TEXT,
                result_data JSONB,
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } finally {
        client.release();
    }
}

export async function createJob(id: string, filename: string): Promise<JobState> {
    const client = await getDb().connect();
    try {
        await initJobsTable(); // Ensure exists

        const res = await client.query(`
            INSERT INTO processing_jobs (id, status, filename, current_step, created_at, updated_at)
            VALUES ($1, 'pending', $2, 'Queued', NOW(), NOW())
            RETURNING *
        `, [id, filename]);

        return res.rows[0];
    } finally {
        client.release();
    }
}

export async function updateJobProgress(
    id: string,
    update: Partial<Omit<JobState, 'id' | 'created_at' | 'filename'>>
) {
    const client = await getDb().connect();
    try {
        const setClauses: string[] = [];
        const values: any[] = [id];
        let paramIdx = 2;

        for (const [key, value] of Object.entries(update)) {
            setClauses.push(`${key} = $${paramIdx}`);
            values.push(value);
            paramIdx++;
        }

        setClauses.push(`updated_at = NOW()`);

        if (setClauses.length === 0) return;

        await client.query(`
            UPDATE processing_jobs 
            SET ${setClauses.join(', ')}
            WHERE id = $1
        `, values);
    } finally {
        client.release();
    }
}

export async function getJob(id: string): Promise<JobState | null> {
    const client = await getDb().connect();
    try {
        const res = await client.query('SELECT * FROM processing_jobs WHERE id = $1', [id]);
        return res.rows[0] || null;
    } catch (e) {
        // Table might not exist yet if only querying
        return null;
    } finally {
        client.release();
    }
}
