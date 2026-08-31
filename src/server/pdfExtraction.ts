import { Worker } from "node:worker_threads";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { KnowledgePage } from "../types/knowledge";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

/**
 * Heap ceiling for one extraction worker.
 *
 * pdf.js needs far more memory than the file it is reading: at 256 MB an
 * ordinary 20 MB catalogue died in under two seconds, well inside the 25 MB the
 * upload form offers. Sized to carry the largest PDF we accept, and still
 * bounded so one document cannot exhaust the server.
 */
const WORKER_HEAP_MB = Number(process.env.PLASGAIN_PDF_WORKER_HEAP_MB) || 1024;

let activeExtractions = 0;

async function extractDirectly(bytes: Buffer): Promise<KnowledgePage[]> {
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  const pdf = await task.promise;
  if (pdf.numPages > 200) throw new Error("PDF exceeds the 200-page limit. Split it into smaller documents.");
  const pages: KnowledgePage[] = [];
  let totalCharacters = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items as any[]).filter(item => "str" in item && item.str.trim());
    if (items.length > 20000) throw new Error(`Page ${pageNumber} is too complex to extract safely.`);
    const rows: { y: number; cells: { x: number; text: string }[] }[] = [];
    for (const item of items.sort((a,b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
      const y = item.transform[5];
      let row = rows.find(row => Math.abs(row.y - y) < 2);
      if (!row) { row = { y, cells: [] }; rows.push(row); }
      row.cells.push({ x: item.transform[4], text: item.str });
    }
    const text = rows.map(row => row.cells.sort((a,b) => a.x-b.x)
      .map(cell => `[x=${cell.x.toFixed(1)}] ${cell.text}`).join(" | ")).join("\n");
    totalCharacters += text.length;
    if (totalCharacters > 2000000 || text.length > 60000) throw new Error("Extracted text exceeds safe limits. Split this PDF into smaller documents.");
    const warnings = ["Verify numbers, units, symbols, table columns, blank cells and footnotes against the original. Horizontal x positions are preserved; they are not measurements from the document."];
    if (items.reduce((n,i) => n + i.str.length, 0) < 80) warnings.push("Little or no native text: this may be a scan, drawing, cover or blank page. Transcribe relevant content or explicitly exclude this page with a reason.");
    if (/\uFFFD/.test(text)) warnings.push("Unrecognised characters detected. Correct the transcription before approval.");
    pages.push({ page: pageNumber, extractedText: text, reviewedText: text, warnings });
    page.cleanup();
  }
  await task.destroy();
  return pages;
}

export async function extractPdf(bytes: Buffer): Promise<KnowledgePage[]> {
  if (bytes.length === 0 || bytes.length > 25 * 1024 * 1024) throw new Error("Upload a PDF smaller than 25 MB.");
  if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))) throw new Error("The file is not a PDF.");
  if (activeExtractions >= 2) throw new Error("Two PDFs are already being processed. Please retry shortly.");
  activeExtractions++;
  try {
    // In serverless environment or when worker threads are disabled, extract directly
    if (process.env.VERCEL) {
      return await extractDirectly(bytes);
    }

    return await new Promise((resolve, reject) => {
      const directory = path.dirname(fileURLToPath(import.meta.url));
      const workerPath = existsSync(path.join(directory, "pdfExtractionWorker.mjs"))
        ? path.join(directory, "pdfExtractionWorker.mjs")
        : path.join(process.cwd(), "src/server/pdfExtractionWorker.mjs");

      if (!existsSync(workerPath)) {
        return extractDirectly(bytes).then(resolve, reject);
      }

      const worker = new Worker(workerPath, { workerData: bytes, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_MB } });
      const timer = setTimeout(() => { void worker.terminate(); reject(new Error("PDF extraction timed out. Split the document or upload a simpler PDF.")); }, 60000);
      worker.once("message", result => {
        clearTimeout(timer);
        void worker.terminate();
        if (result.error) reject(new Error(result.error)); else resolve(result.pages);
      });
      // A heap exhaustion arrives as a V8 message no rep can act on; say what to do instead.
      worker.once("error", error => {
        clearTimeout(timer);
        reject((error as NodeJS.ErrnoException)?.code === "ERR_WORKER_OUT_OF_MEMORY"
          ? new Error("This PDF needs more memory than the extractor allows — it is likely scan-heavy or image-heavy. Split it into smaller documents and upload each part.")
          : error);
      });
      worker.once("exit", code => { clearTimeout(timer); if (code !== 0) reject(new Error("PDF processing stopped before completion.")); });
    });
  } finally { activeExtractions--; }
}
