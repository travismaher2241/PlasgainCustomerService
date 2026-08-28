import React, { useState, useMemo } from "react";
import {
  FilePlus2,
  SearchCode,
  BookOpen,
  FileText,
  PhoneCall,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  Mail,
  KanbanSquare,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Surface, ListRow, Chip, Tone } from "./ui/Surface";
import { Opportunity } from "../types";
import { isDueWithinBusinessDays } from "../utils/dateUtils";

export type UserRole = "customer_service" | "sales" | "sales_manager" | "technical";

const SECONDARY_BTN =
  "min-h-[44px] px-3 py-2 sm:min-h-0 sm:px-2.5 sm:py-1.5 rounded-edge text-meta font-medium text-ink-dim border border-line-strong hover:text-ink hover:border-ink-faint transition-colors cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap flex";

export const HomeDashboard: React.FC = () => {
  const {
    navigateToWorkflow,
    navigateToCRM,
    opportunities,
    setSelectedOpportunityId,
    openQuickLog,
    currentUser
  } = useApp();

  const firstName = currentUser.name.trim().split(/\s+/)[0] || "";

  const [selectedRole, setSelectedRole] = useState<UserRole>("customer_service");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);

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

  // Plain English deadline label
  const deadlineLabel = (opp: Opportunity): string | null => {
    const days = daysUntilDeadline(opp.quoteDeadline);
    if (days === null) return null;
    if (days < 0) return `Overdue ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
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

  const exampleFor = (u: Urgency): Opportunity | undefined =>
    opportunities.find((o) => urgencyOf(o) === u);

  const totalNeedingAction = urgencyCounts.overdue + urgencyCounts.soon + urgencyCounts.hold;

  const situation = (): string => {
    if (totalNeedingAction === 0) return "Nothing is overdue and no quote deadline falls inside three days.";
    if (urgencyCounts.overdue > 0) {
      const n = urgencyCounts.overdue;
      return `${n} quote${n === 1 ? " is" : "s are"} already overdue. Sorted by deadline, then by blockers.`;
    }
    return "Sorted by deadline, then by quote stage.";
  };

  const TONE: Record<Urgency, Tone> = {
    overdue: "urgent",
    soon: "soon",
    hold: "hold",
    clear: "neutral"
  };

  // Pending Quotes KPI calculated using real 5-business-day deadlines
  const pendingQuotesDue5BusinessDays = useMemo(() => {
    return opportunities.filter(
      (opp) =>
        (opp.stage === "Quoting" || opp.stage === "Qualifying" || opp.stage === "Technical Review") &&
        opp.quoteDeadline &&
        isDueWithinBusinessDays(opp.quoteDeadline, 5)
    );
  }, [opportunities]);

  // Role-specific prioritisation explanation helper
  const getPrioritisationExplanation = (opp: Opportunity, role: UserRole): string => {
    const days = daysUntilDeadline(opp.quoteDeadline);
    const valueStr = opp.estimatedValue > 0 ? `$${opp.estimatedValue.toLocaleString()}` : "";

    switch (role) {
      case "sales":
        if (days !== null && days < 0) return `Quote overdue by ${Math.abs(days)} day(s) — commercial urgency (${valueStr})`;
        if (days !== null && days <= 5) return `Quote due in ${days} business day(s) — priority tender pricing (${valueStr})`;
        return `Active commercial opportunity — value ${valueStr || "standard"}`;

      case "technical":
        if (opp.stage === "Technical Review") return `Engineering review active — AS/NZS 1158 Dialux calculation required`;
        if (opp.productsConsidered && opp.productsConsidered.length > 0) return `Technical scope: ${opp.productsConsidered.length} luminaire / pole specifications`;
        return `Engineering compliance & photometric verification`;

      case "sales_manager":
        return `High-value portfolio tender (${valueStr || "$0"}) at stage "${opp.stage}"`;

      case "customer_service":
      default:
        if (opp.stage === "New Enquiry") return `Inbound enquiry — response SLA target < 4 business hours`;
        if (opp.stage === "Awaiting Information") return `Awaiting customer drawing package / soil parameters`;
        return `Customer follow-up & communication cadence`;
    }
  };

  const attentionMetrics = useMemo(() => {
    const quoteDueSoon = pendingQuotesDue5BusinessDays;
    const techReview = opportunities.filter((o) => o.stage === "Technical Review");
    const waitingCustomer = opportunities.filter(
      (o) => o.stage === "Awaiting Information" || o.status === "Pending Customer"
    );
    const newEnquiries = opportunities.filter((o) => o.stage === "New Enquiry");
    const followUpOverdue = opportunities.filter((o) => o.stage === "Follow-Up");

    return {
      quoteDueSoon,
      techReview,
      waitingCustomer,
      newEnquiries,
      followUpOverdue,
      totalUrgent:
        quoteDueSoon.length +
        techReview.length +
        waitingCustomer.length +
        newEnquiries.length +
        followUpOverdue.length
    };
  }, [opportunities, pendingQuotesDue5BusinessDays]);

  // Priority item scoring & filtering based on role and selected attention filter
  const priorityItems = useMemo(() => {
    let list = [...opportunities];

    if (selectedCategoryFilter === "overdue" || selectedCategoryFilter === "soon" || selectedCategoryFilter === "hold") {
      list = list.filter((o) => urgencyOf(o) === selectedCategoryFilter);
    }

    const roleTiebreak = (a: Opportunity, b: Opportunity): number => {
      if (selectedRole === "sales_manager") {
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      }
      if (selectedRole === "technical") {
        const t = (o: Opportunity) => (o.stage === "Technical Review" ? 0 : 1);
        return t(a) - t(b);
      }
      if (selectedRole === "customer_service") {
        const w = (o: Opportunity) => {
          if (o.stage === "New Enquiry") return 0;
          if (o.stage === "Awaiting Information") return 1;
          if (o.stage === "Follow-Up") return 2;
          return 3;
        };
        return w(a) - w(b);
      }
      return 0;
    };

    return list
      .sort((a, b) => {
        if (selectedCategoryFilter) {
          const rank = URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
          if (rank !== 0) return rank;
          const da = daysUntilDeadline(a.quoteDeadline);
          const db = daysUntilDeadline(b.quoteDeadline);
          if (da !== null && db !== null && da !== db) return da - db;
          return roleTiebreak(a, b);
        }

        if (selectedRole === "sales_manager") {
          const valueDiff = (b.estimatedValue || 0) - (a.estimatedValue || 0);
          if (valueDiff !== 0) return valueDiff;
          return URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        }

        if (selectedRole === "technical") {
          const tRank = (o: Opportunity) => (o.stage === "Technical Review" ? 0 : o.productsConsidered?.length ? 1 : 2);
          const diff = tRank(a) - tRank(b);
          if (diff !== 0) return diff;
          return URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        }

        if (selectedRole === "customer_service") {
          const csRank = (o: Opportunity) => {
            if (o.stage === "New Enquiry") return 0;
            if (o.stage === "Awaiting Information" || o.status === "Pending Customer") return 1;
            if (o.stage === "Follow-Up") return 2;
            return 3;
          };
          const diff = csRank(a) - csRank(b);
          if (diff !== 0) return diff;
          return URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        }

        const rank = URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        if (rank !== 0) return rank;
        const da = daysUntilDeadline(a.quoteDeadline);
        const db = daysUntilDeadline(b.quoteDeadline);
        if (da !== null && db !== null && da !== db) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      })
      .slice(0, 5);
  }, [opportunities, selectedCategoryFilter, selectedRole]);

  const toggleCategoryFilter = (filterKey: string) => {
    setSelectedCategoryFilter((prev) => (prev === filterKey ? null : filterKey));
  };

  const handleOpenOpportunity = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    navigateToCRM("pipeline", oppId);
  };

  const handlePrepCall = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    openQuickLog("call", undefined, oppId);
  };

  const handleReviewQuote = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    navigateToWorkflow("tools", "quote-review", oppId);
  };

  const handleFollowUp = (opp: Opportunity) => {
    setSelectedOpportunityId(opp.id);
    openQuickLog("follow_up", undefined, opp.id);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER & COMPACT STATUS BANNER */}
      <section className="space-y-3 pb-3 border-b border-line">
        {/* Status Strip: Compact on zero-state */}
        {totalNeedingAction === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-edge text-meta">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-emerald-950 text-base sm:text-lead inline">
                You&apos;re clear{firstName ? `, ${firstName}` : ""}.
              </h1>
              <span className="text-emerald-800 ml-1.5 hidden xs:inline">
                Nothing overdue or due soon.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h1 className="text-xl sm:text-head font-bold text-ink tracking-tight">
              {totalNeedingAction} item{totalNeedingAction === 1 ? "" : "s"} need you today
            </h1>
            <p className="text-spec text-ink-dim">{situation()}</p>
          </div>
        )}

        {/* Responsive Role / Department View Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
          {/* Mobile Dropdown Selector (< 640px) */}
          <div className="flex sm:hidden items-center gap-2 w-full">
            <span className="text-spec font-bold uppercase text-ink-dim shrink-0">View:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              aria-label="Select department view"
              className="text-spec font-bold text-ink bg-white border border-line rounded-edge px-3 py-2 focus:outline-none focus:border-brand-deep cursor-pointer flex-1 min-h-[44px]"
            >
              <option value="customer_service">Customer Service</option>
              <option value="sales">Sales</option>
              <option value="technical">Technical</option>
              <option value="sales_manager">Management</option>
            </select>
          </div>

          {/* Desktop Segmented Buttons (>= 640px) */}
          <div className="hidden sm:flex shrink-0 border border-line rounded-edge overflow-hidden bg-raised p-0.5" role="group" aria-label="Department view tabs">
            {([
              ["customer_service", "Customer Service"],
              ["sales", "Sales"],
              ["technical", "Technical"],
              ["sales_manager", "Manager"]
            ] as [UserRole, string][]).map(([role, label]) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                aria-pressed={selectedRole === role}
                className={`px-3 py-1.5 text-spec font-bold rounded cursor-pointer transition-all ${
                  selectedRole === role
                    ? "bg-white text-body shadow-xs text-brand-deep"
                    : "text-ink-dim hover:text-ink bg-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active Category Filter Chips (if problems exist) */}
          {totalNeedingAction > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {urgencyCounts.overdue > 0 && (
                <button
                  type="button"
                  onClick={() => toggleCategoryFilter("overdue")}
                  className={`px-2.5 py-1 rounded-full text-spec font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === "overdue"
                      ? "bg-urgent text-white"
                      : "bg-urgent-wash text-urgent hover:bg-urgent hover:text-white"
                  }`}
                >
                  🔴 {urgencyCounts.overdue} Overdue
                </button>
              )}

              {urgencyCounts.soon > 0 && (
                <button
                  type="button"
                  onClick={() => toggleCategoryFilter("soon")}
                  className={`px-2.5 py-1 rounded-full text-spec font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === "soon"
                      ? "bg-soon text-white"
                      : "bg-soon-wash text-soon hover:bg-soon hover:text-white"
                  }`}
                >
                  🟠 {urgencyCounts.soon} Due soon
                </button>
              )}

              {urgencyCounts.hold > 0 && (
                <button
                  type="button"
                  onClick={() => toggleCategoryFilter("hold")}
                  className={`px-2.5 py-1 rounded-full text-spec font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === "hold"
                      ? "bg-hold text-white"
                      : "bg-hold-wash text-hold hover:bg-hold hover:text-white"
                  }`}
                >
                  🟣 {urgencyCounts.hold} With customer
                </button>
              )}

              {selectedCategoryFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="px-2 py-0.5 text-[11px] font-bold text-ink-dim hover:text-ink underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. PRIORITY QUEUE — Moved High Up for Immediate Focus */}
      <section aria-labelledby="queue-heading" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 id="queue-heading" className="text-base sm:text-lead font-bold text-ink">
              Priority queue
            </h2>
            <span className="text-spec font-bold text-ink-dim">
              ({priorityItems.length} {priorityItems.length === 1 ? "record" : "records"})
            </span>
          </div>

          <button
            onClick={() => navigateToCRM("pipeline")}
            className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer shrink-0 min-h-[44px] sm:min-h-0 py-2 sm:py-0"
          >
            <span>View all deals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityItems.length > 0 ? (
          <Surface className="divide-y divide-line overflow-hidden rounded-panel border border-line">
            {priorityItems.map((opp) => {
              const urgency = urgencyOf(opp);
              const label = deadlineLabel(opp);
              const canReview = opp.stage === "Quoting" || opp.stage === "Qualifying";

              return (
                <ListRow
                  key={opp.id}
                  tone={TONE[urgency]}
                  actions={
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60 justify-end">
                      <button
                        onClick={() => handlePrepCall(opp.id)}
                        className={SECONDARY_BTN}
                        title="Prepare AI call script & questions"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Prep call</span>
                      </button>

                      {canReview ? (
                        <button
                          onClick={() => handleReviewQuote(opp.id)}
                          className={SECONDARY_BTN}
                          title="Review quote parameters against specs"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollowUp(opp)}
                          className={SECONDARY_BTN}
                          title="Log or schedule follow-up"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Follow-up</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenOpportunity(opp.id)}
                        className="min-h-[44px] px-4 py-2 sm:min-h-0 sm:px-3 sm:py-1.5 rounded-edge text-meta font-bold text-white bg-brand-deep border border-brand-deep hover:bg-brand hover:border-brand transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                      >
                        Open
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-1.5 min-w-0">
                    {/* Top Row: Opportunity Name & Value */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-body font-bold text-ink line-clamp-2 leading-snug">
                        {opp.project}
                      </h3>
                      {opp.estimatedValue > 0 && (
                        <span className="text-body font-bold text-brand-deep shrink-0">
                          ${opp.estimatedValue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Sub Row: Customer Company & Contact */}
                    <p className="text-spec text-ink-dim flex flex-wrap items-center gap-x-1.5">
                      <span className="font-semibold text-ink">{opp.customerCompany}</span>
                      {opp.contactName && (
                        <>
                          <span className="text-ink-faint">·</span>
                          <span>{opp.contactName}</span>
                        </>
                      )}
                      {opp.location && (
                        <>
                          <span className="text-ink-faint">·</span>
                          <span>{opp.location}</span>
                        </>
                      )}
                    </p>

                    {/* Status & Deadline Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <Chip>{opp.stage}</Chip>
                      {label && <Chip tone={TONE[urgency]}>{label}</Chip>}
                    </div>

                    {/* Next Action */}
                    {opp.nextAction && (
                      <p className="mt-1.5 pl-2.5 border-l-2 border-brand-edge text-spec text-ink-dim">
                        <span className="font-bold text-ink">Next: </span>
                        {opp.nextAction}
                      </p>
                    )}

                    {/* Prioritisation Reason */}
                    <div className="mt-1.5 text-[11px] px-2 py-0.5 rounded bg-raised border border-line text-ink-dim flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-body">Why this matters:</span>
                      <span>{getPrioritisationExplanation(opp, selectedRole)}</span>
                    </div>
                  </div>
                </ListRow>
              );
            })}
          </Surface>
        ) : (
          <Surface className="px-4 py-6 text-center rounded-panel border border-line">
            <CheckCircle2 className="w-5 h-5 text-brand-deep mx-auto mb-2" />
            <h3 className="text-body font-bold">Nothing waiting on you</h3>
            <p className="mt-0.5 text-spec text-ink-dim max-w-md mx-auto">
              {selectedCategoryFilter
                ? "No records in this bucket. Clear filter to see all items."
                : "No quote deadline falls inside three days and nothing is overdue."}
            </p>
            {selectedCategoryFilter && (
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className="mt-2.5 text-spec text-brand-deep font-bold hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </Surface>
        )}
      </section>

      {/* 3. COMPACT QUICK ACTIONS ROW */}
      <section aria-labelledby="quick-actions-heading" className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h2
            id="quick-actions-heading"
            className="text-spec font-bold uppercase tracking-wider text-ink-dim"
          >
            Quick Actions
          </h2>
          <span className="text-[11px] text-ink-faint font-medium">Common operational workflows</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {/* Action 1: New Enquiry */}
          <button
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-brand-wash text-brand-deep group-hover:scale-105 transition-transform">
                <FilePlus2 className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-spec font-bold group-hover:text-brand-deep">New Enquiry</div>
              <div className="text-[11px] text-ink-dim truncate">Analyse customer specifications</div>
            </div>
          </button>

          {/* Action 2: Find Product */}
          <button
            onClick={() => navigateToWorkflow("product-finder")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-hold-wash text-hold group-hover:scale-105 transition-transform">
                <SearchCode className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-spec font-bold group-hover:text-brand-deep">Find Product</div>
              <div className="text-[11px] text-ink-dim truncate">Match solar &amp; commercial luminaires</div>
            </div>
          </button>

          {/* Action 3: Analyse Tender */}
          <button
            onClick={() => navigateToWorkflow("tools", "tender-analyser")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-hold-wash text-hold group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-spec font-bold group-hover:text-brand-deep">Analyse Tender</div>
              <div className="text-[11px] text-ink-dim truncate">Extract council RFQ standards</div>
            </div>
          </button>

          {/* Action 4: Solar Sizing */}
          <button
            onClick={() => navigateToWorkflow("tools", "solar-autonomy")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-soon-wash text-soon group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-spec font-bold group-hover:text-brand-deep">Solar Sizing</div>
              <div className="text-[11px] text-ink-dim truncate">Battery autonomy &amp; PV calculator</div>
            </div>
          </button>

          {/* Action 5: More Tools Dropdown Trigger */}
          <div className="relative col-span-2 sm:col-span-4 lg:col-span-1">
            <button
              onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
              className="w-full h-full p-3 rounded-panel bg-raised hover:bg-paper border border-line hover:border-line-strong text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-edge bg-line text-body group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-ink-dim transition-transform duration-200 ${
                    isMoreToolsOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              <div className="mt-1">
                <div className="text-spec font-bold">More Tools</div>
                <div className="text-[11px] text-ink-dim truncate">Calculators, Catalogues, CRM...</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMoreToolsOpen && (
              <div className="absolute right-0 bottom-full lg:bottom-auto lg:top-full mb-1 lg:mb-0 lg:mt-1 z-30 w-64 bg-white rounded-panel shadow-lg border border-line py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "wind-pole-sizing");
                  }}
                  className="w-full px-3.5 py-2 text-left text-spec font-medium hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-ink-faint" />
                  <span>Wind Region &amp; Pole Sizing</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "cable-cover-calc");
                  }}
                  className="w-full px-3.5 py-2 text-left text-spec font-medium hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-ink-faint" />
                  <span>Polymeric Cable Cover Calc</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("documents");
                  }}
                  className="w-full px-3.5 py-2 text-left text-spec font-medium hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer border-t border-line"
                >
                  <BookOpen className="w-3.5 h-3.5 text-ink-faint" />
                  <span>Product Catalogues &amp; PDFs</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToCRM("today");
                  }}
                  className="w-full px-3.5 py-2 text-left text-spec font-medium hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <KanbanSquare className="w-3.5 h-3.5 text-ink-faint" />
                  <span>CRM Command Centre</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. WORKLOAD & PIPELINE OVERVIEW */}
      <section aria-labelledby="pipeline-overview-heading" className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h2
            id="pipeline-overview-heading"
            className="text-spec font-bold uppercase tracking-wider text-ink-dim"
          >
            Pipeline Overview
          </h2>
          <button
            onClick={() => navigateToCRM("pipeline")}
            className="text-spec font-bold text-brand-deep hover:underline cursor-pointer"
          >
            Open Full CRM &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={() => navigateToCRM("pipeline")}
            className="bg-white p-3 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer shadow-2xs"
          >
            <div className="text-[11px] font-bold text-ink-dim uppercase">Active Deals</div>
            <div className="text-lg font-black text-body mt-0.5">{opportunities.length}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">Across all stages</div>
          </div>

          <div
            onClick={() => navigateToCRM("pipeline")}
            className="bg-white p-3 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer shadow-2xs"
          >
            <div className="text-[11px] font-bold text-ink-dim uppercase">Tech Review</div>
            <div className="text-lg font-black text-hold mt-0.5">
              {attentionMetrics.techReview.length}
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">Dialux / Photometrics</div>
          </div>

          <div
            onClick={() => navigateToCRM("pipeline")}
            className="bg-white p-3 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer shadow-2xs"
          >
            <div className="text-[11px] font-bold text-ink-dim uppercase">Pending Quotes</div>
            <div className="text-lg font-black text-urgent mt-0.5">
              {attentionMetrics.quoteDueSoon.length}
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">Due in 5 business days</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("crm")}
            className="bg-white p-3 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer shadow-2xs"
          >
            <div className="text-[11px] font-bold text-ink-dim uppercase">Standards Check</div>
            <div className="text-lg font-black text-brand-deep mt-0.5 flex items-center gap-1">
              <span>98%</span>
              <span className="text-spec font-bold text-brand-deep">Healthy</span>
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">AS/NZS 1158 Verified</div>
          </div>
        </div>
      </section>
    </div>
  );
};
