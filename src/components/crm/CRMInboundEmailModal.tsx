import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Sparkles,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Clock,
  ArrowRight,
  RotateCcw,
  FileText,
  Check,
  AlertCircle,
  X,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Tag,
  AlertTriangle
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  InboundEmailParseResult,
  InboundEmailDiffProposal,
  TaskPriority,
  Account,
  CRMContact,
  CRMOpportunity
} from "../../types/crm";

interface SampleEmailPreset {
  label: string;
  description: string;
  text: string;
}

const SAMPLE_PRESETS: SampleEmailPreset[] = [
  {
    label: "Cardinia Shire · Tender Commitment",
    description: "Council engineer confirms tender release in October with spec timeline",
    text: `From: David Smith <david.smith@cardinia.vic.gov.au>
To: Marcus Vance <marcus.vance@plasgain.com.au>
Date: Fri, 04 Sep 2026 14:22:10 +1000
Subject: Re: Plasgain Quotation Q-2026-892 - Shared Trail Lighting

Hi Marcus,

Thanks for following up on the quotation for the shared trail solar lighting project. 

Our engineering committee reviewed the DIALux photometric calculations this morning. The committee is pleased with the 3000K fauna-friendly optic profile.

The formal Council tender will be released in October. We will require updated formal pricing held firm until 31 October 2026. Please follow up with me around 1 October so we can finalize the specification pack for the tender documents.

Kind regards,
David Smith
Senior Infrastructure Asset Manager
Cardinia Shire Council
03 5945 4200`
  },
  {
    label: "BMD Constructions · Pricing Objection",
    description: "Civil contractor requesting volume discount vs Replas bollard pricing",
    text: `From: Greg Thomas <greg.thomas@bmd.com.au>
To: Travis Maher <travis@plasgain.com.au>
Date: Thu, 03 Sep 2026 11:05:44 +1000
Subject: FW: Western Highway Composite Bollards & Retaining Package

Travis,

We've reviewed your quote for the Western Highway project. 

The composite bollard specification looks solid, but your unit pricing is roughly 8% above Replas on the 150mm profile. Replas has offered us a bulk project rebate if we commit this week.

Can Plasgain review volume pricing for 350+ units? We need to lock in supplier selection by next Tuesday, 8 September.

Regards,
Greg Thomas
Senior Project Engineer
BMD Constructions Pty Ltd
0418 234 567`
  },
  {
    label: "Wyndham City Council · Trial Approved",
    description: "Lighting trial approved, requesting site inspection to schedule trial poles",
    text: `From: Sarah Jenkins <sjenkins@wyndham.vic.gov.au>
To: Travis Maher <travis@plasgain.com.au>
Date: Mon, 31 Aug 2026 09:15:30 +1000
Subject: Re: Wyndham Park Foreshore Retaining Wall & Lighting Trial

Good morning Travis,

Great news - Council has approved the 2-pole solar lighting trial for the foreshore pathway.

We want to proceed with the trial installation before the full roll-out. Could you and your technical engineer meet us on site next Wednesday at 10am for a site walk to determine exact footing locations?

Let me know if next Wednesday works for you.

Kind regards,
Sarah Jenkins
Open Space & Parks Project Officer
Wyndham City Council
03 9742 0777`
  }
];

