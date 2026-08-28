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
  Save
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateCustomerFollowUpEmail } from "../utils/datasheetExporter";

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
    logActivity
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
  const [isLogged, setIsLogged] = useState(false);

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

  const handleCopyEmail = () => {
    if (profileValidationError) {
      showToast(profileValidationError, "error");
      return;
    }
    const fullText = `Subject: ${editableSubject}\n\n${editableBody}`;
    navigator.clipboard.writeText(fullText);
    showToast("Copied follow-up email to clipboard!", "success");
  };

  const handleLogToCRM = () => {
    const activityTitle = `Follow-Up Sent (${cadence === "day7" ? "Day 7 Check-in" : cadence === "day14" ? "Day 14 Technical Support" : "Urgent Tender Check-in"})`;
    
    if (dealId) {
      const deal = crmOpportunities.find((d) => d.id === dealId);
      if (deal) {
        updateCrmOpportunity(dealId, {
          latestActivity: activityTitle,
          latestActivityDate: new Date().toISOString().split("T")[0],
          nextAction: "Review customer response to follow-up",
          nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          ostendoQuoteRef: quoteRef || deal.ostendoQuoteRef
        });
      }
    }

    if (logActivity) {
      logActivity({
        id: `act-${Date.now()}`,
        type: "Email",
        title: activityTitle,
        description: `Subject: ${editableSubject}\nQuote Ref: ${quoteRef || "N/A"}\n\n${editableBody.substring(0, 150)}...`,
        accountId: accountId || "acc-1",
        opportunityId: dealId,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
        performedBy: currentUser.name,
        outcome: "Follow-up email dispatched to client"
      });
    }

    setIsLogged(true);
    showToast("Recorded follow-up activity to CRM timeline!", "success");
  };

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(editableSubject)}&body=${encodeURIComponent(editableBody)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-generator-title"
      className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-brand-deep" />
            <div>
              <h3 id="follow-up-generator-title" className="font-bold text-lg text-body">
                Customer Follow-Up Generator
              </h3>
              <p className="text-spec text-ink-dim">
                Tailored follow-up sequences referencing Ostendo ERP quotes and quoted Plasgain products.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-ink-faint hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-meta">
          
          {/* Cadence Preset Selector */}
          <div>
            <label className="block text-spec font-bold uppercase text-ink-dim mb-1.5">
              Select Follow-Up Cadence &amp; Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCadence("day7")}
                className={`p-3 rounded-edge border text-left transition-all cursor-pointer ${
                  cadence === "day7"
                    ? "bg-brand-wash border-brand text-brand-deep shadow-xs"
                    : "bg-paper border-line text-body hover:bg-raised"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-meta">
                  <Clock className="w-4 h-4 text-brand-deep" />
                  <span>Day 7 Check-in</span>
                </div>
                <p className="text-spec text-ink-dim mt-1">
                  Quote receipt verification, luminaire spec confirmation &amp; technical Q&amp;A.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCadence("day14")}
                className={`p-3 rounded-edge border text-left transition-all cursor-pointer ${
                  cadence === "day14"
                    ? "bg-brand-wash border-brand text-brand-deep shadow-xs"
                    : "bg-paper border-line text-body hover:bg-raised"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-meta">
                  <Sparkles className="w-4 h-4 text-brand-deep" />
                  <span>Day 14 Technical</span>
                </div>
                <p className="text-spec text-ink-dim mt-1">
                  Dialux photometric engineering support, AS 1158 report &amp; lead-time hold.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCadence("urgent")}
                className={`p-3 rounded-edge border text-left transition-all cursor-pointer ${
                  cadence === "urgent"
                    ? "bg-urgent-wash border-urgent text-urgent shadow-xs"
                    : "bg-paper border-line text-body hover:bg-raised"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-meta">
                  <AlertTriangle className="w-4 h-4 text-urgent" />
                  <span>Tender Closing</span>
                </div>
                <p className="text-spec text-ink-dim mt-1">
                  Urgent tender deadline check-in, complete spec sheet pack &amp; warranty statement.
                </p>
              </button>
            </div>
          </div>

          {/* Metadata Inputs */}
          <div className="bg-paper p-3.5 rounded-edge border border-line grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Rob Mitchell"
                className="w-full p-2 bg-white text-meta rounded-edge border border-line font-medium"
              />
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Company / Council</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ballarat City Council"
                className="w-full p-2 bg-white text-meta rounded-edge border border-line font-medium"
              />
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Shared Path Lighting"
                className="w-full p-2 bg-white text-meta rounded-edge border border-line font-medium"
              />
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-brand-deep mb-1">
                Ostendo Quote Ref
              </label>
              <input
                type="text"
                value={quoteRef}
                onChange={(e) => setQuoteRef(e.target.value)}
                placeholder="e.g. Q-8924"
                className="w-full p-2 bg-brand-wash text-meta rounded-edge border border-brand-edge font-bold text-brand-deep"
              />
            </div>
          </div>

          {profileValidationError ? (
            <div className="p-3 bg-red-50 border border-red-300 rounded-edge text-meta text-red-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Sender Profile Incomplete: </strong>
                <span>{profileValidationError}</span>
              </div>
            </div>
          ) : !currentUser.phone ? (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-edge text-spec text-amber-900 flex items-center justify-between">
              <span>
                <strong>Profile Tip:</strong> Direct phone number is not set in Settings. Your email address ({currentUser.email || "sales@plasgain.com.au"}) is used in the signature.
              </span>
            </div>
          ) : null}

          {/* Email Subject & Body Preview */}
          <div className="space-y-2">
            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Email Subject</label>
              <input
                type="text"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                className="w-full p-2 bg-white text-meta rounded-edge border border-line font-bold text-body"
              />
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-1">Formatted Message Body</label>
              <textarea
                rows={9}
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                className="w-full p-3 bg-white text-meta rounded-edge border border-line font-sans leading-relaxed text-body focus:ring-1 focus:ring-brand resize-y"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyEmail}
              disabled={Boolean(profileValidationError)}
              title={profileValidationError || "Copy email to clipboard"}
              className={`px-3.5 py-2 text-meta font-bold rounded-edge border flex items-center gap-1.5 shadow-2xs transition-colors ${
                profileValidationError
                  ? "bg-paper text-ink-faint border-line cursor-not-allowed"
                  : "bg-white hover:bg-raised text-body border-line cursor-pointer"
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-ink-dim" />
              <span>Copy Email Text</span>
            </button>

            <a
              href={profileValidationError ? "#" : mailtoUrl}
              target={profileValidationError ? "_self" : "_blank"}
              rel="noopener noreferrer"
              aria-disabled={Boolean(profileValidationError)}
              title={profileValidationError || "Open mail client"}
              onClick={(e) => {
                if (profileValidationError) {
                  e.preventDefault();
                  showToast(profileValidationError, "error");
                }
              }}
              className={`px-3.5 py-2 text-meta font-bold rounded-edge border flex items-center gap-1.5 shadow-2xs transition-colors ${
                profileValidationError
                  ? "bg-paper text-ink-faint border-line cursor-not-allowed pointer-events-none"
                  : "bg-paper hover:bg-raised text-body border-line cursor-pointer"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-ink-dim" />
              <span>Open in Outlook / Mail Client</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogToCRM}
              disabled={isLogged}
              className={`px-4 py-2 font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                isLogged
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-brand-deep hover:bg-brand text-white"
              }`}
            >
              {isLogged ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Logged to CRM</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Log Activity to CRM</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-line hover:bg-line-strong text-meta font-medium rounded-edge cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
