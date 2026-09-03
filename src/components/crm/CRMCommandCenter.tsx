import React, { Suspense, lazy, useState, useRef, useEffect } from "react";
import {
  Sun,
  Building2,
  Kanban,
  Flame,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  Phone,
  Plus
} from "lucide-react";
import { useApp, CRMSubTab } from "../../context/AppContext";
import { ErrorBoundary } from "../ErrorBoundary";

const CRMTodayWorkspace = lazy(() =>
  import("./CRMTodayWorkspace").then((m) => ({ default: m.CRMTodayWorkspace }))
);
const CRMAccountsView = lazy(() =>
  import("./CRMAccountsView").then((m) => ({ default: m.CRMAccountsView }))
);
const CRMPipelineView = lazy(() =>
  import("./CRMPipelineView").then((m) => ({ default: m.CRMPipelineView }))
);
const CRMLeadsView = lazy(() =>
  import("./CRMLeadsView").then((m) => ({ default: m.CRMLeadsView }))
);
const CRMTasksActivitiesView = lazy(() =>
  import("./CRMTasksActivitiesView").then((m) => ({ default: m.CRMTasksActivitiesView }))
);
const CRMCompetitorPricingView = lazy(() =>
  import("./CRMCompetitorPricingView").then((m) => ({ default: m.CRMCompetitorPricingView }))
);

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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const overdueCount = tasks.filter(
    (t) =>
      t.status !== "Completed" &&
      t.status !== "Cancelled" &&
      t.dueDate < new Date().toISOString().split("T")[0]
  ).length;

  const hotLeadsCount = leads.filter(
    (l) =>
      l.leadStatus !== "Converted" &&
      l.leadStatus !== "Unqualified" &&
      l.leadScore >= 70
  ).length;

  const isMoreTabActive =
    activeCRMTab === "leads" ||
    activeCRMTab === "tasks" ||
    activeCRMTab === "competitor-pricing";

  return (
    <div className="min-h-screen bg-raised w-full min-w-0 overflow-x-hidden">
      {/* Top CRM Navigation Bar */}
      <div className="bg-white border-b border-line sticky top-0 z-20 shadow-2xs w-full min-w-0">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 w-full min-w-0">
          <div className="flex items-center justify-between h-11 w-full min-w-0 gap-1.5 sm:gap-2">
            {/* Unified Standardised CRM Navigation (PART A) */}
            <nav
              aria-label="CRM Navigation"
              className="flex-1 flex items-center gap-1 sm:gap-1.5 py-1 min-w-0 overflow-visible md:overflow-x-auto md:scrollbar-none"
            >
              {/* 1. Today */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "today"}
                onClick={() => {
                  setActiveCRMTab("today");
                  setIsMoreMenuOpen(false);
                }}
                className={`flex-1 md:flex-initial h-8 px-2 sm:px-2.5 rounded-edge text-xs sm:text-spec font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "today"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>Today</span>
                {nextBestActions.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeCRMTab === "today"
                        ? "bg-chrome text-white font-semibold"
                        : "bg-line text-ink font-semibold"
                    }`}
                  >
                    {nextBestActions.length}
                  </span>
                )}
              </button>

              {/* 2. Accounts */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "accounts"}
                onClick={() => {
                  setActiveCRMTab("accounts");
                  setIsMoreMenuOpen(false);
                }}
                className={`flex-1 md:flex-initial h-8 px-2 sm:px-2.5 rounded-edge text-xs sm:text-spec font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "accounts"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Accounts</span>
              </button>

              {/* 3. Deals */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "pipeline"}
                onClick={() => {
                  setActiveCRMTab("pipeline");
                  setIsMoreMenuOpen(false);
                }}
                className={`flex-1 md:flex-initial h-8 px-2 sm:px-2.5 rounded-edge text-xs sm:text-spec font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "pipeline"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Kanban className="w-3.5 h-3.5 shrink-0" />
                <span>Deals</span>
              </button>

              {/* 4. Leads (Desktop) */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "leads"}
                onClick={() => setActiveCRMTab("leads")}
                className={`hidden md:flex h-8 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "leads"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span>Leads</span>
                {hotLeadsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeCRMTab === "leads"
                        ? "bg-chrome text-white font-semibold"
                        : "bg-line text-ink font-semibold"
                    }`}
                  >
                    {hotLeadsCount}
                  </span>
                )}
              </button>

              {/* 5. Tasks (Desktop) */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "tasks"}
                onClick={() => setActiveCRMTab("tasks")}
                className={`hidden md:flex h-8 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "tasks"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Tasks</span>
                {overdueCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeCRMTab === "tasks"
                        ? "bg-chrome text-white font-semibold"
                        : "bg-urgent text-white font-semibold"
                    }`}
                  >
                    {overdueCount}
                  </span>
                )}
              </button>

              {/* 6. Competitors (Desktop) */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "competitor-pricing"}
                onClick={() => setActiveCRMTab("competitor-pricing")}
                className={`hidden md:flex h-8 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "competitor-pricing"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Competitors</span>
              </button>

              {/* Mobile More dropdown (< 768px) */}
              <div className="relative md:hidden flex-1 shrink-0" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMoreMenuOpen((prev) => !prev);
                  }}
                  className={`w-full h-8 px-2 rounded-edge text-xs sm:text-spec font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                    isMoreTabActive
                      ? "bg-brand-deep text-white shadow-xs"
                      : "text-ink-dim hover:text-ink hover:bg-paper border border-line"
                  }`}
                  aria-expanded={isMoreMenuOpen}
                  aria-label="More CRM destinations"
                >
                  <span>
                    {activeCRMTab === "leads"
                      ? "Leads"
                      : activeCRMTab === "tasks"
                      ? "Tasks"
                      : activeCRMTab === "competitor-pricing"
                      ? "Competitors"
                      : "More"}
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>

                {isMoreMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-edge border border-line shadow-xl py-1 z-50 text-spec"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCRMTab("leads");
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer ${
                        activeCRMTab === "leads"
                          ? "bg-brand-wash text-brand-deep font-bold"
                          : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Flame className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span>Leads</span>
                      </div>
                      {hotLeadsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-deep text-white font-bold">
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
                        activeCRMTab === "tasks"
                          ? "bg-brand-wash text-brand-deep font-bold"
                          : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span>Tasks</span>
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
                        activeCRMTab === "competitor-pricing"
                          ? "bg-brand-wash text-brand-deep font-bold"
                          : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span>Competitors</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Quick Log Action (Always visible) */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => openQuickLog({ isOpen: true, type: "call" })}
                className="h-8 px-2.5 sm:px-3 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-xs sm:text-spec transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Quick Log Call, Email, Meeting, or Note"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Log</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main CRM Tab Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 w-full min-w-0">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="p-12 text-center text-spec text-ink-dim flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                <span>Loading workspace...</span>
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
        </ErrorBoundary>
      </main>
    </div>
  );
};
