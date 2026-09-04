import React, { useState, useMemo } from "react";
import {
  X,
  Phone,
  PhoneCall,
  Mail,
  Building2,
  Clock,
  Sparkles,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Lightbulb,
  FileText
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { generateCallPreparationBriefing } from "../../utils/crmCallPreparation";

export const CRMCallPrepModal: React.FC = () => {
  const {
    callPrepModal,
    closeCallPrep,
    openQuickLog,
    accounts,
    crmOpportunities,
    contacts,
    activities,
    knowledge,
    tasks,
    showToast
  } = useApp();

  const [callNotes, setCallNotes] = useState("");
  const [copied, setCopied] = useState(false);

  // Resolve target account, deal, contact
  const targetAccount = useMemo(() => {
    if (!callPrepModal?.accountId) return accounts[0] || null;
    return accounts.find((a) => a.id === callPrepModal.accountId) || null;
  }, [accounts, callPrepModal?.accountId]);

  const targetOpp = useMemo(() => {
    if (!callPrepModal?.opportunityId) {
      if (!targetAccount) return null;
      return crmOpportunities.find((d) => d.accountId === targetAccount.id) || null;
    }
    return crmOpportunities.find((d) => d.id === callPrepModal.opportunityId) || null;
  }, [crmOpportunities, callPrepModal?.opportunityId, targetAccount]);

  const targetContact = useMemo(() => {
    if (callPrepModal?.contactId) {
      return contacts.find((c) => c.id === callPrepModal.contactId) || null;
    }
    if (targetOpp?.primaryContactId) {
      const byId = contacts.find((c) => c.id === targetOpp.primaryContactId);
      if (byId) return byId;
    }
    if (targetOpp?.primaryContactName) {
      const matched = contacts.find(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase() ===
          targetOpp.primaryContactName?.toLowerCase()
      );
      if (matched) return matched;
    }
    if (targetAccount) {
      return contacts.find((c) => c.accountId === targetAccount.id && !c.isArchived) || null;
    }
    return null;
  }, [contacts, callPrepModal?.contactId, targetOpp, targetAccount]);

  // Generate dynamic, grounded natural language briefing
  const briefing = useMemo(() => {
    return generateCallPreparationBriefing({
      account: targetAccount,
      contact: targetContact,
      opportunity: targetOpp,
      activities,
      knowledge,
      tasks
    });
  }, [targetAccount, targetContact, targetOpp, activities, knowledge, tasks]);

  if (!callPrepModal || !callPrepModal.isOpen) return null;

  const handleStartCallAndLog = () => {
    closeCallPrep();
    openQuickLog({
      type: "call",
      accountId: targetAccount?.id,
      opportunityId: targetOpp?.id,
      contactId: targetContact?.id,
      prefillNotes: callNotes.trim() || undefined
    });
    setCallNotes("");
  };

  const handleCopyBriefing = () => {
    const fullText = `=== CALL PREPARATION BRIEFING ===\nContact: ${briefing.contactName} (${briefing.contactRole || "Key Contact"})\nAccount: ${briefing.accountName}\n\n${briefing.executiveBriefing}\n\nTALKING POINTS:\n${briefing.talkingPoints.map((tp) => `• [${tp.category}] ${tp.text}`).join("\n")}\n\n${callNotes ? `Private Notes:\n${callNotes}` : ""}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      showToast("Call briefing copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-prep-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 id="call-prep-title" className="text-base font-bold text-body">
                Call Briefing: {briefing.contactName}
              </h3>
              <p className="text-spec text-ink-dim">
                {briefing.accountName} {briefing.contactRole ? `· ${briefing.contactRole}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyBriefing}
              className="p-1.5 text-ink-dim hover:text-body rounded hover:bg-line cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Copy briefing to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={closeCallPrep}
              aria-label="Close call briefing"
              className="text-ink-faint hover:text-ink-dim p-1 rounded-edge cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. EXECUTIVE NATURAL-LANGUAGE BRIEFING */}
        <div className="p-4 bg-brand-wash/40 border border-brand-edge/60 rounded-edge space-y-2 text-spec">
          <div className="flex items-center gap-1.5 font-bold text-brand-deep uppercase text-xs tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Colleague Briefing</span>
          </div>
          <div className="text-body leading-relaxed space-y-2 whitespace-pre-line font-medium text-spec">
            {briefing.executiveBriefing}
          </div>
        </div>

        {/* 2. RECOMMENDED CALL OBJECTIVES & ACTIONABLE TALKING POINTS */}
        <div className="p-3.5 bg-paper border border-line rounded-edge space-y-2">
          <div className="text-xs font-bold uppercase text-ink-dim tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-brand-deep" />
            <span>Recommended Call Objectives &amp; Talking Points</span>
          </div>
          {briefing.talkingPoints.length > 0 && (
            <div className="space-y-2 pt-0.5">
              {briefing.talkingPoints.map((tp, idx) => (
                <div key={idx} className="flex items-start gap-2 text-spec">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 mt-0.5 ${
                      tp.category === "Commercial"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : tp.category === "Commitment"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : tp.category === "Technical"
                        ? "bg-sky-100 text-sky-900 border border-sky-300"
                        : tp.category === "Question"
                        ? "bg-purple-100 text-purple-900 border border-purple-300"
                        : "bg-slate-100 text-slate-800 border border-slate-300"
                    }`}
                  >
                    {tp.category}
                  </span>
                  <span className="text-body leading-normal text-spec font-medium">
                    {tp.text}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-2 border-t border-line/60">
            <span className="text-[11px] font-bold uppercase text-ink-dim block mb-1">Standard Lighting Specification Verification</span>
            <ul className="list-disc pl-4 space-y-1 text-spec text-body">
              <li>Verify required AS/NZS 1158 Category (e.g. P4 pathway vs V3 roadway).</li>
              <li>Confirm site soil conditions or rag-bolt vs in-ground footing preference.</li>
              <li>Check battery autonomy expectation (standard 4–5 nights vs shaded location).</li>
              <li>Confirm decision-making timeline and council tender committee dates.</li>
            </ul>
          </div>
        </div>

        {/* 3. RELEVANT CRM KNOWLEDGE BASE ITEMS */}
        {briefing.relevantKnowledge.length > 0 && (
          <div className="p-3 bg-white border border-line rounded-edge space-y-2 text-spec">
            <div className="text-xs font-bold uppercase text-ink-dim tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-deep" />
              <span>Accumulated CRM Knowledge ({briefing.relevantKnowledge.length})</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {briefing.relevantKnowledge.map((k) => (
                <div key={k.id} className="p-2 bg-paper rounded border border-line text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-body">{k.category}</span>
                    <span className="text-[10px] text-ink-dim">Confirmed: {k.lastConfirmedAt}</span>
                  </div>
                  <p className="text-body font-medium">{k.statement}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. PRIMARY CONTACT CONTACT DETAILS & CONTEXT */}
        {targetContact && (
          <div className="p-3 bg-paper border border-line rounded-edge space-y-2 text-spec">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-ink-dim">Contact Details</span>
              {targetContact.preferredContactMethod && (
                <span className="text-[11px] font-semibold text-brand-deep">
                  Prefers: {targetContact.preferredContactMethod}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-spec text-ink-dim flex-wrap">
              {targetContact.mobile && (
                <a
                  href={`tel:${targetContact.mobile}`}
                  className="flex items-center gap-1 text-brand-deep font-semibold hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{targetContact.mobile}</span>
                </a>
              )}
              {targetContact.email && (
                <a
                  href={`mailto:${targetContact.email}`}
                  className="flex items-center gap-1 text-ink-dim hover:text-body"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{targetContact.email}</span>
                </a>
              )}
            </div>

            {/* Employment / Account History if moved */}
            {targetContact.accountHistory && targetContact.accountHistory.length > 0 && (
              <div className="pt-1.5 border-t border-line text-xs space-y-1">
                <span className="font-bold text-ink-dim uppercase block">Account History</span>
                {targetContact.accountHistory.map((hist) => (
                  <div key={hist.id} className="text-body flex items-center justify-between text-xs">
                    <span>
                      Previously at <strong>{hist.accountName}</strong> ({hist.role || "Contact"})
                    </span>
                    <span className="text-ink-dim text-[11px]">{hist.endDate}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Things to remember */}
            {(targetContact.thingsToRemember || targetContact.notes) && (
              <div className="pt-1.5 border-t border-line text-xs">
                <span className="font-bold text-brand-deep uppercase block mb-0.5">Things to Remember</span>
                <p className="text-body whitespace-pre-line leading-relaxed">
                  {targetContact.thingsToRemember || targetContact.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Private Call Scratchpad */}
        <div>
          <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
            Private Call Notes
          </label>
          <textarea
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Jot down quick thoughts before dialling (carried into activity log)..."
            rows={2}
            className="w-full p-2.5 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-line">
          <button
            type="button"
            onClick={closeCallPrep}
            className="px-3.5 py-2 text-spec font-bold text-ink-dim hover:text-ink cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleStartCallAndLog}
            className="px-4 py-2 bg-brand-deep hover:bg-brand text-white text-spec font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Log Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
