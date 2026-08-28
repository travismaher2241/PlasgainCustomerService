import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Zap,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ActivityType, Account, CRMContact, CRMOpportunity } from "../../types/crm";
import { addDaysLocal, getLocalDateInputValue } from "../../utils/dateUtils";

export const CRMQuickLogModal: React.FC = () => {
  const {
    quickLogModal,
    closeQuickLog,
    accounts,
    crmOpportunities,
    contacts,
    logActivity,
    addTask,
    currentUser
  } = useApp();

  const [modalMode, setModalMode] = useState<"log" | "prep">("log");
  const [type, setType] = useState<ActivityType>("call");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedOppId, setSelectedOppId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [title, setTitle] = useState("");
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("Connected / Positive");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(() => addDaysLocal(3));

  // Resolved CRM records
  const targetAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const targetOpp = useMemo(() => {
    return crmOpportunities.find((d) => d.id === selectedOppId);
  }, [crmOpportunities, selectedOppId]);

  const targetContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId);
  }, [contacts, selectedContactId]);

  const deriveDefaultTitle = (
    actType: ActivityType,
    acc?: Account,
    opp?: CRMOpportunity,
    cont?: CRMContact
  ): string => {
    const name = cont
      ? `${cont.firstName} ${cont.lastName}`
      : acc?.name || "Client";
    const suffix = opp && opp.name && opp.name !== (acc?.name || "") ? ` — ${opp.name}` : "";

    switch (actType) {
      case "call":
        return `Call with ${name}${suffix}`;
      case "email":
        return `Email sent to ${name}${suffix}`;
      case "meeting":
        return `Meeting with ${name}${suffix}`;
      case "note":
        return `Account Note: ${acc?.name || name}`;
      case "follow_up":
        return `Follow-up with ${name}${suffix}`;
      default:
        return `Touchpoint with ${name}`;
    }
  };

  // Synchronize when modal opens
  useEffect(() => {
    if (quickLogModal?.isOpen) {
      const initialType = quickLogModal.type === "task" ? "call" : (quickLogModal.type as ActivityType) || "call";
      const accId = quickLogModal.accountId || accounts[0]?.id || "";
      const oppId = quickLogModal.opportunityId || "";
      const contId = quickLogModal.contactId || "";

      setType(initialType);
      setSelectedAccountId(accId);
      setSelectedOppId(oppId);
      setSelectedContactId(contId);
      setIsTitleManuallyEdited(false);
      setDescription("");
      setOutcome("Connected / Positive");
      setFollowUpDate(addDaysLocal(3));

      // Resolve initial account / opp / contact
      const acc = accounts.find((a) => a.id === accId);
      const opp = crmOpportunities.find((d) => d.id === oppId);
      const cont = contacts.find((c) => c.id === contId);
      setTitle(deriveDefaultTitle(initialType, acc, opp, cont));
    }
  }, [quickLogModal?.isOpen, quickLogModal?.accountId, quickLogModal?.opportunityId, quickLogModal?.contactId, quickLogModal?.type]);

  // Reactive title derivation as async data or account/deal selection resolves (P1-01)
  useEffect(() => {
    if (quickLogModal?.isOpen && !isTitleManuallyEdited) {
      const newTitle = deriveDefaultTitle(type, targetAccount, targetOpp, targetContact);
      setTitle(newTitle);
    }
  }, [type, targetAccount, targetOpp, targetContact, isTitleManuallyEdited, quickLogModal?.isOpen]);

  const applyPreset = (presetType: "voicemail" | "dialux" | "price-accepted") => {
    const accName = targetAccount?.name || "Client";

    if (presetType === "voicemail") {
      setType("call");
      setTitle(`Left Voicemail for ${accName}`);
      setDescription("Left voicemail message regarding tender quote follow-up and delivery schedule.");
      setOutcome("Left Voicemail");
      setScheduleFollowUp(true);
      setFollowUpDate(addDaysLocal(2));
      setIsTitleManuallyEdited(true);
    } else if (presetType === "dialux") {
      setType("email");
      setTitle(`Sent Dialux & Datasheet Package to ${accName}`);
      setDescription("Issued AS/NZS 1158 Dialux photometric simulation report and product datasheet package for council review.");
      setOutcome("Sent Technical Package");
      setScheduleFollowUp(true);
      setFollowUpDate(addDaysLocal(5));
      setIsTitleManuallyEdited(true);
    } else if (presetType === "price-accepted") {
      setType("call");
      setTitle(`Price Acceptance Confirmed with ${accName}`);
      setDescription("Customer verbally confirmed price acceptance. Awaiting formal Purchase Order / tender award.");
      setOutcome("Price Accepted");
      setScheduleFollowUp(true);
      setFollowUpDate(addDaysLocal(3));
      setIsTitleManuallyEdited(true);
    }
  };

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    if (!isTitleManuallyEdited) {
      setTitle(deriveDefaultTitle(newType, targetAccount, targetOpp, targetContact));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    logActivity({
      type,
      title: title.trim(),
      description: description.trim(),
      accountId: targetAccount?.id,
      accountName: targetAccount?.name,
      opportunityId: targetOpp?.id,
      opportunityName: targetOpp?.name,
      contactId: targetContact?.id,
      contactName: targetContact ? `${targetContact.firstName} ${targetContact.lastName}` : undefined,
      performedBy: currentUser.name,
      metadata: {
        outcome
      }
    });

    if (scheduleFollowUp && followUpDate) {
      addTask({
        title: `Follow-up: ${title}`,
        type: "Follow-up",
        status: "To Do",
        priority: "High",
        dueDate: followUpDate,
        dueTime: "10:00 AM",
        accountId: targetAccount?.id,
        accountName: targetAccount?.name,
        opportunityId: targetOpp?.id,
        opportunityName: targetOpp?.name,
        assignedTo: currentUser.name,
        createdBy: currentUser.name,
        notes: `Automated follow-up created from activity log.`
      });
    }

    closeQuickLog();
  };

  // Condition checked AFTER all hooks have executed unconditionally
  if (!quickLogModal || !quickLogModal.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-log-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <Phone className="w-4 h-4" />
            </div>
            <h3 id="quick-log-title" className="text-base font-bold text-body">
              {modalMode === "prep" ? "Pre-Call Briefing & Preparation" : "Quick Log Activity & Next Step"}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeQuickLog}
            aria-label="Close dialog"
            className="text-ink-faint hover:text-ink-dim p-1 rounded-edge cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Tab Selector (P1-02: Genuine Pre-Call Prep vs Quick Log) */}
        <div className="flex items-center gap-2 bg-paper p-1 rounded-edge border border-line">
          <button
            type="button"
            onClick={() => setModalMode("log")}
            className={`flex-1 py-1.5 px-3 text-meta font-bold rounded-edge transition-colors cursor-pointer ${
              modalMode === "log" ? "bg-white text-body shadow-xs" : "text-ink-dim hover:text-body"
            }`}
          >
            Log Activity
          </button>
          <button
            type="button"
            onClick={() => setModalMode("prep")}
            className={`flex-1 py-1.5 px-3 text-meta font-bold rounded-edge transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              modalMode === "prep" ? "bg-white text-brand-deep shadow-xs" : "text-ink-dim hover:text-body"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Pre-Call Briefing
          </button>
        </div>

        {modalMode === "prep" ? (
          /* GENUINE PRE-CALL PREPARATION WORKFLOW (P1-02) */
          <div className="space-y-4 text-meta">
            {/* Account & Opportunity Snapshot */}
            <div className="p-3.5 bg-brand-wash/40 border border-brand-edge rounded-edge space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-body text-meta flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-brand-deep" />
                  {targetAccount?.name || "No account linked"}
                </span>
                <span className="text-spec font-semibold px-2 py-0.5 rounded bg-white border border-brand-edge text-brand-deep">
                  {targetAccount?.customerSegment || "General"} · {targetAccount?.territory || "AU"}
                </span>
              </div>

              {targetOpp && (
                <div className="text-spec text-ink-dim border-t border-brand-edge/30 pt-2 space-y-1">
                  <div>
                    <strong>Active Deal:</strong> {targetOpp.name} (${(targetOpp.dealValue || 0).toLocaleString()})
                  </div>
                  <div>
                    <strong>Stage &amp; Status:</strong> {targetOpp.stageName} · {targetOpp.probability}% Probability
                  </div>
                  {targetOpp.quoteNumber && (
                    <div>
                      <strong>Quote Ref:</strong> {targetOpp.quoteNumber} (Expires: {targetOpp.quoteExpiryDate || "30 Days"})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Key Decision Maker / Contact */}
            {targetContact && (
              <div className="p-3 bg-paper border border-line rounded-edge space-y-1">
                <div className="text-spec font-bold uppercase text-ink-dim">Primary Contact for Call</div>
                <div className="font-bold text-body">
                  {targetContact.firstName} {targetContact.lastName} ({targetContact.jobTitle})
                </div>
                <div className="text-spec text-ink-dim flex items-center gap-3">
                  {targetContact.mobile && <span>📱 {targetContact.mobile}</span>}
                  {targetContact.email && <span>✉️ {targetContact.email}</span>}
                </div>
              </div>
            )}

            {/* Recommended Questions & Desired Outcomes */}
            <div className="p-3 bg-raised border border-line rounded-edge space-y-2">
              <div className="text-spec font-bold uppercase text-ink-dim flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-brand-deep" /> Recommended Call Objectives
              </div>
              <ul className="list-disc pl-4 space-y-1 text-spec text-body">
                <li>Verify required AS/NZS 1158 Category (e.g. P4 pathway vs V3 roadway).</li>
                <li>Confirm site soil conditions or rag-bolt vs in-ground footing preference.</li>
                <li>Check battery autonomy expectation (standard 4–5 nights vs shaded location).</li>
                <li>Confirm decision-making timeline and council tender committee dates.</li>
              </ul>
            </div>

            {/* Preparation Notes Scratchpad */}
            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                Call Plan Notes (Private)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jot down quick talking points or questions before dialling..."
                rows={3}
                className="w-full p-2.5 text-meta rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <span className="text-spec text-ink-faint italic">
                * Viewing pre-call briefing does not create a completed activity.
              </span>
              <button
                type="button"
                onClick={() => setModalMode("log")}
                className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Start Call &amp; Log Activity</span>
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD ACTIVITY LOGGER */
          <form onSubmit={handleSubmit} className="space-y-4 text-meta">
            {/* STRM-01: 1-Click Call Outcome Presets */}
            <div className="p-2.5 bg-brand-wash/60 rounded-edge border border-brand-edge space-y-1.5">
              <div className="flex items-center justify-between text-spec font-bold text-brand-deep uppercase">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> 1-Click Outcome Presets:
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("voicemail")}
                  className="px-2.5 py-1.5 bg-white hover:bg-raised border border-brand-edge rounded text-spec font-semibold text-body text-center shadow-2xs hover:text-brand-deep transition-colors cursor-pointer"
                >
                  Left Voicemail (+2d)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("dialux")}
                  className="px-2.5 py-1.5 bg-white hover:bg-raised border border-brand-edge rounded text-spec font-semibold text-body text-center shadow-2xs hover:text-brand-deep transition-colors cursor-pointer"
                >
                  Sent Dialux (+5d)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("price-accepted")}
                  className="px-2.5 py-1.5 bg-white hover:bg-raised border border-brand-edge rounded text-spec font-semibold text-body text-center shadow-2xs hover:text-brand-deep transition-colors cursor-pointer"
                >
                  Price Accepted (+3d)
                </button>
              </div>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "call", label: "Call", icon: Phone },
                { id: "email", label: "Email", icon: Mail },
                { id: "meeting", label: "Meeting", icon: Calendar },
                { id: "note", label: "Note", icon: FileText }
              ].map((item) => {
                const Icon = item.icon;
                const isSel = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTypeChange(item.id as ActivityType)}
                    className={`p-2 rounded-edge border flex flex-col items-center gap-1 font-semibold text-spec transition-colors cursor-pointer ${
                      isSel
                        ? "bg-brand-wash border-brand text-brand-deep shadow-2xs"
                        : "bg-paper border-line text-ink-dim hover:bg-raised"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Account & Context Link */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    const matchedOpp = crmOpportunities.find((d) => d.accountId === e.target.value);
                    if (matchedOpp) setSelectedOppId(matchedOpp.id);
                  }}
                  aria-label="Select Customer Account"
                  className="w-full p-2 rounded-edge border border-line bg-paper focus:bg-white text-meta focus:outline-none focus:border-brand-deep"
                >
                  <option value="">-- No Account --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.territory})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Deal / Opportunity
                </label>
                <select
                  value={selectedOppId}
                  onChange={(e) => setSelectedOppId(e.target.value)}
                  aria-label="Select Linked Deal"
                  className="w-full p-2 rounded-edge border border-line bg-paper focus:bg-white text-meta focus:outline-none focus:border-brand-deep"
                >
                  <option value="">-- General Account Touchpoint --</option>
                  {crmOpportunities
                    .filter((d) => !selectedAccountId || d.accountId === selectedAccountId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (${(d.dealValue || 0).toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Activity Title (P1-01: Auto-derived & manually editable) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-spec font-bold text-ink-dim uppercase">
                  Activity Title *
                </label>
                {isTitleManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTitleManuallyEdited(false);
                      setTitle(deriveDefaultTitle(type, targetAccount, targetOpp, targetContact));
                    }}
                    className="text-[11px] text-brand-deep font-semibold hover:underline cursor-pointer"
                  >
                    Reset to auto-title
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsTitleManuallyEdited(true);
                }}
                placeholder="e.g. Call with Sarah Mitchell regarding Dialux lighting report"
                className="w-full p-2 rounded-edge border border-line focus:outline-none focus:border-brand-deep font-semibold text-body"
              />
            </div>

            {/* Description / Summary */}
            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Key Notes / Customer Feedback
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Discussed pole spacing, approved 3000K CCT amber fauna requirement..."
                rows={3}
                className="w-full p-2 rounded-edge border border-line focus:outline-none focus:border-brand-deep font-mono text-spec"
              />
            </div>

            {/* Outcome Selection */}
            <div>
              <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                Call / Touchpoint Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                aria-label="Select Activity Outcome"
                className="w-full p-2 rounded-edge border border-line bg-paper focus:bg-white text-meta focus:outline-none focus:border-brand-deep"
              >
                <option value="Connected / Positive">Connected / Positive Discussion</option>
                <option value="Left Voicemail">Left Voicemail / Sent Follow-up</option>
                <option value="Sent Technical Package">Sent Technical Package / Dialux</option>
                <option value="Price Accepted">Price Accepted / Awaiting PO</option>
                <option value="Revision Requested">Revision Requested (Specs / Poles)</option>
                <option value="Lost to Competitor">Lost to Competitor</option>
                <option value="No Answer">No Answer</option>
              </select>
            </div>

            {/* Automated Follow-Up Task */}
            <div className="p-3 bg-raised rounded-edge border border-line space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleFollowUp}
                  onChange={(e) => setScheduleFollowUp(e.target.checked)}
                  className="rounded border-line-strong text-brand-deep focus:ring-brand-deep"
                />
                <span className="font-bold text-spec text-body">
                  Automatically create follow-up task
                </span>
              </label>

              {scheduleFollowUp && (
                <div className="flex items-center gap-2 pl-5 pt-1">
                  <span className="text-spec text-ink-dim">Due:</span>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    aria-label="Follow-up due date"
                    className="p-1 text-meta rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFollowUpDate(addDaysLocal(2))}
                      className="text-[11px] px-2 py-0.5 rounded bg-white border border-line hover:bg-paper cursor-pointer font-medium"
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowUpDate(addDaysLocal(5))}
                      className="text-[11px] px-2 py-0.5 rounded bg-white border border-line hover:bg-paper cursor-pointer font-medium"
                    >
                      +5 Days
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={closeQuickLog}
                className="px-3 py-2 text-meta font-medium text-ink-dim hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-bold text-meta rounded-edge shadow-xs bg-brand-deep hover:bg-brand text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Activity Log</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
