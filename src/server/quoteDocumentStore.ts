import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";

/**
 * Quote document storage
 *
 * Keeps the actual quote PDF so it can be opened from the deal it belongs to.
 * The file is the record a customer received; a parsed summary is not a
 * substitute for it when a price is disputed months later.
 *
 * Files live outside anything statically served - server.ts 404s /server_data
 * wholesale - so the only way to read one is the endpoint, which can enforce
 * whatever access rules the workspace grows later.
 */

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const DOCUMENTS_DIR = path.join(DATA_DIR, "quote_documents");
const INDEX_FILE = path.join(DOCUMENTS_DIR, "index.json");

/** Comfortably under the 10mb JSON body limit once base64 inflates it by ~4/3. */
export const MAX_DOCUMENT_BYTES = 7 * 1024 * 1024;

export interface QuoteDocument {
  id: string;
  fileName: string;
  sizeBytes: number;
  /** Identifies a re-upload of the identical file. */
  sha256: string;
  uploadedAt: string;
  quoteNumber?: string;
  opportunityId?: string;
  accountId?: string;
}

const isTestEnv = (): boolean =>
  process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

class QuoteDocumentStore {
  private documents: QuoteDocument[] = [];
  /** Under test the PDF bytes stay in memory so no fixture touches the disk. */
  private memoryFiles = new Map<string, Buffer>();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;
    if (isTestEnv()) {
      this.isInitialized = true;
      return;
    }
    try {
      if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
      if (fs.existsSync(INDEX_FILE)) {
        this.documents = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
      }
      this.isInitialized = true;
    } catch (err) {
      console.error("[QuoteDocumentStore] Failed to load index, starting empty:", err);
      this.documents = [];
      this.isInitialized = true;
    }
  }

  private saveIndex(): void {
    if (isTestEnv()) return;
    try {
      if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
      fs.writeFileSync(INDEX_FILE, JSON.stringify(this.documents, null, 2), "utf-8");
    } catch (err) {
      console.error("[QuoteDocumentStore] Failed to write index:", err);
    }
  }

  private filePathFor(id: string): string {
    return path.join(DOCUMENTS_DIR, `${id}.pdf`);
  }

  public save(
    buffer: Buffer,
    meta: { fileName: string; quoteNumber?: string; opportunityId?: string; accountId?: string }
  ): QuoteDocument {
    const id = randomUUID();
    const doc: QuoteDocument = {
      id,
      // Strip any path the browser sent; only the bare name is ever displayed.
      fileName: path.basename(meta.fileName || "quote.pdf"),
      sizeBytes: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      uploadedAt: new Date().toISOString(),
      quoteNumber: meta.quoteNumber,
      opportunityId: meta.opportunityId,
      accountId: meta.accountId
    };

    if (isTestEnv()) {
      this.memoryFiles.set(id, buffer);
    } else {
      if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
      fs.writeFileSync(this.filePathFor(id), buffer);
    }

    this.documents.push(doc);
    this.saveIndex();
    return doc;
  }

  public get(id: string): QuoteDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  /** Every document held against a deal, newest first, so revisions read as history. */
  public listForOpportunity(opportunityId: string): QuoteDocument[] {
    return this.documents
      .filter((d) => d.opportunityId === opportunityId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  public readFile(id: string): Buffer | undefined {
    if (isTestEnv()) return this.memoryFiles.get(id);
    const filePath = this.filePathFor(id);
    if (!fs.existsSync(filePath)) return undefined;
    return fs.readFileSync(filePath);
  }

  /** Links a document to the deal it ended up on, once that deal has an id. */
  public attachToOpportunity(id: string, opportunityId: string, accountId?: string): QuoteDocument | undefined {
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) return undefined;
    doc.opportunityId = opportunityId;
    if (accountId) doc.accountId = accountId;
    this.saveIndex();
    return doc;
  }
}

export const quoteDocumentStore = new QuoteDocumentStore();
