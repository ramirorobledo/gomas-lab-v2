import { PDFDocument } from 'pdf-lib';

/**
 * Extracts a range of pages from a PDF buffer and returns a new PDF as a base64 string.
 * @param pdfBuffer The original PDF buffer
 * @param startPage 1-based start page index
 * @param endPage 1-based end page index
 * @returns Base64 string of the new PDF
 */
export async function extractPDFPages(pdfBuffer: Buffer, startPage: number, endPage: number): Promise<string> {
    const srcDoc = await PDFDocument.load(pdfBuffer);
    const dstDoc = await PDFDocument.create();

    // pdf-lib uses 0-based indices
    const pageIndices = [];
    for (let i = startPage - 1; i < endPage; i++) {
        if (i >= 0 && i < srcDoc.getPageCount()) {
            pageIndices.push(i);
        }
    }

    const copiedPages = await dstDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => dstDoc.addPage(page));

    const pdfBytes = await dstDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}
