import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  X,
  Copy,
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA,
  lookupLightingTerm,
  LightingTermExplanation
} from "../data/lightingEncyclopedia";

export const ExplainTermModal: React.FC = () => {
  const { explainingTerm, setExplainingTerm, showToast } = useApp();
  const [activeExplanation, setActiveExplanation] = useState<LightingTermExplanation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");

  const categories = [
    "All",
    "Solar & Battery",
    "Lighting Standards",
    "Photometry & Optics",
    "Electrical & Mechanical",
    "Commercial & Rebates"
  ];

  useEffect(() => {
    if (!explainingTerm) {
      setActiveExplanation(null);
      setSearchTerm("");
      return;
    }

    // Instant offline resolution
    const local = lookupLightingTerm(explainingTerm);
    setActiveExplanation(local);
    setSearchTerm(explainingTerm);

    // Optional background AI enrichment if online
    const fetchAIEnrichment = async () => {
      try {
        const res = await fetch("/api/knowledge/explain-term", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: explainingTerm })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.definition || data.plainEnglish)) {
            setActiveExplanation(prev => ({
              ...prev!,
              plainEnglish: data.plainEnglish || data.definition || prev?.plainEnglish || "",
              whyItMattersInSales: data.whyItMattersInSales || data.whyItMatters || prev?.whyItMattersInSales || "",
              howToExplainToCustomer: data.howToExplainToCustomer || data.howItAffectsPlasgainCustomer || prev?.howToExplainToCustomer || "",
              practicalExample: data.practicalExample || prev?.practicalExample || "",
              commonMistakesToAvoid: data.commonMistakesToAvoid || data.keyRuleOfThumb || prev?.commonMistakesToAvoid || ""
            }));
          }
        }
      } catch (err) {
        // Silently preserve offline encyclopedia
        console.log("Using offline lighting encyclopedia");
      }
    };

    fetchAIEnrichment();
  }, [explainingTerm]);

  if (!explainingTerm) return null;

  const encyclopediaList = Object.values(COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA);
  const filteredList = encyclopediaList.filter(item => {
    const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.plainEnglish.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategoryFilter === "All" || item.category === activeCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleSelectTerm = (item: LightingTermExplanation) => {
    setActiveExplanation(item);
    setSearchTerm(item.term);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`, "success");
  };

  return (
    <div className="fixed inset-0 bg-chrome/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-deep to-chrome-line text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-panel bg-brand/20 border border-brand/30 text-brand-lift flex items-center justify-center font-bold shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-spec font-bold text-soon-on-ink uppercase tracking-widest px-2 py-0.5 rounded bg-soon/10 border border-soon/20">
                  Customer Service Explainer
                </span>
                {activeExplanation?.australianStandardRef && (
                  <span className="text-spec text-brand-lift flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-brand-lift" />
                    {activeExplanation.australianStandardRef}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg text-white mt-1">
                {activeExplanation?.term || explainingTerm}
              </h3>
            </div>
          </div>
          <button
            onClick={() => setExplainingTerm(null)}
            className="text-ink-faint hover:text-white p-1.5 rounded-edge hover:bg-white/10 transition-colors cursor-pointer"
            title="Close explainer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="p-3 bg-raised border-b border-line space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.trim().length > 1) {
                  const match = lookupLightingTerm(e.target.value);
                  setActiveExplanation(match);
                }
              }}
              placeholder="Search 30+ lighting terms (e.g. Autonomy, CCT, AS1158, IK09, LiFePO4, Optics)..."
              className="w-full pl-9 pr-4 py-2 bg-white text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-spec scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-edge font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategoryFilter === cat
                    ? "bg-brand-deep text-white shadow-xs"
                    : "bg-white text-ink-dim hover:bg-line border border-line"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeExplanation ? (
            <>
              {/* Plain English Definition */}
              <div className="bg-brand-wash border border-brand-edge p-4 rounded-panel space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-spec font-bold text-brand-deep uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-brand-deep" />
                    Plain English Definition
                  </span>
                  <span className="text-spec font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep">
                    {activeExplanation.category}
                  </span>
                </div>
                <p className="text-body leading-relaxed font-medium">
                  {activeExplanation.plainEnglish}
                </p>
              </div>

              {/* Customer Phrasing Box (Copyable) */}
              {activeExplanation.howToExplainToCustomer && (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-spec font-bold text-amber-950 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-700" />
                      What to tell the client (Ready Script):
                    </span>
                    <button
                      onClick={() => handleCopy(activeExplanation.howToExplainToCustomer, "customer explanation script")}
                      className="text-spec text-amber-950 font-bold bg-white hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-edge flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-800" />
                      Copy Script
                    </button>
                  </div>
                  <p className="italic text-spec text-amber-950 bg-white p-3 rounded-edge border border-amber-200 leading-relaxed font-serif">
                    &ldquo;{activeExplanation.howToExplainToCustomer}&rdquo;
                  </p>
                </div>
              )}

              {/* Grid: Why it Matters & Practical Example */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-raised border border-line p-3.5 rounded-panel space-y-1">
                  <span className="text-spec font-bold uppercase tracking-wider block">
                    Why it matters in quoting
                  </span>
                  <p className="text-meta text-ink-dim leading-relaxed">
                    {activeExplanation.whyItMattersInSales}
                  </p>
                </div>

                <div className="bg-raised border border-line p-3.5 rounded-panel space-y-1">
                  <span className="text-spec font-bold uppercase tracking-wider block">
                    Practical Application
                  </span>
                  <p className="text-meta text-ink-dim leading-relaxed">
                    {activeExplanation.practicalExample}
                  </p>
                </div>
              </div>

              {/* Common Mistakes / Traps */}
              {activeExplanation.commonMistakesToAvoid && (
                <div className="bg-urgent-wash border border-urgent p-3.5 rounded-panel text-urgent space-y-1">
                  <span className="text-spec font-bold uppercase tracking-wider text-urgent block">
                    Common Quoting Mistake to Avoid
                  </span>
                  <p className="text-meta text-urgent leading-relaxed">
                    {activeExplanation.commonMistakesToAvoid}
                  </p>
                </div>
              )}

              {/* Related Plasgain Luminaires */}
              {activeExplanation.relatedPlasgainProducts && activeExplanation.relatedPlasgainProducts.length > 0 && (
                <div className="pt-1">
                  <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block mb-1.5">
                    Applicable Plasgain Range:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeExplanation.relatedPlasgainProducts.map((prod, idx) => (
                      <span
                        key={idx}
                        className="text-spec font-semibold px-2.5 py-1 rounded-edge bg-paper border border-line flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-soon" />
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-body font-semibold">Select a lighting term to explore</p>
              <p className="text-meta text-ink-dim">Choose from common Australian standards and specifications below</p>
            </div>
          )}

          {/* Quick Browse Term Tags */}
          <div className="pt-3 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-spec font-bold text-ink-dim uppercase tracking-wider">
                Explore Core Lighting Terms:
              </span>
              <span className="text-spec text-ink-faint">
                {filteredList.length} terms available
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredList.slice(0, 9).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectTerm(item)}
                  className={`text-left p-2 rounded-edge border text-meta font-medium transition-all flex items-center justify-between cursor-pointer ${
                    activeExplanation?.term === item.term
                      ? "bg-brand-wash border-brand text-brand-deep font-bold shadow-xs"
                      : "bg-white hover:bg-raised border-line text-body"
                  }`}
                >
                  <span className="truncate mr-1">{item.term.split("(")[0]}</span>
                  <ChevronRight className="w-3 h-3 text-ink-faint shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-raised border-t border-line flex items-center justify-between">
          <div className="text-spec text-ink-dim">
            Compliant with <span className="font-semibold text-body">AS/NZS 1158</span> & <span className="font-semibold text-body">AS/NZS 4509</span>
          </div>
          <button
            onClick={() => setExplainingTerm(null)}
            className="px-5 py-2 rounded-edge bg-brand-deep hover:bg-chrome text-white text-meta font-bold transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
