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

  const isMoreTabActive = activeCRMTab === "leads" || activeCRMTab === "tasks" || activeCRMTab === "competitor-pricing";

  return (
    <div className="min-h-screen bg-raised w-full min-w-0 overflow-x-hidden">
      {/* Top CRM Navigation Bar - No Horizontal Swiping */}
      <div className="bg-white border-b border-line sticky top-0 z-20 shadow-2xs w-full min-w-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full min-w-0">
          <div className="flex items-center justify-between h-11 w-full min-w-0">
            
            {/* Unified Responsive CRM Destination Navigation */}
            <div className="flex items-center gap-1 sm:gap-1.5 py-1 min-w-0 w-full sm:w-auto">
              {/* 1. Today's Focus (Always visible) */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("today")}
                className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "today"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Today's Focus</span>
                <span className="sm:hidden text-[12px]">Today</span>
                {nextBestActions.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "today" ? "bg-chrome text-white font-semibold" : "bg-line text-ink font-semibold"}`}>
                    {nextBestActions.length}
                  </span>
                )}
              </button>

              {/* 2. Accounts (Always visible) */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("accounts")}
                className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "accounts"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px] sm:text-spec">Accounts</span>
                {accounts.length > 0 && (
                  <span className="hidden sm:inline text-[11px] opacity-80">({accounts.length})</span>
                )}
              </button>

              {/* 3. Deals Pipeline (Always visible) */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("pipeline")}
                className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-edge text-spec font-bold transition-all flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "pipeline"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Kanban className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Deals Pipeline</span>
                <span className="sm:hidden text-[12px]">Deals</span>
                {crmOpportunities.filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost").length > 0 && (
                  <span className="hidden sm:inline text-[11px] opacity-80">
                    ({crmOpportunities.filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost").length})
                  </span>
                )}
              </button>

              {/* 4. Leads Hub (Desktop only; on Mobile lives in More) */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("leads")}
                className={`hidden lg:flex px-2.5 py-1 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "leads"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span>Leads Hub</span>
                {hotLeadsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "leads" ? "bg-chrome text-white font-semibold" : "bg-line text-ink font-semibold"}`}>
                    {hotLeadsCount}
                  </span>
                )}
              </button>

              {/* 5. Direct Desktop Tab: Tasks & Log */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("tasks")}
                className={`hidden lg:flex px-2.5 py-1 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "tasks"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Tasks &amp; Log</span>
                {overdueCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCRMTab === "tasks" ? "bg-chrome text-white font-semibold" : "bg-line text-ink font-semibold"}`}>
                    {overdueCount}
                  </span>
                )}
              </button>

              {/* 6. Direct Desktop Tab: Competitor Intel */}
              <button
                type="button"
                onClick={() => setActiveCRMTab("competitor-pricing")}
                className={`hidden lg:flex px-2.5 py-1 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeCRMTab === "competitor-pricing"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Competitor Intel</span>
                {competitorPricingRecords.length > 0 && (
                  <span className="text-[11px] opacity-80">({competitorPricingRecords.length})</span>
                )}
              </button>

              {/* Mobile / Tablet Responsive More Menu (< 1024px) */}
              <div className="relative lg:hidden shrink-0" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`px-2 py-1 rounded-edge text-spec font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isMoreTabActive
                      ? "bg-brand-deep text-white shadow-xs"
                      : "text-ink-dim hover:text-ink hover:bg-paper border border-line"
                  }`}
                  aria-expanded={isMoreMenuOpen}
                  aria-label="More CRM destinations"
                >
                  <span className="text-[12px] sm:text-spec">
                    {activeCRMTab === "leads"
                      ? "Leads"
                      : activeCRMTab === "tasks"
                      ? "Tasks"
                      : activeCRMTab === "competitor-pricing"
                      ? "Intel"
                      : "More"}
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 max-w-[calc(100vw-24px)] bg-surface rounded-edge border border-line shadow-lg py-1 z-30 text-spec">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCRMTab("leads");
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer ${
                        activeCRMTab === "leads" ? "bg-brand-wash text-brand-deep font-bold" : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Flame className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span className="truncate">Leads Hub</span>
                      </div>
                      {hotLeadsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-deep text-white font-bold shrink-0 ml-1">
                          {hotLeadsCount}
                        </span>
                      )}
                    </button>

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
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span className="truncate">Tasks &amp; Log</span>
                      </div>
                      {overdueCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-urgent text-white font-bold shrink-0 ml-1">
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
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span className="truncate">Competitor Intel</span>
                      </div>
                      <span className="text-[10px] font-bold text-ink-dim shrink-0 ml-1">
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
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Quick Log Interaction</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Button on Desktop */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 w-full min-w-0">
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
