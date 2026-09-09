import {
  PositionedText,
  ParsedQuote,
  parseQuoteFromPositionedText,
  followUpDateFor
} from './quoteParser';

export async function parseQuotePdfInBrowser(fileOrBuffer: File | ArrayBuffer): Promise<ParsedQuote> {
  const pdfjs = await import('pdfjs-dist');

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '4.6.82'}/build/pdf.worker.min.mjs`;
    } catch {
      // Fallback to fake worker
    }
  }

  const arrayBuffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true
  });

  const doc = await loadingTask.promise;
  const items: PositionedText[] = [];
  const PAGE_STRIDE = 100000;

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    for (const item of (content.items || []) as any[]) {
      if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
      const x =
        Array.isArray(item.transform) && Number.isFinite(item.transform[4])
          ? Math.round(item.transform[4])
          : 0;
      const y =
        Array.isArray(item.transform) && Number.isFinite(item.transform[5])
          ? Math.round(item.transform[5])
          : 0;
      items.push({
        x,
        y: y - pageNo * PAGE_STRIDE,
        text: item.str
      });
    }
  }

  return parseQuoteFromPositionedText(items);
}

export { followUpDateFor };
