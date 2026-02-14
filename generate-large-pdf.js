const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("fs");

async function generateLargePDF() {
  const TOTAL_PAGES = 1500;
  const OUTPUT = "IPRA_LARGE.pdf";
  const TARGET_MB = 500;
  const LINES_PER_PAGE = 50;

  const legalTexts = [
    "WHEREAS, the parties hereto have agreed to the terms and conditions set forth in this Agreement, including but not limited to all exhibits, schedules, and amendments attached hereto and incorporated by reference herein, effective as of the date first written above.",
    "NOW, THEREFORE, in consideration of the mutual covenants and agreements hereinafter set forth and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows pursuant to applicable law.",
    "The Disclosing Party shall provide all documentation, records, and materials reasonably requested by the Receiving Party within thirty (30) business days of such request, subject to any applicable legal privileges, confidentiality obligations, or regulatory restrictions.",
    "Notwithstanding anything to the contrary contained herein, the obligations of the parties under this Section shall survive the termination or expiration of this Agreement for a period of five (5) years from the date of such termination or expiration thereof.",
    "IN WITNESS WHEREOF, the undersigned parties have caused this Agreement to be duly executed by their respective authorized representatives as of the date and year first above written, and each party warrants that it has full authority to enter into this Agreement.",
    "Subject to the provisions of Section 4.2(a) through 4.2(f) inclusive, the Indemnifying Party shall defend, indemnify, and hold harmless the Indemnified Party from and against any and all claims, damages, losses, costs, and expenses arising out of or related thereto.",
    "The arbitration shall be conducted in accordance with the rules of the American Arbitration Association then in effect, and judgment upon the award rendered by the arbitrator(s) may be entered in any court having jurisdiction thereof pursuant to applicable federal and state law.",
    "Each party represents and warrants that (i) it is duly organized, validly existing, and in good standing under the laws of its jurisdiction of organization, (ii) it has all requisite power and authority to execute and deliver this Agreement, and (iii) this Agreement constitutes its legal obligation.",
  ];

  const tableHeaders = ["Item No.", "Description", "Amount (USD)", "Status"];
  const tableRows = [
    ["001", "Legal consultation services", "$12,500.00", "Completed"],
    ["002", "Document review and analysis", "$8,750.00", "In Progress"],
    ["003", "Regulatory compliance audit", "$15,200.00", "Pending"],
    ["004", "Contract negotiation fees", "$6,300.00", "Completed"],
    ["005", "Litigation support services", "$22,100.00", "In Progress"],
  ];

  // --- STEP 1: Create 1500-page legal PDF ---
  console.log(`Step 1: Creating ${TOTAL_PAGES}-page legal PDF...`);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < TOTAL_PAGES; p++) {
    const page = pdfDoc.addPage([612, 792]);
    let y = 760;

    page.drawText(`IPRA COMPLIANCE DOCUMENT — SECTION ${p + 1} OF ${TOTAL_PAGES}`, {
      x: 50, y, size: 11, font: fontBold, color: rgb(0, 0, 0),
    });
    y -= 8;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, thickness: 1, color: rgb(0, 0, 0) });
    y -= 16;

    for (let l = 0; l < LINES_PER_PAGE; l++) {
      const text = legalTexts[(p + l) % legalTexts.length];
      page.drawText(text.substring(0, 200), {
        x: 50, y, size: 9, font, color: rgb(0.1, 0.1, 0.1), maxWidth: 512,
      });
      y -= 12;
      if (y < 100) break;
    }

    const tableTop = 90;
    const colWidths = [60, 200, 100, 100];
    let tx = 50;
    for (let c = 0; c < tableHeaders.length; c++) {
      page.drawRectangle({ x: tx, y: tableTop - 12, width: colWidths[c], height: 14, color: rgb(0.85, 0.85, 0.85) });
      page.drawText(tableHeaders[c], { x: tx + 3, y: tableTop - 9, size: 7, font: fontBold });
      tx += colWidths[c];
    }
    const row = tableRows[p % tableRows.length];
    tx = 50;
    for (let c = 0; c < row.length; c++) {
      page.drawText(row[c], { x: tx + 3, y: tableTop - 22, size: 7, font });
      tx += colWidths[c];
    }

    page.drawText(`Page ${p + 1} | Confidential — Do Not Distribute`, {
      x: 200, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5),
    });

    if ((p + 1) % 250 === 0) console.log(`  ${p + 1}/${TOTAL_PAGES} pages...`);
  }

  console.log("Serializing base PDF...");
  const pdfBytes = await pdfDoc.save();
  const baseSizeMB = pdfBytes.length / 1024 / 1024;
  console.log(`Base PDF: ${baseSizeMB.toFixed(1)} MB, ${TOTAL_PAGES} pages\n`);

  // --- STEP 2: Embed large attachment to reach target size ---
  console.log(`Step 2: Inflating to ~${TARGET_MB}MB via embedded file attachment...`);

  // Write base first
  fs.writeFileSync(OUTPUT, pdfBytes);

  // Reload and attach a large binary blob
  const doc2 = await PDFDocument.load(pdfBytes);
  const deficit = (TARGET_MB * 1024 * 1024) - pdfBytes.length;

  if (deficit > 0) {
    // Generate binary data in chunks to avoid OOM
    // We'll write it as an embedded file (EmbeddedFiles in PDF catalog)
    // Since pdf-lib doesn't support embedded files natively, we'll use a raw approach:
    // Write the base PDF, then append raw PDF objects with a large stream

    console.log(`Need to add ~${(deficit / 1024 / 1024).toFixed(0)}MB of data...`);
    console.log("Writing inflated PDF using raw PDF manipulation...");

    await inflatePDFRaw(OUTPUT, deficit);
  }

  const finalStats = fs.statSync(OUTPUT);
  console.log(`\nDone! Final file: ${OUTPUT}`);
  console.log(`Size: ${(finalStats.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Pages: ${TOTAL_PAGES}`);
}

