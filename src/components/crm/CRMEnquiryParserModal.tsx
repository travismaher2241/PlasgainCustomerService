import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Building2,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  FileText,
  Check,
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  CRMLead,
  EnquiryParseResult,
  LeadStatus,
  LeadScoreRating
} from "../../types/crm";
import {
  detectDuplicateAccount,
  detectDuplicateContact,
  detectDuplicateLead,
  detectDuplicateOpportunity,
  DuplicateMatchResult
} from "../../utils/duplicateDetector";

const SAMPLE_PRESETS = [
  {
    title: "Wyndham City Council (Tender Portal RFQ)",
    label: "Wyndham Council (14x Solar Trail)",
    text: `TENDER NOTICE: Wyndham City Council - Parks & Open Spaces
Reference: WCC-2026-T881
Attn: Tenders Committee
Contact: David Henderson (Senior Project Engineer, Infrastructure)
Email: d.henderson@wyndham.vic.gov.au | Phone: (03) 9742 0777
Location: Werribee River Trail Stage 2, Werribee VIC 3030

Requirement:
Supply and delivery of 14x integrated solar pathway lighting columns compliant with AS/NZS 1158.3.1 Category PP4.
Must include vandal-resistant composite poles or hot-dip galvanized root mount, minimum 5-day battery autonomy, and dusk-to-dawn dimming profiles.
Budgetary estimate: ~$65,000 AUD.
Submissions close: 2026-10-15 at 4:00 PM AEST.
Please submit technical compliance sheet and formal quotation prior to close date.`
  },
  {
    title: "BMD Constructions / Civil Contractor (Email RFQ)",
    label: "BMD Civil (28x Composite Poles)",
    text: `From: Sarah Jenkins <sjenkins@bmd.com.au>
To: sales@plasgain.com.au
Subject: RFQ: 28x Composite Light Poles - Bruce Highway Upgrade (Townsville QLD)
Date: 2026-09-08

Hi Sales Team,
We are currently pricing the Bruce Highway safety upgrade tender in North Queensland.
Can you please provide supply rates for 28 composite frp lighting poles (6m mounting height, direct burial, impact rated)?
Delivery required to our Bohle staging yard in Townsville QLD by end of November.
Need quotes by Friday 18th September. Call me on 0419 883 214 if you need engineering drawings.

Regards,
Sarah Jenkins
Senior Estimator | BMD Civil`
  },
  {
    title: "Wollongong City Council (Web Form Submission)",
    label: "Wollongong Council (8x Car Park)",
    text: `Enquiry via Web Form
Name: Mark Taylor (Facilities Manager)
Organisation: Wollongong City Council
Email: mtaylor@wollongong.nsw.gov.au
Phone: 02 4227 7111
Message:
We have an unlit commuter car park at North Wollongong Station requiring 8x standalone solar lighting systems to improve pedestrian security.
Looking for complete luminaire, solar engine, and pole assemblies. Looking to execute within next 2 months.
Can someone review site requirements and advise recommended solar engine wattage?`
  }
];

