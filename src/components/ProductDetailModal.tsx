import React, { useState } from "react";
import {
  X,
  Package,
  Zap,
  Sun,
  ShieldCheck,
  Download,
  Copy,
  Plus,
  Layers,
  CheckCircle2,
  FileText,
  ExternalLink,
  KanbanSquare
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { PlasgainProduct } from "../types";

export interface ProductDetailModalProps {
  product: PlasgainProduct | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const {
    crmOpportunities,
    updateCrmOpportunity,
    showToast,
    navigateToCRM
  } = useApp();

  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [dealQty, setDealQty] = useState<number>(10);
  const [dealUnitPrice, setDealUnitPrice] = useState<number>(1850);
  const [isAddingToDeal, setIsAddingToDeal] = useState(false);

  if (!product) return null;

  const handleCopySpec = () => {
    const spec = `${product.name} (${product.code}): ${product.lumens || "High output"} LED luminaire, ${product.cct || "3000K/4000K"}, ${product.battery || "Lithium battery storage"}, ${product.solarPanel || "Monocrystalline PV"}, ${product.ingressImpact || "IP65/IK09"}. Compliant with Australian Standards ${product.standardCompliance?.join(", ") || "AS/NZS 1158 / AS/NZS 4509"}.`;
    navigator.clipboard.writeText(spec);
    showToast("Technical specification copied to clipboard!", "success");
  };

  const handleDownloadDatasheet = () => {
    showToast(`Downloading official datasheet: ${product.datasheetDoc || `${product.code}_datasheet.pdf`}`, "info");
  };

  const handleDownloadIES = () => {
    showToast(`Downloading photometric IES file: ${product.code}_photometric.ies`, "info");
  };

  const handleConfirmAddToDeal = () => {
    if (!selectedDealId) {
      showToast("Please select an active deal from your pipeline", "warning");
      return;
    }

    const targetDeal = crmOpportunities.find((d) => d.id === selectedDealId);
    if (!targetDeal) return;

    const existingProducts = targetDeal.products || [];
    const newProductLine = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      category: product.category,
      quantity: Number(dealQty) || 1,
      unitPrice: Number(dealUnitPrice) || 0,
      totalPrice: (Number(dealQty) || 1) * (Number(dealUnitPrice) || 0)
    };

    const updatedProducts = [...existingProducts, newProductLine];
    const newTotal = updatedProducts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

    updateCrmOpportunity(targetDeal.id, {
      products: updatedProducts,
      dealValue: newTotal
    });

    showToast(`Added ${dealQty}x ${product.name} to deal "${targetDeal.name}" ($${newTotal.toLocaleString()})`, "success");
    setIsAddingToDeal(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
      className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-start justify-between gap-4 bg-paper">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-deep text-white">
                {product.code}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {product.status || "Current Approved"}
              </span>
              <span className="text-spec font-medium text-ink-dim">
                {product.category}
              </span>
            </div>
            <h2 id="product-detail-title" className="text-xl font-bold text-ink tracking-tight">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-ink-dim hover:text-ink hover:bg-line/40 rounded-full cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-meta flex-1">
          {/* Key Specifications Grid */}
          <div>
            <h3 className="text-spec font-bold uppercase tracking-wider text-ink-dim mb-2.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-brand-deep" /> Technical Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-paper p-3.5 rounded-edge border border-line">
              <div>
                <span className="text-[11px] font-medium text-ink-dim block">Luminous Output</span>
                <span className="font-bold text-body text-ink">{product.lumens || product.lumensTypical || "Standard High Output"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-ink-dim block">Colour Temp (CCT)</span>
                <span className="font-bold text-body text-ink">{product.cct || "3000K Warm / 4000K Neutral"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-ink-dim block">Battery Capacity</span>
                <span className="font-bold text-body text-ink">{product.battery || "Engineered Lithium Pack"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-ink-dim block">Solar PV Array</span>
                <span className="font-bold text-body text-ink">{product.solarPanel || "Monocrystalline Module"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-ink-dim block">Ingress &amp; Impact</span>
                <span className="font-bold text-body text-ink">{product.ingressImpact || "IP65 / IK09"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-ink-dim block">Warranty</span>
                <span className="font-bold text-body text-ink">{product.warranty || "3-10yr Commercial Warranty"}</span>
              </div>
            </div>
          </div>

          {/* Standards & Compliance */}
          {product.standardCompliance && product.standardCompliance.length > 0 && (
            <div>
              <h3 className="text-spec font-bold uppercase tracking-wider text-ink-dim mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Standards &amp; Verified Compliance
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.standardCompliance.map((std, i) => (
                  <span
                    key={i}
                    className="text-spec font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-200"
                  >
                    {std}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Features */}
          {product.keyFeatures && product.keyFeatures.length > 0 && (
            <div>
              <h3 className="text-spec font-bold uppercase tracking-wider text-ink-dim mb-2">
                Key Engineering Features
              </h3>
              <ul className="space-y-1.5 text-meta text-ink-dim list-disc pl-5">
                {product.keyFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Add to Deal Section */}
          {isAddingToDeal && (
            <div className="p-4 bg-brand-wash/40 rounded-edge border border-brand-edge space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-bold text-body text-brand-deep flex items-center gap-1.5">
                  <KanbanSquare className="w-4 h-4" /> Inject Product into Pipeline Deal
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingToDeal(false)}
                  className="text-spec text-ink-dim hover:text-ink cursor-pointer font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-ink-dim mb-1">Select Deal *</label>
                  <select
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    className="w-full p-2 bg-white border border-line-strong rounded text-meta font-medium"
                  >
                    <option value="">-- Choose Pipeline Deal --</option>
                    {crmOpportunities.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.accountName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-dim mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    value={dealQty}
                    onChange={(e) => setDealQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-white border border-line-strong rounded text-meta font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-dim mb-1">Unit Sell Price ($ AUD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={dealUnitPrice}
                    onChange={(e) => setDealUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-line-strong rounded text-meta font-bold text-brand-deep"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-spec font-bold text-ink">
                  Line Total: ${(dealQty * dealUnitPrice).toLocaleString()} AUD ex GST
                </span>
                <button
                  type="button"
                  onClick={handleConfirmAddToDeal}
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded cursor-pointer transition-colors shadow-2xs"
                >
                  Confirm Injection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-paper border-t border-line flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopySpec}
              className="px-3 py-1.5 bg-white border border-line hover:bg-raised text-ink font-semibold text-spec rounded flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-ink-dim" />
              <span>Copy Specification</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadDatasheet}
              className="px-3 py-1.5 bg-white border border-line hover:bg-raised text-ink font-semibold text-spec rounded flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-ink-dim" />
              <span>Download Datasheet</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadIES}
              className="px-3 py-1.5 bg-white border border-line hover:bg-raised text-ink font-semibold text-spec rounded flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-brand-deep" />
              <span>Photometric IES</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingToDeal(true)}
            className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add to Deal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
