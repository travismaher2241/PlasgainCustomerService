import React, { useState } from "react";
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
  Layers,
  ChevronRight,
  Phone,
  Plus
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMIntelligenceEngine } from "../../utils/crmIntelligence";

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
    openQuickLog
  } = useApp();

  const [filterOwner, setFilterOwner] = useState<string>("all");
  const todayStr = new Date().toISOString().split("T")[0];

  // Metrics
  const totalPipelineValue = crmOpportunities
    .filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost")
    .reduce((sum, d) => sum + (d.dealValue || 0), 0);

  const weightedPipelineValue = crmOpportunities
    .filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost")
    .reduce((sum, d) => sum + ((d.dealValue || 0) * (d.probability || 0)) / 100, 0);

  const overdueTasks = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr
  );

  const todayTasks = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate === todayStr
  );

  const hotDeals = crmOpportunities
    .filter(
      (d) =>
        d.stageId !== "stage-won" &&
        d.stageId !== "stage-lost" &&
        ((d.dealValue >= 50000 && d.probability >= 50) || d.stageId === "stage-negotiation" || d.stageId === "stage-review")
    )
    .sort((a, b) => b.dealValue - a.dealValue);

  const atRiskDeals = crmOpportunities.filter(
    (d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost" && (d.dealHealth === "At Risk" || d.dealHealth === "Stalled")
  );

  const newHotLeads = leads.filter(
    (l) => l.leadStatus !== "Converted" && l.leadStatus !== "Unqualified" && l.leadScore >= 70
  );

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Greetings */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-meta font-semibold bg-brand-wash text-brand-deep border border-brand-edge">
              <Sun className="w-3.5 h-3.5 text-brand-deep" />
              Sales Command Centre
            </span>
            <span className="text-meta text-ink-dim">
              {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-body tracking-tight">
            Today's Focus & Action Center
          </h1>
          <p className="text-body text-ink-dim mt-0.5">
            Answer the 5 daily questions: Who needs me? What deals matter? What needs to happen next?
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openQuickLog("call")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            + Log Call
          </button>
          <button
            onClick={() => openQuickLog("task")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep" />
            + New Task
          </button>
          <button
            onClick={() => navigateToCRM("pipeline")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            View Pipeline
          </button>
        </div>
      </div>

      {/* Top 4 Essential KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-ink-dim text-meta font-medium mb-1">
            <span>Open Pipeline</span>
            <DollarSign className="w-4 h-4 text-brand-deep" />
          </div>
          <div className="text-2xl font-bold text-body">
            ${totalPipelineValue.toLocaleString()}
          </div>
          <div className="text-meta text-ink-dim mt-1 flex items-center gap-1">
            <span className="font-semibold text-brand-deep">${Math.round(weightedPipelineValue).toLocaleString()}</span>
            <span>weighted forecast</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-ink-dim text-meta font-medium mb-1">
            <span>Needs Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {atRiskDeals.length + overdueTasks.length}
          </div>
          <div className="text-meta text-ink-dim mt-1">
            {atRiskDeals.length} stalled deals · {overdueTasks.length} overdue tasks
          </div>
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-ink-dim text-meta font-medium mb-1">
            <span>Hot Inbound Leads</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {newHotLeads.length}
          </div>
          <div className="text-meta text-ink-dim mt-1">
            High-intent council & civil projects
          </div>
        </div>

        <div className="bg-white p-4 rounded-panel border border-line shadow-sm">
          <div className="flex items-center justify-between text-ink-dim text-meta font-medium mb-1">
            <span>Next Best Actions</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {nextBestActions.length}
          </div>
          <div className="text-meta text-ink-dim mt-1">
            AI & rule-based priority items
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Actions vs Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Next Best Actions & Deals Requiring Attention */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Best Actions Section */}
          <div className="bg-white rounded-panel border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50/80 via-white to-white px-5 py-4 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-edge text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-body">Next Best Actions Engine</h2>
                  <p className="text-meta text-ink-dim">Transparent AI & rule-grounded recommendations</p>
                </div>
              </div>
              <span className="text-meta font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                {nextBestActions.length} Priority Items
              </span>
            </div>

            <div className="divide-y divide-line">
              {nextBestActions.length === 0 ? (
                <div className="p-8 text-center text-ink-dim text-body">
                  <CheckCircle2 className="w-8 h-8 text-brand mx-auto mb-2" />
                  All active deals and tasks have up-to-date next actions. Great job!
                </div>
              ) : (
                nextBestActions.map((action) => (
                  <div key={action.id} className="p-4 hover:bg-raised transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-spec font-semibold px-2 py-0.5 rounded-full ${
                            action.urgency === "Immediate"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {action.urgency}
                        </span>
                        <span className="text-meta font-medium text-ink-dim bg-paper px-2 py-0.5 rounded">
                          {action.category}
                        </span>
                        <span className="text-meta font-semibold">{action.relatedEntityName}</span>
                      </div>
                      <p className="text-body font-semibold">{action.title}</p>
                      <p className="text-meta text-ink-dim">{action.description}</p>
                      <p className="text-spec text-ink-dim italic flex items-center gap-1">
                        <span className="font-medium text-indigo-600">Why:</span> {action.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          if (action.relatedEntityType === "Opportunity") {
                            navigateToCRM("pipeline", action.relatedEntityId);
                          } else if (action.relatedEntityType === "Account") {
                            navigateToCRM("accounts", action.relatedEntityId);
                          } else if (action.relatedEntityType === "Lead") {
                            navigateToCRM("leads", action.relatedEntityId);
                          } else {
                            navigateToCRM("tasks");
                          }
                        }}
                        className="px-3 py-1.5 text-meta font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-edge hover:bg-indigo-100 transition-colors flex items-center gap-1"
                      >
                        {action.actionLabel}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deals Needing Attention / Stalled Deals */}
          <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-body">Deals Requiring Attention</h2>
              </div>
              <button
                onClick={() => navigateToCRM("pipeline")}
                className="text-meta text-brand-deep hover:text-brand-deep font-medium flex items-center gap-0.5"
              >
                View all pipeline <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-line">
              {atRiskDeals.length === 0 ? (
                <div className="p-6 text-center text-ink-dim text-body">
                  No deals flagged as At Risk or Stalled. Pipeline health is strong.
                </div>
              ) : (
                atRiskDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => navigateToCRM("pipeline", deal.id)}
                    className="p-4 hover:bg-raised transition-colors cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-meta font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {deal.dealHealth}
                        </span>
                        <span className="text-meta text-ink-dim">{deal.accountName}</span>
                        <span className="text-meta text-ink-faint">·</span>
                        <span className="text-meta text-ink-dim">{deal.stageName}</span>
                      </div>
                      <div className="text-body font-semibold">{deal.name}</div>
                      <div className="text-meta text-rose-700">
                        {deal.dealHealthReasons.join(" · ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-body font-bold">${deal.dealValue.toLocaleString()}</div>
                      <div className="text-meta text-ink-dim">{deal.probability}% probability</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hot Deals to Close */}
          <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-brand-deep" />
                <h2 className="text-base font-bold text-body">Hot Opportunities in Final Stages</h2>
              </div>
              <span className="text-meta text-ink-dim">{hotDeals.length} deals</span>
            </div>
            <div className="divide-y divide-line">
              {hotDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => navigateToCRM("pipeline", deal.id)}
                  className="p-4 hover:bg-raised transition-colors cursor-pointer flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-meta font-medium text-ink-dim">{deal.accountName}</div>
                    <div className="text-body font-semibold">{deal.name}</div>
                    <div className="text-meta text-brand-deep font-medium mt-0.5">
                      Next: {deal.nextAction || "Follow up on closing date"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-body font-bold text-brand-deep">${deal.dealValue.toLocaleString()}</div>
                    <div className="text-meta text-ink-dim">Close: {deal.expectedCloseDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tasks Due Today, Overdue Follow-ups, and Activity Stream */}
        <div className="space-y-6">
          {/* Tasks & Follow-ups */}
          <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-body" />
                <h2 className="text-base font-bold text-body">Tasks & Follow-Ups</h2>
              </div>
              <button
                onClick={() => openQuickLog("task")}
                className="text-meta text-brand-deep hover:text-brand-deep font-semibold"
              >
                + Add Task
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Overdue */}
              {overdueTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="text-spec font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Overdue ({overdueTasks.length})
                  </div>
                  {overdueTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-rose-50/70 border border-rose-200 rounded-edge text-meta space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => toggleTaskComplete(t.id)}
                          className="mt-0.5 w-4 h-4 rounded border border-rose-400 bg-white flex items-center justify-center hover:bg-rose-100"
                        >
                          {t.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                        </button>
                        <div className="flex-1 font-semibold text-rose-950">{t.title}</div>
                      </div>
                      <div className="text-spec text-rose-700 pl-6">
                        Due: {t.dueDate} · {t.accountName || "General"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Due Today */}
              <div className="space-y-2 pt-2">
                <div className="text-spec font-bold uppercase tracking-wider text-ink-dim">
                  Due Today / Upcoming
                </div>
                {todayTasks.length === 0 && overdueTasks.length === 0 ? (
                  <div className="text-meta text-ink-dim italic py-2">No pending tasks for today.</div>
                ) : (
                  todayTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-raised border border-line rounded-edge text-meta space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => toggleTaskComplete(t.id)}
                          className="mt-0.5 w-4 h-4 rounded border border-line-strong bg-white flex items-center justify-center hover:bg-brand-wash"
                        >
                          {t.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep" />}
                        </button>
                        <div className="flex-1 font-semibold text-body">{t.title}</div>
                      </div>
                      <div className="text-spec text-ink-dim pl-6">
                        {t.dueTime ? `${t.dueTime} · ` : ""}
                        {t.accountName || "General"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Inbound Leads Requiring Response */}
          <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h2 className="text-base font-bold text-body">Inbound Leads</h2>
              </div>
              <button
                onClick={() => navigateToCRM("leads")}
                className="text-meta text-brand-deep hover:text-brand-deep font-medium"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-line">
              {newHotLeads.map((l) => (
                <div
                  key={l.id}
                  onClick={() => navigateToCRM("leads", l.id)}
                  className="p-3.5 hover:bg-raised transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-meta font-bold">{l.company}</span>
                    <span className="text-spec font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                      Score: {l.leadScore}
                    </span>
                  </div>
                  <div className="text-meta text-ink-dim">{l.contactName} · {l.enquiryType}</div>
                  <div className="text-spec text-ink-dim">Est. ${l.estimatedValue.toLocaleString()} · {l.location}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Customer Activity */}
          <div className="bg-white rounded-panel border border-line shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-ink-dim" />
                <h2 className="text-base font-bold text-body">Recent Activity</h2>
              </div>
              <button
                onClick={() => openQuickLog("note")}
                className="text-meta text-ink-dim hover:text-ink font-medium"
              >
                + Note
              </button>
            </div>
            <div className="divide-y divide-line">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3 text-meta space-y-1">
                  <div className="flex items-center justify-between text-ink-dim text-spec">
                    <span className="font-semibold text-body">{act.accountName || "System"}</span>
                    <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="font-medium text-body">{act.title}</div>
                  <div className="text-ink-dim text-spec line-clamp-2">{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
