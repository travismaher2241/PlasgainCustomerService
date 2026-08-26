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
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">Urgent</span>;
      case "High":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">High</span>;
      case "Medium":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">Medium</span>;
      case "Low":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">Low</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasks & Activity Log</h1>
          <p className="text-sm text-slate-600">
            Accountable follow-ups, scheduled milestones, and comprehensive sales touchpoint records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickLog("call")}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            + Log Activity
          </button>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab("tasks")}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === "tasks" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Tasks & Follow-Ups ({tasks.filter((t) => t.status !== "Completed").length} pending)
        </button>
        <button
          onClick={() => setActiveSubTab("activities")}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === "activities" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" /> All Customer Activities ({activities.length})
        </button>
      </div>

      {/* Search & Sub-filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeSubTab === "tasks" ? "Search tasks..." : "Search activities..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none"
          />
        </div>

        {activeSubTab === "tasks" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskFilter("pending")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                taskFilter === "pending" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setTaskFilter("overdue")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                taskFilter === "overdue" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800"
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setTaskFilter("completed")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                taskFilter === "completed" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Completed
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeSubTab === "tasks" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No tasks match your current filter.</div>
          ) : (
            filteredTasks.map((t) => {
              const isOverdue = t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr;
              return (
                <div
                  key={t.id}
                  className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                    isOverdue ? "bg-rose-50/40" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(t.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        t.status === "Completed"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white hover:border-emerald-500"
                      }`}
                    >
                      {t.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">{t.type}</span>
                        {getPriorityBadge(t.priority)}
                        {isOverdue && (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Overdue
                          </span>
                        )}
                        {t.accountName && (
                          <span className="text-xs font-medium text-slate-700">· {t.accountName}</span>
                        )}
                      </div>

                      <div className={`text-sm font-semibold ${t.status === "Completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {t.title}
                      </div>

                      {t.notes && <p className="text-xs text-slate-600">{t.notes}</p>}
                    </div>
                  </div>

                  <div className="text-right text-xs shrink-0 text-slate-500 space-y-0.5">
                    <div className="font-semibold text-slate-800">{t.dueDate} {t.dueTime || ""}</div>
                    <div>Assigned: {t.assignedTo.split(" ")[0]}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Activities Stream */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No activities logged yet.</div>
          ) : (
            filteredActivities.map((act) => (
              <div key={act.id} className="p-4 hover:bg-slate-50 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{act.accountName || "General Touchpoint"}</span>
                    {act.opportunityName && <span className="text-slate-400">· {act.opportunityName}</span>}
                  </div>
                  <span>{new Date(act.timestamp).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{act.title}</div>
                <p className="text-slate-600 leading-relaxed">{act.description}</p>
                <div className="text-[11px] text-slate-400">Logged by: {act.performedBy}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create Task</h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call Sarah Jenkins to review Dialux contours"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={newTaskForm.type}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, type: e.target.value as TaskType })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Review Quote">Review Quote</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as TaskPriority })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
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
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Related Account</label>
                  <select
                    value={newTaskForm.accountId}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, accountId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
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
                <label className="block font-semibold text-slate-700 mb-1">Notes & Context</label>
                <textarea
                  rows={3}
                  placeholder="Key items to mention or verify..."
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
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
