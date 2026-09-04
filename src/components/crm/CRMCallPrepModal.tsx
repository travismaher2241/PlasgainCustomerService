import React, { useState, useMemo } from "react";
import {
  X,
  Phone,
  PhoneCall,
  Mail,
  Building2,
  HelpCircle,
  Clock,
  ExternalLink,
  Sparkles,
  FileText
} from "lucide-react";
import { useApp } from "../../context/AppContext";

export const CRMCallPrepModal: React.FC = () => {
  const {
    callPrepModal,
    closeCallPrep,
    openQuickLog,
    accounts,
    crmOpportunities,
    contacts,
    activities
  } = useApp();

  const [callNotes, setCallNotes] = useState("");

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
    if (targetOpp?.primaryContactName) {
      const matched = contacts.find(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase() ===
          targetOpp.primaryContactName?.toLowerCase()
      );
      if (matched) return matched;
    }
    if (targetAccount) {
      return contacts.find((c) => c.accountId === targetAccount.id) || null;
    }
    return null;
  }, [contacts, callPrepModal?.contactId, targetOpp, targetAccount]);

  // Recent interaction history
  const recentActivities = useMemo(() => {
    if (!targetAccount && !targetOpp) return [];
    return activities
      .filter((a) => (targetAccount && a.accountId === targetAccount.id) || (targetOpp && a.opportunityId === targetOpp.id))
      .slice(0, 3);
  }, [activities, targetAccount, targetOpp]);

  if (!callPrepModal || !callPrepModal.isOpen) return null;

  const handleStartCallAndLog = () => {
    closeCallPrep();
    // Carry the call plan through. This textarea used to be write-only state:
    // whatever the rep planned was discarded the moment the log opened.
    openQuickLog({
      type: "call",
      accountId: targetAccount?.id,
      opportunityId: targetOpp?.id,
      contactId: targetContact?.id,
      prefillNotes: callNotes.trim() || undefined
    });
    setCallNotes("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-prep-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-wash text-brand-deep rounded-edge">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 id="call-prep-title" className="text-base font-bold text-body">
                Call Briefing
              </h3>
              <p className="text-spec text-ink-dim">
                Customer context, project status &amp; talking points
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCallPrep}
            aria-label="Close call briefing"
            className="text-ink-faint hover:text-ink-dim p-1 rounded-edge cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account & Opportunity Snapshot */}
        <div className="p-3.5 bg-brand-wash/40 border border-brand-edge rounded-edge space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="font-bold text-body text-meta flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-brand-deep shrink-0" />
              {targetAccount?.name || "General Touchpoint"}
            </span>
            {(targetAccount?.accountType || targetAccount?.customerSegment) && (
              <span className="text-spec font-semibold px-2 py-0.5 rounded bg-white border border-brand-edge text-brand-deep">
                {targetAccount.accountType || targetAccount.customerSegment} · {targetAccount.territory || "AU"}
              </span>
            )}
          </div>

          {targetOpp ? (
            <div className="text-spec text-ink-dim border-t border-brand-edge/30 pt-2 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Active Deal:</strong> {targetOpp.name}
                </div>
                <span className="font-bold text-body text-brand-deep">
                  ${(targetOpp.dealValue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-spec">
                <span>
                  <strong>Stage:</strong> {targetOpp.stageName}
                </span>
                <span>
                  <strong>Probability:</strong> {targetOpp.probability}%
                </span>
              </div>
              {targetOpp.quoteNumber && (
                <div>
                  <strong>Quote Ref:</strong> {targetOpp.quoteNumber}
                  {targetOpp.quoteExpiryDate && ` (Valid to: ${targetOpp.quoteExpiryDate})`}
                </div>
              )}
            </div>
          ) : (
            <p className="text-spec text-ink-dim italic">
              No active pipeline deal linked. General relationship touchpoint.
            </p>
          )}
        </div>

        {/* Primary Contact Details */}
        {targetContact ? (
          <div className="p-3 bg-paper border border-line rounded-edge space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-spec font-bold uppercase text-ink-dim">Primary Contact</div>
              {targetContact.preferredName && (
                <span className="text-xs font-semibold text-brand-deep bg-brand-wash px-2 py-0.5 rounded border border-brand-edge/40">
                  Goes by "{targetContact.preferredName}"
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-body text-meta">
                {targetContact.firstName} {targetContact.lastName}
                {targetContact.jobTitle ? ` (${targetContact.jobTitle})` : ""}
              </span>
            </div>
            <div className="flex items-center gap-4 text-spec text-ink-dim flex-wrap pt-0.5">
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

            {/* Personal Context */}
            {(targetContact.hobbies || targetContact.partnerName || (targetContact.childrenNames && targetContact.childrenNames.length > 0) || targetContact.birthday) && (
              <div className="pt-2 border-t border-line/60 space-y-1 text-xs">
                <span className="font-bold text-ink-dim uppercase block">Personal Context</span>
                <div className="flex flex-wrap gap-2 text-body">
                  {targetContact.hobbies && (
                    <span className="bg-white px-2 py-0.5 rounded border border-line">
                      🎯 {targetContact.hobbies}
                    </span>
                  )}
                  {targetContact.partnerName && (
                    <span className="bg-white px-2 py-0.5 rounded border border-line">
                      Partner: {targetContact.partnerName}
                    </span>
                  )}
                  {targetContact.childrenNames && targetContact.childrenNames.length > 0 && (
                    <span className="bg-white px-2 py-0.5 rounded border border-line">
                      Children: {targetContact.childrenNames.join(", ")}
                    </span>
                  )}
                  {targetContact.birthday && (
                    <span className="bg-white px-2 py-0.5 rounded border border-line">
                      🎂 Birthday: {targetContact.birthday}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Things to Remember */}
            {(targetContact.thingsToRemember || targetContact.notes) && (
              <div className="pt-2 border-t border-line/60 space-y-0.5">
                <span className="text-xs font-bold text-brand-deep uppercase block">Things to Remember</span>
                <p className="text-xs text-body bg-brand-wash/40 p-2 rounded border border-brand-edge/30 leading-relaxed whitespace-pre-wrap">
                  {targetContact.thingsToRemember || targetContact.notes}
                </p>
              </div>
            )}

            {/* Notable Events / Conversation Opportunity */}
            {targetContact.notableEvents && targetContact.notableEvents.length > 0 && (
              <div className="pt-2 border-t border-line/60 space-y-1.5">
                <span className="text-xs font-bold text-amber-900 uppercase block">Conversation Opportunity / Notable Events</span>
                <div className="space-y-1">
                  {targetContact.notableEvents.map((ev) => (
                    <div key={ev.id} className="p-2 bg-amber-50/80 border border-amber-200/80 rounded text-xs space-y-0.5">
                      <p className="font-bold text-amber-950">{ev.title}</p>
                      <div className="flex items-center gap-3 text-amber-800 text-[11px]">
                        {ev.eventDate && <span>Event: {ev.eventDate}</span>}
                        {ev.followUpDate && <span className="font-semibold">Follow-up: {ev.followUpDate}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Recent Touchpoints */}
        {recentActivities.length > 0 && (
          <div className="p-3 bg-paper border border-line rounded-edge space-y-1.5">
            <div className="text-spec font-bold uppercase text-ink-dim flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Recent Touchpoints
            </div>
            <div className="space-y-1 text-spec">
              {recentActivities.map((act) => (
                <div key={act.id} className="text-ink-dim flex items-start gap-1.5">
                  <span className="text-ink-faint">·</span>
                  <span>
                    <strong className="capitalize text-body">{act.type}:</strong> {act.title}{" "}
                    {act.timestamp && <span className="text-ink-faint">({new Date(act.timestamp).toLocaleDateString("en-AU", { day: "numeric", month: "short" })})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Call Objectives */}
        <div className="p-3.5 bg-raised border border-line rounded-edge space-y-2">
          <div className="text-spec font-bold uppercase text-ink-dim flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-brand-deep" /> Recommended Call Objectives
          </div>
          <ul className="list-disc pl-4 space-y-1 text-spec text-body">
            <li>Verify required AS/NZS 1158 Category (e.g. P4 pathway vs V3 roadway).</li>
            <li>Confirm site soil conditions or rag-bolt vs in-ground footing preference.</li>
            <li>Check battery autonomy expectation (standard 4–5 nights vs shaded location).</li>
            <li>Confirm decision-making timeline and council tender committee dates.</li>
          </ul>
        </div>

        {/* Private Call Scratchpad */}
        <div>
          <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
            Call Plan Notes (Private)
          </label>
          <textarea
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Jot down talking points or questions before dialling..."
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
