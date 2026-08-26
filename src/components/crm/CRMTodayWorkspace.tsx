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
import { StatStrip } from "../ui/Surface";
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
            <Phone className="w-3.5 h-3.5 text-hold" />
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

      {/* Headline figures — one plane, not four cards */}
      <StatStrip
        cells={[
          {
            value: `$${totalPipelineValue.toLocaleString()}`,
            label: "Open pipeline",
            note: `$${Math.round(weightedPipelineValue).toLocaleString()} weighted forecast`,
            tone: "neutral"
          },
          {
            value: atRiskDeals.length + overdueTasks.length,
            label: "Needs attention",
            note: `${atRiskDeals.length} stalled · ${overdueTasks.length} overdue tasks`,
            tone: "urgent"
          },
          {
            value: newHotLeads.length,
            label: "Hot inbound leads",
            note: "High-intent council & civil projects",
            tone: "soon"
          },
          {
            value: nextBestActions.length,
            label: "Next best actions",
            note: "Ranked by deal value and time in stage",
            tone: "brand"
          }
        ]}
      />

      {/* Main Grid: Priority Actions vs Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Next Best Actions & Deals Requiring Attention */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Best Actions Section */}
          <div className="bg-white rounded-panel border border-hold shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-hold/80 via-white to-white px-5 py-4 border-b border-hold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-hold rounded-edge text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-body">Recommended Next Actions</h2>
                  <p className="text-meta text-ink-dim">Prioritised sales follow-ups and customer activities</p>
                </div>
              </div>
              <span className="text-meta font-medium text-hold bg-hold-wash px-2 py-0.5 rounded-full">
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
                              ? "bg-urgent-wash text-urgent"
                              : "bg-soon-wash text-soon"
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
                        <span className="font-medium text-hold">Why:</span> {action.reason}
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
                        className="px-3 py-1.5 text-meta font-semibold text-hold bg-hold-wash border border-hold rounded-edge hover:bg-hold-wash transition-colors flex items-center gap-1"
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
                <AlertTriangle className="w-4 h-4 text-soon" />
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
                        <span className="text-meta font-bold px-2 py-0.5 rounded-full bg-urgent-wash text-urgent">
                          {deal.dealHealth}
                        </span>
                        <span className="text-meta text-ink-dim">{deal.accountName}</span>
                        <span className="text-meta text-ink-faint">·</span>
                        <span className="text-meta text-ink-dim">{deal.stageName}</span>
                      </div>
                      <div className="text-body font-semibold">{deal.name}</div>
                      <div className="text-meta text-urgent">
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
                  <div className="text-spec font-bold uppercase tracking-wider text-urgent flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Overdue ({overdueTasks.length})
                  </div>
                  {overdueTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-urgent-wash border border-urgent rounded-edge text-meta space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => toggleTaskComplete(t.id)}
                          className="mt-0.5 w-4 h-4 rounded border border-urgent bg-white flex items-center justify-center hover:bg-urgent-wash"
                        >
                          {t.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 text-urgent" />}
                        </button>
                        <div className="flex-1 font-semibold text-urgent">{t.title}</div>
                      </div>
                      <div className="text-spec text-urgent pl-6">
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
                <Flame className="w-4 h-4 text-urgent" />
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
                    <span className="text-spec font-bold px-2 py-0.5 bg-urgent-wash text-urgent rounded-full">
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
