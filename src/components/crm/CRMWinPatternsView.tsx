import React, { useMemo } from "react";
import { Trophy, TrendingUp, TrendingDown, Info, XCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  computeWinLossPatterns,
  MIN_TOTAL_CLOSED,
  WinLossFinding
} from "../../utils/winLossPatterns";

/**
 * Win patterns (Feature 04)
 *
 * Shows what separates a won quote from a lost one on Plasgain's own history.
 * Every claim carries the counts it was drawn from, and the view says plainly
 * when there is not enough history to claim anything - which is the honest
 * state for a while, and better than a confident number built on four deals.
 */

const FindingCard: React.FC<{ finding: WinLossFinding }> = ({ finding }) => {
  const leading = finding.groupA.winRatePercent >= finding.groupB.winRatePercent
    ? finding.groupA
    : finding.groupB;
  const trailing = leading === finding.groupA ? finding.groupB : finding.groupA;

  return (
    <li className="bg-white border border-line rounded-panel p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-body font-bold text-ink">{finding.headline}</p>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            finding.confidence === "Reasonable"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-amber-50 text-amber-900 border border-amber-200"
          }`}
          title={
            finding.confidence === "Reasonable"
              ? "Both sides of this comparison have a reasonable number of closed quotes behind them."
              : "Both sides clear the minimum, but the smaller side is still thin. Treat as a hint, not a rule."
          }
        >
          {finding.confidence}
        </span>
      </div>

      {/* The two rates side by side, so the claim above can be checked rather
          than taken on trust. */}
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[leading, trailing].map((group, i) => (
          <div key={group.label} className="bg-paper border border-line rounded-edge px-3 py-2">
            <dt className="text-spec text-ink-dim flex items-center gap-1.5">
              {i === 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-ink-faint shrink-0" />
              )}
              <span className="truncate">{group.label}</span>
            </dt>
            <dd className="mt-0.5 font-bold text-ink tabular-nums">
              {group.winRatePercent}%
              <span className="ml-1.5 font-normal text-spec text-ink-dim">
                ({group.wins} of {group.total} won)
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
};

export const CRMWinPatternsView: React.FC = () => {
  const { crmOpportunities, activities, accounts } = useApp();

  const summary = useMemo(
    () => computeWinLossPatterns(crmOpportunities, activities, accounts),
    [crmOpportunities, activities, accounts]
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Win patterns</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            What separates a won quote from a lost one, drawn from your own closed quotes.
          </p>
        </div>
      </div>

      {/* Headline counts. Always honest, even at zero. */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Closed quotes", value: summary.closedDealCount },
          { label: "Won", value: summary.wonCount },
          { label: "Lost", value: summary.lostCount },
          { label: "Win rate", value: `${summary.overallWinRatePercent}%` }
        ].map((tile) => (
          <div key={tile.label} className="bg-white border border-line rounded-panel px-3 py-2.5 shadow-2xs">
            <dt className="text-spec text-ink-dim">{tile.label}</dt>
            <dd className="mt-0.5 text-lg font-bold text-ink tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-start gap-2 bg-paper border border-line rounded-edge px-3 py-2.5">
        <Info className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
        <p className="text-spec text-ink-dim">{summary.dataNote}</p>
      </div>

      <section>
        <h2 className="text-body font-bold text-ink flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-brand-deep" />
          <span>What is making the difference</span>
        </h2>

        {summary.findings.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {summary.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </ul>
        ) : (
          <div className="mt-3 bg-white border border-line rounded-panel p-6 text-center">
            <p className="font-bold text-ink">
              {summary.hasEnoughHistory
                ? "No pattern is clear enough to report yet"
                : "Not enough closed quotes yet"}
            </p>
            <p className="mt-1 text-spec text-ink-dim max-w-lg mx-auto">
              {summary.hasEnoughHistory
                ? "There is enough history overall, but no single split has enough quotes on both sides with a wide enough gap. Keep recording outcomes and this will fill in."
                : `Mark quotes won or lost as they close. Once there are ${MIN_TOTAL_CLOSED}, comparisons appear here.`}
            </p>
          </div>
        )}
      </section>

      {summary.lossReasons.length > 0 && (
        <section>
          <h2 className="text-body font-bold text-ink flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-700" />
            <span>Why quotes were lost</span>
          </h2>
          <ul className="mt-3 divide-y divide-line bg-white border border-line rounded-panel">
            {summary.lossReasons.map((r) => (
              <li key={r.reason} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-body text-ink min-w-0 truncate">{r.reason}</span>
                <span className="shrink-0 text-spec text-ink-dim tabular-nums">
                  {r.count} {r.count === 1 ? "quote" : "quotes"} · {r.sharePercent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
