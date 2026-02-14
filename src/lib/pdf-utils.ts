import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Disable worker for Node.js server-side usage
GlobalWorkerOptions.workerSrc = '';

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
