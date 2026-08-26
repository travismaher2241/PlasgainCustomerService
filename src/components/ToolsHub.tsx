import React, { useState } from "react";
import {
  Wrench,
  FileText,
  ClipboardCheck,
  Search,
  PhoneCall,
  Edit3,
  Mail,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  Copy,
  Clock,
  Building,
  RotateCcw,
  ShieldCheck,
  Check
} from "lucide-react";
import { useApp, ToolSubTab } from "../context/AppContext";

export const ToolsHub: React.FC = () => {
  const {
    activeToolTab,
    setActiveToolTab,
    opportunities,
    selectedOpportunityId,
    setSelectedOpportunityId,
    products,
    showToast
  } = useApp();

  // Tool 1: Tender Analyser state
  const [tenderText, setTenderText] = useState(
    "Ballarat City Council Shared Path Upgrade — Section 4.3 Lighting Specification: Supply and installation of approx 32x standalone solar LED pathway luminaires along 1.2km path. Minimum 6m mounting height, powder-coated heritage green. Category P4 compliance to AS/NZS 1158.3.1. Minimum battery autonomy 4 nights. CCT 3000K maximum to protect wildlife. Tender closes 28th October."
  );
  const [tenderResult, setTenderResult] = useState<any | null>(null);
  const [isTenderLoading, setIsTenderLoading] = useState(false);

  // Tool 2: Quote Review state
  const [quoteEnquiryText, setQuoteEnquiryText] = useState(
    "Customer requested 24x 3000K solar pathway luminaires on 6m poles with 4 nights autonomy for Ballarat shared path."
  );
  const [quoteItemsText, setQuoteItemsText] = useState(
    "Item 1: 24x Plasgain Pro Blade 75W Solar Luminaire (4000K Cool White standard)\nItem 2: 24x 6m Galvanised Steel Direct-Burial Poles\nItem 3: Delivery to Ballarat depot"
  );
  const [quoteResult, setQuoteResult] = useState<any | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  // Tool 3: Customer Research state
  const [companyName, setCompanyName] = useState("ABC Civil Pty Ltd");
  const [location, setLocation] = useState("Ballarat / Western Victoria");
  const [researchResult, setResearchResult] = useState<any | null>(null);
  const [isResearchLoading, setIsResearchLoading] = useState(false);

  // Tool 4: Call Prep state
  const [callPrepResult, setCallPrepResult] = useState<any | null>(null);
  const [isCallPrepLoading, setIsCallPrepLoading] = useState(false);

  // Tool 5: Call Notes Processor state
  const [rawCallNotes, setRawCallNotes] = useState(
    "Spoke with Rob Mitchell from ABC Civil. Said the council is pushing for installation before Christmas. They are happy with 6m pole height but engineer asked if battery is in the ground or integrated on top. Warned them about shading from gum trees on west side. Need to send revised price with 3000K option by Friday."
  );
  const [callNotesResult, setCallNotesResult] = useState<any | null>(null);
  const [isNotesLoading, setIsNotesLoading] = useState(false);

  // Tool 6: Follow-Up state
  const [followUpStage, setFollowUpStage] = useState("Awaiting Information");
  const [followUpContext, setFollowUpContext] = useState("Waiting on confirmation of exact pole spacing and tree canopy shading from site engineer.");
  const [followUpResult, setFollowUpResult] = useState<any | null>(null);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  // Tool 7: Product Comparison state
  const [product1, setProduct1] = useState("Pro Blade 75W");
  const [product2, setProduct2] = useState("Solaris 80W");
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  const selectedOpp = opportunities.find((o) => o.id === selectedOpportunityId) || opportunities[0];

  const subTools: { id: ToolSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "tender-analyser", label: "Tender / RFQ Analyser", icon: FileText },
    { id: "quote-review", label: "Quote Reviewer", icon: ClipboardCheck },
    { id: "customer-research", label: "Customer Intelligence", icon: Search },
    { id: "call-prep", label: "Call Prep Brief", icon: PhoneCall },
    { id: "call-notes", label: "Call Notes to CRM", icon: Edit3 },
    { id: "follow-up", label: "Follow-Up Assistant", icon: Mail },
    { id: "product-comparison", label: "Product Comparison", icon: Scale }
  ];

  // Helper for safe JSON fetching
  const safeFetch = async (url: string, body: any) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(res.ok ? "Unexpected response format" : `Server returned ${res.status}: ${text.slice(0, 100)}`);
    }
    const data = await res.json();
    if (res.status === 503 && data?.degraded) {
      throw new Error(
        `AI unavailable — ${data.detail || "no analysis was generated."} ${data.guidance || ""}`.trim()
      );
    }
    if (!res.ok) {
      throw new Error(data.error || "Operation failed");
    }
    return data;
  };

  // Tool 1: Tender Analyser Action
  const handleAnalyzeTender = async () => {
    setIsTenderLoading(true);
    try {
      const data = await safeFetch("/api/tools/tender-analyze", { tenderText, projectName: "Tender Document Analysis" });
      setTenderResult(data);
      showToast("Tender requirements matrix extracted", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to analyze tender", "error");
    } finally {
      setIsTenderLoading(false);
    }
  };

  // Tool 2: Quote Review Action
  const handleReviewQuote = async () => {
    setIsQuoteLoading(true);
    try {
      const data = await safeFetch("/api/tools/quote-review", {
        enquiryDetails: quoteEnquiryText,
        quoteItems: quoteItemsText
      });
      setQuoteResult(data);
      showToast("Quote discrepancies evaluated", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to review quote", "error");
    } finally {
      setIsQuoteLoading(false);
    }
  };

  // Tool 3: Customer Research Action
  const handleResearchCustomer = async () => {
    setIsResearchLoading(true);
    try {
      const data = await safeFetch("/api/tools/customer-research", { companyName, location });
      setResearchResult(data);
      showToast("Grounded company intelligence gathered", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to research customer", "error");
    } finally {
      setIsResearchLoading(false);
    }
  };

  // Tool 4: Call Prep Action
  const handlePrepCall = async () => {
    setIsCallPrepLoading(true);
    try {
      const data = await safeFetch("/api/tools/call-prep", {
        opportunity: selectedOpp,
        customerCompany: selectedOpp?.customerCompany,
        contactName: selectedOpp?.contactName,
        project: selectedOpp?.project
      });
      setCallPrepResult(data);
      showToast("1-Minute Call Brief ready", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to prepare call", "error");
    } finally {
      setIsCallPrepLoading(false);
    }
  };

  // Tool 5: Call Notes Action
  const handleProcessNotes = async () => {
    setIsNotesLoading(true);
    try {
      const data = await safeFetch("/api/tools/call-notes", {
        rawNotes: rawCallNotes,
        customerCompany: selectedOpp?.customerCompany,
        project: selectedOpp?.project
      });
      setCallNotesResult(data);
      showToast("Notes structured into CRM format", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to process notes", "error");
    } finally {
      setIsNotesLoading(false);
    }
  };

  // Tool 6: Follow-Up Action
  const handleGenerateFollowUp = async () => {
    setIsFollowUpLoading(true);
    try {
      const data = await safeFetch("/api/tools/follow-up", {
        stage: followUpStage,
        customerName: selectedOpp?.contactName || "Rob Mitchell",
        company: selectedOpp?.customerCompany || "ABC Civil",
        project: selectedOpp?.project || "Ballarat 1.2km Shared Path Upgrade",
        daysSinceLastActivity: 4,
        specificContext: followUpContext
      });
      setFollowUpResult(data);
      showToast("Follow-up email generated", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate follow up", "error");
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  // Tool 7: Product Comparison Action
  const handleCompareProducts = async () => {
    setIsCompareLoading(true);
    try {
      const data = await safeFetch("/api/tools/product-compare", {
        product1Name: product1,
        product2Name: product2,
        applicationContext: "Council Shared Paths and Commercial Carparks"
      });
      setComparisonResult(data);
      showToast("Product comparison matrix generated", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to compare products", "error");
    } finally {
      setIsCompareLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-body">Sales Power Tools Hub</h1>
            <span className="text-meta font-semibold px-2.5 py-0.5 rounded-full bg-brand-wash text-brand-deep border border-brand-edge">
              7 Purpose-Built Workflows
            </span>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Specialised AI assistants for tenders, quote verification, customer intelligence, phone calls, and side-by-side comparisons.
          </p>
        </div>
      </div>

      {/* Sub-tools Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-line">
        {subTools.map((t) => {
          const Icon = t.icon;
          const isActive = activeToolTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveToolTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-edge text-meta font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-brand-deep text-white shadow-xs"
                  : "bg-paper hover:bg-line text-body"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TOOL 1: TENDER & RFQ ANALYSER */}
      {activeToolTab === "tender-analyser" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-deep" />
                Tender Specification & Lighting Scope Parser
              </h2>
              <span className="text-meta text-ink-dim">Extracts compliance clauses & risk flags</span>
            </div>

            <div>
              <label className="block text-meta font-semibold mb-1.5">
                Paste Tender Specification or Schedule Excerpts:
              </label>
              <textarea
                value={tenderText}
                onChange={(e) => setTenderText(e.target.value)}
                rows={5}
                className="w-full text-meta p-3 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep font-mono bg-raised"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAnalyzeTender}
                disabled={isTenderLoading}
                className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white font-semibold px-5 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isTenderLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Analyse Tender Requirements</span>
              </button>
            </div>
          </div>

          {tenderResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-body pb-2 border-b border-line">
                Tender Requirement Matrix & Plasgain Compliance Assessment
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-meta border-collapse">
                  <thead>
                    <tr className="bg-raised text-ink-dim border-b border-line">
                      <th className="py-2 px-3 font-semibold">Tender Clause / Requirement</th>
                      <th className="py-2 px-3 font-semibold">Specified Value</th>
                      <th className="py-2 px-3 font-semibold">Plasgain Position</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {tenderResult.specificationsMatrix?.map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-body">{row.clause || row.requirement}</td>
                        <td className="py-2 px-3 text-body">{row.specifiedValue}</td>
                        <td className="py-2 px-3 text-body">{row.plasgainPosition}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-spec font-bold px-2 py-0.5 rounded-full ${
                              row.status === "Compliant"
                                ? "bg-brand-wash text-brand-deep"
                                : row.status === "Clarification Needed"
                                ? "bg-soon-wash text-soon"
                                : "bg-urgent-wash text-urgent"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {tenderResult.riskFlags && (
                <div className="bg-soon-wash p-3.5 rounded-edge border border-soon text-meta space-y-1.5">
                  <span className="font-bold text-soon flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-soon" />
                    Key Commercial & Technical Risks to Address:
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-soon">
                    {tenderResult.riskFlags.map((risk: string, idx: number) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TOOL 2: QUOTE REVIEWER */}
      {activeToolTab === "quote-review" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-brand-deep" />
                Pre-Send Quote Reviewer & Discrepancy Checker
              </h2>
              <span className="text-meta text-ink-dim">Catches wrong CCT, missing brackets, unquoted freight</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-meta font-semibold mb-1">
                  Customer Enquiry / RFQ Requirement:
                </label>
                <textarea
                  value={quoteEnquiryText}
                  onChange={(e) => setQuoteEnquiryText(e.target.value)}
                  rows={4}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep font-mono bg-raised"
                />
              </div>
              <div>
                <label className="block text-meta font-semibold mb-1">
                  Proposed Quote Line Items:
                </label>
                <textarea
                  value={quoteItemsText}
                  onChange={(e) => setQuoteItemsText(e.target.value)}
                  rows={4}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep font-mono bg-raised"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleReviewQuote}
                disabled={isQuoteLoading}
                className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white font-semibold px-5 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isQuoteLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Run Quote Quality Audit</span>
              </button>
            </div>
          </div>

          {quoteResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="font-bold text-body">Quote Audit Findings</h3>
                <span
                  className={`text-meta font-bold px-2.5 py-0.5 rounded-full ${
                    quoteResult.overallVerdict === "Approved to Send"
                      ? "bg-brand-wash text-brand-deep"
                      : "bg-urgent-wash text-urgent"
                  }`}
                >
                  {quoteResult.overallVerdict || "Discrepancies Found"}
                </span>
              </div>

              {quoteResult.potentialProblems && quoteResult.potentialProblems.length > 0 && (
                <div className="bg-urgent-wash p-4 rounded-edge border border-urgent text-meta space-y-2">
                  <span className="font-bold text-urgent flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-urgent" />
                    Critical Discrepancies Caught (Fix Before Sending):
                  </span>
                  <ul className="space-y-1.5 pl-5 list-disc text-urgent">
                    {quoteResult.potentialProblems.map((prob: any, idx: number) => (
                      <li key={idx}>
                        {typeof prob === "string"
                          ? prob
                          : `${prob.item ? `${prob.item}: ` : ""}${prob.issue || prob.warning || prob.actionRequired || ""}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {quoteResult.checkItems && quoteResult.checkItems.length > 0 && (
                <div className="bg-soon-wash p-4 rounded-edge border border-soon text-meta space-y-2">
                  <span className="font-bold text-soon flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-soon" />
                    Items to Verify Before Sending:
                  </span>
                  <ul className="space-y-1.5 pl-5 list-disc text-soon">
                    {quoteResult.checkItems.map((chk: any, idx: number) => (
                      <li key={idx}>
                        {typeof chk === "string"
                          ? chk
                          : `${chk.item ? `<strong>${chk.item}:</strong> ` : ""}${chk.warning || ""} ${chk.recommendedFix ? `(Fix: ${chk.recommendedFix})` : ""}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(quoteResult.matched || quoteResult.matchedItems) && (
                <div className="bg-raised p-4 rounded-edge border border-line text-meta space-y-1.5">
                  <span className="font-bold text-body flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                    Correctly Matched Parameters:
                  </span>
                  <ul className="space-y-1 pl-5 list-disc text-body">
                    {(quoteResult.matched || quoteResult.matchedItems).map((m: any, idx: number) => (
                      <li key={idx}>
                        {typeof m === "string" ? m : `${m.item}: ${m.details || m.item}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {quoteResult.beforeSendingChecklist && quoteResult.beforeSendingChecklist.length > 0 && (
                <div className="bg-brand-wash p-4 rounded-edge border border-brand-edge text-meta space-y-1.5">
                  <span className="font-bold text-brand-deep flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                    Pre-Dispatch Checklist:
                  </span>
                  <ul className="space-y-1 pl-5 list-disc text-brand-deep">
                    {quoteResult.beforeSendingChecklist.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TOOL 3: CUSTOMER RESEARCH */}
      {activeToolTab === "customer-research" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-deep" />
                Australian Contractor & Council Intelligence (Search Grounded)
              </h2>
              <span className="text-meta text-ink-dim">Live Google Search Grounding</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-meta font-semibold mb-1">Company / Organisation Name:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep"
                />
              </div>
              <div>
                <label className="block text-meta font-semibold mb-1">Region / Location:</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResearchCustomer}
                disabled={isResearchLoading}
                className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white font-semibold px-5 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isResearchLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Gather Customer Intelligence</span>
              </button>
            </div>
          </div>

          {researchResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4 text-meta">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="font-bold text-body">{companyName} — Account Brief</h3>
                <span className="text-ink-dim">{location}</span>
              </div>

              <div className="space-y-3">
                <p className="text-body leading-relaxed bg-raised p-3 rounded-edge border border-line">
                  {researchResult.overview || researchResult.summary}
                </p>

                {researchResult.relevantProjects && (
                  <div>
                    <h4 className="font-bold text-body mb-1">Typical Projects & Sector Focus:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-body">
                      {researchResult.relevantProjects.map((proj: string, idx: number) => (
                        <li key={idx}>{proj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {researchResult.salesStrategy && (
                  <div className="bg-brand-wash p-3.5 rounded-edge border border-brand-edge text-brand-deep space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-soon" /> Recommended Sales Angle:
                    </span>
                    <p>{researchResult.salesStrategy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: CALL PREPARATION BRIEF */}
      {activeToolTab === "call-prep" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-brand-deep" />
                1-Minute Pre-Call Briefing Generator
              </h2>
              <span className="text-meta text-ink-dim">Selected: {selectedOpp?.project}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-meta bg-raised p-3 rounded-edge border border-line">
              <div>
                <span className="text-ink-dim block">Opportunity:</span>
                <span className="font-bold text-body">{selectedOpp?.project}</span>
              </div>
              <div>
                <span className="text-ink-dim block">Contact:</span>
                <span className="font-semibold text-body">
                  {selectedOpp?.contactName} ({selectedOpp?.customerCompany})
                </span>
              </div>
              <button
                onClick={handlePrepCall}
                disabled={isCallPrepLoading}
                className="bg-brand-deep hover:bg-chrome text-white font-semibold px-4 py-2 rounded-edge text-meta transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-end sm:self-center"
              >
                {isCallPrepLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Generate Call Brief</span>
              </button>
            </div>
          </div>

          {callPrepResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4 text-meta">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="font-bold text-body">Pre-Call Cheat Sheet</h3>
                <span className="text-brand-deep font-bold bg-brand-wash px-2 py-0.5 rounded border border-brand-edge">
                  Primary Goal: {callPrepResult.primaryGoal}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-raised p-3.5 rounded-edge border border-line space-y-2">
                  <span className="font-bold text-body block">Key Questions to Ask on Call:</span>
                  <ul className="space-y-1.5 pl-4 list-disc text-body">
                    {callPrepResult.questionsToAsk?.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-soon-wash p-3.5 rounded-edge border border-soon space-y-2">
                  <span className="font-bold text-soon block">Likely Objections & Handling:</span>
                  <div className="space-y-2">
                    {callPrepResult.objectionHandling?.map((obj: any, i: number) => (
                      <div key={i} className="text-spec">
                        <strong className="text-soon">"{obj.objection}"</strong>
                        <p className="text-body italic mt-0.5">Response: {obj.response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 5: CALL NOTES PROCESSOR */}
      {activeToolTab === "call-notes" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-deep" />
                Raw Call Notes to Structured CRM Fields
              </h2>
              <span className="text-meta text-ink-dim">Converts messy typing into clean tasks</span>
            </div>

            <div>
              <label className="block text-meta font-semibold mb-1.5">
                Paste Telephone / Meeting Scratchpad Notes:
              </label>
              <textarea
                value={rawCallNotes}
                onChange={(e) => setRawCallNotes(e.target.value)}
                rows={4}
                className="w-full text-meta p-3 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep font-mono bg-raised"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleProcessNotes}
                disabled={isNotesLoading}
                className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white font-semibold px-5 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isNotesLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Format for CRM & Tasks</span>
              </button>
            </div>
          </div>

          {callNotesResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4 text-meta">
              <h3 className="font-bold text-body pb-2 border-b border-line">
                Structured CRM Output
              </h3>

              <div className="space-y-3">
                <div className="bg-raised p-3 rounded-edge border border-line">
                  <span className="font-bold text-body block mb-1">Executive Summary for CRM Note:</span>
                  <p className="text-body">{callNotesResult.crmSummary || callNotesResult.summary}</p>
                </div>

                {callNotesResult.actionItems && (
                  <div className="bg-brand-wash p-3 rounded-edge border border-brand-edge">
                    <span className="font-bold text-brand-deep block mb-1.5">Action Items & Deadlines:</span>
                    <ul className="space-y-1 pl-5 list-disc text-body">
                      {callNotesResult.actionItems.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 6: FOLLOW-UP ASSISTANT */}
      {activeToolTab === "follow-up" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-deep" />
                Smart Follow-Up Email Assistant
              </h2>
              <span className="text-meta text-ink-dim">Non-pushy, high-value B2B templates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-meta font-semibold mb-1">Opportunity Stage:</label>
                <select
                  value={followUpStage}
                  onChange={(e) => setFollowUpStage(e.target.value)}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep bg-white"
                >
                  <option value="Awaiting Information">Awaiting Information (Questions Sent)</option>
                  <option value="Quote Sent">Quote Sent (Checking Feedback)</option>
                  <option value="Technical Review">Dialux Photometrics Completed</option>
                  <option value="Tender Deadline Approaching">Tender Deadline Approaching</option>
                </select>
              </div>

              <div>
                <label className="block text-meta font-semibold mb-1">Specific Context / Note:</label>
                <input
                  type="text"
                  value={followUpContext}
                  onChange={(e) => setFollowUpContext(e.target.value)}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong focus:outline-none focus:border-brand-deep"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateFollowUp}
                disabled={isFollowUpLoading}
                className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white font-semibold px-5 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isFollowUpLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Draft Contextual Follow-Up</span>
              </button>
            </div>
          </div>

          {followUpResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3 text-meta">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h3 className="font-bold text-body">Generated Follow-Up Email</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Subject: ${followUpResult.subject}\n\n${followUpResult.body}`
                    );
                    showToast("Follow-up copied to clipboard", "success");
                  }}
                  className="text-meta text-brand-deep font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to Clipboard</span>
                </button>
              </div>

              <div>
                <span className="font-bold text-body block mb-1">Subject: {followUpResult.subject}</span>
                <div className="bg-raised p-4 rounded-edge border border-line whitespace-pre-line text-body font-sans leading-relaxed">
                  {followUpResult.body}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 7: PRODUCT COMPARISON */}
      {activeToolTab === "product-comparison" && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-bold flex items-center gap-2">
                <Scale className="w-4 h-4 text-brand-deep" />
                Side-by-Side Product Spec & Advantage Comparison
              </h2>
              <span className="text-meta text-ink-dim">Includes 'Claims We Should NOT Make'</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-meta font-semibold mb-1">Product 1 (Plasgain Option A):</label>
                <select
                  value={product1}
                  onChange={(e) => setProduct1(e.target.value)}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-meta font-semibold mb-1">Product 2 (Plasgain Option B or Competitor):</label>
                <select
                  value={product2}
                  onChange={(e) => setProduct2(e.target.value)}
                  className="w-full text-meta p-2.5 rounded-edge border border-line-strong bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCompareProducts}
                disabled={isCompareLoading}
                className="bg-brand-deep hover:bg-chrome disabled:bg-line-strong text-white font-semibold px-5 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isCompareLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                )}
                <span>Generate Technical Comparison</span>
              </button>
            </div>
          </div>

          {comparisonResult && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4 text-meta">
              <h3 className="font-bold text-body pb-2 border-b border-line">
                {product1} vs {product2} Comparison
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-wash p-4 rounded-edge border border-brand-edge space-y-2">
                  <span className="font-bold text-brand-deep flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                    Where {product1} Has the Advantage:
                  </span>
                  <p className="text-body leading-relaxed">
                    {comparisonResult.whereProduct1Wins || comparisonResult.advantages1}
                  </p>
                </div>

                <div className="bg-soon-wash p-4 rounded-edge border border-soon space-y-2">
                  <span className="font-bold text-soon flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-soon" />
                    Claims We Should NOT Make:
                  </span>
                  <p className="text-body leading-relaxed">
                    {comparisonResult.claimsWeShouldNotMake || comparisonResult.limitations}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
