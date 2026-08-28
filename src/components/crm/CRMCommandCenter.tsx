import React, { Suspense, lazy, useState, useRef, useEffect } from "react";
import {
  Sun,
  Building2,
  Kanban,
  Flame,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
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

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const overdueCount = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < new Date().toISOString().split("T")[0]
  ).length;

  const hotLeadsCount = leads.filter(
    (l) => l.leadStatus !== "Converted" && l.leadStatus !== "Unqualified" && l.leadScore >= 70
  ).length;

  const isMoreTabActive = activeCRMTab === "tasks" || activeCRMTab === "competitor-pricing";

  return (
    <div className="min-h-screen bg-raised">
      {/* Top CRM Navigation Bar - No Horizontal Swiping */}
      <div className="bg-white border-b border-line sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-11">
            
            {/* Unified Non-Duplicated CRM Destination Navigation */}
            <div className="flex items-center gap-1 py-1">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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

              {/* Direct Desktop Tab: Tasks & Log */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("tasks")}
                className={`hidden lg:flex px-2.5 py-1 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer ${
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

              {/* Direct Desktop Tab: Competitor Intel */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("competitor-pricing")}
                className={`hidden lg:flex px-2.5 py-1 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "competitor-pricing"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Competitor Intel ({competitorPricingRecords.length})</span>
              </button>

              {/* Mobile / Tablet Responsive More Menu (< 1024px) */}
              <div className="relative lg:hidden" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isMoreTabActive
                      ? "bg-brand-deep text-white shadow-xs"
                      : "text-ink-dim hover:text-ink hover:bg-paper border border-line"
                  }`}
                  aria-expanded={isMoreMenuOpen}
                  aria-label="More CRM destinations"
                >
                  <span>{activeCRMTab === "tasks" ? "Tasks" : activeCRMTab === "competitor-pricing" ? "Intel" : "More"}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-edge border border-line shadow-lg py-1 z-30 text-spec">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCRMTab("tasks");
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer ${
                        activeCRMTab === "tasks" ? "bg-brand-wash text-brand-deep font-bold" : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep" />
                        <span>Tasks &amp; Log</span>
                      </div>
                      {overdueCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-urgent text-white font-bold">
                          {overdueCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveCRMTab("competitor-pricing");
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer ${
                        activeCRMTab === "competitor-pricing" ? "bg-brand-wash text-brand-deep font-bold" : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-deep" />
                        <span>Competitor Intel</span>
                      </div>
                      <span className="text-[10px] font-bold text-ink-dim">
                        {competitorPricingRecords.length}
                      </span>
                    </button>

                    <div className="border-t border-line my-1"></div>

                    <button
                      type="button"
                      onClick={() => {
                        openQuickLog("call");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-ink hover:bg-hover flex items-center gap-2 cursor-pointer font-bold text-brand-deep"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Quick Log Interaction</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Button on Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
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
