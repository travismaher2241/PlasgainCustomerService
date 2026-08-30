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
  HelpCircle,
  Building2,
  Link2,
  GitMerge,
  AlertCircle,
  Check,
  X
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
    openQuickLog,
    openEmailComposer,
    navigateToCRM,
    currentUser,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatchResult<CRMLead> | null>(null);
  const [pendingLeadToCreate, setPendingLeadToCreate] = useState<CRMLead | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // FEAT-05: Conversion & Deduplication Modal State
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
    estimatedValue: "" as string | number,
    estimatedValueBasis: "Estimate" as "Known" | "Estimate" | "Unknown",
    territory: "QLD/NT" as "NSW/ACT" | "VIC/TAS" | "QLD/NT" | "WA" | "SA" | "National",
    consentStatus: "Legitimate Interest" as "Consent Confirmed" | "Legitimate Interest" | "Pending Consent" | "Opted Out",
    location: "QLD",
    notes: "",
    nextAction: "Initial discovery call to confirm project scope"
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.leadStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const selectedLead = useMemo(() => {
    if (filteredLeads.length === 0) return null;
    const inFiltered = filteredLeads.find((l) => l.id === selectedLeadId);
    return inFiltered || filteredLeads[0];
  }, [filteredLeads, selectedLeadId]);

  // FEAT-05: Deduplication & Smart Domain Matching
  const matchedAccountInfo = useMemo(() => {
    if (!selectedLead) return null;

    // 1. Exact company match
    const exact = accounts.find((a) => a.name.toLowerCase() === selectedLead.company.toLowerCase());
    if (exact) return { account: exact, matchType: "Exact Company Name Match" };

    // 2. Email domain matching (excluding generic webmails)
    const emailDomain = selectedLead.contactEmail?.split("@")[1]?.toLowerCase();
    if (emailDomain && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "bigpond.com"].includes(emailDomain)) {
      const domainKeyword = emailDomain.split(".")[0];
      const matchByDomain = accounts.find(
        (a) => a.name.toLowerCase().includes(domainKeyword) || (a as any).website?.toLowerCase().includes(emailDomain)
      );
      if (matchByDomain) return { account: matchByDomain, matchType: `Corporate Domain Match (@${emailDomain})` };
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
    if (!newLeadForm.company.trim()) return;

    const parsedValue = Number(newLeadForm.estimatedValue);
    const finalValue = isNaN(parsedValue) || parsedValue <= 0 ? 0 : parsedValue;
    const valueBasis = finalValue > 0 ? newLeadForm.estimatedValueBasis : "Unknown";

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
      estimatedValue: finalValue,
      estimatedValueBasis: valueBasis,
      territory: newLeadForm.territory,
      consentStatus: newLeadForm.consentStatus,
      assignedSalesperson: currentUser.name,
      leadStatus: "New",
      leadScore: finalValue > 50000 ? 75 : 60,
      leadScoreRating: finalValue > 50000 ? "Hot" : "Warm",
      scoringFactors: [
        { factor: "Inbound Submission", scoreDelta: +25, reason: "Direct customer enquiry" },
        { factor: "Estimated Project Value", scoreDelta: +20, reason: "Commercial scope recorded" },
        { factor: "Contact Information", scoreDelta: +15, reason: "Verified contact details provided" }
      ],
      urgency: "Within 1 Month",
      location: newLeadForm.location,
      notes: newLeadForm.notes,
      dateReceived: new Date().toISOString().split("T")[0],
      lastActivity: "Lead received",
      lastActivityDate: new Date().toISOString().split("T")[0],
      nextAction: newLeadForm.nextAction || "Initial phone discovery and qualification call",
      nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    const duplicate = detectDuplicateLead(
      {
        leadName: newLeadForm.leadName,
        email: newLeadForm.contactEmail,
        phone: newLeadForm.contactPhone,
        company: newLeadForm.company
      },
      leads
    );

    if (duplicate) {
      setPendingLeadToCreate(newL);
      setDuplicateMatch(duplicate);
      setIsDuplicateModalOpen(true);
      return;
    }

    addLead(newL);
    setSelectedLeadId(newL.id);
    setIsNewLeadModalOpen(false);
  };

  const handleOpenConvertModal = () => {
    if (!selectedLead) return;
    setConvertTargetAccountId(matchedAccountInfo?.account?.id || "");
    setIsConvertModalOpen(true);
  };

  const handleExecuteConvert = () => {
    if (!selectedLead) return;
    const targetAccId = convertTargetAccountId || undefined;
    const result = convertLead(selectedLead.id, targetAccId);
    showToast(`Successfully converted lead "${selectedLead.leadName}" into Deals Pipeline!`, "success");
    setIsConvertModalOpen(false);
    navigateToCRM("pipeline", result.oppId);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-meta font-bold bg-urgent-wash text-urgent border border-urgent">
          <Flame className="w-3.5 h-3.5 text-urgent" /> Hot ({score})
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-meta font-bold bg-soon-wash text-soon border border-soon">
          Warm ({score})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-meta font-semibold bg-paper">
        Developing ({score})
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Inbound Leads &amp; Qualification</h1>
          <p className="text-meta text-ink-dim">
            Automated lead scoring, domain deduplication, and 1-click pipeline conversion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest Lead</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-panel border border-line shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-faint" />
          <input
            type="text"
            placeholder="Search leads by company, contact, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-meta bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {["all", "New", "Contacted", "Qualified", "Converted"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-meta font-semibold rounded-edge capitalize transition-colors cursor-pointer ${
                statusFilter === status
                  ? "bg-brand-deep text-white"
                  : "bg-paper text-body hover:bg-raised"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Lead Feed (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-panel border border-line shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-paper border-b border-line text-spec font-bold text-ink-dim uppercase">
            Active Leads ({filteredLeads.length})
          </div>
          <div className="divide-y divide-line overflow-y-auto max-h-[700px]">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-meta text-ink-dim">No leads found matching your filter.</div>
            ) : (
              filteredLeads.map((l) => {
                const isSelected = selectedLead?.id === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeadId(l.id)}
                    className={`p-4 cursor-pointer transition-colors space-y-2 ${
                      isSelected ? "bg-brand-wash/50 border-l-4 border-l-brand-deep" : "hover:bg-raised"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-body text-meta">{l.company}</div>
                        <div className="text-spec text-ink-dim font-medium">{l.leadName}</div>
                      </div>
                      {getScoreBadge(l.leadScore)}
                    </div>

                    <div className="flex items-center justify-between text-spec text-ink-dim pt-1">
                      <span>{l.contactName}</span>
                      <span className="font-bold text-body">${l.estimatedValue.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Lead 360 & Qualification Workspace (7 Columns) */}
        {!selectedLead ? (
          <div className="lg:col-span-7 bg-white rounded-panel border border-line shadow-sm p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[360px]">
            <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center text-ink-dim mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-body">Select a result</h3>
            <p className="text-meta text-ink-dim max-w-sm mx-auto">
              No matching lead found for current filters. Adjust your search or select a lead from the list to view qualification details.
            </p>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-panel border border-line shadow-sm p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getScoreBadge(selectedLead.leadScore)}
                  <span className="text-meta font-semibold px-2 py-0.5 rounded bg-paper">
                    {selectedLead.leadStatus}
                  </span>
                  <span className="text-meta text-ink-dim">Source: {selectedLead.source}</span>
                </div>
                <h2 className="text-xl font-bold text-body">{selectedLead.leadName}</h2>
                <div className="text-meta text-ink-dim mt-0.5">
                  {selectedLead.company} · {selectedLead.location}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const hasProject = Boolean(
                      selectedLead.productInterest ||
                      selectedLead.notes?.toLowerCase().includes("project") ||
                      selectedLead.notes?.toLowerCase().includes("tender") ||
                      selectedLead.enquiryType?.toLowerCase().includes("project")
                    );
                    openEmailComposer({
                      defaultMode: hasProject ? "project-enquiry" : "cold-outreach",
                      leadId: selectedLead.id,
                      contactName: selectedLead.leadName,
                      contactEmail: selectedLead.contactEmail,
                      companyName: selectedLead.company,
                      projectLocation: selectedLead.location,
                      enquiryType: selectedLead.enquiryType,
                      projectNotes: selectedLead.notes,
                      desiredOutcome: selectedLead.nextAction || "Introduce Plasgain"
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-meta font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash/80 shadow-2xs transition-colors cursor-pointer"
                  title="Draft grounded AI outreach or project enquiry email"
                >
                  <Sparkles className="w-4 h-4 text-brand" />
                  <span>Draft AI Email</span>
                </button>

                {selectedLead.leadStatus !== "Converted" ? (
                  <button
                    onClick={handleOpenConvertModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-meta font-bold text-white bg-brand-deep rounded-edge hover:bg-brand shadow-sm transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" /> Convert to Deal &amp; Account
                  </button>
                ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-brand-wash text-brand-deep text-meta font-bold rounded-edge flex items-center gap-1 border border-brand-edge">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Converted
                  </span>
                  {selectedLead.convertedOpportunityId && (
                    <button
                      onClick={() => navigateToCRM("pipeline", selectedLead.convertedOpportunityId)}
                      className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white text-spec font-bold rounded-edge shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Open Deal</span>
                    </button>
                  )}
                  {selectedLead.convertedAccountId && (
                    <button
                      onClick={() => navigateToCRM("accounts", selectedLead.convertedAccountId)}
                      className="px-3 py-1.5 bg-white hover:bg-raised text-body text-spec font-bold rounded-edge border border-line flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 text-ink-dim" />
                      <span>Open Account</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* P0-17: Linked Converted Record Confirmation */}
            {selectedLead.leadStatus === "Converted" && (
              <div className="p-3 bg-brand-wash/80 rounded-edge border border-brand-edge flex items-center justify-between text-meta">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0" />
                  <span className="text-body font-semibold">
                    This lead is linked to active CRM records. All activities and history are preserved.
                  </span>
                </div>
              </div>
            )}

            {/* FEAT-05: Smart Deduplication / Account Match Banner */}
            {matchedAccountInfo && selectedLead.leadStatus !== "Converted" && (
              <div className="p-3.5 bg-brand-wash/80 rounded-edge border border-brand-edge flex items-start gap-3 text-meta animate-in fade-in duration-150">
                <GitMerge className="w-5 h-5 text-brand-deep shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-deep text-spec uppercase">
                      Existing CRM Account Detected ({matchedAccountInfo.matchType})
                    </span>
                    <span className="text-[11px] font-bold text-brand-deep bg-white px-2 py-0.5 rounded border border-brand-edge">
                      {matchedAccountInfo.account.status}
                    </span>
                  </div>
                  <p className="text-spec text-body font-semibold">
                    Matching Account: <strong>{matchedAccountInfo.account.name}</strong> · Owner: {matchedAccountInfo.account.accountOwner} · Territory: {matchedAccountInfo.account.territory}
                  </p>
                  <p className="text-[11px] text-ink-dim">
                    Converting this lead will automatically link the new deal and contact to <strong>{matchedAccountInfo.account.name}</strong> to prevent duplicate customer records.
                  </p>
                </div>
              </div>
            )}

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-meta">
              <div className="p-4 bg-raised rounded-panel space-y-2">
                <div className="font-bold text-body border-b border-line pb-1">Contact Information</div>
                <div className="font-semibold text-body">{selectedLead.contactName}</div>
                <div className="flex items-center gap-2 text-ink-dim">
                  <Mail className="w-3.5 h-3.5 text-ink-faint" />
                  <a href={`mailto:${selectedLead.contactEmail}`} className="text-brand-deep hover:underline">{selectedLead.contactEmail}</a>
                </div>
                {selectedLead.contactPhone && (
                  <div className="flex items-center gap-2 text-ink-dim">
                    <Phone className="w-3.5 h-3.5 text-ink-faint" />
                    <span>{selectedLead.contactPhone}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-raised rounded-panel space-y-2">
                <div className="font-bold text-body border-b border-line pb-1">Scope &amp; Estimation</div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Estimated Value:</span>
                  <span className="font-bold text-body">${selectedLead.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Enquiry Type:</span>
                  <span className="font-semibold text-body">{selectedLead.enquiryType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Urgency:</span>
                  <span className="font-semibold text-body">{selectedLead.urgency}</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown (Transparent AI Reasoning) */}
            <div className="p-4 bg-hold-wash rounded-panel border border-hold space-y-3">
              <div className="flex items-center justify-between text-meta">
                <span className="font-bold text-hold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-hold" /> Lead Qualification Breakdown
                </span>
                <span className="font-bold text-hold text-body">{selectedLead.leadScore} / 100</span>
              </div>

              <div className="space-y-1.5 text-meta">
                {selectedLead.scoringFactors?.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-edge border border-hold/70 text-body">
                    <span className="font-medium">{f.factor} ({f.reason})</span>
                    <span className="font-bold text-brand-deep">+{f.scoreDelta} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Need Notes */}
            {selectedLead.notes && (
              <div className="p-4 bg-raised rounded-panel border border-line text-meta space-y-1">
                <div className="font-bold text-body">Raw Enquiry Content &amp; Specifics</div>
                <p className="text-ink-dim leading-relaxed">{selectedLead.notes}</p>
              </div>
            )}

            {/* Next Action Bar */}
            <div className="p-4 bg-brand-wash rounded-panel border border-brand-edge flex items-center justify-between text-meta">
              <div>
                <div className="font-bold text-brand-deep">Next Action Required:</div>
                <div className="text-brand-deep mt-0.5">{selectedLead.nextAction}</div>
              </div>
              <button
                onClick={() => openQuickLog("call", undefined, undefined)}
                className="px-3 py-1.5 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand cursor-pointer"
              >
                Log Call
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FEAT-05: Lead Conversion & Deduplication Modal */}
      {isConvertModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-deep" />
                <h3 className="text-lg font-bold text-body">
                  Convert Lead to Pipeline Deal
                </h3>
              </div>
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-meta">
              <div>
                <span className="text-spec font-bold text-ink-dim uppercase">Lead Summary</span>
                <div className="p-3 bg-paper rounded-edge border border-line font-medium text-body mt-1">
                  <strong>{selectedLead.company}</strong> — {selectedLead.leadName} (${selectedLead.estimatedValue.toLocaleString()})
                  <div className="text-spec text-ink-dim mt-0.5">Contact: {selectedLead.contactName} ({selectedLead.contactEmail})</div>
                </div>
              </div>

              {/* Deduplication & Account Linkage Choice */}
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1.5">
                  Target Customer Account
                </label>
                <div className="space-y-2">
                  {matchedAccountInfo && (
                    <label className="flex items-start gap-2.5 p-3 rounded-edge border border-brand-edge bg-brand-wash/60 cursor-pointer">
                      <input
                        type="radio"
                        name="accountOption"
                        checked={convertTargetAccountId === matchedAccountInfo.account.id}
                        onChange={() => setConvertTargetAccountId(matchedAccountInfo.account.id)}
                        className="mt-1 accent-brand-deep"
                      />
                      <div>
                        <div className="font-bold text-body flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-brand-deep" />
                          <span>Link to Existing Account: {matchedAccountInfo.account.name}</span>
                        </div>
                        <p className="text-[11px] text-ink-dim mt-0.5">
                          Recommended: Matches by {matchedAccountInfo.matchType}. Avoids duplicate account entries.
                        </p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-start gap-2.5 p-3 rounded-edge border border-line bg-white hover:bg-raised cursor-pointer">
                    <input
                      type="radio"
                      name="accountOption"
                      checked={convertTargetAccountId === ""}
                      onChange={() => setConvertTargetAccountId("")}
                      className="mt-1 accent-brand-deep"
                    />
                    <div>
                      <div className="font-bold text-body">
                        Create New Account: "{selectedLead.company}"
                      </div>
                      <p className="text-[11px] text-ink-dim mt-0.5">
                        Creates a brand-new Account record in the CRM.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-3.5 py-2 text-ink-dim hover:text-ink font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConvert}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirm &amp; Open Deal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-body">Ingest New Lead</h3>
              <button onClick={() => setIsNewLeadModalOpen(false)} className="text-ink-faint hover:text-ink-dim text-body cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-meta">
              <div>
                <label className="block font-semibold text-body mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Moreton Bay Regional Council"
                  value={newLeadForm.company}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newLeadForm.contactName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactName: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="john@council.gov.au"
                    value={newLeadForm.contactEmail}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactEmail: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Estimated Value ($ AUD)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 25000"
                    value={newLeadForm.estimatedValue}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, estimatedValue: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Value Basis</label>
                  <select
                    value={newLeadForm.estimatedValueBasis}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, estimatedValueBasis: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge text-spec font-semibold cursor-pointer"
                  >
                    <option value="Estimate">Estimate</option>
                    <option value="Known">Known (Client Confirmed)</option>
                    <option value="Unknown">Unknown (Discovery Pending)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Enquiry Type</label>
                  <select
                    value={newLeadForm.enquiryType}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, enquiryType: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge cursor-pointer"
                  >
                    <option value="Solar Pathway Lighting">Solar Pathway Lighting</option>
                    <option value="Roadway & Streetlight">Roadway &amp; Streetlight</option>
                    <option value="Car Park & Area">Car Park &amp; Area</option>
                    <option value="Composite Poles">Composite Poles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Territory</label>
                  <select
                    value={newLeadForm.territory}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, territory: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge cursor-pointer"
                  >
                    <option value="NSW/ACT">NSW/ACT</option>
                    <option value="VIC/TAS">VIC/TAS</option>
                    <option value="QLD/NT">QLD/NT</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="National">National</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Privacy / Consent Status</label>
                  <select
                    value={newLeadForm.consentStatus}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, consentStatus: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge cursor-pointer text-spec"
                  >
                    <option value="Legitimate Interest">Legitimate Interest (B2B Tender)</option>
                    <option value="Consent Confirmed">Consent Confirmed (Inbound Opt-in)</option>
                    <option value="Pending Consent">Pending Consent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Immediate Next Action</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule technical scoping call"
                  value={newLeadForm.nextAction}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, nextAction: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge text-meta"
                />
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Enquiry Details &amp; Requirements</label>
                <textarea
                  rows={2}
                  placeholder="Paste raw email or tender spec details..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand cursor-pointer"
                >
                  Ingest Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* P2-13: CRM Duplicate Lead Warning Modal */}
      {isDuplicateModalOpen && duplicateMatch && pendingLeadToCreate && (
        <CRMDuplicateWarningModal<CRMLead>
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateMatch(null);
            setPendingLeadToCreate(null);
          }}
          entityType="Lead"
          candidateName={pendingLeadToCreate.leadName}
          matchResult={duplicateMatch}
          onOpenExisting={(existingL) => {
            setSelectedLeadId(existingL.id);
            setIsNewLeadModalOpen(false);
            showToast(`Navigated to existing lead "${existingL.leadName}"`, "info");
          }}
          onUseExisting={(existingL) => {
            setSelectedLeadId(existingL.id);
            setIsNewLeadModalOpen(false);
            showToast(`Attached to existing lead "${existingL.leadName}"`, "success");
          }}
          onCreateAnyway={() => {
            addLead(pendingLeadToCreate);
            setSelectedLeadId(pendingLeadToCreate.id);
            setIsNewLeadModalOpen(false);
            showToast(`Ingested lead "${pendingLeadToCreate.leadName}" (Duplicate override audit recorded)`, "warning");
          }}
        />
      )}
    </div>
  );
};
