import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Server-side (Node.js): use local npm module path so import() can resolve it
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

export async function getActualPageCount(arrayBuffer: ArrayBuffer): Promise<number> {
    try {
        const pdf = await getDocument({
            data: new Uint8Array(arrayBuffer),
            useSystemFonts: true,
            isEvalSupported: false,
            disableFontFace: true,
        }).promise;
        const count = pdf.numPages;
        pdf.destroy();
        return count;
    } catch (error) {
        console.error('Error reading PDF page count:', error);
        return 1;
    }
}
