/**
 * Quote PDF import - parser
 *
 * Reads a Plasgain quote PDF (Ostendo output) and returns the commercial facts
 * on it: quote number, dates, customer, project and line items.
 *
 * Deliberately deterministic. Ostendo lays the document out on a fixed grid, so
 * fields can be read from their column positions exactly rather than inferred.
 * A model asked to do this would occasionally return a plausible quote number
 * or a wrong dollar figure, and a wrong figure filed against a customer is a
 * commercial problem, not a formatting one. This also means the import works
 * with no API key and its behaviour is reproducible in tests.
 *
 * Where a field cannot be read, the parser says so in `warnings` and leaves the
 * value undefined. It never guesses.
 */

import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import {
  parseAustralianDate,
  splitAustralianAddress,
  parseMoney,
  groupIntoRows,
  parseQuoteFromPositionedText,
  followUpDateFor
} from "../utils/quoteParser";
import type {
  PositionedText,
  QuoteLineItem,
  ParsedQuote
} from "../utils/quoteParser";

export {
  parseAustralianDate,
  splitAustralianAddress,
  parseMoney,
  groupIntoRows,
  parseQuoteFromPositionedText,
  followUpDateFor
};
export type {
  PositionedText,
  QuoteLineItem,
  ParsedQuote
};

// Polyfill DOMMatrix and Path2D if running in a headless Node/serverless runtime
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    inverse() { return this; }
    transformPoint(point: any) { return point; }
    toFloat32Array() { return new Float32Array([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1]); }
    toFloat64Array() { return new Float64Array([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1]); }
  };
}

if (typeof (globalThis as any).Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  };
}

function getPdfjsAssetOptions(): {
  standardFontDataUrl?: string;
  cMapUrl?: string;
  cMapPacked?: boolean;
} {
  try {
    const req = createRequire(import.meta.url);
    const pdfjsDir = path.dirname(req.resolve("pdfjs-dist/package.json"));
    return {
      standardFontDataUrl: pathToFileURL(path.join(pdfjsDir, "standard_fonts/")).href,
      cMapUrl: pathToFileURL(path.join(pdfjsDir, "cmaps/")).href,
      cMapPacked: true
    };
  } catch {
    return {};
  }
}

/**
 * Raised when the PDF reader itself is unavailable - a missing dependency or a
 * build that cannot resolve it. Distinct from an unreadable PDF, because the
 * fix is completely different: run npm install, rather than retype the quote.
 */
export class PdfReaderUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      "The PDF reader (pdfjs-dist) could not be loaded. Run npm install in the " +
        `workspace and restart the server. Underlying error: ${
          cause instanceof Error ? cause.message : String(cause)
        }`
    );
    this.name = "PdfReaderUnavailableError";
  }
}

/** Extracts positioned text from a PDF buffer, then parses it. */
export async function parseQuotePdf(buffer: Buffer | Uint8Array): Promise<ParsedQuote> {
  let getDocument: typeof import("pdfjs-dist/legacy/build/pdf.mjs")["getDocument"];
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    getDocument = pdfjs.getDocument;
    try {
      await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } catch {
      // Fallback handled by pdfjs internal fake worker
    }
  } catch (err) {
    // Telling someone their quote "might be a scan" when the real problem is an
    // uninstalled dependency sends them off retyping a perfectly good PDF.
    throw new PdfReaderUnavailableError(err);
  }

  const assetOptions = getPdfjsAssetOptions();
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    ...assetOptions
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("PDF reading timed out after 10 seconds")), 10000)
  );
  const doc = await Promise.race([loadingTask.promise, timeoutPromise]);

  const items: PositionedText[] = [];
  // Later pages are offset downward so their rows never merge with page one's.
  const PAGE_STRIDE = 100000;

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    for (const item of (content.items || []) as any[]) {
      if (!item || typeof item.str !== "string" || !item.str.trim()) continue;
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

  if (items.length === 0) {
    return {
      lineItems: [],
      warnings: [
        "This PDF has no readable text - it is probably a scan or an image. " +
          "Nothing could be read from it automatically."
      ]
    };
  }

  try {
    return parseQuoteFromPositionedText(items);
  } catch (err: any) {
    console.warn("parseQuoteFromPositionedText encountered an unexpected error:", err);
    return {
      lineItems: [],
      warnings: [`Could not parse quote layout: ${err?.message || "Unknown error"}`]
    };
  }
}
