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
    currentUser,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "activities">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "overdue" | "completed">("pending");
  const [assigneeFilter, setAssigneeFilter] = useState<"mine" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const todayStr = new Date().toISOString().split("T")[0];

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
    return (
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.accountName && act.accountName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

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
    const newDueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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

                  <div className="text-right text-meta shrink-0 text-ink-dim space-y-0.5">
                    <div className="font-semibold text-body">{t.dueDate} {t.dueTime || ""}</div>
                    <div>Assigned: {t.assignedTo.split(" ")[0]}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Activities Stream */
        <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden divide-y divide-line">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-meta text-ink-dim">No activities logged yet.</div>
          ) : (
            filteredActivities.map((act) => (
              <div key={act.id} className="p-4 hover:bg-raised transition-colors space-y-1.5 text-meta">
                <div className="flex items-center justify-between text-ink-dim text-spec">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-body">{act.accountName || "General Touchpoint"}</span>
                    {act.opportunityName && <span className="text-ink-faint">· {act.opportunityName}</span>}
                  </div>
                  <span>{new Date(act.timestamp).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                <div className="text-body font-bold">{act.title}</div>
                <p className="text-ink-dim leading-relaxed">{act.description}</p>
                <div className="text-spec text-ink-faint">Logged by: {act.performedBy}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-body">Create Task</h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-ink-faint hover:text-ink-dim text-body cursor-pointer">
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
