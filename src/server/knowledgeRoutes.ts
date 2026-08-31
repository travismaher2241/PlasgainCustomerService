import express from "express";
import { knowledgeStore, KnowledgeError } from "./knowledgeStore";
import type { WorkspaceSession } from "../../server";
import type { KnowledgeDocument } from "../types/knowledge";
import { inferDocumentMetadata, DOCUMENT_TYPES } from "../utils/documentClassifier";

const APPROVERS = new Set(["engineering lead", "lead engineer", "structural engineer", "compliance manager", "engineering director", "technical director", "sales director"]);
export function knowledgeRouter(sessionFor: (req: express.Request) => WorkspaceSession | null) {
  const router = express.Router();
  let activeUploads = 0;
  router.use((req, res, next) => {
    const session = sessionFor(req);
    if (!session) return res.status(401).json({ error: "Sign in again to access document knowledge." });
    res.locals.session = session;
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  const approveRole: express.RequestHandler = (_req, res, next) => {
    const session: WorkspaceSession = res.locals.session;
    if (!session.isAdmin && !APPROVERS.has(session.role.toLowerCase())) return res.status(403).json({ error: "An engineering approver or workspace administrator must review and approve knowledge." });
    next();
  };
  const handle = (fn: (req: express.Request, res: express.Response) => Promise<unknown>): express.RequestHandler => (req,res,next) => { void fn(req,res).catch(next); };
  const actor = (res: express.Response) => `${res.locals.session.name} (${res.locals.session.role})`;
  const revision = (body: any) => {
    if (!Number.isInteger(body?.revision) || body.revision < 1) throw new KnowledgeError(400, "A valid document revision is required. Reload and retry.");
    return body.revision;
  };
  router.get("/", handle(async (_req,res) => res.json(await knowledgeStore.list())));
  router.post("/upload", (_req, res, next) => {
    if (activeUploads >= 2) return res.status(429).json({ error: "Two PDFs are already being uploaded. Please retry shortly." });
    activeUploads++;
    let released = false;
    const release = () => { if (!released) { activeUploads--; released = true; } };
    res.once("finish", release); res.once("close", release);
    next();
  }, express.raw({ type: "application/pdf", limit: "25mb" }), handle(async (req,res) => {
    if (!Buffer.isBuffer(req.body)) throw new KnowledgeError(415, "Upload PDF files using application/pdf.");
    let metadata: any;
    try { metadata = JSON.parse(decodeURIComponent(String(req.headers["x-document-metadata"] || ""))); }
    catch { throw new KnowledgeError(400, "Document details are missing or invalid."); }

    // Auto-infer missing fields from file name and title
    const inferred = inferDocumentMetadata(metadata.fileName || "", metadata.title || "");
    if (!metadata.productFamily || !String(metadata.productFamily).trim()) {
      metadata.productFamily = inferred.productFamily;
    }
    if (!metadata.documentType || !String(metadata.documentType).trim()) {
      metadata.documentType = inferred.documentType;
    }
    if (!metadata.title || !String(metadata.title).trim()) {
      metadata.title = inferred.title;
    }
    if (!metadata.version || !String(metadata.version).trim()) {
      metadata.version = inferred.version;
    }
    if (!metadata.source || !String(metadata.source).trim()) {
      metadata.source = inferred.source;
    }

    const fields = ["title", "productFamily", "version", "versionOwner", "effectiveDate", "reviewExpiryDate", "source", "fileName"] as const;
    const safe: Record<string,string> = {};
    for (const field of fields) {
      if (typeof metadata[field] !== "string" || !metadata[field].trim() || metadata[field].length > 250) throw new KnowledgeError(400, `${field} is required and must be under 250 characters.`);
      safe[field] = metadata[field].trim();
    }
    for (const field of ["effectiveDate", "reviewExpiryDate"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(safe[field]) || !Number.isFinite(Date.parse(safe[field])) || new Date(safe[field]).toISOString().slice(0,10) !== safe[field]) throw new KnowledgeError(400, "Valid effective and review dates are required.");
    }
    if (safe.reviewExpiryDate < safe.effectiveDate) throw new KnowledgeError(400, "Review expiry must be on or after the effective date.");
    if (!DOCUMENT_TYPES.includes(metadata.documentType)) throw new KnowledgeError(400, "Select a valid document type.");
    if (!/\.pdf$/i.test(safe.fileName)) throw new KnowledgeError(400, "Only PDF files can be imported.");
    const result = await knowledgeStore.ingest(req.body, { ...safe, documentType: metadata.documentType } as KnowledgeDocument, actor(res));
    return res.status(result.duplicate ? 200 : 201).json(result);
  }));
  router.get("/:id", handle(async (req,res) => {
    const record = await knowledgeStore.get(req.params.id);
    if (!record) throw new KnowledgeError(404, "Document not found.");
    return res.json(record);
  }));
  router.get("/:id/file", handle(async (req,res) => {
    const record = await knowledgeStore.get(req.params.id);
    if (!record) throw new KnowledgeError(404, "Document not found.");
    const bytes = await knowledgeStore.original(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(record.document.fileName || "document.pdf")}`);
    return res.send(bytes);
  }));
  router.post("/:id/pages/:page/review", approveRole, handle(async (req,res) => {
    const rev = revision(req.body);
    if (req.body?.confirmed !== true || typeof req.body.text !== "string" || typeof req.body.excluded !== "boolean" || typeof req.body.reason !== "string") throw new KnowledgeError(400, "Confirm you compared this page with the original PDF.");
    return res.json(await knowledgeStore.review(req.params.id, Number(req.params.page), { ...req.body, revision: rev }, actor(res)));
  }));
  router.post("/:id/approve", approveRole, handle(async (req,res) => {
    if (req.body?.confirmed !== true) throw new KnowledgeError(400, "Confirm this revision is suitable for use as approved knowledge.");
    return res.json(await knowledgeStore.approve(req.params.id, revision(req.body), actor(res)));
  }));
  router.post("/:id/retire", approveRole, handle(async (req,res) => res.json(await knowledgeStore.retire(req.params.id, revision(req.body), actor(res)))));
  router.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error.type === "entity.too.large" ? 413 : error instanceof KnowledgeError ? error.status : 503;
    // Never report a saved upload when the storage provider failed.
    res.status(status).json({ error: status === 413 ? "PDF exceeds 25 MB." : error instanceof KnowledgeError ? error.message : "Document storage is unavailable. No successful save was confirmed. Check server storage configuration and retry." });
  });
  return router;
}
