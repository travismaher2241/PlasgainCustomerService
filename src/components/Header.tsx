import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Sparkles,
  Menu,
  Bell,
  TrendingUp,
  Check,
  ExternalLink,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
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

  return (
    <header className="h-13.5 bg-surface border-b border-line px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-30 min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
          title="Open menu"
          className="md:hidden p-1.5 text-ink-dim hover:text-ink rounded-edge hover:bg-paper cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb (P1-11) */}
        <div className="flex items-center gap-1.5 text-meta text-ink-dim truncate min-w-0">
          <span className="font-semibold text-body shrink-0">{getTabDisplayName(activeTab)}</span>
          {activeTab === "new-enquiry" && (
            <>
              <span className="text-ink-faint px-0.5">/</span>
              <span className="truncate text-ink font-medium">
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

      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Open search dialog (Command-K)"
          className="flex items-center gap-2 text-meta text-ink-faint bg-paper hover:bg-raised px-2.5 py-1.5 rounded-edge border border-line hover:border-line-strong transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search specs, terms &amp; docs</span>
          <kbd className="u-data hidden sm:inline-block ml-1 px-1 text-[0.625rem] text-ink-faint border border-line-strong rounded-[2px]">
            ⌘K
          </kbd>
        </button>

        {/* Team Notifications & Alerts Bell (P1-05 & P1-13) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            aria-label={`Team Notifications: ${unreadNotificationsCount} unread`}
            aria-expanded={isAlertsOpen}
            className="p-2 rounded-edge text-ink-dim hover:text-ink bg-paper hover:bg-raised border border-line transition-colors relative cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:outline-none"
            title="Team Notifications & Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-urgent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Modal */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-panel shadow-xl border border-line overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-raised border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-meta text-body">
                  <Bell className="w-4 h-4 text-brand-deep" />
                  <span>Team Notifications & Alerts</span>
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
                  displayedNotifications.slice(0, 8).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 space-y-1.5 transition-colors ${
                        !notif.isRead ? "bg-brand-wash/20" : "bg-white hover:bg-raised/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-spec">
                        <div className="flex items-center gap-1.5">
                          {notif.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-urgent" />}
                          {notif.type === "action_required" && <CheckCircle2 className="w-3.5 h-3.5 text-soon" />}
                          {notif.type === "info" && <TrendingUp className="w-3.5 h-3.5 text-brand-deep" />}
                          {notif.type === "success" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          <span className="font-bold text-body text-spec uppercase">
                            {notif.title}
                          </span>
                        </div>
                        <span className="text-ink-faint text-[11px]">
                          {notif.timestamp || (notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("en-AU") : "Recently")}
                        </span>
                      </div>

                      <p className="text-spec text-body font-medium leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-spec">
                        {notif.linkTo ? (
                          <button
                            onClick={() => {
                              if (!notif.isRead) markNotificationRead(notif.id);
                              setIsAlertsOpen(false);
                              navigateToCRM(notif.linkTo!.view as any, notif.linkTo!.id);
                            }}
                            className="font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Record</span>
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
                    className="text-spec font-bold text-brand-deep hover:underline cursor-pointer"
                  >
                    Mark All as Read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copilot */}
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          aria-pressed={isCopilotOpen}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-meta font-semibold rounded-edge transition-colors cursor-pointer border ${
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