async function inflatePDFRaw(filePath, bytesToAdd) {
  // Strategy: Append a large stream object to the PDF and update xref
  // We'll add it as a metadata stream that doesn't affect rendering
  // but makes the file legitimately larger

  const pdfData = fs.readFileSync(filePath);
  const pdfStr = pdfData.toString("latin1");

  // Find the last xref offset (startxref)
  const startxrefMatch = pdfStr.match(/startxref\s+(\d+)\s+%%EOF/);
  if (!startxrefMatch) throw new Error("Cannot find startxref");

  const oldXrefOffset = parseInt(startxrefMatch[1]);

  // We'll write incrementally: add new objects after %%EOF
  // This is a valid PDF incremental update

  const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB chunks to avoid OOM
  const fd = fs.openSync(filePath, "a");

  // Find next available object number by scanning for highest obj number
  const objMatches = pdfStr.matchAll(/(\d+)\s+0\s+obj/g);
  let maxObj = 0;
  for (const m of objMatches) {
    const n = parseInt(m[1]);
    if (n > maxObj) maxObj = n;
  }
  const newObjNum = maxObj + 1;

  // Build the stream object header
  const streamHeader = `\n${newObjNum} 0 obj\n<< /Type /EmbeddedFile /Length ${bytesToAdd} >>\nstream\n`;
  const streamFooter = `\nendstream\nendobj\n`;

  // Write header
  const headerBuf = Buffer.from(streamHeader, "latin1");
  fs.writeSync(fd, headerBuf);

  // Write binary data in chunks
  let remaining = bytesToAdd;
  let written = 0;
  const filler = Buffer.alloc(Math.min(CHUNK_SIZE, bytesToAdd));

  // Fill with pseudo-legal text bytes for realism
  const legalFiller = "COMPLIANCE RECORD ENTRY: This document contains confidential information subject to attorney-client privilege and work product doctrine. Unauthorized disclosure is strictly prohibited. REF#";
  const fillerBytes = Buffer.from(legalFiller.repeat(Math.ceil(filler.length / legalFiller.length)).substring(0, filler.length), "latin1");
  fillerBytes.copy(filler);

  while (remaining > 0) {
    const toWrite = Math.min(remaining, filler.length);
    fs.writeSync(fd, filler, 0, toWrite);
    remaining -= toWrite;
    written += toWrite;
    if (written % (100 * 1024 * 1024) < CHUNK_SIZE) {
      console.log(`  Written ${(written / 1024 / 1024).toFixed(0)}MB / ${(bytesToAdd / 1024 / 1024).toFixed(0)}MB`);
    }
  }

  // Write footer
  fs.writeSync(fd, Buffer.from(streamFooter, "latin1"));

  // Write new xref for the incremental update
  const newXrefOffset = pdfData.length + headerBuf.length + bytesToAdd + streamFooter.length - streamFooter.length;
  // Actually, let's get the precise offset
  const currentPos = pdfData.length; // Start of our appended data

  const xrefEntry = `xref\n${newObjNum} 1\n${String(currentPos).padStart(10, "0")} 00000 n \ntrailer\n<< /Size ${newObjNum + 1} /Prev ${oldXrefOffset} >>\nstartxref\n${pdfData.length + headerBuf.length + bytesToAdd + streamFooter.length}\n%%EOF\n`;

  fs.writeSync(fd, Buffer.from(xrefEntry, "latin1"));
  fs.closeSync(fd);
}

generateLargePDF().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
