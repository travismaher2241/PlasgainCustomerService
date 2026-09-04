import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Building2,
  Plus,
  User,
  AlertTriangle,
  ExternalLink,
  Check
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useDialogDismiss } from "../../utils/useDialogDismiss";
import { ActivityType, Account, CRMContact, CRMOpportunity, ActivityParticipant, ContactNotableEvent } from "../../types/crm";
import { addDaysLocal } from "../../utils/dateUtils";
import { detectDuplicateContact, DuplicateMatchResult } from "../../utils/duplicateDetector";

export const OUTCOMES_BY_TYPE: Record<"call" | "email" | "meeting", string[]> = {
  call: ["Contact Made", "No Answer", "Voicemail Left"],
  email: ["Email Sent", "Email Received"],
  meeting: ["Meeting Held", "Cancelled", "No Show"]
};

export const CRMQuickLogModal: React.FC = () => {
  const {
    quickLogModal,
    closeQuickLog,
    accounts,
    crmOpportunities,
    contacts,
    logActivity,
    addTask,
    addContact,
    moveContact,
    confirmCandidateNotableEvent,
    dismissCandidateNotableEvent,
    currentUser
  } = useApp();

  useDialogDismiss(Boolean(quickLogModal?.isOpen), closeQuickLog);

  const [type, setType] = useState<ActivityType>("call");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedOppId, setSelectedOppId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showAccountSelectors, setShowAccountSelectors] = useState(false);
  const [title, setTitle] = useState("");
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [outcomeError, setOutcomeError] = useState(false);
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => addDaysLocal(3));

  // Inline Contact Creation State
  const [isInlineContactOpen, setIsInlineContactOpen] = useState(false);
  const [inlineFirstName, setInlineFirstName] = useState("");
  const [inlineLastName, setInlineLastName] = useState("");
  const [inlineJobTitle, setInlineJobTitle] = useState("");
  const [inlineEmail, setInlineEmail] = useState("");
  const [inlinePhone, setInlinePhone] = useState("");
  const [inlineFormError, setInlineFormError] = useState("");
  const [inlineDuplicateMatch, setInlineDuplicateMatch] = useState<DuplicateMatchResult<CRMContact> | null>(null);

  // Staged Notable Event to confirm after logging
  const [stagedNotableEvent, setStagedNotableEvent] = useState<ContactNotableEvent | null>(null);

  const handleSelectOutcome = (opt: string) => {
    setSelectedOutcome((prev) => (prev === opt ? "" : opt));
    setOutcomeError(false);
  };

  // Resolved CRM records
  const targetAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const targetOpp = useMemo(() => {
    return crmOpportunities.find((d) => d.id === selectedOppId);
  }, [crmOpportunities, selectedOppId]);

  // Active contacts belonging to selected Account
  const accountContacts = useMemo(() => {
    if (!selectedAccountId) return [];
    return contacts.filter((c) => c.accountId === selectedAccountId && !c.isArchived);
  }, [contacts, selectedAccountId]);

  const primaryContact = useMemo(() => {
    if (selectedContactIds.length > 0) {
      return contacts.find((c) => c.id === selectedContactIds[0]) || null;
    }
    return null;
  }, [contacts, selectedContactIds]);

  const deriveDefaultTitle = (
    actType: ActivityType,
    acc?: Account,
    opp?: CRMOpportunity,
    cont?: CRMContact | null
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
        return `Contact with ${name}`;
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
      setSelectedContactIds(contId ? [contId] : []);
      setShowAccountSelectors(!quickLogModal.accountId);
      setIsTitleManuallyEdited(false);
      setDescription(quickLogModal.prefillNotes || "");
      setSelectedOutcome("");
      setOutcomeError(false);
      setScheduleFollowUp(false);
      setFollowUpDate(addDaysLocal(3));
      setIsInlineContactOpen(false);
      setStagedNotableEvent(null);
      setInlineDuplicateMatch(null);

      const acc = accounts.find((a) => a.id === accId);
      const opp = crmOpportunities.find((d) => d.id === oppId);
      const cont = contacts.find((c) => c.id === contId);
      setTitle(deriveDefaultTitle(initialType, acc, opp, cont));
    }
  }, [quickLogModal?.isOpen, quickLogModal?.accountId, quickLogModal?.opportunityId, quickLogModal?.contactId, quickLogModal?.type, quickLogModal?.prefillNotes]);

  // Reactive title derivation as async data or account/deal selection resolves
  useEffect(() => {
    if (quickLogModal?.isOpen && !isTitleManuallyEdited) {
      const newTitle = deriveDefaultTitle(type, targetAccount, targetOpp, primaryContact);
      setTitle(newTitle);
    }
  }, [type, targetAccount, targetOpp, primaryContact, isTitleManuallyEdited, quickLogModal?.isOpen]);

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    setSelectedOutcome("");
    setOutcomeError(false);
    if (!isTitleManuallyEdited) {
      setTitle(deriveDefaultTitle(newType, targetAccount, targetOpp, primaryContact));
    }
  };

  const handleToggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => {
      if (prev.includes(contactId)) {
        return prev.filter((id) => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // Inline Contact Creation Handler
  const handleSaveInlineContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineFirstName.trim() || !inlineLastName.trim() || !inlineEmail.trim()) {
      setInlineFormError("First name, last name, and email are required.");
      return;
    }
    setInlineFormError("");

    // Check duplicate
    const candidateName = `${inlineFirstName} ${inlineLastName}`.trim();
    const duplicate = detectDuplicateContact(
      {
        name: candidateName,
        email: inlineEmail.trim(),
        phone: inlinePhone.trim() || undefined,
        accountId: selectedAccountId
      },
      contacts
    );

    if (duplicate && !inlineDuplicateMatch) {
      setInlineDuplicateMatch(duplicate);
      return;
    }

    const newContactId = `con-${Date.now()}`;
    const newContact: CRMContact = {
      id: newContactId,
      accountId: selectedAccountId,
      accountName: targetAccount?.name || "Account",
      firstName: inlineFirstName.trim(),
      lastName: inlineLastName.trim(),
      jobTitle: inlineJobTitle.trim() || "Contact",
      email: inlineEmail.trim(),
      mobile: inlinePhone.trim() || undefined,
      phone: inlinePhone.trim() || undefined,
      preferredContactMethod: "Email",
      contactOwner: currentUser.name
    };

    addContact(newContact);
    // Immediately return to Log Activity and automatically select the new contact
    setSelectedContactIds((prev) => [...prev, newContactId]);
    setIsInlineContactOpen(false);
    setInlineFirstName("");
    setInlineLastName("");
    setInlineJobTitle("");
    setInlineEmail("");
    setInlinePhone("");
    setInlineDuplicateMatch(null);
  };

  const handleMoveExistingMatchedContact = (matched: CRMContact) => {
    moveContact(matched.id, selectedAccountId, `Moved during activity logging for ${targetAccount?.name}`);
    setSelectedContactIds((prev) => [...prev, matched.id]);
    setIsInlineContactOpen(false);
    setInlineFirstName("");
    setInlineLastName("");
    setInlineJobTitle("");
    setInlineEmail("");
    setInlinePhone("");
    setInlineDuplicateMatch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type !== "note" && !selectedOutcome) {
      setOutcomeError(true);
      return;
    }
    setOutcomeError(false);

    const resolvedOutcome = type === "note" ? undefined : selectedOutcome;

    const chosenContacts = contacts.filter((c) => selectedContactIds.includes(c.id));
    const primary = chosenContacts[0] || null;

    const participants: ActivityParticipant[] = chosenContacts.map((c) => ({
      contactId: c.id,
      contactName: `${c.firstName} ${c.lastName}`.trim(),
      jobTitle: c.jobTitle || c.role,
      accountName: targetAccount?.name || c.accountName,
      email: c.email,
      role: type === "call" ? "caller" : type === "meeting" ? "attendee" : type === "email" ? "recipient" : "participant"
    }));

    const result = logActivity({
      type,
      title: title.trim(),
      description: description.trim() || `Recorded ${type} with ${chosenContacts.length > 0 ? chosenContacts.map(c => `${c.firstName} ${c.lastName}`).join(", ") : targetAccount?.name || "client"}.${resolvedOutcome ? ` Outcome: ${resolvedOutcome}.` : ""}`,
      accountId: targetAccount?.id,
      accountName: targetAccount?.name,
      opportunityId: targetOpp?.id,
      opportunityName: targetOpp?.name,
      contactId: primary?.id,
      contactName: primary ? `${primary.firstName} ${primary.lastName}`.trim() : undefined,
      contactIds: selectedContactIds,
      participants,
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

    // Check if AI analysis identified candidate notable events that need user confirmation
    if (result && result.candidateNotableEvents && result.candidateNotableEvents.length > 0) {
      setStagedNotableEvent(result.candidateNotableEvents[0]);
    } else {
      closeQuickLog();
    }
  };

  const handleConfirmNotableEvent = () => {
    if (stagedNotableEvent && stagedNotableEvent.contactId) {
      confirmCandidateNotableEvent(stagedNotableEvent.contactId, stagedNotableEvent.id);
    }
    setStagedNotableEvent(null);
    closeQuickLog();
  };

  const handleDismissNotableEvent = () => {
    if (stagedNotableEvent && stagedNotableEvent.contactId) {
      dismissCandidateNotableEvent(stagedNotableEvent.contactId, stagedNotableEvent.id);
    }
    setStagedNotableEvent(null);
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

        {/* POST-LOGGING NOTABLE EVENT CONFIRMATION DIALOG */}
        {stagedNotableEvent ? (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-edge space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-950 text-sm">Potential Notable Event Identified</h4>
                <p className="text-xs text-amber-800">
                  AI extracted this business event from your notes. Would you like to save this against{" "}
                  <strong>{stagedNotableEvent.contactName || "the contact"}</strong>?
                </p>
                <div className="p-2.5 bg-white/90 rounded border border-amber-200 text-xs font-semibold text-amber-900 mt-1">
                  "{stagedNotableEvent.title}"
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
              <button
                type="button"
                onClick={handleDismissNotableEvent}
                className="px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 rounded cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmNotableEvent}
                className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Add to {stagedNotableEvent.contactName || "Contact"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Simplified Completed Interaction Logger */
          <form onSubmit={handleSubmit} className="space-y-4 text-meta">
            {/* Context: Account / Opportunity Bar */}
            <div className="p-2.5 bg-paper rounded-edge border border-line flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Building2 className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                  <span className="font-bold text-body text-spec truncate">
                    {targetAccount?.name || "No customer selected"}
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
                      setSelectedContactIds([]);
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
                    <option value="">Choose a customer…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.territory})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                    Quote
                  </label>
                  <select
                    value={selectedOppId}
                    onChange={(e) => setSelectedOppId(e.target.value)}
                    aria-label="Select Linked Deal"
                    className="w-full p-1.5 rounded-edge border border-line bg-surface text-spec focus:outline-none focus:border-brand-deep"
                  >
                    <option value="">No specific quote</option>
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

            {/* OUTCOME (Single-select checkbox options directly under Activity Type) */}
            {type !== "note" && (
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1.5">
                  Outcome
                </label>
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  {(OUTCOMES_BY_TYPE[type as "call" | "email" | "meeting"] || []).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 cursor-pointer select-none text-spec font-medium text-body hover:text-ink transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOutcome === opt}
                        onChange={() => handleSelectOutcome(opt)}
                        className="h-4 w-4 rounded border-line-strong text-brand-deep focus:ring-brand-deep cursor-pointer"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {outcomeError && (
                  <p className="text-xs text-urgent font-medium mt-1">
                    Please select an outcome
                  </p>
                )}
              </div>
            )}

            {/* 2. CONTACT PARTICIPANT SELECTION (Dynamic per Activity Type) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-spec font-bold text-ink-dim uppercase">
                  {type === "call" && "WHO WAS ON THE CALL?"}
                  {type === "meeting" && "WHO WAS AT THE MEETING?"}
                  {type === "email" && "EMAIL TO"}
                  {type === "note" && "RELATES TO SPECIFIC CONTACTS (OPTIONAL)"}
                </label>

                {accountContacts.length > 0 && !isInlineContactOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setInlineFormError("");
                      setInlineDuplicateMatch(null);
                      setIsInlineContactOpen(true);
                    }}
                    className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ New Contact</span>
                  </button>
                )}
              </div>

              {/* Checkbox list or empty state */}
              {accountContacts.length === 0 && !isInlineContactOpen ? (
                <div className="p-3 bg-paper rounded-edge border border-line text-center space-y-2">
                  <p className="text-spec text-ink-dim font-medium">
                    No contacts recorded for this customer yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineFormError("");
                      setInlineDuplicateMatch(null);
                      setIsInlineContactOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-spec font-bold text-brand-deep bg-white hover:bg-brand-wash rounded-edge border border-brand-edge transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Contact</span>
                  </button>
                </div>
              ) : (
                <div className="bg-paper p-2.5 rounded-edge border border-line space-y-1.5 max-h-40 overflow-y-auto">
                  {accountContacts.map((c) => {
                    const isChecked = selectedContactIds.includes(c.id);
                    const fullName = `${c.firstName} ${c.lastName}`.trim();
                    const detail = type === "email"
                      ? c.email || "No email"
                      : c.jobTitle || c.role || "Contact";

                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded cursor-pointer select-none transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleContactSelection(c.id)}
                          className="h-4 w-4 rounded border-line-strong text-brand-deep focus:ring-brand-deep cursor-pointer shrink-0"
                        />
                        <div className="text-spec min-w-0 flex-1 flex items-center justify-between gap-2">
                          <span className="font-bold text-body truncate">{fullName}</span>
                          <span className="text-ink-dim text-xs truncate shrink-0">{detail}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* INLINE NEW CONTACT CREATION EMBEDDED FORM */}
              {isInlineContactOpen && (
                <div className="p-3.5 bg-brand-wash/30 border border-brand-edge/60 rounded-edge space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-brand-edge/40 pb-1.5">
                    <div className="flex items-center gap-1.5 text-brand-deep font-bold text-spec">
                      <User className="w-3.5 h-3.5" />
                      <span>New Contact for {targetAccount?.name || "Account"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsInlineContactOpen(false)}
                      className="text-ink-dim hover:text-ink p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {inlineFormError && (
                    <p className="text-xs text-urgent font-medium">{inlineFormError}</p>
                  )}

                  {/* DUPLICATE WARNING OVERLAY */}
                  {inlineDuplicateMatch ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-900">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                        <div>
                          <strong>Possible existing Contact found:</strong>
                          <p className="mt-0.5 text-amber-800">{inlineDuplicateMatch.matchReason}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleMoveExistingMatchedContact(inlineDuplicateMatch.existingRecord)}
                          className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded cursor-pointer"
                        >
                          Move This Contact to {targetAccount?.name || "Account"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineDuplicateMatch(null);
                            // Bypass duplicate guard and create new anyway
                            const newContactId = `con-${Date.now()}`;
                            const newContact: CRMContact = {
                              id: newContactId,
                              accountId: selectedAccountId,
                              accountName: targetAccount?.name || "Account",
                              firstName: inlineFirstName.trim(),
                              lastName: inlineLastName.trim(),
                              jobTitle: inlineJobTitle.trim() || "Contact",
                              email: inlineEmail.trim(),
                              mobile: inlinePhone.trim() || undefined,
                              phone: inlinePhone.trim() || undefined,
                              preferredContactMethod: "Email",
                              contactOwner: currentUser.name
                            };
                            addContact(newContact);
                            setSelectedContactIds((prev) => [...prev, newContactId]);
                            setIsInlineContactOpen(false);
                            setInlineFirstName("");
                            setInlineLastName("");
                            setInlineJobTitle("");
                            setInlineEmail("");
                            setInlinePhone("");
                          }}
                          className="px-2.5 py-1 text-ink-dim hover:text-body border border-line bg-white rounded cursor-pointer"
                        >
                          Create New Anyway
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-spec">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-dim uppercase mb-0.5">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={inlineFirstName}
                            onChange={(e) => setInlineFirstName(e.target.value)}
                            placeholder="e.g. Sarah"
                            className="w-full p-1.5 text-spec rounded border border-line bg-white focus:outline-none focus:border-brand-deep"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-dim uppercase mb-0.5">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={inlineLastName}
                            onChange={(e) => setInlineLastName(e.target.value)}
                            placeholder="e.g. Jenkins"
                            className="w-full p-1.5 text-spec rounded border border-line bg-white focus:outline-none focus:border-brand-deep"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-dim uppercase mb-0.5">
                            Role / Job Title
                          </label>
                          <input
                            type="text"
                            value={inlineJobTitle}
                            onChange={(e) => setInlineJobTitle(e.target.value)}
                            placeholder="e.g. Project Manager"
                            className="w-full p-1.5 text-spec rounded border border-line bg-white focus:outline-none focus:border-brand-deep"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-dim uppercase mb-0.5">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={inlineEmail}
                            onChange={(e) => setInlineEmail(e.target.value)}
                            placeholder="e.g. sarah@company.com.au"
                            className="w-full p-1.5 text-spec rounded border border-line bg-white focus:outline-none focus:border-brand-deep"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-ink-dim uppercase mb-0.5">
                          Phone / Mobile
                        </label>
                        <input
                          type="tel"
                          value={inlinePhone}
                          onChange={(e) => setInlinePhone(e.target.value)}
                          placeholder="e.g. 0412 345 678"
                          className="w-full p-1.5 text-spec rounded border border-line bg-white focus:outline-none focus:border-brand-deep"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsInlineContactOpen(false)}
                          className="px-2.5 py-1 text-xs text-ink-dim hover:text-body rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveInlineContact}
                          className="px-3.5 py-1 bg-brand-deep hover:bg-brand text-white font-bold text-xs rounded shadow-xs cursor-pointer"
                        >
                          Save &amp; Select Contact
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                placeholder="What did the customer say? Note any technical preferences, milestones, or commitments..."
                rows={3}
                className="w-full p-2.5 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans"
              />
            </div>

            {/* Auto-derived title */}
            <input
              type="hidden"
              value={title}
            />

            {/* 5. FOLLOW-UP SECTION */}
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
        )}
      </div>
    </div>
  );
};
