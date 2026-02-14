import { Pool } from 'pg';

let pool: Pool;

export function getDb() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined');
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // Configuración SSL necesaria para Neon/Vercel
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        });
    }
    return pool;
}
