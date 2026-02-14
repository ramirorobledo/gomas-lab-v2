
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// --- MANUAL ENV LOADING ---
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
                    process.env[key] = value;
                }
            });
            console.log("✅ Loaded .env.local manually.");
        } else {
            console.warn("⚠️ .env.local file not found.");
        }
    } catch (e) {
        console.warn("⚠️ Could not read .env.local");
    }
}

loadEnv();

// --- MAIN CHECK ---
async function main() {
    console.log("🔍 STARING PRE-FLIGHT CHECK (Standalone Mode)...");

    // 1. Check ENV
    if (!process.env.DATABASE_URL) {
        console.error("❌ ERROR: DATABASE_URL is missing in .env.local");
        process.exit(1);
    }
    console.log("✅ Environment Variables loaded.");

    // 2. Check Database Connection & Job Table
    console.log("⏳ Testing Database Connection...");
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log(`✅ Database Connected! Time: ${res.rows[0].now}`);

        // Initialize Jobs Table
        console.log("⏳ Initializing Job Tables...");
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
        console.log("✅ Job Table Verified/Created.");

        client.release();
    } catch (e: any) {
        console.error("❌ DATABASE CONNECTION FAILED:", e.message);
        console.error("   Check your .env.local and make sure Postgres is running (docker-compose up -d)");
        process.exit(1);
    } finally {
        await pool.end();
    }

    console.log("\n🚀 ALL SYSTEMS GO! You can run 'npm run dev' safely.");
}

main().catch(console.error);
