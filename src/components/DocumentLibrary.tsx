import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  FileText,
  UploadCloud,
  X,
  Eye,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck,
  AlertTriangle,
  Lock,
  Trash2,
  Archive,
  RefreshCw
} from "lucide-react";
import { useApp } from "../context/AppContext";
import type { ControlledDocument, KnowledgeDocument } from "../types/knowledge";
import { apiGet, apiPost, uploadKnowledgePdf } from "../utils/apiClient";
import { PDFViewerModal } from "./PDFViewerModal";
import { KnowledgeReviewModal } from "./KnowledgeReviewModal";
import { inferDocumentMetadata, InferredDocumentMetadata, DOCUMENT_TYPES } from "../utils/documentClassifier";

type LibraryDocument = ControlledDocument & {
  knowledge?: KnowledgeDocument["knowledge"];
  checksum?: string;
  source?: string;
  effectiveDate?: string;
  reviewExpiryDate?: string;
  versionOwner?: string;
  uploadDate?: string;
};

const inputClass =
  "w-full mt-1 p-2.5 border border-line rounded-edge bg-surface text-meta focus:border-brand-deep focus:ring-1 focus:ring-brand-deep";

export const DocumentLibrary: React.FC = () => {
  const { currentUser, showToast, openLoginModal, isLoginModalOpen, documents: contextDocs } = useApp();

  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"current" | "ready" | "pending" | "superseded" | "all">("current");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [showAdvancedUpload, setShowAdvancedUpload] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [retiringDoc, setRetiringDoc] = useState<LibraryDocument | null>(null);
  const [inferredInfo, setInferredInfo] = useState<InferredDocumentMetadata | null>(null);
  const [expandedDetailsDocId, setExpandedDetailsDocId] = useState<string | null>(null);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const [metadata, setMetadata] = useState({
    title: "",
    source: "Plasgain Engineering",
    version: "",
    productFamily: "General / Public Lighting",
    documentType: "Specification",
    versionOwner: currentUser.name || "Engineering Lead",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reviewExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  });

  // Correcting extracted text or reading a document isn't gated by role — this is a
  // small sales team with no dedicated engineering/compliance titles to check against.
  // Withdrawing a document from AI use is the one consequential action, so that
  // stays admin-gated.
  const canWithdraw = currentUser.isAdmin === true;

  const today = new Date().toISOString().slice(0, 10);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuDocId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      const uploaded = await apiGet<KnowledgeDocument[]>("/api/knowledge/documents");
      setDocuments(Array.isArray(uploaded) ? (uploaded as LibraryDocument[]) : []);
      setError("");
    } catch (err: any) {
      const fallback = Array.isArray(contextDocs) ? (contextDocs as unknown as LibraryDocument[]) : [];
      setDocuments(fallback);
      if (fallback.length === 0) setError(err?.message || "Could not load saved documents.");
    }
    setLoading(false);
  }, [contextDocs]);

  useEffect(() => {
    if (!isLoginModalOpen) void load();
  }, [load, isLoginModalOpen, currentUser.id]);

  const selectFile = (next: File | null) => {
    setUploadError("");
    if (next && (!/\.pdf$/i.test(next.name) || next.size === 0 || next.size > 25 * 1024 * 1024)) {
      setFile(null);
      setInferredInfo(null);
      setUploadError("Choose a non-empty PDF file smaller than 25 MB.");
      return;
    }
    setFile(next);
    if (next) {
      const inferred = inferDocumentMetadata(next.name);
      setInferredInfo(inferred);
      setMetadata((curr) => ({
        ...curr,
        title: curr.title || inferred.title,
        source: curr.source || inferred.source || "Plasgain",
        version: curr.version || inferred.version || "Rev 1.0",
        productFamily: inferred.productFamily || "General / Public Lighting",
        documentType: inferred.documentType || "Specification"
      }));
    } else {
      setInferredInfo(null);
    }
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setUploadError("");
    try {
      const result = await uploadKnowledgePdf(file, metadata);
      showToast(
        result.duplicate
          ? "This exact PDF is already saved in the Knowledge Base."
          : `Ingested ${result.document.pageCount} pages directly into Knowledge Base!`,
        "success"
      );
      setUploadOpen(false);
      setFile(null);
      setInferredInfo(null);
      setMetadata({
        title: "",
        source: "Plasgain Engineering",
        version: "",
        productFamily: "General / Public Lighting",
        documentType: "Specification",
        versionOwner: currentUser.name || "Engineering Lead",
        effectiveDate: new Date().toISOString().slice(0, 10),
        reviewExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
      });
      await load();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const retire = async () => {
    if (!retiringDoc?.knowledge) return;
    setBusy(true);
    setError("");
    try {
      await apiPost(`/api/knowledge/documents/${retiringDoc.id}/retire`, {
        revision: retiringDoc.knowledge.revision
      });
      showToast(`Document "${retiringDoc.title}" withdrawn from AI knowledge.`, "success");
      setRetiringDoc(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to withdraw document");
      setRetiringDoc(null);
    } finally {
      setBusy(false);
    }
  };

  // Helper: Review Status
  const getReviewStatus = (doc: LibraryDocument): { label: string; color: string } => {
    if (doc.approvalStatus === "Approved") {
      return { label: "Approved", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    }
    if (doc.approvalStatus === "Superseded") {
      return { label: "Superseded", color: "bg-slate-100 text-slate-700 border-slate-300" };
    }
    if (doc.approvalStatus === "Pending Review") {
      return { label: "Pending review", color: "bg-amber-50 text-amber-900 border-amber-200" };
    }
    return { label: "Unreviewed", color: "bg-gray-100 text-gray-700 border-gray-200" };
  };

  // Helper: AI Availability Status
  const getAIAvailability = (doc: LibraryDocument): { label: string; isAvailable: boolean; reason?: string } => {
    if (!doc.knowledge) {
      return { label: "Not available to AI", isAvailable: false, reason: "PDF binary not uploaded" };
    }
    if (doc.approvalStatus === "Superseded") {
      return { label: "Not available to AI", isAvailable: false, reason: "Document is superseded" };
    }
    if (doc.approvalStatus === "Approved") {
      if (doc.reviewExpiryDate && doc.reviewExpiryDate < today) {
        return { label: "Not available to AI", isAvailable: false, reason: "Review expired" };
      }
      if (doc.effectiveDate && doc.effectiveDate > today) {
        return { label: "Not available to AI", isAvailable: false, reason: "Effective date in future" };
      }
      return { label: "Available to AI", isAvailable: true };
    }
    return { label: "Not available to AI", isAvailable: false, reason: "Requires page review & approval" };
  };

  // Filtered Documents
  const filtered = documents.filter((doc) => {
    const term = `${doc.title || ""} ${doc.productFamily || ""} ${doc.version || ""} ${doc.source || ""}`.toLowerCase();
    if (!term.includes(query.toLowerCase())) return false;

    if (filter === "current") {
      // Default: exclude superseded documents
      return doc.approvalStatus !== "Superseded";
    }
    if (filter === "ready") {
      return doc.approvalStatus === "Approved" && (!doc.reviewExpiryDate || doc.reviewExpiryDate >= today);
    }
    if (filter === "pending") {
      return doc.approvalStatus === "Pending Review" || doc.approvalStatus === "Draft";
    }
    if (filter === "superseded") {
      return doc.approvalStatus === "Superseded";
    }
    return true; // "all"
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* PART A & B: SINGLE CONSISTENT DESTINATION TITLE & COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-body">
            Documents
          </h1>
          <p className="text-spec text-ink-dim mt-0.5">
            Verified technical specifications, compliance standards, product catalogues, and controlled engineering references.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="text-spec text-ink-dim hover:text-body bg-white hover:bg-raised px-3 py-2 rounded-edge border border-line font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh document library"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="text-spec font-bold px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>+ Upload document</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div role="alert" className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-panel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-spec">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="text-spec font-bold underline text-red-900 cursor-pointer">
              Retry
            </button>
            {error.includes("Sign in") && (
              <button onClick={openLoginModal} className="text-spec font-bold underline text-red-900 ml-2 cursor-pointer">
                Sign In
              </button>
            )}
          </div>
        </div>
      )}

      {/* SEARCH AND REVISION FILTER BAR (PART D) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Search documents"
            placeholder="Search by title, revision, product family, or source organisation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-line rounded-edge text-spec placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ink-dim hidden sm:block" />
          <select
            aria-label="Filter documents"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-white border border-line rounded-edge px-3 py-2 text-spec font-medium text-body cursor-pointer focus:border-brand-deep"
          >
            <option value="current">Current documents ({documents.filter((d) => d.approvalStatus !== "Superseded").length})</option>
            <option value="pending">Needs review ({documents.filter((d) => d.approvalStatus === "Pending Review" || d.approvalStatus === "Draft").length})</option>
            <option value="ready">Available to AI ({documents.filter((d) => d.approvalStatus === "Approved" && (!d.reviewExpiryDate || d.reviewExpiryDate >= today)).length})</option>
            <option value="superseded">Superseded / Withdrawn ({documents.filter((d) => d.approvalStatus === "Superseded").length})</option>
            <option value="all">All documents ({documents.length})</option>
          </select>
        </div>
      </div>

      {/* DOCUMENT LIST (PARTS C, E, G, H, I) */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-panel border border-line">
          <div className="w-8 h-8 border-3 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p role="status" className="text-spec text-ink-dim">Loading documents...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-panel border border-line">
          <FileText className="w-10 h-10 text-ink-faint mx-auto" />
          <h3 className="font-bold text-body text-base">No documents found</h3>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            {query || filter !== "current"
              ? "No documents match the current filter or search criteria."
              : "Upload a technical specification, catalogue, or lighting standard to establish verified sales knowledge."}
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors cursor-pointer shadow-xs mt-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-panel border border-line divide-y divide-line overflow-hidden shadow-2xs">
          {filtered.map((doc) => {
            const reviewStatus = getReviewStatus(doc);
            const aiStatus = getAIAvailability(doc);
            const isExpanded = expandedDetailsDocId === doc.id;
            const isMenuOpen = activeMenuDocId === doc.id;
            const hasPdf = Boolean(doc.knowledge || doc.fileUrl);

            return (
              <article
                key={doc.id}
                className={`p-4 transition-colors hover:bg-raised/40 ${
                  doc.approvalStatus === "Superseded" ? "bg-slate-50/70" : ""
                }`}
              >
                {/* COMPACT MAIN ROW */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* LEFT: TITLE & PRIMARY METADATA */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2
                        className={`font-bold text-body text-base break-words ${
                          doc.approvalStatus === "Superseded" ? "text-ink-dim line-through" : ""
                        }`}
                      >
                        {doc.title}
                      </h2>

                      {/* REVISION BADGE (PART D) */}
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                        {doc.version || "Rev 1.0"}
                      </span>

                      {/* DOCUMENT TYPE */}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-line text-ink-dim">
                        {doc.documentType || "Specification"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-spec text-ink-dim flex-wrap">
                      <span>Source: <strong className="text-body">{doc.source || "Plasgain"}</strong></span>
                      <span>•</span>
                      <span>Family: {doc.productFamily || "General"}</span>

                      {/* REVIEW PROGRESS */}
                      {doc.knowledge ? (
                        <>
                          <span>•</span>
                          <span className="font-medium text-body">
                            {doc.knowledge.reviewedPages || 0} / {doc.pageCount || 0} pages reviewed
                          </span>
                        </>
                      ) : (
                        <>
                          <span>•</span>
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            PDF not uploaded
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: DUAL STATUS BADGES & ACTIONS */}
                  <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap shrink-0">
                    {/* DUAL STATUS DISPLAY: REVIEW STATUS vs AI AVAILABILITY (PART G) */}
                    <div className="flex items-center gap-1.5">
                      {/* REVIEW STATUS BADGE */}
                      <span
                        className={`text-spec font-bold px-2.5 py-1 rounded-full border ${reviewStatus.color}`}
                        title={`Review Status: ${reviewStatus.label}`}
                      >
                        {reviewStatus.label}
                      </span>

                      {/* AI AVAILABILITY BADGE */}
                      <span
                        className={`text-spec font-medium px-2.5 py-1 rounded-full border ${
                          aiStatus.isAvailable
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                        title={aiStatus.reason || "AI Availability"}
                      >
                        {aiStatus.label}
                      </span>
                    </div>

                    {/* ACTION BUTTONS (PART I) */}
                    <div className="flex items-center gap-2">
                      {/* PRIMARY ACTION */}
                      {doc.knowledge ? (
                        <button
                          type="button"
                          onClick={() => setReviewId(doc.id)}
                          className={`text-spec font-bold px-3 py-1.5 rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer ${
                            doc.approvalStatus === "Pending Review"
                              ? "bg-brand-deep hover:bg-brand text-white shadow-xs"
                              : "bg-white hover:bg-raised text-brand-deep border border-brand-edge"
                          }`}
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>
                            {doc.approvalStatus === "Pending Review"
                              ? "Review pages"
                              : "View knowledge"}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMetadata((curr) => ({
                              ...curr,
                              title: doc.title,
                              version: doc.version || "Rev 1.0",
                              productFamily: doc.productFamily || "General / Public Lighting",
                              documentType: doc.documentType || "Specification",
                              source: doc.source || "Plasgain"
                            }));
                            setUploadOpen(true);
                          }}
                          className="text-spec font-bold px-3 py-1.5 rounded-edge bg-brand-deep hover:bg-brand text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload PDF</span>
                        </button>
                      )}

                      {/* VIEW ORIGINAL PDF */}
                      {hasPdf && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="text-spec font-medium px-2.5 py-1.5 rounded-edge bg-white hover:bg-raised text-body border border-line transition-colors flex items-center gap-1 cursor-pointer"
                          title="Open PDF viewer"
                        >
                          <Eye className="w-3.5 h-3.5 text-ink-dim" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                      )}

                      {/* DETAILS TOGGLE (PART C) */}
                      <button
                        type="button"
                        onClick={() => setExpandedDetailsDocId(isExpanded ? null : doc.id)}
                        className="text-spec font-medium px-2 py-1.5 rounded-edge hover:bg-raised text-ink-dim hover:text-body transition-colors flex items-center gap-1 cursor-pointer"
                        title={isExpanded ? "Hide technical details" : "Show technical details"}
                      >
                        <span className="text-xs">Details</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* MANAGEMENT DROPDOWN (PART H) */}
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Document actions"
                          onClick={() => setActiveMenuDocId(isMenuOpen ? null : doc.id)}
                          className="p-1.5 rounded-edge hover:bg-raised text-ink-dim hover:text-body transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full mt-1 w-52 bg-white border border-line rounded-panel shadow-lg py-1 z-20 text-spec animate-in fade-in zoom-in-95 duration-100"
                          >
                            {hasPdf && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  setPreviewDoc(doc);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-raised flex items-center gap-2 text-body cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-ink-dim" />
                                <span>View original PDF</span>
                              </button>
                            )}

                            {doc.knowledge && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  setReviewId(doc.id);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-raised flex items-center gap-2 text-body cursor-pointer"
                              >
                                <FileCheck className="w-4 h-4 text-ink-dim" />
                                <span>Review / inspect pages</span>
                              </button>
                            )}

                            {/* WITHDRAW FROM AI (ONLY VISIBLE WHEN RELEVANT) (PART H) */}
                            {canWithdraw && doc.approvalStatus === "Approved" && aiStatus.isAvailable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  setRetiringDoc(doc);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Archive className="w-4 h-4 text-red-600" />
                                <span>Withdraw from AI</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDED SECONDARY METADATA DRAWER (PART C, F, W) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-line bg-paper/60 p-3 rounded-panel text-spec grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
                    <div>
                      <span className="text-ink-dim font-medium block text-[11px] uppercase tracking-wider">
                        Storage &amp; Integrity
                      </span>
                      <p className="text-body font-mono text-xs mt-0.5 truncate" title={doc.checksum || "No checksum"}>
                        SHA-256: {doc.checksum ? `${doc.checksum.slice(0, 16)}...` : "Not calculated"}
                      </p>
                      <p className="text-ink-dim text-xs mt-0.5">
                        Storage: {doc.knowledge?.storage === "cloud" ? "Cloud storage" : "App server storage"}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink-dim font-medium block text-[11px] uppercase tracking-wider">
                        Governance Ownership
                      </span>
                      <p className="text-body text-xs mt-0.5">
                        Owner: {doc.versionOwner || "Engineering Lead"}
                      </p>
                      <p className="text-ink-dim text-xs mt-0.5">
                        Uploaded: {doc.uploadDate || doc.effectiveDate || "Recent"}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink-dim font-medium block text-[11px] uppercase tracking-wider">
                        Validity Dates
                      </span>
                      <p className="text-body text-xs mt-0.5">
                        Effective: {doc.effectiveDate || "Immediate"}
                      </p>
                      <p className="text-ink-dim text-xs mt-0.5">
                        Review by: {doc.reviewExpiryDate || "Not set"}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink-dim font-medium block text-[11px] uppercase tracking-wider">
                        Extraction Diagnostics
                      </span>
                      <p className="text-body text-xs mt-0.5">
                        Total Pages: {doc.pageCount || (doc.knowledge ? doc.knowledge.reviewedPages : 0)}
                      </p>
                      {doc.knowledge?.warningPages && doc.knowledge.warningPages.length > 0 ? (
                        <p className="text-amber-800 text-xs font-bold mt-0.5">
                          Warnings on pages: {doc.knowledge.warningPages.join(", ")}
                        </p>
                      ) : (
                        <p className="text-emerald-700 text-xs mt-0.5">✓ No extraction warnings</p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* PART J, K, L, M: REBUILT PDF UPLOAD MODAL */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-heading"
            className="bg-surface rounded-panel max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-line shadow-2xl"
          >
            <header className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 id="upload-heading" className="font-bold text-body text-base">
                  Upload Document
                </h2>
                <p className="text-spec text-ink-dim">
                  Add a PDF specification or catalogue to the document review queue.
                </p>
              </div>
              <button
                disabled={busy}
                onClick={() => setUploadOpen(false)}
                aria-label="Close upload"
                className="p-1 rounded-edge text-ink-dim hover:text-body hover:bg-line transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <form onSubmit={upload} className="p-5 space-y-4">
              <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
                {/* 1. FILE DROPZONE (PART J) */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!busy) selectFile(e.dataTransfer.files[0] || null);
                  }}
                  className="border-2 border-dashed border-brand-edge rounded-panel bg-brand-wash/40 p-5 text-center space-y-2"
                >
                  <label htmlFor="knowledge-pdf" className="block font-bold text-body text-meta cursor-pointer">
                    Choose or drop a PDF document
                  </label>
                  <input
                    id="knowledge-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => selectFile(e.target.files?.[0] || null)}
                    className="w-full text-spec text-ink-dim file:mr-3 file:py-1.5 file:px-3 file:rounded-edge file:border-0 file:text-spec file:font-bold file:bg-brand-deep file:text-white hover:file:bg-brand cursor-pointer"
                  />
                  <p className="text-spec text-ink-dim">
                    PDF only · up to 25 MB / 200 pages. Scanned pages require manual text transcription.
                  </p>
                  {file && (
                    <div className="pt-2 flex items-center justify-center gap-2 text-spec font-bold text-brand-deep">
                      <FileText className="w-4 h-4" />
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>

                {/* 2. DOCUMENT TITLE (PART J) */}
                <div>
                  <label htmlFor="doc-title-input" className="block text-spec font-bold text-body">
                    Document Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="doc-title-input"
                    required
                    maxLength={250}
                    value={metadata.title}
                    placeholder="e.g. Plasgain Pro Blade 75 Technical Specification"
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* 3. SOURCE AND REVISION (PART J) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="doc-source-input" className="block text-spec font-bold text-body">
                      Author / Source Organisation <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="doc-source-input"
                      required
                      maxLength={250}
                      placeholder="e.g. Plasgain Engineering, Standards Australia"
                      value={metadata.source}
                      onChange={(e) => setMetadata({ ...metadata, source: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="doc-version-input" className="block text-spec font-bold text-body">
                      Source Revision / Version <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="doc-version-input"
                      required
                      maxLength={250}
                      placeholder="e.g. Rev 6, 2026.1, Rev A"
                      value={metadata.version}
                      onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* 4. COLLAPSIBLE SECONDARY / ADMINISTRATIVE FIELDS (PART K) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedUpload(!showAdvancedUpload)}
                    className="text-spec font-medium text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAdvancedUpload ? "Hide administrative details" : "+ Optional administrative details"}</span>
                    {showAdvancedUpload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showAdvancedUpload && (
                    <div className="mt-3 p-3 bg-raised rounded-panel border border-line space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-spec font-semibold text-body">
                            Product Family / Category
                          </label>
                          <input
                            maxLength={250}
                            value={metadata.productFamily}
                            onChange={(e) => setMetadata({ ...metadata, productFamily: e.target.value })}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="block text-spec font-semibold text-body">
                            Document Type
                          </label>
                          <select
                            value={metadata.documentType}
                            onChange={(e) => setMetadata({ ...metadata, documentType: e.target.value })}
                            className={inputClass}
                          >
                            {DOCUMENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-spec font-semibold text-body">
                            Version Owner
                          </label>
                          <input
                            maxLength={250}
                            value={metadata.versionOwner}
                            onChange={(e) => setMetadata({ ...metadata, versionOwner: e.target.value })}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="block text-spec font-semibold text-body">
                            Effective Date
                          </label>
                          <input
                            type="date"
                            value={metadata.effectiveDate}
                            onChange={(e) => setMetadata({ ...metadata, effectiveDate: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </fieldset>

              {/* PART L: EXPLICIT UPLOAD VS APPROVAL EXPLANATION */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-panel p-3 text-spec text-emerald-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs">
                  <strong>Instant AI Ingestion:</strong> Uploading this document automatically extracts and activates all specifications directly into the Knowledge Database for Sales Copilot and Enquiry Analysis.
                </p>
              </div>

              {uploadError && (
                <div role="alert" className="p-3 bg-red-50 text-red-800 text-spec rounded-panel border border-red-200">
                  {uploadError}
                </div>
              )}

              {busy && (
                <div role="status" className="p-3 bg-brand-wash text-brand-deep text-spec rounded-panel flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                  <span>Extracting and indexing knowledge with Gemini AI...</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-line">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setUploadOpen(false)}
                  className="px-4 py-2 rounded-edge border border-line text-spec font-medium hover:bg-raised cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !file}
                  className="px-5 py-2 rounded-edge bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-spec transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{busy ? "Ingesting Knowledge..." : "Upload & Ingest with AI"}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* STANDALONE PDF VIEWER (PART U & V) */}
      {previewDoc && (
        <PDFViewerModal
          isOpen={true}
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* PDF PAGE REVIEW MODAL (PART N TO T) */}
      {reviewId && (
        <KnowledgeReviewModal
          id={reviewId}
          onClose={() => setReviewId(null)}
          onChanged={() => void load()}
        />
      )}

      {/* WITHDRAW FROM AI CONFIRMATION MODAL (PART H) */}
      {retiringDoc && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Withdraw document"
            className="p-6 bg-surface rounded-panel max-w-lg w-full space-y-4 border border-line shadow-2xl"
          >
            <div className="flex items-center gap-3 text-amber-950">
              <Archive className="w-6 h-6 text-amber-600 shrink-0" />
              <h2 className="font-bold text-body text-base">Withdraw from AI knowledge?</h2>
            </div>
            <p className="text-spec text-ink-dim leading-relaxed">
              <strong>{retiringDoc.title}</strong> ({retiringDoc.version || "Rev 1.0"}) will remain available for reference, but will be excluded from new AI customer enquiries and copilot suggestions.
            </p>
            <div className="flex gap-3 justify-end pt-3 border-t border-line">
              <button
                disabled={busy}
                onClick={() => setRetiringDoc(null)}
                className="px-4 py-2 rounded-edge border border-line text-spec font-medium hover:bg-raised cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={retire}
                className="px-4 py-2 rounded-edge bg-red-700 hover:bg-red-800 text-white font-bold text-spec transition-colors cursor-pointer shadow-xs"
              >
                {busy ? "Withdrawing..." : "Withdraw from AI"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
