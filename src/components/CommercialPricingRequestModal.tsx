import React, { useState } from "react";
import { AlertCircle, CheckCircle2, DollarSign, Send, X } from "lucide-react";
import { apiPost } from "../utils/apiClient";
export interface CommercialPricingRequest {
  id: string;
  opportunityId?: string;
  projectId: string;
  customerCompany: string;
  productCode: string;
  productName: string;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
  requiredByDate: string;
  status: string;
  notes?: string;
}
import { getLocalDateInputValue, addBusinessDaysLocal } from "../utils/dateUtils";

interface CommercialPricingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  productCode: string;
  productName: string;
  projectId?: string;
  projectName?: string;
  customerCompany?: string;
  initialQuantity?: number;
  onRequestSubmitted?: (req: CommercialPricingRequest) => void;
}

export function CommercialPricingRequestModal({
  isOpen,
  onClose,
  productCode,
  productName,
  projectId = "proj-general",
  projectName = "Public Lighting Tender",
  customerCompany = "Unknown Customer",
  initialQuantity = 12,
  onRequestSubmitted
}: CommercialPricingRequestModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [requiredByDate, setRequiredByDate] = useState(() => {
    return addBusinessDaysLocal(3);
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Partial<CommercialPricingRequest> = {
        projectId,
        customerCompany,
        productCode,
        productName,
        quantity: Number(quantity),
        requestedBy: "Technical Sales Specialist",
        requiredByDate,
        notes: notes.trim(),
        status: "Requested"
      };

      const result = await apiPost<CommercialPricingRequest>("/api/commercial-pricing", payload);
      setIsSuccess(true);
      onRequestSubmitted?.(result);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.message || "Failed to submit commercial pricing request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-request-title"
        className="bg-surface w-full max-w-lg rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand-deep">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 id="pricing-request-title" className="text-body font-bold text-ink">
                Request Commercial Pricing
              </h2>
              <p className="text-spec text-ink-dim">Request approved sales pricing from Commercial Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-edge hover:bg-hover text-ink-dim hover:text-ink cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-meta text-ink">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-edge text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-emerald-700">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
              <p className="font-bold text-body">Commercial Pricing Requested</p>
              <p className="text-spec text-ink-dim">Request submitted to Commercial Operations queue.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-paper border border-line rounded-edge space-y-1">
                <div className="flex justify-between text-spec font-bold text-ink-dim uppercase">
                  <span>Product Model</span>
                  <span>Project</span>
                </div>
                <div className="flex justify-between font-bold text-ink">
                  <span>{productCode} — {productName}</span>
                  <span className="text-ink-dim truncate max-w-[160px]">{projectName}</span>
                </div>
                <p className="text-spec text-ink-muted">Customer: {customerCompany}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Estimated Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 bg-surface rounded-edge border border-line focus:ring-1 focus:ring-brand font-medium text-body"
                  />
                </div>

                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Price Required By
                  </label>
                  <input
                    type="date"
                    required
                    value={requiredByDate}
                    onChange={(e) => setRequiredByDate(e.target.value)}
                    className="w-full p-2 bg-surface rounded-edge border border-line focus:ring-1 focus:ring-brand font-medium text-body"
                  />
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                  Commercial Context / Tender Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Volume tender discount requested for Tier 1 Civil Contractor; competitive against Leadsun."
                  className="w-full p-2.5 bg-surface rounded-edge border border-line focus:ring-1 focus:ring-brand font-medium text-body text-meta resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-edge text-spec text-amber-800 leading-relaxed">
                <strong>Pricing Safeguard:</strong> Unapproved prices are never fabricated or estimated. Once submitted,
                this request appears on the deal and in the Commercial Pricing Register.
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-edge text-meta font-medium text-ink-dim hover:bg-hover border border-line cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Pricing Request"}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
