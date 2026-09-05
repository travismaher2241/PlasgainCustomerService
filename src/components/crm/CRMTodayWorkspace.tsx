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
  Clock3,
  PhoneCall,
  Mic
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CustomerFollowUpModal, CustomerFollowUpModalProps } from "../CustomerFollowUpModal";
import { CRMIntelligenceEngine } from "../../utils/crmIntelligence";
import { NextBestActionItem, CRMOpportunity, CRMTask, CRMLead, CRMActionPayload } from "../../types/crm";
import { executeCRMAction, ActionDispatchContext } from "../../utils/copilotActionDispatcher";

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
  actionPayload?: CRMActionPayload;
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
    contacts,
    tasks,
    activities,
    nextBestActions,
    toggleTaskComplete,
    navigateToCRM,
    setSelectedCrmOpportunityId,
    setSelectedAccountId,
    openQuickLog,
    openVoiceCapture,
    openInboundEmailModal,
    openCallPrep,
    openEmailComposer,
    openScheduleMeeting,
    addTask,
    updateOpportunity,
    showToast,
    currentUser,
    competitorAlerts,
    markCompetitorAlertRead,
    unreadCompetitorAlertsCount
  } = useApp();

  const dispatchContext: ActionDispatchContext = useMemo(() => ({
    openEmailComposer,
    openScheduleMeeting,
    openQuickLog,
    addTask,
    updateOpportunity,
    navigateToCRM,
    setSelectedAccountId,
    setSelectedOpportunityId: setSelectedCrmOpportunityId,
    showToast,
    currentUser,
    accounts,
    crmOpportunities,
    contacts
  }), [
    openEmailComposer,
    openScheduleMeeting,
    openQuickLog,
    addTask,
    updateOpportunity,
    navigateToCRM,
    setSelectedAccountId,
    setSelectedCrmOpportunityId,
    showToast,
    currentUser,
    accounts,
    crmOpportunities,
    contacts
  ]);

  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());

  // Follow-up modal state
  const [followUpModalProps, setFollowUpModalProps] = useState<CustomerFollowUpModalProps>({
    isOpen: false,
    onClose: () => setFollowUpModalProps((prev) => ({ ...prev, isOpen: false }))
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const formattedToday = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  // Calculate Metrics for Snapshot
  const overdueTasksCount = useMemo(() => {
    return tasks.filter(
      (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr
    ).length;
  }, [tasks, todayStr]);

  const dueTodayTasksCount = useMemo(() => {
    return tasks.filter(
      (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate === todayStr
    ).length;
  }, [tasks, todayStr]);

  const quotesAwaitingCount = useMemo(() => {
    return crmOpportunities.filter(
      (d) => d.quoteStatus === "Sent" && d.stageId !== "stage-won" && d.stageId !== "stage-lost"
    ).length;
  }, [crmOpportunities]);

  const highPriorityNBACount = useMemo(() => {
    return nextBestActions.filter((a) => a.urgency === "Immediate").length;
  }, [nextBestActions]);

  // Unified Action Queue
  const workItems = useMemo<UnifiedWorkItem[]>(() => {
    const items: UnifiedWorkItem[] = [];

    // 1. Next Best Actions (exclude task-based actions since tasks are included directly in section 2)
    nextBestActions
      .filter((nba) => nba.category !== "Overdue Task" && nba.relatedEntityType !== "Task")
      .forEach((nba) => {
      let tier: PriorityTier = "normal";
      if (nba.urgency === "Immediate") tier = "do_now";
      else if (nba.urgency === "Today") tier = "today";

      let actType: UnifiedWorkItem["primaryActionType"] = "followup";
      if (nba.category === "Quote Follow-up") {
        actType = "followup";
      } else if (nba.category === "Decision Maker") {
        actType = "call";
      } else if (nba.category === "Stalled Deal") {
        actType = "open";
      } else if (nba.category === "Overdue Task") {
        actType = "complete";
      }

      const urgency: UnifiedWorkItem["urgency"] =
        nba.urgency === "Immediate" ? "Immediate" : nba.urgency === "Today" ? "Today" : "Normal";

      items.push({
        id: nba.id,
        sourceType: "nba",
        title: nba.title,
        entityName: nba.relatedEntityName || (nba.relatedEntityType === "Lead" ? "Lead Record" : "Customer Record"),
        entityType: nba.relatedEntityType,
        entityId: nba.relatedEntityId,
        accountId: nba.relatedEntityType === "Account" ? nba.relatedEntityId : undefined,
        dealId: nba.relatedEntityType === "Opportunity" ? nba.relatedEntityId : undefined,
        context: nba.description,
        reason: nba.reason,
        urgency,
        priorityTier: tier,
        category: nba.category,
        primaryActionType: actType,
        primaryActionLabel: nba.actionLabel || "Review & Follow Up",
        actionPayload: nba.actionPayload
      });
    });

    // 2. Open Tasks
    tasks
      .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
      .forEach((task) => {
        const isOverdue = task.dueDate < todayStr;
        const isToday = task.dueDate === todayStr;

        let tier: PriorityTier = "normal";
        if (isOverdue || task.priority === "Urgent") tier = "do_now";
        else if (isToday || task.priority === "High") tier = "today";

        items.push({
          id: task.id,
          sourceType: "task",
          title: task.title,
          entityName: task.accountName || "General Task",
          entityType: "Task",
          entityId: task.id,
          accountId: task.accountId,
          context: task.notes || `Task assigned to ${task.assignedTo || "rep"}`,
          urgency: isOverdue ? "Immediate" : isToday ? "Today" : "Normal",
          priorityTier: tier,
          dueDate: task.dueDate,
          category: task.type || "Task",
          primaryActionType: "complete",
          primaryActionLabel: "Complete Task"
        });
      });

    // 3. New / Hot Leads
    leads
      .filter((l) => l.leadStatus === "New" && l.leadScore >= 60)
      .forEach((lead) => {
        items.push({
          id: lead.id,
          sourceType: "lead",
          title: `Qualify Lead: ${lead.leadName}`,
          entityName: lead.company || lead.contactName,
          entityType: "Lead",
          entityId: lead.id,
          context: lead.notes || `${lead.enquiryType} · Score: ${lead.leadScore}`,
          urgency: lead.leadScore >= 80 ? "Immediate" : "Today",
          priorityTier: lead.leadScore >= 80 ? "do_now" : "today",
          dueDate: todayStr,
          category: "Inbound Lead",
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          primaryActionType: "call",
          primaryActionLabel: "Qualify Lead"
        });
      });

    // Filter out snoozed items and sort by priority tier
    const tierOrder: Record<PriorityTier, number> = {
      do_now: 0,
      today: 1,
      normal: 2,
      waiting: 3
    };

    return items
      .filter((item) => !snoozedIds.has(item.id))
      .sort((a, b) => tierOrder[a.priorityTier] - tierOrder[b.priorityTier]);
  }, [nextBestActions, tasks, leads, todayStr, snoozedIds]);

  // Filtered Queue
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (item.title || "").toLowerCase().includes(q) ||
        (item.entityName || "").toLowerCase().includes(q) ||
        (item.context || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === "overdue") return item.dueDate && item.dueDate < todayStr;
      if (activeFilter === "followups") return (item.category || "").toLowerCase().includes("follow");
      if (activeFilter === "quotes") return (item.category || "").toLowerCase().includes("quote");
      if (activeFilter === "leads") return item.sourceType === "lead";
      return true;
    });
  }, [workItems, searchQuery, activeFilter, todayStr]);

  // Handle Primary Item Action
  const handleItemAction = (item: UnifiedWorkItem) => {
    if (item.sourceType === "task") {
      toggleTaskComplete(item.id);
      return;
    }

    if (item.sourceType === "nba") {
      // 1-Tap Execution for NBA Action Payloads
      if (item.actionPayload) {
        const res = executeCRMAction(item.actionPayload, dispatchContext);
        if (res.success) return;
      }

      if (item.entityType === "Opportunity" && item.entityId) {
        setSelectedCrmOpportunityId(item.entityId);
        navigateToCRM("pipeline", item.entityId);
        return;
      }
      if (item.entityType === "Account" && item.entityId) {
        setSelectedAccountId(item.entityId);
        navigateToCRM("accounts", item.entityId);
        return;
      }
      if (item.entityType === "Lead") {
        navigateToCRM("leads", item.entityId);
        return;
      }
      if (item.entityType === "Task" && item.entityId) {
        toggleTaskComplete(item.entityId);
        return;
      }
    }

    if (item.dealId) {
      setSelectedCrmOpportunityId(item.dealId);
      navigateToCRM("pipeline", item.dealId);
      return;
    }

    if (item.accountId) {
      setSelectedAccountId(item.accountId);
      navigateToCRM("accounts", item.accountId);
      return;
    }

    if (item.sourceType === "lead") {
      navigateToCRM("leads", item.entityId);
      return;
    }

    if (item.primaryActionType === "call") {
      openQuickLog({ type: "call", accountId: item.accountId, opportunityId: item.dealId });
    }
  };

  const hasAnyCrmRecords = accounts.length > 0 || crmOpportunities.length > 0 || tasks.length > 0 || leads.length > 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* COMPACT PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Today</h1>
          <p className="text-spec text-ink-dim mt-0.5">{formattedToday}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openInboundEmailModal()}
            className="px-3 py-1.5 bg-paper hover:bg-raised text-body border border-line rounded-edge text-spec font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Ingest inbound client email response"
          >
            <Mail className="w-3.5 h-3.5 text-brand-deep" />
            <span>Ingest Email</span>
          </button>

          <button
            type="button"
            onClick={() => openVoiceCapture()}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-edge text-spec font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Voice Capture: Log visit or call from the ute"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-700" />
            <span>Voice Log</span>
          </button>

          {/* THIN SUMMARY METRIC STRIP (PART B) */}
          {hasAnyCrmRecords && workItems.length > 0 && (
            <div className="flex items-center gap-3 text-spec bg-white px-3 py-1.5 rounded-edge border border-line shadow-2xs">
              {overdueTasksCount > 0 && (
                <span className="font-bold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{overdueTasksCount} overdue</span>
                </span>
              )}
              {dueTodayTasksCount > 0 && (
                <span className="font-semibold text-amber-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{dueTodayTasksCount} due today</span>
                </span>
              )}
              {quotesAwaitingCount > 0 && (
                <span className="font-medium text-body flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-brand-deep" />
                  <span>{quotesAwaitingCount} quotes pending</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EMPTY STATES (PART B) */}
      {!hasAnyCrmRecords ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
          <Sun className="w-10 h-10 text-ink-faint mx-auto" />
          <h2 className="text-base font-bold text-body">No sales activity has been created yet</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            Create an account, enquiry, or deal to begin populating your daily action queue.
          </p>
        </div>
      ) : workItems.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-body">Nothing needs attention right now</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            All customer follow-ups, quotation deadlines, and tasks are up to date.
          </p>
        </div>
      ) : (
        /* POPULATED ACTION QUEUE */
        <div className="space-y-3">
          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-spec">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-edge font-bold transition-colors cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-chrome text-white"
                    : "bg-white text-ink-dim hover:text-body border border-line"
                }`}
              >
                All ({workItems.length})
              </button>

              {overdueTasksCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("overdue")}
                  className={`px-2.5 py-1 rounded-edge font-bold transition-colors cursor-pointer ${
                    activeFilter === "overdue"
                      ? "bg-red-700 text-white"
                      : "bg-white text-red-700 hover:bg-red-50 border border-red-200"
                  }`}
                >
                  Overdue ({overdueTasksCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveFilter("followups")}
                className={`px-2.5 py-1 rounded-edge font-bold transition-colors cursor-pointer ${
                  activeFilter === "followups"
                    ? "bg-chrome text-white"
                    : "bg-white text-ink-dim hover:text-body border border-line"
                }`}
              >
                Follow-ups
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("quotes")}
                className={`px-2.5 py-1 rounded-edge font-bold transition-colors cursor-pointer ${
                  activeFilter === "quotes"
                    ? "bg-chrome text-white"
                    : "bg-white text-ink-dim hover:text-body border border-line"
                }`}
              >
                Quotes
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <input
                type="text"
                placeholder="Search action queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-3 py-1 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
              />
            </div>
          </div>

          {/* ACTIONABLE QUEUE ROWS (TOP RECOMMENDATION INTEGRATED AT TOP!) */}
          <div className="divide-y divide-line border border-line rounded-panel bg-white shadow-2xs overflow-hidden">
            {filteredWorkItems.map((item, index) => {
              const isTopRecommendation = index === 0 && activeFilter === "all" && !searchQuery;
              const isOverdue = item.dueDate && item.dueDate < todayStr;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemAction(item)}
                  className={`p-3.5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTopRecommendation
                      ? "bg-amber-50/60 hover:bg-amber-50/90 border-l-4 border-l-amber-500"
                      : isOverdue
                      ? "bg-red-50/30 hover:bg-red-50/60 border-l-4 border-l-red-500"
                      : "hover:bg-raised/60 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isTopRecommendation && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-amber-200 text-amber-950 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-700" />
                          <span>Top Priority</span>
                        </span>
                      )}

                      {isOverdue && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                          Overdue
                        </span>
                      )}

                      <h3 className="font-bold text-body text-spec truncate">{item.title}</h3>
                    </div>

                    <p className="text-xs text-ink-dim truncate">
                      <strong>{item.entityName}</strong> · {item.context}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                    {item.dueDate && (
                      <span className={`text-xs font-mono font-medium ${isOverdue ? "text-red-700 font-bold" : "text-ink-dim"}`}>
                        {formatHumanDate(item.dueDate)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemAction(item);
                      }}
                      className={`px-3 py-1 rounded-edge text-xs font-bold transition-colors cursor-pointer ${
                        item.sourceType === "task"
                          ? "bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300"
                          : "bg-brand-deep hover:bg-brand text-white shadow-2xs"
                      }`}
                    >
                      {item.primaryActionLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {followUpModalProps.isOpen && (
        <CustomerFollowUpModal {...followUpModalProps} />
      )}
    </div>
  );
};