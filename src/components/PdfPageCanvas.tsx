import React, { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ZoomIn, ZoomOut, Maximize2, MoveHorizontal } from "lucide-react";

/** Render the actual PDF page even in browsers with no native PDF plugin. */
export function PdfPageCanvas({
  source,
  page,
  onRenderState,
  hideToolbar = false
}: {
  source: string;
  page: number;
  onRenderState?: (ready: boolean) => void;
  hideToolbar?: boolean;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<"width" | "page" | "custom">("width");
  const [containerSize, setContainerSize] = useState({ width: 600, height: 800 });
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import("pdfjs-dist")["getDocument"]> | undefined;
    setDocument(null);
    setError("");
    void import("pdfjs-dist")
      .then(async (pdfjs) => {
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdfjs.getDocument({ url: source, useSystemFonts: true });
        const loaded = await task.promise;
        if (!cancelled) setDocument(loaded);
      })
      .catch((error) => {
        if (!cancelled) setError(error.message || "Could not render this PDF.");
      });
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [source]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: Math.max(250, entry.contentRect.width - 24),
          height: Math.max(300, entry.contentRect.height - 48)
        });
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setReady(false);
    onRenderState?.(false);
    if (!document) return;
    setError("");

    void document
      .getPage(page)
      .then(async (pdfPage) => {
        if (cancelled || !canvas.current) return;
        const unscaledViewport = pdfPage.getViewport({ scale: 1 });

        let computedScale = 1;
        if (fitMode === "width") {
          computedScale = Math.min(3, (containerSize.width / unscaledViewport.width) * zoom);
        } else if (fitMode === "page") {
          const scaleW = containerSize.width / unscaledViewport.width;
          const scaleH = containerSize.height / unscaledViewport.height;
          computedScale = Math.min(3, Math.min(scaleW, scaleH) * zoom);
        } else {
          computedScale = zoom;
        }

        computedScale = Math.max(0.2, Math.min(3.5, computedScale));

        const display = pdfPage.getViewport({ scale: computedScale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const output = pdfPage.getViewport({ scale: computedScale * ratio });

        canvas.current.width = Math.ceil(output.width);
        canvas.current.height = Math.ceil(output.height);
        canvas.current.style.width = `${display.width}px`;
        canvas.current.style.height = `${display.height}px`;

        renderTask = pdfPage.render({ canvas: canvas.current, viewport: output });
        await renderTask.promise;
        if (!cancelled) {
          setReady(true);
          onRenderState?.(true);
        }
      })
      .catch((error) => {
        if (!cancelled && error.name !== "RenderingCancelledException") {
          setError(error.message || "Page rendering failed.");
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, page, containerSize, zoom, fitMode, onRenderState]);

  return (
    <div ref={container} className="flex-1 min-h-0 min-w-0 flex flex-col">
      {!hideToolbar && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 text-spec bg-surface border-b border-line">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Zoom out PDF"
              disabled={zoom <= 0.5}
              onClick={() => {
                setFitMode("custom");
                setZoom((v) => Math.max(0.4, Number((v - 0.2).toFixed(1))));
              }}
              className="p-1 rounded hover:bg-line disabled:opacity-30 cursor-pointer transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs w-12 text-center text-ink-dim">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in PDF"
              disabled={zoom >= 3}
              onClick={() => {
                setFitMode("custom");
                setZoom((v) => Math.min(3, Number((v + 0.2).toFixed(1))));
              }}
              className="p-1 rounded hover:bg-line disabled:opacity-30 cursor-pointer transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setFitMode("width");
                setZoom(1);
              }}
              className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                fitMode === "width" ? "bg-brand-wash text-brand-deep font-bold border border-brand-edge" : "hover:bg-line text-ink-dim"
              }`}
              title="Fit page width"
            >
              <MoveHorizontal className="w-3 h-3" />
              <span>Fit width</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFitMode("page");
                setZoom(1);
              }}
              className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                fitMode === "page" ? "bg-brand-wash text-brand-deep font-bold border border-brand-edge" : "hover:bg-line text-ink-dim"
              }`}
              title="Fit whole page"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit page</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="p-3 text-red-800 bg-red-50 text-spec border-b border-red-200">
          {error} Download the original PDF and check it separately.
        </p>
      )}

      {!ready && !error && (
        <div className="p-4 flex items-center justify-center gap-2 text-meta text-ink-dim">
          <div className="w-4 h-4 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
          <span>Rendering original PDF page {page}...</span>
        </div>
      )}

      <div className="overflow-auto flex-1 p-3 min-h-[250px] bg-paper">
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Original PDF page ${page}`}
          className={`block bg-white shadow-md mx-auto transition-opacity duration-150 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}
