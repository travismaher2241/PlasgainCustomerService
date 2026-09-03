import React, { useState, useMemo } from "react";
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
  MoreVertical,
  Sliders,
  Tag,
  Check,
  Package,
  RefreshCw,
  Phone,
  Zap,
  ClipboardCheck,
  X,
  Trash2,
  Archive
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, DealHealthRating, OpportunityProductLine } from "../../types/crm";
import { CustomerFollowUpModal } from "../CustomerFollowUpModal";
import { CRMDealDetailsWorkspace } from "./CRMDealDetailsWorkspace";

export const CRMPipelineView: React.FC = () => {
  const {
    crmOpportunities,
    updateCrmOpportunity,
    addCrmOpportunity,
    deleteCrmOpportunity,
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
    currentUser,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed" | "all">("active");
  const [showWeightedValue, setShowWeightedValue] = useState(false);
  const [activeMenuDealId, setActiveMenuDealId] = useState<string | null>(null);

  // New Deal Modal State
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    name: "",
    accountId: accounts[0]?.id || "",
    dealValue: 25000,
    stageName: "Discovery & Qualification" as const,
    expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    projectApplication: "Solar Public Lighting",
    notes: ""
  });

  const selectedDeal = crmOpportunities.find((d) => d.id === selectedCrmOpportunityId);

  // If a deal is selected, render the completed Step 2 Deal Details Workspace!
  if (selectedCrmOpportunityId && selectedDeal) {
    return <CRMDealDetailsWorkspace deal={selectedDeal} onClose={() => setSelectedCrmOpportunityId(null)} />;
  }

  // Filter deals
  const filteredDeals = crmOpportunities.filter((deal) => {
    const isClosed = deal.stageName.includes("Won") || deal.stageName.includes("Lost") || deal.stageId === "stage-won" || deal.stageId === "stage-lost";
    if (statusFilter === "active" && isClosed) return false;
    if (statusFilter === "closed" && !isClosed) return false;

    const matchesSearch =
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.accountName && deal.accountName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      deal.projectApplication?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === "all" || deal.stageName === stageFilter || deal.stageId === stageFilter;
    const matchesHealth = healthFilter === "all" || deal.dealHealth === healthFilter;

    return matchesSearch && matchesStage && matchesHealth;
  });

  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
  const totalWeightedValue = filteredDeals.reduce((sum, d) => sum + (d.weightedValue || ((d.dealValue || 0) * (d.probability || 25)) / 100), 0);

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.name.trim()) return;

    const acc = accounts.find((a) => a.id === newDealForm.accountId) || accounts[0];

    const newDeal: CRMOpportunity = {
      id: `opp-${Date.now()}`,
      name: newDealForm.name,
      accountId: acc?.id || "acc-general",
      accountName: acc?.name || "General Account",
      opportunityOwner: currentUser.name,
      pipelineId: "pipe-major-projects",
      stageId: "stage-discovery",
      stageName: newDealForm.stageName,
      dealValue: Number(newDealForm.dealValue) || 0,
      weightedValue: (Number(newDealForm.dealValue) || 0) * 0.25,
      probability: 25,
      forecastCategory: "Pipeline",
      expectedCloseDate: newDealForm.expectedCloseDate,
      products: [],
      projectApplication: newDealForm.projectApplication,
      location: acc?.territory || "VIC",
      customerNeed: newDealForm.notes,
      keyRequirements: ["Verify AS/NZS 1158 compliance"],
      source: "Direct Sales Opportunity",
      latestActivity: `Created by ${currentUser.name}`,
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Initial scope consultation and photometric requirements",
      nextActionDate: new Date().toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["New opportunity"],
      notes: newDealForm.notes
    };

    addCrmOpportunity(newDeal);
    setIsNewDealModalOpen(false);
    showToast(`Deal "${newDeal.name}" created!`, "success");
  };

  const getHealthBadge = (health?: DealHealthRating) => {
    switch (health) {
      case "Healthy":
        return <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Healthy</span>;
      case "Needs Attention":
        return <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">Attention</span>;
      case "At Risk":
        return <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">At Risk</span>;
      default:
        return <span className="px-2 py-0.2 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{health || "Normal"}</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER & PIPELINE ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Deals</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            {filteredDeals.length} deals · Total pipeline: <strong>${totalValue.toLocaleString()} (Ex GST)</strong>
            {showWeightedValue && <span> · Weighted: ${totalWeightedValue.toLocaleString()}</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewDealModalOpen(true)}
          className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New quote</span>
        </button>
      </div>

      {/* CONSOLIDATED TOOLBAR (PART C) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-panel border border-line shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* SEARCH */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search deals or accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          {/* ACTIVE VS CLOSED SELECTOR */}
          <div className="flex items-center rounded-edge border border-line overflow-hidden text-spec font-medium bg-paper/60">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusFilter === "active" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("closed")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusFilter === "closed" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              Closed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusFilter === "all" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              All
            </button>
          </div>

          {/* STAGE FILTER */}
          <select
            aria-label="Filter by stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
          >
            <option value="all">All Stages</option>
            <option value="Discovery & Qualification">Discovery</option>
            <option value="Design & Compliance">Design</option>
            <option value="Proposal & Quoting">Proposal</option>
            <option value="Negotiation & Review">Negotiation</option>
            <option value="Closed Won">Closed Won</option>
            <option value="Closed Lost">Closed Lost</option>
          </select>

          {/* HEALTH FILTER */}
          <select
            aria-label="Filter by health"
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
          >
            <option value="all">All Health</option>
            <option value="Healthy">Healthy</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="At Risk">At Risk</option>
          </select>
        </div>

        {/* OPTIONAL WEIGHTED VALUE TOGGLE */}
        <button
          type="button"
          onClick={() => setShowWeightedValue(!showWeightedValue)}
          className="text-xs text-ink-dim hover:text-body font-medium underline self-end sm:self-auto cursor-pointer"
        >
          {showWeightedValue ? "Hide weighted value" : "Show weighted value"}
        </button>
      </div>

      {/* COMPACT DEALS TABLE (PART C) */}
      {filteredDeals.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
          <Kanban className="w-10 h-10 text-ink-faint mx-auto" />
          <h2 className="text-base font-bold text-body">No deals found</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            Try adjusting your search or stage filters, or create a new deal.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-panel border border-line shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-spec">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-ink-dim text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Deal / Customer</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Value (Ex GST)</th>
                  <th className="py-2.5 px-4">Next Action &amp; Due</th>
                  <th className="py-2.5 px-4">Health</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedCrmOpportunityId(deal.id)}
                    className="hover:bg-raised/60 transition-colors cursor-pointer"
                  >
                    {/* DEAL NAME & ACCOUNT BENEATH (PART C) */}
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="font-bold text-body text-spec hover:text-brand-deep transition-colors">
                        {deal.name}
                      </div>
                      <div className="text-xs text-ink-dim mt-0.5">
                        {deal.accountName || "Direct Customer"}
                      </div>
                    </td>

                    {/* STAGE */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                        {deal.stageName}
                      </span>
                    </td>

                    {/* VALUE */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-body">
                      <div>${(deal.dealValue || 0).toLocaleString()}</div>
                      {showWeightedValue && (
                        <div className="text-[11px] text-ink-dim font-normal">
                          w: ${(deal.weightedValue || ((deal.dealValue || 0) * (deal.probability || 25)) / 100).toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* NEXT ACTION & DUE DATE */}
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="text-xs font-medium text-body line-clamp-1">
                        {deal.nextAction || "Follow up quotation"}
                      </div>
                      <div className="text-[11px] text-ink-dim mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-ink-dim" />
                        <span>Target Close: {deal.expectedCloseDate || "2026-10-30"}</span>
                      </div>
                    </td>

                    {/* HEALTH */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getHealthBadge(deal.dealHealth)}
                    </td>

                    {/* ROW MENU */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          aria-label={`Actions for ${deal.name}`}
                          onClick={() => setActiveMenuDealId(activeMenuDealId === deal.id ? null : deal.id)}
                          className="p-1 rounded hover:bg-line text-ink-dim hover:text-body transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuDealId === deal.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-line rounded-panel shadow-lg py-1 z-30 text-spec text-left animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuDealId(null);
                                setSelectedCrmOpportunityId(deal.id);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-raised flex items-center gap-2 text-body"
                            >
                              <FileText className="w-3.5 h-3.5 text-ink-dim" />
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuDealId(null);
                                openQuickLog({ isOpen: true, type: "call", dealId: deal.id, accountId: deal.accountId });
                              }}
                              className="w-full px-3 py-1.5 hover:bg-raised flex items-center gap-2 text-body"
                            >
                              <Phone className="w-3.5 h-3.5 text-ink-dim" />
                              <span>Log Activity</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW DEAL MODAL */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-deal-modal-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="new-deal-modal-title" className="font-bold text-body text-base">
                Create New Quote
              </h3>
              <button onClick={() => setIsNewDealModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3">
              <div>
                <label className="block text-spec font-bold mb-1">Deal Name *</label>
                <input
                  required
                  value={newDealForm.name}
                  onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. Wyndham Regional Park Solar Lighting"
                />
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Account *</label>
                <select
                  required
                  value={newDealForm.accountId}
                  onChange={(e) => setNewDealForm({ ...newDealForm, accountId: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Value ($ Ex GST)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newDealForm.dealValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec font-mono"
                  />
                </div>

                <div>
                  <label className="block text-spec font-bold mb-1">Stage</label>
                  <select
                    value={newDealForm.stageName}
                    onChange={(e) => setNewDealForm({ ...newDealForm, stageName: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>Discovery &amp; Qualification</option>
                    <option>Design &amp; Compliance</option>
                    <option>Proposal &amp; Quoting</option>
                    <option>Negotiation &amp; Review</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};