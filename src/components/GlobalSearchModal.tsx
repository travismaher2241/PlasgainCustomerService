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
    navigateToCRM,
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
    <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-panel max-w-2xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input */}
        <div className="p-4 border-b border-line flex items-center gap-3">
          <Search className="w-5 h-5 text-ink-faint shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, deals, documents, standards, or lighting terms..."
            className="w-full text-body focus:outline-none placeholder:text-ink-faint font-sans"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-meta bg-paper hover:bg-line text-ink-dim px-2 py-1 rounded cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-4 text-meta">
          {/* Quick Nav actions if query empty */}
          {!query && (
            <div className="space-y-2">
              <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                Quick Shortcuts:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelect(() => navigateToWorkflow("new-enquiry"))}
                  className="flex items-center gap-2 p-2.5 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep text-body transition-colors text-left cursor-pointer border border-line"
                >
                  <FilePlus2 className="w-4 h-4 text-brand-deep" />
                  <span>Analyse New Customer Enquiry</span>
                </button>
                <button
                  onClick={() => handleSelect(() => navigateToWorkflow("product-finder"))}
                  className="flex items-center gap-2 p-2.5 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep text-body transition-colors text-left cursor-pointer border border-line"
                >
                  <SearchCode className="w-4 h-4 text-brand-deep" />
                  <span>Product Finder Wizard</span>
                </button>
              </div>
            </div>
          )}

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                Plasgain Products ({filteredProducts.length})
              </span>
              <div className="space-y-1">
                {filteredProducts.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(() => navigateToWorkflow("product-finder"))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-raised text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-body">{p.name}</span>
                      <span className="text-ink-dim ml-2">({p.code || p.category})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-faint" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {filteredOpportunities.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                Opportunities ({filteredOpportunities.length})
              </span>
              <div className="space-y-1">
                {filteredOpportunities.slice(0, 4).map((o) => (
                  <button
                    key={o.id}
                    onClick={() =>
                      handleSelect(() => navigateToCRM("pipeline", o.id))
                    }
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-raised text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-body">{o.project}</span>
                      <span className="text-ink-dim ml-2">• {o.customerCompany}</span>
                    </div>
                    <span className="text-spec bg-paper px-2 py-0.5 rounded">
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
              <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                Lighting Glossary & Standards ({filteredGlossary.length})
              </span>
              <div className="space-y-1">
                {filteredGlossary.slice(0, 4).map((g) => (
                  <button
                    key={g.term}
                    onClick={() => handleSelect(() => setExplainingTerm(g.term))}
                    className="w-full flex items-center justify-between p-2 rounded-edge hover:bg-raised text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-brand-deep" />
                      <span className="font-semibold text-body">{g.term}</span>
                    </div>
                    <span className="text-ink-faint text-spec">Explain &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-raised border-t border-line text-spec text-ink-faint flex items-center justify-between">
          <span>Navigate with arrows or click</span>
          <span>Plasgain Copilot Search</span>
        </div>
      </div>
    </div>
  );
};
