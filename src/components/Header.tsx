import React from "react";
import {
  Search,
  Sparkles,
  BookOpen,
  Menu,
  ChevronRight,
  ShieldCheck
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
    setExplainingTerm,
    selectedOpportunityId,
    opportunities
  } = useApp();

  const currentOpp = opportunities.find((o) => o.id === selectedOpportunityId);

  const getTabDisplayName = (tab: NavTab) => {
    switch (tab) {
      case "home":
        return "Dashboard Overview";
      case "new-enquiry":
        return "Enquiry Analysis";
      case "product-finder":
        return "Product Matcher";
      case "ask-plasgain":
        return "Technical Assistant";
      case "opportunities":
        return "Opportunities Pipeline";
      case "documents":
        return "Product Catalogues";
      case "tools":
        return "Sales Power Tools";
      case "learn":
        return "Learning Centre";
      case "settings":
        return "Copilot Diagnostics";
      default:
        return "Workspace";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Trigger & Editorial Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
          <span className="hover:text-emerald-700 cursor-default font-medium text-slate-600">
            {getTabDisplayName(activeTab)}
          </span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900 truncate">
            {activeTab === "new-enquiry" && currentOpp
              ? currentOpp.project
              : activeTab === "opportunities" && currentOpp
              ? `${currentOpp.customerCompany} (${currentOpp.project})`
              : "Plasgain Commercial & Solar Lighting"}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Search */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors border border-slate-200 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search specs & docs...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Lighting Terms Glossary Modal Button */}
        <button
          onClick={() => setExplainingTerm("Autonomy")}
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-700 hover:text-emerald-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 font-medium transition-colors cursor-pointer"
          title="Quick Lighting Glossary & Terminology"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          <span>Lighting Terms</span>
        </button>

        {/* Copilot Trigger */}
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-2xs ${
            isCopilotOpen
              ? "bg-emerald-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Ask Copilot</span>
        </button>
      </div>
    </header>
  );
};
