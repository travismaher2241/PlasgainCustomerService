import React, { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Building2,
  Link2,
  GitMerge,
  AlertCircle,
  Check,
  X,
  PhoneCall
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMLead, LeadStatus } from "../../types/crm";
import { detectDuplicateLead, DuplicateMatchResult } from "../../utils/duplicateDetector";
import { CRMDuplicateWarningModal } from "./CRMDuplicateWarningModal";

export const CRMLeadsView: React.FC = () => {
  const {
    leads,
    updateLead,
    addLead,
    convertLead,
    accounts,
    contacts,
    openEmailComposer,
    openEnquiryParser,
    navigateToCRM,
    currentUser,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [showScoreFactors, setShowScoreFactors] = useState(false);
  const [showOriginalEnquiry, setShowOriginalEnquiry] = useState(false);

  // Conversion Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertTargetAccountId, setConvertTargetAccountId] = useState<string>("");

  const [newLeadForm, setNewLeadForm] = useState({
    leadName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    company: "",
    source: "Web Form" as const,
    enquiryType: "Solar Pathway Lighting" as const,
    estimatedValue: 35000,
    location: "VIC",
    notes: "",
    nextAction: "Initial discovery call to confirm photometric requirements"
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.enquiryType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.leadStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const selectedLead = useMemo(() => {
    if (filteredLeads.length === 0) return null;
    const inFiltered = filteredLeads.find((l) => l.id === selectedLeadId);
    return inFiltered || filteredLeads[0];
  }, [filteredLeads, selectedLeadId]);

  // Account / Domain Matching
  const matchedAccountInfo = useMemo(() => {
    if (!selectedLead) return null;

    // 1. Exact company match
    const exact = accounts.find((a) => a.name.toLowerCase() === selectedLead.company.toLowerCase());
    if (exact) return { account: exact, matchType: "Exact Company Name" };

    // 2. Email domain matching
    const emailDomain = selectedLead.contactEmail?.split("@")[1]?.toLowerCase();
    if (emailDomain && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "bigpond.com"].includes(emailDomain)) {
      const domainKeyword = emailDomain.split(".")[0];
      const matchByDomain = accounts.find(
        (a) => a.name.toLowerCase().includes(domainKeyword) || (a as any).website?.toLowerCase().includes(emailDomain)
      );
      if (matchByDomain) return { account: matchByDomain, matchType: `Corporate Domain (@${emailDomain})` };
    }

    // 3. Fuzzy company substring matching
    const fuzzy = accounts.find(
      (a) =>
        (a.name.toLowerCase().length > 4 && selectedLead.company.toLowerCase().includes(a.name.toLowerCase())) ||
        (selectedLead.company.toLowerCase().length > 4 && a.name.toLowerCase().includes(selectedLead.company.toLowerCase()))
    );
    if (fuzzy) return { account: fuzzy, matchType: "Company Name Similarity" };

    return null;
  }, [selectedLead, accounts]);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.leadName.trim() || !newLeadForm.company.trim()) return;

    const newLead: CRMLead = {
      id: `lead-${Date.now()}`,
      leadName: newLeadForm.leadName,
      contactName: newLeadForm.contactName || newLeadForm.leadName,
      contactEmail: newLeadForm.contactEmail,
      contactPhone: newLeadForm.contactPhone,
      company: newLeadForm.company,
      source: newLeadForm.source,
      enquiryType: newLeadForm.enquiryType,
      leadStatus: "New",
      leadScore: 75,
      leadScoreRating: "Warm",
      scoringFactors: [
        { factor: "Verified Organisation", scoreDelta: 25, reason: "Verified company organisation" },
        { factor: "Clear Application", scoreDelta: 25, reason: "Clear solar public lighting application" },
        { factor: "Direct Contact Details", scoreDelta: 25, reason: "Direct contact phone and email provided" }
      ],
      estimatedValue: Number(newLeadForm.estimatedValue) || 25000,
      estimatedValueBasis: "Estimate",
      territory: "VIC/TAS",
      productInterest: ["Plasgain Pro Blade 75", "Composite Solar Poles"],
      urgency: "Within 1 Month",
      location: newLeadForm.location,
      notes: newLeadForm.notes || "Inbound enquiry awaiting qualification call",
      dateReceived: new Date().toISOString(),
      lastActivity: "Lead created",
      lastActivityDate: new Date().toISOString(),
      nextAction: newLeadForm.nextAction,
      nextActionDate: new Date().toISOString().split("T")[0],
      assignedSalesperson: currentUser.name
    };

    addLead(newLead);
    setSelectedLeadId(newLead.id);
    setIsNewLeadModalOpen(false);
    showToast(`Lead "${newLead.leadName}" added!`, "success");
  };

  const handleConvertLead = () => {
    if (!selectedLead) return;
    const targetAccId = convertTargetAccountId || matchedAccountInfo?.account?.id;
    convertLead(selectedLead.id, targetAccId);
    setIsConvertModalOpen(false);
    showToast(`Lead converted to Deal and Account!`, "success");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER (PART D: RENAME TO LEADS, ADD LEAD) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Leads</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            Qualify incoming customer enquiries, evaluate compliance scope, and convert to active deals.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => openEnquiryParser()}
            className="px-3 py-2 rounded-edge border border-brand-deep/30 bg-brand-wash hover:bg-brand-wash/80 text-brand-deep font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Parse Inbound Tender, RFQ, or Email into a Structured Lead"
          >
            <Sparkles className="w-4 h-4 text-brand-deep" />
            <span>Parse Inbound Enquiry</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewLeadModalOpen(true)}
            className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add lead</span>
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {leads.length === 0 ? (
        <div className="p-12 text-center space-y-4 bg-white rounded-panel border border-line shadow-2xs">
          <Flame className="w-10 h-10 text-ink-faint mx-auto" />
          <h2 className="text-base font-bold text-body">No leads have been added yet</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            Parse an incoming tender, RFQ email, or web form message into a structured lead with AI phrase attribution, or add a lead manually.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openEnquiryParser()}
              className="px-4 py-2 rounded-edge border border-brand-deep/30 bg-brand-wash hover:bg-brand-wash/80 text-brand-deep font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-brand-deep" />
              <span>Parse Inbound Enquiry</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNewLeadModalOpen(true)}
              className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add lead</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2-COLUMN SPLIT: LEADS LIST VS DETAIL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: COMPACT LEADS LIST */}
          <div className="lg:col-span-5 bg-white rounded-panel border border-line shadow-2xs overflow-hidden flex flex-col h-auto max-h-[500px] lg:h-[760px]">
            {/* TOOLBAR */}
            <div className="p-3 border-b border-line space-y-2 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads by contact, company, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium flex-1"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                </select>
              </div>
            </div>

            {/* ROWS */}
            <div className="flex-1 overflow-y-auto divide-y divide-line">
              {filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const isHot = lead.leadScore >= 70;

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`p-3.5 transition-colors cursor-pointer border-l-4 ${
                      isSelected
                        ? "border-brand-deep bg-brand-wash/40"
                        : "border-transparent hover:bg-raised/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-body text-spec truncate">{lead.company || lead.leadName}</h3>
                          {isHot && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Score {lead.leadScore}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-dim truncate mt-0.5">
                          {lead.contactName} · {lead.enquiryType}
                        </p>
                        <p className="text-[11px] text-brand-deep font-medium truncate mt-1">
                          Next: {lead.nextAction || "Contact customer"}
                        </p>
                      </div>

                      {lead.isAiAssisted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0" title="Ingested with AI phrase attribution">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI</span>
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-line text-body shrink-0">
                        {lead.leadStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: LEAD DETAILS (NEXT ACTION AT TOP!) */}
          <div className="lg:col-span-7 bg-white rounded-panel border border-line shadow-2xs overflow-hidden p-5 space-y-5">
            {selectedLead ? (
              <div className="space-y-5">
                {/* 1. LEAD IDENTITY & CONVERT BUTTON */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-line pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-body">{selectedLead.company}</h2>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                        {selectedLead.leadStatus}
                      </span>
                      {selectedLead.isAiAssisted && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>AI Parsed</span>
                        </span>
                      )}
                    </div>
                    <p className="text-spec text-ink-dim">
                      Contact: <strong>{selectedLead.contactName}</strong> · {selectedLead.contactEmail || selectedLead.contactPhone}
                    </p>
                  </div>

                  {selectedLead.leadStatus !== "Converted" && (
                    <button
                      type="button"
                      onClick={() => setIsConvertModalOpen(true)}
                      className="px-3.5 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      <span>Convert to deal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. NEXT ACTION NEAR THE TOP (PART D) */}
                <div className="bg-brand-wash/40 border border-brand-edge/60 rounded-panel p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                      Next Strategic Action
                    </span>
                    <span className="text-[11px] font-mono text-ink-dim">
                      Due: {selectedLead.nextActionDate || "Immediate"}
                    </span>
                  </div>
                  <p className="text-body font-bold text-base">{selectedLead.nextAction || "Contact customer to review specification"}</p>
                </div>

                {/* 3. MATCHING ACCOUNT / SAFEGUARD BANNER */}
                {matchedAccountInfo && (
                  <div className="bg-paper border border-line rounded-panel p-3 text-spec flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-ink-dim uppercase block">Possible Existing Account</span>
                      <span className="font-bold text-body">{matchedAccountInfo.account.name}</span>
                      <span className="text-xs text-ink-dim block">Matched on: {matchedAccountInfo.matchType}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateLead(selectedLead.id, { convertedAccountId: matchedAccountInfo.account.id });
                        showToast(`Linked to ${matchedAccountInfo.account.name}`, "success");
                      }}
                      className="px-3 py-1 text-xs border border-line rounded-edge bg-white hover:bg-raised text-brand-deep font-bold"
                    >
                      Link Account
                    </button>
                  </div>
                )}

                {/* 4. LEAD SCORE & "WHY THIS SCORE?" DISCLOSURE */}
                <div className="p-3.5 bg-paper rounded-panel border border-line space-y-2">
                  <div className="flex items-center justify-between text-spec">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-body">Lead Score: {selectedLead.leadScore} / 100</span>
                      <span className="text-xs text-ink-dim">({selectedLead.leadScore >= 70 ? "High Intent" : "Standard"})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScoreFactors(!showScoreFactors)}
                      className="text-xs font-bold text-brand-deep hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Why this score?</span>
                      {showScoreFactors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {showScoreFactors && (
                    <ul className="text-xs text-ink-dim space-y-1 pt-1 border-t border-line animate-in fade-in duration-100">
                      {(selectedLead.scoringFactors || [
                        { factor: "Contact Details", scoreDelta: 20, reason: "Complete customer contact details provided" },
                        { factor: "High Intent", scoreDelta: 30, reason: "High commercial intent with clear project application" },
                        { factor: "Product Scope", scoreDelta: 25, reason: "Compliant solar lighting product scope" }
                      ]).map((item, idx) => {
                        const label = typeof item === "string" ? item : (item.reason || item.factor);
                        return (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* 5. COLLAPSIBLE ORIGINAL ENQUIRY (PART D) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOriginalEnquiry(!showOriginalEnquiry)}
                    className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showOriginalEnquiry ? "- Hide original enquiry notes" : "+ View original enquiry notes"}</span>
                    {showOriginalEnquiry ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showOriginalEnquiry && (
                    <div className="mt-2 p-3 bg-raised rounded-panel border border-line text-xs text-body whitespace-pre-wrap animate-in fade-in duration-100 font-mono">
                      {selectedLead.notes || "No raw text notes recorded."}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-ink-dim text-spec">Select a lead to inspect details.</div>
            )}
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-lead-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="add-lead-title" className="font-bold text-body text-base">Add New Lead</h3>
              <button onClick={() => setIsNewLeadModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="block text-spec font-bold mb-1">Company / Organisation *</label>
                <input
                  required
                  value={newLeadForm.company}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. Cardinia Shire Council"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Lead / Project Name *</label>
                  <input
                    required
                    value={newLeadForm.leadName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, leadName: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="e.g. Recreation Reserve Lighting"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold mb-1">Contact Name</label>
                  <input
                    value={newLeadForm.contactName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactName: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={newLeadForm.contactEmail}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactEmail: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="john@cardinia.vic.gov.au"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold mb-1">Phone</label>
                  <input
                    value={newLeadForm.contactPhone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactPhone: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="03 5945 0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Enquiry Scope / Notes</label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  placeholder="e.g. 14 solar pathway lights required for new park upgrade"
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* CONVERT MODAL */}
      {isConvertModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Convert Lead"
            className="bg-surface rounded-panel max-w-md w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-body text-base">Convert Lead to Deal</h3>
              <button onClick={() => setIsConvertModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-spec">
              <p className="text-body">
                Converting <strong>{selectedLead.leadName}</strong> will create a new active opportunity in the pipeline.
              </p>

              <div>
                <label className="block text-spec font-bold mb-1">Target Account</label>
                <select
                  value={convertTargetAccountId}
                  onChange={(e) => setConvertTargetAccountId(e.target.value)}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                >
                  <option value="">Create new account ({selectedLead.company})</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      Link to existing: {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertLead}
                className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
              >
                Confirm Conversion
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
