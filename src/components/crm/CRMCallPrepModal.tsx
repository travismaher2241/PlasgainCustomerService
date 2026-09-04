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
  FileText,
  Package
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
  const [meetingOffsetMonths, setMeetingOffsetMonths] = useState<number>(0);

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

  // Calculate target date for preparation horizon (e.g. today vs in 1 month vs in 2 months)
  const targetDate = useMemo(() => {
    const d = new Date();
    if (meetingOffsetMonths > 0) {
      d.setMonth(d.getMonth() + meetingOffsetMonths);
    }
    return d.toISOString().split("T")[0];
  }, [meetingOffsetMonths]);

  // Generate dynamic, grounded natural language briefing
  const briefing = useMemo(() => {
    return generateCallPreparationBriefing({
      account: targetAccount,
      contact: targetContact,
      opportunity: targetOpp,
      activities,
      knowledge,
      tasks,
      targetDate
    });
  }, [targetAccount, targetContact, targetOpp, activities, knowledge, tasks, targetDate]);

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
    const fullText = `=== CALL PREPARATION BRIEFING ===\nContact: ${briefing.contactName} (${briefing.contactRole || "Key Contact"})\nAccount: ${briefing.accountName}\nHorizon: ${meetingOffsetMonths === 0 ? "Today" : `In ${meetingOffsetMonths} months`}\n\n${briefing.executiveBriefing}\n\nTALKING POINTS:\n${briefing.talkingPoints.map((tp) => `• [${tp.category}] ${tp.text}`).join("\n")}\n\n${callNotes ? `Private Notes:\n${callNotes}` : ""}`;
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

        {/* Preparation Timing Horizon Selector */}
        <div className="flex items-center justify-between bg-paper p-2.5 rounded-edge border border-line text-xs">
          <div className="flex items-center gap-1.5 font-bold text-ink-dim uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-brand-deep" />
            <span>Preparation Horizon:</span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { label: "Today", offset: 0 },
              { label: "In 1 Month", offset: 1 },
              { label: "In 2 Months", offset: 2 },
              { label: "In 3 Months", offset: 3 }
            ].map((tab) => (
              <button
                key={tab.offset}
                type="button"
                onClick={() => setMeetingOffsetMonths(tab.offset)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  meetingOffsetMonths === tab.offset
                    ? "bg-brand-deep text-white shadow-xs"
                    : "bg-white text-ink-dim hover:text-body border border-line hover:border-ink-dim/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
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

        {/* Product Supply & Replenishment Tracker Card (if detected) */}
        {briefing.supplyCycles.length > 0 && (
          <div className="p-3.5 bg-paper border border-line rounded-edge space-y-2.5 text-spec">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase text-brand-deep tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand-deep" />
                <span>Product Supply &amp; Replenishment Tracker</span>
              </div>
              <span className="text-[11px] text-ink-dim font-medium">
                {meetingOffsetMonths === 0 ? "Status: Today" : `Status: In ${meetingOffsetMonths} Months`}
              </span>
            </div>

            <div className="space-y-2">
              {briefing.supplyCycles.map((sc, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border text-xs space-y-1.5 ${
                    sc.reorderUrgency === "Critical" || sc.monthsRemaining <= 1
                      ? "bg-amber-50/90 border-amber-300 text-amber-950"
                      : "bg-white border-line text-body"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      <span>{sc.product}</span>
                      {sc.quantity && (
                        <span className="font-normal text-ink-dim text-xs">({sc.quantity} units)</span>
                      )}
                      {sc.destination && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-semibold">
                          {sc.destination}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        sc.monthsRemaining <= 1
                          ? "bg-amber-200 text-amber-900 border border-amber-400"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      {sc.monthsRemaining <= 1
                        ? "⚠️ 1 Month Out (Re-order Window)"
                        : `~${sc.monthsRemaining} Months Stock Remaining`}
                    </span>
                  </div>
                  <p className="font-medium text-xs leading-relaxed">
                    {sc.statusText}
                  </p>
                  <div className="text-[11px] text-ink-dim flex items-center gap-3 pt-1 border-t border-line/40">
                    <span>Ordered: {sc.orderDate} (~{sc.durationRaw} supply)</span>
                    <span>•</span>
                    <span>Projected Run-Out: {sc.runOutDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                        : tp.category === "Context"
                        ? "bg-blue-100 text-blue-900 border border-blue-300"
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
