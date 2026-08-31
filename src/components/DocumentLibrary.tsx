import React, { useCallback, useEffect, useState } from "react";
import { BookOpen, UploadCloud, X, Eye, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { ControlledDocument } from "../server/documentGovernanceStore";
import type { KnowledgeDocument } from "../types/knowledge";
import { apiGet, apiPost, uploadKnowledgePdf } from "../utils/apiClient";
import { PDFViewerModal } from "./PDFViewerModal";
import { KnowledgeReviewModal } from "./KnowledgeReviewModal";
import { inferDocumentMetadata, InferredDocumentMetadata, DOCUMENT_TYPES } from "../utils/documentClassifier";

const approverRoles = ["engineering lead", "lead engineer", "structural engineer", "compliance manager", "engineering director", "technical director", "sales director"];
type LibraryDocument = ControlledDocument & { knowledge?: KnowledgeDocument["knowledge"] };
const inputClass = "w-full mt-1 p-2.5 border border-line rounded-edge bg-surface text-meta";

export const DocumentLibrary: React.FC = () => {
  const { currentUser, showToast, openLoginModal, isLoginModalOpen, documents: contextDocs } = useApp();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState<LibraryDocument | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [retiring, setRetiring] = useState<LibraryDocument | null>(null);
  const [inferredInfo, setInferredInfo] = useState<InferredDocumentMetadata | null>(null);
  const [metadata, setMetadata] = useState({
    title: "", productFamily: "General / Public Lighting", documentType: "Specification", version: "",
    versionOwner: currentUser.name || "", effectiveDate: new Date().toISOString().slice(0,10),
    reviewExpiryDate: new Date(Date.now() + 365*86400000).toISOString().slice(0,10), source: "",
  });
  const canReview = currentUser.isAdmin === true || approverRoles.includes((currentUser.role || "").toLowerCase());
  const load = useCallback(async () => {
    setError("");
    const results = await Promise.allSettled([
      apiGet<KnowledgeDocument[]>("/api/knowledge/documents"),
      apiGet<ControlledDocument[]>("/api/controlled-documents")
    ]);
    const uploaded = results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [];
    const legacy = results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [];
    const fallback = (uploaded.length === 0 && legacy.length === 0 && Array.isArray(contextDocs)) ? contextDocs : [];

    // Merge and deduplicate by document id
    const seenIds = new Set<string>();
    const merged: LibraryDocument[] = [];
    for (const doc of [...uploaded, ...legacy, ...fallback]) {
      if (doc && doc.id && !seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        merged.push(doc as LibraryDocument);
      }
    }

    if (merged.length === 0 && results[0].status === "rejected" && results[1].status === "rejected") {
      const msg = results[0].reason?.message || results[1].reason?.message || "Could not load saved documents.";
      setError(msg);
    } else {
      setError("");
    }

    setDocuments(merged);
    setLoading(false);
  }, [contextDocs]);
  useEffect(() => { if (!isLoginModalOpen) void load(); }, [load, isLoginModalOpen, currentUser.id]);
  const selectFile = (next: File | null) => {
    setUploadError("");
    if (next && (!/\.pdf$/i.test(next.name) || next.size === 0 || next.size > 25*1024*1024)) {
      setFile(null); setInferredInfo(null); setUploadError("Choose a non-empty PDF smaller than 25 MB."); return;
    }
    setFile(next);
    if (next) {
      const inferred = inferDocumentMetadata(next.name);
      setInferredInfo(inferred);
      setMetadata(current => ({
        ...current,
        title: current.title || inferred.title,
        productFamily: inferred.productFamily,
        documentType: inferred.documentType,
        version: current.version || inferred.version,
        source: current.source || inferred.source
      }));
    } else {
      setInferredInfo(null);
    }
  };
  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true); setUploadError("");
    try {
      const result = await uploadKnowledgePdf(file, metadata);
      showToast(result.duplicate ? "This exact PDF is already saved. Opening its existing record." : `Saved ${result.document.pageCount} pages. Review is required before AI use.`, "success");
      setUploadOpen(false); setFile(null); setInferredInfo(null); setMetadata(current => ({ ...current, title: "", version: "", source: "" }));
      setReviewId(result.document.id); await load();
    } catch (error: any) { setUploadError(error.message || "Upload failed. Please retry."); }
    finally { setBusy(false); }
  };
  const today = new Date().toISOString().slice(0,10);
  const status = (doc: LibraryDocument) => {
    if (!doc.knowledge) {
      if (doc.approvalStatus === "Approved") return "Authoritative (Controlled)";
      if (doc.approvalStatus === "Superseded") return "Superseded";
      return "Draft";
    }
    if (doc.approvalStatus === "Superseded") return "Withdrawn from knowledge";
    if (doc.approvalStatus === "Approved") {
      if (doc.reviewExpiryDate && doc.reviewExpiryDate < today) return "Expired — not used by AI";
      if (doc.effectiveDate && doc.effectiveDate > today) return "Approved — not yet effective";
      return "Ready for AI knowledge";
    }
    return "Pending page review";
  };
  const filtered = documents.filter(doc => {
    const term = `${doc.title || ""} ${doc.productFamily || ""} ${doc.version || ""}`.toLowerCase();
    if (!term.includes(query.toLowerCase())) return false;
    if (filter === "ready") return doc.approvalStatus === "Approved" && (!doc.reviewExpiryDate || doc.reviewExpiryDate >= today);
    if (filter === "pending") return doc.approvalStatus === "Pending Review" || doc.approvalStatus === "Draft";
    if (filter === "references") return !doc.knowledge;
    return true;
  });
  const retire = async () => {
    if (!retiring?.knowledge) return;
    setBusy(true); setError("");
    try { await apiPost(`/api/knowledge/documents/${retiring.id}/retire`, { revision: retiring.knowledge.revision }); setRetiring(null); await load(); }
    catch (error: any) { setError(error.message); setRetiring(null); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <header className="flex flex-wrap justify-between items-center gap-3 border-b border-line pb-4">
      <div><h1 className="text-xl font-bold">Document &amp; Knowledge Library</h1><p className="text-meta text-ink-dim mt-1">Original PDFs, verified page text, and traceable sources for the sales copilot.</p></div>
      <button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 bg-brand-deep text-white rounded-edge px-4 py-2.5 text-meta"><UploadCloud className="w-4 h-4" />Upload Document</button>
    </header>
    <div className="bg-brand-wash border border-brand-edge rounded-panel p-4 text-meta flex gap-3"><ShieldCheck className="w-5 h-5 shrink-0 text-brand-deep" /><p><strong>Upload → review each page → approve for AI use.</strong> Scans and diagrams require verified transcription. Blank cells and uncertain specifications must remain uncertain. Approval records review; it does not certify compliance.</p></div>
    {error && <div role="alert" className="p-4 bg-red-50 text-red-800 border border-red-200 rounded">{error} <button onClick={() => void load()} className="underline ml-2">Retry</button>{error.includes("Sign in") && <button onClick={openLoginModal} className="underline ml-3">Verify profile session</button>}</div>}
    <div className="flex flex-wrap gap-3">
      <input aria-label="Search documents" placeholder="Search title, family or version…" value={query} onChange={event => setQuery(event.target.value)} className="border border-line rounded-edge p-2.5 text-meta flex-1 min-w-[200px]" />
      <select aria-label="Filter documents" value={filter} onChange={event => setFilter(event.target.value)} className="border border-line rounded-edge p-2.5 text-meta"><option value="all">All documents ({documents.length})</option><option value="ready">Ready for AI</option><option value="pending">Pending review</option><option value="references">Older reference records</option></select>
    </div>
    {loading ? <p role="status">Loading saved documents…</p> : filtered.length === 0 ? <div className="p-10 border border-line rounded-panel text-center"><BookOpen className="mx-auto mb-3 text-ink-faint" /><p>No documents match. Upload a PDF to begin.</p></div> : <div className="border border-line rounded-panel overflow-hidden bg-surface divide-y divide-line">{filtered.map(doc => <article key={doc.id} className="p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold break-words">{doc.title}</h2><p className="text-meta text-ink-dim">{doc.productFamily} · {doc.version} · {doc.documentType}</p></div><span className={`text-spec px-2 py-1 h-fit rounded border ${status(doc) === "Ready for AI knowledge" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200"}`}>{status(doc)}</span></div>
      <p className="text-spec text-ink-dim">Source: {doc.source} · Effective: {doc.effectiveDate} · Review by: {doc.reviewExpiryDate}</p>
      {doc.knowledge && <p className="text-spec text-ink-dim">{doc.pageCount} pages · {doc.knowledge.reviewedPages} reviewed · {doc.knowledge.storage === "cloud" ? "Stored in cloud" : "Stored on app server disk — back up this directory"}{doc.knowledge.warningPages.length > 0 ? ` · Sparse/unreadable text on pages ${doc.knowledge.warningPages.join(", ")}` : ""}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {doc.knowledge ? <><button onClick={() => setReviewId(doc.id)} className="text-meta border border-brand-edge text-brand-deep rounded-edge px-3 py-2">{doc.approvalStatus === "Pending Review" && canReview ? "Review pages" : "View extracted knowledge"}</button><button onClick={() => setPreview(doc)} className="text-meta border border-line rounded-edge px-3 py-2 inline-flex gap-2 items-center"><Eye className="w-4 h-4" />View original PDF</button>{canReview && doc.approvalStatus !== "Superseded" && <button onClick={() => setRetiring(doc)} className="text-meta text-red-700 px-3 py-2">Withdraw from AI</button>}</> : <p className="text-spec text-ink-faint">Upload the actual PDF to make this record usable as document knowledge.</p>}
        {doc.checksum && doc.knowledge && <span className="text-[10px] font-mono text-ink-faint" title={doc.checksum}>SHA-256: {doc.checksum.slice(0,16)}…</span>}
      </div>
    </article>)}</div>}
    {uploadOpen && <div className="fixed inset-0 z-50 bg-chrome/70 p-4 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-labelledby="upload-heading" className="bg-surface rounded-panel max-w-2xl w-full max-h-[92vh] overflow-y-auto">
      <header className="p-4 border-b border-line flex items-center justify-between"><h2 id="upload-heading" className="font-bold">Upload PDF knowledge</h2><button disabled={busy} onClick={() => setUploadOpen(false)} aria-label="Close upload"><X /></button></header>
      <form onSubmit={upload} className="p-5 space-y-4">
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) selectFile(event.dataTransfer.files[0] || null); }} className="border-2 border-dashed border-brand-edge rounded-panel bg-brand-wash p-4">
            <label htmlFor="knowledge-pdf" className="block font-semibold text-meta mb-2">Choose or drop a PDF</label><input id="knowledge-pdf" type="file" accept=".pdf,application/pdf" onChange={event => selectFile(event.target.files?.[0] || null)} className="w-full text-meta" />
            <p className="text-spec text-ink-dim mt-2">PDF only · up to 25 MB / 200 pages. Scanned text is not automatically transcribed.</p>{file && <p className="text-meta mt-2 break-all">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
          </div>
          <label className="block text-meta font-semibold">
            Document title
            <input required maxLength={250} value={metadata.title} onChange={event => setMetadata({ ...metadata, title: event.target.value })} className={inputClass} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-meta font-semibold flex items-center justify-between">
                <span>Product family / subject</span>
                {inferredInfo && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    ✨ Auto-detected
                  </span>
                )}
              </label>
              <input required maxLength={250} value={metadata.productFamily} onChange={event => setMetadata({ ...metadata, productFamily: event.target.value })} className={inputClass} placeholder="Auto-detected from file" />
              {inferredInfo && (
                <p className="text-[11px] text-ink-dim mt-1">
                  {inferredInfo.explanation}
                </p>
              )}
            </div>
            <div>
              <label className="text-meta font-semibold flex items-center justify-between">
                <span>Document type</span>
                {inferredInfo && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    ✨ Auto-detected
                  </span>
                )}
              </label>
              <select value={metadata.documentType} onChange={event => setMetadata({ ...metadata, documentType: event.target.value })} className={inputClass}>
                {DOCUMENT_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </div>
            <label className="text-meta font-semibold">Source revision / version<input required maxLength={250} placeholder="As printed, or 'Not stated'" value={metadata.version} onChange={event => setMetadata({ ...metadata, version: event.target.value })} className={inputClass} /></label>
            <label className="text-meta font-semibold">Version owner<input required maxLength={250} value={metadata.versionOwner} onChange={event => setMetadata({ ...metadata, versionOwner: event.target.value })} className={inputClass} /></label>
            <label className="text-meta font-semibold">Use from (internal)<input type="date" required value={metadata.effectiveDate} onChange={event => setMetadata({ ...metadata, effectiveDate: event.target.value })} className={inputClass} /></label>
            <label className="text-meta font-semibold">Review by (internal)<input type="date" required min={metadata.effectiveDate} value={metadata.reviewExpiryDate} onChange={event => setMetadata({ ...metadata, reviewExpiryDate: event.target.value })} className={inputClass} /></label>
          </div>
          <label className="block text-meta font-semibold">Author / source organisation<input required maxLength={250} placeholder="Use the source named in the PDF" value={metadata.source} onChange={event => setMetadata({ ...metadata, source: event.target.value })} className={inputClass} /></label>
        </fieldset>
        <p className="text-spec text-ink-dim">The original PDF and page text are saved privately on the app server or configured cloud storage. Only reviewed, approved pages enter AI requests. Upload only documents you are authorised to use.</p>
        {uploadError && <p role="alert" className="text-red-800 bg-red-50 p-3 rounded">{uploadError}</p>}
        {busy && <p role="status" className="text-brand-deep text-meta">Uploading and extracting pages. Keep this window open…</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setUploadOpen(false)} className="border border-line px-4 py-2 rounded-edge">Cancel</button><button type="submit" disabled={busy || !file} className="bg-brand-deep text-white px-4 py-2 rounded-edge disabled:opacity-40">{busy ? "Processing PDF…" : "Upload & extract PDF"}</button></div>
      </form>
    </section></div>}
    {preview && <PDFViewerModal isOpen document={preview} onClose={() => setPreview(null)} />}
    {reviewId && <KnowledgeReviewModal id={reviewId} canReview={canReview} onClose={() => setReviewId(null)} onChanged={() => void load()} />}
    {retiring && <div className="fixed inset-0 z-50 bg-chrome/70 p-4 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-label="Withdraw document" className="p-6 bg-surface rounded-panel max-w-lg space-y-4"><h2 className="font-bold">Withdraw this document from AI knowledge?</h2><p className="text-meta">{retiring.title} will remain available for reference, but will be excluded from new AI requests. Upload and approve a revised PDF separately.</p><div className="flex gap-3 justify-end"><button disabled={busy} onClick={() => setRetiring(null)}>Cancel</button><button disabled={busy} onClick={retire} className="bg-red-700 text-white px-4 py-2 rounded">Withdraw</button></div></section></div>}
  </div>;
};
