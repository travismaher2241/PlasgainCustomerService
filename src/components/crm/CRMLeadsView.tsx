import React, { useState } from "react";
import {
  Flame,
  UserCheck,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMLead, LeadStatus } from "../../types/crm";

export const CRMLeadsView: React.FC = () => {
  const { leads, updateLead, addLead, convertLead, accounts, openQuickLog, navigateToCRM } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState({
    leadName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    company: "",
    source: "Web Form" as const,
    enquiryType: "Solar Pathway Lighting" as const,
    estimatedValue: 40000,
    location: "QLD",
    notes: ""
  });

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.leadStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || filteredLeads[0];

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.company.trim()) return;

    const newL: CRMLead = {
      id: `lead-${Date.now()}`,
      leadName: newLeadForm.leadName || `${newLeadForm.company} Lighting Project`,
      contactName: newLeadForm.contactName,
      contactEmail: newLeadForm.contactEmail,
      contactPhone: newLeadForm.contactPhone,
      company: newLeadForm.company,
      source: newLeadForm.source,
      enquiryType: newLeadForm.enquiryType,
      productInterest: ["Intense 50W Solar"],
      estimatedValue: Number(newLeadForm.estimatedValue),
      assignedSalesperson: "Marcus Vance",
      leadStatus: "New",
      leadScore: 65,
      leadScoreRating: "Warm",
      scoringFactors: [
        { factor: "Inbound Submission", scoreDelta: +25, reason: "Direct customer enquiry" },
        { factor: "Estimated Project Value", scoreDelta: +20, reason: "Substantial luminaire scope" },
        { factor: "Contact Information", scoreDelta: +20, reason: "Verified contact details provided" }
      ],
      urgency: "Within 1 Month",
      location: newLeadForm.location,
      notes: newLeadForm.notes,
      dateReceived: new Date().toISOString().split("T")[0],
      lastActivity: "Lead received",
      lastActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Initial phone discovery and qualification call",
      nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    addLead(newL);
    setSelectedLeadId(newL.id);
    setIsNewLeadModalOpen(false);
  };

  const handleConvert = (leadId: string) => {
    const result = convertLead(leadId);
    navigateToCRM("pipeline", result.oppId);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <Flame className="w-3.5 h-3.5 text-rose-600" /> Hot ({score})
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Warm ({score})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
        Developing ({score})
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads & Inbound Ingestion</h1>
          <p className="text-sm text-slate-600">
            Automated lead scoring (0-100), qualification, and one-click conversion into Accounts and Deals.
          </p>
        </div>
        <button
          onClick={() => setIsNewLeadModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* 2-Column Split: Leads List vs Lead Detail & Convert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Directory (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
          {/* Filter Header */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads by company, contact, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">All Lead Statuses</option>
                <option value="New">New</option>
                <option value="Attempting Contact">Attempting Contact</option>
                <option value="Qualifying">Qualifying</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
          </div>

          {/* Leads Scroll List */}
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No matching leads found.</div>
            ) : (
              filteredLeads.map((l) => {
                const isSelected = l.id === selectedLead?.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeadId(l.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-emerald-50/80 border-l-4 border-emerald-600" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 leading-snug">{l.leadName}</div>
                        <div className="text-[11px] text-slate-500">{l.company} · {l.contactName}</div>
                      </div>
                      {getScoreBadge(l.leadScore)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Est: <strong className="text-slate-800 font-semibold">${l.estimatedValue.toLocaleString()}</strong></span>
                      <span className="font-semibold text-slate-600">{l.leadStatus}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Lead 360 & Qualification Workspace (7 Columns) */}
        {selectedLead && (
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getScoreBadge(selectedLead.leadScore)}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {selectedLead.leadStatus}
                  </span>
                  <span className="text-xs text-slate-500">Source: {selectedLead.source}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedLead.leadName}</h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedLead.company} · {selectedLead.location}
                </div>
              </div>

              {selectedLead.leadStatus !== "Converted" ? (
                <button
                  onClick={() => handleConvert(selectedLead.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <UserCheck className="w-4 h-4" /> Convert to Deal & Account
                </button>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Converted
                </span>
              )}
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">Contact Information</div>
                <div className="font-semibold text-slate-800">{selectedLead.contactName}</div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${selectedLead.contactEmail}`} className="text-emerald-600 hover:underline">{selectedLead.contactEmail}</a>
                </div>
                {selectedLead.contactPhone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedLead.contactPhone}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">Scope & Estimation</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Value:</span>
                  <span className="font-bold text-slate-900">${selectedLead.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Enquiry Type:</span>
                  <span className="font-semibold text-slate-700">{selectedLead.enquiryType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Urgency:</span>
                  <span className="font-semibold text-slate-700">{selectedLead.urgency}</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown (Transparent AI Reasoning) */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Transparent Lead Scoring Model
                </span>
                <span className="font-bold text-indigo-700 text-sm">{selectedLead.leadScore} / 100</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {selectedLead.scoringFactors?.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-100/70 text-slate-700">
                    <span className="font-medium">{f.factor} ({f.reason})</span>
                    <span className="font-bold text-emerald-600">+{f.scoreDelta} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Need Notes */}
            {selectedLead.notes && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">Raw Enquiry Content & Specifics</div>
                <p className="text-slate-600 leading-relaxed">{selectedLead.notes}</p>
              </div>
            )}

            {/* Next Action Bar */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-emerald-950">Next Action Required:</div>
                <div className="text-emerald-800 mt-0.5">{selectedLead.nextAction}</div>
              </div>
              <button
                onClick={() => openQuickLog("call", undefined, undefined)}
                className="px-3 py-1.5 font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Log Call
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Lead Modal */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Ingest New Lead</h3>
              <button onClick={() => setIsNewLeadModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Moreton Bay Regional Council"
                  value={newLeadForm.company}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newLeadForm.contactName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="john@council.gov.au"
                    value={newLeadForm.contactEmail}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactEmail: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    value={newLeadForm.estimatedValue}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, estimatedValue: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Enquiry Type</label>
                  <select
                    value={newLeadForm.enquiryType}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, enquiryType: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Solar Pathway Lighting">Solar Pathway Lighting</option>
                    <option value="Roadway & Streetlight">Roadway & Streetlight</option>
                    <option value="Car Park & Area">Car Park & Area</option>
                    <option value="Composite Poles">Composite Poles</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Enquiry Details & Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Paste raw email or tender spec details..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Ingest Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
