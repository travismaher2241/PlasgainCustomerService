// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PdfReaderUnavailableError } from "../../server/quotePdfParser";

/**
 * The quote import once reported a missing pdfjs-dist as "this PDF could not be
 * read - if it is a scan, enter the details by hand", which sent the reader off
 * retyping a perfectly good quote. The two failures must stay distinguishable.
 */
describe("PDF reader availability", () => {
  it("names the real fix rather than blaming the file", () => {
    const err = new PdfReaderUnavailableError(new Error("Cannot find package 'pdfjs-dist'"));

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PdfReaderUnavailableError");
    expect(err.message).toMatch(/npm install/i);
    expect(err.message).toContain("pdfjs-dist");
    // It must never suggest the document itself is the problem.
    expect(err.message).not.toMatch(/scan/i);
  });

  it("keeps the underlying error for the log", () => {
    const err = new PdfReaderUnavailableError(new Error("ERR_MODULE_NOT_FOUND"));
    expect(err.message).toContain("ERR_MODULE_NOT_FOUND");
  });
});
