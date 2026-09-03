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
  X,
  ChevronDown,
  ChevronUp,
  Circle
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMTask, TaskPriority, TaskType } from "../../types/crm";
import { getLocalDateInputValue } from "../../utils/dateUtils";
import { collapseDuplicateActivities, sortActivitiesChronological, formatActivityTimestamp } from "../../utils/activityUtils";

export const CRMTasksActivitiesView: React.FC = () => {
  const {
    tasks,
    activities,
    toggleTaskComplete,
    addTask,
    updateTask,
    deleteTask,
    accounts,
    crmOpportunities,
    setSelectedAccountId,
    setSelectedCrmOpportunityId,
    navigateToCRM,
    openQuickLog,
    currentUser,
    teamMembers,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "activities">("tasks");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"open" | "completed" | "all">("open");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Activity tab state
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activityUserFilter, setActivityUserFilter] = useState("all");
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());

  const todayStr = getLocalDateInputValue();

  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    type: "Call" as TaskType,
    priority: "High" as TaskPriority,
    dueDate: todayStr,
    accountId: accounts[0]?.id || "",
    notes: ""
  });

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const isCompleted = t.status === "Completed";
    if (taskStatusFilter === "open" && isCompleted) return false;
    if (taskStatusFilter === "completed" && !isCompleted) return false;

    if (taskPriorityFilter !== "all" && t.priority !== taskPriorityFilter) return false;

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.accountName && t.accountName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Filter & Group Activities
  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter !== "all" && act.type !== activityTypeFilter) return false;
    if (activityUserFilter !== "all" && act.performedBy?.toLowerCase() !== activityUserFilter.toLowerCase()) return false;

    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (act.accountName && act.accountName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (act.performedBy && act.performedBy.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const sortedActivities = sortActivitiesChronological(collapseDuplicateActivities(filteredActivities), "newest");

  // Group activities by date
  const groupedActivities = sortedActivities.reduce((acc, act) => {
    const d = act.timestamp ? act.timestamp.split("T")[0] : "Recent";
    let groupLabel = d;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (d === todayStr) groupLabel = "Today";
    else if (d === yesterday) groupLabel = "Yesterday";

    if (!acc[groupLabel]) acc[groupLabel] = [];
    acc[groupLabel].push(act);
    return acc;
  }, {} as Record<string, typeof sortedActivities>);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    const acc = accounts.find((a) => a.id === newTaskForm.accountId);

    const newTask: CRMTask = {
      id: `task-${Date.now()}`,
      title: newTaskForm.title,
      type: newTaskForm.type,
      priority: newTaskForm.priority,
      status: "Pending",
      dueDate: newTaskForm.dueDate,
      dueTime: "10:00 AM",
      accountId: acc?.id,
      accountName: acc?.name,
      notes: newTaskForm.notes,
      assignedTo: currentUser.name,
      createdAt: new Date().toISOString()
    };

    addTask(newTask);
    setIsNewTaskModalOpen(false);
    showToast(`Task "${newTask.title}" added!`, "success");
  };

  const handleBatchComplete = () => {
    selectedTaskIds.forEach((id) => toggleTaskComplete(id));
    setSelectedTaskIds([]);
    setIsBulkSelectMode(false);
    showToast(`Marked ${selectedTaskIds.length} tasks as complete!`, "success");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER & SUB-TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Tasks</h1>
          <div className="flex items-center rounded-edge border border-line overflow-hidden text-spec font-bold bg-white">
            <button
              type="button"
              onClick={() => setActiveSubTab("tasks")}
              className={`px-3 py-1 cursor-pointer transition-colors ${
                activeSubTab === "tasks" ? "bg-brand-deep text-white" : "text-ink-dim hover:text-body"
              }`}
            >
              Tasks ({tasks.filter((t) => t.status !== "Completed").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("activities")}
              className={`px-3 py-1 cursor-pointer transition-colors ${
                activeSubTab === "activities" ? "bg-brand-deep text-white" : "text-ink-dim hover:text-body"
              }`}
            >
              Activity Log ({activities.length})
            </button>
          </div>
        </div>

        {activeSubTab === "tasks" ? (
          <button
            type="button"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add task</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openQuickLog({ isOpen: true, type: "call" })}
            className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Phone className="w-4 h-4" />
            <span>Log activity</span>
          </button>
        )}
      </div>

      {/* 1. TASKS VIEW (PART E) */}
      {activeSubTab === "tasks" && (
        <div className="space-y-3">
          {/* TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-panel border border-line shadow-2xs">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
                />
              </div>

              {/* STATUS FILTER */}
              <div className="flex items-center rounded-edge border border-line overflow-hidden text-spec font-medium bg-paper/60">
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("open")}
                  className={`px-2.5 py-1 text-xs cursor-pointer ${
                    taskStatusFilter === "open" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("completed")}
                  className={`px-2.5 py-1 text-xs cursor-pointer ${
                    taskStatusFilter === "completed" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
                  }`}
                >
                  Completed
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("all")}
                  className={`px-2.5 py-1 text-xs cursor-pointer ${
                    taskStatusFilter === "all" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
                  }`}
                >
                  All
                </button>
              </div>

              {/* PRIORITY FILTER */}
              <select
                aria-label="Filter by priority"
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* BULK SELECT TOGGLE (PART E: PREVENTS AMBIGUITY!) */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isBulkSelectMode && selectedTaskIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchComplete}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-edge transition-colors cursor-pointer"
                >
                  Complete ({selectedTaskIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsBulkSelectMode(!isBulkSelectMode);
                  setSelectedTaskIds([]);
                }}
                className={`px-2.5 py-1 text-xs rounded-edge border transition-colors cursor-pointer font-bold ${
                  isBulkSelectMode ? "bg-brand-wash border-brand-edge text-brand-deep" : "border-line bg-white text-ink-dim hover:text-body"
                }`}
              >
                {isBulkSelectMode ? "Done Selecting" : "Select Tasks"}
              </button>
            </div>
          </div>

          {/* TASK ROWS */}
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="text-base font-bold text-body">No tasks match your filter</h2>
              <p className="text-spec text-ink-dim max-w-md mx-auto">
                All open tasks have been completed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line border border-line rounded-panel bg-white shadow-2xs overflow-hidden">
              {filteredTasks.map((task) => {
                const isOverdue = task.status !== "Completed" && task.dueDate < todayStr;
                const isSelected = selectedTaskIds.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 transition-colors flex items-center justify-between gap-3 ${
                      isOverdue ? "bg-red-50/25 hover:bg-red-50/50" : "hover:bg-raised/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* BULK SELECTION CHECKBOX (ONLY SHOWN IN EXPLICIT SELECT MODE!) */}
                      {isBulkSelectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) setSelectedTaskIds(selectedTaskIds.filter((id) => id !== task.id));
                            else setSelectedTaskIds([...selectedTaskIds, task.id]);
                          }}
                          className="rounded text-brand-deep focus:ring-brand-deep cursor-pointer"
                        />
                      )}

                      {/* SINGLE TASK COMPLETION CONTROL */}
                      <button
                        type="button"
                        onClick={() => toggleTaskComplete(task.id)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          task.status === "Completed"
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-line hover:border-emerald-600 bg-white"
                        }`}
                        title={task.status === "Completed" ? "Mark incomplete" : "Complete task"}
                      >
                        {task.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold text-body text-spec truncate ${
                              task.status === "Completed" ? "line-through text-ink-dim" : ""
                            }`}
                          >
                            {task.title}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              task.priority === "Urgent"
                                ? "bg-red-100 text-red-800"
                                : task.priority === "High"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-line text-ink-dim"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <p className="text-xs text-ink-dim truncate mt-0.5">
                          {task.accountName && (
                            <span
                              onClick={() => {
                                if (task.accountId) {
                                  setSelectedAccountId(task.accountId);
                                  navigateToCRM("accounts");
                                }
                              }}
                              className="font-semibold text-body hover:underline cursor-pointer mr-1.5"
                            >
                              {task.accountName}
                            </span>
                          )}
                          {task.notes && <span>· {task.notes}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-mono font-medium ${isOverdue ? "text-red-700 font-bold" : "text-ink-dim"}`}>
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ACTIVITY LOG VIEW (PART F) */}
      {activeSubTab === "activities" && (
        <div className="space-y-3">
          {/* TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-panel border border-line shadow-2xs">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search activity log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                aria-label="Filter by team member"
                value={activityUserFilter}
                onChange={(e) => setActivityUserFilter(e.target.value)}
                className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
              >
                <option value="all">All Team Members</option>
                {teamMembers.map((m) => (
                  <option key={m.id || m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by activity type"
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
              >
                <option value="all">All Types</option>
                <option value="call">Calls</option>
                <option value="email">Emails</option>
                <option value="meeting">Meetings</option>
                <option value="note">Notes</option>
              </select>
            </div>
          </div>

          {/* GROUPED ACTIVITY FEED (PART F) */}
          {Object.keys(groupedActivities).length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
              <Clock className="w-10 h-10 text-ink-faint mx-auto" />
              <h2 className="text-base font-bold text-body">No activity logged</h2>
              <p className="text-spec text-ink-dim max-w-md mx-auto">
                Log calls, notes, or meetings to record customer discussions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedActivities).map(([dayLabel, dayActs]) => (
                <div key={dayLabel} className="space-y-2">
                  <span className="text-xs font-bold text-ink-dim uppercase tracking-wider block pl-1">
                    {dayLabel}
                  </span>

                  <div className="divide-y divide-line border border-line rounded-panel bg-white shadow-2xs overflow-hidden">
                    {dayActs.map((act) => {
                      const isExpanded = expandedActivityIds.has(act.id);
                      const isCall = act.type === "call" || act.title.toLowerCase().includes("call");

                      return (
                        <div key={act.id} className="p-3.5 hover:bg-raised/40 transition-colors space-y-1 text-spec">
                          <div className="flex items-center justify-between text-xs text-ink-dim flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isCall ? "bg-sky-50 text-sky-800 border border-sky-200" :
                                act.type === "email" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                                "bg-paper text-ink-dim border border-line"
                              }`}>
                                {isCall ? "📞 Call" : act.type.replace("_", " ")}
                              </span>
                              <span className="font-medium text-body">
                                Logged by <strong className="text-brand-deep">{act.performedBy || "Sales Rep"}</strong>
                              </span>
                            </div>
                            <span className="font-mono text-ink-dim">{formatActivityTimestamp(act.timestamp)}</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-body">{act.title}</p>
                            {act.accountName && (
                              <span
                                onClick={() => {
                                  if (act.accountId) {
                                    setSelectedAccountId(act.accountId);
                                    navigateToCRM("accounts");
                                  }
                                }}
                                className="text-xs font-semibold text-brand-deep hover:underline cursor-pointer"
                              >
                                @ {act.accountName}
                              </span>
                            )}
                          </div>

                          {act.description && (
                            <div>
                              <p className={`text-xs text-ink-dim leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                                {act.description}
                              </p>
                              {act.description.length > 120 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = new Set(expandedActivityIds);
                                    if (isExpanded) next.delete(act.id);
                                    else next.add(act.id);
                                    setExpandedActivityIds(next);
                                  }}
                                  className="text-[11px] font-bold text-brand-deep hover:underline mt-0.5 cursor-pointer"
                                >
                                  {isExpanded ? "Show less" : "Read full note..."}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NEW TASK MODAL */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="new-task-title" className="font-bold text-body text-base">Add New Task</h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-spec font-bold mb-1">Task Title *</label>
                <input
                  required
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. Issue luminaire photometric schedule"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Account</label>
                  <select
                    value={newTaskForm.accountId}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, accountId: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option value="">No specific account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-spec font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  />
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Priority</label>
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as any })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                >
                  <option>Urgent</option>
                  <option>High</option>
                  <option>Normal</option>
                  <option>Low</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Save Task
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
