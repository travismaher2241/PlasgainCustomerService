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
  AlertTriangle,
  AlertCircle,
  Link,
  Search,
  Check
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { PlasgainProduct } from "../types";
import { SAMPLE_PRODUCTS } from "../data/mockData";
import { downloadTenderPackageHTML } from "../utils/datasheetExporter";
import {
  preflightProductPackage,
  PackagePreflightResult
} from "../utils/productResolver";

export interface DatasheetPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  customerName?: string;
  quoteRef?: string;
  initialProductNames?: (string | any)[];
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

  // Local manual SKU mappings: { [rawString]: productId }
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({});
  const [selectedMappingSkus, setSelectedMappingSkus] = useState<Record<string, string>>({});

  // Preflight analysis
  const preflight: PackagePreflightResult = useMemo(() => {
    return preflightProductPackage(initialProductNames, SAMPLE_PRODUCTS, manualMappings);
  }, [initialProductNames, manualMappings]);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    preflight.resolvedProducts.map((p) => p.id)
  );

  const [includeAS1158, setIncludeAS1158] = useState(true);
  const [includeAS4702, setIncludeAS4702] = useState(true);
  const [includeAS1170, setIncludeAS1170] = useState(true);

  // Sync selection when resolved products update
  React.useEffect(() => {
    setSelectedProductIds(preflight.resolvedProducts.map((p) => p.id));
  }, [preflight.resolvedProducts]);

  if (!isOpen) return null;

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleApplyMapping = (rawInput: string) => {
    const targetProductId = selectedMappingSkus[rawInput] || SAMPLE_PRODUCTS[0].id;
    setManualMappings((prev) => ({
      ...prev,
      [rawInput]: targetProductId
    }));
    showToast(`Mapped "${rawInput}" to verified catalog product.`, "success");
  };

  const includedProducts = preflight.resolvedProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );

  const handleDownload = () => {
    if (preflight.unmatchedCount > 0) {
      showToast(
        `Cannot export tender package: ${preflight.unmatchedCount} unmatched product line(s) remain unverified. Please map or confirm all items.`,
        "error"
      );
      return;
    }

    if (includedProducts.length === 0) {
      showToast("Please select at least one product datasheet to include in the bundle.", "error");
      return;
    }

    const standards: string[] = [];
    if (includeAS1158) standards.push("AS/NZS 1158.3.1 (Pedestrian Lighting Category P) & AS/NZS 1158.1.1 (Roadway Category V)");
    if (includeAS4702) standards.push("AS 4702 (Polymeric Cable Cover Mechanical Protection) & AS/NZS 3000 (Wiring Rules)");
    if (includeAS1170) standards.push("AS 1170.2 (Structural Wind Action Sizing - Regions A, B, C, D)");

    downloadTenderPackageHTML({
      projectName,
      customerName,
      quoteRef: quoteRef || "OST-2026-PENDING",
      products: includedProducts,
      complianceStandards: standards,
      preparerName: currentUser.name
    });

    showToast("Downloaded Technical Tender Package (HTML / PDF)!", "success");
  };

  const handleCopySpecSummary = () => {
    const text = `PLASGAIN TENDER SPECIFICATION SCHEDULE
Project: ${projectName}
Client: ${customerName}
Quote Ref: ${quoteRef || "N/A"}

INCLUDED PRODUCTS:
${includedProducts
  .map(
    (p, i) =>
      `${i + 1}. ${p.name} (${p.code})
   - Category: ${p.category}
   - Lumens: ${p.lumens || "Standard Output"}
   - CCT: ${p.cct || "3000K"}
   - PV / Battery: ${p.solarPanel || "Integrated"} / ${p.battery || "LiFePO4"}
   - Ingress/Impact: ${p.ingressImpact || "IP65/IK09"}
   - Warranty: ${p.warranty || "5 Years"}`
  )
  .join("\n\n")}

COMPLIANCE DECLARATION: AS/NZS 1158.3.1:2020 (Category P), AS 4702:2000, AS 1170.2:2021.`;

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
                Preflights and bundles engineering product datasheets, cover sheet, and Australian Standards compliance declarations.
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
              <span className="font-mono font-bold text-brand-deep">{quoteRef || "OST-2026-PENDING"}</span>
            </div>
          </div>

          {/* P0-14: Preflight Status Banner */}
          <div className={`p-3.5 rounded-edge border flex items-center justify-between text-meta ${
            preflight.unmatchedCount === 0
              ? "bg-brand-wash/70 border-brand-edge text-brand-deep font-bold"
              : "bg-soon-wash border-soon text-soon font-bold"
          }`}>
            <div className="flex items-center gap-2">
              {preflight.unmatchedCount === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-brand-deep shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-soon shrink-0" />
              )}
              <div>
                <span>
                  Tender Package Preflight: {preflight.matchedCount} of {preflight.totalItems} line items verified
                </span>
                {preflight.unmatchedCount > 0 && (
                  <p className="text-spec font-normal text-ink-dim">
                    {preflight.unmatchedCount} item(s) require catalog mapping before generating customer-facing specifications.
                  </p>
                )}
              </div>
            </div>
            <span className={`text-spec px-2.5 py-1 rounded font-bold uppercase ${
              preflight.unmatchedCount === 0 ? "bg-white text-brand-deep border border-brand-edge" : "bg-white text-soon border border-soon"
            }`}>
              {preflight.unmatchedCount === 0 ? "Preflight Passed" : "Action Required"}
            </span>
          </div>

          {/* P0-14: Unmatched Product Mapping Workflow */}
          {preflight.unmatchedCount > 0 && (
            <div className="p-4 bg-paper rounded-edge border border-line space-y-3">
              <div className="flex items-center gap-2 text-body font-bold">
                <Link className="w-4 h-4 text-soon" />
                <span>Unmatched Line Items Requiring Verification</span>
              </div>
              <div className="space-y-2">
                {preflight.items
                  .filter((i) => i.status === "UNMATCHED")
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-edge border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-spec font-bold text-ink-dim uppercase block">Unverified Drawing / BOM Line</span>
                        <span className="font-bold text-body">"{item.rawInput}"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedMappingSkus[item.rawInput] || item.suggestedMatches[0]?.id || SAMPLE_PRODUCTS[0]?.id || ""}
                          onChange={(e) =>
                            setSelectedMappingSkus({
                              ...selectedMappingSkus,
                              [item.rawInput]: e.target.value
                            })
                          }
                          className="p-2 border border-line rounded text-meta bg-white font-medium focus:outline-none focus:border-brand-deep"
                        >
                          {SAMPLE_PRODUCTS.length === 0 ? (
                            <option value="">No products available in catalogue</option>
                          ) : (
                            SAMPLE_PRODUCTS.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name} ({sp.code})
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleApplyMapping(item.rawInput)}
                          className="px-3 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Map &amp; Verify</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Product Checklist */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-2">
              Verified Included Products ({includedProducts.length} of {preflight.resolvedProducts.length} active)
            </label>
            {preflight.resolvedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {preflight.resolvedProducts.map((product) => {
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
                        onChange={() => {}}
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
            ) : (
              <div className="p-4 bg-paper rounded-edge border border-line text-center text-ink-dim">
                No verified products selected yet. Map unverified items above or select from catalog.
              </div>
            )}
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
                <span>AS/NZS 1158.3.1 (Pedestrian Lighting Category P)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAS4702}
                  onChange={(e) => setIncludeAS4702(e.target.checked)}
                  className="rounded border-line text-brand"
                />
                <span>AS 4702 (Polymeric Cable Cover Mechanical Protection)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAS1170}
                  onChange={(e) => setIncludeAS1170(e.target.checked)}
                  className="rounded border-line text-brand"
                />
                <span>AS 1170.2 (Structural Wind Action Sizing)</span>
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
              <span>Printable A4 Layout • AS/NZS Verified</span>
            </div>

            <div className="p-4 bg-white space-y-3 font-sans text-spec text-body max-h-52 overflow-y-auto">
              <div className="border-b border-line pb-2 flex justify-between">
                <div>
                  <h4 className="font-black text-brand-deep text-meta">PLASGAIN AUSTRALIA</h4>
                  <p className="text-spec text-ink-dim">Technical Tender Specification Package</p>
                </div>
                <div className="text-right text-spec text-ink-faint">
                  Project: {projectName}<br />
                  Quote Ref: {quoteRef || "OST-2026-PENDING"}
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
                  <li>Australian Standards Compliance Statements (AS/NZS 1158, AS 4702, AS 1170.2)</li>
                  <li>Plasgain 5-Year Commercial System Warranty Terms</li>
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
              disabled={preflight.unmatchedCount > 0}
              className={`px-4 py-2 font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 transition-colors ${
                preflight.unmatchedCount === 0
                  ? "bg-brand-deep hover:bg-brand text-white cursor-pointer"
                  : "bg-ink-faint text-white cursor-not-allowed opacity-75"
              }`}
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
