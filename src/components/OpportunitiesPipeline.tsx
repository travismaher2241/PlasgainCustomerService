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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Opportunities & Pipeline</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
              {opportunities.length} Active Deals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track sales progression, missing customer parameters, quote deadlines, and AI action items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === "list" ? "bg-white text-emerald-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === "kanban" ? "bg-white text-emerald-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => navigateToWorkflow("new-enquiry")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-2 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project, client company, or location..."
            className="w-full text-xs text-slate-900 pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium">Stage:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs text-slate-800 px-3 py-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:border-emerald-600"
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
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold">Project & Customer</th>
                    <th className="py-3 px-3 font-semibold">Stage</th>
                    <th className="py-3 px-3 font-semibold">Est. Value</th>
                    <th className="py-3 px-3 font-semibold">Readiness</th>
                    <th className="py-3 px-4 font-semibold">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpportunities.map((opp) => {
                    const isSelected = selectedOpp?.id === opp.id;
                    return (
                      <tr
                        key={opp.id}
                        onClick={() => handleSelectOpp(opp)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? "bg-emerald-50/60 font-medium" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{opp.project}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{opp.customerCompany}</span>
                            <span>•</span>
                            <span>{opp.location}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {opp.stage}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          {opp.estimatedValue ? `$${opp.estimatedValue.toLocaleString()}` : "TBD"}
                        </td>
                        <td className="py-3 px-3">
                          {opp.readinessScore ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                opp.readinessScore >= 80
                                  ? "bg-emerald-100 text-emerald-800"
                                  : opp.readinessScore >= 50
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {opp.readinessScore}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
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
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Opportunity Overview
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{selectedOpp.project}</h3>
                  </div>
                  <select
                    value={selectedOpp.stage}
                    onChange={(e) =>
                      handleStageChange(selectedOpp.id, e.target.value as OpportunityStage)
                    }
                    className="text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600"
                  >
                    {stages.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Company:</span>
                    <span className="font-bold text-slate-900">{selectedOpp.customerCompany}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Contact:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedOpp.contactName} ({selectedOpp.contactEmail})
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-900">{selectedOpp.location}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Est. Quantity / Value:</span>
                    <span className="font-bold text-emerald-700">
                      {selectedOpp.estimatedQuantity || 0} units • $
                      {(selectedOpp.estimatedValue || 0).toLocaleString()}
                    </span>
                  </div>
                  {selectedOpp.quoteDeadline && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 text-amber-800 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Quote Due:
                      </span>
                      <span>{selectedOpp.quoteDeadline}</span>
                    </div>
                  )}
                </div>

                {/* AI Next Best Action Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Next Action:</span>
                  </div>
                  <p className="text-slate-700">{selectedOpp.nextAction}</p>
                </div>

                {/* Quick Workflow Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    AI Sales Copilot Actions:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigateToWorkflow("tools", "call-prep", selectedOpp.id)}
                      className="text-xs font-semibold p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Prep Call</span>
                    </button>
                    <button
                      onClick={() => navigateToWorkflow("tools", "quote-review")}
                      className="text-xs font-semibold p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
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
                className="bg-slate-50/70 rounded-xl p-3 border border-slate-200 space-y-2 min-w-[220px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">{stage}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {oppsInStage.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {oppsInStage.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => handleSelectOpp(opp)}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="font-bold text-slate-900 text-xs">{opp.project}</div>
                      <div className="text-[11px] text-slate-500">{opp.customerCompany}</div>
                      {opp.estimatedValue && (
                        <div className="text-xs font-bold text-emerald-700">
                          ${opp.estimatedValue.toLocaleString()}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-100">
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
