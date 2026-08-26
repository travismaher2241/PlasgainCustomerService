import React, { useState, useMemo } from "react";
import {
  FilePlus2,
  SearchCode,
  BookOpen,
  FileText,
  PhoneCall,
  ClipboardCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  Building,
  Calendar,
  ChevronDown,
  Mail,
  Scale,
  KanbanSquare,
  ShieldCheck,
  TrendingUp,
  Filter,
  Check,
  UserCheck,
  Briefcase
} from "lucide-react";
import { useApp, ToolSubTab } from "../context/AppContext";
import { Opportunity } from "../types";

export type UserRole = "customer_service" | "sales" | "sales_manager" | "technical";

export const HomeDashboard: React.FC = () => {
  const {
    navigateToWorkflow,
    navigateToCRM,
    opportunities,
    setSelectedOpportunityId,
    openQuickLog,
    showToast
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>("customer_service");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Category counts based on actual opportunities data
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

  // --- Urgency -------------------------------------------------------------
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

  // Plain English, because "Due 25 Aug" hides that 25 Aug has already passed.
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

  // One example per bucket, so each cell can say which record it means.
  const exampleFor = (u: Urgency): Opportunity | undefined =>
    opportunities.find((o) => urgencyOf(o) === u);

  const totalNeedingAction = urgencyCounts.overdue + urgencyCounts.soon + urgencyCounts.hold;

  const situation = (): string => {
    if (totalNeedingAction === 0) return "Nothing is overdue and no quote deadline falls inside three days.";
    if (urgencyCounts.overdue > 0) {
      const n = urgencyCounts.overdue;
      return `${n} quote${n === 1 ? " is" : "s are"} already overdue. Sorted by deadline, then by what is blocking the quote.`;
    }
    return "Sorted by deadline, then by what is blocking the quote.";
  };

  const STRIPE: Record<Urgency, string> = {
    overdue: "bg-urgent",
    soon: "bg-soon",
    hold: "bg-hold",
    clear: "bg-line-strong"
  };

  const CHIP: Record<Urgency, string> = {
    overdue: "text-urgent border-urgent bg-urgent-wash",
    soon: "text-soon border-soon bg-soon-wash",
    hold: "text-hold border-hold bg-hold-wash",
    clear: "text-body-dim border-line-strong"
  };


  const attentionMetrics = useMemo(() => {
    const quoteDueSoon = opportunities.filter(
      (o) => o.stage === "Quoting" || o.stage === "Qualifying"
    );
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
  }, [opportunities]);

  // Priority item scoring & filtering based on role and selected attention filter
  // The queue is ordered by urgency first — an overdue quote outranks anything
  // the role lens would otherwise surface. The lens then breaks ties.
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
        const rank = URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
        if (rank !== 0) return rank;

        const da = daysUntilDeadline(a.quoteDeadline);
        const db = daysUntilDeadline(b.quoteDeadline);
        if (da !== null && db !== null && da !== db) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;

        return roleTiebreak(a, b);
      })
      .slice(0, 5);
  }, [opportunities, selectedCategoryFilter, selectedRole]);

  const toggleCategoryFilter = (filterKey: string) => {
    setSelectedCategoryFilter((prev) => (prev === filterKey ? null : filterKey));
  };

  const handleOpenOpportunity = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    navigateToWorkflow("opportunities", undefined, oppId);
  };

  const handlePrepCall = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    navigateToWorkflow("tools", "call-prep", oppId);
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
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* 1. SITUATION — states what is actually true, in display type */}
      <section className="relative overflow-hidden pb-6 border-b border-line">
        {/* Lux pool: light falling from a luminaire. The one decorative move. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[10%] -top-[60%] right-[30%] h-64 bg-[radial-gradient(ellipse_50%_100%_at_30%_0%,var(--color-brand-wash),transparent_72%)]"
        ></div>

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-head sm:text-display font-semibold text-body">
              {totalNeedingAction === 0 ? (
                <>You&apos;re <span className="text-brand-deep">clear</span>, Sarah.</>
              ) : (
                <>
                  {totalNeedingAction} thing{totalNeedingAction === 1 ? "" : "s"} need you{" "}
                  <span className="text-brand-deep">today</span>.
                </>
              )}
            </h1>
            <p className="mt-2 text-meta text-body-dim max-w-[60ch]">{situation()}</p>
          </div>

          {/* Role lens — tabs, not pill toggles */}
          <div className="flex shrink-0" role="group" aria-label="View lens">
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
                className={`u-eyebrow px-3 py-2 border cursor-pointer transition-colors ${
                  selectedRole === role
                    ? "bg-surface text-body border-line border-b-surface"
                    : "bg-transparent text-body-faint border-transparent border-b-line hover:text-body"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. URGENCY STRIP — derived from deadlines, not pipeline stage */}
      <section aria-labelledby="urgency-heading">
        <h2 id="urgency-heading" className="sr-only">
          Work by urgency
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line border border-line">
          {([
            ["overdue", "Overdue", "overdue"],
            ["soon", "Due within 3 days", "soon"],
            ["hold", "With customer", "hold"]
          ] as [Urgency, string, string][]).map(([key, label, filterKey]) => {
            const count = urgencyCounts[key as "overdue" | "soon" | "hold"];
            const example = exampleFor(key);
            const isActive = selectedCategoryFilter === filterKey;
            return (
              <button
                key={key}
                onClick={() => toggleCategoryFilter(filterKey)}
                aria-pressed={isActive}
                disabled={count === 0}
                className={`text-left px-4 py-3.5 flex flex-col gap-1 transition-colors ${
                  count === 0
                    ? "bg-surface cursor-default"
                    : isActive
                    ? "bg-raised cursor-pointer ring-1 ring-inset ring-brand-edge"
                    : "bg-surface hover:bg-raised cursor-pointer"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className={`u-data text-head leading-none font-medium ${
                      count === 0
                        ? "text-body-faint"
                        : key === "overdue"
                        ? "text-urgent"
                        : key === "soon"
                        ? "text-soon"
                        : "text-hold"
                    }`}
                  >
                    {count}
                  </span>
                  <span className="u-eyebrow text-body-dim">{label}</span>
                </div>
                <span className="text-spec text-body-faint truncate">
                  {count === 0
                    ? "Nothing here"
                    : example
                    ? `${example.project}${
                        deadlineLabel(example) ? " — " + deadlineLabel(example) : ""
                      }`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. PRIORITY QUEUE — one surface, ruled rows, severity stripe */}
      <section aria-labelledby="queue-heading">
        <div className="flex items-baseline gap-3 mb-3">
          <h2 id="queue-heading" className="text-lead font-semibold text-body">
            Priority queue
          </h2>
          <span className="u-data text-spec text-body-faint uppercase tracking-[0.09em]">
            {priorityItems.length} {priorityItems.length === 1 ? "record" : "records"}
          </span>
          {selectedCategoryFilter && (
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className="text-spec text-brand-deep hover:underline font-medium cursor-pointer"
            >
              Clear filter
            </button>
          )}
          <button
            onClick={() => navigateToWorkflow("opportunities")}
            className="ml-auto text-meta font-medium text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>All pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityItems.length > 0 ? (
          <div className="border border-line bg-surface">
            {priorityItems.map((opp) => {
              const urgency = urgencyOf(opp);
              const label = deadlineLabel(opp);
              const canReview = opp.stage === "Quoting" || opp.stage === "Qualifying";

              return (
                <article
                  key={opp.id}
                  className="grid grid-cols-[3px_1fr] md:grid-cols-[3px_1fr_auto] border-b border-line last:border-b-0 hover:bg-raised transition-colors"
                >
                  <div className={STRIPE[urgency]} aria-hidden="true"></div>

                  <div className="py-4 pl-4 pr-4 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-body font-semibold text-body truncate">{opp.project}</h3>
                      {label && (
                        <span className={`u-eyebrow px-1.5 py-0.5 border ${CHIP[urgency]}`}>
                          {label}
                        </span>
                      )}
                      <span className="u-eyebrow px-1.5 py-0.5 border border-line-strong text-body-dim">
                        {opp.stage}
                      </span>
                      {opp.estimatedValue > 0 && (
                        <span className="u-data text-meta text-body-dim">
                          ${opp.estimatedValue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-meta text-body-dim flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-body">{opp.customerCompany}</span>
                      <span className="text-body-faint">·</span>
                      <span>{opp.contactName}</span>
                      {opp.location && (
                        <>
                          <span className="text-body-faint">·</span>
                          <span>{opp.location}</span>
                        </>
                      )}
                    </p>

                    {opp.nextAction && (
                      <p className="mt-2.5 pl-3 border-l-2 border-brand-edge text-meta text-body-dim">
                        <span className="font-medium text-body">Next: </span>
                        {opp.nextAction}
                      </p>
                    )}
                  </div>

                  <div className="col-start-2 md:col-start-3 flex items-center gap-1.5 pb-4 md:py-4 pl-4 md:pl-0 pr-4">
                    <button
                      onClick={() => handlePrepCall(opp.id)}
                      className="px-2.5 py-1.5 rounded-edge text-meta font-medium text-body-dim border border-line-strong hover:text-body hover:border-body-faint transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      title="Prepare AI call script & questions"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Prep call</span>
                    </button>

                    {canReview ? (
                      <button
                        onClick={() => handleReviewQuote(opp.id)}
                        className="px-2.5 py-1.5 rounded-edge text-meta font-medium text-body-dim border border-line-strong hover:text-body hover:border-body-faint transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 whitespace-nowrap"
                        title="Review quote parameters against specs"
                      >
                        <ClipboardCheck className="w-3 h-3" />
                        <span>Review</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollowUp(opp)}
                        className="px-2.5 py-1.5 rounded-edge text-meta font-medium text-body-dim border border-line-strong hover:text-body hover:border-body-faint transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 whitespace-nowrap"
                        title="Log or schedule follow-up"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Follow-up</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenOpportunity(opp.id)}
                      className="px-3 py-1.5 rounded-edge text-meta font-semibold text-white bg-brand-deep border border-brand-deep hover:bg-brand hover:border-brand transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Open
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="border border-line bg-surface px-5 py-8 text-center">
            <CheckCircle2 className="w-5 h-5 text-brand-deep mx-auto mb-2.5" />
            <h3 className="text-body font-semibold text-body">Nothing waiting on you</h3>
            <p className="mt-1 text-meta text-body-dim max-w-md mx-auto">
              {selectedCategoryFilter
                ? "No records in this bucket. Clear the filter to see the full queue."
                : "No quote deadline falls inside three days and nothing is overdue."}
            </p>
            {selectedCategoryFilter && (
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className="mt-3 text-meta text-brand-deep font-medium hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </section>

      {/* 4. COMPACT QUICK ACTIONS ROW */}
      <section aria-labelledby="quick-actions-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2
            id="quick-actions-heading"
            className="text-meta font-bold uppercase tracking-wider text-body"
          >
            Quick Actions
          </h2>
          <span className="text-spec text-body-faint font-medium">Common operational workflows</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {/* Action 1: New Enquiry */}
          <button
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-brand-wash text-brand-deep group-hover:scale-105 transition-transform">
                <FilePlus2 className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-body-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-meta font-bold text-body group-hover:text-brand-deep">New Enquiry</div>
              <div className="text-spec text-body-dim truncate">Analyse customer specifications</div>
            </div>
          </button>

          {/* Action 2: Find Product */}
          <button
            onClick={() => navigateToWorkflow("product-finder")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-blue-100 text-blue-800 group-hover:scale-105 transition-transform">
                <SearchCode className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-body-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-meta font-bold text-body group-hover:text-brand-deep">Find Product</div>
              <div className="text-spec text-body-dim truncate">Match solar & commercial luminaires</div>
            </div>
          </button>

          {/* Action 3: Analyse Tender */}
          <button
            onClick={() => navigateToWorkflow("tools", "tender-analyser")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-purple-100 text-purple-800 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-body-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-meta font-bold text-body group-hover:text-brand-deep">Analyse Tender</div>
              <div className="text-spec text-body-dim truncate">Extract council RFQ standards</div>
            </div>
          </button>

          {/* Action 4: Prepare Call */}
          <button
            onClick={() => navigateToWorkflow("tools", "call-prep", "opp-001")}
            className="p-3 rounded-panel bg-white hover:bg-raised border border-line hover:border-brand text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-edge bg-amber-100 text-amber-800 group-hover:scale-105 transition-transform">
                <PhoneCall className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-body-faint group-hover:text-brand-deep group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-meta font-bold text-body group-hover:text-brand-deep">Prepare Call</div>
              <div className="text-spec text-body-dim truncate">Generate customer talking points</div>
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
                  className={`w-3.5 h-3.5 text-body-dim transition-transform duration-200 ${
                    isMoreToolsOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              <div className="mt-1">
                <div className="text-meta font-bold text-body">More Tools</div>
                <div className="text-spec text-body-dim truncate">Catalogues, CRM, Quote Review...</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMoreToolsOpen && (
              <div className="absolute right-0 bottom-full lg:bottom-auto lg:top-full mb-1 lg:mb-0 lg:mt-1 z-30 w-56 bg-white rounded-panel shadow-lg border border-line py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("documents");
                  }}
                  className="w-full px-3.5 py-2 text-left text-meta font-medium text-body hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-body-faint" />
                  <span>Product Catalogues & PDFs</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "quote-review");
                  }}
                  className="w-full px-3.5 py-2 text-left text-meta font-medium text-body hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-body-faint" />
                  <span>Review Quote Accuracy</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("crm");
                  }}
                  className="w-full px-3.5 py-2 text-left text-meta font-medium text-body hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <KanbanSquare className="w-3.5 h-3.5 text-body-faint" />
                  <span>CRM Command Centre</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "customer-research");
                  }}
                  className="w-full px-3.5 py-2 text-left text-meta font-medium text-body hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-body-faint" />
                  <span>Customer Intelligence</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "product-comparison");
                  }}
                  className="w-full px-3.5 py-2 text-left text-meta font-medium text-body hover:bg-raised hover:text-brand-deep flex items-center gap-2.5 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-body-faint" />
                  <span>Product Comparison</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. WORKLOAD & PIPELINE OVERVIEW (Quiet, Grounded Context) */}
      <section aria-labelledby="pipeline-overview-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2
            id="pipeline-overview-heading"
            className="text-meta font-bold uppercase tracking-wider text-body"
          >
            Pipeline & Workload Overview
          </h2>
          <button
            onClick={() => navigateToWorkflow("crm")}
            className="text-meta font-semibold text-brand-deep hover:underline cursor-pointer"
          >
            Open Full CRM &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-3.5 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer"
          >
            <div className="text-spec font-semibold text-body-dim">Active Deals</div>
            <div className="text-xl font-black text-body mt-0.5">{opportunities.length}</div>
            <div className="text-spec text-body-faint mt-0.5">Across all stages</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-3.5 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer"
          >
            <div className="text-spec font-semibold text-body-dim">In Technical Review</div>
            <div className="text-xl font-black text-purple-900 mt-0.5">
              {attentionMetrics.techReview.length}
            </div>
            <div className="text-spec text-body-faint mt-0.5">Dialux / Photometrics</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-3.5 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer"
          >
            <div className="text-spec font-semibold text-body-dim">Pending Quotes</div>
            <div className="text-xl font-black text-rose-900 mt-0.5">
              {attentionMetrics.quoteDueSoon.length}
            </div>
            <div className="text-spec text-body-faint mt-0.5">Due within 5 business days</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("crm")}
            className="bg-white p-3.5 rounded-panel border border-line hover:border-line-strong transition-colors cursor-pointer"
          >
            <div className="text-spec font-semibold text-body-dim">Sales Intelligence</div>
            <div className="text-xl font-black text-brand-deep mt-0.5 flex items-center gap-1">
              <span>98%</span>
              <span className="text-meta font-semibold text-brand-deep">Healthy</span>
            </div>
            <div className="text-spec text-body-faint mt-0.5">AS/NZS 1158 Guardrails Active</div>
          </div>
        </div>
      </section>
    </div>
  );
};
