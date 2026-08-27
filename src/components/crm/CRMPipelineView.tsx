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
  Phone
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, DealHealthRating, OpportunityProductLine } from "../../types/crm";
import { CustomerFollowUpModal } from "../CustomerFollowUpModal";
import { DatasheetPackageModal } from "../DatasheetPackageModal";
import { SAMPLE_PRODUCTS } from "../../data/mockData";
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
    navigateToCRM,
    currentUser,
    showToast
  } = useApp();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
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
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.projectApplication.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHealth = healthFilter === "all" || deal.dealHealth === healthFilter;
    return matchesPipeline && matchesSearch && matchesHealth;
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

  // New Deal Form State
  const [newDealForm, setNewDealForm] = useState({
    name: "",
    accountId: accounts[0]?.id || "",
    primaryContactName: "",
    dealValue: 35000,
    stageId: currentPipeline.stages[0]?.id || "stage-new",
    projectApplication: "Solar Pathway Lighting",
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: ""
  });

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.name.trim()) return;

    const account = accounts.find((a) => a.id === newDealForm.accountId) || accounts[0];
    const stage = currentPipeline.stages.find((s) => s.id === newDealForm.stageId) || currentPipeline.stages[0];

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
      dealValue: Number(newDealForm.dealValue),
      weightedValue: (Number(newDealForm.dealValue) * stage.probability) / 100,
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Pipeline Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-meta font-semibold px-2 py-0.5 rounded bg-paper">
              Pipeline Management
            </span>
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="text-meta font-bold bg-white border border-line rounded-edge px-2.5 py-1 focus:ring-2 focus:ring-brand"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Deals & Opportunities Pipeline</h1>
          <p className="text-meta text-ink-dim">{currentPipeline.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-paper p-1 rounded-edge border border-line">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge transition-colors flex items-center gap-1.5 ${
                viewMode === "kanban" ? "bg-white text-body shadow-xs" : "text-ink-dim hover:text-ink"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-meta font-semibold rounded-edge transition-colors flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-white text-body shadow-xs" : "text-ink-dim hover:text-ink"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          <button
            onClick={() => setIsNewDealModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-panel border border-line shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-faint" />
          <input
            type="text"
            placeholder="Search deals by project, account, application..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-meta bg-transparent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="text-meta py-1 px-2.5 bg-raised border border-line rounded-edge"
          >
            <option value="all">All Deal Health</option>
            <option value="Healthy">Healthy</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="At Risk">At Risk</option>
            <option value="Stalled">Stalled</option>
          </select>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 items-start min-h-[600px]">
          {currentPipeline.stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-76 shrink-0 bg-paper rounded-panel border border-line p-3 flex flex-col max-h-[calc(100vh-280px)]"
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-body text-meta">{stage.name}</h3>
                    <span className="text-spec font-semibold px-2 py-0.5 rounded-full bg-raised text-ink-dim">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-spec font-medium text-ink-dim">{stage.probability}%</span>
                </div>

                <div className="text-spec text-ink-dim font-medium px-1 mb-3">
                  ${stageValue.toLocaleString()}
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {stageDeals.map((deal) => {
                    const currentStageIdx = currentPipeline.stages.findIndex((s) => s.id === deal.stageId);
                    const hasNextStage = currentStageIdx >= 0 && currentStageIdx < currentPipeline.stages.length - 1;
                    const nextStageObj = hasNextStage ? currentPipeline.stages[currentStageIdx + 1] : null;

                    return (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedCrmOpportunityId(deal.id)}
                        className={`p-3.5 bg-white rounded-edge border transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-brand-edge ${
                          selectedCrmOpportunityId === deal.id ? "ring-2 ring-brand border-brand" : "border-line"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-spec font-bold text-ink-dim truncate">{deal.accountName}</span>
                          {getHealthBadge(deal.dealHealth)}
                        </div>

                        <h4 className="font-bold text-body text-meta line-clamp-2 mb-2">{deal.name}</h4>

                        <div className="flex items-center justify-between pt-2 border-t border-line text-spec">
                          <span className="font-bold text-body">${deal.dealValue.toLocaleString()}</span>
                          <span className="text-ink-dim">{deal.expectedCloseDate}</span>
                        </div>

                        {deal.nextAction && (
                          <div className="mt-2 text-[11px] text-brand-deep bg-brand-wash px-2 py-1 rounded truncate">
                            Next: {deal.nextAction}
                          </div>
                        )}

                        {/* OPT-04: 1-Click Action Bar on Kanban Card */}
                        <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between gap-1 text-spec">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuickLog("call", deal.accountId, deal.id);
                              }}
                              className="p-1 text-ink-dim hover:text-brand-deep hover:bg-brand-wash rounded cursor-pointer transition-colors"
                              title="Quick log customer call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuickLog("email", deal.accountId, deal.id);
                              }}
                              className="p-1 text-ink-dim hover:text-brand-deep hover:bg-brand-wash rounded cursor-pointer transition-colors"
                              title="Log customer touchpoint"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {hasNextStage && nextStageObj ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStageChange(deal.id, nextStageObj.id);
                                showToast(`Advanced "${deal.name}" to ${nextStageObj.name}!`, "success");
                              }}
                              className="px-2 py-0.5 text-[11px] font-bold text-brand-deep bg-brand-wash hover:bg-brand-wash/80 border border-brand-edge rounded flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                              title={`Advance to ${nextStageObj.name}`}
                            >
                              <span>Advance</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded border border-brand-edge">
                              Active Stage
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
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
                  <th onClick={() => handleSort("weightedValue")} className="text-right py-3 px-3 cursor-pointer hover:text-brand-deep">
                    Weighted {sortColumn === "weightedValue" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("expectedCloseDate")} className="text-left py-3 px-3 cursor-pointer hover:text-brand-deep">
                    Close Date {sortColumn === "expectedCloseDate" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("dealHealth")} className="text-center py-3 px-3 cursor-pointer hover:text-brand-deep">
                    Health {sortColumn === "dealHealth" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-left py-3 px-4">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sortedDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedCrmOpportunityId(deal.id)}
                    className={`hover:bg-raised/50 cursor-pointer transition-colors ${
                      selectedCrmOpportunityId === deal.id ? "bg-brand-wash/30" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-body">{deal.name}</td>
                    <td className="py-3 px-3 text-ink-dim">{deal.accountName}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold px-2 py-0.5 rounded bg-paper border border-line text-spec">
                        {deal.stageName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-body">${deal.dealValue.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-semibold text-brand-deep">${deal.weightedValue.toLocaleString()}</td>
                    <td className="py-3 px-3 text-ink-dim text-spec">{deal.expectedCloseDate}</td>
                    <td className="py-3 px-3 text-center">{getHealthBadge(deal.dealHealth)}</td>
                    <td className="py-3 px-4 text-spec text-ink-dim truncate max-w-xs">{deal.nextAction || "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-raised/70 border-t-2 border-line font-bold text-body">
                <tr>
                  <td className="py-3 px-4" colSpan={3}>
                    Total Pipeline ({filteredDeals.length} Deals)
                  </td>
                  <td className="py-3 px-3 text-right text-brand-deep font-bold">
                    ${totalTableValue.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-brand-deep font-bold">
                    ${totalTableWeighted.toLocaleString()}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

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
              <p className="text-meta text-ink-dim mt-0.5">{selectedDeal.projectApplication} · {selectedDeal.location}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => openQuickLog("call", selectedDeal.accountId, selectedDeal.id)}
                className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised"
              >
                + Log Call
              </button>
              <button
                onClick={() => openQuickLog("task", selectedDeal.accountId, selectedDeal.id)}
                className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised"
              >
                + Task
              </button>
              <button
                onClick={() => navigateToCRM("accounts", selectedDeal.accountId)}
                className="px-3 py-1.5 text-meta font-semibold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash"
              >
                View Account 360°
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
                    const items = selectedDeal.products.map((p) => ({
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
                    const items = selectedDeal.products.map((p) => ({
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
                  <span className="font-bold text-brand-deep">${selectedDeal.weightedValue.toLocaleString()}</span>
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
                    {selectedDeal.products.length} Line Item{selectedDeal.products.length !== 1 ? "s" : ""}
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
                    const updatedProducts = selectedDeal.products.map((p) => {
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

                      const updatedProducts = [...selectedDeal.products, newLine];
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
            {selectedDeal.products.length === 0 ? (
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
                    {selectedDeal.products.map((p, idx) => {
                      const cost = p.costPrice || (p.unitPrice ? Math.round(p.unitPrice * 0.64) : 0);
                      const sell = p.unitPrice || 0;
                      const lineMargin = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
                      const lineTotal = (p.totalPrice !== undefined ? p.totalPrice : (sell * p.quantity));

                      return (
                        <tr key={p.id || idx} className="hover:bg-raised/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-deep text-spec">
                            <div className="flex items-center gap-1.5">
                              <span>{p.productCode || "CUSTOM"}</span>
                              <span className="text-[10px] bg-brand-wash text-brand px-1 py-0.2 rounded font-sans font-bold" title="Ostendo Compatible SKU">
                                ERP
                              </span>
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
                                const updatedProducts = selectedDeal.products.filter((_, i) => i !== idx);
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
                        {selectedDeal.products.reduce((sum, p) => sum + p.quantity, 0)} Units
                      </td>
                      <td className="py-2.5 px-3 text-right text-ink-dim text-spec">
                        ${(selectedDeal.totalCostValue || selectedDeal.products.reduce((sum, p) => sum + ((p.costPrice || Math.round((p.unitPrice || 0) * 0.64)) * p.quantity), 0)).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-spec">
                        ${selectedDeal.dealValue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-brand-deep text-spec">
                        {selectedDeal.grossMarginPercent || 36}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-brand-deep text-base">
                        ${selectedDeal.dealValue.toLocaleString()}
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

      {/* New Deal Modal */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-body">Create New Deal</h3>
              <button
                onClick={() => setIsNewDealModalOpen(false)}
                className="text-ink-faint hover:text-ink-dim text-body"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5 text-meta">
              <div>
                <label className="block font-semibold text-body mb-1">Opportunity / Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Waterfront Esplanade Solar Upgrade"
                  value={newDealForm.name}
                  onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Account *</label>
                  <select
                    value={newDealForm.accountId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, accountId: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Estimated Deal Value ($ AUD) *</label>
                  <input
                    type="number"
                    required
                    value={newDealForm.dealValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: Number(e.target.value) })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Initial Stage</label>
                  <select
                    value={newDealForm.stageId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, stageId: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    {currentPipeline.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.probability}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Target Close Date</label>
                  <input
                    type="date"
                    value={newDealForm.expectedCloseDate}
                    onChange={(e) => setNewDealForm({ ...newDealForm, expectedCloseDate: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Project Application</label>
                <input
                  type="text"
                  placeholder="e.g. Pedestrian Shared Trail (AS/NZS 1158 Cat P)"
                  value={newDealForm.projectApplication}
                  onChange={(e) => setNewDealForm({ ...newDealForm, projectApplication: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep"
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
          initialProducts={selectedDeal.products.map((p) => p.productName || p.productCode)}
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
          initialProductNames={selectedDeal.products.map((p) => p.productName || p.productCode)}
        />
      )}
    </div>
  );
};