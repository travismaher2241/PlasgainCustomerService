import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  User,
  Building2,
  Layers,
  Sparkles,
  FileText,
  CheckSquare,
  Square,
  CalendarPlus,
  Trash2,
  X
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMTask, TaskPriority, TaskType } from "../../types/crm";

import { getLocalDateInputValue, addDaysLocal } from "../../utils/dateUtils";
import { collapseDuplicateActivities, sortActivitiesChronological } from "../../utils/activityUtils";

export const CRMTasksActivitiesView: React.FC = () => {
  const {
    tasks,
    activities,
    toggleTaskComplete,
    addTask,
    updateTask,
    accounts,
    crmOpportunities,
    openQuickLog,
    openCallPrep,
    currentUser,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "activities">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "overdue" | "completed">("pending");
  const [assigneeFilter, setAssigneeFilter] = useState<"mine" | "all">("all");
  const [activitySortOrder, setActivitySortOrder] = useState<"newest" | "oldest">("newest");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [activityAccountFilter, setActivityAccountFilter] = useState<string>("all");
  const [activityOwnerFilter, setActivityOwnerFilter] = useState<string>("all");
  const [activityPage, setActivityPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const ACTIVITY_PAGE_SIZE = 15;

  // Australia/Sydney timezone-aware today string (P1-03)
  const todayStr = getLocalDateInputValue();

  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    type: "Call" as TaskType,
    priority: "High" as TaskPriority,
    dueDate: todayStr,
    dueTime: "10:00 AM",
    accountId: accounts[0]?.id || "",
    notes: ""
  });

  const filteredTasks = tasks.filter((t) => {
    const isOverdue = t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.accountName && t.accountName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (taskFilter === "pending") return t.status !== "Completed" && t.status !== "Cancelled";
    if (taskFilter === "overdue") return isOverdue;
    if (taskFilter === "completed") return t.status === "Completed";
    return true;
  });

  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.accountName && act.accountName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = activityTypeFilter === "all" || act.type === activityTypeFilter;
    const matchesAccount = activityAccountFilter === "all" || act.accountId === activityAccountFilter;
    const matchesOwner = activityOwnerFilter === "all" || (act.performedBy && act.performedBy.toLowerCase().includes(activityOwnerFilter.toLowerCase()));

    return matchesSearch && matchesType && matchesAccount && matchesOwner;
  });

  const collapsedActivities = collapseDuplicateActivities(filteredActivities);
  const sortedActivities = sortActivitiesChronological(collapsedActivities, activitySortOrder);
  const totalActivityPages = Math.max(1, Math.ceil(sortedActivities.length / ACTIVITY_PAGE_SIZE));
  const paginatedActivities = sortedActivities.slice(
    (activityPage - 1) * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE
  );

  // FEAT-04: Batch Actions
  const handleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleToggleSelectTask = (id: string) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter((taskId) => taskId !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleBatchComplete = () => {
    selectedTaskIds.forEach((id) => {
      updateTask(id, { status: "Completed" });
    });
    showToast(`Marked ${selectedTaskIds.length} tasks as Completed!`, "success");
    setSelectedTaskIds([]);
  };

  const handleBatchPostpone = (days: number) => {
    const newDueDate = addDaysLocal(days);
    selectedTaskIds.forEach((id) => {
      updateTask(id, { dueDate: newDueDate, isOverdue: false });
    });
    showToast(`Postponed ${selectedTaskIds.length} tasks to ${newDueDate}`, "success");
    setSelectedTaskIds([]);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    const acc = accounts.find((a) => a.id === newTaskForm.accountId);

    addTask({
      title: newTaskForm.title,
      type: newTaskForm.type,
      status: "To Do",
      priority: newTaskForm.priority,
      dueDate: newTaskForm.dueDate,
      dueTime: newTaskForm.dueTime,
      accountId: acc?.id,
      accountName: acc?.name,
      assignedTo: currentUser.name,
      createdBy: currentUser.name,
      notes: newTaskForm.notes,
      isOverdue: newTaskForm.dueDate < todayStr
    });

    setIsNewTaskModalOpen(false);
    setNewTaskForm({
      title: "",
      type: "Call",
      priority: "High",
      dueDate: todayStr,
      dueTime: "10:00 AM",
      accountId: accounts[0]?.id || "",
      notes: ""
    });
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "Urgent":
        return <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-urgent-wash text-urgent border border-urgent/30">Urgent</span>;
      case "High":
        return <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-warn-wash text-warn border border-warn/30">High</span>;
      case "Medium":
        return <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-paper text-ink-dim border border-line">Medium</span>;
      case "Low":
        return <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-paper text-ink-faint">Low</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Tasks &amp; Activity Stream</h1>
          <p className="text-meta text-ink-dim">
            Manage daily follow-up cadences, tender milestones, call logs, and customer touchpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Main Sub-Tabs */}
      <div className="flex items-center gap-6 border-b border-line text-meta font-bold">
        <button
          onClick={() => setActiveSubTab("tasks")}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === "tasks" ? "border-brand-deep text-brand-deep" : "border-transparent text-ink-dim hover:text-ink"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Tasks &amp; Follow-Ups ({tasks.filter((t) => t.status !== "Completed").length} pending)
        </button>
        <button
          onClick={() => setActiveSubTab("activities")}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === "activities" ? "border-brand-deep text-brand-deep" : "border-transparent text-ink-dim hover:text-ink"
          }`}
        >
          <Layers className="w-4 h-4" /> All Customer Activities ({activities.length})
        </button>
      </div>

      {/* Search & Sub-filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-panel border border-line shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-faint" />
          <input
            type="text"
            placeholder={activeSubTab === "tasks" ? "Search tasks by title, account..." : "Search activities..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-meta bg-transparent focus:outline-none"
          />
        </div>

        {activeSubTab === "tasks" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskFilter("pending")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge cursor-pointer ${
                taskFilter === "pending" ? "bg-chrome text-white" : "bg-paper text-body hover:bg-raised"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setTaskFilter("overdue")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge cursor-pointer ${
                taskFilter === "overdue" ? "bg-urgent text-white" : "bg-urgent-wash text-urgent hover:bg-urgent-wash/80"
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setTaskFilter("completed")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge cursor-pointer ${
                taskFilter === "completed" ? "bg-brand-deep text-white" : "bg-paper text-body hover:bg-raised"
              }`}
            >
              Completed
            </button>
          </div>
        )}
      </div>

      {/* FEAT-04: Bulk Action Toolbar */}
      {activeSubTab === "tasks" && selectedTaskIds.length > 0 && (
        <div className="bg-chrome text-white px-4 py-3 rounded-panel flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="font-bold text-spec bg-brand px-2.5 py-0.5 rounded-full text-white">
              {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? "s" : ""} Selected
            </span>
            <span className="text-spec text-white/80">Batch Actions:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchComplete}
              className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Completed</span>
            </button>
            <button
              onClick={() => handleBatchPostpone(3)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-spec rounded-edge flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Postpone +3 Days</span>
            </button>
            <button
              onClick={() => handleBatchPostpone(7)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-spec rounded-edge flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Postpone +1 Week</span>
            </button>
            <button
              onClick={() => setSelectedTaskIds([])}
              className="p-1.5 text-white/60 hover:text-white rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeSubTab === "tasks" ? (
        <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden divide-y divide-line">
          {/* Header row with Select All */}
          {filteredTasks.length > 0 && (
            <div className="p-3 bg-paper flex items-center justify-between text-spec font-bold text-ink-dim uppercase border-b border-line">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded accent-brand-deep cursor-pointer w-4 h-4"
                  title="Select all filtered tasks"
                />
                <span>Select All ({filteredTasks.length} tasks)</span>
              </div>
              <div>Due Date &amp; Owner</div>
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-meta text-ink-dim">No tasks match your current filter.</div>
          ) : (
            filteredTasks.map((t) => {
              const isOverdue = t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr;
              const isSelected = selectedTaskIds.includes(t.id);

              return (
                <div
                  key={t.id}
                  className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                    isSelected ? "bg-brand-wash/40" : isOverdue ? "bg-urgent-wash" : "hover:bg-raised"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox for Bulk Selection */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectTask(t.id)}
                      className="mt-1 rounded accent-brand-deep cursor-pointer w-4 h-4"
                    />

                    {/* Checkbox for Single Task Completion */}
                    <button
                      onClick={() => toggleTaskComplete(t.id)}
                      className={`mt-0.5 w-5 h-5 rounded-edge border flex items-center justify-center transition-colors cursor-pointer ${
                        t.status === "Completed"
                          ? "bg-brand-deep border-brand-deep text-white"
                          : "border-line-strong bg-white hover:border-brand"
                      }`}
                    >
                      {t.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-meta font-semibold text-ink-dim">{t.type}</span>
                        {getPriorityBadge(t.priority)}
                        {isOverdue && (
                          <span className="text-spec font-bold text-urgent bg-urgent-wash px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Overdue
                          </span>
                        )}
                        {t.accountName && (
                          <span className="text-meta font-medium">· {t.accountName}</span>
                        )}
                      </div>

                      <div className={`text-body font-semibold ${t.status === "Completed" ? "line-through text-ink-faint" : "text-body"}`}>
                        {t.title}
                      </div>

                      {t.notes && <p className="text-meta text-ink-dim">{t.notes}</p>}
                    </div>
                  </div>

                  <div className="text-right text-meta shrink-0 text-ink-dim space-y-1">
                    <div className="font-semibold text-body">{t.dueDate} {t.dueTime || ""}</div>
                    <div>Assigned: {t.assignedTo.split(" ")[0]}</div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      {(t.type === "Call" || t.title.toLowerCase().includes("call")) && (
                        <button
                          type="button"
                          onClick={() => openCallPrep({
                            accountId: t.accountId,
                            opportunityId: t.dealId || t.opportunityId,
                            taskId: t.id,
                            taskTitle: t.title
                          })}
                          className="px-2 py-0.5 text-spec font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded hover:bg-brand-wash/80 transition-colors cursor-pointer"
                          title="Prep call talking points"
                        >
                          Prep Call
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openQuickLog(t.type === "Call" ? "call" : "task", t.accountId, t.dealId || t.opportunityId)}
                        className="px-2 py-0.5 text-spec font-semibold text-ink bg-white border border-line rounded hover:bg-raised transition-colors cursor-pointer"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Activities Stream with Multi-Criteria Filters & Pagination (P1) */
        <div className="space-y-3">
          {/* Multi-Criteria Filter Bar */}
          <div className="bg-white p-3 rounded-panel border border-line shadow-2xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 text-spec">
                <span className="font-bold text-ink-dim uppercase">Filters:</span>

                {/* Activity Type Filter */}
                <select
                  value={activityTypeFilter}
                  onChange={(e) => {
                    setActivityTypeFilter(e.target.value);
                    setActivityPage(1);
                  }}
                  className="bg-surface border border-line-strong rounded px-2.5 py-1 text-ink font-medium cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="call">Calls</option>
                  <option value="email">Emails</option>
                  <option value="meeting">Meetings</option>
                  <option value="note">Notes</option>
                  <option value="quote_sent">Quotes Sent</option>
                  <option value="task">Tasks</option>
                </select>

                {/* Account Filter */}
                <select
                  value={activityAccountFilter}
                  onChange={(e) => {
                    setActivityAccountFilter(e.target.value);
                    setActivityPage(1);
                  }}
                  className="bg-surface border border-line-strong rounded px-2.5 py-1 text-ink font-medium cursor-pointer max-w-[180px] truncate"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>

                {/* Owner Filter */}
                <select
                  value={activityOwnerFilter}
                  onChange={(e) => {
                    setActivityOwnerFilter(e.target.value);
                    setActivityPage(1);
                  }}
                  className="bg-surface border border-line-strong rounded px-2.5 py-1 text-ink font-medium cursor-pointer"
                >
                  <option value="all">All Reps</option>
                  <option value="Travis">Travis Maher</option>
                  <option value="Sarah">Sarah Reed</option>
                  <option value="Rob">Rob Mitchell</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-spec text-ink-dim">Sort:</span>
                <button
                  type="button"
                  onClick={() => setActivitySortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                  aria-label={`Sort activity history: currently ${activitySortOrder === "newest" ? "newest first" : "oldest first"}`}
                  className="px-2.5 py-1 text-spec font-bold rounded bg-surface border border-line hover:bg-raised text-brand-deep cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  {activitySortOrder === "newest" ? "Newest First ▾" : "Oldest First ▴"}
                </button>
              </div>
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden divide-y divide-line">
            {paginatedActivities.length === 0 ? (
              <div className="p-8 text-center text-meta text-ink-dim">No activities match your current filter.</div>
            ) : (
              paginatedActivities.map((act) => (
                <div key={act.id} className="p-4 hover:bg-raised transition-colors space-y-2 text-meta">
                  <div className="flex items-center justify-between text-ink-dim text-spec flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-body text-ink">{act.accountName || "General Touchpoint"}</span>
                      {act.opportunityName && <span className="text-ink-faint">· {act.opportunityName}</span>}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-raised text-ink border border-line uppercase">
                        {act.type}
                      </span>
                    </div>
                    <span>{new Date(act.timestamp).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>

                  <div className="text-body font-bold text-ink">{act.title}</div>
                  <p className="text-ink-dim leading-relaxed">{act.description}</p>

                  <div className="flex items-center justify-between text-spec pt-1 flex-wrap gap-2 border-t border-line/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(act.outcome || act.metadata?.outcome) && (
                        <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                          Outcome: {act.outcome || act.metadata?.outcome}
                        </span>
                      )}
                      {act.nextAction && (
                        <span className="text-brand-deep bg-brand-wash border border-brand-edge px-2 py-0.5 rounded font-semibold text-[11px]">
                          Next: {act.nextAction}
                        </span>
                      )}
                    </div>
                    <div className="text-ink-faint text-[11px]">
                      Logged by: <strong className="text-ink">{act.performedBy}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Activity Pagination Controls */}
          {totalActivityPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-panel border border-line text-spec font-medium">
              <span className="text-ink-dim">
                Showing {((activityPage - 1) * ACTIVITY_PAGE_SIZE) + 1}–{Math.min(activityPage * ACTIVITY_PAGE_SIZE, filteredActivities.length)} of {filteredActivities.length} activities
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activityPage <= 1}
                  onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-line disabled:opacity-40 hover:bg-raised cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="font-bold text-ink">
                  {activityPage} / {totalActivityPages}
                </span>
                <button
                  type="button"
                  disabled={activityPage >= totalActivityPages}
                  onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                  className="px-3 py-1 rounded border border-line disabled:opacity-40 hover:bg-raised cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-title"
          className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="create-task-title" className="text-lg font-bold text-body">Create Task</h3>
              <button
                type="button"
                onClick={() => setIsNewTaskModalOpen(false)}
                aria-label="Close modal"
                className="text-ink-faint hover:text-ink-dim text-body cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-meta">
              <div>
                <label className="block font-semibold text-body mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call Sarah Jenkins to review Dialux contours"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Task Type</label>
                  <select
                    value={newTaskForm.type}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, type: e.target.value as TaskType })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Review Quote">Review Quote</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as TaskPriority })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Related Account</label>
                  <select
                    value={newTaskForm.accountId}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, accountId: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="">None / General</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Notes &amp; Context</label>
                <textarea
                  rows={3}
                  placeholder="Key items to mention or verify..."
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
