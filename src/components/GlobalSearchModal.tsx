import React, { useState, useEffect } from "react";
import {
  Search,
  FilePlus2,
  SearchCode,
  FileText,
  KanbanSquare,
  BookOpen,
  ArrowRight,
  Sparkles,
  X
} from "lucide-react";
import { useApp, NavTab } from "../context/AppContext";

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    products,
    opportunities,
    documents,
    glossary,
    navigateToWorkflow,
    setExplainingTerm
  } = useApp();

  const [query, setQuery] = useState("");

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(query.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(query.toLowerCase())) ||
      (p.series && p.series.toLowerCase().includes(query.toLowerCase())) ||
      (p.application && p.application.some((a) => a.toLowerCase().includes(query.toLowerCase()))) ||
      (p.primaryApplications && p.primaryApplications.some((a) => a.toLowerCase().includes(query.toLowerCase())))
  );

  const filteredOpportunities = opportunities.filter(
    (o) =>
      o.project.toLowerCase().includes(query.toLowerCase()) ||
      o.customerCompany.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredGlossary = glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(query.toLowerCase()) ||
      (g.shortDefinition || g.definition || "").toLowerCase().includes(query.toLowerCase()) ||
      (g.whyItMatters || g.salesRelevance || "").toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action: () => void) => {
    action();
    setIsSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, deals, documents, standards, or lighting terms..."
            className="w-full text-sm text-slate-900 focus:outline-none placeholder:text-slate-400 font-sans"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Quick Nav actions if query empty */}
          {!query && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Shortcuts:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelect(() => navigateToWorkflow("new-enquiry"))}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 transition-colors text-left cursor-pointer border border-slate-200"
                >
                  <FilePlus2 className="w-4 h-4 text-emerald-600" />
                  <span>Analyse New Customer Enquiry</span>
                </button>
                <button
                  onClick={() => handleSelect(() => navigateToWorkflow("product-finder"))}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 transition-colors text-left cursor-pointer border border-slate-200"
                >
                  <SearchCode className="w-4 h-4 text-emerald-600" />
                  <span>Product Finder Wizard</span>
                </button>
              </div>
            </div>
          )}

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Plasgain Products ({filteredProducts.length})
              </span>
              <div className="space-y-1">
                {filteredProducts.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(() => navigateToWorkflow("product-finder"))}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-slate-500 ml-2">({p.code || p.category})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {filteredOpportunities.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Opportunities ({filteredOpportunities.length})
              </span>
              <div className="space-y-1">
                {filteredOpportunities.slice(0, 4).map((o) => (
                  <button
                    key={o.id}
                    onClick={() =>
                      handleSelect(() => navigateToWorkflow("opportunities", undefined, o.id))
                    }
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{o.project}</span>
                      <span className="text-slate-500 ml-2">• {o.customerCompany}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {o.stage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Glossary Terms */}
          {filteredGlossary.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Lighting Glossary & Standards ({filteredGlossary.length})
              </span>
              <div className="space-y-1">
                {filteredGlossary.slice(0, 4).map((g) => (
                  <button
                    key={g.term}
                    onClick={() => handleSelect(() => setExplainingTerm(g.term))}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-900">{g.term}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">Explain &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Navigate with arrows or click</span>
          <span>Plasgain Copilot Search</span>
        </div>
      </div>
    </div>
  );
};
