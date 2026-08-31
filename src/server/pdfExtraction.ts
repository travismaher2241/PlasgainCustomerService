import { Worker } from "node:worker_threads";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { KnowledgePage } from "../types/knowledge";

let activeExtractions = 0;
export async function extractPdf(bytes: Buffer): Promise<KnowledgePage[]> {
  if (bytes.length === 0 || bytes.length > 25 * 1024 * 1024) throw new Error("Upload a PDF smaller than 25 MB.");
  if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))) throw new Error("The file is not a PDF.");
  if (activeExtractions >= 2) throw new Error("Two PDFs are already being processed. Please retry shortly.");
  activeExtractions++;
  try {
    return await new Promise((resolve, reject) => {
      const directory = path.dirname(fileURLToPath(import.meta.url));
      const workerPath = existsSync(path.join(directory, "pdfExtractionWorker.mjs"))
        ? path.join(directory, "pdfExtractionWorker.mjs")
        : path.join(process.cwd(), "src/server/pdfExtractionWorker.mjs");
      const worker = new Worker(workerPath, { workerData: bytes, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 256 } });
      const timer = setTimeout(() => { void worker.terminate(); reject(new Error("PDF extraction timed out. Split the document or upload a simpler PDF.")); }, 60000);
      worker.once("message", result => {
        clearTimeout(timer);
        void worker.terminate();
        if (result.error) reject(new Error(result.error)); else resolve(result.pages);
      });
      worker.once("error", error => { clearTimeout(timer); reject(error); });
      worker.once("exit", code => { clearTimeout(timer); if (code !== 0) reject(new Error("PDF processing stopped before completion.")); });
    });
  } finally { activeExtractions--; }
}
