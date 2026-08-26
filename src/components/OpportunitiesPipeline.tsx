import React, { useState } from "react";
import {
  KanbanSquare,
  List,
  Search,
  Plus,
  Filter,
  Calendar,
  Building,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Mail,
  FileCheck,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Opportunity, OpportunityStage } from "../types";

export const OpportunitiesPipeline: React.FC = () => {
  const {
    opportunities,
    selectedOpportunityId,
    setSelectedOpportunityId,
    updateOpportunity,
    navigateToWorkflow,
    showToast
  } = useApp();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(() => {
    return opportunities.find((o) => o.id === selectedOpportunityId) || opportunities[0] || null;
  });

  const stages: OpportunityStage[] = [
    "New Enquiry",
    "Qualifying",
    "Awaiting Information",
    "Quoting",
    "Follow-Up",
    "Technical Review",
    "Closed Won"
  ];

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.customerCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleSelectOpp = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setSelectedOpportunityId(opp.id);
  };

  const handleStageChange = (id: string, newStage: OpportunityStage) => {
    updateOpportunity(id, { stage: newStage });
    if (selectedOpp && selectedOpp.id === id) {
      setSelectedOpp({ ...selectedOpp, stage: newStage });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Opportunities & Pipeline</h1>
            <span className="text-meta font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge uppercase tracking-wide">
              {opportunities.length} Active Deals
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Track sales progression, missing customer parameters, quote deadlines, and AI action items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-paper p-1 rounded-edge border border-line flex items-center gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-edge text-meta font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === "list" ? "bg-white text-brand-deep shadow-2xs" : "text-ink-dim hover:text-ink"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-edge text-meta font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === "kanban" ? "bg-white text-brand-deep shadow-2xs" : "text-ink-dim hover:text-ink"
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="bg-brand-deep hover:bg-brand-deep text-white font-medium px-3.5 py-2 rounded-edge text-meta transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project, client company, or location..."
            className="w-full text-meta pl-9 pr-4 py-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-meta text-ink-dim font-medium">Stage:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-meta px-3 py-2 rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
          >
            <option value="all">All Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Opportunities Table (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-panel border border-line shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-meta border-collapse">
                <thead>
                  <tr className="bg-raised text-ink-dim border-b border-line">
                    <th className="py-3 px-4 font-semibold">Project & Customer</th>
                    <th className="py-3 px-3 font-semibold">Stage</th>
                    <th className="py-3 px-3 font-semibold">Est. Value</th>
                    <th className="py-3 px-3 font-semibold">Readiness</th>
                    <th className="py-3 px-4 font-semibold">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredOpportunities.map((opp) => {
                    const isSelected = selectedOpp?.id === opp.id;
                    return (
                      <tr
                        key={opp.id}
                        onClick={() => handleSelectOpp(opp)}
                        className={`hover:bg-raised transition-colors cursor-pointer ${
                          isSelected ? "bg-brand-wash font-medium" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-body">{opp.project}</div>
                          <div className="text-spec text-ink-dim flex items-center gap-1.5 mt-0.5">
                            <span>{opp.customerCompany}</span>
                            <span>•</span>
                            <span>{opp.location}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-spec font-bold px-2 py-0.5 rounded bg-paper border border-line uppercase">
                            {opp.stage}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-brand-deep">
                          {opp.estimatedValue ? `$${opp.estimatedValue.toLocaleString()}` : "TBD"}
                        </td>
                        <td className="py-3 px-3">
                          {opp.readinessScore ? (
                            <span
                              className={`text-spec font-bold px-2 py-0.5 rounded ${
                                opp.readinessScore >= 80
                                  ? "bg-brand-wash text-brand-deep"
                                  : opp.readinessScore >= 50
                                  ? "bg-soon-wash text-soon"
                                  : "bg-urgent-wash text-urgent"
                              }`}
                            >
                              {opp.readinessScore}%
                            </span>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-body">
                          <div className="truncate max-w-xs">{opp.nextAction}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Opportunity Detail Panel (1 col) */}
          <div className="space-y-4">
            {selectedOpp ? (
              <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-line">
                  <div>
                    <span className="text-spec font-bold text-brand-deep uppercase tracking-wider block">
                      Opportunity Overview
                    </span>
                    <h3 className="font-bold text-body text-base">{selectedOpp.project}</h3>
                  </div>
                  <select
                    value={selectedOpp.stage}
                    onChange={(e) =>
                      handleStageChange(selectedOpp.id, e.target.value as OpportunityStage)
                    }
                    className="text-meta font-semibold px-2.5 py-1 rounded-edge border border-line bg-raised focus:outline-none focus:border-brand-deep"
                  >
                    {stages.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 text-meta">
                  <div className="flex items-center justify-between py-1 border-b border-line">
                    <span className="text-ink-dim">Company:</span>
                    <span className="font-bold text-body">{selectedOpp.customerCompany}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-line">
                    <span className="text-ink-dim">Contact:</span>
                    <span className="font-semibold text-body">
                      {selectedOpp.contactName} ({selectedOpp.contactEmail})
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-line">
                    <span className="text-ink-dim">Location:</span>
                    <span className="text-body">{selectedOpp.location}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-line">
                    <span className="text-ink-dim">Est. Quantity / Value:</span>
                    <span className="font-bold text-brand-deep">
                      {selectedOpp.estimatedQuantity || 0} units • $
                      {(selectedOpp.estimatedValue || 0).toLocaleString()}
                    </span>
                  </div>
                  {selectedOpp.quoteDeadline && (
                    <div className="flex items-center justify-between py-1 border-b border-line text-soon font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-soon" /> Quote Due:
                      </span>
                      <span>{selectedOpp.quoteDeadline}</span>
                    </div>
                  )}
                </div>

                {/* AI Next Best Action Card */}
                <div className="bg-raised border border-line rounded-edge p-3 text-meta space-y-1.5">
                  <div className="font-bold text-body flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-soon" />
                    <span>Next Action:</span>
                  </div>
                  <p className="text-body">{selectedOpp.nextAction}</p>
                </div>

                {/* Quick Workflow Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block">
                    AI Sales Copilot Actions:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigateToWorkflow("tools", "call-prep", selectedOpp.id)}
                      className="text-meta font-semibold p-2.5 rounded-edge bg-raised hover:bg-paper border border-line flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-brand-deep" />
                      <span>Prep Call</span>
                    </button>
                    <button
                      onClick={() => navigateToWorkflow("tools", "quote-review")}
                      className="text-meta font-semibold p-2.5 rounded-edge bg-raised hover:bg-paper border border-line flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-brand-deep" />
                      <span>Review Quote</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const oppsInStage = filteredOpportunities.filter((o) => o.stage === stage);
            return (
              <div
                key={stage}
                className="bg-raised rounded-panel p-3 border border-line space-y-2 min-w-[220px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="text-meta font-bold">{stage}</span>
                  <span className="text-spec font-bold px-1.5 py-0.5 rounded-full bg-line">
                    {oppsInStage.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {oppsInStage.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => handleSelectOpp(opp)}
                      className="bg-white p-3 rounded-edge border border-line hover:border-brand shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="font-bold text-meta">{opp.project}</div>
                      <div className="text-spec text-ink-dim">{opp.customerCompany}</div>
                      {opp.estimatedValue && (
                        <div className="text-meta font-bold text-brand-deep">
                          ${opp.estimatedValue.toLocaleString()}
                        </div>
                      )}
                      <div className="text-spec text-ink-faint truncate pt-1 border-t border-line">
                        {opp.nextAction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
