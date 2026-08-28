import React, { Suspense, lazy } from "react";
import {
  Sun,
  Building2,
  Kanban,
  Flame,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Plus,
  Sparkles,
  Phone
} from "lucide-react";
import { useApp, CRMSubTab } from "../../context/AppContext";

const CRMTodayWorkspace = lazy(() => import("./CRMTodayWorkspace").then(m => ({ default: m.CRMTodayWorkspace })));
const CRMAccountsView = lazy(() => import("./CRMAccountsView").then(m => ({ default: m.CRMAccountsView })));
const CRMPipelineView = lazy(() => import("./CRMPipelineView").then(m => ({ default: m.CRMPipelineView })));
const CRMLeadsView = lazy(() => import("./CRMLeadsView").then(m => ({ default: m.CRMLeadsView })));
const CRMTasksActivitiesView = lazy(() => import("./CRMTasksActivitiesView").then(m => ({ default: m.CRMTasksActivitiesView })));
const CRMCompetitorPricingView = lazy(() => import("./CRMCompetitorPricingView").then(m => ({ default: m.CRMCompetitorPricingView })));

export const CRMCommandCenter: React.FC = () => {
  const {
    activeCRMTab,
    setActiveCRMTab,
    accounts,
    crmOpportunities,
    leads,
    tasks,
    nextBestActions,
    openQuickLog,
    competitorPricingRecords
  } = useApp();

  const overdueCount = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < new Date().toISOString().split("T")[0]
  ).length;

  const hotLeadsCount = leads.filter(
    (l) => l.leadStatus !== "Converted" && l.leadStatus !== "Unqualified" && l.leadScore >= 70
  ).length;

  return (
    <div className="min-h-screen bg-raised">
      {/* Top CRM Navigation Bar */}
      <div className="bg-white border-b border-line sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-11">
            {/* Left CRM Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              <button
                onClick={() => setActiveCRMTab("today")}
                className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "today"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Today's Focus</span>
                {nextBestActions.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "today" ? "bg-chrome text-white font-semibold" : "bg-line text-ink font-semibold"}`}>
                    {nextBestActions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCRMTab("accounts")}
                className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "accounts"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Accounts ({accounts.length})</span>
              </button>

              <button
                onClick={() => setActiveCRMTab("pipeline")}
                className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "pipeline"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Deals Pipeline ({crmOpportunities.filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost").length})</span>
              </button>

              <button
                onClick={() => setActiveCRMTab("leads")}
                className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "leads"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Leads Hub</span>
                {hotLeadsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "leads" ? "bg-chrome text-white font-semibold" : "bg-line text-ink font-semibold"}`}>
                    {hotLeadsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCRMTab("tasks")}
                className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "tasks"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tasks &amp; Log</span>
                {overdueCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "tasks" ? "bg-chrome text-white font-semibold" : "bg-line text-ink font-semibold"}`}>
                    {overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCRMTab("competitor-pricing")}
                className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "competitor-pricing"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Competitor Intel ({competitorPricingRecords.length})</span>
              </button>
            </div>

            {/* Quick Action Button */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => openQuickLog("call")}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-spec font-semibold text-ink bg-paper hover:bg-raised border border-line rounded-edge transition-colors cursor-pointer"
              >
                <Phone className="w-3 h-3 text-brand-deep" />
                <span>Quick Log</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main CRM Tab View Render */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[300px] w-full">
              <div className="w-7 h-7 border-3 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        >
          {activeCRMTab === "today" && <CRMTodayWorkspace />}
          {activeCRMTab === "accounts" && <CRMAccountsView />}
          {activeCRMTab === "pipeline" && <CRMPipelineView />}
          {activeCRMTab === "leads" && <CRMLeadsView />}
          {activeCRMTab === "tasks" && <CRMTasksActivitiesView />}
          {activeCRMTab === "competitor-pricing" && <CRMCompetitorPricingView />}
        </Suspense>
      </main>
    </div>
  );
};
