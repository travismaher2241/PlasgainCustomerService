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
const CRMAnalyticsView = lazy(() => import("./CRMAnalyticsView").then(m => ({ default: m.CRMAnalyticsView })));

export const CRMCommandCenter: React.FC = () => {
  const {
    activeCRMTab,
    setActiveCRMTab,
    accounts,
    crmOpportunities,
    leads,
    tasks,
    nextBestActions,
    openQuickLog
  } = useApp();

  const overdueCount = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < new Date().toISOString().split("T")[0]
  ).length;

  const hotLeadsCount = leads.filter(
    (l) => l.leadStatus !== "Converted" && l.leadStatus !== "Unqualified" && l.leadScore >= 70
  ).length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top CRM Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left CRM Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2">
              <button
                onClick={() => setActiveCRMTab("today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCRMTab === "today"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Today / Focus
                {nextBestActions.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "today" ? "bg-emerald-800 text-emerald-100" : "bg-indigo-100 text-indigo-800 font-bold"}`}>
                    {nextBestActions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCRMTab("accounts")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCRMTab === "accounts"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Accounts 360° ({accounts.length})
              </button>

              <button
                onClick={() => setActiveCRMTab("pipeline")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCRMTab === "pipeline"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                Deals Pipeline ({crmOpportunities.filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost").length})
              </button>

              <button
                onClick={() => setActiveCRMTab("leads")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCRMTab === "leads"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Leads Hub
                {hotLeadsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "leads" ? "bg-emerald-800 text-emerald-100" : "bg-rose-100 text-rose-800 font-bold"}`}>
                    {hotLeadsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCRMTab("tasks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCRMTab === "tasks"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tasks & Log
                {overdueCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "tasks" ? "bg-emerald-800 text-emerald-100" : "bg-rose-100 text-rose-800 font-bold"}`}>
                    {overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCRMTab("analytics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeCRMTab === "analytics"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Forecasting
              </button>
            </div>

            {/* Quick Action Button */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => openQuickLog("call")}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Phone className="w-3 h-3 text-emerald-700" />
                Quick Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main CRM Tab View Render */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[300px] w-full">
              <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        >
          {activeCRMTab === "today" && <CRMTodayWorkspace />}
          {activeCRMTab === "accounts" && <CRMAccountsView />}
          {activeCRMTab === "pipeline" && <CRMPipelineView />}
          {activeCRMTab === "leads" && <CRMLeadsView />}
          {activeCRMTab === "tasks" && <CRMTasksActivitiesView />}
          {activeCRMTab === "analytics" && <CRMAnalyticsView />}
        </Suspense>
      </main>
    </div>
  );
};
