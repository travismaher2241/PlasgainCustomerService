import React, { useMemo } from "react";
import {
  FilePlus2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KanbanSquare,
  Building2,
  PhoneCall,
  Clock,
  Plus
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { CRMOpportunity } from "../types/crm";

export const HomeDashboard: React.FC = () => {
  const {
    navigateToWorkflow,
    navigateToCRM,
    crmOpportunities,
    accounts,
    tasks,
    openQuickLog,
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

  const urgencyOf = (opp: CRMOpportunity): Urgency => {
    const days = daysUntilDeadline(opp.expectedCloseDate || opp.nextActionDate);
    if (days !== null && days < 0) return "overdue";
    if (days !== null && days <= 3) return "soon";
    if (opp.dealHealth === "At Risk" || opp.stageName?.toLowerCase().includes("hold")) return "hold";
    return "clear";
  };

  const deadlineLabel = (opp: CRMOpportunity): string | null => {
    const days = daysUntilDeadline(opp.nextActionDate || opp.expectedCloseDate);
    if (days === null) return null;
    if (days < 0) return `Overdue ${Math.abs(days)}d`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due ${formatDeadline(opp.nextActionDate || opp.expectedCloseDate)}`;
  };

  const URGENCY_RANK: Record<Urgency, number> = { overdue: 0, soon: 1, hold: 2, clear: 3 };

  const urgencyCounts = useMemo(() => {
    const counts = { overdue: 0, soon: 0, hold: 0 };
    crmOpportunities.forEach((o) => {
      const u = urgencyOf(o);
      if (u === "overdue") counts.overdue += 1;
      else if (u === "soon") counts.soon += 1;
      else if (u === "hold") counts.hold += 1;
    });
    return counts;
  }, [crmOpportunities]);

  const totalNeedingAction = urgencyCounts.overdue + urgencyCounts.soon + urgencyCounts.hold;

  // Active / priority items needing attention (max 3)
  const priorityDeals = useMemo(() => {
    return [...crmOpportunities]
      .sort((a, b) => {
        const rank = URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        if (rank !== 0) return rank;
        const da = daysUntilDeadline(a.nextActionDate || a.expectedCloseDate);
        const db = daysUntilDeadline(b.nextActionDate || b.expectedCloseDate);
        if (da !== null && db !== null && da !== db) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;
        return (b.dealValue || 0) - (a.dealValue || 0);
      })
      .slice(0, 3);
  }, [crmOpportunities]);

  const handleOpenDeal = (dealId: string) => {
    navigateToCRM("pipeline", dealId);
  };

  const hasAnyData = crmOpportunities.length > 0 || accounts.length > 0 || tasks.length > 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12 w-full min-w-0">
      {/* 1. COMPACT HOME HEADER (PART H) */}
      <div className="bg-white p-4 rounded-panel border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-body">
            {firstName ? `Welcome, ${firstName}` : "Welcome to Plasgain"}
          </h1>
          <p className="text-spec text-ink-dim mt-0.5">
            {!hasAnyData
              ? "No sales activity has been logged yet."
              : totalNeedingAction === 0
              ? "Everything is up to date across your accounts and deals."
              : `${totalNeedingAction} item${totalNeedingAction === 1 ? "" : "s"} need attention today.`}
          </p>
        </div>

        {hasAnyData && totalNeedingAction > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-edge bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 self-start sm:self-auto shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>
              {urgencyCounts.overdue > 0 ? `${urgencyCounts.overdue} overdue` : ""}
              {urgencyCounts.overdue > 0 && urgencyCounts.soon > 0 ? " · " : ""}
              {urgencyCounts.soon > 0 ? `${urgencyCounts.soon} due soon` : ""}
              {(urgencyCounts.overdue > 0 || urgencyCounts.soon > 0) && urgencyCounts.hold > 0 ? " · " : ""}
              {urgencyCounts.hold > 0 ? `${urgencyCounts.hold} review` : ""}
            </span>
          </div>
        ) : hasAnyData ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-edge bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 self-start sm:self-auto shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All tasks clear</span>
          </div>
        ) : null}
      </div>

      {/* 2. COMPACT CREATION ACTIONS ROW (PART H: REPLACES DUPLICATIVE NAVIGATION) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => navigateToWorkflow("new-enquiry")}
          className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand-deep transition-all cursor-pointer shadow-2xs flex items-center gap-2.5"
        >
          <div className="p-1.5 rounded bg-brand-wash text-brand-deep shrink-0">
            <FilePlus2 className="w-4 h-4" />
          </div>
          <span className="text-spec font-bold text-body truncate">New enquiry</span>
        </button>

        <button
          type="button"
          onClick={() => navigateToCRM("accounts")}
          className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand-deep transition-all cursor-pointer shadow-2xs flex items-center gap-2.5"
        >
          <div className="p-1.5 rounded bg-paper text-ink-dim shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-spec font-bold text-body truncate">Add account</span>
        </button>

        <button
          type="button"
          onClick={() => navigateToCRM("pipeline")}
          className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand-deep transition-all cursor-pointer shadow-2xs flex items-center gap-2.5"
        >
          <div className="p-1.5 rounded bg-paper text-ink-dim shrink-0">
            <KanbanSquare className="w-4 h-4" />
          </div>
          <span className="text-spec font-bold text-body truncate">New quote</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickLog("call")}
          className="p-3 rounded-edge bg-white hover:bg-raised border border-line hover:border-brand-deep transition-all cursor-pointer shadow-2xs flex items-center gap-2.5"
        >
          <div className="p-1.5 rounded bg-paper text-ink-dim shrink-0">
            <PhoneCall className="w-4 h-4" />
          </div>
          <span className="text-spec font-bold text-body truncate">Quick Log</span>
        </button>
      </div>

      {/* 3. RESUMABLE WORK & PRIORITIES (PART H: STATE A VS STATE B) */}
      {!hasAnyData ? (
        /* STATE A: NO CRM DATA */
        <div className="bg-white rounded-panel border border-line p-8 text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center mx-auto text-ink-dim">
            <KanbanSquare className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-body">No sales records yet</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            Start by analyzing a customer enquiry or adding your first customer account to begin building quotes and tracking projects.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => navigateToWorkflow("new-enquiry")}
              className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Analyze an Enquiry</span>
            </button>
          </div>
        </div>
      ) : priorityDeals.length > 0 ? (
        /* ACTIVE PRIORITIES */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-body">
              Items needing attention
            </h2>
            <button
              type="button"
              onClick={() => navigateToCRM("today")}
              className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all in Today queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {priorityDeals.map((deal) => {
              const urgency = urgencyOf(deal);
              const label = deadlineLabel(deal);

              return (
                <div
                  key={deal.id}
                  onClick={() => handleOpenDeal(deal.id)}
                  className="p-4 bg-white rounded-panel border border-line hover:border-brand-edge transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-bold text-body group-hover:text-brand-deep transition-colors line-clamp-1">
                        {deal.name}
                      </h3>
                      {deal.dealValue > 0 && (
                        <span className="text-spec font-bold font-mono text-body shrink-0">
                          ${deal.dealValue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="text-spec text-ink-dim flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-body">{deal.accountName}</span>
                      <span>·</span>
                      <span>{deal.stageName}</span>
                      {label && (
                        <>
                          <span>·</span>
                          <span
                            className={
                              urgency === "overdue"
                                ? "text-red-700 font-bold"
                                : urgency === "soon"
                                ? "text-amber-800 font-bold"
                                : "text-ink-dim"
                            }
                          >
                            {label}
                          </span>
                        </>
                      )}
                    </div>

                    {deal.nextAction && (
                      <p className="text-xs text-ink-dim line-clamp-1 pt-0.5">
                        <span className="font-medium text-body">Next: </span>
                        {deal.nextAction}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeal(deal.id);
                      }}
                      className="px-3.5 py-1.5 rounded-edge text-spec font-bold text-white bg-brand-deep hover:bg-brand transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* STATE B: EVERYTHING IS UP TO DATE */
        <div className="bg-white rounded-panel border border-line p-6 text-center space-y-2 shadow-2xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-body">Everything is up to date</h2>
          <p className="text-spec text-ink-dim">
            No overdue tasks, quotes, or items requiring attention right now.
          </p>
        </div>
      )}
    </div>
  );
};
