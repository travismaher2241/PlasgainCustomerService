import React, { useState, useMemo } from "react";
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
  X,
  Footprints,
  Car,
  Trees,
  ParkingSquare,
  Factory,
  HardHat,
  Waves,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Search,
  Eye,
  ExternalLink,
  BookOpen
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
import { SAMPLE_PRODUCTS } from "../data/mockData";
import type { PlasgainProduct } from "../types";

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
    currentUser,
    products,
    documents,
    setInspectingProduct
  } = useApp();

  // Mode Selection: Quick Search (default) vs Project Matcher
  const [activeTab, setActiveTab] = useState<"quick_search" | "project_matcher">("quick_search");
  const [quickQuery, setQuickQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Essential inputs for Project Matcher
  const [application, setApplication] = useState("Shared path");
  const [location, setLocation] = useState("Regional Australia / Public Infrastructure");
  const [powerAvailability, setPowerAvailability] = useState("Off-grid Solar required");
  const [mountingHeight, setMountingHeight] = useState("6 metres standard");
  const [areaOrWidth, setAreaOrWidth] = useState("1.2 km length, 3m path width");
  const [selectedCategoryId, setSelectedCategoryId] = useState("P4");
  const [quantity, setQuantity] = useState("24");

  // Advanced conditions (collapsible)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [operatingHours, setOperatingHours] = useState("Dusk to dawn");
  const [duskToDawn, setDuskToDawn] = useState(true);
  const [cctPreference, setCctPreference] = useState("3000K (Warm White / Dark-Sky)");
  const [autonomyDays, setAutonomyDays] = useState("4 - 6 days (Southern Victoria)");
  const [environmentalConditions, setEnvironmentalConditions] = useState("Region A (Normal Inland)");
  const [installationTimeline, setInstallationTimeline] = useState("Q4 2026");

  // Extended detail toggle
  const [showExtendedSpecs, setShowExtendedSpecs] = useState(false);

  const selectedCategory = getLightingCategory(selectedCategoryId) || getLightingCategory("P4")!;
  const luxOrClass = `${selectedCategory.displayName} (${selectedCategory.maintainedIlluminanceLux} lux avg / ${selectedCategory.minimumIlluminanceLux} lux min)`;

  const [isLoading, setIsLoading] = useState(false);
  const [finderResult, setFinderResult] = useState<any | null>(null);
  const [finderError, setFinderError] = useState<{ detail: string; guidance?: string } | null>(null);

  // Deal Modal State
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
    unitPrice: 0,
    costPrice: 0,
    quantity: 24
  });
  const [dealInjectMode, setDealInjectMode] = useState<"existing" | "new">("existing");
  const [targetDealId, setTargetDealId] = useState(crmOpportunities[0]?.id || "");
  const [newDealName, setNewDealName] = useState("");
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || "");

  // Product Comparison Modal State
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareProductA, setCompareProductA] = useState<string>("Intense Light - 50W Solar");
  const [compareProductB, setCompareProductB] = useState<string>("Pro Blade Solar 75/125");
  const [activeComparison, setActiveComparison] = useState<ProductComparisonRecord | null>(null);

  // Pricing Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<{ code: string; name: string }>({
    code: "50W-INTENSE",
    name: "Intense Light - 50W Solar"
  });

  const allProducts = useMemo(() => {
    const raw = Array.isArray(products) && products.length > 0 ? products : (SAMPLE_PRODUCTS || []);
    const seen = new Set<string>();
    const list: PlasgainProduct[] = [];
    for (const p of raw) {
      if (!p) continue;
      const key = `${p.code || ""}_${p.name || ""}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    }
    return list;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (!p) return false;
      const term = `${p.name || ""} ${p.code || ""} ${p.category || ""} ${(p.keyFeatures || []).join(" ")} ${(p.standardCompliance || []).join(" ")} ${(p.application || []).join(" ")} ${p.poleHeight || ""} ${p.lumens || ""} ${p.battery || ""}`.toLowerCase();
      const matchesQuery = !quickQuery.trim() || term.includes(quickQuery.toLowerCase());

      const catLower = (p.category || "").toLowerCase();
      const matchesCategory =
        selectedCategoryFilter === "all" ||
        (selectedCategoryFilter === "solar" && (catLower.includes("solar") || catLower.includes("luminaire"))) ||
        (selectedCategoryFilter === "poles" && (catLower.includes("pole") || catLower.includes("modular"))) ||
        (selectedCategoryFilter === "covers" && catLower.includes("cover"));

      return matchesQuery && matchesCategory;
    });
  }, [allProducts, quickQuery, selectedCategoryFilter]);

  const matchingDocuments = useMemo(() => {
    if (!quickQuery.trim()) return [];
    return (Array.isArray(documents) ? documents : []).filter((doc) => {
      if (!doc) return false;
      const term = `${doc.title || ""} ${doc.productFamily || ""} ${doc.source || ""} ${doc.version || ""} ${doc.documentType || ""}`.toLowerCase();
      return term.includes(quickQuery.toLowerCase());
    });
  }, [documents, quickQuery]);

  const handleOpenComparison = (prodA: string, prodB: string) => {
    setCompareProductA(prodA);
    setCompareProductB(prodB);
    setIsCompareModalOpen(true);

    const cached = productComparisonCache.get([prodA, prodB]);
    if (cached) {
      setActiveComparison(cached);
    } else {
      const a = resolveSingleProduct(prodA).product;
      const b = resolveSingleProduct(prodB).product;
      const unknown = "Not published — check the datasheet";
      const cell = (x?: string, y?: string) => ({ [prodA]: x || unknown, [prodB]: y || unknown });

      const generated: ProductComparisonRecord = {
        productIds: [prodA, prodB],
        standardsVersion: "AS/NZS 1158:2020",
        catalogueVersion: DATASET_METADATA.revision,
        comparedAt: Date.now(),
        comparisonMatrix: {
          luminaireOutput: cell(a?.lumens, b?.lumens),
          windRating: cell(a?.ingressImpact, b?.ingressImpact),
          batteryReserve: cell(a?.autonomy, b?.autonomy),
          mountingHeight: cell(a?.poleHeight, b?.poleHeight),
          warranty: cell(a?.warranty, b?.warranty)
        },
        tradeOffsSummary:
          a && b
            ? `${a.name} (${a.category}) versus ${b.name} (${b.category}). Figures are drawn from published catalogue entries; confirm the exact variant and photometric performance against controlled datasheet before quoting.`
            : "One or both products could not be matched to a catalogue entry."
      };
      productComparisonCache.set([prodA, prodB], generated);
      setActiveComparison(generated);
    }
  };

  const handleOpenAddToDeal = (name: string, code?: string) => {
    const resolved = resolveSingleProduct({ productCode: code, productName: name });
    const finalCode = resolved.product?.code || code || "";
    setSelectedProductForDeal({
      code: finalCode,
      name: resolved.product?.name || name || "",
      category: resolved.product?.category || "Solar Luminaire",
      unitPrice: 0,
      costPrice: 0,
      quantity: parseInt(quantity, 10) || 24
    });
    setNewDealName(`${name} Lighting Project`);
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
      marginPercent: selectedProductForDeal.unitPrice > 0 ? Math.round(((selectedProductForDeal.unitPrice - selectedProductForDeal.costPrice) / selectedProductForDeal.unitPrice) * 100) : 0,
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
        dealHealthReasons: ["Engineered specification matched by Product Finder"],
        notes: `Selected candidate from Product Finder.`
      });

      showToast(`Created new CRM Deal: "${newDealName}"!`, "success");
      setIsDealModalOpen(false);
      navigateToCRM("pipeline", newId);
    }
  };

  // Compact application options with Lucide icons (PART B)
  const applicationOptions = [
    { id: "Shared path", label: "Shared path / pedestrian", icon: Footprints, desc: "AS/NZS 1158.3.1 Cat P4/P3 pathway lighting" },
    { id: "Road / Street", label: "Road / subdivision street", icon: Car, desc: "Local road & collector street lighting" },
    { id: "Park / Reserve", label: "Council park / reserve", icon: Trees, desc: "Public open spaces with fauna & dark-sky overlays" },
    { id: "Car park", label: "Commercial car park", icon: ParkingSquare, desc: "AS/NZS 1158.3.1 Cat P11/P12 vehicle transit" },
    { id: "Industrial yard", label: "Industrial yard / logistics", icon: Factory, desc: "Security and perimeter illumination" },
    { id: "Mine site", label: "Mine site / heavy compound", icon: HardHat, desc: "High vibration & cyclonic wind resistance" },
    { id: "Foreshore / Botanical", label: "Foreshore / coastal", icon: Waves, desc: "C5 marine corrosion & wildlife-friendly optics" },
    { id: "Security area", label: "Site security / CCTV", icon: ShieldAlert, desc: "High vertical illuminance for facial recognition" }
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
      setFinderResult(data);
      showToast("Product recommendation generated!", "success");
    } catch (err: any) {
      if (err instanceof AIUnavailableError) {
        setFinderError({ detail: err.detail, guidance: err.guidance });
      } else {
        showToast(toUserMessage(err), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Suitability Badge Helper (PART F)
  const getSuitabilityBadge = (suitability?: string) => {
    const s = (suitability || "Suitable candidate").toLowerCase();
    if (s.includes("suitable") || s.includes("preferred")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
          <Check className="w-3 h-3" />
          <span>Suitable candidate</span>
        </span>
      );
    }
    if (s.includes("review") || s.includes("needs review") || s.includes("missing")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Match needs review</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        <span>Engineering review required</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER & TAB SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-body">Product Finder</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            Instant technical lookups, catalogue search, utility approvals, and Australian Standards (AS/NZS 1158) project matching.
          </p>
        </div>

        {/* TAB TOGGLE */}
        <div className="flex items-center bg-raised p-1 rounded-edge border border-line shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("quick_search")}
            className={`px-3.5 py-1.5 rounded-edge text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "quick_search"
                ? "bg-white text-brand-deep shadow-xs border border-line"
                : "text-ink-dim hover:text-body"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Quick Product Search</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("project_matcher")}
            className={`px-3.5 py-1.5 rounded-edge text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "project_matcher"
                ? "bg-white text-brand-deep shadow-xs border border-line"
                : "text-ink-dim hover:text-body"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Project Matcher (AS/NZS 1158)</span>
          </button>
        </div>
      </div>

      {/* 1. QUICK PRODUCT & KNOWLEDGE SEARCH VIEW (ZERO-FORM DIRECT LOOKUP) */}
      {activeTab === "quick_search" && (
        <div className="space-y-5">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white rounded-panel border border-line p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-brand-deep absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search any product name, code (e.g. PBS-75, 50W-INTENSE, PR5.5, PathMaster), utility (Powercor, Ausnet, Jemena), or spec..."
                className="w-full pl-11 pr-10 py-3 bg-surface border border-line rounded-edge text-sm font-medium text-body placeholder:text-ink-dim/60 focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep shadow-2xs"
              />
              {quickQuery && (
                <button
                  type="button"
                  onClick={() => setQuickQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-body p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* CATEGORY FILTER CHIPS */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs font-bold text-ink-dim">Filter:</span>
              {[
                { id: "all", label: "All Products" },
                { id: "solar", label: "Solar Luminaires & Systems" },
                { id: "poles", label: "Modular & Composite Poles" },
                { id: "covers", label: "Cable & Civil Covers" }
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                    selectedCategoryFilter === chip.id
                      ? "bg-brand-wash text-brand-deep border-brand-edge font-bold shadow-2xs"
                      : "bg-white text-ink-dim border-line hover:border-line-strong hover:bg-raised"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* MATCHING KNOWLEDGE BASE DOCUMENTS BANNER IF SEARCH MATCHES */}
          {matchingDocuments.length > 0 && (
            <div className="bg-brand-wash/40 border border-brand-edge/60 rounded-panel p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-deep font-bold text-xs">
                <BookOpen className="w-4 h-4" />
                <span>Matching Knowledge Base Specifications & Standards ({matchingDocuments.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {matchingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 bg-white rounded-lg border border-brand-edge/50 flex items-center justify-between gap-2 hover:border-brand-deep transition-colors shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-body truncate">{doc.title}</p>
                      <p className="text-[11px] text-ink-dim truncate">
                        {doc.productFamily} · {doc.version}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToWorkflow("documents")}
                      className="text-xs text-brand-deep hover:underline font-semibold shrink-0"
                    >
                      View in Library
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRODUCTS RESULTS GRID */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold text-body">
                Available Products ({filteredProducts.length})
              </h2>
              {quickQuery && (
                <span className="text-xs text-ink-dim">
                  Showing results for &ldquo;{quickQuery}&rdquo;
                </span>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white rounded-panel border border-line">
                <Package className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="font-bold text-body text-base">No matching products found</h3>
                <p className="text-xs text-ink-dim max-w-md mx-auto">
                  No products matched &ldquo;{quickQuery}&rdquo;. Try searching for &ldquo;Pro Blade&rdquo;, &ldquo;50W&rdquo;, &ldquo;Composite&rdquo;, or clear the search filter.
                </p>
                <button
                  type="button"
                  onClick={() => { setQuickQuery(""); setSelectedCategoryFilter("all"); }}
                  className="px-4 py-1.5 rounded-edge bg-brand-wash text-brand-deep font-bold text-xs border border-brand-edge hover:bg-brand-deep hover:text-white transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id || product.code}
                    className="bg-white rounded-panel border border-line p-5 shadow-2xs hover:shadow-md hover:border-brand-edge transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge uppercase tracking-wider">
                            {product.code}
                          </span>
                          <h3 className="font-bold text-body text-base mt-1 line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-ink-dim">{product.category}</p>
                        </div>
                      </div>

                      {/* Specs Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-raised/50 p-2.5 rounded-lg border border-line/60">
                        <div>
                          <span className="text-ink-dim block text-[10px]">Luminaire Output</span>
                          <span className="font-semibold text-body truncate block">{product.lumens || "Modular LED"}</span>
                        </div>
                        <div>
                          <span className="text-ink-dim block text-[10px]">Mounting Height</span>
                          <span className="font-semibold text-body truncate block">{product.poleHeight || "4m - 12m"}</span>
                        </div>
                        <div>
                          <span className="text-ink-dim block text-[10px]">Battery / PV</span>
                          <span className="font-semibold text-body truncate block">{product.battery || product.solarPanel || "Integrated Solar"}</span>
                        </div>
                        <div>
                          <span className="text-ink-dim block text-[10px]">Ingress / Impact</span>
                          <span className="font-semibold text-body truncate block">{product.ingressImpact || "IP65 / IK09"}</span>
                        </div>
                      </div>

                      {/* Approvals & Standards Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {product.standardCompliance?.map((std) => (
                          <span
                            key={std}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            {std}
                          </span>
                        ))}
                        {product.warranty && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {product.warranty}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectingProduct(product)}
                        className="px-3 py-1.5 rounded-edge bg-raised hover:bg-line text-body font-semibold text-xs border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-ink-dim" />
                        <span>View Specs</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openCopilotWithContext(`Tell me about the technical specifications and utility approvals for ${product.name} (${product.code}).`)}
                          title="Ask Sales Copilot"
                          className="p-1.5 rounded-edge text-brand-deep hover:bg-brand-wash border border-transparent hover:border-brand-edge transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddToDeal(product.name, product.code)}
                          className="px-3 py-1.5 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Deal</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PROJECT MATCHER & SIZING VIEW */}
      {activeTab === "project_matcher" && (
        <div className="space-y-6">
          {/* 1. COMPACT APPLICATION SELECTOR (PART B) */}
          <div className="bg-white rounded-panel border border-line p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-deep text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Application Type</span>
              </h2>
              <span className="text-xs text-ink-dim font-medium">Select primary project application</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {applicationOptions.map((opt) => {
                const isSelected = application === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setApplication(opt.id)}
                    className={`p-2.5 rounded-edge border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-brand-wash border-brand-deep text-brand-deep font-bold ring-1 ring-brand-deep shadow-2xs"
                        : "bg-white border-line hover:border-line-strong hover:bg-paper text-body font-medium"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-brand-deep" : "text-ink-dim"}`} />
                    <span className="text-xs truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Application Description Hint */}
            <p className="text-xs text-ink-dim pt-1 border-t border-line/60">
              <strong>Selected:</strong> {applicationOptions.find((a) => a.id === application)?.desc}
            </p>
          </div>

      {/* 2. INPUT HIERARCHY: ESSENTIAL VS ADVANCED (PART C & D) */}
      <div className="bg-white rounded-panel border border-line p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-bold text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-deep text-white text-xs flex items-center justify-center font-bold">
              2
            </span>
            <span>Project Parameters</span>
          </h2>
        </div>

        {/* ESSENTIAL INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Estimated Quantity (with Default tag) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-spec font-bold">Quantity (Units)</label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Default (Unconfirmed)
              </span>
            </div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep font-mono"
            />
          </div>

          {/* Mounting Height */}
          <div>
            <label className="block text-spec font-bold mb-1">Mounting Height</label>
            <select
              value={mountingHeight}
              onChange={(e) => setMountingHeight(e.target.value)}
              className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
            >
              <option value="1000mm - 1200mm Bollard">1.0m – 1.2m Bollard</option>
              <option value="3.5m - 4.5m Pedestrian Pole">3.5m – 4.5m Minor Pathway</option>
              <option value="6 metres standard">6.0m Standard Shared Path / Road</option>
              <option value="8 metres">8.0m Collector Road / Car Park</option>
              <option value="10m - 12m High Mast">10m – 12m Industrial Mast</option>
            </select>
          </div>

          {/* Power Availability */}
          <div>
            <label className="block text-spec font-bold mb-1">Power Type</label>
            <select
              value={powerAvailability}
              onChange={(e) => setPowerAvailability(e.target.value)}
              className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
            >
              <option value="Off-grid Solar required">Off-grid Solar</option>
              <option value="Mains 240V Grid Available">Mains 240V Grid</option>
              <option value="Hybrid / Solar with Mains Backup">Hybrid / Mains Backup</option>
            </select>
          </div>

          {/* Lighting Standard / Class */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-spec font-bold">Lighting Standard Class</label>
              <button
                type="button"
                onClick={() => setExplainingTerm("AS/NZS 1158")}
                className="text-xs text-brand-deep hover:underline font-medium cursor-pointer"
              >
                Explain classes
              </button>
            </div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
            >
              {LIGHTING_STANDARDS_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.displayName} ({cat.maintainedIlluminanceLux} lux avg)
                </option>
              ))}
            </select>
          </div>

          {/* Project Location (with Default tag) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-spec font-bold">Project Location</label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Default (Unconfirmed)
              </span>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ballarat, Victoria"
              className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
            />
          </div>

          {/* Path Dimensions (with Default tag) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-spec font-bold">Path / Area Dimensions</label>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Default (Unconfirmed)
              </span>
            </div>
            <input
              type="text"
              value={areaOrWidth}
              onChange={(e) => setAreaOrWidth(e.target.value)}
              placeholder="e.g. 1.2km length, 3m path width"
              className="w-full text-spec p-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
            />
          </div>
        </div>

        {/* ADVANCED CONDITIONS (COLLAPSIBLE, PART C) */}
        <div className="pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1.5 cursor-pointer py-1"
          >
            <span>{showAdvanced ? "Hide advanced conditions" : "Show advanced conditions (Site, CCT, Autonomy, Schedule)"}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 animate-in fade-in duration-100">
              {/* Site Conditions */}
              <div>
                <label className="block text-spec font-bold mb-1">Site Conditions</label>
                <select
                  value={environmentalConditions}
                  onChange={(e) => setEnvironmentalConditions(e.target.value)}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white"
                >
                  <option value="Standard inland">Standard inland</option>
                  <option value="Coastal / marine exposure">Coastal / marine exposure</option>
                  <option value="Tropical / high UV">Tropical / high UV</option>
                  <option value="Exposed / high wind area">Exposed / high wind area</option>
                </select>
              </div>

              {/* CCT Preference */}
              <div>
                <label className="block text-spec font-bold mb-1">Colour Temperature (CCT)</label>
                <select
                  value={cctPreference}
                  onChange={(e) => setCctPreference(e.target.value)}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white"
                >
                  <option value="3000K (Warm White / Dark-Sky)">3000K Warm White (Dark-Sky / Wildlife)</option>
                  <option value="4000K (Neutral White)">4000K Neutral White (Standard Urban)</option>
                  <option value="5700K (Daylight / Industrial)">5700K Daylight (Industrial / Mining)</option>
                </select>
              </div>

              {/* Battery Autonomy */}
              <div>
                <label className="block text-spec font-bold mb-1">Autonomy Reserve</label>
                <select
                  value={autonomyDays}
                  onChange={(e) => setAutonomyDays(e.target.value)}
                  className="w-full text-spec p-2 rounded-edge border border-line bg-white"
                >
                  <option value="4 - 6 days (Southern Victoria)">4 – 6 Nights (Southern States / Cloud Cover)</option>
                  <option value="2 - 3 days (Sunbelt Tropical)">2 – 3 Nights (Tropical / Desert Sunbelt)</option>
                  <option value="7+ days (Critical Infrastructure)">7+ Nights (Critical Public Safety)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SEARCH TRIGGER BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="px-5 py-2.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Searching Catalogue...</span>
              </>
            ) : (
              <>
                <SearchCode className="w-4 h-4" />
                <span>Find Matching Products</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {finderError && (
        <AIUnavailableNotice
          detail={finderError.detail}
          guidance={finderError.guidance}
          onRetry={handleSearch}
        />
      )}

      {/* 3. PRODUCT FINDER RESULTS (PART F & G) */}
      {finderResult && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* PRIMARY RECOMMENDATION CARD */}
          <div className="bg-white rounded-panel border-2 border-brand-edge p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-body">{finderResult.recommendedProduct?.name || "Plasgain Pro Blade Solar 75"}</h3>
                  {getSuitabilityBadge(finderResult.suitabilityStatus)}
                </div>
                <div className="flex items-center gap-2 text-spec">
                  <span className="font-mono font-bold text-brand-deep">
                    SKU: {finderResult.recommendedProduct?.code || "PBS-75W-SOLAR"}
                  </span>
                  <span className="text-ink-dim">·</span>
                  <span className="text-ink-dim">{finderResult.recommendedProduct?.category || "Solar Pathway Luminaire"}</span>
                </div>
              </div>

              {/* ADD TO DEAL ACTION (PART R) */}
              <button
                type="button"
                onClick={() => handleOpenAddToDeal(finderResult.recommendedProduct?.name || "Plasgain Pro Blade Solar 75", finderResult.recommendedProduct?.code || "PBS-75W-SOLAR")}
                className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add to deal</span>
              </button>
            </div>

            {/* SUITABILITY HIGHLIGHTS & UNRESOLVED LIMITATIONS (PART F) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-spec">
              {/* Fits */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-edge p-3 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Matches Project Scope</span>
                </span>
                <ul className="text-xs text-emerald-950 space-y-1">
                  <li>• Matched for <strong>{application}</strong> application</li>
                  <li>• Designed for <strong>{mountingHeight}</strong> mounting geometry</li>
                  <li>• Satisfies <strong>{selectedCategory.displayName}</strong> illuminance targets ({selectedCategory.maintainedIlluminanceLux} lux avg)</li>
                  <li>• Configured with <strong>{cctPreference}</strong> optics</li>
                </ul>
              </div>

              {/* Limitations / Still to Confirm */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-edge p-3 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Still to Confirm Before Sign-off</span>
                </span>
                <ul className="text-xs text-amber-950 space-y-1">
                  <li>• Geotechnical soil verification for footing embedment depth</li>
                  <li>• Certified DIALux photometric spacing layout for compliance audit</li>
                  <li>• Regional shading analysis for winter solar insolation (PSH)</li>
                </ul>
              </div>
            </div>

            {/* COLLAPSIBLE EXTENDED SPECIFICATIONS (PART G) */}
            <div className="pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowExtendedSpecs(!showExtendedSpecs)}
                className="text-xs font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showExtendedSpecs ? "Hide technical specifications & advantages" : "View technical specifications & advantages"}</span>
                {showExtendedSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showExtendedSpecs && (
                <div className="pt-3 space-y-3 text-spec animate-in fade-in duration-100">
                  <div className="p-3 bg-paper rounded-edge border border-line text-xs text-body leading-relaxed">
                    {finderResult.technicalRationale || "Engineered composite housing with integrated LiFePO4 battery pack, Monocrystalline high-efficiency solar panel, and Type 2 pathway distribution lens."}
                  </div>

                  {finderResult.engineeringConsiderations && (
                    <div className="text-xs text-ink-dim">
                      <strong>Standards Evidence:</strong> {finderResult.engineeringConsiderations}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ALTERNATIVES COMPARISON TABLE (PART G) */}
          {finderResult.alternatives && finderResult.alternatives.length > 0 && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-body text-base">Alternative Candidates</h3>
              <p className="text-xs text-ink-dim">
                Comparison of valid secondary options against required parameters.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-spec">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-ink-dim text-xs font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Output / Spec</th>
                      <th className="py-2.5 px-3">Mounting</th>
                      <th className="py-2.5 px-3">Trade-off / Note</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {finderResult.alternatives.map((alt: any, idx: number) => (
                      <tr key={idx} className="hover:bg-raised/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-body">{alt.name}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{alt.code || "SKU to verify"}</td>
                        <td className="py-2.5 px-3 text-xs text-ink-dim">{alt.lumens || alt.wattage || "Standard output"}</td>
                        <td className="py-2.5 px-3 text-xs">{alt.poleHeight || mountingHeight}</td>
                        <td className="py-2.5 px-3 text-xs text-ink-dim">{alt.reason || "Higher wattage candidate"}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenAddToDeal(alt.name, alt.code)}
                            className="px-2.5 py-1 text-xs border border-line rounded-edge bg-white hover:bg-raised text-brand-deep font-bold cursor-pointer"
                          >
                            Add to deal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )}

      {/* ADD TO DEAL MODAL (PART R) */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-deal-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="add-to-deal-title" className="font-bold text-body text-base">
                Add Product to Deal
              </h3>
              <button onClick={() => setIsDealModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-spec">
              <div className="p-3 bg-paper rounded-edge border border-line">
                <div className="font-bold text-body">{selectedProductForDeal.name}</div>
                <div className="text-xs text-ink-dim font-mono mt-0.5">
                  SKU: {selectedProductForDeal.code || "Exact SKU not yet determined"}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Target Mode</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={dealInjectMode === "existing"}
                      onChange={() => setDealInjectMode("existing")}
                    />
                    <span>Existing Active Deal</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={dealInjectMode === "new"}
                      onChange={() => setDealInjectMode("new")}
                    />
                    <span>Create New Deal</span>
                  </label>
                </div>
              </div>

              {dealInjectMode === "existing" ? (
                <div>
                  <label className="block font-bold mb-1">Select Deal *</label>
                  <select
                    value={targetDealId}
                    onChange={(e) => setTargetDealId(e.target.value)}
                    className="w-full p-2 border border-line rounded-edge bg-white"
                  >
                    {crmOpportunities.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.accountName})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold mb-1">New Deal Name *</label>
                    <input
                      value={newDealName}
                      onChange={(e) => setNewDealName(e.target.value)}
                      className="w-full p-2 border border-line rounded-edge bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Account *</label>
                    <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="w-full p-2 border border-line rounded-edge bg-white"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedProductForDeal.quantity}
                    onChange={(e) =>
                      setSelectedProductForDeal({
                        ...selectedProductForDeal,
                        quantity: parseInt(e.target.value, 10) || 1
                      })
                    }
                    className="w-full p-2 border border-line rounded-edge bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Unit Price ($ Ex GST)</label>
                  <input
                    type="number"
                    min={0}
                    value={selectedProductForDeal.unitPrice}
                    onChange={(e) =>
                      setSelectedProductForDeal({
                        ...selectedProductForDeal,
                        unitPrice: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full p-2 border border-line rounded-edge bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsDealModalOpen(false)}
                className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToDeal}
                className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
              >
                Add to deal
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
