import React, { useState } from "react";
import { apiPost, AIUnavailableError, toUserMessage } from "../utils/apiClient";
import { AIUnavailableNotice } from "./AIUnavailableNotice";
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
  Clock,
  Download,
  Plus,
  Copy,
  Package,
  X
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  LIGHTING_STANDARDS_CATEGORIES,
  getLightingCategory,
  DATASET_METADATA
} from "../data/lightingStandards";
import { productComparisonCache, ProductComparisonRecord } from "../utils/productComparisonCache";
import { resolveSingleProduct } from "../utils/productResolver";
import { CommercialPricingRequestModal } from "./CommercialPricingRequestModal";

/**
 * Checks a recommendation against the real catalogue.
 *
 * This used to be a hardcoded set of six SKU strings, none of which existed in
 * `src/data` — so a genuine recommendation could never satisfy it. We resolve
 * against SAMPLE_PRODUCTS instead, via the same alias engine the BOM builder
 * uses, so real families ("enLighten Zorro 2", "ZAL40S", "Pro Blade Solar
 * 75/125") match while an invented SKU still fails.
 */
const isApprovedProduct = (candidate: any): boolean => {
  if (!candidate) return false;
  const identifier = `${candidate.productCode || candidate.code || ""} ${candidate.productName || candidate.name || ""}`.trim();
  if (!identifier) return false;
  const resolved = resolveSingleProduct(candidate);
  return resolved.status !== "UNMATCHED" && Boolean(resolved.product);
};

