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
  Copy
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, DealHealthRating } from "../../types/crm";
import { CustomerFollowUpModal } from "../CustomerFollowUpModal";
import { DatasheetPackageModal } from "../DatasheetPackageModal";
import {
  formatOstendoCSV,
  formatOstendoTabDelimited,
  validateOstendoItems,
  downloadOstendoCSV
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
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDatasheetModalOpen, setIsDatasheetModalOpen] = useState(false);

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
                  {stageDeals.map((deal) => (
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

                      {/* Quick stage mover */}
                      <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between text-spec">
                        <span className="text-ink-dim text-[11px]">Move stage:</span>
                        <select
                          value={deal.stageId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStageChange(deal.id, e.target.value)}
                          className="text-[11px] font-semibold bg-raised border border-line rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          {currentPipeline.stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
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
                <tr className="bg-raised border-b border-line text-spec font-bold text-ink-dim uppercase">
                  <th className="text-left py-3 px-4">Opportunity</th>
                  <th className="text-left py-3 px-3">Account</th>
                  <th className="text-left py-3 px-3">Stage</th>
                  <th className="text-right py-3 px-3">Value</th>
                  <th className="text-right py-3 px-3">Weighted</th>
                  <th className="text-left py-3 px-3">Close Date</th>
                  <th className="text-center py-3 px-3">Health</th>
                  <th className="text-left py-3 px-4">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredDeals.map((deal) => (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Financials & Ostendo Integration */}
            <div className="p-4 bg-raised rounded-panel space-y-3 text-meta">
              <div className="font-bold text-body border-b border-line pb-2 flex items-center justify-between">
                <span>Commercial &amp; Ostendo ERP</span>
                <span className="text-spec font-normal text-ink-dim">Official Quoting in Ostendo</span>
              </div>
              
              {/* Ostendo Quote Reference */}
              <div className="p-2.5 bg-white rounded-edge border border-line space-y-1">
                <label className="block text-spec font-bold uppercase text-brand-deep">
                  Ostendo Quote Reference
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber || ""}
                    onChange={(e) =>
                      updateCrmOpportunity(selectedDeal.id, {
                        ostendoQuoteRef: e.target.value,
                        quoteNumber: e.target.value
                      })
                    }
                    placeholder="e.g. OST-8924 / Q-2025"
                    className="w-full p-1.5 text-meta font-mono font-bold bg-brand-wash text-brand-deep border border-brand-edge rounded focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-ink-dim">Deal Value:</span>
                <span className="font-bold text-body">${selectedDeal.dealValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim">Weighted Forecast:</span>
                <span className="font-bold text-brand-deep">${selectedDeal.weightedValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim">Close Probability:</span>
                <span className="font-semibold text-body">{selectedDeal.probability}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim">Target Close Date:</span>
                <span className="font-semibold text-body">{selectedDeal.expectedCloseDate}</span>
              </div>

              {/* Export Product List for Ostendo Button */}
              <button
                onClick={() => {
                  const items = selectedDeal.products.map((p) => ({
                    code: p.productCode,
                    name: p.productName,
                    quantity: p.quantity,
                    unit: "ea",
                    notes: p.notes,
                    quoteRef: selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber
                  }));

                  const validation = validateOstendoItems(items);
                  if (!validation.valid) {
                    showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                    return;
                  }

                  // 1. Copy tab-delimited product list
                  const tabData = formatOstendoTabDelimited(items, selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber);
                  navigator.clipboard.writeText(tabData);

                  // 2. Download clean CRLF CSV with UTF-8 BOM
                  const csvData = formatOstendoCSV(items, selectedDeal.ostendoQuoteRef || selectedDeal.quoteNumber);
                  downloadOstendoCSV(csvData, `Ostendo_Product_List_${selectedDeal.name.replace(/\s+/g, "_")}.csv`);

                  showToast("Product list copied and CSV downloaded! Pricing will be calculated in Ostendo.", "success");
                }}
                className="w-full mt-2 py-2 px-3 bg-white hover:bg-brand-wash text-brand-deep border border-brand-edge font-bold text-spec rounded-edge flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Export product list (Item Code, Description, Qty, Unit) for Ostendo ERP entry"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Product List for Ostendo</span>
              </button>
            </div>

            {/* Column 2: Products & Luminaires */}
            <div className="p-4 bg-raised rounded-panel space-y-3 text-meta">
              <div className="font-bold text-body border-b border-line pb-2 flex justify-between items-center">
                <span>Luminaires &amp; Product List</span>
                <span className="text-spec font-bold text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded">
                  {selectedDeal.products.length} Items
                </span>
              </div>
              {selectedDeal.products.length === 0 ? (
                <div className="text-ink-faint italic py-2">No specific product line-items added yet.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDeal.products.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-start text-body bg-white p-2 rounded border border-line">
                      <div>
                        <div className="font-semibold text-spec">{p.productName}</div>
                        <div className="text-[11px] text-ink-dim">Code: {p.productCode || "N/A"} • Qty: {p.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 3: Health & Next Action */}
            <div className="p-4 bg-raised rounded-panel space-y-3 text-meta">
              <div className="font-bold text-body border-b border-line pb-2">Next Best Action</div>
              <div className="p-2.5 bg-brand-wash border border-brand-edge rounded-edge text-brand-deep font-semibold">
                {selectedDeal.nextAction || "No immediate action scheduled."}
              </div>
              <div className="text-spec text-ink-dim">
                Action Due: <span className="font-semibold text-body">{selectedDeal.nextActionDate}</span>
              </div>
              {selectedDeal.dealHealthReasons && (
                <div className="text-spec text-ink-dim pt-1">
                  <strong>Health Diagnosis:</strong> {selectedDeal.dealHealthReasons.join("; ")}
                </div>
              )}
            </div>
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