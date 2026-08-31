import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, Trash2, FileText, Sparkles, Layers, RefreshCw } from "lucide-react";
import type { KnowledgeRecord } from "../types/knowledge";
import { apiGet, apiPost } from "../utils/apiClient";
import { cleanExtractedText } from "../utils/textFormatter";

export function KnowledgeReviewModal({
  id,
  canReview: _canReview,
  onClose,
  onChanged
}: {
  id: string;
  canReview: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [record, setRecord] = useState<KnowledgeRecord | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [text, setText] = useState("");
  const [showRawCoordinates, setShowRawCoordinates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const page = record?.pages[pageIndex];
  const totalPages = record?.pages.length || 0;
  const isApproved = record?.document.approvalStatus === "Approved";

  useEffect(() => {
    let active = true;
    apiGet<KnowledgeRecord>(`/api/knowledge/documents/${id}`)
      .then((result) => {
        if (active) setRecord(result);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load document knowledge");
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (page) {
      setText(page.reviewedText || page.extractedText || "");
      setIsEditing(false);
    }
  }, [pageIndex, record?.document.id]);

  const handleApproveAll = async () => {
    if (!record) return;
    setBusy(true);
    setError("");
    try {
      await apiPost(`/api/knowledge/documents/${id}/approve`, {
        revision: record.document.knowledge.revision
      });
      setNotice("Document is active and fully approved for AI knowledge.");
      const updated = await apiGet<KnowledgeRecord>(`/api/knowledge/documents/${id}`);
      setRecord(updated);
      onChanged();
    } catch (err: any) {
      setError(err.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePageEdits = async () => {
    if (!record || !page) return;
    setBusy(true);
    setError("");
    try {
      const updated = await apiPost<KnowledgeRecord>(
        `/api/knowledge/documents/${id}/pages/${page.page}/review`,
        {
          text,
          excluded: false,
          reason: "",
          revision: record.document.knowledge.revision
        }
      );
      setRecord(updated);
      setNotice(`Saved page ${page.page} edits.`);
      setIsEditing(false);
      onChanged();
    } catch (err: any) {
      setError(err.message || "Failed to save page edits");
    } finally {
      setBusy(false);
    }
  };

  const handleRetire = async () => {
    if (!record) return;
    if (!window.confirm(`Are you sure you want to remove "${record.document.title}" from AI knowledge?`)) return;
    setBusy(true);
    setError("");
    try {
      await apiPost(`/api/knowledge/documents/${id}/retire`, {
        revision: record.document.knowledge.revision
      });
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to retire document");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-chrome/75 backdrop-blur-xs p-2 sm:p-4 flex items-center justify-center animate-in fade-in duration-150">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-doc-heading"
        className="bg-surface rounded-panel w-full min-w-0 max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-line shadow-2xl"
      >
        {/* HEADER */}
        <header className="px-5 py-3 border-b border-line flex items-center justify-between gap-3 bg-surface shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-wash flex items-center justify-center text-brand-deep shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="knowledge-doc-heading" className="font-bold text-body text-base truncate">
                  {record?.document.title || "Knowledge Document"}
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                  {record?.document.version || "Current"}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                    isApproved
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  {isApproved ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI Active & Grounded</span>
                    </>
                  ) : (
                    <span>Ready for Approval</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-ink-dim truncate">
                {record?.document.productFamily} · Source: {record?.document.source || "Plasgain"} · Ingested by {record?.document.uploader || "Team"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isApproved && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={busy}
                className="px-3.5 py-1.5 rounded-edge bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve All Pages</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRetire}
              disabled={busy}
              title="Remove from Knowledge Base"
              className="p-2 rounded-edge text-ink-dim hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="p-1.5 rounded-edge text-ink-dim hover:text-body hover:bg-line transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ALERTS */}
        {error && (
          <div role="alert" className="px-4 py-2 bg-red-50 text-red-800 text-xs border-b border-red-200 flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button
              type="button"
              className="underline font-bold text-red-900 ml-2"
              onClick={() => {
                void apiGet<KnowledgeRecord>(`/api/knowledge/documents/${id}`)
                  .then(setRecord)
                  .then(() => setError(""))
                  .catch((e) => setError(e.message));
              }}
            >
              Reload
            </button>
          </div>
        )}

        {notice && (
          <div role="status" className="px-4 py-1.5 bg-emerald-50 text-emerald-800 text-xs border-b border-emerald-200 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {!record || !page ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-ink-dim">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-deep" />
            <p className="text-sm">Loading document knowledge...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-chrome/20">
            {/* TOOLBAR */}
            <div className="px-5 py-2.5 bg-surface border-b border-line flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || pageIndex === 0}
                  onClick={() => setPageIndex(pageIndex - 1)}
                  className="px-2.5 py-1 rounded bg-raised hover:bg-line border border-line text-body text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-xs text-ink-dim font-medium">Page</span>
                  <select
                    value={pageIndex}
                    disabled={busy}
                    onChange={(e) => setPageIndex(Number(e.target.value))}
                    className="border border-line rounded bg-surface px-2.5 py-1 text-xs font-bold text-body"
                  >
                    {record.pages.map((p, idx) => (
                      <option key={p.page} value={idx}>
                        Page {p.page} of {totalPages}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={busy || pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex(pageIndex + 1)}
                  className="px-2.5 py-1 rounded bg-raised hover:bg-line border border-line text-body text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-dim flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRawCoordinates}
                    onChange={(e) => setShowRawCoordinates(e.target.checked)}
                    className="rounded text-brand-deep focus:ring-brand-deep"
                  />
                  <span>Show raw table layout markers</span>
                </label>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 rounded text-xs font-semibold text-brand-deep hover:bg-brand-wash border border-brand-edge transition-colors cursor-pointer"
                  >
                    Edit Page Text
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setText(page.reviewedText || page.extractedText || "");
                        setIsEditing(false);
                      }}
                      className="px-2.5 py-1 rounded text-xs text-ink-dim hover:bg-line"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePageEdits}
                      disabled={busy}
                      className="px-3 py-1 rounded bg-brand-deep text-white text-xs font-bold hover:bg-brand"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CONTENT VIEWER */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-surface rounded-panel border border-line p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-deep" />
                    <h3 className="text-sm font-bold text-body">
                      Extracted Knowledge Content (Page {page.page} of {totalPages})
                    </h3>
                  </div>
                  <span className="text-xs text-ink-dim">
                    {cleanExtractedText(text).length} characters
                  </span>
                </div>

                {isEditing ? (
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={16}
                    className="w-full font-mono text-xs p-3 border border-brand-edge rounded-lg bg-surface text-body focus:ring-1 focus:ring-brand-deep"
                  />
                ) : (
                  <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-body bg-raised/40 p-4 rounded-lg border border-line/60">
                    {showRawCoordinates ? text : cleanExtractedText(text)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
