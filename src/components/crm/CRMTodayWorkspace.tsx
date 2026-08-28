import React, { useState, useMemo } from "react";
import {
  Sun,
  AlertTriangle,
  Clock,
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Briefcase,
  ChevronRight,
  Phone,
  Plus,
  Mail,
  MoreHorizontal,
  Check,
  Filter,
  X,
  ExternalLink,
  Kanban,
  FileText,
  Clock3
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CustomerFollowUpModal, CustomerFollowUpModalProps } from "../CustomerFollowUpModal";
import { CRMIntelligenceEngine } from "../../utils/crmIntelligence";
import { NextBestActionItem, CRMOpportunity, CRMTask, CRMLead } from "../../types/crm";

type FilterCategory = "all" | "overdue" | "followups" | "quotes" | "leads";
type PriorityTier = "do_now" | "today" | "normal" | "waiting";

interface UnifiedWorkItem {
  id: string;
  sourceType: "nba" | "task" | "deal" | "lead" | "alert";
  title: string;
  entityName: string;
  entityType?: "Opportunity" | "Account" | "Lead" | "Task";
  entityId?: string;
  accountId?: string;
  dealId?: string;
  context: string;
  reason?: string;
  value?: number;
  urgency: "Immediate" | "Today" | "Normal" | "Waiting";
  priorityTier: PriorityTier;
  dueDate?: string;
  category: string;
  quoteRef?: string;
  contactName?: string;
  contactEmail?: string;
  primaryActionType: "followup" | "call" | "email" | "open" | "complete";
  primaryActionLabel: string;
  isCompleted?: boolean;
}

function formatHumanDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export const CRMTodayWorkspace: React.FC = () => {
  const {
    accounts,
    crmOpportunities,
    leads,
    tasks,
    activities,
    nextBestActions,
    toggleTaskComplete,
    navigateToCRM,
    openQuickLog,
    openEmailComposer,
    competitorAlerts,
    markCompetitorAlertRead,
    unreadCompetitorAlertsCount
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Follow-up modal state
  const [followUpModalProps, setFollowUpModalProps] = useState<CustomerFollowUpModalProps>({
    isOpen: false,
    onClose: () => setFollowUpModalProps((prev) => ({ ...prev, isOpen: false }))
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const formattedToday = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  // 1. Calculate Metrics for Snapshot & Attention Counts
  const totalPipelineValue = useMemo(() => {
    return crmOpportunities
      .filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost")
      .reduce((sum, d) => sum + (d.dealValue || 0), 0);
  }, [crmOpportunities]);

  const weightedPipelineValue = useMemo(() => {
    return crmOpportunities
      .filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost")
      .reduce((sum, d) => sum + ((d.dealValue || 0) * (d.probability || 0)) / 100, 0);
  }, [crmOpportunities]);

  const overdueTasksCount = useMemo(() => {
    return tasks.filter(
      (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr
    ).length;
  }, [tasks, todayStr]);

  const quotesAwaitingCount = useMemo(() => {
    return crmOpportunities.filter(
      (d) => d.quoteStatus === "Sent" && d.stageId !== "stage-won" && d.stageId !== "stage-lost"
    ).length;
  }, [crmOpportunities]);

  const followUpsDueCount = useMemo(() => {
    const quoteNBAs = nextBestActions.filter((a) => a.category === "Quote Follow-up").length;
    const followUpTasks = tasks.filter(
      (t) => t.status !== "Completed" && t.status !== "Cancelled" && (t.taskType === "Follow-up" || t.dueDate <= todayStr)
    ).length;
    return Math.max(quoteNBAs, followUpTasks);
  }, [nextBestActions, tasks, todayStr]);

  const newLeadsCount = useMemo(() => {
    return leads.filter((l) => l.leadStatus === "New" || (l.leadScore >= 70 && l.leadStatus !== "Converted")).length;
  }, [leads]);

  const atRiskDealsCount = useMemo(() => {
    return crmOpportunities.filter(
      (d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost" && (d.dealHealth === "At Risk" || d.dealHealth === "Stalled")
    ).length;
  }, [crmOpportunities]);

  // 2. Build Unified Work Items Queue with complete cross-source deduplication
  const unifiedWorkQueue = useMemo(() => {
    const items: UnifiedWorkItem[] = [];
    const seenTaskIds = new Set<string>();
    const seenDealIds = new Set<string>();
    const seenLeadIds = new Set<string>();

    // A. CRM Tasks (Manual / Scheduled) - authoritative user tasks
    tasks.forEach((task) => {
      if (task.status === "Completed" || task.status === "Cancelled" || snoozedIds.has(task.id)) return;
      seenTaskIds.add(task.id);
      if (task.dealId) seenDealIds.add(task.dealId);

      const isOverdue = task.dueDate < todayStr;
      const isToday = task.dueDate === todayStr;
      const isHighPriority = task.priority === "High" || task.priority === "Urgent";

      let priorityTier: PriorityTier = "normal";
      if (isOverdue || isHighPriority) priorityTier = "do_now";
      else if (isToday) priorityTier = "today";

      const matchedAccount = task.accountId ? accounts.find((a) => a.id === task.accountId) : undefined;
      const matchedDeal = task.dealId ? crmOpportunities.find((d) => d.id === task.dealId) : undefined;

      items.push({
        id: task.id,
        sourceType: "task",
        title: task.title,
        entityName: task.accountName || matchedAccount?.name || matchedDeal?.name || "General Task",
        entityType: task.dealId ? "Opportunity" : "Account",
        entityId: task.dealId || task.accountId,
        accountId: task.accountId,
        dealId: task.dealId,
        context: task.description || (isOverdue ? `Overdue since ${formatHumanDate(task.dueDate)}` : `Due ${formatHumanDate(task.dueDate)}`),
        reason: isOverdue ? "Overdue commitment directly impacting customer confidence and sales momentum." : "Scheduled priority customer commitment.",
        dueDate: task.dueDate,
        urgency: isOverdue ? "Immediate" : isToday ? "Today" : "Normal",
        priorityTier,
        category: task.taskType || "Task",
        primaryActionType: task.taskType === "Call" ? "call" : task.taskType === "Email" ? "email" : "complete",
        primaryActionLabel: task.taskType === "Call" ? "Log Call" : task.taskType === "Email" ? "Write Email" : "Complete",
        isCompleted: task.status === "Completed"
      });
    });

    // B. Next Best Actions (AI / Rule based) - skip if task or deal is already represented
    nextBestActions.forEach((nba) => {
      if (snoozedIds.has(nba.id)) return;
      if (nba.relatedEntityType === "Task" && seenTaskIds.has(nba.relatedEntityId)) return;
      if (nba.relatedEntityType === "Opportunity" && seenDealIds.has(nba.relatedEntityId)) return;

      const matchedDeal = nba.relatedEntityType === "Opportunity" ? crmOpportunities.find((d) => d.id === nba.relatedEntityId) : undefined;
      const matchedAccount = nba.relatedEntityType === "Account" ? accounts.find((a) => a.id === nba.relatedEntityId) : matchedDeal ? accounts.find((a) => a.id === matchedDeal.accountId) : undefined;

      const isQuote = nba.category === "Quote Follow-up";
      const isUrgent = nba.urgency === "Immediate";

      let priorityTier: PriorityTier = isUrgent || (matchedDeal && (matchedDeal.dealValue || 0) >= 50000) ? "do_now" : "today";
      if (nba.category === "Missing Action") priorityTier = "do_now";

      if (matchedDeal) seenDealIds.add(matchedDeal.id);

      items.push({
        id: nba.id,
        sourceType: "nba",
        title: nba.title,
        entityName: nba.relatedEntityName,
        entityType: nba.relatedEntityType,
        entityId: nba.relatedEntityId,
        accountId: matchedAccount?.id,
        dealId: matchedDeal?.id,
        context: nba.description,
        reason: nba.reason,
        value: matchedDeal?.dealValue,
        urgency: nba.urgency,
        priorityTier,
        category: nba.category,
        quoteRef: matchedDeal?.quoteNumber,
        contactName: matchedDeal?.primaryContactName,
        contactEmail: matchedDeal?.primaryContactEmail,
        primaryActionType: isQuote ? "followup" : matchedDeal ? "open" : "call",
        primaryActionLabel: isQuote ? "Follow Up" : matchedDeal ? "Open Deal" : "Action"
      });
    });

    // C. At-Risk or Stalled Deals without explicit NBAs or tasks
    crmOpportunities.forEach((deal) => {
      if (deal.stageId === "stage-won" || deal.stageId === "stage-lost" || snoozedIds.has(`deal-${deal.id}`)) return;
      if (seenDealIds.has(deal.id)) return;
      if (deal.dealHealth === "At Risk" || deal.dealHealth === "Stalled") {
        seenDealIds.add(deal.id);
        items.push({
          id: `deal-health-${deal.id}`,
          sourceType: "deal",
          title: `Unblock ${deal.dealHealth} Deal ($${(deal.dealValue || 0).toLocaleString()})`,
          entityName: deal.name,
          entityType: "Opportunity",
          entityId: deal.id,
          accountId: deal.accountId,
          dealId: deal.id,
          context: `${deal.accountName} · In ${deal.stageName} for ${deal.daysInCurrentStage} days`,
          reason: `Deal is marked ${deal.dealHealth}. Immediate stakeholder check-in recommended.`,
          value: deal.dealValue,
          urgency: "Immediate",
          priorityTier: "do_now",
          category: "Stalled Deal",
          contactName: deal.primaryContactName,
          contactEmail: deal.primaryContactEmail,
          quoteRef: deal.quoteNumber,
          primaryActionType: "open",
          primaryActionLabel: "Open Deal"
        });
      }
    });

    // D. New High Intent Leads
    leads.forEach((lead) => {
      if (lead.leadStatus === "Converted" || lead.leadStatus === "Unqualified" || snoozedIds.has(`lead-${lead.id}`)) return;
      if (seenLeadIds.has(lead.id)) return;
      if (lead.leadScore >= 70 || lead.leadStatus === "New") {
        seenLeadIds.add(lead.id);
        items.push({
          id: `lead-hot-${lead.id}`,
          sourceType: "lead",
          title: `Contact High-Intent Lead (${lead.leadScore}/100)`,
          entityName: `${lead.firstName} ${lead.lastName} · ${lead.companyName || lead.company}`,
          entityType: "Lead",
          entityId: lead.id,
          context: `${lead.projectName || "Inbound Project"} · ${lead.projectLocation || "VIC"}`,
          reason: `Score ${lead.leadScore}. ${lead.notes || "High commercial intent detected."}`,
          urgency: lead.leadScore >= 80 ? "Immediate" : "Today",
          priorityTier: lead.leadScore >= 80 ? "do_now" : "today",
          category: "New Lead",
          contactName: `${lead.firstName} ${lead.lastName}`,
          contactEmail: lead.email,
          primaryActionType: "call",
          primaryActionLabel: "Log Call"
        });
      }
    });

    // Sort items by priority tier and value
    const tierOrder: Record<PriorityTier, number> = {
      do_now: 0,
      today: 1,
      normal: 2,
      waiting: 3
    };

    return items.sort((a, b) => {
      if (tierOrder[a.priorityTier] !== tierOrder[b.priorityTier]) {
        return tierOrder[a.priorityTier] - tierOrder[b.priorityTier];
      }
      return (b.value || 0) - (a.value || 0);
    });
  }, [nextBestActions, tasks, crmOpportunities, accounts, leads, snoozedIds, todayStr]);

  // 3. Hero Item: The Single Most Urgent / High Value Next Best Action
  const heroItem = useMemo(() => {
    if (unifiedWorkQueue.length === 0) return null;
    return unifiedWorkQueue.find((i) => i.priorityTier === "do_now") || unifiedWorkQueue[0] || null;
  }, [unifiedWorkQueue]);

  // 4. Filtered Work Queue based on active pill and search query
  const filteredQueue = useMemo(() => {
    return unifiedWorkQueue.filter((item) => {
      // Category Filter
      if (activeFilter === "overdue") {
        if (item.urgency !== "Immediate" && (!item.dueDate || item.dueDate >= todayStr)) return false;
      } else if (activeFilter === "followups") {
        if (item.category !== "Quote Follow-up" && item.primaryActionType !== "followup") return false;
      } else if (activeFilter === "quotes") {
        if (!item.quoteRef && item.category !== "Quote Follow-up") return false;
      } else if (activeFilter === "leads") {
        if (item.sourceType !== "lead" && item.category !== "New Lead") return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.entityName.toLowerCase().includes(q) ||
          item.context.toLowerCase().includes(q) ||
          (item.reason && item.reason.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [unifiedWorkQueue, activeFilter, searchQuery, todayStr]);

  // Work items for list below Hero Card (omit the hero item if spotlighted above so it's not duplicated)
  const workListItems = useMemo(() => {
    return filteredQueue.filter((item) => !heroItem || item.id !== heroItem.id);
  }, [filteredQueue, heroItem]);

  // Group filtered items by Priority Tier
  const doNowItems = workListItems.filter((i) => i.priorityTier === "do_now");
  const todayItems = workListItems.filter((i) => i.priorityTier === "today");
  const laterItems = workListItems.filter((i) => i.priorityTier === "normal" || i.priorityTier === "waiting");

  // Handler for primary actions
  const handlePrimaryAction = (item: UnifiedWorkItem) => {
    if (item.primaryActionType === "followup") {
      setFollowUpModalProps({
        isOpen: true,
        onClose: () => setFollowUpModalProps((prev) => ({ ...prev, isOpen: false })),
        dealId: item.dealId,
        accountId: item.accountId,
        initialContactName: item.contactName || "",
        initialCompanyName: item.entityName || "",
        initialProjectName: item.entityName || "",
        initialQuoteRef: item.quoteRef || "",
        initialContactEmail: item.contactEmail || ""
      });
    } else if (item.primaryActionType === "call") {
      openQuickLog("call", item.accountId, item.dealId);
    } else if (item.primaryActionType === "email") {
      openEmailComposer({
        emailType: "cold_outreach",
        researchSubject: item.entityName,
        targetContactName: item.contactName,
        targetContactEmail: item.contactEmail,
        accountId: item.accountId,
        opportunityId: item.dealId
      });
    } else if (item.primaryActionType === "open") {
      if (item.entityType === "Opportunity" && item.dealId) {
        navigateToCRM("pipeline", item.dealId);
      } else if (item.entityType === "Account" && item.accountId) {
        navigateToCRM("accounts", item.accountId);
      } else if (item.entityType === "Lead" && item.entityId) {
        navigateToCRM("leads", item.entityId);
      } else {
        navigateToCRM("pipeline", item.entityId);
      }
    } else if (item.primaryActionType === "complete" && item.sourceType === "task") {
      toggleTaskComplete(item.id);
    }
  };

  const handleSnooze = (id: string) => {
    setSnoozedIds((prev) => new Set([...prev, id]));
    setActiveMenuId(null);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 w-full min-w-0">
      {/* 1. Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-line w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink tracking-tight">Today's Focus</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            {formattedToday} · Here's what needs your attention.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => openQuickLog("task")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-spec font-bold text-ink bg-white border border-line-strong rounded-edge hover:bg-hover hover:border-ink-faint transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-brand-deep" />
            <span>+ Task</span>
          </button>
          <button
            type="button"
            onClick={() => navigateToCRM("pipeline")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-spec font-bold text-white bg-brand-deep rounded-edge hover:bg-brand transition-colors shadow-2xs cursor-pointer"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>View Pipeline</span>
          </button>
        </div>
      </div>

      {/* 2. Needs Attention Filter Strip (Responsive wrap, no horizontal swipe) */}
      <div className="flex flex-wrap items-center gap-1.5 py-0.5 w-full min-w-0">
        <span className="text-spec font-semibold text-ink-dim uppercase tracking-[0.08em] shrink-0 mr-1 hidden sm:inline">
          Needs attention:
        </span>

        {overdueTasksCount === 0 && followUpsDueCount === 0 && quotesAwaitingCount === 0 && newLeadsCount === 0 ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-spec font-bold bg-brand-wash text-brand-deep border border-brand-edge">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>✓ No overdue work</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === "overdue" ? "all" : "overdue")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-spec font-bold border transition-all cursor-pointer ${
                activeFilter === "overdue"
                  ? "bg-urgent text-white border-urgent shadow-xs"
                  : overdueTasksCount > 0
                  ? "bg-urgent-wash text-urgent border-urgent/30 hover:border-urgent"
                  : "bg-brand-wash text-brand-deep border-brand-edge"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${overdueTasksCount > 0 ? "bg-urgent" : "bg-brand-deep"}`} />
              <span>{overdueTasksCount > 0 ? `${overdueTasksCount} Overdue` : "✓ No overdue work"}</span>
            </button>

            {followUpsDueCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "followups" ? "all" : "followups")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-spec font-bold border transition-all cursor-pointer ${
                  activeFilter === "followups"
                    ? "bg-soon text-white border-soon shadow-xs"
                    : "bg-soon-wash text-soon border-soon/30 hover:border-soon"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-soon" />
                <span>{followUpsDueCount} Follow-ups Due</span>
              </button>
            )}

            {quotesAwaitingCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "quotes" ? "all" : "quotes")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-spec font-bold border transition-all cursor-pointer ${
                  activeFilter === "quotes"
                    ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                    : "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>{quotesAwaitingCount} Quotes Awaiting Response</span>
              </button>
            )}

            {newLeadsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "leads" ? "all" : "leads")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-spec font-bold border transition-all cursor-pointer ${
                  activeFilter === "leads"
                    ? "bg-brand-deep text-white border-brand-deep shadow-xs"
                    : "bg-brand-wash text-brand-deep border-brand-edge hover:border-brand-deep"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{newLeadsCount} New Leads</span>
              </button>
            )}
          </>
        )}

        {activeFilter !== "all" && (
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="text-spec font-semibold text-ink-dim hover:text-ink underline ml-1 cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* 3. Hero Content: NEXT BEST ACTION Card or Clean All-Clear Card */}
      {heroItem ? (
        <div className="bg-white rounded-panel border-2 border-brand-edge shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-brand-wash via-white to-white px-4 py-3 border-b border-brand-edge flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-brand-deep text-white rounded shrink-0">
                <Sparkles className="w-4 h-4 text-cyan-200" />
              </div>
              <div>
                <span className="u-eyebrow text-brand-deep text-[0.6875rem] tracking-[0.1em] font-bold">
                  NEXT BEST ACTION
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-urgent-wash text-urgent border border-urgent/20">
                {heroItem.urgency === "Immediate" ? "🔴 High Urgency" : "🟠 Due Today"}
              </span>
              {heroItem.value && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  ${heroItem.value.toLocaleString()} Deal
                </span>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-body font-bold text-ink">{heroItem.title}</h2>
                <span className="text-spec font-semibold text-brand-deep bg-brand-wash px-2 py-0.5 rounded truncate max-w-xs">
                  {heroItem.entityName}
                </span>
              </div>

              <p className="text-meta text-ink-dim">
                {heroItem.context}
              </p>

              {heroItem.reason && (
                <div className="p-2.5 bg-paper rounded-edge border border-line text-spec text-ink-dim flex items-start gap-2">
                  <span className="font-bold text-brand-deep shrink-0">Why this matters:</span>
                  <span>{heroItem.reason}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => handlePrimaryAction(heroItem)}
                className="px-4 py-2 text-meta font-bold text-white bg-brand-deep hover:bg-brand rounded-edge shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {heroItem.primaryActionType === "followup" ? (
                  <Mail className="w-4 h-4" />
                ) : heroItem.primaryActionType === "call" ? (
                  <Phone className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{heroItem.primaryActionLabel}</span>
              </button>

              {heroItem.dealId && (
                <button
                  type="button"
                  onClick={() => navigateToCRM("pipeline", heroItem.dealId)}
                  className="px-3 py-2 text-meta font-bold text-ink bg-white border border-line-strong hover:bg-raised rounded-edge transition-colors cursor-pointer"
                >
                  Open Deal
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSnooze(heroItem.id)}
                className="p-2 text-ink-dim hover:text-ink hover:bg-raised rounded-edge border border-line transition-colors cursor-pointer"
                title="Dismiss or Snooze"
                aria-label="Snooze action"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-panel border border-line p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
          <CheckCircle2 className="w-6 h-6 text-brand-deep mb-1.5" />
          <h2 className="text-body font-bold text-ink">No priority action right now</h2>
          <p className="text-spec text-ink-dim mt-0.5">You're all caught up on critical customer follow-ups and deals.</p>
        </div>
      )}

      {/* 4. Single Unified Work Queue: "YOUR WORK TODAY" */}
      <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
        {/* Queue Header & Search */}
        <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper/40">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-brand-deep shrink-0" />
            <h2 className="text-lead font-bold text-ink">Your Work Today</h2>
            <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-chrome-line text-chrome-text">
              {workListItems.length} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks, accounts, deals..."
              className="text-spec px-3 py-1.5 rounded-edge border border-line bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep w-full sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-ink-dim hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Unified Work Items List */}
        <div className="divide-y divide-line">
          {workListItems.length === 0 ? (
            <div className="p-8 text-center text-ink-dim space-y-1.5">
              <CheckCircle2 className="w-7 h-7 text-brand-deep mx-auto" />
              <p className="font-bold text-body text-ink">No tasks due today</p>
              <p className="text-spec">All customer quotes, tasks, and follow-ups are up to date.</p>
            </div>
          ) : (
            <>
              {/* SECTION: DO NOW */}
              {doNowItems.length > 0 && (
                <div className="bg-urgent-wash/30">
                  <div className="px-4 py-2 bg-urgent-wash/60 border-b border-urgent/15 flex items-center justify-between text-spec font-bold text-urgent">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-urgent" />
                      <span className="uppercase tracking-[0.08em]">Do Now · Urgent &amp; High Priority</span>
                    </div>
                    <span>{doNowItems.length}</span>
                  </div>

                  <div className="divide-y divide-line">
                    {doNowItems.map((item) => (
                      <WorkItemRow
                        key={item.id}
                        item={item}
                        todayStr={todayStr}
                        onPrimaryAction={handlePrimaryAction}
                        onToggleComplete={toggleTaskComplete}
                        onSnooze={handleSnooze}
                        onNavigate={navigateToCRM}
                        onQuickLog={openQuickLog}
                        activeMenuId={activeMenuId}
                        setActiveMenuId={setActiveMenuId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: TODAY */}
              {todayItems.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-paper border-b border-line flex items-center justify-between text-spec font-bold text-ink-dim">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-soon" />
                      <span className="uppercase tracking-[0.08em]">Today · Scheduled Actions</span>
                    </div>
                    <span>{todayItems.length}</span>
                  </div>

                  <div className="divide-y divide-line">
                    {todayItems.map((item) => (
                      <WorkItemRow
                        key={item.id}
                        item={item}
                        todayStr={todayStr}
                        onPrimaryAction={handlePrimaryAction}
                        onToggleComplete={toggleTaskComplete}
                        onSnooze={handleSnooze}
                        onNavigate={navigateToCRM}
                        onQuickLog={openQuickLog}
                        activeMenuId={activeMenuId}
                        setActiveMenuId={setActiveMenuId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: LATER / WAITING */}
              {laterItems.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-paper/60 border-b border-line flex items-center justify-between text-spec font-bold text-ink-dim">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="uppercase tracking-[0.08em]">Upcoming &amp; Monitoring</span>
                    </div>
                    <span>{laterItems.length}</span>
                  </div>

                  <div className="divide-y divide-line">
                    {laterItems.map((item) => (
                      <WorkItemRow
                        key={item.id}
                        item={item}
                        todayStr={todayStr}
                        onPrimaryAction={handlePrimaryAction}
                        onToggleComplete={toggleTaskComplete}
                        onSnooze={handleSnooze}
                        onNavigate={navigateToCRM}
                        onQuickLog={openQuickLog}
                        activeMenuId={activeMenuId}
                        setActiveMenuId={setActiveMenuId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5. Today's Snapshot (Compact Footer Strip) */}
      <div className="bg-white rounded-panel border border-line p-3 sm:p-4 shadow-2xs flex items-center justify-between gap-4 flex-wrap text-meta">
        <div className="flex items-center gap-2">
          <span className="u-eyebrow text-ink-dim text-[0.625rem] tracking-[0.1em] font-bold">
            TODAY'S SNAPSHOT
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-8 flex-wrap text-spec">
          <div>
            <span className="text-ink-dim">Open Pipeline: </span>
            <strong className="text-ink">${totalPipelineValue.toLocaleString()}</strong>
            <span className="text-ink-faint text-[11px] ml-1">(${Math.round(weightedPipelineValue).toLocaleString()} wtd)</span>
          </div>

          <div>
            <span className="text-ink-dim">Needs Attention: </span>
            <strong className={atRiskDealsCount + overdueTasksCount > 0 ? "text-urgent" : "text-ink"}>
              {atRiskDealsCount + overdueTasksCount}
            </strong>
          </div>

          <div>
            <span className="text-ink-dim">Hot Leads: </span>
            <strong className="text-brand-deep">{newLeadsCount}</strong>
          </div>

          <div>
            <span className="text-ink-dim">Actions Due: </span>
            <strong className="text-ink">{unifiedWorkQueue.length}</strong>
          </div>
        </div>
      </div>

      {/* Customer Follow-Up Modal */}
      <CustomerFollowUpModal {...followUpModalProps} />
    </div>
  );
};

// Row component for fast scanning
interface WorkItemRowProps {
  item: UnifiedWorkItem;
  todayStr: string;
  onPrimaryAction: (item: UnifiedWorkItem) => void;
  onToggleComplete: (taskId: string) => void;
  onSnooze: (id: string) => void;
  onNavigate: (tab: any, id?: string) => void;
  onQuickLog: (type: "call" | "note" | "task", accountId?: string, oppId?: string) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
}

const WorkItemRow: React.FC<WorkItemRowProps> = ({
  item,
  todayStr,
  onPrimaryAction,
  onToggleComplete,
  onSnooze,
  onNavigate,
  onQuickLog,
  activeMenuId,
  setActiveMenuId
}) => {
  const isMenuOpen = activeMenuId === item.id;

  return (
    <div className="p-3 sm:p-4 hover:bg-raised/70 transition-colors flex items-start sm:items-center justify-between gap-3 relative">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Checkbox for tasks, or Priority indicator for NBAs */}
        {item.sourceType === "task" ? (
          <input
            type="checkbox"
            checked={Boolean(item.isCompleted)}
            onChange={() => onToggleComplete(item.id)}
            aria-label={`Mark "${item.title}" complete`}
            className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-line text-brand-deep focus:ring-brand cursor-pointer shrink-0"
          />
        ) : (
          <div className="mt-1 sm:mt-0 w-4 h-4 flex items-center justify-center shrink-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                item.priorityTier === "do_now"
                  ? "bg-urgent"
                  : item.priorityTier === "today"
                  ? "bg-soon"
                  : "bg-slate-400"
              }`}
            />
          </div>
        )}

        {/* Content details */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-body text-ink">{item.title}</span>

            {/* Clickable Entity Link */}
            {item.entityName && (
              <button
                type="button"
                onClick={() => {
                  if (item.entityType === "Opportunity" && item.dealId) {
                    onNavigate("pipeline", item.dealId);
                  } else if (item.entityType === "Account" && item.accountId) {
                    onNavigate("accounts", item.accountId);
                  } else if (item.entityType === "Lead" && item.entityId) {
                    onNavigate("leads", item.entityId);
                  }
                }}
                className="text-spec font-semibold text-brand-deep hover:underline bg-brand-wash px-2 py-0.2 rounded truncate max-w-xs cursor-pointer"
              >
                {item.entityName}
              </button>
            )}

            {/* Urgency Badge */}
            {item.dueDate && item.dueDate < todayStr && (
              <span className="text-[11px] font-bold text-urgent bg-urgent-wash px-1.5 py-0.2 rounded">
                Overdue ({formatHumanDate(item.dueDate)})
              </span>
            )}
            {item.category && (
              <span className="text-[11px] font-medium text-ink-dim bg-paper px-1.5 py-0.2 rounded hidden md:inline">
                {item.category}
              </span>
            )}
          </div>

          <p className="text-spec text-ink-dim line-clamp-1">
            {item.context}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
        <button
          type="button"
          onClick={() => onPrimaryAction(item)}
          className="px-3 py-1.5 text-spec font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash/80 transition-colors flex items-center gap-1 cursor-pointer"
        >
          {item.primaryActionType === "followup" && <Mail className="w-3.5 h-3.5" />}
          {item.primaryActionType === "call" && <Phone className="w-3.5 h-3.5" />}
          <span>{item.primaryActionLabel}</span>
        </button>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
            aria-label="More actions"
            className="p-1.5 text-ink-dim hover:text-ink hover:bg-paper rounded-edge border border-transparent hover:border-line transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-edge border border-line shadow-lg py-1 z-30 text-meta">
              <button
                type="button"
                onClick={() => {
                  onQuickLog("call", item.accountId, item.dealId);
                  setActiveMenuId(null);
                }}
                className="w-full px-3 py-1.5 text-left text-ink hover:bg-hover flex items-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-brand-deep" />
                <span>Log Call</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickLog("note", item.accountId, item.dealId);
                  setActiveMenuId(null);
                }}
                className="w-full px-3 py-1.5 text-left text-ink hover:bg-hover flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-ink-dim" />
                <span>Add Note</span>
              </button>
              <button
                type="button"
                onClick={() => onSnooze(item.id)}
                className="w-full px-3 py-1.5 text-left text-ink-dim hover:text-ink hover:bg-hover flex items-center gap-2 cursor-pointer border-t border-line"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss / Snooze</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};