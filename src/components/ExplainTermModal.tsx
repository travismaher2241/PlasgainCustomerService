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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                  Customer Service Explainer
                </span>
                {activeExplanation?.australianStandardRef && (
                  <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
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
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close explainer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
              className="w-full pl-9 pr-4 py-2 bg-white text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategoryFilter === cat
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
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
              <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-xl space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-700" />
                    Plain English Definition
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {activeExplanation.category}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {activeExplanation.plainEnglish}
                </p>
              </div>

              {/* Customer Phrasing Box (Copyable) */}
              {activeExplanation.howToExplainToCustomer && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      What to tell the client (Ready Script):
                    </span>
                    <button
                      onClick={() => handleCopy(activeExplanation.howToExplainToCustomer, "customer explanation script")}
                      className="text-xs text-amber-900 font-bold bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Script
                    </button>
                  </div>
                  <p className="italic text-xs text-slate-800 bg-white/70 p-3 rounded-lg border border-amber-200/60 leading-relaxed">
                    "{activeExplanation.howToExplainToCustomer}"
                  </p>
                </div>
              )}

              {/* Grid: Why it Matters & Practical Example */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                    Why it matters in quoting
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeExplanation.whyItMattersInSales}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                    Practical Application
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeExplanation.practicalExample}
                  </p>
                </div>
              </div>

              {/* Common Mistakes / Traps */}
              {activeExplanation.commonMistakesToAvoid && (
                <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-xl text-rose-950 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 block">
                    Common Quoting Mistake to Avoid
                  </span>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {activeExplanation.commonMistakesToAvoid}
                  </p>
                </div>
              )}

              {/* Related Plasgain Luminaires */}
              {activeExplanation.relatedPlasgainProducts && activeExplanation.relatedPlasgainProducts.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Applicable Plasgain Range:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeExplanation.relatedPlasgainProducts.map((prod, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-amber-500" />
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Select a lighting term to explore</p>
              <p className="text-xs text-slate-500">Choose from common Australian standards and specifications below</p>
            </div>
          )}

          {/* Quick Browse Term Tags */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Explore Core Lighting Terms:
              </span>
              <span className="text-[11px] text-slate-400">
                {filteredList.length} terms available
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredList.slice(0, 9).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectTerm(item)}
                  className={`text-left p-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    activeExplanation?.term === item.term
                      ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <span className="truncate mr-1">{item.term.split("(")[0]}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Compliant with <span className="font-semibold text-slate-700">AS/NZS 1158</span> & <span className="font-semibold text-slate-700">AS/NZS 4509</span>
          </div>
          <button
            onClick={() => setExplainingTerm(null)}
            className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
