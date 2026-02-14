import fs from "fs";
import path from "path";
import crypto from "crypto";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const PDF_PATH = process.argv[2] || path.join(__dirname, "test-files", "IPRA.pdf");
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per chunk (under 5MB server limit)

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
}

const results: TestResult[] = [];

function report(name: string, pass: boolean, detail: string) {
  results.push({ name, status: pass ? "PASS" : "FAIL", detail });
}

async function uploadChunked(pdfBuffer: Buffer, filename: string): Promise<string> {
  const uploadId = crypto.randomUUID();
  const totalSize = pdfBuffer.length;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  console.log(`Uploading via chunks: ${totalChunks} chunks of ~${(CHUNK_SIZE / 1024 / 1024).toFixed(0)}MB each\n`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkData = pdfBuffer.subarray(start, end);

    const formData = new FormData();
    const blob = new Blob([chunkData], { type: "application/octet-stream" });
    formData.append("chunk", blob, `chunk-${i}`);
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", String(i));
    formData.append("totalChunks", String(totalChunks));
    formData.append("totalSize", String(totalSize));
    formData.append("filename", filename);

    const res = await fetch(`${BASE_URL}/api/upload-chunk`, {
      method: "POST",
      body: formData,
      headers: { "X-Session-ID": "test-automated" },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Chunk ${i + 1}/${totalChunks} failed: ${res.status} - ${err}`);
    }

    const data = await res.json();
    console.log(`  Chunk ${i + 1}/${totalChunks} uploaded (${data.receivedChunks}/${data.totalChunks})${data.complete ? " - COMPLETE" : ""}`);
  }

  return uploadId;
}

async function main() {
  console.log("=== TEST PDF PROCESSING ===\n");

  // 1. Read PDF
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF not found: ${PDF_PATH}`);
    process.exit(1);
  }
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);
  const filename = path.basename(PDF_PATH);
  console.log(`PDF: ${filename} (${sizeMB} MB)\n`);

  // 2. Upload via chunks (same as real app for files > 10MB)
  let uploadId: string;
  try {
    uploadId = await uploadChunked(pdfBuffer, filename);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFATAL: Chunked upload failed`);
    console.error(`Is the dev server running? (npm run dev)\n`);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }

  // 3. Process PDF using uploadId
  const formData = new FormData();
  formData.append("uploadId", uploadId);

  console.log(`\nSending POST to ${BASE_URL}/api/process-pdf (uploadId: ${uploadId}) ...`);
  const startTime = Date.now();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/process-pdf`, {
      method: "POST",
      body: formData,
      headers: { "X-Session-ID": "test-automated" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFATAL: Cannot connect to ${BASE_URL}`);
    console.error(`Is the dev server running? (npm run dev)\n`);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response: ${response.status} in ${elapsed}s\n`);

  // 4. Parse response
  report("HTTP Status 200", response.status === 200, `Got ${response.status}`);

  if (response.status !== 200) {
    const errorText = await response.text();
    console.error("Error response:", errorText);
    printResults();
    process.exit(1);
  }

  const data = await response.json();

  // 5. Check pageCount
  const pageCount = data.pageCount;
  report(
    "pageCount returned",
    typeof pageCount === "number" && pageCount > 0,
    `pageCount = ${pageCount}`
  );

  // 6. Check markdown exists and is substantial
  const markdown: string = data.markdown || "";
  const markdownLen = markdown.length;

  report(
    "Markdown not empty",
    markdownLen > 0,
    `Length = ${markdownLen} chars`
  );

  report(
    "Markdown > 10,000 chars (not truncated)",
    markdownLen > 10000,
    `Length = ${markdownLen} chars`
  );

  // 7. Check for repeated headers (sign of bad cleaning)
  const lines = markdown.split("\n");
  const headerLines = lines.filter((l: string) => /^#{1,3}\s/.test(l));
  const headerCounts = new Map<string, number>();
  for (const h of headerLines) {
    const normalized = h.trim().toLowerCase();
    headerCounts.set(normalized, (headerCounts.get(normalized) || 0) + 1);
  }
  const repeatedHeaders = [...headerCounts.entries()].filter(([, count]) => count > 3);
  report(
    "No excessively repeated headers (>3x)",
    repeatedHeaders.length === 0,
    repeatedHeaders.length === 0
      ? "No repeated headers found"
      : `Repeated: ${repeatedHeaders.map(([h, c]) => `"${h}" x${c}`).join(", ")}`
  );

  // 8. Check tables have proper separators (block-based detection)
  const tableRowRegex = /\|[^|]+\|/;
  const tableSepRegex = /\|[\s-:]+\|/;
  let tablesWithSeparator = 0;
  let tablesWithoutSeparator = 0;

  for (let i = 0; i < lines.length; i++) {
    // Only check the FIRST row of a table block (prev line is not a pipe line)
    const prevLine = lines[i - 1] || "";
    const isPrevPipe = tableRowRegex.test(prevLine) || tableSepRegex.test(prevLine);
    if (isPrevPipe) continue;

    if (tableRowRegex.test(lines[i]) && !tableSepRegex.test(lines[i])) {
      const nextLine = lines[i + 1] || "";
      if (tableSepRegex.test(nextLine)) {
        tablesWithSeparator++;
      } else if (tableRowRegex.test(nextLine)) {
        tablesWithoutSeparator++;
      }
    }
  }

  report(
    "Tables have Markdown separators",
    tablesWithoutSeparator === 0,
    `With separator: ${tablesWithSeparator}, Without: ${tablesWithoutSeparator}`
  );

  // 9. Check for page number artifacts (e.g., standalone "- 5 -" or "Pagina 5")
  const pageNumberPattern = /^(- \d{1,3} -|Página \d{1,3}|Page \d{1,3}|\d{1,3}\s*$)/;
  const pageNumberArtifacts = lines.filter((l: string) => pageNumberPattern.test(l.trim()));
  report(
    "No page number artifacts",
    pageNumberArtifacts.length <= 2,
    pageNumberArtifacts.length === 0
      ? "Clean"
      : `Found ${pageNumberArtifacts.length}: ${pageNumberArtifacts.slice(0, 3).map((l: string) => `"${l.trim()}"`).join(", ")}`
  );

  // 10. Check forensic certificate present
  report(
    "Forensic certificate returned",
    !!data.certificate,
    data.certificate ? "Present" : "Missing"
  );

  // 11. Check validation score
  const score = data.validationScore;
  report(
    "Validation score >= 0.5",
    typeof score === "number" && score >= 0.5,
    `Score = ${score}`
  );

  // Summary
  printResults();

  // Quick content preview
  console.log("\n--- MARKDOWN PREVIEW (first 500 chars) ---");
  console.log(markdown.substring(0, 500));
  console.log("...");
  console.log(`\n--- MARKDOWN END (last 300 chars) ---`);
  console.log(markdown.substring(markdown.length - 300));
}

function printResults() {
  console.log("\n=== RESULTS ===\n");
  const maxName = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const icon = r.status === "PASS" ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.name.padEnd(maxName)}  ${r.detail}`);
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const total = results.length;
  console.log(`\n  ${passed}/${total} passed\n`);

  if (passed < total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
