import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Copy,
  CheckCircle2,
  Layers,
  ShieldCheck,
  X,
  Eye,
  FileSpreadsheet,
  Printer
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { PlasgainProduct } from "../types";
import {
  resolveProductsForDeal,
  findUnmatchedProducts,
  downloadTenderPackageHTML
} from "../utils/datasheetExporter";

export interface DatasheetPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  customerName?: string;
  quoteRef?: string;
  initialProductNames?: string[];
}

export const DatasheetPackageModal: React.FC<DatasheetPackageModalProps> = ({
  isOpen,
  onClose,
  projectName = "Public Lighting Project",
  customerName = "Council / Contractor",
  quoteRef = "",
  initialProductNames = []
}) => {
  const { showToast, currentUser } = useApp();

  const unmatchedProductStrings = useMemo(() => {
    return findUnmatchedProducts(initialProductNames);
  }, [initialProductNames]);

  const allResolvedProducts = useMemo(() => {
    return resolveProductsForDeal(initialProductNames);
  }, [initialProductNames]);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    allResolvedProducts.map((p) => p.id)
  );

  const [includeAS1158, setIncludeAS1158] = useState(true);
  const [includeAS4702, setIncludeAS4702] = useState(true);

  // Sync if products change
  React.useEffect(() => {
    setSelectedProductIds(allResolvedProducts.map((p) => p.id));
  }, [allResolvedProducts]);

  if (!isOpen) return null;

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const includedProducts = allResolvedProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );

  const handleDownload = () => {
    const standards: string[] = [];
    if (includeAS1158) standards.push("AS/NZS 1158.3.1 (Pedestrian Lighting Category P) & AS/NZS 1158.1.1 (Roadway Category V)");
    if (includeAS4702) standards.push("AS 4702 (Polymeric Cable Cover Mechanical Protection) & AS/NZS 3000 (Wiring Rules)");
    standards.push("AS 1170.2 (Structural Wind Action Sizing - Regions A, B, C, D)");

    downloadTenderPackageHTML({
      projectName,
      customerName,
      quoteRef,
      products: includedProducts,
      complianceStandards: standards,
      preparerName: currentUser.name
    });

    showToast("Downloaded Technical Tender Package (HTML/PDF)!", "success");
  };

  const handleCopySpecSummary = () => {
    const text = `PLASGAIN TENDER SPECIFICATION SCHEDULE\nProject: ${projectName}\nClient: ${customerName}\nQuote Ref: ${quoteRef || "N/A"}\n\nINCLUDED PRODUCTS:\n${includedProducts
      .map(
        (p, i) =>
          `${i + 1}. ${p.name} (${p.code})\n   - Category: ${p.category}\n   - Lumens: ${p.lumens || "Standard Output"}\n   - CCT: ${p.cct || "3000K-5000K"}\n   - PV / Battery: ${p.solarPanel || "Integrated"} / ${p.battery || "LiFePO4"}\n   - Ingress/Impact: ${p.ingressImpact || "IP65/IK09"}\n   - Warranty: ${p.warranty || "5 Years"}`
      )
      .join("\n\n")}\n\nCOMPLIANCE: AS/NZS 1158, AS 4702, AS 1170.2`;

    navigator.clipboard.writeText(text);
    showToast("Copied tender specification summary to clipboard!", "success");
  };

  return (
    <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-brand-deep" />
            <div>
              <h3 className="font-bold text-lg text-body">Export Datasheet &amp; Tender Spec Package</h3>
              <p className="text-spec text-ink-dim">
                Bundles engineering product datasheets, cover sheet, and Australian Standards compliance declarations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-meta">
          
          {/* Top Metadata Banner */}
          <div className="bg-paper p-4 rounded-edge border border-line grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-spec font-bold text-ink-dim uppercase block">Project Name</span>
              <span className="font-bold text-body text-meta">{projectName}</span>
            </div>
            <div>
              <span className="text-spec font-bold text-ink-dim uppercase block">Client / Authority</span>
              <span className="font-bold text-body text-meta">{customerName}</span>
            </div>
            <div>
              <span className="text-spec font-bold text-brand-deep uppercase block">Ostendo Quote Ref</span>
              <span className="font-mono font-bold text-brand-deep">{quoteRef || "OST-2025-PENDING"}</span>
            </div>
          </div>

          {/* Product Checklist */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-2">
              Select Products to Include in Spec Bundle ({includedProducts.length} of {allResolvedProducts.length} selected)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allResolvedProducts.map((product) => {
                const isChecked = selectedProductIds.includes(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`p-3 rounded-edge border flex items-start gap-3 cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-brand-wash/50 border-brand-edge shadow-xs"
                        : "bg-paper border-line text-ink-dim hover:bg-raised"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by div click
                      className="mt-1 h-4 w-4 text-brand rounded border-line cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-body text-meta">{product.name}</span>
                        <span className="font-mono text-spec text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded font-bold">
                          {product.code}
                        </span>
                      </div>
                      <p className="text-spec text-ink-dim mt-0.5">{product.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standards & Compliance Options */}
          <div className="p-3.5 bg-paper rounded-edge border border-line space-y-2">
            <span className="text-spec font-bold uppercase text-ink-dim block">
              Engineering Compliance Inclusions:
            </span>
            <div className="flex flex-wrap gap-4 text-meta">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAS1158}
                  onChange={(e) => setIncludeAS1158(e.target.checked)}
                  className="rounded border-line text-brand"
                />
                <span>AS/NZS 1158 Public Lighting Compliance Statement</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAS4702}
                  onChange={(e) => setIncludeAS4702(e.target.checked)}
                  className="rounded border-line text-brand"
                />
                <span>AS 4702 Polymeric Cable Cover Mechanical Protection Statement</span>
              </label>
            </div>
          </div>

          {/* Interactive Document Preview */}
          <div className="border border-line rounded-edge overflow-hidden">
            <div className="bg-raised p-2.5 border-b border-line flex items-center justify-between text-spec font-bold text-ink-dim">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand-deep" />
                <span>Tender Spec Bundle Document Preview</span>
              </div>
              <span>2 Pages • Printable A4 Layout</span>
            </div>

            <div className="p-4 bg-white space-y-3 font-sans text-spec text-body max-h-52 overflow-y-auto">
              <div className="border-b border-line pb-2 flex justify-between">
                <div>
                  <h4 className="font-black text-brand-deep text-meta">PLASGAIN AUSTRALIA</h4>
                  <p className="text-spec text-ink-dim">Technical Tender Specification Package</p>
                </div>
                <div className="text-right text-spec text-ink-faint">
                  Project: {projectName}<br />
                  Quote Ref: {quoteRef || "OST-2025"}
                </div>
              </div>

              <div>
                <strong>Table of Contents ({includedProducts.length} Datasheets Included):</strong>
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-ink-dim">
                  {includedProducts.map((p, i) => (
                    <li key={i}>
                      <strong>{p.name}</strong> ({p.code}) — {p.category}
                    </li>
                  ))}
                  <li>Australian Standards Compliance (AS/NZS 1158, AS 4702, AS 1170.2)</li>
                  <li>Plasgain 5-Year System Warranty Terms</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            onClick={handleCopySpecSummary}
            className="px-3.5 py-2 bg-white hover:bg-raised text-meta font-bold rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-ink-dim" />
            <span>Copy Spec Text</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-brand-lift" />
              <span>Download Tender Package (HTML / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-line hover:bg-line-strong text-meta font-medium rounded-edge cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
