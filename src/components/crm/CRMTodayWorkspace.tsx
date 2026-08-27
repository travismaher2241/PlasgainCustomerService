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
    openQuickLog,
    competitorAlerts,
    markCompetitorAlertRead,
    unreadCompetitorAlertsCount
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
          
          {/* New Competitor Pricing Intelligence Section */}
          {competitorAlerts && competitorAlerts.length > 0 && (
            <div className="bg-white rounded-panel border border-brand-edge shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-brand-wash via-white to-white px-5 py-4 border-b border-brand-edge flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-deep rounded-edge text-white">
                    <TrendingUp className="w-4 h-4 text-cyan-200" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-body">New Competitor Pricing Intelligence</h2>
                    <p className="text-meta text-ink-dim">Market price points and competitor quotes observed by the team</p>
                  </div>
                </div>
                {unreadCompetitorAlertsCount > 0 && (
                  <span className="text-meta font-bold text-brand-deep bg-brand-wash px-2.5 py-0.5 rounded-full border border-brand-edge">
                    {unreadCompetitorAlertsCount} New Alerts
                  </span>
                )}
              </div>

              <div className="divide-y divide-line">
                {competitorAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 hover:bg-raised transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !alert.isRead ? "bg-brand-wash/15" : ""
                    }`}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-body text-meta">{alert.competitorName}</span>
                        <span className="text-spec font-mono font-semibold text-brand-deep bg-brand-wash px-2 py-0.5 rounded">
                          {alert.competitorProduct}
                        </span>
                        <span className="text-meta text-ink-dim">for <strong>{alert.accountName}</strong></span>
                      </div>
                      <p className="text-body font-bold text-brand-deep">
                        ${alert.price.toLocaleString("en-AU", { minimumFractionDigits: 2 })} {alert.priceBasis && `(${alert.priceBasis})`}
                      </p>
                      <p className="text-spec text-ink-dim">
                        {alert.message} · <span className="text-ink-faint">Observed: {new Date(alert.createdAt).toLocaleDateString("en-AU")}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          if (!alert.isRead) markCompetitorAlertRead(alert.id);
                          navigateToCRM("accounts", alert.accountId);
                        }}
                        className="px-3 py-1.5 text-meta font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Account Intel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {!alert.isRead && (
                        <button
                          onClick={() => markCompetitorAlertRead(alert.id)}
                          className="px-2.5 py-1.5 text-spec text-ink-dim hover:text-ink hover:bg-raised rounded-edge border border-line cursor-pointer font-semibold"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        Action <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deals Requiring Urgent Attention */}
          <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-urgent" />
                <h2 className="text-base font-bold text-body">Deals Requiring Attention (At Risk or Stalled)</h2>
              </div>
              <span className="text-meta font-medium text-urgent bg-urgent-wash px-2 py-0.5 rounded-full">
                {atRiskDeals.length} Deals
              </span>
            </div>

            <div className="divide-y divide-line">
              {atRiskDeals.length === 0 ? (
                <div className="p-6 text-center text-ink-dim text-meta">No at-risk deals currently. Great pipeline momentum!</div>
              ) : (
                atRiskDeals.map((deal) => (
                  <div key={deal.id} className="p-4 hover:bg-raised transition-colors flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-body text-meta">{deal.name}</span>
                        <span className="text-spec font-medium text-ink-dim bg-paper px-2 py-0.5 rounded">
                          {deal.accountName}
                        </span>
                        <span className="text-spec font-semibold px-2 py-0.5 rounded-full bg-urgent-wash text-urgent">
                          {deal.dealHealth}
                        </span>
                      </div>
                      <div className="text-spec text-ink-dim mt-1">
                        Value: <strong className="text-body">${deal.dealValue.toLocaleString()}</strong> · Stage: {deal.stageName} · In Stage: {deal.daysInCurrentStage} days
                      </div>
                    </div>

                    <button
                      onClick={() => navigateToCRM("pipeline", deal.id)}
                      className="px-3 py-1.5 text-meta font-semibold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash transition-colors flex items-center gap-1 shrink-0"
                    >
                      View Deal <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Today's Tasks, High Value Deals & Recent Activity */}
        <div className="space-y-6">
          {/* Today & Overdue Tasks */}
          <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-deep" />
                <h2 className="text-base font-bold text-body">Tasks for Today</h2>
              </div>
              <span className="text-meta font-semibold px-2 py-0.5 bg-paper text-body rounded-full">
                {todayTasks.length + overdueTasks.length} Pending
              </span>
            </div>

            <div className="divide-y divide-line max-h-72 overflow-y-auto">
              {overdueTasks.length > 0 && (
                <div className="p-2.5 bg-urgent-wash border-b border-urgent/20 text-spec font-semibold text-urgent flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {overdueTasks.length} overdue task(s) need immediate attention
                </div>
              )}

              {[...overdueTasks, ...todayTasks].length === 0 ? (
                <div className="p-6 text-center text-ink-dim text-meta">No tasks due today. Add one via Quick Log!</div>
              ) : (
                [...overdueTasks, ...todayTasks].map((task) => (
                  <div key={task.id} className="p-3 hover:bg-raised transition-colors flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === "Completed"}
                      onChange={() => toggleTaskComplete(task.id)}
                      className="mt-1 h-4 w-4 rounded border-line text-brand-deep focus:ring-brand"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-meta font-semibold text-body truncate">{task.title}</p>
                      <div className="text-spec text-ink-dim flex items-center gap-2 mt-0.5">
                        <span className={task.dueDate < todayStr ? "text-urgent font-semibold" : ""}>
                          Due: {task.dueDate}
                        </span>
                        <span>·</span>
                        <span>{task.priority} Priority</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* High Priority Opportunities */}
          <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-soon" />
                <h2 className="text-base font-bold text-body">Top High-Value Deals</h2>
              </div>
              <button
                onClick={() => navigateToCRM("pipeline")}
                className="text-spec text-brand-deep font-semibold hover:underline"
              >
                All Deals
              </button>
            </div>

            <div className="divide-y divide-line">
              {hotDeals.slice(0, 4).map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => navigateToCRM("pipeline", deal.id)}
                  className="p-3.5 hover:bg-raised transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-meta text-body truncate">{deal.name}</div>
                    <div className="text-spec text-ink-dim truncate">{deal.accountName} · {deal.stageName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-body text-meta">${deal.dealValue.toLocaleString()}</div>
                    <div className="text-spec text-brand-deep font-semibold">{deal.probability}% win prob</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink-dim" />
                <h2 className="text-base font-bold text-body">Recent Team Activities</h2>
              </div>
            </div>

            <div className="divide-y divide-line max-h-64 overflow-y-auto">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3 text-meta hover:bg-raised transition-colors space-y-1">
                  <div className="flex items-center justify-between text-spec">
                    <span className="font-semibold text-body capitalize">{act.type} · {act.accountName || "General"}</span>
                    <span className="text-ink-faint">{act.timestamp}</span>
                  </div>
                  <p className="font-medium text-body text-spec">{act.title}</p>
                  {act.description && <p className="text-spec text-ink-dim line-clamp-1">{act.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
);
};