import React from "react";
import { Search, Sparkles, Menu } from "lucide-react";
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
    opportunities
  } = useApp();

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
