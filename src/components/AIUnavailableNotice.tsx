import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface AIUnavailableNoticeProps {
  detail: string;
  guidance?: string;
  onRetry?: () => void;
}

/**
 * Shown wherever an AI-backed panel would otherwise have rendered a result.
 *
 * Deliberately blunt: a rep must not mistake an empty or stale panel for a real,
 * grounded analysis, because the output of these screens goes to customers.
 */
export const AIUnavailableNotice: React.FC<AIUnavailableNoticeProps> = ({
  detail,
  guidance,
  onRetry
}) => (
  <div
    role="alert"
    className="rounded-xl border-2 border-soon bg-soon-wash p-5 flex gap-3.5 items-start"
  >
    <AlertTriangle className="w-5 h-5 text-soon shrink-0 mt-0.5" aria-hidden="true" />
    <div className="space-y-2 min-w-0">
      <div className="text-sm font-bold text-soon">
        AI unavailable — no analysis was generated
      </div>
      <p className="text-xs text-soon/90 leading-relaxed">{detail}</p>
      {guidance && (
        <p className="text-xs font-semibold text-soon leading-relaxed">{guidance}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-soon hover:text-soon underline underline-offset-2"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  </div>
);
