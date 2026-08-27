import React, { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Menu, Bell, TrendingUp, Check, ExternalLink, X } from "lucide-react";
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
    competitorAlerts,
    unreadCompetitorAlertsCount,
    markCompetitorAlertRead,
    navigateToCRM
  } = useApp();

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
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
        return "Enquiry Analysis";
      case "product-finder":
        return "Product Matcher";
      case "ask-plasgain":
        return "Technical Assistant";
      case "documents":
        return "Product Catalogues";
      case "tools":
        return "Engineering & Sales Calculators";
      case "settings":
        return "Settings";
      default:
        return "Workspace";
    }
  };

  return (
    <header className="h-13.5 bg-surface border-b border-line px-4 sm:px-6.5 flex items-center gap-4 shrink-0 sticky top-0 z-30">
      <button
        onClick={onToggleMobileMenu}
        className="md:hidden p-2 -ml-2 text-ink-dim hover:text-ink rounded-edge hover:bg-paper cursor-pointer"
        title="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-meta text-ink-dim truncate min-w-0">
        <span className="font-semibold text-body">{getTabDisplayName(activeTab)}</span>
        <span className="text-ink-faint px-1">/</span>
        <span className="truncate">
          {activeTab === "new-enquiry" && currentOpp
            ? currentOpp.project
            : "Commercial & Solar Lighting"}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Search */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 text-meta text-ink-faint bg-paper hover:bg-raised px-2.5 py-1.5 rounded-edge border border-line hover:border-line-strong transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search specs, terms &amp; docs</span>
          <kbd className="u-data hidden sm:inline-block ml-1 px-1 text-[0.625rem] text-ink-faint border border-line-strong rounded-[2px]">
            ⌘K
          </kbd>
        </button>

        {/* Team Notifications & Competitor Alerts Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="p-2 rounded-edge text-ink-dim hover:text-ink bg-paper hover:bg-raised border border-line transition-colors relative cursor-pointer"
            title="Team Intelligence & Competitor Pricing Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCompetitorAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-urgent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {unreadCompetitorAlertsCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Modal */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-panel shadow-xl border border-line overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-raised border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-meta text-body">
                  <TrendingUp className="w-4 h-4 text-brand-deep" />
                  <span>Team Competitor Pricing Alerts</span>
                </div>
                <span className="text-spec font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep">
                  {unreadCompetitorAlertsCount} Unread
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-line text-meta">
                {competitorAlerts.length === 0 ? (
                  <div className="p-6 text-center text-ink-dim text-spec">
                    No competitor pricing alerts recorded yet.
                  </div>
                ) : (
                  competitorAlerts.slice(0, 8).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 space-y-1.5 transition-colors ${
                        !alert.isRead ? "bg-brand-wash/20" : "bg-white hover:bg-raised/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-spec">
                        <span className="font-bold text-brand-deep uppercase">
                          {alert.title}
                        </span>
                        <span className="text-ink-faint">
                          {new Date(alert.createdAt).toLocaleDateString("en-AU")}
                        </span>
                      </div>

                      <p className="text-spec text-body font-medium leading-relaxed">
                        {alert.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-spec">
                        <button
                          onClick={() => {
                            if (!alert.isRead) markCompetitorAlertRead(alert.id);
                            setIsAlertsOpen(false);
                            navigateToCRM("accounts", alert.accountId);
                          }}
                          className="font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          View Account 360° <ExternalLink className="w-3 h-3" />
                        </button>
                        {!alert.isRead && (
                          <button
                            onClick={() => markCompetitorAlertRead(alert.id)}
                            className="text-ink-dim hover:text-ink flex items-center gap-0.5 cursor-pointer font-semibold"
                          >
                            <Check className="w-3 h-3 text-emerald-600" /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {competitorAlerts.length > 0 && (
                <div className="p-2 bg-paper border-t border-line text-center">
                  <button
                    onClick={() => {
                      competitorAlerts.forEach((a) => {
                        if (!a.isRead) markCompetitorAlertRead(a.id);
                      });
                    }}
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
