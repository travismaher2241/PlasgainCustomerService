import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { KnowledgeRecord } from "../types/knowledge";
import { apiGet, apiPost } from "../utils/apiClient";
import { usePdfSource } from "./usePdfSource";
import { PdfPageCanvas } from "./PdfPageCanvas";

export function KnowledgeReviewModal({ id, canReview, onClose, onChanged }: { id: string; canReview: boolean; onClose: () => void; onChanged: () => void }) {
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
  const { source, error: pdfError } = usePdfSource(record?.document.fileUrl);
  const page = record?.pages[pageIndex];
  const editable = canReview && record?.document.approvalStatus === "Pending Review";
  useEffect(() => { let active = true; apiGet<KnowledgeRecord>(`/api/knowledge/documents/${id}`).then(result => { if (active) setRecord(result); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, [id]);
  useEffect(() => {
    setText(page?.reviewedText || ""); setExcluded(page?.excluded || false); setReason(page?.exclusionReason || ""); setConfirmed(false);
  }, [page]);
  const dirty = page && (text !== page.reviewedText || excluded !== Boolean(page.excluded) || reason !== (page.exclusionReason || ""));
  const save = async () => {
    if (!record || !page) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await apiPost<KnowledgeRecord>(`/api/knowledge/documents/${id}/pages/${page.page}/review`, { text, excluded, reason, confirmed, revision: record.document.knowledge.revision });
      setRecord(updated); setNotice(`Page ${page.page} review saved.`); onChanged();
      if (pageIndex < updated.pages.length-1) setPageIndex(pageIndex+1);
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!record) return;
    setBusy(true); setError("");
    try {
      await apiPost(`/api/knowledge/documents/${id}/approve`, { revision: record.document.knowledge.revision, confirmed: approvalConfirmed });
      onChanged(); onClose();
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 bg-chrome/75 p-2 sm:p-4 flex items-center justify-center">
    <section role="dialog" aria-modal="true" aria-labelledby="review-heading" className="bg-surface rounded-panel w-full min-w-0 max-w-[1500px] h-[95vh] flex flex-col overflow-hidden">
      <header className="p-4 border-b border-line flex items-start gap-3">
        <div className="flex-1 min-w-0"><h2 id="review-heading" className="font-bold">Review PDF knowledge</h2><p className="text-meta truncate">{record?.document.title}</p>
          <p className="text-spec text-ink-dim">{record?.document.knowledge.reviewedPages || 0} / {record?.pages.length || 0} pages reviewed. Original text is retained alongside every correction.</p></div>
        <button onClick={onClose} disabled={busy || Boolean(dirty)} aria-label="Close knowledge review" title={dirty ? "Save or discard page edits before closing" : "Close"}><X /></button>
      </header>
      {error && <p role="alert" className="p-3 bg-red-50 text-red-800">{error} <button className="underline" onClick={() => { void apiGet<KnowledgeRecord>(`/api/knowledge/documents/${id}`).then(setRecord).then(() => setError("")).catch(e => setError(e.message)); }}>Reload saved review</button></p>}
      {notice && <p role="status" className="px-4 py-2 text-emerald-800">{notice}</p>}
      {!record || !page ? <p className="p-5">Loading document…</p> : <>
        <div className="px-4 py-2 flex flex-wrap items-center gap-3 border-b border-line">
          <button disabled={busy || Boolean(dirty) || pageIndex === 0} onClick={() => setPageIndex(pageIndex-1)} className="disabled:opacity-40">Previous page</button>
          <label>PDF page <select aria-label="Review page" value={pageIndex} disabled={busy || Boolean(dirty)} onChange={event => setPageIndex(Number(event.target.value))} className="border rounded p-1">{record.pages.map((p,index) => <option key={p.page} value={index}>{p.page}{p.reviewedAt ? " ✓" : ""}{p.excluded ? " (excluded)" : ""}</option>)}</select> of {record.pages.length}</label>
          <button disabled={busy || Boolean(dirty) || pageIndex === record.pages.length-1} onClick={() => setPageIndex(pageIndex+1)} className="disabled:opacity-40">Next page</button>
          {source && <a href={`${source}#page=${page.page}`} target="_blank" rel="noreferrer" className="text-brand-deep underline">Open original PDF</a>}
          {dirty && <button className="underline" disabled={busy} onClick={() => { setText(page.reviewedText); setExcluded(Boolean(page.excluded)); setReason(page.exclusionReason || ""); setConfirmed(false); }}>Discard unsaved edits</button>}
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-y-auto">
          <div className="min-w-0 min-h-[320px] lg:min-h-0 flex flex-col bg-paper">
            <p className="px-3 py-2 text-spec text-ink-dim">Original PDF · PDF page {page.page} (printed page labels may differ)</p>
            {pdfError ? <p role="alert" className="p-4 text-red-700">{pdfError}</p> : source ? <PdfPageCanvas source={source} page={page.page} onRenderState={setPdfRendered} /> : <p className="p-4">Loading original PDF…</p>}
          </div>
          <div className="min-w-0 p-4 flex flex-col gap-3 lg:overflow-y-auto">
            <div className="text-spec bg-amber-50 text-amber-900 border border-amber-200 p-3 rounded space-y-2">{page.warnings.map(warning => <p key={warning}>{warning}</p>)}<p>Images are not transcribed automatically. Correct merged headers and ambiguous relationships explicitly. Never fill blank approval cells by assumption.</p></div>
            <label className="font-semibold text-meta" htmlFor="reviewed-page-text">Verified page text</label>
            <textarea id="reviewed-page-text" value={text} onChange={event => { setText(event.target.value); setConfirmed(false); }} disabled={!editable || busy || excluded} className="border border-line rounded p-3 font-mono text-xs w-full min-h-[280px] flex-1 disabled:bg-paper" spellCheck={false} />
            <details className="text-spec"><summary className="cursor-pointer">Original automatic extraction (unchanged)</summary><pre className="overflow-auto whitespace-pre-wrap p-2 bg-paper">{page.extractedText || "No native text extracted."}</pre></details>
            {editable && <>
              <label className="text-meta flex items-start gap-2"><input type="checkbox" checked={excluded} disabled={busy} onChange={event => { setExcluded(event.target.checked); setConfirmed(false); }} />Exclude this page from AI knowledge (e.g. blank, cover, or unreadable)</label>
              {excluded && <label className="text-meta">Reason for exclusion<input aria-label="Reason for exclusion" value={reason} maxLength={2000} disabled={busy} onChange={event => { setReason(event.target.value); setConfirmed(false); }} className="w-full border rounded p-2 mt-1" /></label>}
              <label className="text-meta flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={busy || !source || !pdfRendered || Boolean(pdfError)} onChange={event => setConfirmed(event.target.checked)} />I compared this page with the original PDF, including table headers, values, units, blank cells and figures. The retained text or exclusion is correct.</label>
              <button disabled={busy || !confirmed || (excluded ? reason.trim().length < 10 : !text.trim())} onClick={save} className="px-4 py-2 rounded bg-brand-deep text-white disabled:opacity-40">{busy ? "Saving…" : "Save page review & continue"}</button>
            </>}
            {page.reviewedBy && <p className="text-spec text-ink-dim">Reviewed by {page.reviewedBy} · {page.reviewedAt}</p>}
          </div>
        </div>
        {editable && <footer className="p-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <label className="text-meta flex items-start gap-2 max-w-3xl"><input type="checkbox" checked={approvalConfirmed} onChange={event => setApprovalConfirmed(event.target.checked)} disabled={busy || record.document.knowledge.reviewedPages !== record.pages.length || Boolean(dirty)} />I confirm this source and revision are suitable for approved knowledge. Excluded pages will not be available to the AI; this does not certify technical compliance.</label>
          <button disabled={busy || !approvalConfirmed || Boolean(dirty) || record.document.knowledge.reviewedPages !== record.pages.length} onClick={approve} className="bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-40">Approve for AI knowledge</button>
        </footer>}
      </>}
    </section>
  </div>;
}
