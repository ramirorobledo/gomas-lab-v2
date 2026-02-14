import { getDb } from './src/lib/db';
import { initJobsTable } from './src/lib/job-store';
import { validateAndCleanMarkdown } from './src/lib/validation';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load env vars
dotenv.config({ path: '.env.local' });

async function main() {
    console.log("🔍 STARING PRE-FLIGHT CHECK...");

    // 1. Check ENV
    if (!process.env.DATABASE_URL) {
        console.error("❌ ERROR: DATABASE_URL is missing in .env.local");
        process.exit(1);
    }
    console.log("✅ Environment Variables loaded.");

    // 2. Check Database Connection
    console.log("⏳ Testing Database Connection...");
    try {
        const client = await getDb().connect();
        const res = await client.query('SELECT NOW()');
        client.release();
        console.log(`✅ Database Connected! Time: ${res.rows[0].now}`);
    } catch (e: any) {
        console.error("❌ DATABASE CONNECTION FAILED:", e.message);
        console.error("   Check your .env.local and make sure Postgres is running (docker-compose up -d)");
        process.exit(1);
    }

    // 3. Initialize Tables
    console.log("⏳ Initializing Job Tables...");
    try {
        await initJobsTable();
        console.log("✅ Job Table Verified.");
    } catch (e: any) {
        console.error("❌ HOST TABLE INIT FAILED:", e.message);
        process.exit(1);
    }

    // 4. Test Logic (Mock)
    console.log("⏳ Testing Core Logic...");
    try {
        const mockBuffer = Buffer.from("PDF Header");
        const mockMarkdown = "# Test\n\nThis is a test document.";
        const result = validateAndCleanMarkdown(mockMarkdown, mockBuffer);
        if (result.validation_status === 'OK') {
            console.log("✅ Core Logic (Validation) Passed.");
        } else {
            console.warn("⚠️ Core Logic Warning:", result.validation_status);
        }
    } catch (e: any) {
        console.error("❌ CORE LOGIC CRASHED:", e.message);
        process.exit(1);
    }

    console.log("\n🚀 ALL SYSTEMS GO! You can now run 'npm run dev' safely.");
}

main().catch(console.error);
