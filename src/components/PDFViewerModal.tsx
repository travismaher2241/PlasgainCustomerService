import React, { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { usePdfSource } from "./usePdfSource";
import { PdfPageCanvas } from "./PdfPageCanvas";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: {
    title: string;
    fileUrl: string;
    version?: string;
    pageCount?: number;
    approvalStatus?: string;
    source?: string;
  } | null;
  initialPage?: number;
}

export function PDFViewerModal({ isOpen, onClose, document: doc, initialPage = 1 }: Props) {
  const [page, setPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(initialPage.toString());
  const { source, error } = usePdfSource(isOpen ? doc?.fileUrl : undefined);

  const totalPages = doc?.pageCount || 1;

  useEffect(() => {
    setPage(initialPage);
    setPageInput(initialPage.toString());
  }, [initialPage, doc?.fileUrl]);

  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setPage(parsed);
    }
  };

  const handlePageInputBlur = () => {
    const parsed = parseInt(pageInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > totalPages) {
      setPageInput(page.toString());
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && page > 1) {
        setPage((p) => p - 1);
      } else if (e.key === "ArrowRight" && page < totalPages) {
        setPage((p) => p + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, page, totalPages, onClose]);

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-chrome/75 backdrop-blur-xs p-2 sm:p-4 flex items-center justify-center animate-in fade-in duration-150">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={doc.title}
        className="bg-surface rounded-panel w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden border border-line shadow-2xl"
      >
        {/* COMPACT HEADER */}
        <header className="px-4 py-2.5 bg-surface border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="font-bold text-body text-base truncate max-w-md sm:max-w-xl" title={doc.title}>
              {doc.title}
            </h2>
            {doc.version && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge shrink-0">
                {doc.version}
              </span>
            )}
            {doc.approvalStatus && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-line text-ink-dim shrink-0 hidden sm:inline">
                {doc.approvalStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {source && (
              <a
                href={source}
                download={`${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`}
                className="p-1.5 rounded text-ink-dim hover:text-body hover:bg-line transition-colors flex items-center gap-1 text-spec font-medium"
                title="Download original PDF file"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Close PDF viewer"
              className="p-1.5 rounded-edge text-ink-dim hover:text-body hover:bg-line transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* COMPACT PAGE NAVIGATION BAR */}
        <div className="px-4 py-1.5 bg-raised border-b border-line flex items-center justify-between flex-wrap gap-2 text-spec shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Previous Page"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-white hover:bg-surface border border-line text-body font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1 px-2">
              <span className="text-ink-dim font-medium">Page</span>
              <input
                aria-label="Page number"
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                className="w-12 px-1.5 py-0.5 text-center font-mono font-bold text-body border border-line rounded bg-white"
              />
              <span className="text-ink-dim font-medium">of {totalPages}</span>
            </div>

            <button
              aria-label="Next Page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-white hover:bg-surface border border-line text-body font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-spec text-ink-dim font-mono hidden md:block">
            Use ← / → keys to navigate pages
          </div>
        </div>

        {/* VIEWER CANVAS AREA */}
        {error ? (
          <div className="p-8 text-center space-y-3">
            <p role="alert" className="text-red-700 font-semibold">{error}</p>
            {source && (
              <a href={source} target="_blank" rel="noreferrer" className="text-brand-deep underline text-meta">
                Open PDF directly in new tab
              </a>
            )}
          </div>
        ) : source ? (
          <PdfPageCanvas source={source} page={page} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-ink-dim">
            <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
            <p role="status" className="text-meta">Loading original PDF...</p>
          </div>
        )}
      </section>
    </div>
  );
}
