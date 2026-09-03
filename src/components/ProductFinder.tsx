import React, { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sun,
  Layers,
  ArrowRight,
  Info,
  Building,
  Zap,
  MapPin,
  Clock,
  Download,
  Plus,
  Copy,
  Package,
  X,
  Search,
  Eye,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { DATASET_METADATA } from "../data/lightingStandards";
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

  const [quickQuery, setQuickQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Default quantity assumed when adding a product to a deal from search results.
  const quantity = "24";

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
      notes: `Matched via Product Finder.`
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
        projectApplication: selectedProductForDeal.category,
        location: "Australia",
        customerNeed: `Matched ${selectedProductForDeal.name} via Product Finder.`,
        keyRequirements: [`Product: ${selectedProductForDeal.name}`],
        source: "Product Finder",
        latestActivity: "Created opportunity from Product Finder recommendation",
        latestActivityDate: new Date().toISOString().split("T")[0],
        nextAction: "Send lighting proposal and product schedule",
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER */}
      <div className="pb-3 border-b border-line">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-body">Product Finder</h1>
        <p className="text-spec text-ink-dim mt-0.5">
          Instant technical lookups and catalogue search.
        </p>
      </div>

      {/* PRODUCT & KNOWLEDGE SEARCH (ZERO-FORM DIRECT LOOKUP) */}
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

            {allProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white rounded-panel border border-line shadow-2xs">
                <Package className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="font-bold text-body text-base">Product Catalogue is Empty (Clean Slate)</h3>
                <p className="text-xs text-ink-dim max-w-md mx-auto">
                  No products are currently loaded. Upload technical drawings, catalogues, or specification sheets in Knowledge Documents to build your verified product library.
                </p>
                <button
                  type="button"
                  onClick={() => navigateToWorkflow("documents")}
                  className="px-4 py-2 rounded-edge bg-brand-deep text-white font-bold text-xs hover:bg-brand transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to Knowledge Documents</span>
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white rounded-panel border border-line shadow-2xs">
                <Package className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="font-bold text-body text-base">No matching products found</h3>
                <p className="text-xs text-ink-dim max-w-md mx-auto">
                  No products matched &ldquo;{quickQuery}&rdquo;. Try clearing the search query or changing category filters.
                </p>
                <button
                  type="button"
                  onClick={() => { setQuickQuery(""); setSelectedCategoryFilter("all"); }}
                  className="px-4 py-1.5 rounded-edge bg-brand-wash text-brand-deep font-bold text-xs border border-brand-edge hover:bg-brand-deep hover:text-white transition-colors cursor-pointer"
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
