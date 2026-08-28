import React from "react";
import { AlertTriangle, Check, ExternalLink, ShieldAlert, X } from "lucide-react";
import { DuplicateConfidence, DuplicateMatchResult } from "../../utils/duplicateDetector";

interface CRMDuplicateWarningModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  entityType: "Account" | "Contact" | "Lead" | "Opportunity";
  candidateName: string;
  matchResult: DuplicateMatchResult<T> | null;
  onOpenExisting: (record: T) => void;
  onUseExisting: (record: T) => void;
  onCreateAnyway: () => void;
}

export function CRMDuplicateWarningModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  entityType,
  candidateName,
  matchResult,
  onOpenExisting,
  onUseExisting,
  onCreateAnyway
}: CRMDuplicateWarningModalProps<T>) {
  if (!isOpen || !matchResult) return null;

  const { confidence, matchReason, existingRecord } = matchResult;

  const confidenceBadgeColor: Record<DuplicateConfidence, string> = {
    EXACT: "bg-red-100 text-red-800 border-red-300",
    "HIGH CONFIDENCE": "bg-amber-100 text-amber-800 border-amber-300",
    POSSIBLE: "bg-blue-100 text-blue-800 border-blue-300",
    NONE: "bg-paper text-ink-muted border-line"
  };

  const existingName =
    existingRecord.name ||
    existingRecord.leadName ||
    existingRecord.project ||
    `${existingRecord.firstName || ""} ${existingRecord.lastName || ""}`.trim() ||
    "Existing Record";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-modal-title"
        className="bg-surface w-full max-w-lg rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 id="duplicate-modal-title" className="text-body font-bold text-ink">
                Possible Duplicate {entityType} Detected
              </h2>
              <p className="text-spec text-ink-dim">Review before creating a duplicate record</p>
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

        {/* Body */}
        <div className="p-5 space-y-4 text-body text-ink">
          {/* Match Reason Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-edge text-meta flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900">Match Confidence:</span>
                <span
                  className={`text-spec px-2 py-0.5 rounded-full font-bold border ${confidenceBadgeColor[confidence]}`}
                >
                  {confidence}
                </span>
              </div>
              <p className="text-amber-800">{matchReason}</p>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-3 text-meta">
            <div className="p-3 bg-paper border border-line rounded-edge">
              <p className="text-spec font-bold uppercase text-ink-dim mb-1">You Are Creating</p>
              <p className="font-bold text-ink truncate" title={candidateName}>
                {candidateName}
              </p>
              <p className="text-spec text-ink-muted">New {entityType}</p>
            </div>

            <div className="p-3 bg-paper border border-line-strong rounded-edge bg-brand/5 border-brand/20">
              <p className="text-spec font-bold uppercase text-brand-deep mb-1">Existing Match</p>
              <p className="font-bold text-ink truncate" title={existingName}>
                {existingName}
              </p>
              <p className="text-spec text-ink-muted">
                {existingRecord.id ? `ID: ${existingRecord.id}` : "Active CRM Record"}
              </p>
            </div>
          </div>

          <p className="text-spec text-ink-dim leading-relaxed">
            To maintain clean CRM data integrity, you can attach to the existing {entityType} or view its full history.
            If this is a genuinely separate entity, you may create it anyway.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <button
            onClick={() => {
              onCreateAnyway();
              onClose();
            }}
            className="px-3 py-2 text-meta text-ink-dim hover:text-ink hover:bg-hover rounded-edge border border-line cursor-pointer font-medium"
          >
            Create Anyway
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenExisting(existingRecord);
                onClose();
              }}
              className="px-3.5 py-2 bg-surface hover:bg-hover text-ink font-bold text-meta rounded-edge border border-line shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-ink-dim" />
              <span>Open Existing</span>
            </button>

            <button
              onClick={() => {
                onUseExisting(existingRecord);
                onClose();
              }}
              className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use Existing {entityType}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