export const CRMInboundEmailModal: React.FC = () => {
  const {
    inboundEmailModal,
    closeInboundEmailModal,
    accounts,
    contacts,
    crmOpportunities,
    applyInboundEmailDiff
  } = useApp();

  const isOpen = Boolean(inboundEmailModal?.isOpen);
  const initialText = inboundEmailModal?.initialText || "";
  const prefillAccountId = inboundEmailModal?.accountId;
  const prefillOppId = inboundEmailModal?.opportunityId;

  // Step state: "input" | "diff"
  const [step, setStep] = useState<"input" | "diff">("input");
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Staged Diff state for Step 2
  const [parseResult, setParseResult] = useState<InboundEmailParseResult | null>(null);
  const [diff, setDiff] = useState<InboundEmailDiffProposal | null>(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setRawText(initialText);
      setIsAnalyzing(false);
      setAnalyzeError(null);
      setParseResult(null);
      setDiff(null);
    }
  }, [isOpen, initialText]);

  // Execute extraction via backend endpoint
  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setAnalyzeError("Please paste an email or select a sample preset.");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const knownAccounts = accounts.map((a) => ({ id: a.id, name: a.name }));
      const knownContacts = contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        accountId: c.accountId
      }));
      const knownOpportunities = crmOpportunities.map((o) => ({
        id: o.id,
        name: o.name,
        accountId: o.accountId
      }));

      const res = await fetch("/api/crm/parse-inbound-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawEmailText: rawText,
          currentDate: new Date().toISOString().split("T")[0],
          knownAccounts,
          knownContacts,
          knownOpportunities
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: InboundEmailParseResult = await res.json();
      setParseResult(data);

      // Resolve linked account
      let resolvedAccountId = data.matchedAccount?.id || prefillAccountId || "";
      let resolvedAccountName = data.matchedAccount?.name || "";
      if (!resolvedAccountId && accounts.length > 0) {
        if (resolvedAccountName) {
          const match = accounts.find((a) => a.name.toLowerCase() === resolvedAccountName.toLowerCase());
          if (match) {
            resolvedAccountId = match.id;
            resolvedAccountName = match.name;
          }
        }
        if (!resolvedAccountId) {
          resolvedAccountId = accounts[0].id;
          resolvedAccountName = accounts[0].name;
        }
      }

      // Resolve linked opportunity
      let resolvedOppId = data.matchedOpportunity?.id || prefillOppId || "";
      let resolvedOppName = data.matchedOpportunity?.name || "";
      if (!resolvedOppId && resolvedAccountId) {
        const oppMatch = crmOpportunities.find((o) => o.accountId === resolvedAccountId);
        if (oppMatch) {
          resolvedOppId = oppMatch.id;
          resolvedOppName = oppMatch.name;
        }
      }

      // Resolve linked contact
      let resolvedContactId = data.matchedContact?.id || "";
      let resolvedContactName = data.matchedContact?.name || data.senderName || "";
      let resolvedContactEmail = data.matchedContact?.email || data.senderEmail || "";
      if (!resolvedContactId && resolvedAccountId) {
        const contactMatch = contacts.find(
          (c) => c.accountId === resolvedAccountId && (c.email === resolvedContactEmail || c.lastName.toLowerCase() === resolvedContactName.split(" ").pop()?.toLowerCase())
        );
        if (contactMatch) {
          resolvedContactId = contactMatch.id;
          resolvedContactName = `${contactMatch.firstName} ${contactMatch.lastName}`;
          resolvedContactEmail = contactMatch.email;
        }
      }

      const todayStr = new Date().toISOString().split("T")[0];

      // Build staged diff proposal
      const stagedDiff: InboundEmailDiffProposal = {
        accountId: resolvedAccountId,
        accountName: resolvedAccountName,
        opportunityId: resolvedOppId || undefined,
        opportunityName: resolvedOppName || undefined,
        contactId: resolvedContactId || undefined,
        contactName: resolvedContactName || undefined,
        contactEmail: resolvedContactEmail || undefined,
        emailSubject: data.subject || "Client Email Response",
        emailDate: data.emailDate || todayStr,
        rawEmailText: rawText,
        summaryNotes: data.summary || "Client email received.",
        sentiment: data.sentiment || "Neutral",
        nextAction: data.suggestedNextAction || "Follow up regarding email response",
        nextActionDate: data.suggestedNextActionDate || todayStr,
        updateStage: Boolean(data.stageRecommendation?.targetStageId),
        targetStageId: data.stageRecommendation?.targetStageId,
        targetStageName: data.stageRecommendation?.targetStageName,
        createFollowUpTask: true,
        taskTitle: data.suggestedNextAction || `Follow up: ${resolvedAccountName}`,
        taskDueDate: data.suggestedNextActionDate || todayStr,
        taskPriority: "High"
      };

      setDiff(stagedDiff);
      setStep("diff");
    } catch (err: any) {
      console.error("[CRMInboundEmailModal] Error parsing inbound email:", err);
      setAnalyzeError("Failed to parse email. Please verify connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm and apply diff
  const handleConfirmApply = async () => {
    if (!diff) return;
    const success = await applyInboundEmailDiff(diff);
    if (success) {
      closeInboundEmailModal();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-panel border border-line shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 border-b border-line bg-paper flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-wash text-brand-deep rounded-edge">
              <Mail className="w-5 h-5 text-brand-deep" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-body">Ingest Inbound Email</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep border border-brand-edge">
                  <Sparkles className="w-3 h-3 text-brand-deep" />
                  <span>AI Extraction & Provenance</span>
                </span>
              </div>
              <p className="text-xs text-ink-dim mt-0.5">
                Paste an email response to match CRM records, update next actions, and advance deal status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeInboundEmailModal}
            className="p-1.5 text-ink-dim hover:text-body hover:bg-raised rounded-edge transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WORKFLOW BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === "input" ? (
            <div className="space-y-4">
              {/* Sample Presets Strip */}
              <div className="p-3 bg-brand-wash/60 border border-brand-edge/70 rounded-edge space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-deep flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick Test Samples (Realistic Inbound Emails)</span>
                  </span>
                  <span className="text-[11px] text-ink-dim">Click to populate</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRawText(preset.text)}
                      className="p-2.5 bg-white hover:bg-brand-wash/80 border border-line hover:border-brand-deep rounded-edge text-left transition-all shadow-2xs group cursor-pointer"
                    >
                      <p className="text-xs font-bold text-body group-hover:text-brand-deep flex items-center justify-between">
                        <span>{preset.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-dim group-hover:text-brand-deep" />
                      </p>
                      <p className="text-[11px] text-ink-dim line-clamp-2 mt-1">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-body uppercase tracking-wider">
                    Raw Inbound Email or Thread History
                  </label>
                  <span className="text-xs text-ink-dim">{rawText.length} characters</span>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Paste inbound email text here (headers like From:, Subject:, Date: will be automatically parsed)...\n\nExample:\nFrom: David Smith <david.smith@cardinia.vic.gov.au>\nSubject: Re: Quote Q-2026-892\nHi Marcus, Council tender will be released in October...`}
                  rows={12}
                  className="w-full p-3.5 bg-raised border border-line rounded-edge text-spec font-mono text-xs focus:outline-none focus:border-brand-deep focus:bg-white resize-y shadow-inner"
                />
              </div>

              {analyzeError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-edge flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{analyzeError}</span>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: PROPOSED CHANGES DIFF REVIEW */
            <div className="space-y-5">
              {/* Attribution Notice */}
              <div className="p-3 bg-paper border border-line rounded-edge flex items-center justify-between gap-3 text-spec">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs text-body">
                    Review extracted commitments and CRM updates. <strong>Nothing is applied silently</strong> until you confirm.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-xs font-bold text-brand-deep hover:underline shrink-0"
                >
                  Edit Raw Email
                </button>
              </div>

              {/* Email Metadata & Sentiment Header */}
              <div className="p-3.5 bg-white border border-line rounded-edge shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-ink-dim uppercase">Subject</span>
                    <h4 className="text-sm font-bold text-body">{diff?.emailSubject}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        diff?.sentiment === "Positive"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : diff?.sentiment === "Concerned"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      Sentiment: {diff?.sentiment}
                    </span>
                    <span className="text-xs text-ink-dim flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{diff?.emailDate}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-ink-dim">Sender: </span>
                    <strong className="text-body font-semibold">{diff?.contactName || "Client"}</strong>
                    {diff?.contactEmail && <span className="text-ink-dim"> ({diff.contactEmail})</span>}
                  </div>
                  {parseResult?.competitorMention && (
                    <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Competitor Mention: <strong>{parseResult.competitorMention.competitorName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Entity Resolution Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Matched Account */}
                <div className="p-3 bg-white border border-line rounded-edge shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-dim uppercase flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-brand-deep" />
                      <span>Target Account</span>
                    </span>
                    {parseResult?.matchedAccount && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-mono">
                        {Math.round(parseResult.matchedAccount.confidence * 100)}% match
                      </span>
                    )}
                  </div>
                  <select
                    value={diff?.accountId}
                    onChange={(e) => {
                      const selected = accounts.find((a) => a.id === e.target.value);
                      if (selected && diff) {
                        setDiff({
                          ...diff,
                          accountId: selected.id,
                          accountName: selected.name
                        });
                      }
                    }}
                    className="w-full text-xs p-1.5 border border-line rounded bg-raised focus:bg-white focus:border-brand-deep font-semibold text-body"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {parseResult?.matchedAccount?.sourcePhrase && (
                    <p className="text-[10px] text-ink-dim truncate">
                      Source quote: <em>"{parseResult.matchedAccount.sourcePhrase}"</em>
                    </p>
                  )}
                </div>

                {/* Matched Opportunity */}
                <div className="p-3 bg-white border border-line rounded-edge shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-dim uppercase flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-brand-deep" />
                      <span>Linked Opportunity</span>
                    </span>
                    {parseResult?.matchedOpportunity && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-mono">
                        {Math.round(parseResult.matchedOpportunity.confidence * 100)}% match
                      </span>
                    )}
                  </div>
                  <select
                    value={diff?.opportunityId || ""}
                    onChange={(e) => {
                      const selected = crmOpportunities.find((o) => o.id === e.target.value);
                      if (diff) {
                        setDiff({
                          ...diff,
                          opportunityId: selected?.id || undefined,
                          opportunityName: selected?.name || undefined
                        });
                      }
                    }}
                    className="w-full text-xs p-1.5 border border-line rounded bg-raised focus:bg-white focus:border-brand-deep font-semibold text-body"
                  >
                    <option value="">-- No Linked Opportunity --</option>
                    {crmOpportunities
                      .filter((o) => !diff?.accountId || o.accountId === diff.accountId)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                  {parseResult?.matchedOpportunity?.sourcePhrase && (
                    <p className="text-[10px] text-ink-dim truncate">
                      Source quote: <em>"{parseResult.matchedOpportunity.sourcePhrase}"</em>
                    </p>
                  )}
                </div>

                {/* Matched Contact */}
                <div className="p-3 bg-white border border-line rounded-edge shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-dim uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-brand-deep" />
                      <span>Sender Contact</span>
                    </span>
                    {parseResult?.matchedContact && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-mono">
                        {Math.round(parseResult.matchedContact.confidence * 100)}% match
                      </span>
                    )}
                  </div>
                  <select
                    value={diff?.contactId || ""}
                    onChange={(e) => {
                      const selected = contacts.find((c) => c.id === e.target.value);
                      if (diff) {
                        setDiff({
                          ...diff,
                          contactId: selected?.id || undefined,
                          contactName: selected ? `${selected.firstName} ${selected.lastName}` : diff.contactName,
                          contactEmail: selected?.email || diff.contactEmail
                        });
                      }
                    }}
                    className="w-full text-xs p-1.5 border border-line rounded bg-raised focus:bg-white focus:border-brand-deep font-semibold text-body"
                  >
                    <option value="">-- {diff?.contactName || "Select Contact"} --</option>
                    {contacts
                      .filter((c) => !diff?.accountId || c.accountId === diff.accountId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.jobTitle})
                        </option>
                      ))}
                  </select>
                  {parseResult?.matchedContact?.sourcePhrase && (
                    <p className="text-[10px] text-ink-dim truncate">
                      Source quote: <em>"{parseResult.matchedContact.sourcePhrase}"</em>
                    </p>
                  )}
                </div>
              </div>

              {/* Extracted Client Commitments & Objections Strip */}
              {(parseResult?.clientCommitments?.length || parseResult?.clientObjectionsOrConcerns?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Commitments */}
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-edge space-y-2">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Client Commitments & Milestones</span>
                    </span>
                    {parseResult?.clientCommitments && parseResult.clientCommitments.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-body">
                        {parseResult.clientCommitments.map((c, i) => (
                          <li key={i} className="p-2 bg-white rounded border border-emerald-100 space-y-1">
                            <p className="font-medium text-emerald-950">{c.text}</p>
                            <span className="text-[10px] text-ink-dim italic block">
                              Attribution: "{c.sourcePhrase}"
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-dim italic">No explicit forward commitments detected.</p>
                    )}
                  </div>

                  {/* Objections / Concerns */}
                  <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-edge space-y-2">
                    <span className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Objections & Commercial Constraints</span>
                    </span>
                    {parseResult?.clientObjectionsOrConcerns && parseResult.clientObjectionsOrConcerns.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-body">
                        {parseResult.clientObjectionsOrConcerns.map((o, i) => (
                          <li key={i} className="p-2 bg-white rounded border border-amber-100 space-y-1">
                            <p className="font-medium text-amber-950">{o.text}</p>
                            <span className="text-[10px] text-ink-dim italic block">
                              Attribution: "{o.sourcePhrase}"
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-dim italic">No commercial objections or delays detected.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Staged Updates Section */}
              <div className="p-4 bg-paper border border-line rounded-edge space-y-4">
                <span className="text-xs font-bold text-body uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-deep" />
                  <span>Staged CRM Updates to Commit</span>
                </span>

                {/* 1. Activity Note */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-dim">Activity Log Notes</label>
                    <span className="text-[10px] text-brand-deep font-mono">type: "email" · captureSource: "email_inbound"</span>
                  </div>
                  <textarea
                    rows={3}
                    value={diff?.summaryNotes || ""}
                    onChange={(e) => diff && setDiff({ ...diff, summaryNotes: e.target.value })}
                    className="w-full p-2.5 bg-white border border-line rounded text-xs text-body focus:outline-none focus:border-brand-deep resize-y"
                  />
                </div>

                {/* 2. Next Action & Next Action Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-ink-dim">Next Action Commitment</label>
                    <input
                      type="text"
                      value={diff?.nextAction || ""}
                      onChange={(e) => diff && setDiff({ ...diff, nextAction: e.target.value })}
                      className="w-full p-2 bg-white border border-line rounded text-xs text-body font-semibold focus:outline-none focus:border-brand-deep"
                    />
                    {parseResult?.suggestedNextActionPhrase && (
                      <p className="text-[10px] text-ink-dim">
                        Inferred from: <em>"{parseResult.suggestedNextActionPhrase}"</em>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-dim">Next Action Date</label>
                    <input
                      type="date"
                      value={diff?.nextActionDate || ""}
                      onChange={(e) => diff && setDiff({ ...diff, nextActionDate: e.target.value })}
                      className="w-full p-2 bg-white border border-line rounded text-xs text-body font-mono focus:outline-none focus:border-brand-deep"
                    />
                  </div>
                </div>

                {/* 3. Stage Advancement Recommendation */}
                {parseResult?.stageRecommendation && diff?.opportunityId && (
                  <div className="p-3 bg-white border border-brand-edge/60 rounded-edge flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-deep" />
                        <span className="text-xs font-bold text-body">
                          Advance Deal Stage to "{parseResult.stageRecommendation.targetStageName}"
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-dim">
                        Reason: {parseResult.stageRecommendation.reason}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(diff?.updateStage)}
                        onChange={(e) => diff && setDiff({ ...diff, updateStage: e.target.checked })}
                        className="w-4 h-4 rounded text-brand-deep focus:ring-brand-deep"
                      />
                      <span className="text-xs font-bold text-body">Apply Stage Change</span>
                    </label>
                  </div>
                )}

                {/* 4. Follow-up Task Creation */}
                <div className="p-3 bg-white border border-line rounded-edge flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-deep" />
                      <span className="text-xs font-bold text-body">Schedule Follow-up Task</span>
                    </div>
                    <p className="text-[11px] text-ink-dim">
                      Adds a high-priority follow-up task to your CRM Today action queue.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(diff?.createFollowUpTask)}
                      onChange={(e) => diff && setDiff({ ...diff, createFollowUpTask: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-deep focus:ring-brand-deep"
                    />
                    <span className="text-xs font-bold text-body">Create Task</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-line bg-paper flex items-center justify-between shrink-0">
          {step === "input" ? (
            <>
              <button
                type="button"
                onClick={closeInboundEmailModal}
                className="px-4 py-2 border border-line hover:bg-raised text-body rounded-edge text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAnalyzing || !rawText.trim()}
                onClick={handleAnalyze}
                className="px-5 py-2 bg-brand-deep hover:bg-brand disabled:bg-line text-white rounded-edge text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Email...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Inbound Email</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="px-4 py-2 border border-line hover:bg-raised text-body rounded-edge text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Back / Edit Raw Text</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="px-6 py-2 bg-brand-deep hover:bg-brand text-white rounded-edge text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirm & Apply Changes</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
