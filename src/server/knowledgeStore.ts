import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile, rename, open, unlink } from "node:fs/promises";
import path from "node:path";
import { Storage } from "@google-cloud/storage";
import type { KnowledgeDocument, KnowledgeRecord, KnowledgePage } from "../types/knowledge";
import { extractPdf } from "./pdfExtraction";

export class KnowledgeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const validId = (id: string) => /^pdf-[a-f0-9]{64}$/.test(id);
export const isKnowledgeId = validId;
export const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

// Original and reviewed text live together in an atomically replaced record.
// GCS generation preconditions prevent lost reviews across multiple instances.
export class KnowledgeStore {
  constructor(private configuration?: { directory: string }) {}
  isConfigured(): boolean {
    return Boolean(this.configuration || process.env.NODE_ENV === "test" || process.env.VITEST || process.env.VERCEL || process.env.PLASGAIN_KNOWLEDGE_BUCKET || process.env.PLASGAIN_KNOWLEDGE_DIR || (!process.env.K_SERVICE && process.env.NODE_ENV !== "production"));
  }
  private backend() {
    if (this.configuration) return { directory: this.configuration.directory, bucket: "" };
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      if (!process.env.PLASGAIN_KNOWLEDGE_DIR) return { directory: path.join(process.cwd(), "tmp", `knowledge-tests-${process.pid}`), bucket: "" };
      return { directory: process.env.PLASGAIN_KNOWLEDGE_DIR, bucket: "" };
    }
    const bucket = process.env.PLASGAIN_KNOWLEDGE_BUCKET || "";
    const directory = process.env.PLASGAIN_KNOWLEDGE_DIR || (process.env.VERCEL ? path.join("/tmp", "server_data", "knowledge") : path.join(process.cwd(), "server_data", "knowledge"));
    for (const publicDirectory of ["public", "dist"]) {
      const relative = path.relative(path.resolve(publicDirectory), path.resolve(directory));
      if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) throw new KnowledgeError(503, "Knowledge storage cannot be inside a publicly served directory. Configure a private persistent directory.");
    }
    if ((process.env.K_SERVICE || (process.env.NODE_ENV === "production" && !process.env.VERCEL)) && !bucket && !process.env.PLASGAIN_KNOWLEDGE_DIR) {
      throw new KnowledgeError(503, "Persistent knowledge storage is not configured. Set PLASGAIN_KNOWLEDGE_BUCKET for cloud storage, or PLASGAIN_KNOWLEDGE_DIR to a persistent disk. Uploads are disabled to prevent document loss.");
    }
    return { bucket, directory };
  }
  storageKind(): "local" | "cloud" { return this.backend().bucket ? "cloud" : "local"; }
  private cloud() { return new Storage({ retryOptions: { totalTimeout: 20000, maxRetries: 2 } }).bucket(this.backend().bucket); }
  private key(id: string, extension: "json" | "pdf") {
    if (!validId(id)) throw new KnowledgeError(400, "Invalid document ID.");
    return `knowledge/${id}.${extension}`;
  }
  private async read(id: string, extension: "json" | "pdf"): Promise<Buffer | null> {
    const key = this.key(id, extension);
    try {
      if (this.backend().bucket) return (await this.cloud().file(key).download())[0];
      return await readFile(path.join(this.backend().directory, path.basename(key)));
    } catch (error: any) {
      if (error.code === "ENOENT" || error.code === 404) return null;
      throw error;
    }
  }
  async get(id: string): Promise<KnowledgeRecord | null> {
    const data = await this.read(id, "json");
    return data ? JSON.parse(data.toString("utf8")) : null;
  }
  async list(): Promise<KnowledgeDocument[]> {
    let ids: string[];
    const { directory, bucket } = this.backend();
    if (bucket) {
      const [files] = await this.cloud().getFiles({ prefix: "knowledge/" });
      ids = files.map(file => path.basename(file.name, ".json")).filter(validId);
    } else {
      try { ids = (await readdir(directory)).filter(name => name.endsWith(".json")).map(name => name.slice(0, -5)).filter(validId); }
      catch (error: any) { if (error.code === "ENOENT") return []; throw error; }
    }
    const documents: KnowledgeDocument[] = [];
    // Bound I/O concurrency instead of issuing one request per page/document at once.
    for (let index = 0; index < ids.length; index += 8) {
      const records = await Promise.all(ids.slice(index, index + 8).map(id => this.get(id)));
      for (const record of records) if (record) documents.push(record.document);
    }
    return documents.sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }
  async original(id: string): Promise<Buffer> {
    const bytes = await this.read(id, "pdf");
    if (!bytes) throw new KnowledgeError(404, "Original PDF is unavailable.");
    if (`pdf-${sha256(bytes)}` !== id) throw new KnowledgeError(409, "Original PDF failed its integrity check. Restore it from backup before use.");
    return bytes;
  }
  private async saveOriginal(id: string, bytes: Buffer) {
    const { directory, bucket } = this.backend();
    if (bucket) {
      try { await this.cloud().file(this.key(id, "pdf")).save(bytes, { resumable: false, contentType: "application/pdf", preconditionOpts: { ifGenerationMatch: 0 } }); }
      catch (error: any) { if (error.code !== 412) throw error; await this.original(id); }
    } else {
      await mkdir(directory, { recursive: true });
      const file = path.join(directory, `${id}.pdf`);
      try { await writeFile(file, bytes, { flag: "wx" }); }
      catch (error: any) { if (error.code !== "EEXIST") throw error; await this.original(id); }
    }
  }
  private async writeRecord(record: KnowledgeRecord, expectedRevision: number) {
    const id = record.document.id;
    const { bucket, directory } = this.backend();
    const check = (current: KnowledgeRecord | null) => {
      if ((current?.document.knowledge.revision || 0) !== expectedRevision) throw new KnowledgeError(409, "This document changed in another session. Reload before saving.");
    };
    if (bucket) {
      const file = this.cloud().file(this.key(id, "json"));
      let generation: string | number = 0;
      try {
        const [metadata] = await file.getMetadata();
        generation = metadata.generation!;
        const [data] = await file.download({ validation: "crc32c" });
        check(JSON.parse(data.toString()));
      } catch (error: any) { if (error.code !== 404) throw error; check(null); }
      try {
        await file.save(JSON.stringify(record), { resumable: false, contentType: "application/json", preconditionOpts: { ifGenerationMatch: generation } });
      } catch (error: any) { if (error.code === 412) throw new KnowledgeError(409, "This document changed. Reload before saving."); throw error; }
      return;
    }
    await mkdir(directory, { recursive: true });
    const lockPath = path.join(directory, `${id}.lock`);
    let lock;
    try { lock = await open(lockPath, "wx"); }
    catch (error: any) { if (error.code === "EEXIST") throw new KnowledgeError(409, "Document is being saved. Retry shortly. If this persists after a server crash, ask your administrator to clear the stale lock."); throw error; }
    const temp = path.join(directory, `${id}.${randomUUID()}.tmp`);
    try {
      check(await this.get(id));
      await writeFile(temp, JSON.stringify(record), { flag: "wx" });
      await rename(temp, path.join(directory, `${id}.json`));
    } finally {
      await lock.close();
      await unlink(lockPath);
      await unlink(temp).catch(() => {});
    }
  }
  async ingest(bytes: Buffer, metadata: Pick<KnowledgeDocument, "title" | "productFamily" | "documentType" | "version" | "versionOwner" | "effectiveDate" | "reviewExpiryDate" | "source" | "fileName">, uploader: string) {
    this.backend(); // Fail before processing when durable storage is not configured.
    const id = `pdf-${sha256(bytes)}`;
    const existing = await this.get(id);
    if (existing) { await this.original(id); return { document: existing.document, duplicate: true }; }
    let pages: KnowledgePage[];
    try { pages = await extractPdf(bytes); }
    catch (error: any) { throw new KnowledgeError(422, error.message); }
    const now = new Date().toISOString();
    pages.forEach((page) => {
      page.reviewedAt = now;
      page.reviewedBy = `${uploader} (AI Ingested)`;
    });
    const document: KnowledgeDocument = {
      ...metadata, id, uploader, approvalStatus: "Approved", uploadedAt: now, approvedBy: `${uploader} (AI Ingested)`, approvedAt: now,
      checksum: id.slice(4), fileSizeBytes: bytes.length, mimeType: "application/pdf", isExternalMetadataOnly: false,
      fileUrl: `/api/knowledge/documents/${id}/file`, pageCount: pages.length,
      knowledge: { extractionMethod: "gemini-pdf-knowledge-v1", status: "Ready", reviewedPages: pages.length,
        warningPages: pages.filter(page => page.warnings.length > 1).map(page => page.page), storage: this.storageKind(), revision: 1 },
    };
    await this.saveOriginal(id, bytes);
    try { await this.writeRecord({ document, pages }, 0); }
    catch (error) {
      if (error instanceof KnowledgeError && error.status === 409) {
        const concurrent = await this.get(id);
        if (concurrent) return { document: concurrent.document, duplicate: true };
      }
      throw error;
    }
    return { document, duplicate: false };
  }
  async review(id: string, pageNumber: number, input: { text: string; excluded: boolean; reason: string; revision: number }, reviewer: string) {
    const record = await this.get(id);
    if (!record) throw new KnowledgeError(404, "Document not found.");
    const page = record.pages.find(page => page.page === pageNumber);
    if (!page) throw new KnowledgeError(404, "Page not found.");
    if (input.text.length > 60000 || input.reason.length > 2000) throw new KnowledgeError(400, "Page review is too long.");
    Object.assign(page, { reviewedText: input.text, excluded: input.excluded, exclusionReason: input.excluded ? input.reason.trim() : undefined, reviewedBy: reviewer, reviewedAt: new Date().toISOString() });
    record.document.knowledge.reviewedPages = record.pages.filter(page => page.reviewedAt).length;
    record.document.knowledge.revision = input.revision + 1;
    await this.writeRecord(record, input.revision);
    return record;
  }
  async approve(id: string, revision: number, reviewer: string) {
    const record = await this.get(id);
    if (!record) throw new KnowledgeError(404, "Document not found.");
    const now = new Date().toISOString();
    record.pages.forEach(page => {
      if (!page.reviewedAt) {
        page.reviewedAt = now;
        page.reviewedBy = reviewer;
      }
    });
    Object.assign(record.document, { approvalStatus: "Approved", approvedBy: reviewer, approvedAt: now });
    record.document.knowledge.status = "Ready";
    record.document.knowledge.reviewedPages = record.pages.filter(p => !p.excluded).length;
    record.document.knowledge.revision = revision + 1;
    await this.writeRecord(record, revision);
    return record.document;
  }
  async retire(id: string, revision: number, reviewer: string) {
    const record = await this.get(id);
    if (!record) throw new KnowledgeError(404, "Document not found.");
    record.document.approvalStatus = "Superseded";
    record.document.knowledge.status = "Pending Review";
    record.document.knowledge.revision = revision + 1;
    record.document.validationResult = { isValid: false, checkedAt: new Date().toISOString(), notes: `Withdrawn from AI knowledge by ${reviewer}` };
    await this.writeRecord(record, revision);
    return record.document;
  }
}

export const knowledgeStore = new KnowledgeStore();
