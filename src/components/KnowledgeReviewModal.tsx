import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, FastForward, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Eye } from "lucide-react";
import type { KnowledgeRecord } from "../types/knowledge";
import { apiGet, apiPost } from "../utils/apiClient";
import { usePdfSource } from "./usePdfSource";
import { PdfPageCanvas } from "./PdfPageCanvas";

export function KnowledgeReviewModal({
  id,
  canReview,
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
  const [excluded, setExcluded] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [pdfRendered, setPdfRendered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileTab, setMobileTab] = useState<"pdf" | "text">("pdf");
  const [dirty, setDirty] = useState(false);

  const { source, error: pdfError } = usePdfSource(record?.document.fileUrl);
  const page = record?.pages[pageIndex];
  const editable = canReview && record?.document.approvalStatus === "Pending Review";
  const totalPages = record?.pages.length || 0;
  const reviewedPagesCount = record?.document.knowledge.reviewedPages || 0;
  const isAllPagesReviewed = totalPages > 0 && reviewedPagesCount === totalPages;

  useEffect(() => {
    let active = true;
    apiGet<KnowledgeRecord>(`/api/knowledge/documents/${id}`)
      .then((result) => {
        if (active) setRecord(result);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load document review");
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (page) {
      setText(page.reviewedText || "");
      setExcluded(page.excluded || false);
      setReason(page.exclusionReason || "");
      setConfirmed(false);
      setDirty(false);
    }
  }, [pageIndex, record?.document.id]);

  // Find next unreviewed page index
  const nextUnreviewedIndex = record?.pages.findIndex((p) => !p.reviewedAt && !p.excluded) ?? -1;

  const handleNextUnreviewed = () => {
    if (nextUnreviewedIndex >= 0 && nextUnreviewedIndex !== pageIndex) {
      setPageIndex(nextUnreviewedIndex);
      setMobileTab("pdf");
    }
  };

  const save = async () => {
    if (!record || !page) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiPost<KnowledgeRecord>(
        `/api/knowledge/documents/${id}/pages/${page.page}/review`,
        {
          text,
          excluded,
          reason,
          confirmed,
          revision: record.document.knowledge.revision
        }
      );
      setRecord(updated);
      setNotice(`Page ${page.page} verified and saved.`);
      setDirty(false);
      onChanged();

      // Automatically move to next unreviewed page if available, else next page
      const nextUnrev = updated.pages.findIndex((p, idx) => idx > pageIndex && !p.reviewedAt && !p.excluded);
      if (nextUnrev >= 0) {
        setPageIndex(nextUnrev);
      } else if (pageIndex < updated.pages.length - 1) {
        setPageIndex(pageIndex + 1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save page review");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!record) return;
    setBusy(true);
    setError("");
    try {
      await apiPost(`/api/knowledge/documents/${id}/approve`, {
        revision: record.document.knowledge.revision,
        confirmed: approvalConfirmed
      });
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-chrome/75 backdrop-blur-xs p-2 sm:p-4 flex items-center justify-center animate-in fade-in duration-150">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-heading"
        className="bg-surface rounded-panel w-full min-w-0 max-w-[1540px] h-[95vh] flex flex-col overflow-hidden border border-line shadow-2xl"
      >
        {/* COMPACT TOP HEADER */}
        <header className="px-4 py-2.5 border-b border-line flex items-center justify-between gap-3 bg-surface shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="review-heading" className="font-bold text-body text-base">
                  PDF Page Review
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                  {record?.document.version || "Rev Current"}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    record?.document.approvalStatus === "Approved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  {record?.document.approvalStatus || "Pending Review"}
                </span>
              </div>
              <p className="text-spec text-ink-dim truncate max-w-xl">
                {record?.document.title} · {record?.document.source || "Plasgain"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-spec font-bold text-body">
                {reviewedPagesCount} / {totalPages} pages reviewed
              </span>
              <div className="w-32 bg-line h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="bg-brand-deep h-full transition-all duration-300"
                  style={{ width: `${totalPages > 0 ? (reviewedPagesCount / totalPages) * 100 : 0}%` }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={busy || Boolean(dirty)}
              aria-label="Close knowledge review"
              title={dirty ? "Save or discard page edits before closing" : "Close"}
              className="p-1.5 rounded-edge text-ink-dim hover:text-body hover:bg-line transition-colors disabled:opacity-40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ALERTS / NOTICES */}
        {error && (
          <div role="alert" className="px-4 py-2 bg-red-50 text-red-800 text-spec border-b border-red-200 flex items-center justify-between shrink-0">
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
          <div role="status" className="px-4 py-1.5 bg-emerald-50 text-emerald-800 text-spec border-b border-emerald-200 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {!record || !page ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-ink-dim">
            <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
            <p className="text-meta">Loading document pages...</p>
          </div>
        ) : (
          <>
            {/* UNIFIED PAGE NAVIGATION TOOLBAR (PART P) */}
            <div className="px-4 py-2 bg-raised border-b border-line flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={busy || Boolean(dirty) || pageIndex === 0}
                  onClick={() => {
                    setPageIndex(pageIndex - 1);
                    setMobileTab("pdf");
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-surface border border-line text-body text-spec font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1.5 px-2">
                  <label htmlFor="review-page-select" className="text-spec font-medium text-ink-dim">
                    Page
                  </label>
                  <select
                    id="review-page-select"
                    aria-label="Review page"
                    value={pageIndex}
                    disabled={busy || Boolean(dirty)}
                    onChange={(e) => {
                      setPageIndex(Number(e.target.value));
                      setMobileTab("pdf");
                    }}
                    className="border border-line rounded bg-white px-2 py-0.5 text-spec font-mono font-bold text-body"
                  >
                    {record.pages.map((p, index) => (
                      <option key={p.page} value={index}>
                        Page {p.page} {p.reviewedAt ? "✓ (Verified)" : p.excluded ? "⊘ (Excluded)" : "○ (Unreviewed)"}
                      </option>
                    ))}
                  </select>
                  <span className="text-spec font-medium text-ink-dim">of {totalPages}</span>
                </div>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={busy || Boolean(dirty) || pageIndex === totalPages - 1}
                  onClick={() => {
                    setPageIndex(pageIndex + 1);
                    setMobileTab("pdf");
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-surface border border-line text-body text-spec font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* NEXT UNREVIEWED PAGE BUTTON */}
                <button
                  type="button"
                  aria-label="Next unreviewed page"
                  disabled={busy || Boolean(dirty) || nextUnreviewedIndex < 0}
                  onClick={handleNextUnreviewed}
                  className={`px-3 py-1 rounded text-spec font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    nextUnreviewedIndex >= 0
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 opacity-60 cursor-default"
                  }`}
                  title={nextUnreviewedIndex >= 0 ? `Go to next unreviewed page (${nextUnreviewedIndex + 1})` : "All pages reviewed"}
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>{nextUnreviewedIndex >= 0 ? `Next unreviewed (p.${nextUnreviewedIndex + 1})` : "All reviewed ✓"}</span>
                </button>

                {/* CURRENT PAGE STATUS BADGE */}
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border ml-2 ${
                    page.excluded
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : page.reviewedAt
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  {page.excluded ? "Excluded from AI" : page.reviewedAt ? "Verified ✓" : "Unreviewed"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {source && (
                  <a
                    href={`${source}#page=${page.page}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-spec font-medium text-brand-deep hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open original in new tab</span>
                  </a>
                )}

                {dirty && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setText(page.reviewedText);
                      setExcluded(Boolean(page.excluded));
                      setReason(page.exclusionReason || "");
                      setConfirmed(false);
                    }}
                    className="text-spec font-bold text-red-700 hover:underline cursor-pointer"
                  >
                    Discard edits
                  </button>
                )}
              </div>
            </div>

            {/* MOBILE / TABLET TAB SWITCHER */}
            <div className="lg:hidden flex border-b border-line bg-surface">
              <button
                type="button"
                onClick={() => setMobileTab("pdf")}
                className={`flex-1 py-2 text-spec font-bold border-b-2 text-center ${
                  mobileTab === "pdf" ? "border-brand-deep text-brand-deep bg-brand-wash/30" : "border-transparent text-ink-dim"
                }`}
              >
                Original PDF Page {page.page}
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("text")}
                className={`flex-1 py-2 text-spec font-bold border-b-2 text-center ${
                  mobileTab === "text" ? "border-brand-deep text-brand-deep bg-brand-wash/30" : "border-transparent text-ink-dim"
                }`}
              >
                Verified Text Editor {page.reviewedAt ? "✓" : ""}
              </button>
            </div>

            {/* SIDE-BY-SIDE REVIEW WORKSPACE (PART N & O) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line overflow-hidden">
              {/* LEFT PANE: ORIGINAL PDF CANVAS */}
              <div
                className={`min-w-0 flex flex-col bg-paper overflow-hidden ${
                  mobileTab === "pdf" ? "flex" : "hidden lg:flex"
                }`}
              >
                <div className="px-3 py-1.5 bg-surface border-b border-line flex items-center justify-between text-spec text-ink-dim">
                  <span className="font-semibold text-body">
                    Original Source Document (Page {page.page})
                  </span>
                  <span className="text-[11px] font-mono">
                    Printed page numbers may differ
                  </span>
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {pdfError ? (
                    <div className="p-6 text-center text-red-700 space-y-2">
                      <AlertTriangle className="w-8 h-8 mx-auto text-red-600" />
                      <p className="font-semibold">{pdfError}</p>
                    </div>
                  ) : source ? (
                    <PdfPageCanvas source={source} page={page.page} onRenderState={setPdfRendered} />
                  ) : (
                    <div className="p-8 text-center text-ink-dim">Loading PDF canvas...</div>
                  )}
                </div>
              </div>

              {/* RIGHT PANE: VERIFIED / REVIEWED TEXT EDITOR */}
              <div
                className={`min-w-0 p-4 flex flex-col gap-3 overflow-y-auto bg-surface ${
                  mobileTab === "text" ? "flex" : "hidden lg:flex"
                }`}
              >
                {/* PAGE SPECIFIC WARNINGS ONLY (PART Q) */}
                {page.warnings && page.warnings.length > 0 && (
                  <div className="text-spec bg-amber-50 text-amber-900 border border-amber-200 p-3 rounded-panel space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Page {page.page} Inspection Notice</span>
                    </div>
                    {page.warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs pl-5.5">
                        • {warning}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="font-bold text-body text-spec" htmlFor="reviewed-page-text">
                    Verified Page Text (Used by Sales Copilot)
                  </label>
                  {page.reviewedBy && (
                    <span className="text-[11px] text-ink-dim">
                      Last verified by {page.reviewedBy} · {page.reviewedAt}
                    </span>
                  )}
                </div>

                <textarea
                  id="reviewed-page-text"
                  aria-label="Verified page text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setConfirmed(false);
                    setDirty(true);
                  }}
                  disabled={!editable || busy || excluded}
                  className="border border-line rounded-panel p-3 font-mono text-xs w-full min-h-[260px] flex-1 disabled:bg-paper disabled:text-ink-dim leading-relaxed focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
                  placeholder="Paste or edit verified technical specifications from this page..."
                  spellCheck={false}
                />

                <details className="text-spec text-ink-dim group">
                  <summary className="cursor-pointer font-medium hover:text-body transition-colors">
                    Raw automatic extraction (as extracted from PDF)
                  </summary>
                  <pre className="mt-1 overflow-auto max-h-40 whitespace-pre-wrap p-2.5 bg-paper rounded border border-line font-mono text-[11px] text-ink">
                    {page.extractedText || "No native text layer extracted from this page."}
                  </pre>
                </details>

                {/* EXPLICIT PAGE VERIFICATION CONTROLS (PART R) */}
                {editable && (
                  <div className="space-y-3 pt-2 border-t border-line">
                    <label className="text-spec font-medium flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={excluded}
                        disabled={busy}
                        onChange={(e) => {
                          setExcluded(e.target.checked);
                          setConfirmed(false);
                          setDirty(true);
                        }}
                        className="mt-0.5 rounded text-brand-deep focus:ring-brand-deep"
                      />
                      <span>Exclude this page from AI knowledge (e.g. blank page, cover graphic, or decorative illustration)</span>
                    </label>

                    {excluded && (
                      <div>
                        <label className="text-spec font-semibold block mb-1">
                          Reason for exclusion (required)
                        </label>
                        <input
                          aria-label="Reason for exclusion"
                          value={reason}
                          maxLength={2000}
                          disabled={busy}
                          placeholder="e.g. Blank page with no technical or commercial specifications"
                          onChange={(e) => {
                            setReason(e.target.value);
                            setConfirmed(false);
                            setDirty(true);
                          }}
                          className="w-full border border-line rounded p-2 text-spec"
                        />
                      </div>
                    )}

                    <label className="text-spec flex items-start gap-2 bg-brand-wash/50 border border-brand-edge/50 p-2.5 rounded-panel cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={busy || !source || !pdfRendered || Boolean(pdfError)}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-0.5 rounded text-brand-deep focus:ring-brand-deep"
                      />
                      <span className="text-xs text-body leading-tight font-medium">
                        I compared this page with the original PDF, including table headers, values, units, blank cells, and figures. The retained text or exclusion is correct.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={busy || !confirmed || (excluded ? reason.trim().length < 10 : !text.trim())}
                      onClick={save}
                      className="w-full sm:w-auto px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    >
                      {busy ? "Saving verification..." : "Save page review & continue"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* COMPLETION SUMMARY & DOCUMENT-LEVEL APPROVAL (PART S & T) */}
            {editable && (
              <footer className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                {isAllPagesReviewed ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 text-spec font-bold">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>All {totalPages} pages reviewed. Review requirements satisfied.</span>
                    </div>
                    <label className="text-spec flex items-start gap-2 cursor-pointer select-none max-w-2xl">
                      <input
                        type="checkbox"
                        checked={approvalConfirmed}
                        onChange={(e) => setApprovalConfirmed(e.target.checked)}
                        disabled={busy || Boolean(dirty)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-body">
                        I confirm this document source and revision are verified for active AI sales knowledge. Excluded pages will remain excluded from AI requests.
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="text-spec text-ink-dim">
                    <span className="font-semibold text-body">Document Approval Gate:</span>{" "}
                    {reviewedPagesCount} of {totalPages} pages reviewed ({totalPages - reviewedPagesCount} remaining). Complete all page reviews to enable AI knowledge approval.
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy || !approvalConfirmed || Boolean(dirty) || !isAllPagesReviewed}
                  onClick={approve}
                  className="px-5 py-2.5 rounded-edge bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-spec transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs whitespace-nowrap"
                >
                  {busy ? "Approving..." : "Approve for AI knowledge"}
                </button>
              </footer>
            )}
          </>
        )}
      </section>
    </div>
  );
}
