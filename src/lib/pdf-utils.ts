import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

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
