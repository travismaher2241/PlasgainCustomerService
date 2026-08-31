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
import { CRMDealDetailsWorkspace } from "./CRMDealDetailsWorkspace";

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
      // Left blank when unknown. Inventing "Project Engineer" put a name on the
      // record that nobody at the customer answers to, and it flows into call
      // briefings and email drafts.
      primaryContactName: newDealForm.primaryContactName.trim(),
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
      location: ("billingAddress" in account ? account.billingAddress?.city : undefined) || "Australia",
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
        tenderRef: undefined
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
            {(currentPipeline?.stages || []).map((s) => (
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
                        {(currentPipeline?.stages || []).map((s) => (
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

      {/* Selected Deal Detail Workspace (Step 2 Rebuild) */}
      {selectedDeal && (
        <CRMDealDetailsWorkspace
          deal={selectedDeal}
          onClose={() => setSelectedCrmOpportunityId(null)}
        />
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
                      {(currentPipeline?.stages || []).map((s) => (
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