import React, { useState, useEffect, useMemo } from "react";
import {
  Mic,
  MicOff,
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
  Volume2,
  Briefcase,
  Layers,
  ChevronRight
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import {
  ActivityType,
  Account,
  CRMContact,
  CRMOpportunity,
  TaskPriority,
  VoiceLogExtractionResult,
  VoiceLogDiffProposal
} from "../../types/crm";

export const CRMVoiceCaptureModal: React.FC = () => {
  const {
    voiceCaptureModal,
    closeVoiceCapture,
    accounts,
    contacts,
    crmOpportunities,
    applyVoiceCaptureDiff
  } = useApp();

  const isOpen = Boolean(voiceCaptureModal?.isOpen);
  const prefillAccountId = voiceCaptureModal?.prefillAccountId;
  const prefillOppId = voiceCaptureModal?.prefillOppId;

  // Voice recording hook
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    durationSeconds,
    error: recorderError,
    startListening,
    stopListening,
    resetTranscript,
    setManualTranscript
  } = useVoiceRecorder();

  // Workflow step: "record" | "diff"
  const [step, setStep] = useState<"record" | "diff">("record");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Staged Diff state for Step 2
  const [diff, setDiff] = useState<VoiceLogDiffProposal | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("record");
      setIsAnalyzing(false);
      setAnalyzeError(null);
      setDiff(null);
      resetTranscript();
    }
  }, [isOpen]);

  // Combined real-time transcript
  const activeTranscript = useMemo(() => {
    const combined = (transcript + (interimTranscript ? ` ${interimTranscript}` : "")).trim();
    return combined;
  }, [transcript, interimTranscript]);

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Analyze spoken transcript via /api/crm/voice-log-parse
  const handleAnalyze = async () => {
    if (!activeTranscript) {
      setAnalyzeError("Please speak or type your debrief before analyzing.");
      return;
    }

    // Stop listening if currently active
    if (isListening) {
      stopListening();
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const knownAccounts = accounts.map((a) => ({ id: a.id, name: a.name }));
      const knownContacts = contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        accountId: c.accountId
      }));
      const knownOpportunities = crmOpportunities.map((o) => ({
        id: o.id,
        name: o.name,
        accountId: o.accountId
      }));

      const payload = {
        rawTranscript: activeTranscript,
        currentDate: new Date().toISOString().split("T")[0],
        knownAccounts,
        knownContacts,
        knownOpportunities
      };

      const res = await fetch("/api/crm/voice-log-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const result: VoiceLogExtractionResult = await res.json();

      // Resolve matched account
      let resolvedAcc: Account | undefined;
      if (prefillAccountId) {
        resolvedAcc = accounts.find((a) => a.id === prefillAccountId);
      } else if (result.matchedAccount?.id) {
        resolvedAcc = accounts.find((a) => a.id === result.matchedAccount?.id);
      } else if (result.matchedAccount?.name) {
        resolvedAcc = accounts.find(
          (a) => a.name.toLowerCase() === result.matchedAccount?.name.toLowerCase()
        );
      }
      if (!resolvedAcc && accounts.length > 0) {
        resolvedAcc = accounts[0];
      }

      // Resolve matched contact
      let resolvedContact: CRMContact | undefined;
      if (result.matchedContact?.id) {
        resolvedContact = contacts.find((c) => c.id === result.matchedContact?.id);
      } else if (resolvedAcc) {
        resolvedContact = contacts.find((c) => c.accountId === resolvedAcc?.id);
      }

      // Resolve matched opportunity
      let resolvedOpp: CRMOpportunity | undefined;
      if (prefillOppId) {
        resolvedOpp = crmOpportunities.find((o) => o.id === prefillOppId);
      } else if (result.matchedOpportunity?.id) {
        resolvedOpp = crmOpportunities.find((o) => o.id === result.matchedOpportunity?.id);
      } else if (resolvedAcc) {
        resolvedOpp = crmOpportunities.find((o) => o.accountId === resolvedAcc?.id);
      }

      const stagedProposal: VoiceLogDiffProposal = {
        rawTranscript: activeTranscript,
        accountId: resolvedAcc?.id || "",
        accountName: resolvedAcc?.name || "Client Account",
        accountSourcePhrase: result.matchedAccount?.sourcePhrase,
        contactId: resolvedContact?.id,
        contactName: resolvedContact ? `${resolvedContact.firstName} ${resolvedContact.lastName}`.trim() : undefined,
        contactSourcePhrase: result.matchedContact?.sourcePhrase,
        opportunityId: resolvedOpp?.id,
        opportunityName: resolvedOpp?.name,
        opportunitySourcePhrase: result.matchedOpportunity?.sourcePhrase,
        activityType: result.activity?.type || "meeting",
        activityOutcome: result.activity?.outcome || "Contact Made",
        activityTitle: result.activity?.title || `Debrief: ${resolvedAcc?.name || "Client"}`,
        activityNotes: result.activity?.notes || activeTranscript,
        notesSourcePhrase: result.activity?.sourcePhrase,
        nextAction: result.nextAction?.action || "Follow up with client",
        nextActionDate: result.nextAction?.date || new Date().toISOString().split("T")[0],
        nextActionSourcePhrase: result.nextAction?.sourcePhrase,
        createTask: true,
        taskTitle: result.proposedTask?.title || result.nextAction?.action || "Follow up",
        taskDueDate: result.proposedTask?.dueDate || result.nextAction?.date,
        taskPriority: (result.proposedTask?.priority
          ? result.proposedTask.priority.charAt(0).toUpperCase() + result.proposedTask.priority.slice(1)
          : "High") as TaskPriority,
        taskSourcePhrase: result.proposedTask?.sourcePhrase,
        updateOpportunityValue: Boolean(result.commercialDetails?.estimatedValue),
        estimatedValue: result.commercialDetails?.estimatedValue,
        productInterest: result.commercialDetails?.productInterest
      };

      setDiff(stagedProposal);
      setStep("diff");
    } catch (err: any) {
      console.error("[CRMVoiceCaptureModal] analyze error:", err);
      setAnalyzeError(err.message || "Failed to analyze voice log.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm and apply diff
  const handleConfirmAndApply = async () => {
    if (!diff) return;
    const success = await applyVoiceCaptureDiff(diff);
    if (success) {
      closeVoiceCapture();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-capture-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-line w-full max-w-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-paper">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-deep text-white rounded-edge shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 id="voice-capture-title" className="text-base sm:text-lg font-bold text-body flex items-center gap-2">
                <span>Voice Capture</span>
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep border border-brand-edge">
                  Ute Mode
                </span>
              </h2>
              <p className="text-xs text-ink-dim">
                {step === "record"
                  ? "Speak your 30-45s debrief. Zero manual typing required."
                  : "Review proposed changes diff. Edit in one tap, never silent."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeVoiceCapture}
            className="p-1.5 text-ink-dim hover:text-body rounded-edge hover:bg-line transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: RECORD & DICTATE */}
        {step === "record" && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Record / Mic Pulse Area */}
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-gradient-to-b from-brand-wash/50 to-paper rounded-2xl border border-brand-edge/60 text-center space-y-4">
              <div className="relative">
                {/* Pulse rings when listening */}
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-brand-deep/20 animate-ping" />
                    <div className="absolute -inset-3 rounded-full bg-brand-deep/10 animate-pulse" />
                  </>
                )}

                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                    isListening
                      ? "bg-rose-600 hover:bg-rose-700 text-white scale-105"
                      : "bg-brand-deep hover:bg-brand text-white hover:scale-105"
                  }`}
                  aria-label={isListening ? "Stop recording" : "Start recording"}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8 animate-bounce" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      isListening ? "bg-rose-500 animate-pulse" : "bg-ink-faint"
                    }`}
                  />
                  <span className="text-sm font-bold text-body">
                    {isListening ? `Listening... (${formatSeconds(durationSeconds)})` : "Tap to Speak Debrief"}
                  </span>
                </div>
                <p className="text-xs text-ink-dim max-w-sm">
                  {isListening
                    ? "Speak naturally about the account, contact, outcome, commitments, and deadlines."
                    : "No typing required. Just talk as if you're leaving a voicemail."}
                </p>
              </div>

              {/* Sample Hint */}
              <div className="text-[11px] text-ink-dim bg-white/80 px-3 py-1.5 rounded-full border border-line flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                <span className="italic">
                  "Just left Cardinia, spoke to David, they want 16 columns on shared trail, needs pricing before the 20th."
                </span>
              </div>
            </div>

            {/* Error or Warning Notice */}
            {recorderError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-edge flex items-center gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{recorderError}</span>
              </div>
            )}

            {analyzeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-edge flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{analyzeError}</span>
              </div>
            )}

            {/* Live Transcript / Manual Input Fallback */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-transcript" className="text-xs font-bold text-body flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-deep" />
                  <span>Transcript / Notes Preview</span>
                </label>
                {activeTranscript && (
                  <button
                    type="button"
                    onClick={resetTranscript}
                    className="text-[11px] text-ink-dim hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <textarea
                id="voice-transcript"
                rows={4}
                value={activeTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                placeholder="Spoken words appear here automatically, or type / paste your debrief notes manually..."
                className="w-full p-3 text-sm bg-paper border border-line rounded-edge focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-deep text-body transition-colors"
              />
              <p className="text-[11px] text-ink-faint">
                Tip: If keyboard dictation on your mobile is preferred, tap into the box and press your keyboard's microphone.
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={closeVoiceCapture}
                className="px-4 py-2 text-spec text-ink-dim hover:text-body font-semibold rounded-edge border border-line bg-paper hover:bg-line cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!activeTranscript || isAnalyzing}
                onClick={handleAnalyze}
                className={`px-5 py-2 text-spec font-bold rounded-edge shadow-xs flex items-center gap-2 cursor-pointer transition-colors ${
                  !activeTranscript || isAnalyzing
                    ? "bg-paper text-ink-faint border border-line cursor-not-allowed"
                    : "bg-brand-deep hover:bg-brand text-white"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Analyzing Debrief...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Proposed Diff</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PROPOSED CHANGES DIFF (Review & Confirm) */}
        {step === "diff" && diff && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Banner: Provenance & Guarantee */}
            <div className="p-3 bg-brand-wash border border-brand-edge rounded-edge flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-deep shrink-0" />
                <span className="font-semibold text-body">
                  Proposed Changes Diff · Every fact verified by source phrase
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-deep bg-white px-2 py-0.5 rounded border border-brand-edge">
                Ready for confirmation
              </span>
            </div>

            {/* Original Spoken Transcript Quote */}
            <div className="p-3 bg-paper rounded-edge border border-line space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-dim block">
                Original Spoken Transcript
              </span>
              <p className="text-xs text-body italic font-serif">"{diff.rawTranscript}"</p>
            </div>

            {/* DIFF FIELDS GRID */}
            <div className="space-y-3.5">
              {/* 1. Account & Contact Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Account */}
                <div className="p-3 bg-white rounded-edge border border-line shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-body flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-deep" />
                      <span>Target Account</span>
                    </label>
                    {diff.accountSourcePhrase && (
                      <span className="text-[10px] font-medium text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded truncate max-w-36">
                        From: "{diff.accountSourcePhrase}"
                      </span>
                    )}
                  </div>
                  <select
                    value={diff.accountId}
                    onChange={(e) => {
                      const selected = accounts.find((a) => a.id === e.target.value);
                      setDiff({
                        ...diff,
                        accountId: e.target.value,
                        accountName: selected?.name || ""
                      });
                    }}
                    className="w-full p-2 text-xs bg-paper border border-line rounded focus:bg-white text-body font-semibold cursor-pointer"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact */}
                <div className="p-3 bg-white rounded-edge border border-line shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-body flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-brand-deep" />
                      <span>Contact / Person</span>
                    </label>
                    {diff.contactSourcePhrase && (
                      <span className="text-[10px] font-medium text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded truncate max-w-36">
                        From: "{diff.contactSourcePhrase}"
                      </span>
                    )}
                  </div>
                  <select
                    value={diff.contactId || ""}
                    onChange={(e) => {
                      const selected = contacts.find((c) => c.id === e.target.value);
                      setDiff({
                        ...diff,
                        contactId: e.target.value,
                        contactName: selected ? `${selected.firstName} ${selected.lastName}`.trim() : undefined
                      });
                    }}
                    className="w-full p-2 text-xs bg-paper border border-line rounded focus:bg-white text-body font-semibold cursor-pointer"
                  >
                    <option value="">-- No Contact Specified --</option>
                    {contacts
                      .filter((c) => !diff.accountId || c.accountId === diff.accountId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.jobTitle || "Contact"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 2. Activity Type & Outcome */}
              <div className="p-3 bg-white rounded-edge border border-line shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-body flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-brand-deep" />
                    <span>Activity Type &amp; Outcome</span>
                  </span>
                  <span className="text-[10px] text-ink-dim">Single-tap adjustment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Type */}
                  <div className="flex items-center gap-1.5">
                    {(["meeting", "call", "note"] as ActivityType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDiff({ ...diff, activityType: t })}
                        className={`flex-1 py-1.5 px-2 text-center rounded capitalize font-semibold border cursor-pointer transition-colors ${
                          diff.activityType === t
                            ? "bg-brand-deep text-white border-brand-deep shadow-2xs"
                            : "bg-paper text-ink-dim border-line hover:text-body"
                        }`}
                      >
                        {t === "meeting" ? "Site Visit" : t}
                      </button>
                    ))}
                  </div>

                  {/* Outcome */}
                  <div className="flex items-center gap-1.5">
                    {(diff.activityType === "meeting"
                      ? ["Meeting Held", "Cancelled"]
                      : ["Contact Made", "No Answer", "Voicemail Left"]
                    ).map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => setDiff({ ...diff, activityOutcome: outcome })}
                        className={`flex-1 py-1.5 px-2 text-center rounded text-[11px] font-semibold border cursor-pointer transition-colors truncate ${
                          diff.activityOutcome === outcome
                            ? "bg-brand-wash text-brand-deep border-brand-edge font-bold shadow-2xs"
                            : "bg-paper text-ink-dim border-line hover:text-body"
                        }`}
                      >
                        {outcome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulated Activity Notes */}
                <div className="pt-1.5 space-y-1">
                  <label htmlFor="diff-notes" className="text-[11px] font-semibold text-ink-dim">
                    Formulated CRM Activity Notes:
                  </label>
                  <textarea
                    id="diff-notes"
                    rows={3}
                    value={diff.activityNotes}
                    onChange={(e) => setDiff({ ...diff, activityNotes: e.target.value })}
                    className="w-full p-2 text-xs bg-paper border border-line rounded focus:bg-white text-body font-normal"
                  />
                </div>
              </div>

              {/* 3. Next Action & Date */}
              <div className="p-3 bg-white rounded-edge border border-line shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-body flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-deep" />
                    <span>Next Action Commitment</span>
                  </label>
                  {diff.nextActionSourcePhrase && (
                    <span className="text-[10px] font-medium text-brand-deep bg-brand-wash px-1.5 py-0.5 rounded truncate max-w-44">
                      From: "{diff.nextActionSourcePhrase}"
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={diff.nextAction || ""}
                      onChange={(e) => setDiff({ ...diff, nextAction: e.target.value })}
                      placeholder="e.g. Send formal pricing for 16 columns"
                      className="w-full p-2 text-xs bg-paper border border-line rounded focus:bg-white text-body font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={diff.nextActionDate || ""}
                      onChange={(e) => setDiff({ ...diff, nextActionDate: e.target.value })}
                      className="w-full p-2 text-xs bg-paper border border-line rounded focus:bg-white text-body font-semibold cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Follow-up Task Toggle */}
              <div className="p-3 bg-white rounded-edge border border-line shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={diff.createTask}
                      onChange={(e) => setDiff({ ...diff, createTask: e.target.checked })}
                      className="w-4 h-4 text-brand-deep rounded border-line focus:ring-brand-deep"
                    />
                    <span className="text-xs font-bold text-body">
                      Create Follow-up Task in CRM
                    </span>
                  </label>
                  {diff.createTask && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Will create task
                    </span>
                  )}
                </div>

                {diff.createTask && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={diff.taskTitle || ""}
                        onChange={(e) => setDiff({ ...diff, taskTitle: e.target.value })}
                        placeholder="Task title"
                        className="w-full p-1.5 text-xs bg-paper border border-line rounded focus:bg-white text-body"
                      />
                    </div>
                    <div>
                      <select
                        value={diff.taskPriority || "High"}
                        onChange={(e) => setDiff({ ...diff, taskPriority: e.target.value as TaskPriority })}
                        className="w-full p-1.5 text-xs bg-paper border border-line rounded focus:bg-white text-body font-semibold"
                      >
                        <option value="Urgent">Urgent Priority</option>
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Low">Low Priority</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setStep("record")}
                className="px-3 py-2 text-xs font-semibold text-ink-dim hover:text-body flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Back to Audio / Re-record</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeVoiceCapture}
                  className="px-3.5 py-2 text-xs font-semibold text-ink-dim hover:text-body rounded border border-line bg-paper hover:bg-line cursor-pointer"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Apply Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
