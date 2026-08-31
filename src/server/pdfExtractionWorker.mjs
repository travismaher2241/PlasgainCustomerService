import { parentPort, workerData } from "node:worker_threads";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

// No PDF scripts, external resources, or generative transcription are executed.
// Keep physical x positions: empty table cells must not shift later approvals.
try {
  const task = getDocument({
    data: new Uint8Array(workerData), isEvalSupported: false,
    useSystemFonts: false, disableFontFace: true, stopAtErrors: true,
    verbosity: 0,
  });
  const pdf = await task.promise;
  if (pdf.numPages > 200) throw new Error("PDF exceeds the 200-page limit. Split it into smaller documents.");
  const pages = [];
  let totalCharacters = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter(item => "str" in item && item.str.trim());
    if (items.length > 20000) throw new Error(`Page ${pageNumber} is too complex to extract safely.`);
    const rows = [];
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
  parentPort.postMessage({ pages });
} catch (error) {
  parentPort.postMessage({ error: error?.name === "PasswordException" ? "Password-protected PDFs are not supported. Upload an unlocked copy." : (error?.message || "PDF extraction failed.") });
}
