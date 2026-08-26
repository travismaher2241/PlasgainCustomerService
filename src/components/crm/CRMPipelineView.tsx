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
  TrendingUp
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, DealHealthRating } from "../../types/crm";

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
    navigateToCRM
  } = useApp();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);

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
      opportunityOwner: "Marcus Vance",
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
      // Probability and weighted value must move together or the forecast drifts.
      weightedValue: ((deal?.dealValue ?? 0) * stage.probability) / 100,
      daysInCurrentStage: 0,
      latestActivity: `Moved stage to ${stage.name}`,
      latestActivityDate: new Date().toISOString().split("T")[0]
    });
  };

  const getHealthBadge = (health: DealHealthRating) => {
    switch (health) {
      case "Healthy":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Healthy</span>;
      case "Needs Attention":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Needs Attention</span>;
      case "At Risk":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">At Risk</span>;
      case "Stalled":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">Stalled</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Pipeline Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Pipeline Management
            </span>
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deals & Opportunities Pipeline</h1>
          <p className="text-xs text-slate-500">{currentPipeline.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === "kanban" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          <button
            onClick={() => setIsNewDealModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals by project, account, application..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
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
            const stageTotal = stageDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 bg-slate-100/70 rounded-xl p-3 border border-slate-200/80 flex flex-col max-h-[750px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{stage.name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      ${stageTotal.toLocaleString()} · {stageDeals.length} deals
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">{stage.probability}%</span>
                </div>

                {/* Stage Cards Scroll */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {stageDeals.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-lg">
                      No active deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedCrmOpportunityId(deal.id)}
                        className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2.5 ${
                          selectedDeal?.id === deal.id
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-slate-500 font-semibold">{deal.accountName}</span>
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">{deal.name}</h4>
                          </div>
                          {getHealthBadge(deal.dealHealth)}
                        </div>

                        <div className="text-xs font-bold text-emerald-700 flex items-center justify-between">
                          <span>${deal.dealValue.toLocaleString()}</span>
                          <span className="text-[11px] font-normal text-slate-500">Close: {deal.expectedCloseDate}</span>
                        </div>

                        {deal.dealHealthReasons && deal.dealHealthReasons.length > 0 && deal.dealHealth !== "Healthy" && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200/60 leading-tight">
                            {deal.dealHealthReasons[0]}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="truncate max-w-[140px]">Next: {deal.nextAction || "None"}</span>
                          <span className="font-semibold text-slate-600">{deal.daysInCurrentStage}d in stage</span>
                        </div>

                        {/* Quick Move Stage Select */}
                        <div className="pt-1 flex items-center justify-between gap-1">
                          <select
                            value={deal.stageId}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            className="w-full text-[11px] py-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                          >
                            {currentPipeline.stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                Move to: {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Opportunity & Account</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4">Next Action</th>
                  <th className="py-3 px-4">Close Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedCrmOpportunityId(deal.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{deal.name}</div>
                      <div className="text-[11px] text-slate-500">{deal.accountName}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{deal.stageName}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">${deal.dealValue.toLocaleString()}</td>
                    <td className="py-3 px-4">{getHealthBadge(deal.dealHealth)}</td>
                    <td className="py-3 px-4 text-slate-600">{deal.nextAction || "None"}</td>
                    <td className="py-3 px-4 text-slate-500">{deal.expectedCloseDate}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickLog("call", deal.accountId, deal.id);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Log Activity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Deal Detail Drawer / Modal */}
      {selectedDeal && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{selectedDeal.accountName}</span>
                {getHealthBadge(selectedDeal.dealHealth)}
                <span className="text-xs text-slate-500">Owner: {selectedDeal.opportunityOwner}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedDeal.name}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{selectedDeal.projectApplication} · {selectedDeal.location}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openQuickLog("call", selectedDeal.accountId, selectedDeal.id)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                + Log Call
              </button>
              <button
                onClick={() => openQuickLog("task", selectedDeal.accountId, selectedDeal.id)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                + Task
              </button>
              <button
                onClick={() => navigateToCRM("accounts", selectedDeal.accountId)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                View Account 360°
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Financials & Probability */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-2">Commercial Summary</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deal Value:</span>
                <span className="font-bold text-slate-900 text-sm">${selectedDeal.dealValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Weighted Forecast:</span>
                <span className="font-bold text-emerald-700">${selectedDeal.weightedValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Close Probability:</span>
                <span className="font-semibold text-slate-800">{selectedDeal.probability}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Close Date:</span>
                <span className="font-semibold text-slate-800">{selectedDeal.expectedCloseDate}</span>
              </div>
            </div>

            {/* Column 2: Products & Luminaires */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-2">Luminaires & Bill of Materials</div>
              {selectedDeal.products.length === 0 ? (
                <div className="text-slate-400 italic">No specific products line-items added yet.</div>
              ) : (
                <div className="space-y-2">
                  {selectedDeal.products.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-start text-slate-700">
                      <div>
                        <div className="font-semibold">{p.productName}</div>
                        <div className="text-[11px] text-slate-500">Qty: {p.quantity}</div>
                      </div>
                      {p.totalPrice && <span className="font-bold">${p.totalPrice.toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 3: Health & Next Action */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-2">Next Best Action</div>
              <div className="p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-lg text-emerald-950 font-semibold">
                {selectedDeal.nextAction || "No immediate action scheduled."}
              </div>
              <div className="text-[11px] text-slate-500">
                Action Due: <span className="font-semibold text-slate-700">{selectedDeal.nextActionDate}</span>
              </div>
              {selectedDeal.dealHealthReasons && (
                <div className="text-[11px] text-slate-600 pt-1">
                  <strong>Health Diagnosis:</strong> {selectedDeal.dealHealthReasons.join("; ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create New Deal</h3>
              <button
                onClick={() => setIsNewDealModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opportunity / Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Waterfront Esplanade Solar Upgrade"
                  value={newDealForm.name}
                  onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account *</label>
                  <select
                    value={newDealForm.accountId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, accountId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Deal Value ($ AUD) *</label>
                  <input
                    type="number"
                    required
                    value={newDealForm.dealValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stage</label>
                  <select
                    value={newDealForm.stageId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, stageId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    {currentPipeline.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.probability}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Close Date</label>
                  <input
                    type="date"
                    value={newDealForm.expectedCloseDate}
                    onChange={(e) => setNewDealForm({ ...newDealForm, expectedCloseDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Application</label>
                <input
                  type="text"
                  placeholder="e.g. Pedestrian Shared Trail (AS/NZS 1158 Cat P)"
                  value={newDealForm.projectApplication}
                  onChange={(e) => setNewDealForm({ ...newDealForm, projectApplication: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
