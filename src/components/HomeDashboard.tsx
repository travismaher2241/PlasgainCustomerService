import React, { useMemo } from "react";
import {
  FilePlus2,
  SearchCode,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KanbanSquare
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Opportunity } from "../types";

export const HomeDashboard: React.FC = () => {
  const {
    navigateToWorkflow,
    navigateToCRM,
    opportunities,
    setSelectedOpportunityId,
    currentUser
  } = useApp();

  const firstName = currentUser.name.trim().split(/\s+/)[0] || "";

  // Helper to format due date readable
  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  };

  // Whole days from today to the quote deadline. Negative means overdue.
  const daysUntilDeadline = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    if (Number.isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  };

  type Urgency = "overdue" | "soon" | "hold" | "clear";

  const urgencyOf = (opp: Opportunity): Urgency => {
    const days = daysUntilDeadline(opp.quoteDeadline);
    if (days !== null && days < 0) return "overdue";
    if (days !== null && days <= 3) return "soon";
    if (opp.stage === "Awaiting Information" || opp.status === "Pending Customer") return "hold";
    return "clear";
  };

  const deadlineLabel = (opp: Opportunity): string | null => {
    const days = daysUntilDeadline(opp.quoteDeadline);
    if (days === null) return null;
    if (days < 0) return `Overdue ${Math.abs(days)}d`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due ${formatDeadline(opp.quoteDeadline)}`;
  };

  const URGENCY_RANK: Record<Urgency, number> = { overdue: 0, soon: 1, hold: 2, clear: 3 };

  const urgencyCounts = useMemo(() => {
    const counts = { overdue: 0, soon: 0, hold: 0 };
    opportunities.forEach((o) => {
      const u = urgencyOf(o);
      if (u === "overdue") counts.overdue += 1;
      else if (u === "soon") counts.soon += 1;
      else if (u === "hold") counts.hold += 1;
    });
    return counts;
  }, [opportunities]);

  const totalNeedingAction = urgencyCounts.overdue + urgencyCounts.soon + urgencyCounts.hold;

  // Radically simplified: Top 3 priority items only
  const topPriorities = useMemo(() => {
    return [...opportunities]
      .sort((a, b) => {
        const rank = URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        if (rank !== 0) return rank;
        const da = daysUntilDeadline(a.quoteDeadline);
        const db = daysUntilDeadline(b.quoteDeadline);
        if (da !== null && db !== null && da !== db) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      })
      .slice(0, 3);
  }, [opportunities]);

  const handleOpenOpportunity = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    navigateToCRM("pipeline", oppId);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* 1. STATUS — Compact, Immediate Confidence */}
      <section>
        {totalNeedingAction === 0 ? (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/90 border border-emerald-200 rounded-edge text-meta">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-emerald-950 text-base inline">
                You&apos;re clear{firstName ? `, ${firstName}` : ""}.
              </h1>
              <span className="text-emerald-800 ml-1.5 hidden xs:inline text-spec">
                Nothing overdue or due soon.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-edge text-meta">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-amber-950 text-base inline">
                {totalNeedingAction} item{totalNeedingAction === 1 ? "" : "s"} need attention
              </h1>
              <span className="text-amber-800 ml-2 text-spec">
                {urgencyCounts.overdue > 0 ? `${urgencyCounts.overdue} overdue · ` : ""}
                {urgencyCounts.soon > 0 ? `${urgencyCounts.soon} due soon · ` : ""}
                {urgencyCounts.hold > 0 ? `${urgencyCounts.hold} with customer` : ""}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2. PRIORITY WORK — Top 3 Compact Items Only */}
      <section aria-labelledby="priorities-heading" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 id="priorities-heading" className="text-base sm:text-lead font-bold text-ink tracking-tight">
              Your priorities
            </h2>
            <span className="text-spec text-ink-dim font-medium">
              · Top {topPriorities.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigateToCRM("today")}
            className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View all priorities in CRM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topPriorities.length > 0 ? (
          <div className="space-y-2">
            {topPriorities.map((opp, idx) => {
              const urgency = urgencyOf(opp);
              const label = deadlineLabel(opp);

              return (
                <div
                  key={opp.id}
                  onClick={() => handleOpenOpportunity(opp.id)}
                  className="p-3.5 sm:p-4 bg-white rounded-panel border border-line hover:border-brand-edge hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    {/* Top Row: Opportunity Name & Value */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-body text-ink group-hover:text-brand-deep transition-colors line-clamp-1">
                          {idx + 1}. {opp.project}
                        </h3>
                        {(opp.id.startsWith("opp-sample") || opp.id.startsWith("mock") || (opp as any).isSample) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Sample Demo
                          </span>
                        )}
                      </div>
                      {opp.estimatedValue > 0 && (
                        <span className="text-spec font-bold text-ink-dim shrink-0">
                          ${opp.estimatedValue >= 1000000 ? `${(opp.estimatedValue / 1000000).toFixed(1)}m` : opp.estimatedValue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Account & Deadline */}
                    <div className="text-spec text-ink-dim flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{opp.customerCompany}</span>
                      <span className="text-ink-faint">·</span>
                      {label ? (
                        <span
                          className={
                            urgency === "overdue"
                              ? "text-urgent font-bold"
                              : urgency === "soon"
                              ? "text-soon font-bold"
                              : "text-ink-dim"
                          }
                        >
                          {label}
                        </span>
                      ) : (
                        <span>{opp.stage}</span>
                      )}
                    </div>

                    {/* Short Next Action */}
                    {opp.nextAction && (
                      <p className="text-spec text-ink-dim line-clamp-1 pt-0.5">
                        <span className="font-medium text-ink">Next: </span>
                        {opp.nextAction}
                      </p>
                    )}
                  </div>

                  {/* Single Primary Action */}
                  <div className="flex items-center justify-end sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOpportunity(opp.id);
                      }}
                      className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-edge text-spec font-bold text-white bg-brand-deep hover:bg-brand transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs w-full sm:w-auto justify-center"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-white rounded-panel border border-line text-center">
            <CheckCircle2 className="w-5 h-5 text-brand-deep mx-auto mb-2" />
            <h3 className="text-body font-bold text-ink">No urgent priorities</h3>
            <p className="text-spec text-ink-dim mt-0.5">All customer quotes and tasks are up to date.</p>
          </div>
        )}
      </section>

      {/* 3. QUICK ACCESS — Small, Concise Shortcuts */}
      <section aria-labelledby="quick-access-heading" className="space-y-2 pt-2 border-t border-line">
        <h2 id="quick-access-heading" className="text-spec font-bold uppercase tracking-wider text-ink-dim">
          Quick Access
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer shadow-2xs flex items-center gap-2.5 min-h-[48px]"
          >
            <div className="p-1.5 rounded-edge bg-brand-wash text-brand-deep shrink-0">
              <FilePlus2 className="w-4 h-4" />
            </div>
            <span className="text-spec font-bold text-ink truncate">New Enquiry</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToCRM("today")}
            className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer shadow-2xs flex items-center gap-2.5 min-h-[48px]"
          >
            <div className="p-1.5 rounded-edge bg-paper text-ink-dim shrink-0">
              <KanbanSquare className="w-4 h-4" />
            </div>
            <span className="text-spec font-bold text-ink truncate">CRM Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToWorkflow("product-finder")}
            className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer shadow-2xs flex items-center gap-2.5 min-h-[48px]"
          >
            <div className="p-1.5 rounded-edge bg-hold-wash text-hold shrink-0">
              <SearchCode className="w-4 h-4" />
            </div>
            <span className="text-spec font-bold text-ink truncate">Product Finder</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToWorkflow("documents")}
            className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer shadow-2xs flex items-center gap-2.5 min-h-[48px]"
          >
            <div className="p-1.5 rounded-edge bg-paper text-ink-dim shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-spec font-bold text-ink truncate">Catalogues</span>
          </button>
        </div>
      </section>
    </div>
  );
};
