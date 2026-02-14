import { getDb } from './db';

// Inicializa la tabla si no existe (Lazy initialization)
export async function initChunkTable() {
    const client = await getDb().connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS file_chunks (
        upload_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (upload_id, chunk_index)
      );
    `);
        // Limpieza automática de chunks viejos (> 1 hora) podría ir aquí o en un cron,
        // pero por ahora lo dejamos simple.
    } finally {
        client.release();
    }
}

export async function saveChunk(uploadId: string, index: number, buffer: Buffer) {
    const client = await getDb().connect();
    try {
        // Asegurar tabla existe (optimización: hacer esto solo una vez o al arranque, 
        // pero aquí asegura robustez sin migrations scripts externos)
        if (index === 0) {
            await initChunkTable();
        }

        await client.query(
            'INSERT INTO file_chunks (upload_id, chunk_index, data) VALUES ($1, $2, $3) ON CONFLICT (upload_id, chunk_index) DO NOTHING',
            [uploadId, index, buffer]
        );
    } finally {
        client.release();
    }
}

export async function assembleFile(uploadId: string): Promise<Buffer> {
    const client = await getDb().connect();
    try {
        const res = await client.query(
            'SELECT data FROM file_chunks WHERE upload_id = $1 ORDER BY chunk_index ASC',
            [uploadId]
        );

        if (res.rows.length === 0) {
            throw new Error('No chunks found for this upload ID');
        }

        // Concatenar todos los buffers
        const buffers = res.rows.map((row: { data: Buffer }) => row.data);
        return Buffer.concat(buffers);
    } finally {
        client.release();
    }
}

export async function cleanupChunks(uploadId: string) {
    const client = await getDb().connect();
    try {
        await client.query('DELETE FROM file_chunks WHERE upload_id = $1', [uploadId]);
    } catch (e) {
        console.error('Failed to cleanup chunks:', e);
        // No throw, cleanup is best-effort
    } finally {
        client.release();
    }
}