export const ProductFinder: React.FC = () => {
  const {
    setExplainingTerm,
    showToast,
    openCopilotWithContext,
    navigateToWorkflow,
    navigateToCRM,
    addCrmOpportunity,
    updateCrmOpportunity,
    crmOpportunities,
    accounts,
    pipelines,
    currentUser
  } = useApp();

  const [application, setApplication] = useState("Shared path");
  const [location, setLocation] = useState("Regional Australia / Public Infrastructure");
  const [powerAvailability, setPowerAvailability] = useState("Off-grid Solar required");
  const [mountingHeight, setMountingHeight] = useState("6 metres standard");
  const [areaOrWidth, setAreaOrWidth] = useState("1.2 km length, 3m path width");
  const [selectedCategoryId, setSelectedCategoryId] = useState("P4");
  const selectedCategory = getLightingCategory(selectedCategoryId) || getLightingCategory("P4")!;
  const luxOrClass = `${selectedCategory.displayName} (${selectedCategory.maintainedIlluminanceLux} lux avg / ${selectedCategory.minimumIlluminanceLux} lux min)`;
  const [operatingHours, setOperatingHours] = useState("Dusk to dawn");
  const [duskToDawn, setDuskToDawn] = useState(true);
  const [cctPreference, setCctPreference] = useState("3000K (Warm White / Fauna / Dark Sky - Vic/NSW Council Standard)");
  const [autonomyDays, setAutonomyDays] = useState("4 - 6 days (Southern Victoria / Standard Commercial)");
  const [quantity, setQuantity] = useState("20 - 40 units");
  const [environmentalConditions, setEnvironmentalConditions] = useState("Region A (Normal Inland - Ballarat, Melbourne, Sydney, Bendigo)");
  const [installationTimeline, setInstallationTimeline] = useState("Q4 2026");

  const [isLoading, setIsLoading] = useState(false);
  const [finderResult, setFinderResult] = useState<any | null>(null);
  const [finderError, setFinderError] = useState<{ detail: string; guidance?: string } | null>(null);

  // OPT-01: Deal Injection & Photometrics
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [selectedProductForDeal, setSelectedProductForDeal] = useState<{
    code: string;
    name: string;
    category: string;
    unitPrice: number;
    costPrice: number;
    quantity: number;
  }>({
    code: "",
    name: "",
    category: "Solar Luminaire",
    unitPrice: 1650,
    costPrice: 1050,
    quantity: 24
  });
  const [dealInjectMode, setDealInjectMode] = useState<"existing" | "new">("existing");
  const [targetDealId, setTargetDealId] = useState(crmOpportunities[0]?.id || "");
  const [newDealName, setNewDealName] = useState("");
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || "");

  // P2-04: Product Comparison State & Symmetric Cache
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareProductA, setCompareProductA] = useState<string>("Intense Light - 50W Solar");
  const [compareProductB, setCompareProductB] = useState<string>("Pro Blade Solar 75/125");
  const [activeComparison, setActiveComparison] = useState<ProductComparisonRecord | null>(null);
  const [isComparisonFromCache, setIsComparisonFromCache] = useState(false);

  // P2-09: Pricing Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<{ code: string; name: string }>({
    code: "TAIZ-50W",
    name: "Intense Light - 50W Solar"
  });

  const handleOpenComparison = (prodA: string, prodB: string) => {
    setCompareProductA(prodA);
    setCompareProductB(prodB);
    setIsCompareModalOpen(true);

    const cached = productComparisonCache.get([prodA, prodB]);
    if (cached) {
      setActiveComparison(cached);
      setIsComparisonFromCache(true);
    } else {
      const generated: ProductComparisonRecord = {
        productIds: [prodA, prodB],
        standardsVersion: "AS/NZS 1158:2020",
        catalogueVersion: "2026.1",
        comparedAt: Date.now(),
        comparisonMatrix: {
          luminaireOutput: { [prodA]: "5,000 – 7,500 lm", [prodB]: "8,500 – 14,000 lm" },
          windRating: { [prodA]: "Region A / B (Up to 45 m/s)", [prodB]: "Region C Cyclonic (Up to 56 m/s)" },
          batteryReserve: { [prodA]: "4 Days Continuous Autonomy", [prodB]: "6 Days Continuous Autonomy" },
          mountingHeight: { [prodA]: "4.5m – 6.0m Direct Bury", [prodB]: "6.0m – 8.0m Baseplate / Ragbolt" },
          warranty: { [prodA]: "5-Year Plasgain System", [prodB]: "5-Year Plasgain System" }
        },
        tradeOffsSummary: `${prodB} offers significantly higher lumen output and cyclonic wind rating for major arterial or coastal paths, whereas ${prodA} is optimized for lightweight rapid installation on pedestrian shared paths.`
      };
      productComparisonCache.set([prodA, prodB], generated);
      setActiveComparison(generated);
      setIsComparisonFromCache(false);
    }
  };

  const requestControlledPhotometric = (productName: string, productCode: string) => {
    if (!isApprovedProduct({ productCode, productName })) {
      showToast("A controlled product SKU is required before requesting photometric data.", "warning");
      return;
    }
    navigateToWorkflow("documents");
    showToast(`Opened controlled documents for ${productName} (${productCode}). Use only the approved IES revision.`, "info");
  };

  const handleOpenAddToDeal = (name: string, code?: string) => {
    // Resolve against the catalogue rather than defaulting to a placeholder SKU.
    // Prices start at zero: this app has no pricing feed, so a rep must enter a
    // real figure instead of inheriting an invented one.
    const resolved = resolveSingleProduct({ productCode: code, productName: name });
    setSelectedProductForDeal({
      code: resolved.product?.code || code || "",
      name: resolved.product?.name || name || "",
      category: resolved.product?.category || "Luminaire",
      unitPrice: 0,
      costPrice: 0,
      quantity: 24
    });
    setNewDealName(`${name} Installation Project`);
    setIsDealModalOpen(true);
  };

  const handleConfirmAddToDeal = () => {
    const lineItem = {
      id: `prod-finder-${Date.now()}`,
      productCode: selectedProductForDeal.code,
      productName: selectedProductForDeal.name,
      category: selectedProductForDeal.category,
      quantity: selectedProductForDeal.quantity,
      unit: "ea",
      unitPrice: selectedProductForDeal.unitPrice,
      costPrice: selectedProductForDeal.costPrice,
      totalPrice: selectedProductForDeal.unitPrice * selectedProductForDeal.quantity,
      marginPercent: Math.round(((selectedProductForDeal.unitPrice - selectedProductForDeal.costPrice) / selectedProductForDeal.unitPrice) * 100),
      isOstendoVerified: true,
      notes: `Matched via Product Finder for ${application} in ${location}.`
    };

    if (dealInjectMode === "existing") {
      const deal = crmOpportunities.find((d) => d.id === targetDealId);
      if (!deal) {
        showToast("Please select a target deal", "warning");
        return;
      }
      const updatedProducts = [...(deal.products || []), lineItem];
      const newDealValue = (deal.dealValue || 0) + lineItem.totalPrice;

      updateCrmOpportunity(deal.id, {
        products: updatedProducts,
        dealValue: newDealValue,
        weightedValue: newDealValue * (deal.probability / 100),
        latestActivity: `Added ${selectedProductForDeal.name} from Product Finder`,
        latestActivityDate: new Date().toISOString().split("T")[0]
      });

      showToast(`Added ${selectedProductForDeal.name} to deal "${deal.name}"!`, "success");
      setIsDealModalOpen(false);
      navigateToCRM("pipeline", deal.id);
    } else {
      const acc = accounts.find((a) => a.id === targetAccountId) || accounts[0];
      const pipe = (pipelines && pipelines.length > 0) ? (pipelines.find((p) => p.isDefault) || pipelines[0]) : { id: "pipe-major-projects", stages: [{ id: "stage-new", name: "New Opportunity", probability: 10 }] };
      const stage = pipe.stages[0];
      const newId = `deal-finder-${Date.now()}`;

      addCrmOpportunity({
        id: newId,
        name: newDealName || `${selectedProductForDeal.name} Project`,
        accountId: acc.id,
        accountName: acc.name,
        primaryContactId: "con-1",
        primaryContactName: "Project Lead",
        opportunityOwner: currentUser.name,
        pipelineId: pipe.id,
        stageId: stage.id,
        stageName: stage.name,
        dealValue: lineItem.totalPrice,
        weightedValue: lineItem.totalPrice * (stage.probability / 100),
        probability: stage.probability,
        forecastCategory: "Pipeline",
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        products: [lineItem],
        projectApplication: application,
        location: location,
        customerNeed: `Matched ${selectedProductForDeal.name} via Product Finder.`,
        keyRequirements: [`Mounting: ${mountingHeight}`, `Lux standard: ${luxOrClass}`],
        source: "Product Finder",
        latestActivity: "Created opportunity from Product Finder recommendation",
        latestActivityDate: new Date().toISOString().split("T")[0],
        nextAction: "Send lighting proposal and IES photometric simulation",
        nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        daysInCurrentStage: 0,
        totalDealAgeDays: 0,
        dealHealth: "Healthy",
        dealHealthReasons: ["Engineered specification matched by AI"],
        notes: `Selected candidate from Product Finder.`
      });

      showToast(`Created new CRM Deal: "${newDealName}"!`, "success");
      setIsDealModalOpen(false);
      navigateToCRM("pipeline", newId);
    }
  };

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
      setFinderError(null);
      const data = await apiPost("/api/product-finder", {
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
      });
      const primary = data?.primaryRecommendation || data?.recommendedProducts?.[0];
      if (!isApprovedProduct(primary)) {
        throw new AIUnavailableError(
          "The recommendation could not be matched to a product in the Plasgain catalogue.",
          "Check the catalogue directly or ask the Copilot before quoting anything from this screen."
        );
      }
      setFinderResult(data);
      showToast("Product candidates matched", "success");
    } catch (err: any) {
      // No offline substitute. Earlier versions manufactured products, SKUs,
      // lumen packages and prices here and presented them as a "Deterministic
      // Rules Engine" result, which is how invented specifications reached
      // customers. A rep must see that nothing was matched.
      console.warn("Product Finder failed:", err);
      setFinderResult(null);
      setFinderError(
        err instanceof AIUnavailableError
          ? { detail: err.detail, guidance: err.guidance }
          : { detail: toUserMessage(err), guidance: "Retry, or use the Copilot to look the product up in the catalogue." }
      );
      showToast("No product match returned", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Intelligent Product Finder</h1>
            <span className="text-meta font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge uppercase tracking-wide">
              Application Matcher
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Guided selection wizard matching Australian Standards (AS/NZS 1158), solar sizing, and pole geometry.
          </p>
        </div>

        {finderResult && (
          <button
            onClick={() => setFinderResult(null)}
            className="text-meta font-medium px-3 py-1.5 rounded-edge border border-line hover:bg-paper transition-colors flex items-center gap-1.5 cursor-pointer self-start shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Wizard</span>
          </button>
        )}
      </div>

      {/* Primary Application Step */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
        <h2 className="text-body font-bold flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-deep text-white text-spec flex items-center justify-center font-bold">
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
                className={`p-3.5 rounded-panel border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-brand-wash border-brand ring-2 ring-brand-deep/20"
                    : "bg-raised border-line hover:border-line-strong hover:bg-paper"
                }`}
              >
                <span className="text-2xl mb-2">{opt.icon}</span>
                <div>
                  <span className={`text-meta font-bold block ${isSelected ? "text-brand-deep" : "text-body"}`}>
                    {opt.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Conditional Questions */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-bold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-deep text-white text-spec flex items-center justify-center font-bold">
              2
            </span>
            Application Parameters & Environmental Factors
          </h2>
          <span className="text-meta text-ink-faint font-medium">Australian Conditions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Power Availability */}
          <div>
            <label className="block text-meta font-semibold mb-1">
              Power Availability
            </label>
            <select
              value={powerAvailability}
              onChange={(e) => setPowerAvailability(e.target.value)}
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
            >
              <option value="Off-grid Solar required">Off-grid Solar (No mains power)</option>
              <option value="Mains 240V Grid Available">Mains 240V Grid Available (Horizon)</option>
              <option value="Hybrid / Solar with Mains Backup">Hybrid / Solar with Mains Backup</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-meta font-semibold mb-1">
              Project Location (Solar Zone)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ballarat, Victoria"
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>

          {/* Mounting / Pole Height */}
          <div>
            <label className="block text-meta font-semibold mb-1">
              Mounting / Pole Height
            </label>
            <select
              value={mountingHeight}
              onChange={(e) => setMountingHeight(e.target.value)}
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
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
            <label className="block text-meta font-semibold mb-1">
              Area Dimensions / Path Width
            </label>
            <input
              type="text"
              value={areaOrWidth}
              onChange={(e) => setAreaOrWidth(e.target.value)}
              placeholder="e.g. 1.2km length, 3m path width"
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>

          {/* Lighting Class / Lux */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-meta font-semibold">Lighting Class / Standards Lux Target</label>
              <button
                type="button"
                onClick={() => setExplainingTerm("AS/NZS 1158")}
                className="text-spec text-brand-deep hover:underline font-medium cursor-pointer"
              >
                What is Cat P?
              </button>
            </div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white font-medium"
            >
              {LIGHTING_STANDARDS_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.category}: {cat.displayName.includes("—") ? cat.displayName.split("—")[1].trim() : cat.displayName} ({cat.maintainedIlluminanceLux} lx avg / {cat.minimumIlluminanceLux} lx min)
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-dim mt-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-deep shrink-0" />
              <span>
                Target: <strong>{selectedCategory.maintainedIlluminanceLux} lx avg</strong> ({selectedCategory.minimumIlluminanceLux} lx min point) · {selectedCategory.standardReference} (Rev {selectedCategory.datasetRevision})
              </span>
            </div>
          </div>

          {/* CCT Preference */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-meta font-semibold">CCT Preference</label>
              <button
                onClick={() => setExplainingTerm("CCT (Correlated Colour Temperature)")}
                className="text-spec text-brand-deep hover:underline font-medium cursor-pointer"
              >
                Explain CCT
              </button>
            </div>
            <select
              value={cctPreference}
              onChange={(e) => setCctPreference(e.target.value)}
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
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
              <label className="text-meta font-semibold">Battery Autonomy</label>
              <button
                onClick={() => setExplainingTerm("Autonomy")}
                className="text-spec text-brand-deep hover:underline font-medium cursor-pointer"
              >
                Explain Autonomy
              </button>
            </div>
            <select
              value={autonomyDays}
              onChange={(e) => setAutonomyDays(e.target.value)}
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
            >
              <option value="4 - 6 days (Southern Victoria / Standard Commercial)">4 to 6 nights (Vic/NSW/Tas Standard)</option>
              <option value="3 - 4 days (Northern QLD / All-in-One)">3 to 4 nights (QLD / High Sun)</option>
              <option value="7+ days (Critical Mining / CCTV Security)">7+ nights (Critical Mining / CCTV Security)</option>
            </select>
          </div>

          {/* Wind Region */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-meta font-semibold">Wind Region (AS1170.2)</label>
              <button
                onClick={() => setExplainingTerm("Wind Region A / B / C / D")}
                className="text-spec text-brand-deep hover:underline font-medium cursor-pointer"
              >
                Explain Wind
              </button>
            </div>
            <select
              value={environmentalConditions}
              onChange={(e) => setEnvironmentalConditions(e.target.value)}
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
            >
              <option value="Region A (Normal Inland - Ballarat, Melbourne, Sydney, Bendigo)">Region A (Normal Inland - VIC/NSW/SA/WA)</option>
              <option value="Region B (Intermediate Coastal - Brisbane, Coastal VIC)">Region B (Intermediate Coastal)</option>
              <option value="Region C (Cyclonic Coastal QLD/WA)">Region C (Cyclonic Coastal)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-meta font-semibold mb-1">
              Estimated Luminaire Quantity
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 24 - 36 fittings"
              className="w-full text-meta p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-line flex justify-end">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-brand-deep hover:bg-brand-deep disabled:bg-line-strong text-white font-medium px-6 py-2.5 rounded-edge text-meta sm:text-body transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Evaluating Plasgain Knowledge Base...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-soon-on-ink" />
                <span>Find Best Product Candidates</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTS DISPLAY */}
      {finderError && !finderResult && (
        <AIUnavailableNotice
          detail={finderError.detail}
          guidance={finderError.guidance}
          onRetry={handleSearch}
        />
      )}

      {finderResult && (() => {
        const primary = finderResult.primaryRecommendation || finderResult.recommendedProducts?.[0] || {};
        const secondaries = finderResult.secondaryCandidates || (finderResult.recommendedProducts && finderResult.recommendedProducts.length > 1 ? finderResult.recommendedProducts.slice(1) : []) || [];
        // Precedence, not a condition. The previous form was
        // `a || b || c ? [c] : [defaults]`, so a truthy `a` still rendered `[c]`
        // (usually `[undefined]`) and everything else fell through to boilerplate
        // that claimed a battery reserve on mains schemes.
        const advantages: string[] = (
          primary.keyAdvantages ||
          primary.keyFeatures ||
          primary.supportingSpecifications?.keyFeatures ||
          []
        ).filter(Boolean);

        // Only the standards caveat is universally true. A solar-array note must
        // come from the analysis, never from a default.
        const limitations: string[] = (
          primary.importantLimitations || [
            "AS/NZS 1158 compliance requires formal Dialux photometric calculation."
          ]
        ).filter(Boolean);
        const specs = primary.specificationsSummary || primary.supportingSpecifications || {};
        const docs = primary.supportingDocuments || primary.sourceCitations?.map((c: any) => ({
          title: c.documentTitle || "Plasgain Product Catalogue",
          version: "2025/2026",
          page: c.sectionOrPage || "Specifications"
        })) || [];
        const primaryApproved = isApprovedProduct(primary);

        return (
          <div className="space-y-6">
            {/* Primary Recommendation */}
            <div className="bg-white rounded-panel border border-brand-edge p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-meta font-bold text-brand-deep uppercase tracking-wider">
                      Best Ranked Candidate
                    </span>
                    <span className="text-meta font-bold px-2.5 py-0.5 rounded bg-brand-deep text-white">
                      {primary.matchLevel || "Strong potential match"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-body">
                    {primary.productName || "Unnamed candidate"} {primary.productCode ? `(${primary.productCode})` : ""}
                  </h3>
                  {/* Show what the quoted string actually resolved to. A model may
                      name a variant that does not exist ("Roadway V-LED 150W"),
                      and the rep needs the catalogue SKU, not the echoed text. */}
                  {(() => {
                    const resolved = resolveSingleProduct(primary);
                    if (!resolved.product) return null;
                    const differs =
                      resolved.product.code.toLowerCase() !== String(primary.productCode || "").toLowerCase();
                    return (
                      <p className="text-spec text-ink-dim mt-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span>
                          Catalogue match: <strong className="text-body">{resolved.product.name}</strong>{" "}
                          <span className="font-mono">({resolved.product.code})</span>
                          {differs && " — confirm the exact variant against the datasheet"}
                        </span>
                      </p>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenAddToDeal(primary.productName, primary.productCode)}
                    disabled={!primaryApproved}
                    className="px-3.5 py-1.5 text-meta font-bold text-white bg-brand-deep hover:bg-brand rounded-edge shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Active Deal</span>
                  </button>

                  <button
                    onClick={() => requestControlledPhotometric(primary.productName, primary.productCode)}
                    disabled={!primaryApproved}
                    className="px-3 py-1.5 text-meta font-semibold text-body bg-white border border-line-strong hover:bg-raised rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Open the controlled document library for the approved IES revision"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-deep" />
                    <span>Approved IES</span>
                  </button>

                  <button
                    onClick={() => {
                      const text = `Plasgain candidate: ${primary.productName || "Unnamed"} (${primary.productCode || "no SKU returned"})\nApplication: ${application}\nMounting: ${mountingHeight}\nCompliance: AS/NZS 1158 ${luxOrClass}\nCCT: ${cctPreference}`;
                      navigator.clipboard?.writeText(text);
                      showToast("Copied technical spec summary to clipboard!", "success");
                    }}
                    className="px-2.5 py-1.5 text-meta font-semibold text-body bg-white border border-line-strong hover:bg-raised rounded-edge transition-colors flex items-center gap-1 cursor-pointer"
                    title="Copy specification summary"
                  >
                    <Copy className="w-3.5 h-3.5 text-ink-faint" />
                  </button>

                  <button
                    onClick={() => {
                      setPricingProduct({
                        code: primary.productCode || "",
                        name: primary.productName || ""
                      });
                      setIsPricingModalOpen(true);
                    }}
                    disabled={!primaryApproved}
                    className="px-3 py-1.5 text-meta font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-edge transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Submit commercial pricing request"
                  >
                    <span>Request Pricing</span>
                  </button>

                  <button
                    onClick={() =>
                      openCopilotWithContext(
                        `Product: ${primary.productName} (${primary.productCode || "Standard"}) - Application: ${application}, Location: ${location}`
                      )
                    }
                    className="px-3 py-1.5 text-meta font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask Copilot</span>
                  </button>
                </div>
              </div>

              {/* Why Suitable */}
              <div className="text-meta leading-relaxed bg-brand-wash p-3.5 rounded-edge border border-brand-edge">
                <strong className="text-brand-deep font-bold block mb-1">Application Suitability:</strong>
                {primary.whySuitable || "Engineered specifically for Australian public infrastructure and off-grid performance."}
              </div>

              {/* Advantages & Limitations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-raised p-4 rounded-edge border border-line text-meta space-y-2">
                  <div className="font-bold text-brand-deep flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                    <span>Key Advantages for this Project</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-body">
                    {advantages.map((adv: string, i: number) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-raised p-4 rounded-edge border border-line text-meta space-y-2">
                  <div className="font-bold text-soon flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-soon" />
                    <span>Important Engineering Limitations & Shading Rules</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-body">
                    {limitations.map((lim: string, i: number) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Specifications Summary Matrix */}
              {specs && Object.keys(specs).length > 0 && (
                <div>
                  <h4 className="text-meta font-bold uppercase tracking-wide mb-2">
                    Technical Specifications Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-meta">
                    {Object.entries(specs).map(([key, val]) => (
                      <div key={key} className="bg-raised p-2.5 rounded border border-line">
                        <span className="text-spec font-bold text-ink-faint uppercase block">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-body font-semibold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Documents & Citations */}
              {docs && docs.length > 0 && (
                <div className="pt-2 border-t border-line flex flex-wrap items-center gap-2">
                  <span className="text-meta font-bold">Supporting Datasheets:</span>
                  {docs.map((doc: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-meta bg-paper text-brand-deep px-2.5 py-1 rounded border border-line font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-deep" />
                      {doc.title || doc.documentTitle} ({doc.version || "2025/2026"} {doc.page ? `- ${doc.page}` : ""})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Secondary Candidates */}
            {secondaries && secondaries.length > 0 && (
              <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-body">Alternative Product Candidates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {secondaries.map((sec: any, idx: number) => (
                    <div key={idx} className="bg-raised p-4 rounded-edge border border-line text-meta space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-body">
                          {sec.productName} {sec.productCode ? `(${sec.productCode})` : ""}
                        </span>
                        <span className="text-spec font-semibold px-2 py-0.5 rounded bg-line">
                          {sec.matchLevel || "Possible match"}
                        </span>
                      </div>
                      <p className="text-body">
                        <strong className="text-body">When to consider:</strong> {sec.whyConsider || sec.whySuitable || sec.whenToUse || "Alternative project requirements."}
                      </p>
                      {(sec.tradeOffs || sec.importantLimitations) && (
                        <p className="text-ink-dim text-spec">
                          <strong className="text-ink-dim">Trade-offs & Notes:</strong> {sec.tradeOffs || sec.importantLimitations?.[0] || "Verify mounting and wind loading."}
                        </p>
                      )}

                      <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenAddToDeal(sec.productName, sec.productCode)}
                          disabled={!isApprovedProduct(sec)}
                          className="px-2.5 py-1 text-spec font-bold text-white bg-brand-deep hover:bg-brand rounded shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add to Deal</span>
                        </button>
                        <button
                          onClick={() => requestControlledPhotometric(sec.productName, sec.productCode)}
                          disabled={!isApprovedProduct(sec)}
                          className="px-2.5 py-1 text-spec font-semibold text-body bg-white border border-line hover:bg-raised rounded flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Download className="w-3 h-3 text-brand-deep" />
                          <span>Approved IES</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sales rep guidance */}
            {finderResult.salesRepAdvice && (
              <div className="bg-[#0F172A] text-chrome-text rounded-panel p-4 text-meta space-y-1 border border-chrome-line">
                <strong className="font-bold text-brand-lift block text-body">Sales Pitch Tip:</strong>
                <p className="text-ink-faint leading-relaxed">{finderResult.salesRepAdvice}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* OPT-01: Add to Quote / Deal Modal */}
      {isDealModalOpen && (
        <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-deep" />
                <h3 className="text-lg font-bold text-body">Add Product to Deal / Quote</h3>
              </div>
              <button
                onClick={() => setIsDealModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-meta">
              {/* Product Preview Card */}
              <div className="p-3 bg-paper rounded-edge border border-line space-y-1">
                <div className="font-bold text-body flex items-center justify-between">
                  <span>{selectedProductForDeal.name}</span>
                  <span className="text-spec font-mono px-2 py-0.5 rounded bg-line">
                    {selectedProductForDeal.code}
                  </span>
                </div>
                <div className="text-spec text-ink-dim">
                  Application: {application} · Standard: {luxOrClass}
                </div>
              </div>

              {/* Quantity & Unit Pricing Form */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedProductForDeal.quantity}
                    onChange={(e) =>
                      setSelectedProductForDeal({
                        ...selectedProductForDeal,
                        quantity: Math.max(1, parseInt(e.target.value) || 1)
                      })
                    }
                    className="w-full p-2 border border-line-strong rounded-edge font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    value={selectedProductForDeal.costPrice}
                    onChange={(e) =>
                      setSelectedProductForDeal({
                        ...selectedProductForDeal,
                        costPrice: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Unit Sell ($)
                  </label>
                  <input
                    type="number"
                    value={selectedProductForDeal.unitPrice}
                    onChange={(e) =>
                      setSelectedProductForDeal({
                        ...selectedProductForDeal,
                        unitPrice: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-2 border border-line-strong rounded-edge font-bold text-brand-deep"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-brand-wash/60 rounded-edge border border-brand-edge flex justify-between items-center text-spec">
                <span className="font-bold text-brand-deep">Schedule Line Value:</span>
                <span className="font-mono font-bold text-body text-base">
                  ${(selectedProductForDeal.unitPrice * selectedProductForDeal.quantity).toLocaleString()} AUD
                </span>
              </div>

              {/* Destination Mode */}
              <div className="space-y-2 pt-2 border-t border-line">
                <label className="block text-spec font-bold uppercase text-ink-dim">
                  Target Destination
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dealInjectMode"
                      checked={dealInjectMode === "existing"}
                      onChange={() => setDealInjectMode("existing")}
                      className="accent-brand-deep"
                    />
                    <span className="font-semibold text-body">Inject into Existing Deal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dealInjectMode"
                      checked={dealInjectMode === "new"}
                      onChange={() => setDealInjectMode("new")}
                      className="accent-brand-deep"
                    />
                    <span className="font-semibold text-body">Spawn New Deal</span>
                  </label>
                </div>

                {dealInjectMode === "existing" ? (
                  <div>
                    <label className="block text-spec text-ink-dim mb-1">Select Active Deal</label>
                    <select
                      value={targetDealId}
                      onChange={(e) => setTargetDealId(e.target.value)}
                      className="w-full p-2 border border-line-strong rounded-edge"
                    >
                      {crmOpportunities.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (${d.dealValue.toLocaleString()} · {d.accountName})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-spec text-ink-dim mb-1">New Deal Name</label>
                      <input
                        type="text"
                        value={newDealName}
                        onChange={(e) => setNewDealName(e.target.value)}
                        className="w-full p-2 border border-line-strong rounded-edge"
                        placeholder="e.g. Waterfront Solar Pathway Lighting"
                      />
                    </div>
                    <div>
                      <label className="block text-spec text-ink-dim mb-1">Customer Account</label>
                      <select
                        value={targetAccountId}
                        onChange={(e) => setTargetAccountId(e.target.value)}
                        className="w-full p-2 border border-line-strong rounded-edge"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsDealModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddToDeal}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Confirm &amp; Open Deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* P2-04: Symmetric Product Comparison Modal */}
      {isCompareModalOpen && activeComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs">
          <div className="bg-surface w-full max-w-3xl rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand-deep">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-body font-bold text-ink">Side-by-Side Product Comparison</h2>
                  <p className="text-spec text-ink-dim">
                    Symmetric technical comparison against AS/NZS standards and official product catalogues
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 rounded-edge hover:bg-hover text-ink-dim"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-meta text-ink">
              {/* Cache Header Banner */}
              <div className="p-3 bg-brand/5 border border-brand/20 rounded-edge flex items-center justify-between text-spec">
                <span className="font-bold text-brand-deep">
                  {isComparisonFromCache ? "⚡ Instant Cached Comparison" : "✨ Newly Computed Comparison"}
                </span>
                <span className="text-ink-dim font-mono">
                  Standards: {activeComparison.standardsVersion} • Catalogue: {activeComparison.catalogueVersion}
                </span>
              </div>

              {/* Comparison Table */}
              <div className="border border-line rounded-edge overflow-hidden">
                <table className="w-full text-left text-meta">
                  <thead>
                    <tr className="bg-raised border-b border-line">
                      <th className="p-3 font-bold text-ink-dim w-1/3">Technical Criterion</th>
                      <th className="p-3 font-bold text-brand-deep w-1/3">{compareProductA}</th>
                      <th className="p-3 font-bold text-brand-deep w-1/3">{compareProductB}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr>
                      <td className="p-3 font-bold text-ink">Luminaire Output</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.luminaireOutput?.[compareProductA] || "Standard Output"}</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.luminaireOutput?.[compareProductB] || "High Output"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-ink">Wind Rating (AS 1170.2)</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.windRating?.[compareProductA] || "Region A/B"}</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.windRating?.[compareProductB] || "Region C Cyclonic"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-ink">Battery Autonomy</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.batteryReserve?.[compareProductA] || "4+ Days"}</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.batteryReserve?.[compareProductB] || "6+ Days"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-ink">Mounting Height &amp; Poles</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.mountingHeight?.[compareProductA] || "4.5m – 6.0m"}</td>
                      <td className="p-3">{activeComparison.comparisonMatrix.mountingHeight?.[compareProductB] || "6.0m – 8.0m"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-ink">System Warranty</td>
                      <td className="p-3 font-semibold text-emerald-800">{activeComparison.comparisonMatrix.warranty?.[compareProductA] || "5-Year"}</td>
                      <td className="p-3 font-semibold text-emerald-800">{activeComparison.comparisonMatrix.warranty?.[compareProductB] || "5-Year"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Trade-offs summary */}
              <div className="p-3.5 bg-paper border border-line rounded-edge text-meta space-y-1">
                <span className="font-bold text-ink block">Consultative Trade-Offs &amp; Engineering Summary:</span>
                <p className="text-ink-dim leading-relaxed">{activeComparison.tradeOffsSummary}</p>
              </div>
            </div>

            <div className="p-4 bg-raised border-t border-line flex justify-end">
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P2-09: Commercial Pricing Request Modal */}
      {isPricingModalOpen && (
        <CommercialPricingRequestModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          projectId="proj-finder-01"
          customerCompany={accounts.find((a) => a.id === targetAccountId)?.name || "Client Organisation"}
          productCode={pricingProduct.code}
          productName={pricingProduct.name}
          initialQuantity={parseInt(quantity, 10) || 12}
          onRequestSubmitted={() => {
            setIsPricingModalOpen(false);
            showToast("Commercial pricing request submitted to Sales Management.", "success");
          }}
        />
      )}
    </div>
  );
};
