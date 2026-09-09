import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { createDocBackend, DocBackend } from "./docStore";
import { getAdminBucket, isCloudPersistenceEnabled } from "./firestoreAdmin";

/**
 * Quote document storage
 *
 * Keeps the actual quote PDF so it can be opened from the deal it belongs to.
 * The file is the record a customer received; a parsed summary is not a
 * substitute for it when a price is disputed months later.
 *
 * The metadata index lives in Firestore. The PDFs themselves live in a Cloud
 * Storage bucket, because Firestore holds documents rather than files and caps
 * a document at 1 MB — smaller than most quotes.
 *
 * Both fall back to local disk when no credentials are configured, which keeps
 * development working. That fallback is not durable on a serverless host: files
 * written to /tmp are wiped between deployments and are not shared between the
 * instances serving concurrent users. `isDurable()` reports which mode is
 * active so the upload endpoint can warn rather than quietly lose a PDF.
 *
 * Files are never statically served — server.ts 404s /server_data wholesale,
 * and the bucket is private — so the only way to read one is through the
 * endpoint, which can enforce whatever access rules the workspace grows later.
 */

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NETLIFY
);
const DATA_DIR = isServerless ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const DOCUMENTS_DIR = path.join(DATA_DIR, "quote_documents");

/** Where PDFs sit inside the bucket. */
const BUCKET_PREFIX = "quote_documents";

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
  private backend: DocBackend<QuoteDocument> | null = null;
  /** Under test, and when no bucket is configured, PDF bytes stay in memory. */
  private memoryFiles = new Map<string, Buffer>();

  private index(): DocBackend<QuoteDocument> {
    if (!this.backend) {
      this.backend = createDocBackend<QuoteDocument>("quote_documents", "quote_documents_index.json");
    }
    return this.backend;
  }

  /** True when an uploaded PDF will still be here after the next deployment. */
  public isDurable(): boolean {
    return isCloudPersistenceEnabled() && getAdminBucket() !== null;
  }

  private filePathFor(id: string): string {
    return path.join(DOCUMENTS_DIR, `${id}.pdf`);
  }

  private bucketPathFor(id: string): string {
    return `${BUCKET_PREFIX}/${id}.pdf`;
  }

  private async writeBytes(id: string, buffer: Buffer): Promise<void> {
    if (isTestEnv()) {
      this.memoryFiles.set(id, buffer);
      return;
    }

    const bucket = getAdminBucket();
    if (bucket) {
      await bucket.file(this.bucketPathFor(id)).save(buffer, {
        contentType: "application/pdf",
        resumable: false
      });
      return;
    }

    try {
      if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
      fs.writeFileSync(this.filePathFor(id), buffer);
    } catch (err) {
      console.warn("[QuoteDocumentStore] Disk write failed, holding in memory:", err);
      this.memoryFiles.set(id, buffer);
    }
  }

  public async save(
    buffer: Buffer,
    meta: { fileName: string; quoteNumber?: string; opportunityId?: string; accountId?: string }
  ): Promise<QuoteDocument> {
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

    // The bytes go first: an index entry pointing at a file that failed to
    // write is worse than no entry, because the deal would show a quote that
    // cannot be opened.
    await this.writeBytes(id, buffer);
    await this.index().put(id, doc);
    return doc;
  }

  public async get(id: string): Promise<QuoteDocument | undefined> {
    return (await this.index().get(id)) ?? undefined;
  }

  /** Every document held against a deal, newest first, so revisions read as history. */
  public async listForOpportunity(opportunityId: string): Promise<QuoteDocument[]> {
    const all = await this.index().loadAll();
    return all
      .filter((d) => d.opportunityId === opportunityId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  public async readFile(id: string): Promise<Buffer | undefined> {
    if (this.memoryFiles.has(id)) return this.memoryFiles.get(id);

    const bucket = getAdminBucket();
    if (bucket) {
      try {
        const file = bucket.file(this.bucketPathFor(id));
        const [exists] = await file.exists();
        if (!exists) return undefined;
        const [contents] = await file.download();
        return contents;
      } catch (err) {
        console.error("[QuoteDocumentStore] Bucket read failed:", err);
        return undefined;
      }
    }

    const filePath = this.filePathFor(id);
    if (!fs.existsSync(filePath)) return undefined;
    return fs.readFileSync(filePath);
  }

  /** Links a document to the deal it ended up on, once that deal has an id. */
  public async attachToOpportunity(
    id: string,
    opportunityId: string,
    accountId?: string
  ): Promise<QuoteDocument | undefined> {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated: QuoteDocument = {
      ...existing,
      opportunityId,
      ...(accountId ? { accountId } : {})
    };
    await this.index().put(id, updated);
    return updated;
  }
}

export const quoteDocumentStore = new QuoteDocumentStore();
