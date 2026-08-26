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
  FileText
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
    openQuickLog
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "activities">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "overdue" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

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
      assignedTo: "Marcus Vance",
      createdBy: "Marcus Vance",
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
        return <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-urgent-wash text-urgent">Urgent</span>;
      case "High":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-soon-wash text-soon">High</span>;
      case "Medium":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-hold-wash text-hold">Medium</span>;
      case "Low":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-paper">Low</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Tasks & Activity Log</h1>
          <p className="text-body text-ink-dim">
            Accountable follow-ups, scheduled milestones, and comprehensive sales touchpoint records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickLog("call")}
            className="px-3 py-2 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm"
          >
            + Log Activity
          </button>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-line text-meta font-semibold">
        <button
          onClick={() => setActiveSubTab("tasks")}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === "tasks" ? "border-brand-deep text-brand-deep" : "border-transparent text-ink-dim hover:text-ink"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Tasks & Follow-Ups ({tasks.filter((t) => t.status !== "Completed").length} pending)
        </button>
        <button
          onClick={() => setActiveSubTab("activities")}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
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
            placeholder={activeSubTab === "tasks" ? "Search tasks..." : "Search activities..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-meta bg-transparent focus:outline-none"
          />
        </div>

        {activeSubTab === "tasks" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskFilter("pending")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge ${
                taskFilter === "pending" ? "bg-chrome text-white" : "bg-paper text-body"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setTaskFilter("overdue")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge ${
                taskFilter === "overdue" ? "bg-urgent text-white" : "bg-urgent-wash text-urgent"
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setTaskFilter("completed")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge ${
                taskFilter === "completed" ? "bg-brand-deep text-white" : "bg-paper text-body"
              }`}
            >
              Completed
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeSubTab === "tasks" ? (
        <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden divide-y divide-line">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-meta text-ink-dim">No tasks match your current filter.</div>
          ) : (
            filteredTasks.map((t) => {
              const isOverdue = t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr;
              return (
                <div
                  key={t.id}
                  className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                    isOverdue ? "bg-urgent-wash" : "hover:bg-raised"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(t.id)}
                      className={`mt-0.5 w-5 h-5 rounded-edge border flex items-center justify-center transition-colors ${
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
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-ink-faint hover:text-ink-dim text-body">
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
                <label className="block font-semibold text-body mb-1">Notes & Context</label>
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
                  className="px-4 py-2 text-ink-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep"
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
