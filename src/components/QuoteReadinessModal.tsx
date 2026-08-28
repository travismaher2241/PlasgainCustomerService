import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  X,
  ArrowRight
} from "lucide-react";
import {
  evaluateQuoteReadiness,
  QuoteContext,
  QuoteType,
  QuoteReadinessReport
} from "../utils/quoteReadinessValidator";

interface QuoteReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: QuoteContext;
  onProceedWithQuote?: (type: QuoteType) => void;
  onRequestCommercialPricing?: () => void;
}

export function QuoteReadinessModal({
  isOpen,
  onClose,
  context: initialContext,
  onProceedWithQuote,
  onRequestCommercialPricing
}: QuoteReadinessModalProps) {
  const [selectedType, setSelectedType] = useState<QuoteType>(initialContext.quoteType || "firm");
  const [context, setContext] = useState<QuoteContext>(initialContext);

  // Re-sync if prop context changes
  React.useEffect(() => {
    setContext(initialContext);
    if (initialContext.quoteType) setSelectedType(initialContext.quoteType);
  }, [initialContext]);

  const report: QuoteReadinessReport = evaluateQuoteReadiness({
    ...context,
    quoteType: selectedType
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="readiness-modal-title"
        className="bg-surface w-full max-w-2xl rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              report.isReadyForQuoteType ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}>
              {report.isReadyForQuoteType ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="readiness-modal-title" className="text-body font-bold text-ink">
                Pre-Quote Readiness Gate
              </h2>
              <p className="text-spec text-ink-dim">
                Verify engineering constraints and commercial readiness before quoting
              </p>
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

        {/* Content Area */}
        <div className="p-5 space-y-4 overflow-y-auto text-meta text-ink">
          {/* Quote Type Toggle */}
          <div className="p-3 bg-paper border border-line rounded-edge">
            <label className="block text-spec font-bold uppercase text-ink-dim mb-2">
              Quotation Workflow Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["budget", "indicative", "firm"] as QuoteType[]).map((type) => {
                const isSelected = selectedType === type;
                const labels: Record<QuoteType, { title: string; desc: string }> = {
                  budget: { title: "Budget Estimate", desc: "Early project discovery stage" },
                  indicative: { title: "Indicative Quote", desc: "Tender planning & initial BOQ" },
                  firm: { title: "Firm Commercial Quote", desc: "Binding pricing & AS/NZS compliance" }
                };
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-surface border-brand ring-2 ring-brand/20 font-bold shadow-xs"
                        : "bg-surface/50 border-line hover:bg-hover text-ink-dim"
                    }`}
                  >
                    <p className={`text-meta font-bold ${isSelected ? "text-brand-deep" : "text-ink"}`}>
                      {labels[type].title}
                    </p>
                    <p className="text-spec text-ink-dim line-clamp-1">{labels[type].desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overall Status Banner */}
          <div className={`p-4 rounded-edge border flex items-center justify-between ${
            report.isReadyForQuoteType
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-body">
                {report.isReadyForQuoteType ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Ready for {selectedType.toUpperCase()} Quotation</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5 text-red-600" />
                    <span>Not Ready for Firm Quotation ({report.blockers.length} Blocker{report.blockers.length === 1 ? "" : "s"})</span>
                  </>
                )}
              </div>
              <p className="text-spec text-ink-dim">
                {report.isReadyForQuoteType
                  ? "All required critical engineering and commercial fields are confirmed."
                  : "Critical missing information prevents preparation of a firm commercial quote."}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold font-mono text-ink">
                {report.readinessPercentage}%
              </span>
              <p className="text-spec text-ink-dim uppercase font-bold">Readiness</p>
            </div>
          </div>

          {/* Section: Blockers */}
          {report.blockers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-spec font-bold uppercase text-red-700 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                <span>Critical Blockers ({report.blockers.length})</span>
              </h3>
              <div className="space-y-1.5">
                {report.blockers.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-red-50/60 border border-red-200 rounded-edge flex items-start justify-between gap-3 text-meta"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-red-900">{b.label}</p>
                      <p className="text-spec text-red-700">{b.reason}</p>
                    </div>
                    {b.field === "commercialPricingApproved" && onRequestCommercialPricing && (
                      <button
                        onClick={onRequestCommercialPricing}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-spec rounded-edge shrink-0 cursor-pointer shadow-2xs"
                      >
                        Request Pricing
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Warnings */}
          {report.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-spec font-bold uppercase text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Advisory / Non-Blocking Checks ({report.warnings.length})</span>
              </h3>
              <div className="space-y-1.5">
                {report.warnings.map((w) => (
                  <div
                    key={w.id}
                    className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-edge text-meta flex items-start justify-between"
                  >
                    <div>
                      <p className="font-bold text-amber-900">{w.label}</p>
                      <p className="text-spec text-amber-800">{w.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Confirmed Inputs */}
          {report.confirmed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-spec font-bold uppercase text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirmed Inputs ({report.confirmed.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-spec">
                {report.confirmed.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 bg-emerald-50/40 border border-emerald-200/60 rounded-edge flex items-center gap-2 text-emerald-900"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate" title={c.reason}>{c.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-spec text-ink-dim">
            {report.blockers.length > 0 && selectedType === "firm" ? (
              <span className="text-red-700 font-medium">
                Resolve {report.blockers.length} blocker(s) or switch to Budget Estimate to proceed.
              </span>
            ) : (
              <span>Ready to generate {selectedType} quotation package.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-edge text-meta font-medium text-ink-dim hover:bg-hover border border-line cursor-pointer"
            >
              Close Gate
            </button>

            <button
              onClick={() => {
                onProceedWithQuote?.(selectedType);
                onClose();
              }}
              disabled={!report.isReadyForQuoteType}
              className={`px-4 py-2 font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer ${
                report.isReadyForQuoteType
                  ? "bg-brand-deep hover:bg-brand text-white"
                  : "bg-paper text-ink-faint border border-line cursor-not-allowed"
              }`}
            >
              <span>Proceed with {selectedType === "firm" ? "Firm Quote" : "Estimate"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
