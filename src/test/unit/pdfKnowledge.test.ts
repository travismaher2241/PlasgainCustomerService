// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KnowledgeStore } from "../../server/knowledgeStore";
import { extractPdf } from "../../server/pdfExtraction";
import { retrieveKnowledge, verifiedCitations, knowledgeRequest, currentEvidence } from "../../server/knowledgeRetrieval";
import { pdfFixture } from "../pdfFixture";

export const metadata = { title: "Test public lighting approvals", productFamily: "Public lighting", documentType: "Specification" as const, version: "1", versionOwner: "Test reviewer", source: "Test only", fileName: "test.pdf", effectiveDate: "2020-01-01", reviewExpiryDate: "2099-01-01" };
let directory: string;
let store: KnowledgeStore;
beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), "plasgain-knowledge-test-")); store = new KnowledgeStore({ directory }); });
afterEach(async () => { vi.useRealTimers(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe("PDF knowledge extraction and persistent review", () => {
  it("requires explicit durable storage in production, never an ephemeral fallback", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VITEST", "");
    vi.stubEnv("PLASGAIN_KNOWLEDGE_DIR", ""); vi.stubEnv("PLASGAIN_KNOWLEDGE_BUCKET", "");
    const productionStore = new KnowledgeStore();
    expect(productionStore.isConfigured()).toBe(false);
    await expect(productionStore.list()).rejects.toMatchObject({ status: 503 });
    vi.stubEnv("PLASGAIN_KNOWLEDGE_DIR", path.resolve("public", "knowledge"));
    await expect(productionStore.list()).rejects.toThrow("publicly served");
  });
  it("excludes approved pages outside their effective or review dates", async () => {
    const { document } = await store.ingest(pdfFixture([[{ x: 10, y: 700, text: "ZX-10 test specification" }]]), { ...metadata, effectiveDate: "2090-01-01", reviewExpiryDate: "2099-01-01" }, "Uploader");
    await store.review(document.id, 1, { text: "ZX-10 test specification", excluded: false, reason: "", revision: 1 }, "Reviewer");
    await store.approve(document.id, 2, "Reviewer");
    expect(await retrieveKnowledge("ZX-10", store)).toEqual([]);
    vi.useFakeTimers(); vi.setSystemTime(new Date("2095-01-01"));
    expect(await retrieveKnowledge("ZX-10", store)).toHaveLength(1);
    vi.setSystemTime(new Date("2100-01-01"));
    expect(await retrieveKnowledge("ZX-10", store)).toEqual([]);
  });
  it("retains every page and table x positions without inventing blank cell values", async () => {
    const pages = await extractPdf(pdfFixture());
    expect(pages).toHaveLength(2);
    const firstRow = pages[0].extractedText.split("\n").find(line => line.includes("ZX-10"))!;
    expect(firstRow).toContain("[x=220.0] Approved");
    expect(firstRow).not.toContain("x=320");
    expect(pages[1].extractedText).toBe("");
    expect(pages[1].warnings.join(" ")).toContain("Little or no native text");
  });
  it("rejects renamed non-PDF and corrupt PDF bytes", async () => {
    await expect(extractPdf(Buffer.from("not a PDF"))).rejects.toThrow("not a PDF");
    await expect(extractPdf(Buffer.from("%PDF-1.7 garbage"))).rejects.toThrow();
  });
  it("persists original, page text and review across store recreation, deduplicating original bytes", async () => {
    const bytes = pdfFixture();
    const { document } = await store.ingest(bytes, metadata, "Test uploader");
    expect(document.approvalStatus).toBe("Approved");
    expect(document.checksum).toHaveLength(64);
    const restarted = new KnowledgeStore({ directory });
    expect(await restarted.original(document.id)).toEqual(bytes);
    expect((await restarted.get(document.id))?.pages).toHaveLength(2);
    expect((await restarted.ingest(bytes, { ...metadata, title: "Different title" }, "Other")).duplicate).toBe(true);
    expect(await restarted.list()).toHaveLength(1);
    const sources = await retrieveKnowledge("ZX-10 Jemena", restarted);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ page: 1, documentId: document.id });
    expect(sources[0].text).toContain("Jemena");
    await store.retire(document.id, 1, "Reviewer");
    expect(await retrieveKnowledge("ZX-10", restarted)).toEqual([]);
  });
  it("keeps original extraction when correcting page text", async () => {
    const { document } = await store.ingest(pdfFixture(), metadata, "Uploader");
    const before = (await store.get(document.id))!;
    const result = await store.review(document.id, 1, { text: "ZX-10: Jemena approval not stated (cell blank).", excluded: false, reason: "", revision: 1 }, "Reviewer");
    expect(result.pages[0].extractedText).toBe(before.pages[0].extractedText);
    expect(result.pages[0].reviewedBy).toBe("Reviewer");
    expect(result.pages[0].reviewedText).toContain("cell blank");
  });
  it("blocks damaged originals and path traversal", async () => {
    const { document } = await store.ingest(pdfFixture(), metadata, "Uploader");
    await writeFile(path.join(directory, `${document.id}.pdf`), "corrupted");
    await expect(store.original(document.id)).rejects.toThrow("integrity check");
    await expect(store.get("../../other-file")).rejects.toMatchObject({ status: 400 });
  });
  it("never supplies private evidence without a verified session", async () => {
    await knowledgeRequest.run({ authenticated: false, query: "ZX-10" }, async () => expect(await currentEvidence()).toEqual([]));
  });
  it("only accepts exact excerpts from retrieved page IDs", () => {
    const source = { sourceId: "pdf-abc:p2", documentId: "pdf-abc", title: "Test", version: "1", page: 2, fileUrl: "/file", text: "Pole code ZX-10. Powercor: Approved. Jemena: not stated." };
    expect(verifiedCitations([{ sourceId: source.sourceId, excerpt: "Jemena: Approved." }], [source])).toEqual([]);
    expect(verifiedCitations([{ sourceId: "pdf-abc:p1", excerpt: source.text }], [source])).toEqual([]);
    expect(verifiedCitations([{ sourceId: source.sourceId, excerpt: "Jemena: not stated." }], [source])[0]).toMatchObject({ page: 2, excerpt: "Jemena: not stated." });
  });
});
