import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Mail,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Send,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Building2,
  FolderGit2,
  User,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  FileText,
  Check
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  EmailComposerMode,
  AIEmailResearchResult,
  ResearchConfirmedFact,
  ResearchInference,
  ResearchPlasgainRelevance,
  ResearchSourceItem
} from "../types/crm";

export interface AIEmailComposerModalProps {
  // Modal mounts globally, state driven by AppContext
}

export const AIEmailComposerModal: React.FC<AIEmailComposerModalProps> = () => {
  const {
    isEmailComposerOpen,
    emailComposerLaunchContext,
    closeEmailComposer,
    currentUser,
    accounts,
    contacts,
    leads,
    crmOpportunities,
    logActivity,
    showToast
  } = useApp();

  // Mode & Form Inputs
  const [mode, setMode] = useState<EmailComposerMode>("cold-outreach");
  const [researchSubject, setResearchSubject] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("Introduce Plasgain");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [showAdditionalInstructions, setShowAdditionalInstructions] = useState(false);

  // Recipient Fields
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");

  // Loading & Stepper Progress
  const [isResearching, setIsResearching] = useState(false);
  const [researchStepIndex, setResearchStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Research Result & Editable Draft
  const [researchResult, setResearchResult] = useState<AIEmailResearchResult | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [isRefining, setIsRefining] = useState(false);

  // Mark as sent confirmation state
  const [showMarkSentConfirm, setShowMarkSentConfirm] = useState(false);

  const PROGRESS_STEPS = [
    "Reviewing CRM context & internal data",
    "Researching public web sources & project facts",
    "Identifying likely lighting opportunities",
    "Matching Plasgain engineering capabilities",
    "Drafting consultative sales email"
  ];

  // Resolve Context when modal opens
  useEffect(() => {
    if (!isEmailComposerOpen) {
      // Reset state on close
      setResearchResult(null);
      setErrorMsg(null);
      return;
    }

    const ctx = emailComposerLaunchContext;
    const initialMode: EmailComposerMode = ctx?.defaultMode || "cold-outreach";
    setMode(initialMode);

    // Determine initial subject
    let initialSubject =
      ctx?.projectName ||
      ctx?.companyName ||
      ctx?.companyWebsite ||
      ctx?.projectUrl ||
      "";
    setResearchSubject(initialSubject);

    // Outcomes
    if (ctx?.desiredOutcome) {
      setDesiredOutcome(ctx.desiredOutcome);
    } else if (initialMode === "project-enquiry") {
      setDesiredOutcome("Ask about the lighting package");
    } else {
      setDesiredOutcome("Introduce Plasgain");
    }

    // Resolve Contacts for account
    const accountContacts = ctx?.accountId
      ? contacts.filter((c) => c.accountId === ctx.accountId)
      : [];

    let targetContact = accountContacts.find((c) => c.id === ctx?.contactId) || accountContacts[0];

    if (targetContact) {
      setSelectedContactId(targetContact.id);
      setRecipientName(`${targetContact.firstName} ${targetContact.lastName}`);
      setRecipientEmail(targetContact.email || "");
      setRecipientRole(targetContact.jobTitle || targetContact.roleInBuyingProcess || "");
      setRecipientCompany(ctx?.companyName || "");
    } else {
      setSelectedContactId(ctx?.contactId || "");
      setRecipientName(ctx?.contactName || "");
      setRecipientEmail(ctx?.contactEmail || "");
      setRecipientRole(ctx?.contactRole || "");
      setRecipientCompany(ctx?.companyName || "");
    }

    setAdditionalInstructions("");
    setShowAdditionalInstructions(false);
  }, [isEmailComposerOpen, emailComposerLaunchContext, contacts]);

  // Handle contact selector change
  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const found = contacts.find((c) => c.id === contactId);
    if (found) {
      setRecipientName(`${found.firstName} ${found.lastName}`);
      setRecipientEmail(found.email || "");
      setRecipientRole(found.jobTitle || found.roleInBuyingProcess || "");
    }
  };

  // Associated account contacts if account context exists
  const associatedContacts = useMemo(() => {
    if (!emailComposerLaunchContext?.accountId) return [];
    return contacts.filter((c) => c.accountId === emailComposerLaunchContext.accountId);
  }, [emailComposerLaunchContext?.accountId, contacts]);

  // Sender profile validation
  const profileWarning = useMemo(() => {
    if (!currentUser?.name || !currentUser?.email) {
      return "Your profile sender name or email is incomplete in Settings. Emails will be generated with standard Plasgain signature.";
    }
    return null;
  }, [currentUser]);

  // Word count & Char count
  const draftMetrics = useMemo(() => {
    const words = emailBody.trim().split(/\s+/).filter(Boolean).length;
    const chars = emailBody.length;
    return { words, chars };
  }, [emailBody]);

  // Execute Stage 2 & 3: Research and Draft
  const handleResearchAndDraft = async () => {
    if (!researchSubject.trim()) {
      setErrorMsg("Please provide a company name, website, project name, or URL to research.");
      return;
    }

    setIsResearching(true);
    setErrorMsg(null);
    setResearchStepIndex(0);

    // Progress stepper interval
    const stepTimer = setInterval(() => {
      setResearchStepIndex((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1400);

    try {
      const payload = {
        mode,
        researchSubject: researchSubject.trim(),
        desiredOutcome,
        recipient: {
          name: recipientName.trim() || undefined,
          email: recipientEmail.trim() || undefined,
          role: recipientRole.trim() || undefined,
          company: recipientCompany.trim() || undefined
        },
        crmContext: {
          accountId: emailComposerLaunchContext?.accountId,
          contactId: selectedContactId || emailComposerLaunchContext?.contactId,
          leadId: emailComposerLaunchContext?.leadId,
          opportunityId: emailComposerLaunchContext?.opportunityId,
          companyName: recipientCompany || emailComposerLaunchContext?.companyName,
          companyWebsite: emailComposerLaunchContext?.companyWebsite,
          projectName: emailComposerLaunchContext?.projectName,
          projectLocation: emailComposerLaunchContext?.projectLocation,
          projectUrl: emailComposerLaunchContext?.projectUrl,
          projectNotes: emailComposerLaunchContext?.projectNotes,
          customerSegment: emailComposerLaunchContext?.customerSegment,
          industry: emailComposerLaunchContext?.industry,
          territory: emailComposerLaunchContext?.territory,
          enquiryType: emailComposerLaunchContext?.enquiryType,
          productsQuoted: emailComposerLaunchContext?.productsQuoted,
          recentActivities: emailComposerLaunchContext?.recentActivities
        },
        additionalInstructions: additionalInstructions.trim() || undefined,
        userProfile: currentUser
          ? {
              name: currentUser.name,
              role: currentUser.role,
              email: currentUser.email,
              phone: currentUser.phone
            }
          : undefined
      };

      const res = await fetch("/api/email/research-and-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Server returned ${res.status}`);
      }

      const data: AIEmailResearchResult = await res.json();
      setResearchResult(data);
      setSubjectOptions(data.draft?.subjectOptions || [data.draft?.selectedSubject || ""]);
      setSelectedSubject(data.draft?.selectedSubject || data.draft?.subjectOptions?.[0] || "");
      setEmailBody(data.draft?.body || "");

      // Log CRM activity: AI draft prepared
      logActivity({
        type: "email",
        title: "AI email draft prepared",
        description: `Mode: ${mode} | Subject: "${data.draft?.selectedSubject}" | Research Status: ${data.researchStatus}`,
        performedBy: currentUser.name,
        accountId: emailComposerLaunchContext?.accountId,
        opportunityId: emailComposerLaunchContext?.opportunityId,
        contactId: selectedContactId || emailComposerLaunchContext?.contactId
      });

      showToast("AI research completed & email drafted!", "success");
    } catch (err: any) {
      console.error("AI research & draft failed:", err);
      setErrorMsg(err.message || "Failed to research and draft email. Please try again.");
    } finally {
      clearInterval(stepTimer);
      setIsResearching(false);
    }
  };

  // Tone & Length Refinements
  const handleRefine = async (refineAction: "shorter" | "warmer" | "technical" | "regenerate") => {
    if (!emailBody.trim() || isRefining) return;

    setIsRefining(true);
    try {
      const payload = {
        currentDraft: {
          subject: selectedSubject,
          body: emailBody
        },
        refineAction,
        researchSummary: researchResult?.researchSummary,
        userProfile: currentUser
          ? {
              name: currentUser.name,
              role: currentUser.role,
              email: currentUser.email,
              phone: currentUser.phone
            }
          : undefined,
        recipientName,
        companyOrProject: researchSubject
      };

      const res = await fetch("/api/email/refine-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to refine draft");
      }

      const data = await res.json();
      if (data.body) {
        setEmailBody(data.body);
        if (data.selectedSubject) setSelectedSubject(data.selectedSubject);
        if (data.subjectOptions?.length) setSubjectOptions(data.subjectOptions);
        showToast(`Draft refined (${refineAction})`, "info");
      }
    } catch (err: any) {
      console.error("Refine failed:", err);
      showToast(err.message || "Could not refine draft", "error");
    } finally {
      setIsRefining(false);
    }
  };

  // Copy Email Action
  const handleCopyEmail = async () => {
    const fullText = `Subject: ${selectedSubject}\n\n${emailBody}`;
    try {
      await navigator.clipboard.writeText(fullText);

      // Log CRM activity
      logActivity({
        type: "email",
        title: "AI email copied",
        description: `Subject: "${selectedSubject}" copied to clipboard`,
        performedBy: currentUser.name,
        accountId: emailComposerLaunchContext?.accountId,
        opportunityId: emailComposerLaunchContext?.opportunityId,
        contactId: selectedContactId || emailComposerLaunchContext?.contactId
      });

      showToast("Email copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  };

  // Open in Outlook Mailto Action
  const handleOpenOutlook = () => {
    const to = recipientEmail ? encodeURIComponent(recipientEmail) : "";
    const subject = encodeURIComponent(selectedSubject);
    const body = encodeURIComponent(emailBody);
    const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;

    // Log CRM activity
    logActivity({
      type: "email",
      title: "AI email opened in Outlook",
      description: `Subject: "${selectedSubject}" opened in default mail client`,
      performedBy: currentUser.name,
      accountId: emailComposerLaunchContext?.accountId,
      opportunityId: emailComposerLaunchContext?.opportunityId,
      contactId: selectedContactId || emailComposerLaunchContext?.contactId
    });

    showToast("Opening Outlook / email client...", "info");
  };

  // Save as Draft Activity Action
  const handleSaveDraftActivity = () => {
    logActivity({
      type: "email",
      title: "AI email draft prepared",
      description: `Subject: ${selectedSubject}\n\n${emailBody}`,
      performedBy: currentUser.name,
      accountId: emailComposerLaunchContext?.accountId,
      opportunityId: emailComposerLaunchContext?.opportunityId,
      contactId: selectedContactId || emailComposerLaunchContext?.contactId
    });

    showToast("Email draft saved to CRM activity log!", "success");
    closeEmailComposer();
  };

  // Explicit Mark as Sent Action
  const handleConfirmMarkSent = () => {
    logActivity({
      type: "email",
      title: "Email sent (AI Draft)",
      description: `Sent to: ${recipientEmail || recipientName}\nSubject: ${selectedSubject}\n\n${emailBody}`,
      performedBy: currentUser.name,
      accountId: emailComposerLaunchContext?.accountId,
      opportunityId: emailComposerLaunchContext?.opportunityId,
      contactId: selectedContactId || emailComposerLaunchContext?.contactId
    });

    showToast("Email marked as sent and logged in CRM!", "success");
    setShowMarkSentConfirm(false);
    closeEmailComposer();
  };

  if (!isEmailComposerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-chrome/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-email-composer-title"
        className="bg-surface w-full max-w-5xl rounded-frame border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-wash border border-brand-edge flex items-center justify-center text-brand-deep">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ai-email-composer-title" className="text-body font-bold text-ink">
                  AI Sales Email Composer
                </h2>
              </div>
              <p className="text-spec text-ink-dim">
                Research organisations &amp; tenders, determine sales angles, and draft consultative Australian English emails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeEmailComposer}
            aria-label="Close AI Email Composer"
            className="p-1.5 rounded-edge hover:bg-hover text-ink-dim hover:text-ink cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-meta text-ink flex-1">
          {/* Profile Incomplete Warning */}
          {profileWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-edge flex items-start gap-2.5 text-meta text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-900">Notice: </span>
                <span>{profileWarning}</span>
              </div>
            </div>
          )}

          {/* CRM Context Banner if launched contextually */}
          {emailComposerLaunchContext && (
            <div className="p-3 bg-brand/5 border border-brand/20 rounded-edge flex flex-wrap items-center justify-between gap-3 text-spec">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-brand-deep flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Using CRM Context:
                </span>
                {emailComposerLaunchContext.companyName && (
                  <span className="px-2 py-0.5 rounded bg-white border border-line text-ink font-semibold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-ink-dim" />
                    {emailComposerLaunchContext.companyName}
                  </span>
                )}
                {emailComposerLaunchContext.projectName && (
                  <span className="px-2 py-0.5 rounded bg-white border border-line text-ink font-semibold flex items-center gap-1">
                    <FolderGit2 className="w-3 h-3 text-ink-dim" />
                    {emailComposerLaunchContext.projectName}
                  </span>
                )}
                {emailComposerLaunchContext.territory && (
                  <span className="px-2 py-0.5 rounded bg-white border border-line text-ink-dim">
                    {emailComposerLaunchContext.territory}
                  </span>
                )}
                {emailComposerLaunchContext.customerSegment && (
                  <span className="px-2 py-0.5 rounded bg-white border border-line text-ink-dim">
                    {emailComposerLaunchContext.customerSegment}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STAGE 1: Minimal Inputs */}
          <div className="space-y-4 bg-paper p-4 rounded-edge border border-line">
            {/* Mode Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("cold-outreach")}
                className={`p-3 rounded-edge border text-left cursor-pointer transition-all flex items-start gap-3 ${
                  mode === "cold-outreach"
                    ? "bg-white border-brand-deep shadow-xs ring-1 ring-brand-deep"
                    : "bg-surface border-line hover:border-line-strong text-ink-dim"
                }`}
              >
                <div className={`p-2 rounded-full mt-0.5 ${mode === "cold-outreach" ? "bg-brand-wash text-brand-deep" : "bg-paper text-ink-dim"}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-body text-ink">Cold Outreach</div>
                  <div className="text-spec text-ink-dim mt-0.5">
                    Prospecting councils, contractors &amp; consultants (80–130 words)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("project-enquiry")}
                className={`p-3 rounded-edge border text-left cursor-pointer transition-all flex items-start gap-3 ${
                  mode === "project-enquiry"
                    ? "bg-white border-brand-deep shadow-xs ring-1 ring-brand-deep"
                    : "bg-surface border-line hover:border-line-strong text-ink-dim"
                }`}
              >
                <div className={`p-2 rounded-full mt-0.5 ${mode === "project-enquiry" ? "bg-brand-wash text-brand-deep" : "bg-paper text-ink-dim"}`}>
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-body text-ink">Upcoming Project Enquiry</div>
                  <div className="text-spec text-ink-dim mt-0.5">
                    Targeting tenders, civil works &amp; lighting packages (100–170 words)
                  </div>
                </div>
              </button>
            </div>

            {/* Single Prominent Research Subject Input */}
            <div>
              <label htmlFor="research-subject-input" className="block text-meta font-bold text-ink mb-1">
                Who or what should AI research? <span className="text-urgent">*</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-dim absolute left-3 top-3" />
                <input
                  id="research-subject-input"
                  type="text"
                  value={researchSubject}
                  onChange={(e) => setResearchSubject(e.target.value)}
                  placeholder={
                    mode === "cold-outreach"
                      ? "e.g. BMD Group, City of Greater Geelong, Seymour Whyte, or website URL"
                      : "e.g. Western Sydney Airport Cargo Precinct, Bruce Highway Upgrade, or project tender URL"
                  }
                  className="w-full pl-9 pr-3 py-2 bg-white border border-line-strong rounded-edge text-meta text-ink placeholder:text-ink-faint focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                />
              </div>
              <p className="text-spec text-ink-dim mt-1">
                Enter an Australian company name, project name, or public URL. AI will research background and determine Plasgain's value angle.
              </p>
            </div>

            {/* Recipient & Desired Outcome Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Recipient Selector / Name */}
              <div>
                <label className="block text-spec font-bold text-ink-dim mb-1">
                  Recipient Contact
                </label>
                {associatedContacts.length > 1 ? (
                  <select
                    value={selectedContactId}
                    onChange={(e) => handleContactSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-line rounded-edge text-meta text-ink outline-none mb-1.5"
                  >
                    <option value="">-- Choose Account Contact --</option>
                    {associatedContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.jobTitle || c.roleInBuyingProcess || "Contact"}) - {c.email || "No email"}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient name (optional)"
                    className="px-2.5 py-1.5 bg-white border border-line rounded-edge text-meta text-ink outline-none"
                  />
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Recipient email (optional)"
                    className="px-2.5 py-1.5 bg-white border border-line rounded-edge text-meta text-ink outline-none"
                  />
                </div>
              </div>

              {/* Desired Outcome Selector */}
              <div>
                <label htmlFor="desired-outcome-select" className="block text-spec font-bold text-ink-dim mb-1">
                  Desired Outcome
                </label>
                <select
                  id="desired-outcome-select"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-line rounded-edge text-meta text-ink outline-none"
                >
                  <option value="Introduce Plasgain">Introduce Plasgain</option>
                  <option value="Arrange a short call">Arrange a short call</option>
                  <option value="Find the relevant decision-maker">Find the relevant decision-maker</option>
                  <option value="Ask about the lighting package">Ask about the lighting package</option>
                  <option value="Offer product/design assistance">Offer product/design assistance</option>
                </select>
              </div>
            </div>

            {/* Collapsible Additional Instructions */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdditionalInstructions(!showAdditionalInstructions)}
                className="text-spec font-semibold text-brand-deep hover:text-brand flex items-center gap-1 cursor-pointer"
              >
                {showAdditionalInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showAdditionalInstructions ? "Hide additional instructions" : "+ Add optional instructions / specifics"}</span>
              </button>
              {showAdditionalInstructions && (
                <div className="mt-2">
                  <textarea
                    rows={2}
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g. Emphasise frangible composite poles for coastal wind regions, or ask about solar pathway lighting for Stage 2..."
                    className="w-full p-2.5 bg-white border border-line rounded-edge text-meta text-ink outline-none focus:border-brand-deep"
                  />
                </div>
              )}
            </div>

            {/* Primary Action Button & Offline Templates Selector (P2) */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-spec font-bold text-ink-dim uppercase mr-1">Offline Templates:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject("Sustainable Public Lighting & Civil Cable Protection Solutions — Plasgain");
                    setSubjectOptions([
                      "Sustainable Public Lighting & Civil Cable Protection Solutions — Plasgain",
                      "Plasgain Lighting Engineering Schedules & Civil Protection",
                      "Introductory Call: Sustainable Infrastructure Solutions"
                    ]);
                    setEmailBody(
`Hi ${recipientName || "there"},

I noticed ${recipientCompany || researchSubject || "your team"}'s recent work across infrastructure and wanted to connect briefly regarding your upcoming public lighting and civil asset requirements.

Plasgain manufactures Australian-designed solar LED luminaires (AS/NZS 1158 Category P compliant), recycled composite light poles (non-conductive and rust-proof in C5 marine environments), and AS 4702 polymeric cable cover slabs that reduce manual handling weight by up to 98% compared to heavy precast concrete.

Are you open to a brief 10-minute introductory call next week to see how our engineering schedules could support your upcoming tenders?

Kind regards,
${currentUser?.name || "Plasgain Customer Service Team"}
Plasgain Australia`
                    );
                    showToast("Loaded Consultative Intro Template", "info");
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-raised text-ink text-spec font-semibold rounded border border-line cursor-pointer shadow-2xs transition-colors"
                >
                  Capability Intro
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject(`Technical Clarification & AS/NZS 1158 Compliance — ${researchSubject || "Tender"}`);
                    setSubjectOptions([
                      `Technical Clarification & AS/NZS 1158 Compliance — ${researchSubject || "Tender"}`,
                      `Engineering Take-Off & Lighting Schedule — ${researchSubject || "Project"}`,
                      `Alternative Compliant Specification: ${researchSubject || "Tender"}`
                    ]);
                    setEmailBody(
`Hi ${recipientName || "there"},

Regarding the public lighting and civil trenching schedule for ${researchSubject || "the project"}, we have conducted a preliminary engineering take-off against AS/NZS 1158.3.1 and AS 4702 standards.

We can provide certified DIALux photometric calculations and AS 1170.2 cyclonic wind foundation engineering packages for this submission.

Could you confirm the tender closing date and whether alternative Australian-engineered composite poles and solar fittings can be submitted as compliant options?

Kind regards,
${currentUser?.name || "Plasgain Technical Sales Team"}
Plasgain Australia`
                    );
                    showToast("Loaded Tender RFI Template", "info");
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-raised text-ink text-spec font-semibold rounded border border-line cursor-pointer shadow-2xs transition-colors"
                >
                  Tender RFI
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject(`Follow-Up: Quotation & Engineering Schedule — ${researchSubject || "Project"}`);
                    setSubjectOptions([
                      `Follow-Up: Quotation & Engineering Schedule — ${researchSubject || "Project"}`,
                      `Commercial Pricing & Technical Schedule Review`,
                      `Quotation Follow-Up — Plasgain Australia`
                    ]);
                    setEmailBody(
`Hi ${recipientName || "there"},

I'm following up on the formal pricing and product schedule we provided for ${researchSubject || "your project"}.

Please let us know if you or the engineering superintendent require any further technical documentation, IES photometric files, or AS 4702 compliance certificates to finalise the procurement review.

We look forward to partnering with your team on this rollout.

Kind regards,
${currentUser?.name || "Plasgain Commercial Team"}
Plasgain Australia`
                    );
                    showToast("Loaded Quote Follow-Up Template", "info");
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-raised text-ink text-spec font-semibold rounded border border-line cursor-pointer shadow-2xs transition-colors"
                >
                  Quote Follow-Up
                </button>
              </div>

              <button
                type="button"
                data-testid="research-and-draft-btn"
                onClick={handleResearchAndDraft}
                disabled={isResearching || !researchSubject.trim()}
                className="px-5 py-2.5 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isResearching ? "Researching & Drafting..." : "Research & Draft with AI"}</span>
              </button>
            </div>
          </div>

          {/* Error Message with Offline Fallback */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-meta text-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-900">AI Service Unavailable</div>
                  <div className="text-spec text-red-700 mt-0.5">{errorMsg}</div>
                </div>
              </div>
              <span className="text-spec font-bold text-red-900 bg-red-100 px-2.5 py-1 rounded shrink-0">
                Use Offline Templates Above
              </span>
            </div>
          )}

          {/* STAGE 2: Research Progress / Findings Stepper */}
          {isResearching && (
            <div className="p-4 bg-brand/5 border border-brand/20 rounded-edge space-y-3">
              <div className="flex items-center gap-2 text-meta font-bold text-brand-deep">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Live AI Research in Progress...</span>
              </div>
              <div className="space-y-2">
                {PROGRESS_STEPS.map((step, idx) => {
                  const isDone = idx < researchStepIndex;
                  const isCurrent = idx === researchStepIndex;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 text-spec">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-brand-deep border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-line bg-paper shrink-0" />
                      )}
                      <span className={isCurrent ? "font-bold text-ink" : isDone ? "text-ink-dim" : "text-ink-faint"}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 2: "What AI Found" Research Summary Panel */}
          {researchResult && !isResearching && (
            <div className="p-4 bg-raised rounded-edge border border-line space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-body text-ink">
                  <ShieldCheck className="w-4.5 h-4.5 text-brand-deep" />
                  <span>What AI Found &amp; Strategic Sales Angle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      researchResult.researchStatus === "complete"
                        ? "bg-brand-wash text-brand-deep border-brand-edge"
                        : researchResult.researchStatus === "partial"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-paper text-ink-dim border-line"
                    }`}
                  >
                    Research: {researchResult.researchStatus}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-paper border border-line text-ink-dim">
                    Confidence: {researchResult.researchSummary?.confidence || "medium"}
                  </span>
                </div>
              </div>

              {/* Recommended Sales Angle */}
              {researchResult.researchSummary?.recommendedSalesAngle && (
                <div className="p-2.5 bg-brand-wash/60 border border-brand-edge rounded text-spec">
                  <span className="font-bold text-brand-deep">Recommended Angle: </span>
                  <span className="text-ink">{researchResult.researchSummary.recommendedSalesAngle}</span>
                </div>
              )}

              {/* Grid of Confirmed, Inferences, Unknowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-spec">
                {/* Confirmed Facts */}
                <div className="p-3 bg-white rounded border border-line space-y-1.5">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Confirmed Facts ({researchResult.researchSummary?.confirmedFacts?.length || 0})
                  </div>
                  <ul className="space-y-1">
                    {researchResult.researchSummary?.confirmedFacts?.length ? (
                      researchResult.researchSummary.confirmedFacts.map((fact, i) => (
                        <li key={i} className="text-ink leading-snug">
                          • {fact.text}
                          {fact.sourceIds?.map((sid) => (
                            <span key={sid} className="ml-1 text-[10px] px-1 py-0.2 rounded bg-paper border border-line text-ink-dim font-mono">
                              [{sid}]
                            </span>
                          ))}
                        </li>
                      ))
                    ) : (
                      <li className="text-ink-faint italic">No specific public facts verified.</li>
                    )}
                  </ul>
                </div>

                {/* Inferences */}
                <div className="p-3 bg-white rounded border border-line space-y-1.5">
                  <div className="font-bold text-blue-800 flex items-center gap-1.5 uppercase text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    Likely Opportunities ({researchResult.researchSummary?.inferences?.length || 0})
                  </div>
                  <ul className="space-y-1">
                    {researchResult.researchSummary?.inferences?.length ? (
                      researchResult.researchSummary.inferences.map((inf, i) => (
                        <li key={i} className="text-ink leading-snug">
                          • {inf.text}{" "}
                          <span className="text-[10px] text-ink-faint">({inf.confidence} conf)</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-ink-faint italic">No inferences generated.</li>
                    )}
                  </ul>
                </div>

                {/* Unknowns */}
                <div className="p-3 bg-white rounded border border-line space-y-1.5">
                  <div className="font-bold text-amber-800 flex items-center gap-1.5 uppercase text-[11px]">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    Important Unknowns ({researchResult.researchSummary?.unknowns?.length || 0})
                  </div>
                  <ul className="space-y-1">
                    {researchResult.researchSummary?.unknowns?.length ? (
                      researchResult.researchSummary.unknowns.map((unk, i) => (
                        <li key={i} className="text-ink leading-snug">
                          • {unk}
                        </li>
                      ))
                    ) : (
                      <li className="text-ink-faint italic">No key unknowns flagged.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Plasgain Relevance */}
              {researchResult.researchSummary?.plasgainRelevance?.length > 0 && (
                <div className="p-2.5 bg-white rounded border border-line text-spec space-y-1">
                  <div className="font-bold text-ink-dim uppercase text-[11px]">Why Plasgain May Be Relevant</div>
                  <div className="flex flex-wrap gap-2">
                    {researchResult.researchSummary.plasgainRelevance.map((rel, i) => (
                      <div key={i} className="flex items-center gap-1 text-ink bg-paper px-2 py-1 rounded border border-line">
                        <span>• {rel.text}</span>
                        <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-brand-wash text-brand-deep">
                          {rel.basis}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Used */}
              {researchResult.sources?.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-2 text-spec text-ink-dim">
                  <span className="font-bold">Sources Used:</span>
                  {researchResult.sources.map((src) => (
                    <a
                      key={src.id}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-paper border border-line text-brand-deep hover:underline text-[11px]"
                      title={src.title}
                    >
                      <span>[{src.id}] {src.publisher || src.title}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: Editable Email Draft */}
          {researchResult && !isResearching && (
            <div className="space-y-4 bg-white p-4 rounded-edge border border-line">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h3 className="text-body font-bold text-ink flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-deep" />
                    <span>Editable Email Draft</span>
                  </h3>
                  <span className="text-spec text-ink-dim">
                    Australian English consultative draft. Adjust subject, edit body, or refine tone below.
                  </span>
                </div>
                <div className="text-spec text-ink-dim font-mono">
                  {draftMetrics.words} words · {draftMetrics.chars} chars
                </div>
              </div>

              {/* Subject Options Radio / Selector */}
              <div>
                <label className="block text-spec font-bold text-ink-dim mb-1">
                  Subject Line Options
                </label>
                <div className="space-y-1.5 mb-2">
                  {subjectOptions.map((subj, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded border text-meta cursor-pointer transition-colors ${
                        selectedSubject === subj
                          ? "bg-brand-wash/50 border-brand-deep font-semibold text-brand-deep"
                          : "bg-paper border-line text-ink hover:bg-raised"
                      }`}
                    >
                      <input
                        type="radio"
                        name="email-subject-option"
                        checked={selectedSubject === subj}
                        onChange={() => setSelectedSubject(subj)}
                        className="text-brand-deep focus:ring-brand-deep"
                      />
                      <span className="truncate">{subj}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="Custom email subject..."
                  className="w-full px-3 py-1.5 bg-paper border border-line rounded-edge text-meta font-semibold text-ink outline-none focus:border-brand-deep"
                />
              </div>

              {/* Email Body Textarea */}
              <div>
                <label className="block text-spec font-bold text-ink-dim mb-1">
                  Email Body
                </label>
                <textarea
                  rows={9}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email body draft..."
                  className="w-full p-3 bg-paper border border-line rounded-edge text-meta text-ink leading-relaxed font-sans outline-none focus:border-brand-deep focus:bg-white resize-y"
                />
              </div>

              {/* Tone / Refinement Toolbar */}
              <div className="p-2.5 bg-paper rounded-edge border border-line flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-spec font-semibold text-ink-dim">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Refine Draft:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRefine("shorter")}
                    disabled={isRefining}
                    className="px-2.5 py-1 text-spec font-bold bg-white hover:bg-raised text-body border border-line rounded-edge transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Make Shorter
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefine("warmer")}
                    disabled={isRefining}
                    className="px-2.5 py-1 text-spec font-bold bg-white hover:bg-raised text-body border border-line rounded-edge transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Make Warmer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefine("technical")}
                    disabled={isRefining}
                    className="px-2.5 py-1 text-spec font-bold bg-white hover:bg-raised text-body border border-line rounded-edge transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Make More Technical
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefine("regenerate")}
                    disabled={isRefining}
                    className="px-2.5 py-1 text-spec font-bold bg-brand-wash text-brand-deep border border-brand-edge rounded-edge hover:bg-brand-wash/80 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeEmailComposer}
              className="px-4 py-2 bg-white hover:bg-paper text-ink-dim hover:text-ink font-semibold text-meta rounded-edge border border-line cursor-pointer transition-colors"
            >
              Cancel
            </button>
            {researchResult && (
              <button
                type="button"
                onClick={handleSaveDraftActivity}
                className="px-3.5 py-2 bg-white hover:bg-paper text-body font-bold text-meta rounded-edge border border-line cursor-pointer transition-colors"
                title="Save draft to CRM activity history without opening or sending"
              >
                Save as Draft Activity
              </button>
            )}
          </div>

          {researchResult ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-3.5 py-2 bg-white hover:bg-paper text-body font-bold text-meta rounded-edge border border-line shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Email</span>
              </button>

              <button
                type="button"
                onClick={handleOpenOutlook}
                className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Open new email message in Outlook or default mail client"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Outlook</span>
              </button>

              {/* Explicit Mark as Sent with confirmation */}
              {!showMarkSentConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowMarkSentConfirm(true)}
                  className="px-3.5 py-2 bg-soon-wash text-soon hover:bg-soon-wash/80 border border-soon/30 font-bold text-meta rounded-edge flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Confirm that this email has already been sent to customer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Mark as Sent</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-soon-wash p-1 rounded-edge border border-soon/40">
                  <span className="text-spec font-bold text-soon px-1.5">Confirm sent?</span>
                  <button
                    type="button"
                    onClick={handleConfirmMarkSent}
                    className="px-2 py-1 bg-soon text-white text-spec font-bold rounded cursor-pointer hover:bg-soon/90"
                  >
                    Yes, Log Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMarkSentConfirm(false)}
                    className="px-1.5 py-1 text-ink-dim hover:text-ink text-spec cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResearchAndDraft}
              disabled={isResearching || !researchSubject.trim()}
              className="px-5 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isResearching ? "Researching..." : "Research and Draft"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
