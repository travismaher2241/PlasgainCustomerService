import React, { useState, useMemo } from "react";
import {
  Mail,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Send,
  Calendar,
  Layers,
  Sparkles,
  Save,
  Check,
  RotateCcw
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateCustomerFollowUpEmail } from "../utils/ostendoExporter";
import { getLocalDateInputValue, addBusinessDaysLocal, formatAuDate } from "../utils/dateUtils";

export interface CustomerFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId?: string;
  accountId?: string;
  initialContactName?: string;
  initialCompanyName?: string;
  initialProjectName?: string;
  initialQuoteRef?: string;
  initialProducts?: string[];
  initialContactEmail?: string;
}

/** Plain wording for the internal cadence values, which used to reach
 *  activity titles and task notes as "DAY7". */
const CADENCE_LABELS: Record<"day7" | "day14" | "urgent", string> = {
  day7: "one week",
  day14: "two weeks",
  urgent: "tender closing"
};

export const CustomerFollowUpModal: React.FC<CustomerFollowUpModalProps> = ({
  isOpen,
  onClose,
  dealId,
  accountId,
  initialContactName = "",
  initialCompanyName = "",
  initialProjectName = "",
  initialQuoteRef = "",
  initialProducts = [],
  initialContactEmail = ""
}) => {
  const {
    showToast,
    currentUser,
    crmOpportunities,
    updateCrmOpportunity,
    logActivity,
    addTask
  } = useApp();

  const [cadence, setCadence] = useState<"day7" | "day14" | "urgent">("day7");

  const [contactName, setContactName] = useState(initialContactName);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [projectName, setProjectName] = useState(initialProjectName);
  const deal = crmOpportunities.find((d) => d.id === dealId);
  const [contactEmail, setContactEmail] = useState(initialContactEmail || deal?.primaryContactEmail || "");
  const [quoteRef, setQuoteRef] = useState(initialQuoteRef || deal?.ostendoQuoteRef || deal?.quoteNumber || "");
  const [leadTime, setLeadTime] = useState("2–3 weeks from order confirmation");
  const [warranty, setWarranty] = useState("5-Year Plasgain System Warranty");
  const [customNote, setCustomNote] = useState("");

  // P2-14: Combined Step Tracking
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => {
    return addBusinessDaysLocal(cadence === "day7" ? 7 : 14);
  });
  const [stepEmail, setStepEmail] = useState<"idle" | "done" | "error">("idle");
  const [stepActivity, setStepActivity] = useState<"idle" | "done" | "error">("idle");
  const [stepTask, setStepTask] = useState<"idle" | "done" | "error">("idle");
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const isWorkflowComplete = stepEmail === "done" && stepActivity === "done" && stepTask === "done";

  // Sync state if initial props change
  React.useEffect(() => {
    if (initialContactName) setContactName(initialContactName);
    if (initialCompanyName) setCompanyName(initialCompanyName);
    if (initialProjectName) setProjectName(initialProjectName);
    if (initialQuoteRef) setQuoteRef(initialQuoteRef);
  }, [initialContactName, initialCompanyName, initialProjectName, initialQuoteRef]);

  const senderName = currentUser.name?.trim() || "";
  const senderEmail = currentUser.email?.trim() || "";
  const senderPhone = currentUser.phone?.trim() || undefined;

  const profileValidationError = !senderName
    ? "Your sender profile is incomplete. Add your name in Settings before copying or sending this email."
    : !senderEmail
    ? "Your sender profile is incomplete. Add your email address in Settings before copying or sending this email."
    : null;

  const generatedEmail = useMemo(() => {
    return generateCustomerFollowUpEmail({
      cadence,
      contactName,
      contactEmail,
      companyName,
      projectName,
      quoteRef,
      productsList: initialProducts,
      senderName,
      senderEmail,
      senderPhone,
      companyAbn: "12 345 678 910",
      leadTime,
      warranty,
      customNote
    });
  }, [cadence, contactName, contactEmail, companyName, projectName, quoteRef, initialProducts, senderName, senderEmail, senderPhone, leadTime, warranty, customNote]);

  const [editableBody, setEditableBody] = useState(generatedEmail.body);
  const [editableSubject, setEditableSubject] = useState(generatedEmail.subject);

  // Update editable fields when template changes
  React.useEffect(() => {
    setEditableSubject(generatedEmail.subject);
    setEditableBody(generatedEmail.body);
  }, [generatedEmail]);

  if (!isOpen) return null;

  const mailtoUrl = `mailto:${encodeURIComponent(contactEmail || "")}?subject=${encodeURIComponent(
    editableSubject
  )}&body=${encodeURIComponent(editableBody)}`;

  const handleCopyEmail = () => {
    if (profileValidationError) {
      showToast(profileValidationError, "error");
      return;
    }
    navigator.clipboard.writeText(`Subject: ${editableSubject}\n\n${editableBody}`);
    setStepEmail("done");
    showToast("Email copied to clipboard!", "success");
  };

  const handleLogToCRM = () => {
    try {
      logActivity({
        type: "email",
        title: `Follow-up email: ${projectName || companyName}`,
        description: `Sent follow-up regarding quote ${quoteRef || "pending"} to ${contactName} <${contactEmail}>.\n\nSubject: ${editableSubject}`,
        // The ids matter: the account and quote timelines filter on them, so
        // without these the follow-up was written but never appeared anywhere.
        accountId,
        opportunityId: dealId,
        contactName: contactName || undefined,
        accountName: companyName || undefined,
        opportunityName: projectName || undefined,
        performedBy: currentUser.name || "Sales",
        outcome: "Follow-up email sent"
      });

      if (dealId) {
        // Record the activity only. Writing stageName here moved the quote to a
        // stage that does not exist in this pipeline, as a side effect of
        // sending an email — and left stageId pointing somewhere else.
        updateCrmOpportunity(dealId, {
          latestActivity: `Follow-up email sent (${CADENCE_LABELS[cadence]})`,
          latestActivityDate: getLocalDateInputValue(new Date())
        });
      }

      setStepActivity("done");
      showToast("Follow-up saved to the customer's history.", "success");
    } catch {
      setStepActivity("error");
      showToast("The follow-up could not be saved. Try again.", "error");
    }
  };

  const handleScheduleTask = () => {
    try {
      addTask?.({
        title: `Follow up ${companyName || "customer"} on quote ${quoteRef || projectName}`,
        notes: `Check for a reply to the ${CADENCE_LABELS[cadence]} follow-up sent on ${formatAuDate(getLocalDateInputValue(new Date()))}.`,
        dueDate: nextFollowUpDate,
        priority: cadence === "urgent" ? "Urgent" : "High",
        type: "Follow-up",
        status: "To Do",
        assignedTo: currentUser.name || "Sales Specialist",
        createdBy: currentUser.name || "Sales",
        accountId,
        opportunityId: dealId,
        opportunityName: projectName,
        accountName: companyName,
        contactName: contactName
      });

      setStepTask("done");
      showToast(`Follow-up set for ${formatAuDate(nextFollowUpDate)}.`, "success");
    } catch {
      setStepTask("error");
      showToast("The follow-up reminder could not be created. Try again.", "error");
    }
  };

  // P2-14: Atomic Combined Workflow Execution
  const handleExecuteCombinedWorkflow = async () => {
    if (profileValidationError) {
      showToast(profileValidationError, "error");
      return;
    }
    // Guard the handler too, not just the button, so a stray re-entry cannot
    // duplicate the activity and the task.
    if (isExecutingAll || isWorkflowComplete) return;

    setIsExecutingAll(true);

    // Step 1: Copy/Open email
    try {
      await navigator.clipboard.writeText(`Subject: ${editableSubject}\n\n${editableBody}`);
      setStepEmail("done");
    } catch {
      setStepEmail("error");
    }

    // Step 2: Log Activity
    try {
      logActivity({
        type: "email",
        title: `Follow-up email: ${projectName || companyName}`,
        description: `Sent the ${CADENCE_LABELS[cadence]} follow-up to ${contactName} (${contactEmail}) for quote ${quoteRef || "active"}.`,
        accountId,
        opportunityId: dealId,
        contactName,
        accountName: companyName,
        opportunityName: projectName,
        performedBy: currentUser.name || "Sales",
        outcome: "Follow-up email sent"
      });
      if (dealId) {
        updateCrmOpportunity(dealId, {
          latestActivity: `Follow-up email sent (${CADENCE_LABELS[cadence]})`,
          latestActivityDate: getLocalDateInputValue(new Date())
        });
      }
      setStepActivity("done");
    } catch {
      setStepActivity("error");
    }

    // Step 3: Schedule Task
    try {
      addTask?.({
        title: `Follow-up call with ${contactName} (${companyName})`,
        notes: `Review quote status for ${projectName}. Email sent on ${getLocalDateInputValue(new Date())}.`,
        dueDate: nextFollowUpDate,
        priority: cadence === "urgent" ? "Urgent" : "Medium",
        type: "Follow-up",
        status: "To Do",
        assignedTo: currentUser.name || "Sales Rep",
        createdBy: currentUser.name || "Sales",
        opportunityName: projectName,
        accountName: companyName,
        contactName: contactName
      });
      setStepTask("done");
    } catch {
      setStepTask("error");
    }

    setIsExecutingAll(false);
    showToast("Combined follow-up workflow executed successfully!", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chrome/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-modal-title"
        className="bg-surface w-full max-w-4xl rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand-deep">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 id="follow-up-modal-title" className="text-body font-bold text-ink">
                Follow up on this quote
              </h2>
              <p className="text-spec text-ink-dim">
                Check the email, save it to the customer's history, and set a reminder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-edge hover:bg-hover text-ink-dim hover:text-ink cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-meta text-ink">
          {/* Profile Incomplete Error Alert */}
          {profileValidationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-edge flex items-start gap-2.5 text-meta text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Your details are incomplete</p>
                <p className="text-spec text-red-700">{profileValidationError}</p>
              </div>
            </div>
          )}

          {/* Top Reviewed Workflow Summary Bar (P2-14) */}
          <div className="p-3 bg-brand/5 border border-brand/20 rounded-edge grid grid-cols-2 sm:grid-cols-4 gap-3 text-spec">
            <div>
              <span className="font-bold text-ink-dim uppercase block">Recipient</span>
              <span className="font-bold text-ink truncate block" title={contactEmail}>
                {contactName || "Customer"} ({contactEmail || "no email"})
              </span>
            </div>
            <div>
              <span className="font-bold text-ink-dim uppercase block">Account / Project</span>
              <span className="font-bold text-ink truncate block" title={`${companyName} — ${projectName}`}>
                {companyName || "Organisation"} • {projectName || "Tender"}
              </span>
            </div>
            <div>
              <span className="font-bold text-ink-dim uppercase block">Quote Reference</span>
              <span className="font-bold font-mono text-ink block">{quoteRef || "Pending Ref"}</span>
            </div>
            <div>
              <span className="font-bold text-ink-dim uppercase block">Scheduled Next Action</span>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="font-bold text-ink bg-surface border border-line rounded px-1.5 py-0.5 text-spec mt-0.5"
              />
            </div>
          </div>

          {/* Cadence Selector Tabs */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-1.5">When to follow up</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCadence("day7")}
                className={`min-h-[44px] p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                  cadence === "day7"
                    ? "bg-brand/10 border-brand text-brand-deep font-bold shadow-2xs"
                    : "bg-surface border-line hover:bg-hover text-ink-dim"
                }`}
              >
                <p className="font-bold text-meta">In one week</p>
                <p className="text-spec text-ink-dim line-clamp-1">Light check-in on the quote</p>
              </button>

              <button
                type="button"
                onClick={() => setCadence("day14")}
                className={`min-h-[44px] p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                  cadence === "day14"
                    ? "bg-brand/10 border-brand text-brand-deep font-bold shadow-2xs"
                    : "bg-surface border-line hover:bg-hover text-ink-dim"
                }`}
              >
                <p className="font-bold text-meta">In two weeks</p>
                <p className="text-spec text-ink-dim line-clamp-1">Offer technical help with the spec</p>
              </button>

              <button
                type="button"
                onClick={() => setCadence("urgent")}
                className={`min-h-[44px] p-2.5 rounded-edge border text-left cursor-pointer transition-all ${
                  cadence === "urgent"
                    ? "bg-brand/10 border-brand text-brand-deep font-bold shadow-2xs"
                    : "bg-surface border-line hover:bg-hover text-ink-dim"
                }`}
              >
                <p className="font-bold text-meta">Tender closing</p>
                <p className="text-spec text-ink-dim line-clamp-1">Urgent delivery schedule &amp; stock support</p>
              </button>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Subject Line</label>
              <input
                type="text"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                className="w-full p-2.5 bg-surface border border-line-strong rounded-edge text-body font-medium focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Message Body</label>
              <textarea
                rows={9}
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                className="w-full p-3 bg-surface border border-line-strong rounded-edge text-meta font-mono leading-relaxed focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          {/* Workflow Step Status Badges (P2-14) */}
          <div className="p-3 bg-paper border border-line rounded-edge flex flex-wrap items-center justify-between gap-2 text-spec">
            <span className="font-bold text-ink-dim uppercase">Progress:</span>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 font-bold ${
                stepEmail === "done" ? "text-emerald-700" : stepEmail === "error" ? "text-red-700" : "text-ink-dim"
              }`}>
                {stepEmail === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                <span>1. Email copied</span>
              </span>

              <span className={`inline-flex items-center gap-1 font-bold ${
                stepActivity === "done" ? "text-emerald-700" : stepActivity === "error" ? "text-red-700" : "text-ink-dim"
              }`}>
                {stepActivity === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>2. Saved to history</span>
              </span>

              <span className={`inline-flex items-center gap-1 font-bold ${
                stepTask === "done" ? "text-emerald-700" : stepTask === "error" ? "text-red-700" : "text-ink-dim"
              }`}>
                {stepTask === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                <span>3. Reminder set</span>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyEmail}
              disabled={Boolean(profileValidationError)}
              title={profileValidationError || "Copy email to clipboard"}
              className="px-3.5 py-2 text-meta font-bold rounded-edge border bg-surface hover:bg-hover text-ink border-line flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40"
            >
              <Copy className="w-3.5 h-3.5 text-ink-dim" />
              <span>{stepEmail === "done" ? "Copied ✓" : "Copy Email Text"}</span>
            </button>

            <a
              href={profileValidationError ? "#" : mailtoUrl}
              target={profileValidationError ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (profileValidationError) {
                  e.preventDefault();
                  showToast(profileValidationError, "error");
                }
              }}
              className="px-3.5 py-2 text-meta font-bold rounded-edge border bg-surface hover:bg-hover text-ink border-line flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-ink-dim" />
              <span>Open in Outlook</span>
            </a>

            <button
              onClick={handleLogToCRM}
              className="px-3.5 py-2 text-meta font-bold rounded-edge border bg-surface hover:bg-hover text-ink border-line flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-ink-dim" />
              <span>Save to customer history</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Retry Buttons if individual step failed */}
            {stepActivity === "error" && (
              <button
                onClick={handleLogToCRM}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-spec rounded-edge cursor-pointer"
              >
                Try saving again
              </button>
            )}

            {stepTask === "error" && (
              <button
                onClick={handleScheduleTask}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-spec rounded-edge cursor-pointer"
              >
                Try the reminder again
              </button>
            )}

            {/*
              Disabled once every step has completed. It previously stayed
              enabled while reading "Workflow Completed", so a second press
              duplicated both the logged activity and the follow-up task.
            */}
            <button
              onClick={handleExecuteCombinedWorkflow}
              disabled={Boolean(profileValidationError) || isExecutingAll || isWorkflowComplete}
              className={`min-h-[44px] px-4 py-2 font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 ${
                isWorkflowComplete
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-brand-deep hover:bg-brand text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {isWorkflowComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sent and saved</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isExecutingAll ? "Saving…" : "Copy email, save and set reminder"}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-line hover:bg-line-strong text-meta font-medium rounded-edge cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
