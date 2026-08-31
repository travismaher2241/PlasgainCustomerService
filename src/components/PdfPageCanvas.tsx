import React, { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** Render the actual PDF page even in browsers with no native PDF plugin. */
export function PdfPageCanvas({ source, page, onRenderState }: { source: string; page: number; onRenderState?: (ready: boolean) => void }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | undefined;
    setDocument(null); setError("");
    void import("pdfjs-dist").then(async pdfjs => {
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      task = pdfjs.getDocument({ url: source, useSystemFonts: true });
      const loaded = await task.promise;
      if (!cancelled) setDocument(loaded);
    }).catch(error => { if (!cancelled) setError(error.message || "Could not render this PDF."); });
    return () => { cancelled = true; void task?.destroy(); };
  }, [source]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(250, entries[0].contentRect.width - 24)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setReady(false); onRenderState?.(false);
    if (!document) return;
    setError("");
    void document.getPage(page).then(async pdfPage => {
      if (cancelled || !canvas.current) return;
      const viewport = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(3, width / viewport.width * zoom);
      const display = pdfPage.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const output = pdfPage.getViewport({ scale: scale * ratio });
      canvas.current.width = Math.ceil(output.width);
      canvas.current.height = Math.ceil(output.height);
      canvas.current.style.width = `${display.width}px`;
      canvas.current.style.height = `${display.height}px`;
      renderTask = pdfPage.render({ canvas: canvas.current, viewport: output });
      await renderTask.promise;
      if (!cancelled) { setReady(true); onRenderState?.(true); }
    }).catch(error => { if (!cancelled && error.name !== "RenderingCancelledException") setError(error.message || "Page rendering failed."); });
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [document, page, width, zoom, onRenderState]);
  return <div ref={container} className="flex-1 min-h-0 min-w-0 flex flex-col">
    <div className="flex items-center gap-3 px-3 py-2 text-meta bg-surface border-b border-line"><button aria-label="Zoom out PDF" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5,value-0.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in PDF" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3,value+0.25))}>+</button><button onClick={() => setZoom(1)}>Fit page width</button></div>
    {error && <p role="alert" className="p-3 text-red-800">{error} Download the original and check it separately.</p>}
    {!ready && !error && <p role="status" className="p-3 text-meta">Rendering original PDF page…</p>}
    <div className="overflow-auto flex-1 p-3 min-h-[250px]"><canvas ref={canvas} role="img" aria-label={`Original PDF page ${page}`} className={`block bg-white shadow mx-auto ${ready ? "" : "invisible"}`} /></div>
  </div>;
}
