import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Building2
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ActivityType, Account, CRMContact, CRMOpportunity } from "../../types/crm";
import { addDaysLocal } from "../../utils/dateUtils";

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

  const [type, setType] = useState<ActivityType>("call");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedOppId, setSelectedOppId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [showAccountSelectors, setShowAccountSelectors] = useState(false);
  const [title, setTitle] = useState("");
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [callContactMade, setCallContactMade] = useState(false);
  const [callNoAnswer, setCallNoAnswer] = useState(false);
  const [callVoicemailLeft, setCallVoicemailLeft] = useState(false);
  const [nonCallOutcome, setNonCallOutcome] = useState("Connected / Positive");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => addDaysLocal(3));

  const handleToggleContactMade = () => {
    if (!callContactMade) {
      setCallContactMade(true);
      setCallNoAnswer(false);
      setCallVoicemailLeft(false);
    } else {
      setCallContactMade(false);
    }
  };

  const handleToggleNoAnswer = () => {
    if (!callNoAnswer) {
      setCallNoAnswer(true);
      setCallContactMade(false);
      // do not automatically select Voicemail Left
    } else {
      setCallNoAnswer(false);
      // If No Answer is deselected while Voicemail Left is selected, also clear Voicemail Left.
      setCallVoicemailLeft(false);
    }
  };

  const handleToggleVoicemailLeft = () => {
    if (!callVoicemailLeft) {
      setCallVoicemailLeft(true);
      // If user selects Voicemail Left, automatically also select No Answer
      setCallNoAnswer(true);
      // Voicemail Left must never be selected together with Contact Made
      setCallContactMade(false);
    } else {
      setCallVoicemailLeft(false);
    }
  };

  const getCallOutcome = (): string => {
    if (callContactMade) return "Contact Made";
    if (callNoAnswer && callVoicemailLeft) return "No Answer + Voicemail Left";
    if (callNoAnswer) return "No Answer";
    if (callVoicemailLeft) return "No Answer + Voicemail Left";
    return "";
  };

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
      const accId = quickLogModal.accountId || "";
      let oppId = quickLogModal.opportunityId || "";
      if (accId && oppId) {
        const opp = crmOpportunities.find((d) => d.id === oppId);
        if (opp && opp.accountId && opp.accountId !== accId) {
          oppId = "";
        }
      }
      const contId = quickLogModal.contactId || "";

      setType(initialType);
      setSelectedAccountId(accId);
      setSelectedOppId(oppId);
      setSelectedContactId(contId);
      setShowAccountSelectors(!quickLogModal.accountId);
      setIsTitleManuallyEdited(false);
      setDescription(quickLogModal.prefillNotes || "");
      setCallContactMade(false);
      setCallNoAnswer(false);
      setCallVoicemailLeft(false);
      setNonCallOutcome("Connected / Positive");
      setScheduleFollowUp(false);
      setFollowUpDate(addDaysLocal(3));

      const acc = accounts.find((a) => a.id === accId);
      const opp = crmOpportunities.find((d) => d.id === oppId);
      const cont = contacts.find((c) => c.id === contId);
      setTitle(deriveDefaultTitle(initialType, acc, opp, cont));
    }
  }, [quickLogModal?.isOpen, quickLogModal?.accountId, quickLogModal?.opportunityId, quickLogModal?.contactId, quickLogModal?.type, quickLogModal?.prefillNotes]);

  // Reactive title derivation as async data or account/deal selection resolves
  useEffect(() => {
    if (quickLogModal?.isOpen && !isTitleManuallyEdited) {
      const newTitle = deriveDefaultTitle(type, targetAccount, targetOpp, targetContact);
      setTitle(newTitle);
    }
  }, [type, targetAccount, targetOpp, targetContact, isTitleManuallyEdited, quickLogModal?.isOpen]);

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    if (!isTitleManuallyEdited) {
      setTitle(deriveDefaultTitle(newType, targetAccount, targetOpp, targetContact));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const callOutcome = getCallOutcome();
    const resolvedOutcome = type === "call" ? (callOutcome || "Call Recorded") : nonCallOutcome;

    logActivity({
      type,
      title: title.trim(),
      description: description.trim() || `Recorded ${type} with ${targetContact ? `${targetContact.firstName} ${targetContact.lastName}` : targetAccount?.name || "client"}.${resolvedOutcome ? ` Outcome: ${resolvedOutcome}.` : ""}`,
      accountId: targetAccount?.id,
      accountName: targetAccount?.name,
      opportunityId: targetOpp?.id,
      opportunityName: targetOpp?.name,
      contactId: targetContact?.id,
      contactName: targetContact ? `${targetContact.firstName} ${targetContact.lastName}` : undefined,
      performedBy: currentUser.name,
      authorId: currentUser.id,
      isImmutable: true,
      outcome: resolvedOutcome,
      nextAction: scheduleFollowUp ? `Follow-up required by ${followUpDate}` : undefined,
      nextActionDate: scheduleFollowUp ? followUpDate : undefined,
      metadata: {
        outcome: resolvedOutcome
      }
    });

    if (scheduleFollowUp && followUpDate) {
      addTask({
        title: `Follow-up: ${title.trim()}`,
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

  if (!quickLogModal || !quickLogModal.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-log-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <Phone className="w-4 h-4" />
            </div>
            <h3 id="quick-log-title" className="text-base font-bold text-body">
              Quick Log Activity
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

        {/* Simplified Completed Interaction Logger */}
        <form onSubmit={handleSubmit} className="space-y-4 text-meta">
          {/* Context: Account / Opportunity Bar */}
          <div className="p-2.5 bg-paper rounded-edge border border-line flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Building2 className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                <span className="font-bold text-body text-spec truncate">
                  {targetAccount?.name || "General Touchpoint"}
                </span>
                {targetOpp && (
                  <>
                    <span className="text-ink-faint">·</span>
                    <span className="text-spec text-ink-dim truncate font-medium">
                      {targetOpp.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAccountSelectors(!showAccountSelectors)}
              className="text-spec font-bold text-brand-deep hover:underline shrink-0 cursor-pointer"
            >
              {showAccountSelectors ? "Done" : "Change"}
            </button>
          </div>

          {/* Account & Opportunity Dropdowns (when Change clicked or global) */}
          {showAccountSelectors && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-raised rounded-edge border border-line animate-in fade-in duration-150">
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    const newAccId = e.target.value;
                    setSelectedAccountId(newAccId);
                    if (selectedOppId) {
                      const opp = crmOpportunities.find((d) => d.id === selectedOppId);
                      if (!opp || opp.accountId !== newAccId) {
                        setSelectedOppId("");
                      }
                    }
                  }}
                  aria-label="Select Customer Account"
                  className="w-full p-1.5 rounded-edge border border-line bg-surface text-spec focus:outline-none focus:border-brand-deep"
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
                  className="w-full p-1.5 rounded-edge border border-line bg-surface text-spec focus:outline-none focus:border-brand-deep"
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
          )}

          {/* 1. ACTIVITY TYPE (Compact Segmented Control) */}
          <div>
            <label className="block text-spec font-bold text-ink-dim uppercase mb-1.5">
              Activity Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-paper rounded-edge border border-line">
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
                    className={`py-1.5 px-2 rounded-edge font-bold text-spec transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSel
                        ? "bg-brand-deep text-white shadow-xs"
                        : "text-ink-dim hover:text-ink hover:bg-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. OUTCOME (Positioned directly above Notes) */}
          <div>
            <label className="block text-spec font-bold text-ink-dim uppercase mb-1.5">
              Outcome
            </label>
            {type === "call" ? (
              <div className="bg-paper p-3 rounded-edge border border-line space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={callContactMade}
                    onChange={handleToggleContactMade}
                    className="h-4 w-4 rounded border-line-strong text-brand-deep focus:ring-brand-deep cursor-pointer"
                  />
                  <span className="text-spec font-medium text-body">Contact Made</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={callNoAnswer}
                    onChange={handleToggleNoAnswer}
                    className="h-4 w-4 rounded border-line-strong text-brand-deep focus:ring-brand-deep cursor-pointer"
                  />
                  <span className="text-spec font-medium text-body">No Answer</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={callVoicemailLeft}
                    onChange={handleToggleVoicemailLeft}
                    className="h-4 w-4 rounded border-line-strong text-brand-deep focus:ring-brand-deep cursor-pointer"
                  />
                  <span className="text-spec font-medium text-body">Voicemail Left</span>
                </label>
              </div>
            ) : (
              <select
                value={nonCallOutcome}
                onChange={(e) => setNonCallOutcome(e.target.value)}
                aria-label="Select Activity Outcome"
                className="w-full p-2 rounded-edge border border-line bg-paper focus:bg-white text-meta font-medium focus:outline-none focus:border-brand-deep"
              >
                <option value="Connected / Positive">Connected / Positive Discussion</option>
                <option value="Sent Technical Package">Sent Technical Package / Proposal</option>
                <option value="Price Accepted">Price Accepted / Awaiting PO</option>
                <option value="Revision Requested">Revision Requested (Specs / Poles)</option>
                <option value="Lost to Competitor">Lost to Competitor</option>
                <option value="Completed">Completed</option>
              </select>
            )}
          </div>

          {/* 3. NOTES / CUSTOMER FEEDBACK */}
          <div>
            <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
              Notes / Customer Feedback
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did the customer say? Add any important details or next steps."
              rows={3}
              className="w-full p-2.5 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans"
            />
          </div>

          {/* Auto-derived title */}
          <input
            type="hidden"
            value={title}
          />

          {/* 4. FOLLOW-UP SECTION */}
          <div className="pt-1 border-t border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scheduleFollowUp}
                  onChange={(e) => setScheduleFollowUp(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong text-brand-deep focus:ring-brand-deep cursor-pointer"
                />
                <span className="font-bold text-spec text-body">
                  Schedule follow-up
                </span>
              </label>
            </div>

            {scheduleFollowUp && (
              <div className="pl-6 space-y-2 animate-in fade-in duration-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-spec font-medium text-ink-dim shrink-0">
                    Follow-up date:
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    aria-label="Follow-up due date"
                    className="p-1.5 text-spec rounded-edge border border-line bg-white focus:outline-none focus:border-brand-deep"
                  />

                  {/* Date convenience buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFollowUpDate(addDaysLocal(1))}
                      className="text-[11px] px-2 py-1 rounded bg-paper hover:bg-raised border border-line text-ink-dim hover:text-ink cursor-pointer font-medium transition-colors"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowUpDate(addDaysLocal(2))}
                      className="text-[11px] px-2 py-1 rounded bg-paper hover:bg-raised border border-line text-ink-dim hover:text-ink cursor-pointer font-medium transition-colors"
                    >
                      In 2 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowUpDate(addDaysLocal(7))}
                      className="text-[11px] px-2 py-1 rounded bg-paper hover:bg-raised border border-line text-ink-dim hover:text-ink cursor-pointer font-medium transition-colors"
                    >
                      In 1 week
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-line flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-ink-dim">
              <span>Author:</span>
              <strong className="text-body font-bold">{currentUser.name}</strong>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-paper border border-line text-ink-dim">
                {currentUser.role || "Sales Specialist"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeQuickLog}
                className="px-3.5 py-2 text-spec font-bold text-ink-dim hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-bold text-spec rounded-edge shadow-xs bg-brand-deep hover:bg-brand text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Log Activity</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
