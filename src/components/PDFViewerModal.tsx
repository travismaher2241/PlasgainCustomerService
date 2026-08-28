import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  X
} from "lucide-react";
import { ControlledDocument } from "../server/documentGovernanceStore";

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ControlledDocument | {
    title: string;
    fileUrl: string;
    version?: string;
    pageCount?: number;
    approvalStatus?: string;
  } | null;
  initialPage?: number;
}

export function PDFViewerModal({
  isOpen,
  onClose,
  document: doc,
  initialPage = 1
}: PDFViewerModalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (!isOpen || !doc) return null;

  const totalPages = doc.pageCount || 4;
  const status = doc.approvalStatus || "Approved";

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const handleZoomIn = () => setZoomLevel((z) => Math.min(200, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(50, z - 25));
  const handleFitWidth = () => setZoomLevel(100);

  const statusBadge = () => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 text-spec px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3 h-3" />
            <span>Authoritative (Approved)</span>
          </span>
        );
      case "Superseded":
        return (
          <span className="inline-flex items-center gap-1 text-spec px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3" />
            <span>Superseded Revision</span>
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1 text-spec px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3 h-3" />
            <span>Expired — Review Required</span>
          </span>
        );
      case "Draft":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-spec px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <span>Internal Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-chrome/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-viewer-title"
        className={`bg-surface w-full rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isFullscreen ? "h-full max-w-full rounded-none" : "max-w-4xl max-h-[92vh] h-[850px]"
        }`}
      >
        {/* Top Control Bar */}
        <div className="p-3 bg-raised border-b border-line flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-brand-deep shrink-0" />
            <div className="min-w-0">
              <h2 id="pdf-viewer-title" className="text-body font-bold text-ink truncate max-w-md" title={doc.title}>
                {doc.title}
              </h2>
              <div className="flex items-center gap-2 text-spec text-ink-dim">
                <span>{doc.version || "Rev 1.0"}</span>
                <span>•</span>
                {statusBadge()}
              </div>
            </div>
          </div>

          {/* Viewer Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Page Navigation */}
            <div className="flex items-center bg-surface border border-line rounded-edge p-0.5 text-meta">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                aria-label="Previous Page"
                className="p-1 hover:bg-hover rounded-edge text-ink-dim disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-spec font-bold text-ink">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                aria-label="Next Page"
                className="p-1 hover:bg-hover rounded-edge text-ink-dim disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-surface border border-line rounded-edge p-0.5 text-meta">
              <button
                onClick={handleZoomOut}
                aria-label="Zoom Out"
                className="p-1 hover:bg-hover rounded-edge text-ink-dim cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFitWidth}
                className="px-2 text-spec font-mono text-ink-dim hover:text-ink cursor-pointer"
              >
                {zoomLevel}%
              </button>
              <button
                onClick={handleZoomIn}
                aria-label="Zoom In"
                className="p-1 hover:bg-hover rounded-edge text-ink-dim cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fullscreen & Download */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-2 hover:bg-hover rounded-edge text-ink-dim border border-line cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <a
              href={doc.fileUrl || "#"}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Document"
              className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span>
            </a>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 hover:bg-hover rounded-edge text-ink-dim hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page Render Canvas Area */}
        <div className="flex-1 bg-paper/90 overflow-auto p-4 flex items-center justify-center relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-ink-dim space-y-2">
              <div className="w-8 h-8 border-2 border-brand-deep border-t-transparent rounded-full animate-spin" />
              <p className="text-meta font-medium">Loading document page {currentPage}...</p>
            </div>
          ) : loadError ? (
            <div className="p-6 bg-surface border border-line rounded-frame text-center max-w-md space-y-3 shadow-sm">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-bold text-body text-ink">Preview Unavailable</h3>
              <p className="text-meta text-ink-dim">
                The embedded PDF preview could not be loaded. The original controlled file remains fully available for download.
              </p>
              <a
                href={doc.fileUrl || "#"}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-deep text-white font-bold text-meta rounded-edge cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Open Original File</span>
              </a>
            </div>
          ) : (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="bg-white text-slate-900 border border-slate-300 shadow-xl rounded-sm p-8 sm:p-12 w-[680px] min-h-[900px] flex flex-col justify-between select-none transition-transform duration-100"
            >
              {/* Document Header */}
              <div>
                <div className="flex justify-between items-start border-b-2 border-brand-deep pb-4 mb-6">
                  <div>
                    <h1 className="text-xl font-extrabold text-brand-deep tracking-tight">{doc.title}</h1>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
                      Plasgain Australia • Technical Specification & Engineering Datasheet
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-900 text-white font-mono text-xs font-bold px-2.5 py-1 rounded">
                      {doc.version || "Rev 4.0"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Page {currentPage} of {totalPages}</p>
                  </div>
                </div>

                {/* Page Content Simulation matching genuine document structure */}
                {currentPage === 1 && (
                  <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-1">1. Product Overview & Application Scope</h4>
                      <p>
                        High-efficiency commercial solar luminaire designed and certified in accordance with AS/NZS 1158.3.1 (Category P)
                        and AS/NZS 1170.2 (Structural Wind Actions). Integrated MPPT intelligent charge controller with adaptive dimming profiles.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-slate-200 p-2.5 rounded">
                        <span className="font-bold text-slate-900 block mb-1">Optics & Photometry</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          <li>Luminaire Output: 2,500 – 12,000 lm</li>
                          <li>CCT Options: 3000K / 4000K (Standard) / 5000K</li>
                          <li>Optical Distribution: Type II / Type III</li>
                          <li>Lens: UV-Stabilised Polycarbonate IP66 / IK10</li>
                        </ul>
                      </div>

                      <div className="border border-slate-200 p-2.5 rounded">
                        <span className="font-bold text-slate-900 block mb-1">Solar & Energy Storage</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          <li>PV Module: Monocrystalline High-Efficiency (125W)</li>
                          <li>Battery: LiFePO4 12.8V Grade A Cells</li>
                          <li>Autonomy: 5+ Continuous Overcast Days</li>
                          <li>Operating Temp: -10°C to +55°C</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border border-slate-200 p-3 rounded">
                      <h4 className="font-bold text-slate-900 mb-1">2. Standard Pole & Mounting Compatibility</h4>
                      <p>
                        Engineered for direct mounting on Plasgain 4.5m – 6.0m direct-buried composite poles and standard 60mm / 76mm spigots.
                        Direct bury foundations require minimum 1.2m embedment depth in standard soil conditions.
                      </p>
                    </div>
                  </div>
                )}

                {currentPage === 2 && (
                  <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 border-b pb-1">3. Mechanical Specifications & Dimensions</h3>
                    <div className="h-44 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400">
                      <span>[AS/NZS 1158 Engineering Dimensional Diagram — 6.0m Spigot Assembly]</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded border"><span className="font-bold">Total Weight:</span> 18.5 kg</div>
                      <div className="bg-slate-50 p-2 rounded border"><span className="font-bold">EPA Rating:</span> 0.22 m²</div>
                      <div className="bg-slate-50 p-2 rounded border"><span className="font-bold">Wind Rating:</span> Region C (Cyclonic)</div>
                    </div>
                  </div>
                )}

                {currentPage >= 3 && (
                  <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                    <h3 className="font-bold text-sm text-slate-900 border-b pb-1">4. Compliance & Warranty Statement</h3>
                    <p>
                      Manufactured under ISO 9001 quality management systems. Tested and certified in accordance with:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li>AS/NZS 1158.3.1:2020 Lighting for roads and public spaces — Pedestrian area (Category P) lighting</li>
                      <li>AS/NZS 1170.2:2021 Structural design actions — Wind actions</li>
                      <li>AS/NZS 60598.1:2017 Luminaires — General requirements and tests</li>
                    </ul>
                    <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
                      <span className="font-bold block mb-0.5">Plasgain 5-Year Comprehensive Warranty</span>
                      Covers luminaire housing, solar array, charge controller, and LiFePO4 battery pack for 5 years from delivery.
                    </div>
                  </div>
                )}
              </div>

              {/* Document Footer */}
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                <span>Plasgain Customer Service & Engineering • www.plasgain.com.au</span>
                <span>Document ID: {doc.fileUrl || "controlled-doc"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
