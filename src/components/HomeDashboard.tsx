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
  const priorityItems = useMemo(() => {
    let list = [...opportunities];

    // Filter by interactive category if clicked
    if (selectedCategoryFilter === "quote-due") {
      list = attentionMetrics.quoteDueSoon;
    } else if (selectedCategoryFilter === "tech-review") {
      list = attentionMetrics.techReview;
    } else if (selectedCategoryFilter === "waiting-customer") {
      list = attentionMetrics.waitingCustomer;
    } else if (selectedCategoryFilter === "new-enquiries") {
      list = attentionMetrics.newEnquiries;
    } else if (selectedCategoryFilter === "follow-up") {
      list = attentionMetrics.followUpOverdue;
    }

    // Role-specific sorting & weighting
    return list.sort((a, b) => {
      if (selectedRole === "customer_service") {
        // Customer Service prioritises: new enquiries, waiting on info/specs, follow-ups
        const stageWeight = (stage: string) => {
          if (stage === "New Enquiry") return 5;
          if (stage === "Awaiting Information") return 4;
          if (stage === "Follow-Up") return 3;
          if (stage === "Quoting") return 2;
          return 1;
        };
        return stageWeight(b.stage) - stageWeight(a.stage);
      }

      if (selectedRole === "sales") {
        // Sales prioritises: quote deadlines, hot deals, overdue actions
        const aDeadline = a.quoteDeadline ? new Date(a.quoteDeadline).getTime() : Infinity;
        const bDeadline = b.quoteDeadline ? new Date(b.quoteDeadline).getTime() : Infinity;
        return aDeadline - bDeadline;
      }

      if (selectedRole === "sales_manager") {
        // Sales Manager prioritises: highest value, quote deadlines, stalled deals
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      }

      if (selectedRole === "technical") {
        // Technical prioritises: Technical Review stages, complex applications
        const isTechA = a.stage === "Technical Review" ? 10 : 0;
        const isTechB = b.stage === "Technical Review" ? 10 : 0;
        return isTechB - isTechA;
      }

      return 0;
    }).slice(0, 4);
  }, [opportunities, selectedCategoryFilter, selectedRole, attentionMetrics]);

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

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. COMPACT GREETING & COMMAND HEADER */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {greeting}, <span className="text-emerald-800">Sarah</span>
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                Customer Service Command Centre
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {attentionMetrics.totalUrgent > 0
                ? `You have ${attentionMetrics.totalUrgent} item${attentionMetrics.totalUrgent === 1 ? "" : "s"} requiring immediate action today.`
                : "All enquiries and quotations are currently up to date."}
            </p>
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">
              View Lens:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                onClick={() => setSelectedRole("customer_service")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  selectedRole === "customer_service"
                    ? "bg-white text-emerald-950 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Customer Service
              </button>
              <button
                onClick={() => setSelectedRole("sales")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  selectedRole === "sales"
                    ? "bg-white text-emerald-950 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sales
              </button>
              <button
                onClick={() => setSelectedRole("technical")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  selectedRole === "technical"
                    ? "bg-white text-emerald-950 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Technical
              </button>
              <button
                onClick={() => setSelectedRole("sales_manager")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  selectedRole === "sales_manager"
                    ? "bg-white text-emerald-950 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Manager
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WHAT NEEDS MY ATTENTION RIGHT NOW (Interactive Category Chips) */}
      <section aria-labelledby="needs-attention-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2
              id="needs-attention-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Needs Attention
            </h2>
            {selectedCategoryFilter && (
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                (Clear filter)
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Tap category to filter priority list</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Quote Due Soon */}
          {attentionMetrics.quoteDueSoon.length > 0 ? (
            <button
              onClick={() => toggleCategoryFilter("quote-due")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedCategoryFilter === "quote-due"
                  ? "bg-rose-100 border-rose-400 text-rose-900 ring-2 ring-rose-300/50"
                  : "bg-rose-50/80 hover:bg-rose-100/80 border-rose-200 text-rose-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>Quote due soon</span>
              <span className="bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded-md text-[11px] font-black">
                {attentionMetrics.quoteDueSoon.length}
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/70 border border-slate-200 text-slate-500 text-xs font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>No quotes due</span>
            </span>
          )}

          {/* Technical Review */}
          {attentionMetrics.techReview.length > 0 ? (
            <button
              onClick={() => toggleCategoryFilter("tech-review")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedCategoryFilter === "tech-review"
                  ? "bg-purple-100 border-purple-400 text-purple-900 ring-2 ring-purple-300/50"
                  : "bg-purple-50/80 hover:bg-purple-100/80 border-purple-200 text-purple-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span>Technical review</span>
              <span className="bg-purple-200/80 text-purple-900 px-1.5 py-0.2 rounded-md text-[11px] font-black">
                {attentionMetrics.techReview.length}
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/70 border border-slate-200 text-slate-500 text-xs font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>No tech review backlog</span>
            </span>
          )}

          {/* Waiting for Customer */}
          {attentionMetrics.waitingCustomer.length > 0 ? (
            <button
              onClick={() => toggleCategoryFilter("waiting-customer")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedCategoryFilter === "waiting-customer"
                  ? "bg-blue-100 border-blue-400 text-blue-900 ring-2 ring-blue-300/50"
                  : "bg-blue-50/80 hover:bg-blue-100/80 border-blue-200 text-blue-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Waiting for customer</span>
              <span className="bg-blue-200/80 text-blue-900 px-1.5 py-0.2 rounded-md text-[11px] font-black">
                {attentionMetrics.waitingCustomer.length}
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/70 border border-slate-200 text-slate-500 text-xs font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>No pending specs</span>
            </span>
          )}

          {/* New Enquiries */}
          {attentionMetrics.newEnquiries.length > 0 ? (
            <button
              onClick={() => toggleCategoryFilter("new-enquiries")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedCategoryFilter === "new-enquiries"
                  ? "bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300/50"
                  : "bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>New enquiries</span>
              <span className="bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded-md text-[11px] font-black">
                {attentionMetrics.newEnquiries.length}
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/70 border border-slate-200 text-slate-500 text-xs font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>No new enquiries</span>
            </span>
          )}

          {/* Follow-up Overdue */}
          {attentionMetrics.followUpOverdue.length > 0 ? (
            <button
              onClick={() => toggleCategoryFilter("follow-up")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedCategoryFilter === "follow-up"
                  ? "bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-300/50"
                  : "bg-amber-50/80 hover:bg-amber-100/80 border-amber-200 text-amber-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>Follow-up due</span>
              <span className="bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded-md text-[11px] font-black">
                {attentionMetrics.followUpOverdue.length}
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/70 border border-slate-200 text-slate-500 text-xs font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>No overdue follow-ups</span>
            </span>
          )}
        </div>
      </section>

      {/* 3. YOUR PRIORITY ACTIONS (Clean, Actionable Triage Cards) */}
      <section aria-labelledby="priority-actions-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2
              id="priority-actions-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Your Priority Actions
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              ({priorityItems.length} {priorityItems.length === 1 ? "record" : "records"})
            </span>
          </div>

          <button
            onClick={() => navigateToWorkflow("opportunities")}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View all pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityItems.length > 0 ? (
          <div className="space-y-2.5">
            {priorityItems.map((opp) => {
              const deadlineFormatted = formatDeadline(opp.quoteDeadline);
              const isDueSoon = opp.stage === "Quoting" || opp.stage === "Qualifying";
              const isWaiting = opp.stage === "Awaiting Information";
              const isTech = opp.stage === "Technical Review";
              const isNew = opp.stage === "New Enquiry";
              const isFollowUp = opp.stage === "Follow-Up";

              return (
                <div
                  key={opp.id}
                  className="bg-white rounded-xl border border-slate-200/90 hover:border-emerald-500/80 p-4 transition-all duration-150 shadow-xs hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  {/* Left content: Answers What, Who, Why, Due, Next Action */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-emerald-900 transition-colors truncate">
                        {opp.project}
                      </span>

                      {/* Status chip */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isDueSoon
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : isWaiting
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : isTech
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : isNew
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isFollowUp
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {opp.stage}
                        {deadlineFormatted && (
                          <span className="opacity-90 font-medium">· Due {deadlineFormatted}</span>
                        )}
                      </span>

                      {opp.estimatedValue > 0 && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                          ${opp.estimatedValue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Customer & Company Details */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <span className="font-medium text-slate-800">{opp.customerCompany}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600">{opp.contactName}</span>
                      {opp.location && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{opp.location}</span>
                        </>
                      )}
                    </div>

                    {/* Next Action */}
                    {opp.nextAction && (
                      <div className="text-xs text-slate-700 flex items-baseline gap-1.5 pt-0.5">
                        <span className="font-bold text-slate-900 shrink-0">Next:</span>
                        <span className="text-slate-800 line-clamp-1">{opp.nextAction}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Primary Open + Contextual Secondary */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                    {/* Contextual Action: Prep Call */}
                    <button
                      onClick={() => handlePrepCall(opp.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Prepare AI call script & questions"
                    >
                      <PhoneCall className="w-3 h-3 text-slate-500" />
                      <span>Prep Call</span>
                    </button>

                    {/* Contextual Action: Review Quote or Follow Up */}
                    {isDueSoon ? (
                      <button
                        onClick={() => handleReviewQuote(opp.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer hidden sm:flex items-center gap-1.5"
                        title="Review quote parameters against specs"
                      >
                        <ClipboardCheck className="w-3 h-3 text-slate-500" />
                        <span>Review</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollowUp(opp)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer hidden sm:flex items-center gap-1.5"
                        title="Log or schedule follow-up"
                      >
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>Follow-up</span>
                      </button>
                    )}

                    {/* Primary Action: Open */}
                    <button
                      onClick={() => handleOpenOpportunity(opp.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Calm Empty State */
          <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-6 text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">You&apos;re up to date</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {selectedCategoryFilter
                ? `No records found under the current "${selectedCategoryFilter}" filter.`
                : "No urgent priority records requiring triage right now. Use Quick Actions below to start a new task or explore pipeline opportunities."}
            </p>
            {selectedCategoryFilter && (
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className="text-xs text-emerald-800 font-bold hover:underline cursor-pointer pt-1"
              >
                Clear filter & show all items
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
            className="text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            Quick Actions
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Common operational workflows</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {/* Action 1: New Enquiry */}
          <button
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-400 text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                <FilePlus2 className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">New Enquiry</div>
              <div className="text-[10px] text-slate-500 truncate">Analyse customer specifications</div>
            </div>
          </button>

          {/* Action 2: Find Product */}
          <button
            onClick={() => navigateToWorkflow("product-finder")}
            className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-400 text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 group-hover:scale-105 transition-transform">
                <SearchCode className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">Find Product</div>
              <div className="text-[10px] text-slate-500 truncate">Match solar & commercial luminaires</div>
            </div>
          </button>

          {/* Action 3: Analyse Tender */}
          <button
            onClick={() => navigateToWorkflow("tools", "tender-analyser")}
            className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-400 text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">Analyse Tender</div>
              <div className="text-[10px] text-slate-500 truncate">Extract council RFQ standards</div>
            </div>
          </button>

          {/* Action 4: Prepare Call */}
          <button
            onClick={() => navigateToWorkflow("tools", "call-prep", "opp-001")}
            className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-400 text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 group-hover:scale-105 transition-transform">
                <PhoneCall className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">Prepare Call</div>
              <div className="text-[10px] text-slate-500 truncate">Generate customer talking points</div>
            </div>
          </button>

          {/* Action 5: More Tools Dropdown Trigger */}
          <div className="relative col-span-2 sm:col-span-4 lg:col-span-1">
            <button
              onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
              className="w-full h-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 hover:border-slate-300 text-left transition-all cursor-pointer group shadow-2xs flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    isMoreToolsOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              <div className="mt-1">
                <div className="text-xs font-bold text-slate-800">More Tools</div>
                <div className="text-[10px] text-slate-500 truncate">Catalogues, CRM, Quote Review...</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMoreToolsOpen && (
              <div className="absolute right-0 bottom-full lg:bottom-auto lg:top-full mb-1 lg:mb-0 lg:mt-1 z-30 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("documents");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Product Catalogues & PDFs</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "quote-review");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Review Quote Accuracy</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("crm");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                >
                  <KanbanSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>CRM Command Centre</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "customer-research");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Intelligence</span>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsOpen(false);
                    navigateToWorkflow("tools", "product-comparison");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
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
            className="text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            Pipeline & Workload Overview
          </h2>
          <button
            onClick={() => navigateToWorkflow("crm")}
            className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
          >
            Open Full CRM &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-slate-500">Active Deals</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{opportunities.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all stages</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-slate-500">In Technical Review</div>
            <div className="text-xl font-black text-purple-900 mt-0.5">
              {attentionMetrics.techReview.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Dialux / Photometrics</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("opportunities")}
            className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-slate-500">Pending Quotes</div>
            <div className="text-xl font-black text-rose-900 mt-0.5">
              {attentionMetrics.quoteDueSoon.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Due within 5 business days</div>
          </div>

          <div
            onClick={() => navigateToWorkflow("crm")}
            className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-slate-500">Sales Intelligence</div>
            <div className="text-xl font-black text-emerald-900 mt-0.5 flex items-center gap-1">
              <span>98%</span>
              <span className="text-xs font-semibold text-emerald-700">Healthy</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">AS/NZS 1158 Guardrails Active</div>
          </div>
        </div>
      </section>
    </div>
  );
};
