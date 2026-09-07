import React, { useEffect, useState } from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { apiGet } from "../../utils/apiClient";
import { formatAuDateTime } from "../../utils/dateUtils";

/**
 * The quote PDFs held against a deal.
 *
 * The file is the document the customer actually received. When a price is
 * queried months later, the parsed summary is not the thing to argue from -
 * this is. Revisions are kept rather than replaced, newest first, so what was
 * originally quoted stays visible.
 */

interface QuoteDocumentSummary {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  quoteNumber?: string;
}

const readableSize = (bytes: number): string =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const QuoteDocumentsPanel: React.FC<{ opportunityId: string }> = ({ opportunityId }) => {
  const [documents, setDocuments] = useState<QuoteDocumentSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDocuments(null);
    apiGet<{ documents: QuoteDocumentSummary[] }>(`/api/quotes/by-opportunity/${opportunityId}`)
      .then((data) => {
        if (cancelled) return;
        const list = data?.documents || [];
        setDocuments(list);
        setSelectedId(list[0]?.id || null);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  if (documents === null) {
    return (
      <div className="border border-line rounded-panel p-4 flex items-center gap-2 text-spec text-ink-dim">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Looking for the quote document…</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="border border-line rounded-panel p-4">
        <p className="font-bold text-ink flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-ink-faint shrink-0" />
          <span>No quote document</span>
        </p>
        <p className="mt-1 text-spec text-ink-dim">
          Import the quote PDF from the Log menu and it will be kept here, alongside the quote.
        </p>
      </div>
    );
  }

  const selected = documents.find((d) => d.id === selectedId) || documents[0];

  return (
    <div className="border border-line rounded-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-paper">
        <p className="font-bold text-ink flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-brand-deep shrink-0" />
          <span>
            Quote document{documents.length > 1 ? `s (${documents.length})` : ""}
          </span>
        </p>
        {documents.length > 1 && (
          <p className="mt-0.5 text-spec text-ink-dim">
            Every version is kept, newest first, so you can see what was originally quoted.
          </p>
        )}
      </div>

      <ul className="divide-y divide-line">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
              doc.id === selected.id ? "bg-brand-wash/40" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedId(doc.id)}
              className="min-w-0 text-left cursor-pointer min-h-[44px] flex flex-col justify-center"
            >
              <span className="font-bold text-ink block truncate">{doc.fileName}</span>
              <span className="text-spec text-ink-dim block">
                {readableSize(doc.sizeBytes)} · added {formatAuDateTime(doc.uploadedAt)}
              </span>
            </button>

            {/*
              A real link, not a scripted open: on a phone this hands the PDF to
              the system viewer, which is far more reliable than an inline frame
              on iOS Safari.
            */}
            <a
              href={`/api/quotes/${doc.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 min-h-[44px] px-3 rounded-edge border border-line bg-white hover:bg-paper text-brand-deep font-bold text-spec flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>

      {/* Inline preview on screens with room for it. */}
      <div className="hidden md:block border-t border-line bg-raised">
        <object
          data={`/api/quotes/${selected.id}/file`}
          type="application/pdf"
          className="w-full h-[520px]"
          aria-label={`Preview of ${selected.fileName}`}
        >
          <p className="p-4 text-spec text-ink-dim">
            This browser will not show the PDF inline. Use Open above to view it.
          </p>
        </object>
      </div>
    </div>
  );
};
