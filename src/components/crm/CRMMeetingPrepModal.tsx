import React, { useState, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Building2,
  Users,
  Sparkles,
  Copy,
  Check,
  Package,
  Lightbulb,
  FileText,
  Briefcase,
  MapPin,
  HelpCircle,
  PhoneCall,
  Video
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useDialogDismiss } from "../../utils/useDialogDismiss";
import { formatAuDateTime } from "../../utils/dateUtils";
import { generateMeetingPreparationPlan } from "../../utils/crmMeetingPreparation";

export const CRMMeetingPrepModal: React.FC = () => {
  const {
    meetingPrepModal,
    closeMeetingPrep,
    openQuickLog,
    tasks,
    accounts,
    contacts,
    crmOpportunities,
    activities,
    knowledge,
    showToast
  } = useApp();

  useDialogDismiss(Boolean(meetingPrepModal?.isOpen), closeMeetingPrep);

  const [copied, setCopied] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState("");

  const targetMeeting = useMemo(() => {
    if (!meetingPrepModal?.meetingId) return null;
    return tasks.find((t) => t.id === meetingPrepModal.meetingId) || null;
  }, [tasks, meetingPrepModal?.meetingId]);

  const prepPlan = useMemo(() => {
    if (!targetMeeting) return null;
    return generateMeetingPreparationPlan(targetMeeting, {
      accounts,
      contacts,
      opportunities: crmOpportunities,
      activities,
      knowledge,
      tasks
    });
  }, [targetMeeting, accounts, contacts, crmOpportunities, activities, knowledge, tasks]);

  if (!meetingPrepModal || !meetingPrepModal.isOpen || !targetMeeting || !prepPlan) return null;

  const handleCopyPlan = () => {
    const participantsList = prepPlan.participants.map((p) => `${p.firstName} ${p.lastName} (${p.jobTitle || "Contact"})`).join(", ");
    const talkingPointsList = prepPlan.talkingPoints.map((tp) => `• [${tp.category}] ${tp.text}`).join("\n");
    const questionsList = prepPlan.suggestedQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");

    const fullText = `=== MEETING PREPARATION PLAN ===
Meeting: ${prepPlan.meetingTitle}
Account: ${prepPlan.account?.name || "Customer"}
When: ${formatAuDateTime(prepPlan.meetingDate, prepPlan.meetingTime)} (${prepPlan.meetingFormat || "In Person"})
Location: ${prepPlan.location || "N/A"}
Attendees: ${participantsList}

BRIEFING:
${prepPlan.executiveBriefing}

MEETING AGENDA:
${prepPlan.agendaItems.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}

TALKING POINTS:
${talkingPointsList}

QUESTIONS WORTH ASKING:
${questionsList}

${meetingNotes ? `YOUR NOTES:\n${meetingNotes}` : ""}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      showToast("Briefing copied.", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartLogOutcome = () => {
    closeMeetingPrep();
    openQuickLog({
      type: "meeting",
      accountId: prepPlan.account?.id,
      opportunityId: prepPlan.opportunity?.id,
      contactId: prepPlan.participants[0]?.id,
      prefillNotes: meetingNotes.trim() || undefined
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-prep-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        {/*
          The meta line below is a stacked list, not a bullet-joined flex row.
          As a row it collapsed on a phone into four one-word-per-line columns —
          the account name over six lines and the date split as "2026- / 09-05 /
          at / 10:30" — with the separators stranded between them.
        */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 bg-brand-wash text-brand-deep rounded-edge shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 id="meeting-prep-title" className="text-base font-bold text-body break-words">
                  {prepPlan.meetingTitle}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge whitespace-nowrap shrink-0">
                  {prepPlan.meetingFormat || "In Person"}
                </span>
              </div>
              <div className="text-spec text-ink-dim mt-1 space-y-0.5">
                <div className="break-words">{prepPlan.account?.name}</div>
                <div className="font-medium text-ink">
                  {formatAuDateTime(prepPlan.meetingDate, prepPlan.meetingTime)}
                </div>
                {prepPlan.location && (
                  <div className="flex items-start gap-1 break-words">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{prepPlan.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyPlan}
              className="p-1.5 text-ink-dim hover:text-body rounded hover:bg-line cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Copy meeting briefing"
            >
              {copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy briefing"}</span>
            </button>
            <button
              type="button"
              onClick={closeMeetingPrep}
              aria-label="Close meeting preparation modal"
              className="text-ink-faint hover:text-ink-dim p-1 rounded-edge cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Executive Briefing */}
        <div className="p-4 bg-brand-wash/40 border border-brand-edge/60 rounded-edge space-y-1.5 text-spec">
          <div className="flex items-center gap-1.5 font-bold text-brand-deep uppercase text-xs tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Briefing</span>
          </div>
          <div className="text-body leading-relaxed space-y-2 whitespace-pre-line font-medium text-spec">
            {prepPlan.executiveBriefing}
          </div>
        </div>

        {/* 2. Participants */}
        {prepPlan.participantContexts.length > 0 && (
          <div className="p-3.5 bg-paper border border-line rounded-edge space-y-2.5 text-spec">
            <div className="text-xs font-bold uppercase text-ink-dim tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-deep" />
              <span>Who you&rsquo;re meeting ({prepPlan.participantContexts.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {prepPlan.participantContexts.map((pc) => (
                <div key={pc.contact.id} className="p-2.5 bg-white border border-line rounded space-y-1.5 text-xs">
                  {/* Stacked, not a two-column row: a long name and a long job
                      title each wrapped to three lines side by side. */}
                  <div className="min-w-0">
                    <div className="font-bold text-spec text-ink break-words">
                      {pc.contact.firstName} {pc.contact.lastName}
                    </div>
                    <div className="text-[11px] text-ink-dim break-words mt-0.5">{pc.role}</div>
                  </div>
                  {pc.rapportPoints.length > 0 ? (
                    <div className="space-y-1 pt-1 border-t border-line/50 text-ink-dim">
                      {pc.rapportPoints.map((pt, idx) => (
                        <p key={idx} className="text-brand-deep font-medium leading-normal">
                          • {pt}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-ink-faint italic text-[11px]">Nothing personal recorded yet.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Product Supply & Replenishment Tracker Card */}
        {prepPlan.supplyCycles.length > 0 && (
          <div className="p-3.5 bg-paper border border-line rounded-edge space-y-2 text-spec">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase text-brand-deep tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-brand-deep" />
                <span>Product Supply &amp; Replenishment Status</span>
              </div>
              <span className="text-[11px] text-ink-dim font-medium">
                Evaluated for meeting date: {prepPlan.meetingDate}
              </span>
            </div>
            <div className="space-y-2">
              {prepPlan.supplyCycles.map((sc, idx) => (
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

        {/* 4. Open Quotes & Deals Status */}
        {prepPlan.openQuotes.length > 0 && (
          <div className="p-3 bg-white border border-line rounded-edge space-y-2 text-spec">
            <div className="text-xs font-bold uppercase text-ink-dim tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-brand-deep" />
              <span>Open quotes</span>
            </div>
            {prepPlan.openQuotes.map((q) => (
              <div key={q.quoteNumber} className="p-2.5 bg-paper rounded border border-line text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-body">
                    {q.quoteNumber}: {q.dealName}
                  </span>
                  <span className="font-bold text-brand-deep">
                    ${q.dealValue.toLocaleString()}
                  </span>
                </div>
                <p className="text-ink-dim">{q.responseDetail}</p>
              </div>
            ))}
          </div>
        )}

        {/* 5. Recommended Agenda & Actionable Talking Points */}
        <div className="p-3.5 bg-paper border border-line rounded-edge space-y-2">
          <div className="text-xs font-bold uppercase text-ink-dim tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-brand-deep" />
            <span>Suggested agenda and talking points</span>
          </div>

          {/* Agenda Items */}
          <div className="p-2.5 bg-white border border-line rounded space-y-1 text-xs">
            <span className="font-bold uppercase text-ink-dim text-[10px] block">Agenda</span>
            {prepPlan.agendaItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-body font-medium">
                <span className="text-brand-deep font-bold shrink-0">{idx + 1}.</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Talking Points */}
          {prepPlan.talkingPoints.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {prepPlan.talkingPoints.map((tp, idx) => (
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

        {/* 6. Strategic Questions to Ask */}
        {prepPlan.suggestedQuestions.length > 0 && (
          <div className="p-3 bg-white border border-line rounded-edge space-y-2 text-spec">
            <div className="text-xs font-bold uppercase text-ink-dim tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-brand-deep" />
              <span>Suggested Strategic Questions to Ask</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {prepPlan.suggestedQuestions.map((q, idx) => (
                <div key={idx} className="p-2 bg-paper rounded border border-line flex items-start gap-2">
                  <span className="font-bold text-brand-deep shrink-0">Q{idx + 1}:</span>
                  <span className="text-body font-medium">{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Private Scratchpad */}
        <div>
          <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
            Your notes
          </label>
          <textarea
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
            placeholder="Jot down internal notes or action items before or during the meeting..."
            rows={2}
            className="w-full p-2.5 text-spec rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-line">
          <button
            type="button"
            onClick={closeMeetingPrep}
            className="px-3.5 py-2 text-spec font-bold text-ink-dim hover:text-ink cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPlan}
              className="px-3 py-2 bg-paper hover:bg-line text-body text-spec font-bold rounded-edge border border-line cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Copy briefing"}</span>
            </button>
            <button
              type="button"
              onClick={handleStartLogOutcome}
              className="px-4 py-2 bg-brand-deep hover:bg-brand text-white text-spec font-bold rounded-edge shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Log the outcome</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
