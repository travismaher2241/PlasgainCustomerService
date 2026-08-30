import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Sparkles,
  Menu,
  Bell,
  Check,
  Archive,
  ArrowRight
} from "lucide-react";
import { useApp, NavTab } from "../context/AppContext";

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    activeTab,
    setIsSearchOpen,
    isCopilotOpen,
    setIsCopilotOpen,
    openEmailComposer,
    isSidebarCollapsed,
    toggleSidebar,
    selectedOpportunityId,
    opportunities,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    archiveNotification,
    navigateToCRM
  } = useApp();

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOpp = opportunities.find((o) => o.id === selectedOpportunityId);

  const getTabDisplayName = (tab: NavTab) => {
    switch (tab) {
      case "home":
        return "Dashboard";
      case "crm":
        return "CRM Command Centre";
      case "new-enquiry":
        return "Enquiry & Tender Analysis";
      case "product-finder":
        return "Product Matcher";
      case "documents":
        return "Product Catalogues";
      case "tools":
        return "Engineering Take-off & Calculators";
      case "settings":
        return "Settings";
      default:
        return "Workspace";
    }
  };

  const displayedNotifications = (notifications || []).filter((n) => {
    if (n.isArchived) return false;
    if (filterTab === "unread") return !n.isRead;
    return true;
  });

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  return (
    <header className="h-14 bg-surface border-b border-line px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shrink-0 sticky top-0 z-30 min-w-0">
      {/* Left: Mobile Menu & Clean Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/*
          Opens the mobile drawer, and nothing else. This button used to call
          toggleSidebar() as well, which did two wrong things: on mobile the
          collapse state has no visual effect but still flipped this button's
          accessible name to "Expand navigation menu", so after one tap the
          control could no longer be found by name; on desktop the drawer state
          turned the sidebar into a fixed overlay with no backdrop. Desktop
          collapse belongs to the sidebar's own control.
        */}
        <button
          type="button"
          onClick={() => onToggleMobileMenu?.()}
          aria-label="Open navigation menu"
          title="Open menu"
          className="md:hidden min-h-[44px] min-w-[44px] p-2 text-ink-dim hover:text-ink rounded-edge hover:bg-paper cursor-pointer shrink-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Identity & Breadcrumb */}
        <div className="flex items-center gap-1.5 text-meta text-ink-dim min-w-0">
          <span className="font-bold text-body text-ink text-base sm:text-lead shrink-0">
            {getTabDisplayName(activeTab)}
          </span>
          {activeTab === "new-enquiry" && (
            <>
              <span className="text-ink-faint px-0.5 hidden xs:inline">/</span>
              <span className="truncate text-ink font-medium hidden xs:inline">
                {currentOpp ? currentOpp.project : "New Sales Enquiry"}
              </span>
            </>
          )}
          {activeTab !== "new-enquiry" && (
            <>
              <span className="text-ink-faint px-0.5 hidden sm:inline">/</span>
              <span className="truncate hidden sm:inline text-ink-faint">
                Plasgain Australia
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions (Streamlined on Mobile to Search + Alerts) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Search */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Open search dialog (Command-K)"
          className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center gap-2 text-meta text-ink-faint bg-paper hover:bg-raised px-2.5 py-2 sm:py-1.5 rounded-edge border border-line hover:border-line-strong transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none"
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-ink-dim" />
          <span className="hidden sm:inline">Search specs, terms &amp; docs</span>
          <kbd className="u-data hidden sm:inline-block ml-1 px-1 text-[0.625rem] text-ink-faint border border-line-strong rounded-[2px]">
            ⌘K
          </kbd>
        </button>

        {/* Global AI Email Composer Entry Point (Desktop Only) */}
        <button
          type="button"
          onClick={() => openEmailComposer()}
          aria-label="Write AI Email"
          title="Compose grounded AI email (Cold Outreach or Project Enquiry)"
          className="hidden sm:flex items-center gap-1.5 text-meta font-bold text-brand-deep bg-brand-wash hover:bg-brand-wash/80 px-2.5 py-1.5 rounded-edge border border-brand-edge shadow-2xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          <span>Write AI Email</span>
        </button>

        {/* Team Notifications & Alerts Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            aria-label={`Team Notifications: ${unreadNotificationsCount} unread`}
            aria-expanded={isAlertsOpen}
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2.5 sm:p-2 rounded-edge text-ink-dim hover:text-ink bg-paper hover:bg-raised border border-line transition-colors relative cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none"
            title="Team Notifications & Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute 1 top-1 right-1 w-4 h-4 bg-urgent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Modal */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-panel shadow-xl border border-line overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-raised border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-meta text-body">
                  <Bell className="w-4 h-4 text-brand-deep" />
                  <span>Team Notifications &amp; Alerts</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterTab("all")}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      filterTab === "all" ? "bg-white text-body shadow-2xs" : "text-ink-dim hover:text-body"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterTab("unread")}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      filterTab === "unread" ? "bg-brand-wash text-brand-deep font-bold" : "text-ink-dim hover:text-body"
                    }`}
                  >
                    Unread ({unreadNotificationsCount})
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-line text-meta">
                {displayedNotifications.length === 0 ? (
                  <div className="p-6 text-center text-ink-dim text-spec">
                    {filterTab === "unread" ? "No unread notifications." : "No active team notifications."}
                  </div>
                ) : (
                  displayedNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 transition-colors ${notif.isRead ? "bg-white" : "bg-brand-wash/30"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-body text-ink line-clamp-1">{notif.title}</span>
                        <time dateTime={notif.createdAt} className="text-spec text-ink-faint shrink-0">
                          {formatNotificationTime(notif.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-spec text-ink-dim line-clamp-2">{notif.message}</p>

                      <div className="mt-2.5 flex items-center justify-between text-spec">
                        {notif.linkTo ? (
                          <button
                            onClick={() => {
                              setIsAlertsOpen(false);
                              if (notif.linkTo) navigateToCRM(notif.linkTo.view, notif.linkTo.id);
                            }}
                            className="text-brand-deep font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Record</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span></span>
                        )}

                        <div className="flex items-center gap-2">
                          {!notif.isRead && (
                            <button
                              onClick={() => markNotificationRead(notif.id)}
                              className="text-ink-dim hover:text-ink flex items-center gap-0.5 cursor-pointer font-semibold"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3 text-emerald-600" /> Read
                            </button>
                          )}
                          <button
                            onClick={() => archiveNotification(notif.id)}
                            className="text-ink-faint hover:text-ink-dim flex items-center gap-0.5 cursor-pointer"
                            title="Archive notification"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {displayedNotifications.length > 0 && (
                <div className="p-2 bg-paper border-t border-line text-center">
                  <button
                    onClick={() => markAllNotificationsRead()}
                    disabled={unreadNotificationsCount === 0}
                    className="text-spec font-bold text-brand-deep hover:underline cursor-pointer disabled:text-ink-faint disabled:no-underline disabled:cursor-not-allowed"
                  >
                    Mark All as Read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copilot (Desktop Entry) */}
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          aria-pressed={isCopilotOpen}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-meta font-semibold rounded-edge transition-colors cursor-pointer border ${
            isCopilotOpen
              ? "bg-chrome border-chrome text-chrome-text"
              : "bg-brand-deep border-brand-deep text-white hover:bg-brand hover:border-brand"
          }`}
        >
          <Sparkles
            className={`w-3.5 h-3.5 ${isCopilotOpen ? "text-brand-lift" : "text-white"}`}
          />
          <span>Ask Copilot</span>
        </button>
      </div>
    </header>
  );
};
