import React, { useState } from "react";
import {
  SearchCode,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Sun,
  Layers,
  ArrowRight,
  Info,
  Check,
  Building,
  Zap,
  MapPin,
  Clock
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const ProductFinder: React.FC = () => {
  const { setExplainingTerm, showToast } = useApp();

  const [application, setApplication] = useState("Shared path");
  const [location, setLocation] = useState("Regional Victoria (Ballarat / Bendigo)");
  const [powerAvailability, setPowerAvailability] = useState("Off-grid Solar required");
  const [mountingHeight, setMountingHeight] = useState("6 metres standard");
  const [areaOrWidth, setAreaOrWidth] = useState("1.2 km length, 3m path width");
  const [luxOrClass, setLuxOrClass] = useState("Category P4 (Pedestrian / Cycle path - 1.0 lux avg)");
  const [operatingHours, setOperatingHours] = useState("Dusk to dawn");
  const [duskToDawn, setDuskToDawn] = useState(true);
  const [cctPreference, setCctPreference] = useState("3000K (Warm White / Fauna / Dark Sky - Vic/NSW Council Standard)");
  const [autonomyDays, setAutonomyDays] = useState("4 - 6 days (Southern Victoria / Standard Commercial)");
  const [quantity, setQuantity] = useState("20 - 40 units");
  const [environmentalConditions, setEnvironmentalConditions] = useState("Region A (Normal Inland - Ballarat, Melbourne, Sydney, Bendigo)");
  const [installationTimeline, setInstallationTimeline] = useState("Q4 2026");

  const [isLoading, setIsLoading] = useState(false);
  const [finderResult, setFinderResult] = useState<any | null>(null);

  const applicationOptions = [
    { id: "Shared path", label: "Shared Path / Rail Trail", icon: "🚲" },
    { id: "Road / Street", label: "Road / Subdivision Street", icon: "🚗" },
    { id: "Park / Reserve", label: "Council Park / Reserve", icon: "🌳" },
    { id: "Car park", label: "Commercial Car Park", icon: "🅿️" },
    { id: "Industrial yard", label: "Industrial Yard / Logistics", icon: "🚛" },
    { id: "Mine site", label: "Mine Site / Heavy Compound", icon: "⛏️" },
    { id: "Foreshore / Botanical", label: "Foreshore / Botanical Gardens", icon: "🌊" },
    { id: "Security area", label: "Site Security / CCTV", icon: "📹" }
  ];

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/product-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application,
          location,
          powerAvailability,
          mountingHeight,
          areaOrWidth,
          luxOrClass,
          operatingHours,
          duskToDawn,
          cctPreference,
          autonomyDays,
          quantity,
          environmentalConditions,
          installationTimeline
        })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(res.ok ? "Unexpected response format" : `Server returned ${res.status}: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to match products");
      }
      setFinderResult(data);
      showToast("Product candidates matched successfully", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to find products", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Intelligent Product Finder</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
              Application Matcher
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Guided selection wizard matching Australian Standards (AS/NZS 1158), solar sizing, and pole geometry.
          </p>
        </div>

        {finderResult && (
          <button
            onClick={() => setFinderResult(null)}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer self-start shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Wizard</span>
          </button>
        )}
      </div>

      {/* Primary Application Step */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] flex items-center justify-center font-bold">
            1
          </span>
          What application are you lighting?
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {applicationOptions.map((opt) => {
            const isSelected = application === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setApplication(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-600/20"
                    : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                }`}
              >
                <span className="text-2xl mb-2">{opt.icon}</span>
                <div>
                  <span className={`text-xs font-bold block ${isSelected ? "text-emerald-950" : "text-slate-800"}`}>
                    {opt.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Conditional Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] flex items-center justify-center font-bold">
              2
            </span>
            Application Parameters & Environmental Factors
          </h2>
          <span className="text-xs text-slate-400 font-medium">Australian Conditions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Power Availability */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Power Availability
            </label>
            <select
              value={powerAvailability}
              onChange={(e) => setPowerAvailability(e.target.value)}
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="Off-grid Solar required">Off-grid Solar (No mains power)</option>
              <option value="Mains 240V Grid Available">Mains 240V Grid Available (Horizon)</option>
              <option value="Hybrid / Solar with Mains Backup">Hybrid / Solar with Mains Backup</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Location (Solar Zone)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ballarat, Victoria"
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Mounting / Pole Height */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mounting / Pole Height
            </label>
            <select
              value={mountingHeight}
              onChange={(e) => setMountingHeight(e.target.value)}
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="1000mm - 1200mm Bollard">1000mm - 1200mm (Terra Bollards)</option>
              <option value="3.5m - 4.5m Pedestrian Pole">3.5m - 4.5m (Minor Pathway)</option>
              <option value="6 metres standard">6 metres (Standard Shared Path / Road)</option>
              <option value="8 metres">8 metres (Collector Road / Car Park)</option>
              <option value="10m - 12m High Mast">10m - 12m (Depot / Sports / Heavy Industrial)</option>
            </select>
          </div>

          {/* Area / Width */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Area Dimensions / Path Width
            </label>
            <input
              type="text"
              value={areaOrWidth}
              onChange={(e) => setAreaOrWidth(e.target.value)}
              placeholder="e.g. 1.2km length, 3m path width"
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Lighting Class / Lux */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Lighting Class / Lux</label>
              <button
                onClick={() => setExplainingTerm("AS/NZS 1158")}
                className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                What is Cat P?
              </button>
            </div>
            <select
              value={luxOrClass}
              onChange={(e) => setLuxOrClass(e.target.value)}
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="Category P4 (Pedestrian / Cycle path - 1.0 lux avg)">Category P4 (Standard Shared Path — 1.0 lux avg)</option>
              <option value="Category P3 (Suburban Streets / Parks — 1.75 lux avg)">Category P3 (Suburban Streets — 1.75 lux avg)</option>
              <option value="Category P2 (Urban Transport Links — 3.5 lux avg)">Category P2 (Urban Rail Corridor — 3.5 lux avg)</option>
              <option value="Category P1 (High Activity Commercial — 7.0 lux avg)">Category P1 (High Activity Pedestrian — 7.0 lux avg)</option>
              <option value="Category V5 / V3 (Vehicular Roadway)">Category V (Vehicular Roadway / Highway)</option>
              <option value="General Area Floodlighting (10-30 lux)">General Area Floodlighting (10-30 lux)</option>
            </select>
          </div>

          {/* CCT Preference */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">CCT Preference</label>
              <button
                onClick={() => setExplainingTerm("CCT (Correlated Colour Temperature)")}
                className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Explain CCT
              </button>
            </div>
            <select
              value={cctPreference}
              onChange={(e) => setCctPreference(e.target.value)}
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="3000K (Warm White / Fauna / Dark Sky - Vic/NSW Council Standard)">
                3000K (Warm White / Fauna / Council Standard)
              </option>
              <option value="4000K (Neutral White - Commercial / Main Roads)">
                4000K (Neutral White - Commercial / Main Roads)
              </option>
              <option value="5000K (Cool White - Mining / Security)">
                5000K (Cool White - Mining / Logistics / Security)
              </option>
              <option value="2200K (Wildlife Friendly Amber - Coastal Turtles / Shearwaters)">
                2200K (Wildlife Friendly Amber - Coastal Reserves)
              </option>
            </select>
          </div>

          {/* Battery Autonomy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Battery Autonomy</label>
              <button
                onClick={() => setExplainingTerm("Autonomy")}
                className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Explain Autonomy
              </button>
            </div>
            <select
              value={autonomyDays}
              onChange={(e) => setAutonomyDays(e.target.value)}
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="4 - 6 days (Southern Victoria / Standard Commercial)">4 to 6 nights (Vic/NSW/Tas Standard)</option>
              <option value="3 - 4 days (Northern QLD / All-in-One)">3 to 4 nights (QLD / High Sun)</option>
              <option value="7+ days (Critical Mining / CCTV Security)">7+ nights (Critical Mining / CCTV Security)</option>
            </select>
          </div>

          {/* Wind Region */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Wind Region (AS1170.2)</label>
              <button
                onClick={() => setExplainingTerm("Wind Region A / B / C / D")}
                className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Explain Wind
              </button>
            </div>
            <select
              value={environmentalConditions}
              onChange={(e) => setEnvironmentalConditions(e.target.value)}
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="Region A (Normal Inland - Ballarat, Melbourne, Sydney, Bendigo)">Region A (Normal Inland - VIC/NSW/SA/WA)</option>
              <option value="Region B (Intermediate Coastal - Brisbane, Coastal VIC)">Region B (Intermediate Coastal)</option>
              <option value="Region C (Cyclonic Coastal QLD/WA)">Region C (Cyclonic Coastal)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Luminaire Quantity
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 24 - 36 fittings"
              className="w-full text-xs text-slate-900 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium px-6 py-2.5 rounded-md text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Evaluating Plasgain Knowledge Base...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Find Best Product Candidates</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTS DISPLAY */}
      {finderResult && (() => {
        const primary = finderResult.primaryRecommendation || finderResult.recommendedProducts?.[0] || {};
        const secondaries = finderResult.secondaryCandidates || (finderResult.recommendedProducts && finderResult.recommendedProducts.length > 1 ? finderResult.recommendedProducts.slice(1) : []) || [];
        const advantages: string[] = primary.keyAdvantages || primary.keyFeatures || primary.supportingSpecifications?.keyFeatures ? [primary.supportingSpecifications?.keyFeatures] : ["High-efficacy optical design", "Substantial battery reserve", "Australian Standards compliant"];
        const limitations: string[] = primary.importantLimitations || ["AS/NZS 1158 compliance requires formal Dialux photometric calculation.", "Solar array requires unshaded Northern aspect."];
        const specs = primary.specificationsSummary || primary.supportingSpecifications || {};
        const docs = primary.supportingDocuments || primary.sourceCitations?.map((c: any) => ({
          title: c.documentTitle || "Plasgain Product Catalogue",
          version: "2025/2026",
          page: c.sectionOrPage || "Specifications"
        })) || [];

        return (
          <div className="space-y-6">
            {/* Primary Recommendation */}
            <div className="bg-white rounded-xl border border-emerald-300 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Best Ranked Candidate
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-700 text-white">
                      {primary.matchLevel || "Strong potential match"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {primary.productName || "Plasgain Luminaire"} {primary.productCode ? `(${primary.productCode})` : ""}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Grounded in Plasgain Catalog</span>
                </div>
              </div>

              {/* Why Suitable */}
              <div className="text-xs text-slate-800 leading-relaxed bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200">
                <strong className="text-emerald-950 font-bold block mb-1">Application Suitability Reasoning:</strong>
                {primary.whySuitable || "Engineered specifically for Australian public infrastructure and off-grid performance."}
              </div>

              {/* Advantages & Limitations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Key Advantages for this Project</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-slate-700">
                    {advantages.map((adv: string, i: number) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Important Engineering Limitations & Shading Rules</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-slate-700">
                    {limitations.map((lim: string, i: number) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Specifications Summary Matrix */}
              {specs && Object.keys(specs).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Technical Specifications Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(specs).map(([key, val]) => (
                      <div key={key} className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-slate-900 font-semibold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Documents & Citations */}
              {docs && docs.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Supporting Datasheets:</span>
                  {docs.map((doc: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 text-emerald-900 px-2.5 py-1 rounded border border-slate-200 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      {doc.title || doc.documentTitle} ({doc.version || "2025/2026"} {doc.page ? `- ${doc.page}` : ""})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Secondary Candidates */}
            {secondaries && secondaries.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Alternative Product Candidates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {secondaries.map((sec: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {sec.productName} {sec.productCode ? `(${sec.productCode})` : ""}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {sec.matchLevel || "Possible match"}
                        </span>
                      </div>
                      <p className="text-slate-700">
                        <strong className="text-slate-800">When to consider:</strong> {sec.whyConsider || sec.whySuitable || sec.whenToUse || "Alternative project requirements."}
                      </p>
                      {(sec.tradeOffs || sec.importantLimitations) && (
                        <p className="text-slate-500 text-[11px]">
                          <strong className="text-slate-600">Trade-offs & Notes:</strong> {sec.tradeOffs || sec.importantLimitations?.[0] || "Verify mounting and wind loading."}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sales rep guidance */}
            {finderResult.salesRepAdvice && (
              <div className="bg-[#0F172A] text-slate-100 rounded-xl p-4 text-xs space-y-1 border border-slate-800">
                <strong className="font-bold text-emerald-400 block text-sm">Sales Pitch Tip:</strong>
                <p className="text-slate-300 leading-relaxed">{finderResult.salesRepAdvice}</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
