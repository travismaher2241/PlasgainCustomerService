import React, { Suspense, lazy, useState, useRef, useEffect } from "react";
import {
  Sun,
  Building2,
  Kanban,
  Calendar,
  Flame,
  CheckCircle2,
  TrendingUp,
  Trophy,
  FileText,
  ChevronDown,
  Phone,
  Plus,
  Mic,
  Sparkles,
  Mail
} from "lucide-react";
import { useApp, CRMSubTab } from "../../context/AppContext";
import { ErrorBoundary } from "../ErrorBoundary";
import { getNextDayMeetings } from "../../utils/crmMeetingPreparation";
import { countOutstandingQuotes } from "../../utils/winLossPatterns";

const CRMTodayWorkspace = lazy(() =>
  import("./CRMTodayWorkspace").then((m) => ({ default: m.CRMTodayWorkspace }))
);
const CRMAccountsView = lazy(() =>
  import("./CRMAccountsView").then((m) => ({ default: m.CRMAccountsView }))
);
const CRMPipelineView = lazy(() =>
  import("./CRMPipelineView").then((m) => ({ default: m.CRMPipelineView }))
);
const CRMCalendarView = lazy(() =>
  import("./CRMCalendarView").then((m) => ({ default: m.CRMCalendarView }))
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
const CRMWinPatternsView = lazy(() =>
  import("./CRMWinPatternsView").then((m) => ({ default: m.CRMWinPatternsView }))
);

/** Every tab that renders its own view; anything else falls back to Today. */
const CRM_TABS_WITH_VIEWS: CRMSubTab[] = [
  "today",
  "accounts",
  "pipeline",
  "calendar",
  "leads",
  "tasks",
  "competitor-pricing",
  "win-patterns"
];

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
    openVoiceCapture,
    openEnquiryParser,
    openQuoteImport,
    openInboundEmailModal,
    competitorPricingRecords
  } = useApp();

  const [isLogMenuOpen, setIsLogMenuOpen] = useState(false);
  const logMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (logMenuRef.current && !logMenuRef.current.contains(event.target as Node)) {
        setIsLogMenuOpen(false);
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

  const outstandingQuotesCount = countOutstandingQuotes(crmOpportunities);

  const tomorrowMeetingsCount = getNextDayMeetings(tasks).length;

  return (
    <div className="min-h-screen bg-raised w-full min-w-0 overflow-x-hidden">
      {/* Top CRM Navigation Bar */}
      <div className="bg-white border-b border-line sticky top-0 z-20 shadow-2xs w-full min-w-0">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 w-full min-w-0">
          <div className="flex items-center justify-between h-14 w-full min-w-0 gap-1.5 sm:gap-2">
            {/* Unified Standardised CRM Navigation */}
            <nav
              aria-label="CRM Navigation"
              className="flex-1 flex items-center gap-1 sm:gap-1.5 py-1 min-w-0 overflow-x-auto scrollbar-none no-scrollbar flex-nowrap"
            >
              {/* 1. Today */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "today"}
                onClick={() => {
                  setActiveCRMTab("today");
                }}
                className={`h-11 px-2 sm:px-2.5 rounded-edge text-xs sm:text-spec font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
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
                }}
                className={`h-11 px-2 sm:px-2.5 rounded-edge text-xs sm:text-spec font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "accounts"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Accounts</span>
              </button>

              {/* 3. Outstanding Quotes (Desktop) — in the More menu on mobile.
                  Today and Accounts are the only two tabs that fit a 320px
                  phone once More and Log are pinned; anything else here is
                  rendered as a clipped half-word. */}
              <button
                type="button"
                role="tab"
                aria-label="Outstanding Quotes"
                aria-selected={activeCRMTab === "pipeline"}
                onClick={() => {
                  setActiveCRMTab("pipeline");
                }}
                className={`hidden lg:flex h-8 px-2.5 rounded-edge text-spec font-bold transition-all items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "pipeline"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Kanban className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <span>Quotes</span>
                </span>
                {outstandingQuotesCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeCRMTab === "pipeline"
                        ? "bg-chrome text-white font-semibold"
                        : "bg-line text-ink font-semibold"
                    }`}
                  >
                    {outstandingQuotesCount}
                  </span>
                )}
              </button>

              {/* 4. Calendar (Desktop) — on mobile it lives in the More menu,
                  and must appear in exactly one of the two. */}
              <button
                type="button"
                role="tab"
                aria-label="Sales Calendar"
                aria-selected={activeCRMTab === "calendar"}
                onClick={() => {
                  setActiveCRMTab("calendar");
                }}
                className={`hidden lg:flex h-8 px-2.5 rounded-edge text-spec font-bold transition-all items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "calendar"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Calendar</span>
                {tomorrowMeetingsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeCRMTab === "calendar"
                        ? "bg-chrome text-white font-semibold"
                        : "bg-brand-deep text-white font-semibold"
                    }`}
                    title={`${tomorrowMeetingsCount} meeting(s) scheduled for tomorrow`}
                  >
                    {tomorrowMeetingsCount}
                  </span>
                )}
              </button>

              {/* 4. Leads (Desktop) */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "leads"}
                onClick={() => setActiveCRMTab("leads")}
                className={`hidden xl:flex h-11 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
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
                className={`hidden xl:flex h-11 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
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
                className={`hidden xl:flex h-11 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "competitor-pricing" ||
              activeCRMTab === "win-patterns"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Competitors</span>
              </button>

              {/* 7. Win patterns (Desktop) */}
              <button
                type="button"
                role="tab"
                aria-selected={activeCRMTab === "win-patterns"}
                onClick={() => setActiveCRMTab("win-patterns")}
                className={`hidden xl:flex h-11 px-2.5 rounded-edge text-spec font-bold transition-all items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                  activeCRMTab === "win-patterns"
                    ? "bg-brand-deep text-white shadow-xs"
                    : "text-ink-dim hover:text-ink hover:bg-paper"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>Win patterns</span>
              </button>
            </nav>

            {/* Right actions: Mobile More Menu & Quick Log (Pinned, Never Clipped) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/*
                Four separate capture buttons were pinned here at every width.
                On a 390px phone they took 150px of a 370px bar, leaving the
                destination tabs 135px to render 330px of content — so every
                scroll position showed a half-word ("Accc", "Ca"). They collapse
                into one Log menu below md; all four stay inline on desktop,
                where there is room for them.
              */}
              <div className="relative md:hidden shrink-0" ref={logMenuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLogMenuOpen((prev) => !prev);
                  }}
                  className="h-11 min-w-[44px] px-2.5 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs shrink-0"
                  aria-expanded={isLogMenuOpen}
                  aria-label="Log or capture something"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Log</span>
                </button>

                {isLogMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-line rounded-panel shadow-xl overflow-hidden z-50 text-spec">
                    <button
                      type="button"
                      onClick={() => {
                        openQuickLog({ type: "call" });
                        setIsLogMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-left flex items-center gap-2 text-ink hover:bg-hover cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                      <span>Log a call or note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openVoiceCapture();
                        setIsLogMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-left flex items-center gap-2 text-ink hover:bg-hover cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Record a voice debrief</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openInboundEmailModal();
                        setIsLogMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-left flex items-center gap-2 text-ink hover:bg-hover cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                      <span>Add a customer email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openEnquiryParser();
                        setIsLogMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-left flex items-center gap-2 text-ink hover:bg-hover cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                      <span>Turn an enquiry into a lead</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openQuoteImport();
                        setIsLogMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 text-left flex items-center gap-2 text-ink hover:bg-hover cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                      <span>Import a quote PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Ingest Inbound Email Action (Desktop) */}
              <button
                type="button"
                onClick={() => openInboundEmailModal()}
                className="hidden md:flex h-8 px-3 rounded-edge border border-line bg-paper hover:bg-raised text-body font-bold text-spec transition-colors items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title="Ingest Inbound Email Response into CRM"
                aria-label="Ingest Email"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 text-brand-deep" />
                <span className="hidden 2xl:inline">Ingest Email</span>
              </button>

              {/* Parse Inbound Enquiry Action (Desktop) */}
              <button
                type="button"
                onClick={() => openEnquiryParser()}
                className="hidden md:flex h-8 px-3 rounded-edge border border-brand-deep/30 bg-brand-wash hover:bg-brand-wash/80 text-brand-deep font-bold text-spec transition-colors items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title="Parse Inbound Tender, RFQ, or Email into a Structured Lead"
                aria-label="Parse Inbound Enquiry"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-brand-deep" />
                <span className="hidden 2xl:inline">Parse Enquiry</span>
              </button>

              {/* Voice Capture Action (Desktop) */}
              <button
                type="button"
                onClick={() => openVoiceCapture()}
                className="hidden md:flex h-8 px-3 rounded-edge bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-spec transition-colors items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                title="Voice Capture Debrief from the Ute"
                aria-label="Voice Log"
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Voice Log</span>
              </button>

              {/* Quick Log Action (Desktop) */}
              <button
                type="button"
                onClick={() => openQuickLog({ type: "call" })}
                className="hidden md:flex h-8 px-3 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                title="Quick Log Call, Email, Meeting, or Note"
                aria-label="Quick Log"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Quick Log</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main CRM Tab Content Area */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 w-full min-w-0">
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
            {activeCRMTab === "calendar" && <CRMCalendarView />}
            {activeCRMTab === "leads" && <CRMLeadsView />}
            {activeCRMTab === "tasks" && <CRMTasksActivitiesView />}
            {activeCRMTab === "competitor-pricing" && <CRMCompetitorPricingView />}
            {activeCRMTab === "win-patterns" && <CRMWinPatternsView />}
            {/* Falls back to Today for any tab with no view of its own. This
                used to repeat the list of known tabs inline, so adding a tab
                and forgetting to extend the list rendered Today underneath the
                new view. One list, used by both. */}
            {!CRM_TABS_WITH_VIEWS.includes(activeCRMTab) && <CRMTodayWorkspace />}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
