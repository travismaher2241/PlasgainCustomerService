import React, { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { usePdfSource } from "./usePdfSource";
import { PdfPageCanvas } from "./PdfPageCanvas";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: { title: string; fileUrl: string; version?: string; pageCount?: number; approvalStatus?: string } | null;
  initialPage?: number;
}
export function PDFViewerModal({ isOpen, onClose, document: doc, initialPage = 1 }: Props) {
  const [page, setPage] = useState(initialPage);
  const { source, error } = usePdfSource(isOpen ? doc?.fileUrl : undefined);
  useEffect(() => setPage(initialPage), [initialPage, doc?.fileUrl]);
  if (!isOpen || !doc) return null;
  return <div className="fixed inset-0 z-50 bg-chrome/75 p-3 flex items-center justify-center">
    <section role="dialog" aria-modal="true" aria-label={doc.title} className="bg-surface rounded-panel w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
      <header className="p-4 border-b border-line flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0"><h2 className="font-bold truncate">{doc.title}</h2><p className="text-meta text-ink-dim">{doc.version} · {doc.approvalStatus || "Unverified reference"}</p></div>
        <button aria-label="Previous Page" disabled={page <= 1} onClick={() => setPage(p => p-1)} className="disabled:opacity-40">Previous</button>
        <span>Page {page}{doc.pageCount ? ` of ${doc.pageCount}` : ""}</span>
        <button aria-label="Next Page" disabled={!doc.pageCount || page >= doc.pageCount} onClick={() => setPage(p => p+1)} className="disabled:opacity-40">Next</button>
        {source && <a href={source} download={`${doc.title}.pdf`} aria-label="Download original PDF"><Download className="w-5 h-5" /></a>}
        <button onClick={onClose} aria-label="Close PDF viewer"><X /></button>
      </header>
      {error ? <p role="alert" className="p-5 text-red-700">{error}</p> : source ? <PdfPageCanvas source={source} page={page} /> : <p role="status" className="p-5">Loading original PDF…</p>}
    </section>
  </div>;
}
