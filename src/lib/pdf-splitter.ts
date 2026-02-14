export interface PDFChunk {
  startPage: number;
  endPage: number;
  pageCount: number;
}

export function calculateOptimalChunks(totalPages: number): PDFChunk[] {
  if (totalPages <= 30) {
    return [{ startPage: 1, endPage: totalPages, pageCount: totalPages }];
  }

  const CHUNK_SIZE = 35;
  const chunks: PDFChunk[] = [];

  for (let start = 1; start <= totalPages; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, totalPages);
    chunks.push({
      startPage: start,
      endPage: end,
      pageCount: end - start + 1,
    });
  }

  return chunks;
}
