import React, { useState } from "react";
import {
  Kanban,
  ListFilter,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Mail,
  FileSpreadsheet,
  Download,
  Copy,
  Trash2,
  Sliders,
  Tag,
  Check,
  Package,
  RefreshCw,
  Phone,
  Zap,
  ClipboardCheck,
  X
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, DealHealthRating, OpportunityProductLine } from "../../types/crm";
import { CustomerFollowUpModal } from "../CustomerFollowUpModal";
import { DatasheetPackageModal } from "../DatasheetPackageModal";
import { SAMPLE_PRODUCTS } from "../../data/mockData";
import { validateDealValue, ValueBasis } from "../../utils/dealValueValidator";
import { detectDuplicateOpportunity, DuplicateMatchResult } from "../../utils/duplicateDetector";
import { CRMDuplicateWarningModal } from "./CRMDuplicateWarningModal";
import {
  formatOstendoCSV,
  formatOstendoTabDelimited,
  validateOstendoItems,
  downloadOstendoCSV,
  copyOstendoProductList
} from "../../utils/datasheetExporter";

export const CRMPipelineView: React.FC = () => {
  const {
    crmOpportunities,
    updateCrmOpportunity,
    addCrmOpportunity,
    selectedCrmOpportunityId,
    setSelectedCrmOpportunityId,
    pipelines,
    activePipelineId,
    setActivePipelineId,
    accounts,
    openQuickLog,
    openCallPrep,
    openEmailComposer,
    navigateToCRM,
    logActivity,
    addTask,
    currentUser,
    showToast
  } = useApp();

  const [stageFilter, setStageFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<string>("dealValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDatasheetModalOpen, setIsDatasheetModalOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatchResult<any> | null>(null);
  const [pendingDealToCreate, setPendingDealToCreate] = useState<CRMOpportunity | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // BOM Editor local state
  const [isAddingBomLine, setIsAddingBomLine] = useState(false);
  const [newBomLine, setNewBomLine] = useState<{
    catalogId: string;
    productCode: string;
    productName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    unit: string;
  }>({
    catalogId: "",
    productCode: "50W-INTENSE",
    productName: "Intense Light - 50W Solar",
    category: "Solar Luminaire",
    quantity: 10,
    unitPrice: 1600,
    costPrice: 1000,
    unit: "ea"
  });
  const [targetMarginSlider, setTargetMarginSlider] = useState<number>(35);
  const [showIncGst, setShowIncGst] = useState<boolean>(false);

  // Active pipeline configuration
  const currentPipeline = pipelines.find((p) => p.id === activePipelineId) || pipelines[0];

  // Filtered opportunities
  const filteredDeals = crmOpportunities.filter((deal) => {
    const matchesPipeline = deal.pipelineId === activePipelineId;
    const matchesSearch =
      (deal.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.accountName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.projectApplication || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHealth = healthFilter === "all" || deal.dealHealth === healthFilter;
    const matchesStage = stageFilter === "all" || deal.stageId === stageFilter;
    return matchesPipeline && matchesSearch && matchesHealth && matchesStage;
  });

  // Sorted deals for table view
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    let aVal: any = (a as any)[sortColumn] || "";
    let bVal: any = (b as any)[sortColumn] || "";
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalTableValue = filteredDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
  const totalTableWeighted = filteredDeals.reduce((sum, d) => sum + (d.weightedValue || 0), 0);
  const selectedDeal = crmOpportunities.find((d) => d.id === selectedCrmOpportunityId);

  // New Deal Form State (P1: Zero Fabrication Defaults)
  const [newDealForm, setNewDealForm] = useState({
    name: "",
    accountId: accounts[0]?.id || "",
    primaryContactName: "",
    dealValue: "" as string | number,
    unitPrice: "" as string | number,
    quantity: "" as string | number,
    valueBasis: "TOTAL" as ValueBasis,
    commercialState: "Estimate" as "Known" | "Estimate" | "Unknown",
    stageId: currentPipeline.stages[0]?.id || "stage-new",
    projectApplication: "",
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: ""
  });

  const dealValidation = React.useMemo(() => {
    const rawVal = newDealForm.valueBasis === "PER_UNIT" ? Number(newDealForm.unitPrice) || 0 : Number(newDealForm.dealValue) || 0;
    // A blank quantity must stay blank. Coercing it to 1 here is what let a
    // per-unit price save as the whole project value.
    const parsedQty = Number(newDealForm.quantity);
    const qty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : undefined;
    return validateDealValue({
      enteredValue: rawVal,
      basis: newDealForm.valueBasis,
      quantity: qty
    });
  }, [newDealForm.valueBasis, newDealForm.unitPrice, newDealForm.dealValue, newDealForm.quantity]);

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.name.trim()) return;
    if (!dealValidation.isValid) {
      showToast(dealValidation.warningMessage || "Check the deal value before saving.", "error");
      return;
    }

    const account = accounts.find((a) => a.id === newDealForm.accountId) || accounts[0] || {
      id: `acc-cust-${Date.now()}`,
      name: "Direct Commercial Client"
    };
    const stage = currentPipeline.stages.find((s) => s.id === newDealForm.stageId) || currentPipeline.stages[0];
    const rawVal = newDealForm.valueBasis === "PER_UNIT" ? Number(newDealForm.unitPrice) : Number(newDealForm.dealValue);
    const finalDealValue = isNaN(rawVal) || rawVal <= 0 ? 0 : dealValidation.effectiveTotal;
    const commercialBasis = finalDealValue > 0 ? newDealForm.commercialState : "Unknown";

    const newDeal: CRMOpportunity = {
      id: `opp-${Date.now()}`,
      name: newDealForm.name,
      accountId: account.id,
      accountName: account.name,
      primaryContactId: `con-${Date.now()}`,
      primaryContactName: newDealForm.primaryContactName || "Project Engineer",
      opportunityOwner: currentUser.name,
      pipelineId: activePipelineId,
      stageId: stage.id,
      stageName: stage.name,
      dealValue: finalDealValue,
      dealValueBasis: commercialBasis,
      weightedValue: (finalDealValue * stage.probability) / 100,
      probability: stage.probability,
      forecastCategory: "Pipeline",
      expectedCloseDate: newDealForm.expectedCloseDate,
      products: [],
      projectApplication: newDealForm.projectApplication,
      location: account.billingAddress?.city || "Australia",
      customerNeed: newDealForm.notes,
      keyRequirements: [],
      source: "Manual Ingestion",
      latestActivity: "Deal created in CRM",
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Perform technical requirements discovery",
      nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["New opportunity with fresh timeline"],
      notes: newDealForm.notes
    };

    const duplicate = detectDuplicateOpportunity(
      {
        customerCompany: account.name,
        project: newDealForm.name,
        tenderRef: newDealForm.quoteNumber || newDealForm.ostendoQuoteRef
      },
      crmOpportunities.map((d) => ({
        id: d.id,
        customerCompany: d.accountName,
        project: d.name,
        quoteNumber: d.quoteNumber,
        ostendoQuoteRef: d.ostendoQuoteRef,
        status: d.stageName
      } as any))
    );

    if (duplicate) {
      setPendingDealToCreate(newDeal);
      setDuplicateMatch(duplicate);
      setIsDuplicateModalOpen(true);
      return;
    }

    addCrmOpportunity(newDeal);
    setSelectedCrmOpportunityId(newDeal.id);
    setIsNewDealModalOpen(false);
  };

  const handleStageChange = (dealId: string, newStageId: string) => {
    const stage = currentPipeline.stages.find((s) => s.id === newStageId);
    if (!stage) return;

    const deal = crmOpportunities.find((d) => d.id === dealId);

    updateCrmOpportunity(dealId, {
      stageId: stage.id,
      stageName: stage.name,
      probability: stage.probability,
      weightedValue: ((deal?.dealValue ?? 0) * stage.probability) / 100,
      daysInCurrentStage: 0,
      latestActivity: `Moved stage to ${stage.name}`,
      latestActivityDate: new Date().toISOString().split("T")[0]
    });
  };

  const getHealthBadge = (health: DealHealthRating) => {
    switch (health) {
      case "Healthy":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-brand-wash text-brand-deep">Healthy</span>;
      case "Needs Attention":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-soon-wash text-soon">Needs Attention</span>;
      case "At Risk":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-urgent-wash text-urgent">At Risk</span>;
      case "Stalled":
        return <span className="px-2 py-0.5 rounded-full text-spec font-semibold bg-hold-wash text-hold">Stalled</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* 1. Page Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink tracking-tight">Deals Pipeline</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            Manage opportunities from enquiry through to close.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewDealModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-spec font-bold text-white bg-brand-deep rounded-edge hover:bg-brand transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Deal</span>
        </button>
      </div>

      {/* 2. Pipeline Selector & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-panel border border-line shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-spec font-bold uppercase text-ink-dim shrink-0">Pipeline:</span>
          <select
            value={activePipelineId}
            onChange={(e) => setActivePipelineId(e.target.value)}
            aria-label="Select Pipeline"
            className="text-spec font-bold text-ink bg-paper border border-line rounded-edge px-2.5 py-1.5 focus:outline-none focus:border-brand-deep cursor-pointer"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-1 md:justify-end">
          <div className="flex items-center gap-1.5 bg-paper border border-line rounded-edge px-2.5 py-1.5 flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-ink-faint shrink-0" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-spec bg-transparent focus:outline-none placeholder:text-ink-faint text-ink"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-ink-dim hover:text-ink cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            aria-label="Filter by Deal Health"
            className="text-spec font-medium text-ink bg-paper border border-line rounded-edge px-2.5 py-1.5 focus:outline-none focus:border-brand-deep cursor-pointer"
          >
            <option value="all">All Deal Health</option>
            <option value="Healthy">Healthy</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="At Risk">At Risk</option>
            <option value="Stalled">Stalled</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            aria-label="Filter by Stage"
            className="text-spec font-medium text-ink bg-paper border border-line rounded-edge px-2.5 py-1.5 focus:outline-none focus:border-brand-deep cursor-pointer"
          >
            <option value="all">All Stages</option>
            {currentPipeline.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Pure Table View (Canonical CRM View) */}
      <div className="bg-white rounded-panel border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-meta">
            <thead>
              <tr className="bg-raised border-b border-line text-spec font-bold text-ink-dim uppercase select-none">
                <th onClick={() => handleSort("name")} className="text-left py-3 px-4 cursor-pointer hover:text-brand-deep">
                  Opportunity {sortColumn === "name" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("accountName")} className="text-left py-3 px-3 cursor-pointer hover:text-brand-deep">
                  Account {sortColumn === "accountName" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("stageName")} className="text-left py-3 px-3 cursor-pointer hover:text-brand-deep">
                  Stage {sortColumn === "stageName" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("dealValue")} className="text-right py-3 px-3 cursor-pointer hover:text-brand-deep">
                  Value {sortColumn === "dealValue" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("weightedValue")} className="text-right py-3 px-3 cursor-pointer hover:text-brand-deep hidden sm:table-cell">
                  Weighted {sortColumn === "weightedValue" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("expectedCloseDate")} className="text-left py-3 px-3 cursor-pointer hover:text-brand-deep hidden md:table-cell">
                  Close Date {sortColumn === "expectedCloseDate" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("dealHealth")} className="text-center py-3 px-3 cursor-pointer hover:text-brand-deep">
                  Health {sortColumn === "dealHealth" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">Next Action</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedDeals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-ink-dim">
                    <p className="font-bold text-body">No deals found matching your search or filters.</p>
                  </td>
                </tr>
              ) : (
                sortedDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedCrmOpportunityId(deal.id)}
                    className={`hover:bg-raised/50 cursor-pointer transition-colors ${
                      selectedCrmOpportunityId === deal.id ? "bg-brand-wash/40" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-body text-ink">{deal.name}</div>
                      <div className="text-spec text-ink-dim">{deal.projectApplication || "Application not set"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-ink-dim">{deal.accountName}</span>
                    </td>
                    <td className="py-3 px-3">
                      {/* Direct Interactive Stage Switcher */}
                      <select
                        value={deal.stageId}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          handleStageChange(deal.id, e.target.value);
                          const targetStage = currentPipeline.stages.find((s) => s.id === e.target.value);
                          if (targetStage) {
                            showToast(`Updated "${deal.name}" stage to ${targetStage.name}!`, "success");
                          }
                        }}
                        aria-label={`Change stage for ${deal.name}`}
                        className="text-spec font-bold text-ink bg-paper hover:bg-raised border border-line rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-brand-deep"
                      >
                        {currentPipeline.stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.probability}%)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-body">
                      ${(deal.dealValue || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-brand-deep hidden sm:table-cell">
                      ${Math.round(deal.weightedValue !== undefined ? deal.weightedValue : ((deal.dealValue || 0) * (deal.probability || 0)) / 100).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-ink-dim text-spec hidden md:table-cell">
                      {deal.expectedCloseDate}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getHealthBadge(deal.dealHealth)}
                    </td>
                    <td className="py-3 px-4 text-spec text-ink-dim truncate max-w-xs hidden lg:table-cell">
                      {deal.nextAction || "-"}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openCallPrep({ accountId: deal.accountId, opportunityId: deal.id })}
                          className="p-1.5 text-brand-deep hover:bg-brand-wash rounded-edge border border-transparent hover:border-brand-edge transition-colors cursor-pointer"
                          title="Prep Call"
                        >
                          <Phone className="w-3.5 h-3.5 text-brand-deep" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuickLog("call", deal.accountId, deal.id)}
                          className="p-1.5 text-ink-dim hover:text-brand-deep hover:bg-brand-wash rounded-edge border border-transparent hover:border-brand-edge transition-colors cursor-pointer"
                          title="Log Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuickLog("email", deal.accountId, deal.id)}
                          className="p-1.5 text-ink-dim hover:text-brand-deep hover:bg-brand-wash rounded-edge border border-transparent hover:border-brand-edge transition-colors cursor-pointer"
                          title="Log Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCrmOpportunityId(deal.id)}
                          className="p-1.5 text-brand-deep hover:bg-brand-wash rounded-edge border border-transparent hover:border-brand-edge transition-colors cursor-pointer"
                          title="View Deal 360°"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-raised/70 border-t-2 border-line font-bold text-body">
              <tr>
                <td className="py-3 px-4" colSpan={3}>
                  Total Pipeline ({filteredDeals.length} Deals)
                </td>
                <td className="py-3 px-3 text-right text-brand-deep font-bold">
                  ${totalTableValue.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right text-brand-deep font-bold hidden sm:table-cell">
                  ${Math.round(totalTableWeighted).toLocaleString()}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Selected Deal Detail Drawer / Modal */}
      {selectedDeal && (
        <div className="bg-white rounded-panel border border-line p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-meta font-bold px-2 py-0.5 rounded bg-paper">{selectedDeal.accountName}</span>
                {getHealthBadge(selectedDeal.dealHealth)}
                <span className="text-meta text-ink-dim">Owner: {selectedDeal.opportunityOwner}</span>
              </div>
              <h2 className="text-xl font-bold text-body">{selectedDeal.name}</h2>
              <p className="text-meta text-ink-dim mt-0.5">{selectedDeal.projectApplication || "Application not set"} · {selectedDeal.location}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  openEmailComposer({
                    defaultMode: "project-enquiry",
                    opportunityId: selectedDeal.id,
                    accountId: selectedDeal.accountId,
                    companyName: selectedDeal.accountName,
                    contactId: selectedDeal.primaryContactId,
                    contactName: selectedDeal.primaryContactName,
                    contactEmail: selectedDeal.primaryContactEmail,
                    contactRole: selectedDeal.primaryContactRole || "Estimator / Project Manager",
                    projectName: selectedDeal.name,
                    projectLocation: selectedDeal.location,
                    projectNotes: `${selectedDeal.customerNeed || ""} | ${selectedDeal.notes || ""}`,
                    productsQuoted: (selectedDeal.products || []).map((p) => ({
                      productCode: p.productCode,
                      productName: p.productName,
                      quantity: p.quantity
                    })),
                    recentActivities: [selectedDeal.latestActivity || ""].filter(Boolean),
                    desiredOutcome: "Ask about the lighting package"
                  });
                }}
                className="px-3 py-1.5 text-meta font-bold bg-brand-wash text-brand-deep border border-brand-edge rounded-edge hover:bg-brand-wash/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Draft an AI enquiry email regarding this project lighting package"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>Project Enquiry Email</span>
              </button>
              <button
                onClick={() => setIsFollowUpModalOpen(true)}
                className="px-3 py-1.5 text-meta font-bold bg-soon-wash text-soon border border-soon/30 rounded-edge hover:bg-soon transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Generate tailored follow-up emails referencing Ostendo quotes"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Follow-Up Generator</span>
              </button>
              <button
                onClick={() => setIsDatasheetModalOpen(true)}
                className="px-3 py-1.5 text-meta font-bold bg-paper hover:bg-raised text-body border border-line rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Download consolidated PDF/HTML tender package with compliance statements"
              >
                <Download className="w-3.5 h-3.5 text-ink-dim" />
                <span>Download Tender Package</span>
              </button>
              <button
                onClick={() => openCallPrep({ accountId: selectedDeal.accountId, opportunityId: selectedDeal.id })}
                className="px-3 py-1.5 text-meta font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash/80 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Prepare talking points & review account context before dialling"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Prep Call</span>
              </button>
              <button
                onClick={() => openQuickLog("call", selectedDeal.accountId, selectedDeal.id)}
                className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised cursor-pointer"
              >
                + Log Call
              </button>
              <button
                onClick={() => openQuickLog("task", selectedDeal.accountId, selectedDeal.id)}
                className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised cursor-pointer"
              >
                + Task
              </button>
              <button
                onClick={() => navigateToCRM("accounts", selectedDeal.accountId)}
                className="px-3 py-1.5 text-meta font-semibold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash cursor-pointer"
              >
                View Account 360°
              </button>
            </div>
          </div>

          {/* STRM-01: 1-Click Call Outcome Presets in Deal Drawer */}
          <div className="p-3 bg-brand-wash/60 rounded-edge border border-brand-edge flex flex-wrap items-center justify-between gap-2 text-meta">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-brand-deep text-white rounded">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <span className="text-spec font-bold text-brand-deep uppercase">
                1-Click Call Outcome Shortcuts:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const acc = accounts.find((a) => a.id === selectedDeal.accountId);
                  const accName = acc?.name || selectedDeal.accountName || "Client";
                  logActivity({
                    type: "call",
                    title: `Left Voicemail for ${accName}`,
                    description: `Left voicemail message regarding quote follow-up for deal "${selectedDeal.name}".`,
                    accountId: selectedDeal.accountId,
                    accountName: accName,
                    opportunityId: selectedDeal.id,
                    opportunityName: selectedDeal.name,
                    performedBy: currentUser.name,
                    metadata: { outcome: "Left Voicemail" }
                  });
                  const followUpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  addTask({
                    title: `Follow-up: Call ${accName} on ${selectedDeal.name}`,
                    type: "Follow-up",
                    status: "To Do",
                    priority: "High",
                    dueDate: followUpDate,
                    dueTime: "10:00 AM",
                    accountId: selectedDeal.accountId,
                    accountName: accName,
                    opportunityId: selectedDeal.id,
                    opportunityName: selectedDeal.name,
                    assignedTo: currentUser.name,
                    createdBy: currentUser.name,
                    notes: "Auto-scheduled follow-up cadence after leaving voicemail."
                  });
                  updateCrmOpportunity(selectedDeal.id, {
                    latestActivity: "Left voicemail for client",
                    latestActivityDate: new Date().toISOString().split("T")[0]
                  });
                  showToast("Logged voicemail & scheduled follow-up task for +2 days!", "success");
                }}
                className="px-2.5 py-1 bg-white hover:bg-brand-wash border border-brand-edge text-body hover:text-brand-deep rounded text-spec font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Log voicemail and auto-create task in 2 days"
              >
                📞 Left Voicemail (+2d)
              </button>
              <button
                type="button"
                onClick={() => {
                  const acc = accounts.find((a) => a.id === selectedDeal.accountId);
                  const accName = acc?.name || selectedDeal.accountName || "Client";
                  logActivity({
                    type: "email",
                    title: `Sent Dialux & Datasheet Package to ${accName}`,
                    description: `Issued AS/NZS 1158 Dialux photometric report & product package for deal "${selectedDeal.name}".`,
                    accountId: selectedDeal.accountId,
                    accountName: accName,
                    opportunityId: selectedDeal.id,
                    opportunityName: selectedDeal.name,
                    performedBy: currentUser.name,
                    metadata: { outcome: "Sent Technical Package" }
                  });
                  const followUpDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  addTask({
                    title: `Follow-up: Review Dialux contours with ${accName}`,
                    type: "Follow-up",
                    status: "To Do",
                    priority: "High",
                    dueDate: followUpDate,
                    dueTime: "10:00 AM",
                    accountId: selectedDeal.accountId,
                    accountName: accName,
                    opportunityId: selectedDeal.id,
                    opportunityName: selectedDeal.name,
                    assignedTo: currentUser.name,
                    createdBy: currentUser.name,
                    notes: "Follow up after sending Dialux photometric package."
                  });
                  updateCrmOpportunity(selectedDeal.id, {
                    latestActivity: "Sent Dialux photometric package",
                    latestActivityDate: new Date().toISOString().split("T")[0]
                  });
                  showToast("Logged technical package dispatch & scheduled follow-up for +5 days!", "success");
                }}
                className="px-2.5 py-1 bg-white hover:bg-brand-wash border border-brand-edge text-body hover:text-brand-deep rounded text-spec font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Log Dialux package dispatch and auto-create task in 5 days"
              >
                📄 Sent Dialux / Spec (+5d)
              </button>
              <button
                type="button"
                onClick={() => {
                  const acc = accounts.find((a) => a.id === selectedDeal.accountId);
                  const accName = acc?.name || selectedDeal.accountName || "Client";
                  logActivity({
                    type: "call",
                    title: `Price Acceptance Confirmed with ${accName}`,
                    description: `Customer verbally accepted pricing for deal "${selectedDeal.name}". Awaiting formal PO.`,
                    accountId: selectedDeal.accountId,
                    accountName: accName,
                    opportunityId: selectedDeal.id,
                    opportunityName: selectedDeal.name,
                    performedBy: currentUser.name,
                    metadata: { outcome: "Price Accepted" }
                  });
                  const followUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  addTask({
                    title: `Follow-up: Collect formal PO from ${accName}`,
                    type: "Review Quote",
                    status: "To Do",
                    priority: "Urgent",
                    dueDate: followUpDate,
                    dueTime: "10:00 AM",
                    accountId: selectedDeal.accountId,
                    accountName: accName,
                    opportunityId: selectedDeal.id,
                    opportunityName: selectedDeal.name,
                    assignedTo: currentUser.name,
                    createdBy: currentUser.name,
                    notes: "Customer confirmed price. Collect official PO number."
                  });
                  updateCrmOpportunity(selectedDeal.id, {
                    dealHealth: "Healthy",
                    latestActivity: "Price acceptance confirmed verbally",
                    latestActivityDate: new Date().toISOString().split("T")[0]
                  });
                  showToast("Logged price acceptance & marked deal Healthy!", "success");
                }}
                className="px-2.5 py-1 bg-white hover:bg-brand-wash border border-brand-edge text-body hover:text-brand-deep rounded text-spec font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Log price acceptance & mark deal healthy"
              >
                🏆 Price Accepted (+3d)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: FEAT-06 Ostendo Quote Lifecycle Tracking */}
            <div className="p-4 bg-raised rounded-panel space-y-3 text-meta border border-line">
              <div className="font-bold text-body border-b border-line pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-body">
                  <FileSpreadsheet className="w-4 h-4 text-brand-deep" />
                  <span>Ostendo ERP Quote Lifecycle</span>
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  (selectedDeal.quoteStatus === "PO Received" || selectedDeal.quoteStatus === "Accepted")
                    ? "bg-brand-wash text-brand-deep border border-brand-edge"
                    : selectedDeal.quoteStatus === "Expired"
                    ? "bg-urgent-wash text-urgent border border-urgent/30"
                    : "bg-paper text-ink-dim border border-line"
                }`}>
                  {selectedDeal.quoteStatus || "Draft"}
                </span>
              </div>
              
              {/* Quote Reference & Revision */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink-dim mb-0.5">
                    Quote Number
                  </label>
                  <input
                    type="text"
                    value={selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber || ""}
                    onChange={(e) =>
                      updateCrmOpportunity(selectedDeal.id, {
                        ostendoQuoteRef: e.target.value,
                        quoteNumber: e.target.value
                      })
                    }
                    placeholder="e.g. Q-88210"
                    className="w-full p-1.5 text-spec font-mono font-bold bg-white text-brand-deep border border-line rounded focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink-dim mb-0.5">
                    Revision
                  </label>
                  <select
                    value={selectedDeal.quoteRevision || "Rev A"}
                    onChange={(e) =>
                      updateCrmOpportunity(selectedDeal.id, {
                        quoteRevision: e.target.value
                      })
                    }
                    className="w-full p-1.5 text-spec font-bold bg-white text-body border border-line rounded"
                  >
                    <option value="Rev A">Rev A (Original)</option>
                    <option value="Rev B">Rev B (Updated)</option>
                    <option value="Rev C">Rev C (Value Engineered)</option>
                    <option value="Rev D">Rev D (Final Tender)</option>
                  </select>
                </div>
              </div>

              {/* Status & Expiry Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink-dim mb-0.5">
                    Quote Status
                  </label>
                  <select
                    value={selectedDeal.quoteStatus || "Issued"}
                    onChange={(e) =>
                      updateCrmOpportunity(selectedDeal.id, {
                        quoteStatus: e.target.value as any
                      })
                    }
                    className="w-full p-1.5 text-spec font-medium bg-white text-body border border-line rounded"
                  >
                    <option value="Draft">Draft (Estimating)</option>
                    <option value="Issued">Issued to Client</option>
                    <option value="Client Review">Client Review</option>
                    <option value="Revised">Revised</option>
                    <option value="PO Received">PO Received (Won)</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink-dim mb-0.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={selectedDeal.quoteExpiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    onChange={(e) =>
                      updateCrmOpportunity(selectedDeal.id, {
                        quoteExpiryDate: e.target.value
                      })
                    }
                    className="w-full p-1.5 text-spec font-medium bg-white text-body border border-line rounded"
                  />
                </div>
              </div>

              {/* Quote Expiry Countdown */}
              {selectedDeal.quoteExpiryDate && (
                <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-white rounded border border-line">
                  <span className="text-ink-dim">Validity:</span>
                  {new Date(selectedDeal.quoteExpiryDate).getTime() < Date.now() ? (
                    <span className="font-bold text-urgent flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Quote Expired
                    </span>
                  ) : (
                    <span className="font-bold text-brand-deep flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires in {Math.ceil((new Date(selectedDeal.quoteExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  )}
                </div>
              )}

              {/* Quick Revision & Win Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    const currentRev = selectedDeal.quoteRevision || "Rev A";
                    const nextRev = currentRev === "Rev A" ? "Rev B" : currentRev === "Rev B" ? "Rev C" : "Rev D";
                    const baseRef = (selectedDeal.ostendoQuoteRef || "Q-88200").replace(/-Rev[A-D]/, "");
                    const newQuoteRef = `${baseRef}-${nextRev}`;
                    
                    updateCrmOpportunity(selectedDeal.id, {
                      quoteRevision: nextRev,
                      ostendoQuoteRef: newQuoteRef,
                      quoteStatus: "Revised",
                      latestActivity: `Generated Quote Revision ${nextRev} (${newQuoteRef})`,
                      latestActivityDate: new Date().toISOString().split("T")[0]
                    });
                    showToast(`Created Revision ${nextRev} (${newQuoteRef})`, "success");
                  }}
                  className="py-1.5 px-2 bg-white hover:bg-brand-wash text-brand-deep border border-brand-edge font-bold text-[11px] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Create Revision</span>
                </button>

                <button
                  onClick={() => {
                    const winPipeline = pipelines.find((p) => p.id === selectedDeal.pipelineId) || pipelines[0];
                    const wonStage = winPipeline.stages[winPipeline.stages.length - 1] || { id: "stage-won", name: "Closed Won", probability: 100 };
                    
                    updateCrmOpportunity(selectedDeal.id, {
                      quoteStatus: "PO Received",
                      stageId: wonStage.id,
                      stageName: wonStage.name,
                      probability: 100,
                      weightedValue: selectedDeal.dealValue,
                      latestActivity: "Purchase Order received! Deal marked Closed Won.",
                      latestActivityDate: new Date().toISOString().split("T")[0],
                      wonReason: "Accepted technical specification and competitive commercial offer."
                    });
                    showToast("🏆 Purchase Order Received! Deal marked Closed Won!", "success");
                  }}
                  className="py-1.5 px-2 bg-brand-deep hover:bg-brand text-white font-bold text-[11px] rounded flex items-center justify-center gap-1 cursor-pointer shadow-2xs transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>PO Received (Win)</span>
                </button>
              </div>

              {/* Ostendo CSV / Tab Export */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line">
                <button
                  onClick={() => {
                    const items = (selectedDeal.products || []).map((p) => ({
                      itemCode: p.productCode,
                      description: p.productName,
                      quantity: p.quantity,
                      unit: p.unit || "ea",
                      lineNotes: p.notes,
                      quoteRef: selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber
                    }));
                    const validation = validateOstendoItems(items);
                    if (!validation.valid) {
                      showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                      return;
                    }
                    const csvData = formatOstendoCSV(items, selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber);
                    downloadOstendoCSV(csvData, `Ostendo_Product_List_${selectedDeal.name.replace(/\s+/g, "_")}.csv`);
                    showToast("Ostendo CSV downloaded. Ready for ERP import.", "success");
                  }}
                  className="py-1 px-2 bg-white hover:bg-raised text-ink-dim border border-line font-bold text-[11px] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Ostendo CSV</span>
                </button>

                <button
                  onClick={async () => {
                    const items = (selectedDeal.products || []).map((p) => ({
                      itemCode: p.productCode,
                      description: p.productName,
                      quantity: p.quantity,
                      unit: p.unit || "ea",
                      lineNotes: p.notes,
                      quoteRef: selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber
                    }));
                    const validation = validateOstendoItems(items);
                    if (!validation.valid) {
                      showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                      return;
                    }
                    await copyOstendoProductList(items, selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber);
                    showToast("Product matrix copied to clipboard!", "success");
                  }}
                  className="py-1 px-2 bg-white hover:bg-raised text-ink-dim border border-line font-bold text-[11px] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Matrix</span>
                </button>
              </div>
            </div>

            {/* Column 2: Commercial Values & Margin Overview */}
            <div className="p-4 bg-raised rounded-panel space-y-3 text-meta border border-line">
              <div className="font-bold text-body border-b border-line pb-2 flex items-center justify-between">
                <span>Commercial Summary</span>
                <span className="text-spec font-bold text-brand-deep">
                  {selectedDeal.grossMarginPercent || 36}% Gross Margin
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-ink-dim">Deal Value (ex GST):</span>
                  <span className="font-bold text-body text-base">${selectedDeal.dealValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-dim">Deal Value (inc 10% GST):</span>
                  <span className="font-semibold text-body">${Math.round(selectedDeal.dealValue * 1.1).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-dim">Est. Cost of Goods (COGS):</span>
                  <span className="font-medium text-ink-dim">
                    ${(selectedDeal.totalCostValue || Math.round(selectedDeal.dealValue * 0.64)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-dim">Gross Profit ($ AUD):</span>
                  <span className="font-bold text-brand">
                    ${(selectedDeal.dealValue - (selectedDeal.totalCostValue || Math.round(selectedDeal.dealValue * 0.64))).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-line">
                  <span className="text-ink-dim">Close Probability:</span>
                  <span className="font-semibold text-body">{selectedDeal.probability}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-dim">Weighted Pipeline Value:</span>
                  <span className="font-bold text-brand-deep">
                    ${Math.round(selectedDeal.weightedValue !== undefined ? selectedDeal.weightedValue : ((selectedDeal.dealValue || 0) * (selectedDeal.probability || 0)) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-dim">Expected Decision Date:</span>
                  <span className="font-semibold text-body">{selectedDeal.expectedCloseDate}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Health & Next Action */}
            <div className="p-4 bg-raised rounded-panel space-y-3 text-meta border border-line">
              <div className="font-bold text-body border-b border-line pb-2">Next Best Action</div>
              <div className="p-2.5 bg-brand-wash border border-brand-edge rounded-edge text-brand-deep font-semibold">
                {selectedDeal.nextAction || "No immediate action scheduled."}
              </div>
              <div className="text-spec text-ink-dim">
                Action Due: <span className="font-semibold text-body">{selectedDeal.nextActionDate}</span>
              </div>
              {selectedDeal.dealHealthReasons && (
                <div className="text-spec text-ink-dim pt-1 space-y-1">
                  <strong className="text-body block">Deal Health Rationale:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedDeal.dealHealthReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* FEAT-02: Interactive Multi-Line Bill of Materials (BOM) & Margin Calculator */}
          <div className="p-5 bg-white rounded-panel border border-line shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-deep" />
                  <h3 className="text-base font-bold text-body">
                    Bill of Materials (BOM) &amp; Margin Calculator
                  </h3>
                  <span className="text-spec font-bold text-brand-deep bg-brand-wash px-2 py-0.5 rounded">
                    {(selectedDeal.products || []).length} Line Item{(selectedDeal.products || []).length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-spec text-ink-dim mt-0.5">
                  Configure project packages, accessory hardware, cost markups, and Ostendo line items.
                </p>
              </div>

              {/* Target Margin Slider & Controls */}
              <div className="flex items-center gap-4 bg-raised p-2 rounded-edge border border-line">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-deep" />
                  <span className="text-spec font-bold text-ink-dim uppercase">Target Margin:</span>
                  <span className="text-spec font-black text-brand-deep min-w-[36px]">
                    {targetMarginSlider}%
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={1}
                    value={targetMarginSlider}
                    onChange={(e) => setTargetMarginSlider(Number(e.target.value))}
                    className="w-24 accent-brand-deep cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const marginMultiplier = 1 - targetMarginSlider / 100;
                    const updatedProducts = (selectedDeal.products || []).map((p) => {
                      const cost = p.costPrice || (p.unitPrice ? Math.round(p.unitPrice * 0.65) : 500);
                      const newUnitPrice = Math.round(cost / marginMultiplier);
                      return {
                        ...p,
                        costPrice: cost,
                        unitPrice: newUnitPrice,
                        totalPrice: newUnitPrice * p.quantity,
                        marginPercent: targetMarginSlider
                      };
                    });
                    const newTotal = updatedProducts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
                    const newTotalCost = updatedProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0);

                    updateCrmOpportunity(selectedDeal.id, {
                      products: updatedProducts,
                      dealValue: newTotal,
                      totalCostValue: newTotalCost,
                      grossMarginPercent: targetMarginSlider,
                      weightedValue: newTotal * (selectedDeal.probability / 100)
                    });
                    showToast(`Applied ${targetMarginSlider}% target gross margin across all BOM line items!`, "success");
                  }}
                  className="px-2.5 py-1 bg-brand-deep hover:bg-brand text-white font-bold text-[11px] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Apply Margin to All
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDeal || (selectedDeal.products || []).length === 0) {
                      showToast("No products in deal BOM to copy", "warning");
                      return;
                    }
                    const header = "ItemCode\tDescription\tQuantity\tUnit\tUnitCost\tUnitSell\tTaxCode";
                    const rows = (selectedDeal.products || []).map((p) => 
                      `${p.productCode || "CUSTOM"}\t${p.productName}\t${p.quantity}\t${p.unit || "ea"}\t${p.costPrice || 0}\t${p.unitPrice || 0}\tGST`
                    );
                    const fullText = [header, ...rows].join("\n");
                    navigator.clipboard?.writeText(fullText);
                    showToast(`Copied ${(selectedDeal.products || []).length} line items formatted for Ostendo ERP import!`, "success");
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-paper text-body border border-line-strong font-bold text-[11px] rounded shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
                  title="Copy tab-delimited BOM schedule formatted for direct paste into Ostendo ERP Quote Entry"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-brand-deep" />
                  <span>Copy Matrix (Ostendo ERP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingBomLine(!isAddingBomLine)}
                  className="px-2.5 py-1 bg-white hover:bg-paper text-body border border-line-strong font-bold text-[11px] rounded shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-deep" />
                  <span>{isAddingBomLine ? "Close" : "+ Add Item"}</span>
                </button>
              </div>
            </div>

            {/* Inline Add Item Form */}
            {isAddingBomLine && (
              <div className="p-4 bg-brand-wash/60 rounded-edge border border-brand-edge space-y-3 animate-in fade-in duration-150 text-meta">
                <div className="font-bold text-brand-deep text-spec uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Product Line to BOM Schedule
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Select Catalogue Product or Enter Custom
                    </label>
                    <select
                      value={newBomLine.catalogId}
                      onChange={(e) => {
                        const prod = SAMPLE_PRODUCTS.find((p) => p.id === e.target.value);
                        if (prod) {
                          setNewBomLine({
                            ...newBomLine,
                            catalogId: prod.id,
                            productCode: prod.code,
                            productName: prod.name,
                            category: prod.category,
                            unitPrice: 1650,
                            costPrice: 1050
                          });
                        } else {
                          setNewBomLine({
                            ...newBomLine,
                            catalogId: ""
                          });
                        }
                      }}
                      className="w-full p-1.5 bg-white rounded border border-line text-spec font-medium"
                    >
                      <option value="">-- Custom Item / Hardware Surcharge --</option>
                      {SAMPLE_PRODUCTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Product Code / SKU *
                    </label>
                    <input
                      type="text"
                      value={newBomLine.productCode}
                      onChange={(e) => setNewBomLine({ ...newBomLine, productCode: e.target.value })}
                      placeholder="e.g. PB-75W-3K"
                      className="w-full p-1.5 bg-white rounded border border-line text-spec font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newBomLine.category}
                      onChange={(e) => setNewBomLine({ ...newBomLine, category: e.target.value })}
                      placeholder="e.g. Solar Luminaire"
                      className="w-full p-1.5 bg-white rounded border border-line text-spec"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Description / Line Notes
                    </label>
                    <input
                      type="text"
                      value={newBomLine.productName}
                      onChange={(e) => setNewBomLine({ ...newBomLine, productName: e.target.value })}
                      placeholder="e.g. 75W Modular Solar Light with 3000K LED"
                      className="w-full p-1.5 bg-white rounded border border-line text-spec"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Quantity &amp; Unit
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={1}
                        value={newBomLine.quantity}
                        onChange={(e) => setNewBomLine({ ...newBomLine, quantity: Math.max(1, Number(e.target.value)) })}
                        className="w-16 p-1.5 bg-white rounded border border-line text-spec font-bold"
                      />
                      <input
                        type="text"
                        value={newBomLine.unit}
                        onChange={(e) => setNewBomLine({ ...newBomLine, unit: e.target.value })}
                        className="w-14 p-1.5 bg-white rounded border border-line text-spec"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Unit Cost ($ AUD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newBomLine.costPrice}
                      onChange={(e) => setNewBomLine({ ...newBomLine, costPrice: Number(e.target.value) })}
                      className="w-full p-1.5 bg-white rounded border border-line text-spec"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Unit Sell ($ AUD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newBomLine.unitPrice}
                      onChange={(e) => setNewBomLine({ ...newBomLine, unitPrice: Number(e.target.value) })}
                      className="w-full p-1.5 bg-white rounded border border-line text-spec font-bold text-brand-deep"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingBomLine(false)}
                    className="px-3 py-1 text-ink-dim hover:text-ink text-spec"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newBomLine.productCode.trim() || !newBomLine.productName.trim()) {
                        showToast("Please provide product code and description", "warning");
                        return;
                      }
                      const lineCost = newBomLine.costPrice || 0;
                      const lineSell = newBomLine.unitPrice || 0;
                      const lineMargin = lineSell > 0 ? Math.round(((lineSell - lineCost) / lineSell) * 100) : 0;

                      const newLine: OpportunityProductLine = {
                        id: `bom-line-${Date.now()}`,
                        productCode: newBomLine.productCode,
                        productName: newBomLine.productName,
                        category: newBomLine.category,
                        quantity: newBomLine.quantity,
                        unit: newBomLine.unit || "ea",
                        costPrice: lineCost,
                        unitPrice: lineSell,
                        totalPrice: lineSell * newBomLine.quantity,
                        marginPercent: lineMargin,
                        isOstendoVerified: true
                      };

                      const updatedProducts = [...(selectedDeal.products || []), newLine];
                      const newTotal = updatedProducts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
                      const newTotalCost = updatedProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0);
                      const overallMargin = newTotal > 0 ? Math.round(((newTotal - newTotalCost) / newTotal) * 100) : 35;

                      updateCrmOpportunity(selectedDeal.id, {
                        products: updatedProducts,
                        dealValue: newTotal,
                        totalCostValue: newTotalCost,
                        grossMarginPercent: overallMargin,
                        weightedValue: newTotal * (selectedDeal.probability / 100)
                      });

                      showToast(`Added ${newLine.productName} to Deal BOM!`, "success");
                      setIsAddingBomLine(false);
                    }}
                    className="px-3 py-1 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded shadow-xs cursor-pointer"
                  >
                    + Insert Line to Schedule
                  </button>
                </div>
              </div>
            )}

            {/* BOM Table */}
            {(selectedDeal.products || []).length === 0 ? (
              <div className="p-8 text-center bg-paper rounded-edge border border-dashed border-line text-ink-dim">
                <Package className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                <div className="font-semibold text-body">No line items in this deal BOM</div>
                <p className="text-spec mt-1">Use the "+ Add Item" button above or import calculations from the Tools Hub.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-meta border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-paper text-spec font-bold text-ink-dim uppercase">
                      <th className="py-2 px-3">Item / SKU</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Unit Sell (ex GST)</th>
                      <th className="py-2 px-3 text-right">Margin</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(selectedDeal.products || []).map((p, idx) => {
                      const cost = p.costPrice || (p.unitPrice ? Math.round(p.unitPrice * 0.64) : 0);
                      const sell = p.unitPrice || 0;
                      const lineMargin = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
                      const lineTotal = (p.totalPrice !== undefined ? p.totalPrice : (sell * p.quantity));

                      return (
                        <tr key={p.id || idx} className="hover:bg-raised/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-deep text-spec">
                            <div className="flex items-center gap-1.5">
                              <span>{p.productCode || "CUSTOM"}</span>
                              {p.isOstendoVerified || SAMPLE_PRODUCTS.some((sp) => sp.code.toLowerCase() === (p.productCode || "").toLowerCase()) || ["50W-INTENSE", "75W-INTENSE", "100W-SOLAR", "RAG-M24-4B-600", "RAG-M27-4B-900-CYC", "POLE-COMPOSITE-6M", "CC-POLY-150-50", "PBS-75"].includes(p.productCode || "") ? (
                                <span className="text-[9px] bg-brand-wash text-brand-deep border border-brand-edge px-1.5 py-0.2 rounded font-sans font-bold" title="Ostendo Registered & Verified Product SKU">
                                  ✓ Verified
                                </span>
                              ) : (
                                <span className="text-[9px] bg-paper text-ink-dim border border-line px-1.5 py-0.2 rounded font-sans font-medium" title="Custom Item Line">
                                  Custom
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-body text-spec">
                            {p.productName}
                            {p.notes && <div className="text-[11px] text-ink-dim font-normal italic">{p.notes}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-ink-dim text-spec">
                            {p.category || "General"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-body text-spec">
                            {p.quantity} {p.unit || "ea"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-ink-dim text-spec">
                            ${cost.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-body text-spec">
                            ${sell.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-spec">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                              lineMargin >= 35
                                ? "bg-brand-wash text-brand-deep"
                                : lineMargin >= 20
                                ? "bg-warn-wash text-warn"
                                : "bg-urgent-wash text-urgent"
                            }`}>
                              {lineMargin}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-body text-spec">
                            ${lineTotal.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedProducts = (selectedDeal.products || []).filter((_, i) => i !== idx);
                                const newTotal = updatedProducts.reduce((sum, item) => sum + (item.totalPrice || (item.unitPrice ? item.unitPrice * item.quantity : 0)), 0);
                                const newTotalCost = updatedProducts.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
                                const overallMargin = newTotal > 0 ? Math.round(((newTotal - newTotalCost) / newTotal) * 100) : 35;

                                updateCrmOpportunity(selectedDeal.id, {
                                  products: updatedProducts,
                                  dealValue: newTotal,
                                  totalCostValue: newTotalCost,
                                  grossMarginPercent: overallMargin,
                                  weightedValue: newTotal * (selectedDeal.probability / 100)
                                });
                                showToast(`Removed line item from BOM`, "info");
                              }}
                              className="p-1 text-ink-faint hover:text-urgent rounded cursor-pointer"
                              title="Delete line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-paper font-bold text-body">
                      <td colSpan={3} className="py-2.5 px-3 text-spec uppercase">Total Schedule Scope</td>
                      <td className="py-2.5 px-3 text-right text-spec">
                        {(selectedDeal.products || []).reduce((sum, p) => sum + p.quantity, 0)} Units
                      </td>
                      <td className="py-2.5 px-3 text-right text-ink-dim text-spec">
                        ${(selectedDeal.totalCostValue || (selectedDeal.products || []).reduce((sum, p) => sum + ((p.costPrice || Math.round((p.unitPrice || 0) * 0.64)) * p.quantity), 0)).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-spec">
                        ${(selectedDeal.dealValue || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-brand-deep text-spec">
                        {selectedDeal.grossMarginPercent || 36}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-brand-deep text-base">
                        ${(selectedDeal.dealValue || 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Deal Modal - Responsive Mobile-First Form */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-4 sm:px-5 py-3.5 bg-white shrink-0">
              <h3 className="text-lead font-bold text-ink">Create New Deal</h3>
              <button
                type="button"
                onClick={() => setIsNewDealModalOpen(false)}
                className="p-1.5 -mr-1 text-ink-dim hover:text-ink hover:bg-hover rounded-full transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Form Body */}
            <form onSubmit={handleCreateDeal} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-meta">
                {/* 1. Opportunity / Project Name */}
                <div>
                  <label htmlFor="deal-project-name" className="block text-spec font-bold text-ink mb-1.5">
                    Opportunity / Project Name *
                  </label>
                  <input
                    id="deal-project-name"
                    type="text"
                    required
                    placeholder="e.g. Waterfront Esplanade Solar Upgrade"
                    value={newDealForm.name}
                    onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge text-body text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep transition-colors"
                  />
                </div>

                {/* 2. Account */}
                <div>
                  <label htmlFor="deal-account-select" className="block text-spec font-bold text-ink mb-1.5">
                    Account *
                  </label>
                  <select
                    id="deal-account-select"
                    value={newDealForm.accountId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, accountId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge text-body text-ink focus:outline-none focus:border-brand-deep transition-colors cursor-pointer"
                  >
                    {accounts.length === 0 ? (
                      <option value="">No accounts available</option>
                    ) : (
                      accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 3. Dedicated DEAL VALUE Section */}
                <div className="bg-raised/60 border border-line rounded-panel p-3.5 sm:p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-spec font-bold text-ink uppercase tracking-wider">
                      DEAL VALUE
                    </span>
                    <span className="text-[11px] font-semibold text-ink-dim">
                      AUD ex GST
                    </span>
                  </div>

                  {/* Value Basis Toggle */}
                  <div>
                    <label className="block text-spec font-bold text-ink mb-1.5">
                      Commercial Calculation Method *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewDealForm({ ...newDealForm, valueBasis: "TOTAL" })}
                        className={`py-2 px-3 rounded-edge font-bold text-spec transition-all flex items-center justify-center cursor-pointer border ${
                          newDealForm.valueBasis === "TOTAL"
                            ? "bg-brand-deep text-white border-brand-deep shadow-xs"
                            : "bg-surface text-ink-dim border-line hover:bg-hover hover:text-ink"
                        }`}
                      >
                        Project Total ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDealForm({ ...newDealForm, valueBasis: "PER_UNIT" })}
                        className={`py-2 px-3 rounded-edge font-bold text-spec transition-all flex items-center justify-center cursor-pointer border ${
                          newDealForm.valueBasis === "PER_UNIT"
                            ? "bg-brand-deep text-white border-brand-deep shadow-xs"
                            : "bg-surface text-ink-dim border-line hover:bg-hover hover:text-ink"
                        }`}
                      >
                        Per Unit ($/ea)
                      </button>
                    </div>
                  </div>

                  {/* Commercial Value Basis (P1: Known, Estimate, Unknown) */}
                  <div>
                    <label className="block text-spec font-bold text-ink mb-1.5">
                      Commercial Value Basis (Confidence) *
                    </label>
                    <select
                      value={newDealForm.commercialState}
                      onChange={(e) => setNewDealForm({ ...newDealForm, commercialState: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-edge text-spec text-ink font-semibold focus:outline-none focus:border-brand-deep cursor-pointer"
                    >
                      <option value="Estimate">Estimate (Preliminary / Budgetary)</option>
                      <option value="Known">Known (Client Confirmed / Formal Specification)</option>
                      <option value="Unknown">Unknown (Pending Discovery / Scope TBD)</option>
                    </select>
                  </div>

                  {/* Progressive Disclosure: Total vs Per Unit */}
                  {newDealForm.valueBasis === "TOTAL" ? (
                    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                      <div>
                        <label htmlFor="deal-total-val" className="block text-spec font-bold text-ink mb-1.5">
                          Project Total ($ AUD ex GST)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim font-bold">$</span>
                          <input
                            id="deal-total-val"
                            type="number"
                            min={0}
                            step="any"
                            value={newDealForm.dealValue}
                            onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: e.target.value })}
                            placeholder="e.g. 25000"
                            className="w-full pl-8 pr-3.5 py-2.5 bg-surface border border-line-strong rounded-edge font-mono text-body text-ink focus:outline-none focus:border-brand-deep"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="deal-qty-total" className="block text-spec font-bold text-ink mb-1.5">
                          Quantity (Units)
                        </label>
                        <input
                          id="deal-qty-total"
                          type="number"
                          min={1}
                          value={newDealForm.quantity}
                          onChange={(e) => setNewDealForm({ ...newDealForm, quantity: e.target.value })}
                          placeholder="e.g. 10"
                          className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge font-mono text-body text-ink focus:outline-none focus:border-brand-deep"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                      <div>
                        <label htmlFor="deal-unit-val" className="block text-spec font-bold text-ink mb-1.5">
                          Unit Price ($ AUD ex GST)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim font-bold">$</span>
                          <input
                            id="deal-unit-val"
                            type="number"
                            min={0}
                            step="any"
                            value={newDealForm.unitPrice}
                            onChange={(e) => setNewDealForm({ ...newDealForm, unitPrice: e.target.value })}
                            placeholder="e.g. 1650"
                            className="w-full pl-8 pr-3.5 py-2.5 bg-surface border border-line-strong rounded-edge font-mono text-body text-ink focus:outline-none focus:border-brand-deep"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="deal-qty-unit" className="block text-spec font-bold text-ink mb-1.5">
                          Quantity (Units)
                        </label>
                        <input
                          id="deal-qty-unit"
                          type="number"
                          min={1}
                          value={newDealForm.quantity}
                          onChange={(e) => setNewDealForm({ ...newDealForm, quantity: e.target.value })}
                          placeholder="e.g. 10"
                          className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge font-mono text-body text-ink focus:outline-none focus:border-brand-deep"
                        />
                      </div>
                    </div>
                  )}

                  {/* Read-Only Summary of Calculated Values */}
                  <div className="bg-white border border-line rounded-edge p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div>
                      <span className="text-spec font-bold text-ink-dim block">Calculated Deal Value</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-ink font-mono">
                          ${dealValidation.effectiveTotal.toLocaleString()}
                        </span>
                        <span className="text-spec text-ink-dim font-semibold">ex GST</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-raised text-ink-dim border border-line">
                          {newDealForm.commercialState}
                        </span>
                      </div>
                    </div>
                    {Number(newDealForm.quantity) > 0 && dealValidation.effectiveTotal > 0 && (
                      <div className="text-spec font-semibold text-ink-dim">
                        <span>Approx. <strong className="text-ink">${Math.round(dealValidation.effectiveUnitPrice).toLocaleString()}</strong> / unit</span>
                      </div>
                    )}
                  </div>

                  {/* Outlier Warning Banner */}
                  {dealValidation.isOutlier && (
                    <div className="p-3 bg-soon-wash border border-soon text-soon rounded-edge text-meta space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Unusual Deal Value Notice</span>
                      </div>
                      <p className="text-spec text-body font-medium leading-relaxed">
                        {dealValidation.warningMessage}
                      </p>
                      {dealValidation.suggestedCorrection && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setNewDealForm({
                                ...newDealForm,
                                valueBasis: dealValidation.suggestedCorrection!.basis,
                                unitPrice: newDealForm.dealValue
                              });
                            }}
                            className="px-2.5 py-1 bg-soon text-white text-spec font-bold rounded hover:bg-soon-hover cursor-pointer"
                          >
                            {dealValidation.suggestedCorrection.explanation}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Initial Stage & Target Close Date */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3.5">
                  <div>
                    <label htmlFor="deal-initial-stage" className="block text-spec font-bold text-ink mb-1.5">
                      Initial Stage
                    </label>
                    <select
                      id="deal-initial-stage"
                      value={newDealForm.stageId}
                      onChange={(e) => setNewDealForm({ ...newDealForm, stageId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge text-body text-ink focus:outline-none focus:border-brand-deep cursor-pointer"
                    >
                      {currentPipeline.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.probability}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="deal-close-date" className="block text-spec font-bold text-ink mb-1.5">
                      Target Close Date
                    </label>
                    <input
                      id="deal-close-date"
                      type="date"
                      value={newDealForm.expectedCloseDate}
                      onChange={(e) => setNewDealForm({ ...newDealForm, expectedCloseDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge text-body text-ink focus:outline-none focus:border-brand-deep"
                    />
                  </div>
                </div>

                {/* 5. Project Application */}
                <div>
                  <label htmlFor="deal-project-app" className="block text-spec font-bold text-ink mb-1.5">
                    Project Application
                  </label>
                  <input
                    id="deal-project-app"
                    type="text"
                    list="deal-project-applications"
                    placeholder="e.g. Solar Pathway Lighting (AS/NZS 1158 Cat P)"
                    value={newDealForm.projectApplication}
                    onChange={(e) => setNewDealForm({ ...newDealForm, projectApplication: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface border border-line-strong rounded-edge text-body text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-deep"
                  />
                  <datalist id="deal-project-applications">
                    <option value="Solar Pathway Lighting (AS/NZS 1158 Cat P)" />
                    <option value="Pedestrian Shared Trail" />
                    <option value="Local Roads &amp; Intersections (Cat V / Cat P)" />
                    <option value="Parks &amp; Open Spaces" />
                    <option value="Commercial Car Parks" />
                    <option value="Industrial / Resource Yards" />
                    <option value="Highway &amp; Arterial Road Lighting" />
                  </datalist>
                </div>
              </div>

              {/* Sticky Mobile/Desktop Action Footer */}
              <div className="border-t border-line bg-surface/95 backdrop-blur-xs p-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-body font-bold text-ink-dim hover:text-ink hover:bg-hover rounded-edge transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-body font-bold text-white bg-brand-deep hover:bg-brand rounded-edge shadow-xs transition-colors cursor-pointer text-center"
                >
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Follow-Up Generator Modal */}
      {isFollowUpModalOpen && selectedDeal && (
        <CustomerFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          dealId={selectedDeal.id}
          accountId={selectedDeal.accountId}
          initialContactName={selectedDeal.primaryContactName}
          initialCompanyName={selectedDeal.accountName}
          initialProjectName={selectedDeal.name}
          initialQuoteRef={selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber || ""}
          initialProducts={(selectedDeal.products || []).map((p) => p.productName || p.productCode)}
        />
      )}

      {/* Datasheet & Tender Spec Package Modal */}
      {isDatasheetModalOpen && selectedDeal && (
        <DatasheetPackageModal
          isOpen={isDatasheetModalOpen}
          onClose={() => setIsDatasheetModalOpen(false)}
          projectName={selectedDeal.name}
          customerName={selectedDeal.accountName}
          quoteRef={selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber || ""}
          initialProductNames={(selectedDeal.products || []).map((p) => p.productName || p.productCode)}
        />
      )}

      {/* P2-13: CRM Duplicate Deal / Opportunity Warning Modal */}
      {isDuplicateModalOpen && duplicateMatch && pendingDealToCreate && (
        <CRMDuplicateWarningModal<any>
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateMatch(null);
            setPendingDealToCreate(null);
          }}
          entityType="Opportunity"
          candidateName={pendingDealToCreate.name}
          matchResult={duplicateMatch}
          onOpenExisting={(existingOpp) => {
            setSelectedCrmOpportunityId(existingOpp.id);
            setIsNewDealModalOpen(false);
            showToast(`Navigated to active deal "${existingOpp.project || existingOpp.name}"`, "info");
          }}
          onUseExisting={(existingOpp) => {
            setSelectedCrmOpportunityId(existingOpp.id);
            setIsNewDealModalOpen(false);
            showToast(`Attached to existing deal "${existingOpp.project || existingOpp.name}"`, "success");
          }}
          onCreateAnyway={() => {
            addCrmOpportunity(pendingDealToCreate);
            setSelectedCrmOpportunityId(pendingDealToCreate.id);
            setIsNewDealModalOpen(false);
            showToast(`Created opportunity "${pendingDealToCreate.name}" (Duplicate override audit recorded)`, "warning");
          }}
        />
      )}
    </div>
  );
};