export const CRMEnquiryParserModal: React.FC = () => {
  const {
    enquiryParserModal,
    closeEnquiryParser,
    accounts,
    contacts,
    leads,
    opportunities,
    addLead,
    convertLead,
    currentUser,
    showToast,
    setSelectedAccountId,
    setSelectedOpportunityId
  } = useApp();

  const isOpen = Boolean(enquiryParserModal?.isOpen);
  const initialText = enquiryParserModal?.initialText || "";

  // Step state: "input" | "review"
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed structured result
  const [parseResult, setParseResult] = useState<EnquiryParseResult | null>(null);

  // Editable form fields
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactJobTitle, setContactJobTitle] = useState("");
  const [leadName, setLeadName] = useState("");
  const [enquiryType, setEnquiryType] = useState<CRMLead["enquiryType"]>("General");
  const [location, setLocation] = useState("");
  const [territory, setTerritory] = useState<CRMLead["territory"]>("National");
  const [quantity, setQuantity] = useState<string>("");
  const [productInterest, setProductInterest] = useState<string[]>([]);
  const [newProductInput, setNewProductInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [urgency, setUrgency] = useState<CRMLead["urgency"]>("Within 1 Month");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setRawText(initialText);
      setIsParsing(false);
      setParseError(null);
      setParseResult(null);
    }
  }, [isOpen, initialText]);

  // Duplicate Screening checks
  const duplicateWarnings = useMemo(() => {
    if (!isOpen || !company) return [];

    const warnings: Array<{
      type: "account" | "contact" | "lead" | "opportunity";
      confidence: string;
      reason: string;
      id: string;
      name: string;
    }> = [];

    // 1. Check duplicate account
    const accMatch = detectDuplicateAccount({ name: company }, accounts);
    if (accMatch && accMatch.confidence !== "NONE") {
      warnings.push({
        type: "account",
        confidence: accMatch.confidence,
        reason: accMatch.matchReason,
        id: accMatch.existingRecord.id,
        name: accMatch.existingRecord.name
      });
    }

    // 2. Check duplicate contact
    if (contactEmail || contactName) {
      const conMatch = detectDuplicateContact(
        {
          name: contactName.trim(),
          email: contactEmail,
          phone: contactPhone
        },
        contacts
      );
      if (conMatch && conMatch.confidence !== "NONE") {
        warnings.push({
          type: "contact",
          confidence: conMatch.confidence,
          reason: conMatch.matchReason,
          id: conMatch.existingRecord.id,
          name: `${conMatch.existingRecord.firstName} ${conMatch.existingRecord.lastName}`
        });
      }
    }

    // 3. Check duplicate open lead
    const leadMatch = detectDuplicateLead(
      {
        contactEmail,
        company,
        leadName
      },
      leads
    );
    if (leadMatch && leadMatch.confidence !== "NONE") {
      warnings.push({
        type: "lead",
        confidence: leadMatch.confidence,
        reason: leadMatch.matchReason,
        id: leadMatch.existingRecord.id,
        name: leadMatch.existingRecord.leadName
      });
    }

    // 4. Check duplicate opportunity
    const oppMatch = detectDuplicateOpportunity(
      {
        customerCompany: company,
        project: leadName
      },
      opportunities
    );
    if (oppMatch && oppMatch.confidence !== "NONE") {
      warnings.push({
        type: "opportunity",
        confidence: oppMatch.confidence,
        reason: oppMatch.matchReason,
        id: oppMatch.existingRecord.id,
        name: oppMatch.existingRecord.project
      });
    }

    return warnings;
  }, [isOpen, company, contactName, contactEmail, contactPhone, leadName, accounts, contacts, leads, opportunities]);

  // Handle parsing action
  const handleParseEnquiry = async () => {
    if (!rawText.trim()) {
      setParseError("Please enter or paste raw enquiry text first.");
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/crm/parse-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawEnquiryText: rawText.trim(),
          currentDate: new Date().toISOString().split("T")[0]
        })
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data: EnquiryParseResult = await res.json();
      setParseResult(data);

      // Hydrate editable state
      setCompany(data.company?.value || "Unknown Company");
      setContactName(data.contact?.name || "");
      setContactEmail(data.contact?.email || "");
      setContactPhone(data.contact?.phone || "");
      setContactJobTitle(data.contact?.jobTitle || "");
      setLeadName(data.project?.leadName || "New Inbound Enquiry");
      setEnquiryType(data.project?.enquiryType || "General");
      setLocation(data.project?.location || "");
      setTerritory(data.project?.territory || "National");
      setQuantity(data.scope?.quantity != null ? String(data.scope.quantity) : "");
      setProductInterest(Array.isArray(data.scope?.productInterest) ? data.scope.productInterest : []);
      setDeadline(data.commercial?.deadline || "");
      setUrgency(data.commercial?.urgency || "Within 1 Month");
      setEstimatedValue(data.commercial?.estimatedValue != null ? String(data.commercial.estimatedValue) : "");
      setNextAction(data.nextAction?.action || "Review specifications and prepare quotation");
      setNextActionDate(data.nextAction?.date || new Date().toISOString().split("T")[0]);
      setNotes(data.summaryNotes || rawText.slice(0, 300));

      setStep("review");
    } catch (err: any) {
      console.error("[CRMEnquiryParserModal] Error parsing enquiry:", err);
      setParseError(err?.message || "Failed to parse enquiry text. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddProduct = () => {
    const trimmed = newProductInput.trim();
    if (trimmed && !productInterest.includes(trimmed)) {
      setProductInterest([...productInterest, trimmed]);
      setNewProductInput("");
    }
  };

  const handleRemoveProduct = (index: number) => {
    setProductInterest(productInterest.filter((_, idx) => idx !== index));
  };

  // Helper to build CRMLead object from current staged edits
  const buildLeadRecord = (): CRMLead => {
    const leadId = `lead-${Date.now()}`;
    const numericEstValue = Number(estimatedValue.replace(/[^0-9.]/g, "")) || 0;
    const numericQty = quantity ? parseInt(quantity, 10) : undefined;

    return {
      id: leadId,
      leadName: leadName.trim() || "Inbound Solar Enquiry",
      contactName: contactName.trim() || "Unknown Contact",
      contactEmail: contactEmail.trim() || "unassigned@plasgain.com.au",
      contactPhone: contactPhone.trim() || undefined,
      company: company.trim() || "Unknown Company",
      source: "Email Inbound",
      enquiryType,
      productInterest: productInterest.length > 0 ? productInterest : [enquiryType],
      estimatedValue: numericEstValue,
      estimatedValueBasis: parseResult?.commercial?.estimatedValueBasis || "Estimate",
      territory,
      assignedSalesperson: currentUser.name,
      leadStatus: "New",
      leadScore: 75,
      leadScoreRating: "Warm",
      scoringFactors: [
        {
          factor: "AI Structured Ingestion",
          scoreDelta: 25,
          reason: "Comprehensive tender/RFQ parsed with phrase-level attribution"
        }
      ],
      urgency,
      location: location.trim(),
      notes: `${notes.trim()}\n\n--- Inbound Raw Text ---\n${rawText}`,
      dateReceived: new Date().toISOString().split("T")[0],
      lastActivity: "Parsed from raw inbound enquiry with AI attribution",
      lastActivityDate: new Date().toISOString().split("T")[0],
      nextAction: nextAction.trim() || "Prepare preliminary quotation",
      nextActionDate: nextActionDate || new Date().toISOString().split("T")[0],
      qualificationInfo: {
        hasBudget: urgency !== "Budgetary / Exploratory",
        hasAuthority: Boolean(contactJobTitle),
        hasDefiniteNeed: Boolean(quantity),
        hasTimeline: Boolean(deadline)
      },
      rawEnquiry: rawText,
      rawEnquiryText: rawText,
      enquiryDeadline: deadline.trim() || undefined,
      quantity: numericQty,
      isAiAssisted: true
    };
  };

  // Save as Lead
  const handleSaveAsLead = () => {
    const lead = buildLeadRecord();
    addLead(lead);
    closeEnquiryParser();
  };

  // Save as Lead & Convert to Deal Directly
  const handleSaveAndConvert = () => {
    const lead = buildLeadRecord();
    addLead(lead);

    try {
      const { oppId, accountId } = convertLead(lead.id);
      if (accountId) setSelectedAccountId(accountId);
      if (oppId) setSelectedOpportunityId(oppId);
      showToast(`Created lead and converted to deal "${lead.leadName}"`, "success");
    } catch (err: any) {
      console.error("[CRMEnquiryParserModal] Error converting lead:", err);
      showToast("Created lead, but failed to auto-convert to opportunity", "warning");
    }

    closeEnquiryParser();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-parser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-line w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-paper shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-deep text-white rounded-edge shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="enquiry-parser-title" className="text-base sm:text-lg font-bold text-body flex items-center gap-2">
                <span>Inbound Enquiry to Lead</span>
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep border border-brand-edge">
                  Feature 02
                </span>
              </h2>
              <p className="text-xs text-ink-dim">
                {step === "input"
                  ? "Paste tender notice, email, or web form RFQ. AI extracts structured fields with phrase provenance."
                  : "Review proposed lead fields, verify phrase snippets, and screen for duplicates before saving."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeEnquiryParser}
            className="p-1.5 text-ink-dim hover:text-body rounded-edge hover:bg-line transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: INPUT */}
          {step === "input" && (
            <div className="space-y-4">
              {/* Presets Row */}
              <div>
                <label className="block text-xs font-bold text-ink-dim uppercase tracking-wider mb-2">
                  Sample Inbound Presets (Click to Test)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRawText(preset.text)}
                      className="px-2.5 py-1.5 rounded-edge border border-line bg-white hover:bg-brand-wash hover:border-brand-edge text-xs font-semibold text-body transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-deep" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="raw-enquiry-input" className="text-xs font-bold text-ink uppercase tracking-wider">
                    Raw Enquiry Text / Tender Notice
                  </label>
                  <span className="text-[11px] text-ink-dim">
                    {rawText.length > 0 ? `${rawText.length} characters` : "Paste email, RFQ, or tender"}
                  </span>
                </div>
                <textarea
                  id="raw-enquiry-input"
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste raw inbound email, tender specifications, or web form message here...&#10;&#10;e.g. 'Tender Notice: Wyndham City Council requires 14x solar pathway lighting columns. Submissions close Oct 15. Contact David Henderson at d.henderson@wyndham.vic.gov.au...'"
                  className="w-full px-3.5 py-2.5 rounded-edge border border-line bg-white text-body text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all font-mono leading-relaxed"
                />
              </div>

              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-edge text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Notice */}
              <div className="p-3 bg-brand-wash/60 border border-brand-edge rounded-edge flex items-start gap-2.5 text-xs text-body">
                <Sparkles className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-brand-deep">Phrase Attribution & Provenance Guarantee:</span>
                  <p className="text-ink-dim">
                    The parser extracts company, contact, scope, quantity, and deadline with exact quote snippets so you can review the AI's provenance without re-reading the entire tender document.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & STAGED DIFF */}
          {step === "review" && parseResult && (
            <div className="space-y-5">
              {/* DUPLICATE DETECTION WARNINGS */}
              {duplicateWarnings.length > 0 && (
                <div className="p-4 rounded-panel bg-amber-50 border border-amber-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Potential CRM Duplicate Detected ({duplicateWarnings.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {duplicateWarnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-amber-800 flex items-start gap-2 bg-white/80 p-2.5 rounded-edge border border-amber-200/60"
                      >
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-amber-200 text-amber-900 shrink-0">
                          {warn.confidence}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-body">{warn.reason}</p>
                          <p className="text-ink-dim text-[11px] mt-0.5">
                            Matching record: <strong className="text-body">{warn.name}</strong> ({warn.type})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-700 italic">
                    You can still create this lead as a new sub-project or variant, or merge context later.
                  </p>
                </div>
              )}

              {/* CARD: PROPOSED STRUCTURED LEAD */}
              <div className="bg-white rounded-panel border border-line shadow-2xs p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-deep" />
                    <h3 className="text-sm font-bold text-body uppercase tracking-wider">
                      Proposed Structured Lead
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    AI Attributed
                  </span>
                </div>

                {/* Lead Title & Enquiry Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-body mb-1">
                      Lead Title
                    </label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep font-semibold"
                    />
                    {parseResult.project?.sourcePhrase && (
                      <div className="text-[11px] text-ink-dim mt-1 flex items-center gap-1">
                        <span className="font-semibold text-brand-deep">Quote:</span>
                        <span className="italic truncate">"{parseResult.project.sourcePhrase}"</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1">
                      Enquiry Type
                    </label>
                    <select
                      value={enquiryType}
                      onChange={(e) => setEnquiryType(e.target.value as CRMLead["enquiryType"])}
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                    >
                      <option value="Solar Pathway Lighting">Solar Pathway Lighting</option>
                      <option value="Roadway & Streetlight">Roadway & Streetlight</option>
                      <option value="Car Park & Area">Car Park & Area</option>
                      <option value="CCTV & Security">CCTV & Security</option>
                      <option value="Composite Poles">Composite Poles</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                {/* Company & Territory */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-body mb-1">
                      Purchasing Company / Council
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep font-semibold"
                    />
                    {parseResult.company?.sourcePhrase && (
                      <div className="text-[11px] text-ink-dim mt-1 flex items-center gap-1">
                        <span className="font-semibold text-brand-deep">Quote:</span>
                        <span className="italic truncate">"{parseResult.company.sourcePhrase}"</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1">
                      Territory
                    </label>
                    <select
                      value={territory}
                      onChange={(e) => setTerritory(e.target.value as CRMLead["territory"])}
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                    >
                      <option value="VIC/TAS">VIC/TAS</option>
                      <option value="NSW/ACT">NSW/ACT</option>
                      <option value="QLD/NT">QLD/NT</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="National">National</option>
                    </select>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="p-3 bg-paper rounded-edge border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-body">
                      <User className="w-3.5 h-3.5 text-brand-deep" />
                      <span>Contact Details</span>
                    </div>
                    {parseResult.contact?.sourcePhrase && (
                      <div className="text-[10px] text-ink-dim italic truncate max-w-xs">
                        Source: "{parseResult.contact.sourcePhrase}"
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-ink-dim mb-0.5">Contact Name</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-edge border border-line bg-white text-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-dim mb-0.5">Job Title</label>
                      <input
                        type="text"
                        value={contactJobTitle}
                        onChange={(e) => setContactJobTitle(e.target.value)}
                        placeholder="e.g. Senior Project Engineer"
                        className="w-full px-2.5 py-1.5 rounded-edge border border-line bg-white text-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-dim mb-0.5">Email Address</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" />
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-edge border border-line bg-white text-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-dim mb-0.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" />
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="e.g. (03) 9742 0777"
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-edge border border-line bg-white text-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scope & Commercials */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-body mb-1">
                      Quantity (Units / Poles)
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 14"
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep font-semibold"
                    />
                    {parseResult.scope?.sourcePhrase && (
                      <div className="text-[11px] text-ink-dim mt-1 truncate italic">
                        Quote: "{parseResult.scope.sourcePhrase}"
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1">
                      Submission Deadline
                    </label>
                    <input
                      type="text"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="e.g. 2026-10-15"
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep font-semibold"
                    />
                    {parseResult.commercial?.sourcePhrase && (
                      <div className="text-[11px] text-ink-dim mt-1 truncate italic">
                        Quote: "{parseResult.commercial.sourcePhrase}"
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1">
                      Estimated Value ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        placeholder="e.g. 65000"
                        className="w-full pl-7 pr-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Interests Tags */}
                <div>
                  <label className="block text-xs font-semibold text-body mb-1">
                    Products & Models
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {productInterest.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-edge bg-brand-wash border border-brand-edge text-xs font-semibold text-brand-deep"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newProductInput}
                        onChange={(e) => setNewProductInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddProduct();
                          }
                        }}
                        placeholder="Add product..."
                        className="px-2 py-1 rounded-edge border border-line bg-white text-xs text-body focus:outline-none focus:ring-1 focus:ring-brand-deep w-32"
                      />
                      <button
                        type="button"
                        onClick={handleAddProduct}
                        className="px-2 py-1 rounded-edge bg-line hover:bg-ink-faint/30 text-xs font-semibold text-body cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Next Action & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-body mb-1">
                      Next Sales Action
                    </label>
                    <input
                      type="text"
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                    />
                    {parseResult.nextAction?.sourcePhrase && (
                      <div className="text-[11px] text-ink-dim mt-1 truncate italic">
                        Quote: "{parseResult.nextAction.sourcePhrase}"
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1">
                      Action Due Date
                    </label>
                    <input
                      type="date"
                      value={nextActionDate}
                      onChange={(e) => setNextActionDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-edge border border-line bg-white text-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                    />
                  </div>
                </div>

                {/* Technical / Engineering Notes */}
                <div>
                  <label className="block text-xs font-semibold text-body mb-1">
                    Summary Notes & Technical Constraints
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-edge border border-line bg-white text-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-line bg-paper flex items-center justify-between shrink-0">
          {step === "input" ? (
            <>
              <button
                type="button"
                onClick={closeEnquiryParser}
                className="px-4 py-2 rounded-edge border border-line bg-white hover:bg-line text-xs sm:text-spec font-semibold text-body transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleParseEnquiry}
                disabled={isParsing || !rawText.trim()}
                className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white text-xs sm:text-spec font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isParsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Extracting Structured Lead...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Structured Lead</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="px-3.5 py-2 rounded-edge border border-line bg-white hover:bg-line text-xs sm:text-spec font-semibold text-body transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink-dim" />
                <span>Back / Edit Raw Text</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAsLead}
                  className="px-4 py-2 rounded-edge border border-brand-deep bg-white hover:bg-brand-wash text-brand-deep text-xs sm:text-spec font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Lead</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndConvert}
                  className="px-4 py-2 rounded-edge bg-brand-deep hover:bg-brand text-white text-xs sm:text-spec font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Create & Convert to Deal</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
