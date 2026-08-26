import React, { useState } from "react";
import { apiPost, AIUnavailableError, toUserMessage } from "../utils/apiClient";
import { AIUnavailableNotice } from "./AIUnavailableNotice";
import {
  Sparkles,
  Send,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowRight,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  RotateCcw,
  BookOpen,
  Mail,
  User,
  Building,
  MapPin,
  Tag,
  Lightbulb,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Save,
  Info,
  ChevronRight
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { EnquiryAnalysisResult, StatusField } from "../types";

export const NewEnquiryWorkspace: React.FC = () => {
  const {
    currentEnquiryAnalysis,
    setCurrentEnquiryAnalysis,
    rawEnquiryInput,
    setRawEnquiryInput,
    addOpportunity,
    addCrmOpportunity,
    setExplainingTerm,
    showToast,
    navigateToWorkflow
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  type PanelError = { detail: string; guidance?: string };
  const [analysisError, setAnalysisError] = useState<PanelError | null>(null);
  const [emailError, setEmailError] = useState<PanelError | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [simulatedFiles, setSimulatedFiles] = useState<{ name: string; size: string; type: string }[]>([]);

  const handleInputChange = (field: keyof typeof rawEnquiryInput, value: string) => {
    setRawEnquiryInput({
      ...rawEnquiryInput,
      [field]: value
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type || "application/octet-stream"
      }));
      setSimulatedFiles([...simulatedFiles, ...newFiles]);
      showToast(`Attached ${newFiles.length} file(s) to enquiry context`, "info");
    }
  };

  const handleAnalyze = async () => {
    if (!rawEnquiryInput.rawContent && simulatedFiles.length === 0) {
      showToast("Please enter customer enquiry text or upload a document", "warning");
      return;
    }

    setIsLoading(true);

    try {
      setAnalysisError(null);
      const data = await apiPost("/api/analyse-enquiry", {
        rawEnquiry: rawEnquiryInput.rawContent,
        metadata: {
          customerName: rawEnquiryInput.customer,
          customer: rawEnquiryInput.customer,
          contactName: rawEnquiryInput.customer,
          company: rawEnquiryInput.company,
          projectName: rawEnquiryInput.project,
          project: rawEnquiryInput.project,
          location: rawEnquiryInput.location,
          source: rawEnquiryInput.source,
          attachedFiles: simulatedFiles.map((f) => f.name)
        }
      });
      setCurrentEnquiryAnalysis(data);

      // Pre-select first 3 questions
      if (data.questionsBeforeWeQuote && data.questionsBeforeWeQuote.length > 0) {
        setSelectedQuestions(
          data.questionsBeforeWeQuote.slice(0, 3).map((q: { question: string }) => q.question)
        );
      }

      showToast("Enquiry analysed", "success");
    } catch (err) {
      console.error("Analysis error:", err);
      // No local sample analysis: a fabricated matrix presented as "Confirmed"
      // is how a rep ends up quoting the wrong product to a real customer.
      setCurrentEnquiryAnalysis(null);
      setSelectedQuestions([]);
      if (err instanceof AIUnavailableError) {
        setAnalysisError({ detail: err.detail, guidance: err.guidance });
        showToast("AI unavailable — no analysis generated", "error");
      } else {
        setAnalysisError({ detail: toUserMessage(err) });
        showToast(toUserMessage(err), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!currentEnquiryAnalysis) return;

    setIsGeneratingEmail(true);
    setIsReplyModalOpen(true);

    try {
      setEmailError(null);
      // These key names must match what /api/enquiry/analyze emits
      // (contactName / project), otherwise every email opens "Hi Client,".
      const summary = currentEnquiryAnalysis.opportunitySummary;
      const data = await apiPost("/api/generate-email", {
        recipientName: summary.contactName?.value || rawEnquiryInput.customer,
        customerName: summary.contactName?.value || rawEnquiryInput.customer,
        companyName: summary.company?.value || rawEnquiryInput.company,
        projectName: summary.project?.value || rawEnquiryInput.project,
        recommendedProduct:
          currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productName,
        selectedQuestions: selectedQuestions
      });
      setGeneratedEmail(data);
    } catch (err) {
      console.error("Email generation error:", err);
      // No canned letter: this text goes to a real customer.
      setGeneratedEmail(null);
      setEmailError(
        err instanceof AIUnavailableError
          ? { detail: err.detail, guidance: err.guidance }
          : { detail: toUserMessage(err) }
      );
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const toggleQuestion = (qText: string) => {
    if (selectedQuestions.includes(qText)) {
      setSelectedQuestions(selectedQuestions.filter((q) => q !== qText));
    } else {
      setSelectedQuestions([...selectedQuestions, qText]);
    }
  };

  const handleSaveOpportunity = () => {
    if (!currentEnquiryAnalysis) return;

    const oppSummary = currentEnquiryAnalysis.opportunitySummary;
    const customerName = oppSummary.contactName?.value || rawEnquiryInput.customer || "";
    const companyName = oppSummary.company?.value || rawEnquiryInput.company || "";
    const contactEmail = rawEnquiryInput.contact || "";
    const projectName = oppSummary.project?.value || rawEnquiryInput.project || "";
    const locationVal = oppSummary.location?.value || rawEnquiryInput.location || "";
    const applicationVal = oppSummary.application?.value || "";
    // Quantity is genuinely unknown until confirmed - 0 keeps it out of forecasts.
    const parsedQty = parseInt((oppSummary.quantity?.value || "").replace(/\D/g, ""), 10);
    const quantityNum = Number.isFinite(parsedQty) ? parsedQty : 0;
    const recommendedProd = currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint?.productName || "";
    const recommendedCode = currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint?.productCode || "";

    if (!customerName || !companyName || !projectName) {
      showToast("Add contact name, company, and project before saving to pipeline", "warning");
      return;
    }

    const newOpp = {
      id: `opp-${Date.now()}`,
      customerCompany: companyName,
      contactName: customerName,
      contactEmail: contactEmail,
      contactPhone: rawEnquiryInput.contact || "",
      project: projectName,
      location: locationVal,
      application: applicationVal,
      stage: "Awaiting Information" as const,
      status: "Pending Customer" as const,
      estimatedQuantity: quantityNum,
      estimatedValue: quantityNum * 1600,
      productsConsidered: [recommendedProd],
      quoteDeadline:
        oppSummary.quoteDeadline?.value && oppSummary.quoteDeadline.value !== "Unknown"
          ? oppSummary.quoteDeadline.value
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      projectDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      lastActivity: "Enquiry analysed & clarification email drafted",
      lastActivityDate: "Today",
      nextAction: currentEnquiryAnalysis.nextBestAction?.title || "Send technical clarification email",
      nextActionDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      readinessScore: currentEnquiryAnalysis.readiness?.score ?? 0,
      notes: `Extracted summary: ${currentEnquiryAnalysis.readiness?.summaryExplanation || "New enquiry analyzed by Copilot."}`,
      rawEnquiry: rawEnquiryInput.rawContent,
      analysis: currentEnquiryAnalysis
    };

    addOpportunity(newOpp);

    // Also ingest into CRM pipeline
    const crmOppId = `crm-opp-${Date.now()}`;
    addCrmOpportunity({
      id: crmOppId,
      name: newOpp.project,
      accountId: "acc-1",
      accountName: newOpp.customerCompany,
      primaryContactId: "con-1",
      primaryContactName: newOpp.contactName,
      primaryContactEmail: newOpp.contactEmail,
      opportunityOwner: "Marcus Vance",
      pipelineId: "pipe-solar",
      stageId: "stage-new",
      stageName: "New Enquiry / Lead",
      dealValue: newOpp.estimatedValue || 38400,
      probability: 25,
      weightedValue: (newOpp.estimatedValue || 38400) * 0.25,
      forecastCategory: "Pipeline",
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      products: [
        {
          id: `line-${Date.now()}`,
          productCode: recommendedCode,
          productName: recommendedProd,
          category: "Solar Luminaire",
          quantity: quantityNum,
          unitPrice: 1600,
          totalPrice: quantityNum * 1600
        }
      ],
      projectApplication: newOpp.application,
      location: newOpp.location,
      customerNeed: newOpp.notes,
      keyRequirements: [
        oppSummary.mountingPoleRequirements?.value ? `Pole: ${oppSummary.mountingPoleRequirements.value}` : "6m Mounting Height",
        oppSummary.operatingRequirements?.value ? `Operating: ${oppSummary.operatingRequirements.value}` : "Dusk-to-dawn profile"
      ],
      source: "Enquiry Analyzer Ingestion",
      latestActivity: "Enquiry analysed and ingested into CRM",
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: newOpp.nextAction,
      nextActionDate: newOpp.nextActionDate,
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["Fresh enquiry with clear technical scope"],
      notes: newOpp.notes
    });

    showToast("Saved opportunity to CRM Command Centre!", "success");
    navigateToWorkflow("opportunities");
  };

  const renderStatusBadge = (field: StatusField) => {
    if (field.status === "Confirmed") {
      return (
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep uppercase tracking-wider">
          <Check className="w-3 h-3 text-brand-deep" />
          CONFIRMED
        </span>
      );
    }
    if (field.status === "Inferred") {
      return (
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wider">
          <Info className="w-3 h-3 text-amber-600" />
          INFERRED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 uppercase tracking-wider">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        UNKNOWN
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-body">Enquiry Analysis Workspace</h1>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Extract structured lighting requirements, evaluate readiness, ground product recommendations, and generate customer questions.
          </p>
        </div>

        {currentEnquiryAnalysis && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentEnquiryAnalysis(null);
                setRawEnquiryInput({
                  rawContent: "",
                  customer: "",
                  contact: "",
                  company: "",
                  project: "",
                  location: "",
                  source: "Email"
                });
              }}
              className="text-meta text-ink-dim hover:text-ink bg-white hover:bg-raised px-3 py-1.5 rounded-edge border border-line font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
            <button
              onClick={handleSaveOpportunity}
              className="text-meta font-medium px-3.5 py-1.5 rounded-edge bg-brand-deep hover:bg-brand-deep text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to Pipeline</span>
            </button>
          </div>
        )}
      </div>

      {/* INPUT FORM (if not yet analyzed or expanding) */}
      <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-deep" />
            <h2 className="text-body font-bold">
              {currentEnquiryAnalysis ? "Original Customer Note & Metadata" : "Input Customer Enquiry"}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-meta text-ink-faint font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Try sample:</span>
            </span>
            <button
              onClick={() => {
                setRawEnquiryInput({
                  rawContent:
                    "We are pricing a new 1.2 km shared pathway in Ballarat and require a solar lighting option. The current drawings indicate 6 m poles. Lighting is expected to operate dusk to dawn. Can you recommend a suitable solution and provide budget pricing? Installation is expected around November.",
                  customer: "Rob Mitchell",
                  contact: "rob.mitchell@abccivil.com.au",
                  company: "ABC Civil Pty Ltd",
                  project: "Ballarat 1.2km Shared Path Upgrade",
                  location: "Ballarat, Victoria",
                  source: "Email"
                });
                showToast("Loaded Ballarat Shared Path sample enquiry", "info");
              }}
              className="text-meta px-2.5 py-1 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep border border-line hover:border-brand-edge font-medium transition-colors cursor-pointer"
            >
              Ballarat Shared Path
            </button>
            <button
              onClick={() => {
                setRawEnquiryInput({
                  rawContent:
                    "Geelong City Council is seeking expressions of interest for 24x solar pathway bollards for the Eastern Beach foreshore path. Must be vandal resistant (IK10 rated), low-glare with zero upward light spill, and 3000K warm white to suit coastal fauna. Need tender documentation and IES files.",
                  customer: "Sarah Jenkins",
                  contact: "sjenkins@geelongcity.vic.gov.au",
                  company: "City of Greater Geelong",
                  project: "Eastern Beach Foreshore Reserve Path",
                  location: "Geelong, Victoria",
                  source: "Council Tender Portal"
                });
                showToast("Loaded Geelong Foreshore sample enquiry", "info");
              }}
              className="text-meta px-2.5 py-1 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep border border-line hover:border-brand-edge font-medium transition-colors cursor-pointer"
            >
              Geelong Foreshore
            </button>
            <button
              onClick={() => {
                setRawEnquiryInput({
                  rawContent:
                    "We have a new freight transport yard in Dandenong South. Substation is at capacity so trenching mains power is too expensive. Need high-output off-grid solar floodlighting on 10m-12m poles to illuminate heavy vehicle loading area. Must have at least 5 nights battery autonomy.",
                  customer: "David Lee",
                  contact: "dlee@apexelectrical.com.au",
                  company: "Apex Electrical Contracting",
                  project: "Monash Industrial Estate Transport Depot",
                  location: "Dandenong South, Victoria",
                  source: "Phone Notes"
                });
                showToast("Loaded Monash Transport Depot sample enquiry", "info");
              }}
              className="text-meta px-2.5 py-1 rounded-edge bg-raised hover:bg-brand-wash hover:text-brand-deep border border-line hover:border-brand-edge font-medium transition-colors cursor-pointer"
            >
              Monash Depot
            </button>
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-meta font-semibold mb-1.5">
            Pasted Email / Tender Extract / Telephone Notes:
          </label>
          <textarea
            value={rawEnquiryInput.rawContent}
            onChange={(e) => handleInputChange("rawContent", e.target.value)}
            placeholder="Paste raw customer email, contractor notes, RFQ text, or spec excerpts here..."
            rows={4}
            className="w-full text-meta p-3 rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep placeholder:text-ink-faint font-mono bg-raised"
          />
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-spec font-semibold text-ink-dim mb-1">Company</label>
            <input
              type="text"
              id="workspace-company-input"
              value={rawEnquiryInput.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="e.g. ABC Civil Pty Ltd"
              className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>
          <div>
            <label className="block text-spec font-semibold text-ink-dim mb-1">Contact Name</label>
            <input
              type="text"
              id="workspace-contact-name-input"
              value={rawEnquiryInput.customer}
              onChange={(e) => handleInputChange("customer", e.target.value)}
              placeholder="e.g. Rob Mitchell"
              className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>
          <div>
            <label className="block text-spec font-semibold text-ink-dim mb-1">Project Name</label>
            <input
              type="text"
              value={rawEnquiryInput.project}
              onChange={(e) => handleInputChange("project", e.target.value)}
              placeholder="e.g. Ballarat Trail Upgrade"
              className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>
          <div>
            <label className="block text-spec font-semibold text-ink-dim mb-1">Location / State</label>
            <input
              type="text"
              value={rawEnquiryInput.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="e.g. Ballarat, VIC"
              className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>
          <div>
            <label className="block text-spec font-semibold text-ink-dim mb-1">Contact Email/Phone</label>
            <input
              type="text"
              value={rawEnquiryInput.contact}
              onChange={(e) => handleInputChange("contact", e.target.value)}
              placeholder="rob@abccivil.com.au"
              className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
          </div>
          <div>
            <label className="block text-spec font-semibold text-ink-dim mb-1">Enquiry Source</label>
            <select
              value={rawEnquiryInput.source}
              onChange={(e) => handleInputChange("source", e.target.value)}
              className="w-full text-meta px-2 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
            >
              <option value="Email">Email</option>
              <option value="Phone Notes">Phone Call Notes</option>
              <option value="Tender Portal">Tender Portal / RFQ</option>
              <option value="Website Form">Website Form</option>
              <option value="In-person Meeting">In-person Meeting</option>
            </select>
          </div>
        </div>

        {/* Attachment Upload & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-line">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-meta text-ink-dim hover:text-brand-deep bg-raised hover:bg-paper px-3 py-1.5 rounded-edge border border-line cursor-pointer transition-colors font-medium">
              <UploadCloud className="w-4 h-4 text-ink-faint" />
              <span>Attach PDF / Word / Excel / Drawing</span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
            </label>
            {simulatedFiles.length > 0 && (
              <span className="text-meta text-brand-deep font-semibold bg-brand-wash px-2 py-0.5 rounded border border-brand-edge">
                {simulatedFiles.length} file(s) attached
              </span>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="bg-brand-deep hover:bg-brand-deep disabled:bg-line-strong text-white font-medium px-5 py-2 rounded-edge text-meta transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analysing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Analyse Enquiry</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI unavailable - shown instead of an analysis, never alongside one */}
      {analysisError && !currentEnquiryAnalysis && (
        <AIUnavailableNotice
          detail={analysisError.detail}
          guidance={analysisError.guidance}
          onRetry={handleAnalyze}
        />
      )}

      {/* STRUCTURED WORKSPACE OUTPUT */}
      {currentEnquiryAnalysis && (
        <div className="space-y-6">
          {/* Top Banner: Next Best Action & Readiness Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Next Best Action Card (2 cols) - Editorial Dark Slate */}
            <div className="lg:col-span-2 bg-[#0F172A] text-white rounded-panel p-6 shadow-sm border border-chrome-line flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-spec font-bold tracking-widest text-brand-lift uppercase">
                    RECOMMENDED NEXT ACTION
                  </span>
                  <span className="text-spec font-semibold px-2 py-0.5 rounded bg-chrome-raised text-ink-faint border border-chrome-line">
                    Urgency: {currentEnquiryAnalysis.nextBestAction.urgency}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  {currentEnquiryAnalysis.nextBestAction.title}
                </h3>
                <p className="text-meta text-ink-faint leading-relaxed max-w-xl">
                  {currentEnquiryAnalysis.nextBestAction.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-chrome-line">
                <button
                  onClick={handleGenerateReply}
                  className="bg-brand-deep hover:bg-brand-deep text-white font-medium px-4 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{currentEnquiryAnalysis.nextBestAction.primaryActionLabel}</span>
                </button>
                <button
                  onClick={() => navigateToWorkflow("product-finder")}
                  className="bg-chrome-raised hover:bg-chrome-raised text-chrome-text font-medium px-3.5 py-2 rounded-edge text-meta transition-colors border border-chrome-line flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explore Product Specs &rarr;</span>
                </button>
              </div>
            </div>

            {/* Quote Readiness Score Gauge (1 col) */}
            <div className="bg-white rounded-panel border border-line p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-spec uppercase font-bold text-ink-faint">Readiness Score</span>
                  <span
                    className={`text-meta font-bold px-2 py-0.5 rounded ${
                      currentEnquiryAnalysis.readiness.score >= 80
                        ? "bg-brand-wash text-brand-deep"
                        : currentEnquiryAnalysis.readiness.score >= 50
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {currentEnquiryAnalysis.readiness.rating}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-black text-brand-deep">
                    {currentEnquiryAnalysis.readiness.score}%
                  </span>
                  <span className="text-meta text-ink-dim">Quoting Feasibility</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-paper rounded-full h-2 overflow-hidden mb-3 border border-line">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      currentEnquiryAnalysis.readiness.score >= 80
                        ? "bg-brand-deep"
                        : currentEnquiryAnalysis.readiness.score >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${currentEnquiryAnalysis.readiness.score}%` }}
                  ></div>
                </div>

                <p className="text-meta text-ink-dim mb-3 leading-relaxed">
                  {currentEnquiryAnalysis.readiness.summaryExplanation}
                </p>
              </div>

              {/* Quick counts */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-line text-meta">
                <div className="bg-brand-wash p-2.5 rounded-edge border border-brand-edge">
                  <div className="font-bold text-brand-deep flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep" />
                    <span>{currentEnquiryAnalysis.readiness.knownItems.length} Confirmed</span>
                  </div>
                </div>
                <div className="bg-rose-50/70 p-2.5 rounded-edge border border-rose-100">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{currentEnquiryAnalysis.readiness.missingItems.length} Missing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Known vs Missing Information Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Known Items */}
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-line mb-3">
                <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                <h3 className="font-bold text-body">Confirmed & Known Parameters</h3>
              </div>
              <ul className="space-y-2">
                {currentEnquiryAnalysis.readiness.knownItems.map((item, idx) => (
                  <li key={idx} className="text-meta flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-wash text-brand-deep flex items-center justify-center text-spec font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing Items */}
            <div className="bg-white rounded-panel border border-rose-200/80 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-100 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-body">
                  Information Still Required Before Quoting
                </h3>
              </div>
              <ul className="space-y-2">
                {currentEnquiryAnalysis.readiness.missingItems.map((item, idx) => (
                  <li key={idx} className="text-meta flex items-start gap-2 bg-rose-50/60 p-2.5 rounded-edge border border-rose-100">
                    <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-900 flex items-center justify-center text-spec font-bold shrink-0 mt-0.5">
                      !
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Structured Opportunity Summary Table */}
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-bold text-body">Opportunity Requirement Matrix</h3>
                <p className="text-meta text-ink-dim">
                  Extracted technical and commercial parameters
                </p>
              </div>
              <div className="flex items-center gap-3 text-meta">
                <span className="flex items-center gap-1 text-ink-dim font-medium">
                  <span className="w-2 h-2 rounded-full bg-brand"></span> Confirmed
                </span>
                <span className="flex items-center gap-1 text-ink-dim font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Inferred
                </span>
                <span className="flex items-center gap-1 text-ink-dim font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Unknown
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-meta border-collapse">
                <thead>
                  <tr className="bg-raised text-ink-dim border-b border-line">
                    <th className="py-2.5 px-3 font-semibold w-1/4">Requirement Field</th>
                    <th className="py-2.5 px-3 font-semibold w-7/12">Extracted Value & Context</th>
                    <th className="py-2.5 px-3 font-semibold w-2/12">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(currentEnquiryAnalysis.opportunitySummary).map(([key, rawField]) => {
                    const field = rawField as StatusField;
                    const label = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());
                    return (
                      <tr key={key} className="hover:bg-raised transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-body">{label}</td>
                        <td className="py-2.5 px-3 text-body">
                          {field?.value || "Unknown"}
                          {key === "cct" && (
                            <button
                              onClick={() => setExplainingTerm("CCT (Correlated Colour Temperature)")}
                              className="ml-2 text-spec text-brand-deep hover:underline font-medium cursor-pointer"
                            >
                              Explain CCT
                            </button>
                          )}
                          {key === "standardsMentioned" && (
                            <button
                              onClick={() => setExplainingTerm("AS/NZS 1158")}
                              className="ml-2 text-spec text-brand-deep hover:underline font-medium cursor-pointer"
                            >
                              Explain AS1158
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3">{renderStatusBadge(field)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Recommendations & Citations */}
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-bold text-body">
                  Plasgain Product Recommendations & Knowledge Base Grounding
                </h3>
                <p className="text-meta text-ink-dim">
                  Matched against approved Plasgain product datasheets and Australian standards
                </p>
              </div>
              <span className="text-spec font-bold px-2.5 py-1 rounded bg-brand-wash text-brand-deep border border-brand-edge uppercase tracking-wider">
                Grounded in Approved Docs
              </span>
            </div>

            {/* Recommended Starting Point */}
            {currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint && (
              <div className="bg-brand-wash border border-brand-edge rounded-panel p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-edge">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-meta font-bold text-brand-deep uppercase tracking-wider">
                        Recommended Starting Point
                      </span>
                      <span className="text-meta font-bold px-2 py-0.5 rounded bg-brand-deep text-white">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.matchLevel || "Strong"} Match
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-body mt-0.5">
                      {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productName || "Plasgain Luminaire"} (
                      {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productCode || "PLASGAIN-SOLAR"})
                    </h4>
                  </div>
                </div>

                <div className="text-meta leading-relaxed">
                  <strong className="text-body">Why it appears suitable: </strong>
                  {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.whySuitable || "Engineered specifically for Australian public infrastructure."}
                </div>

                {/* Supporting Specs Grid */}
                {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-edge border border-brand-edge text-meta">
                    <div>
                      <span className="text-spec font-bold text-ink-faint uppercase block">Application Fit</span>
                      <span className="text-body font-medium">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications.applicationFit || "Standard"}
                      </span>
                    </div>
                    <div>
                      <span className="text-spec font-bold text-ink-faint uppercase block">Luminaire Output</span>
                      <span className="text-body font-medium">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications.luminaireOutput || "Standard"}
                      </span>
                    </div>
                    <div>
                      <span className="text-spec font-bold text-ink-faint uppercase block">CCT Options</span>
                      <span className="text-body font-medium">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications.cctAvailable || "3000K, 4000K"}
                      </span>
                    </div>
                    <div>
                      <span className="text-spec font-bold text-ink-faint uppercase block">Solar & Battery</span>
                      <span className="text-body font-medium">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications.solarAndBattery || "Standard"}
                      </span>
                    </div>
                    <div>
                      <span className="text-spec font-bold text-ink-faint uppercase block">Mounting / Poles</span>
                      <span className="text-body font-medium">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications.mountingOptions || "Standard"}
                      </span>
                    </div>
                    <div>
                      <span className="text-spec font-bold text-ink-faint uppercase block">Control & Sensor</span>
                      <span className="text-body font-medium">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications.controlOptions || "Smart Controller"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Source Citations */}
                {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.sourceCitations && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-spec font-bold block">Supporting Document Citations:</span>
                    <div className="space-y-1.5">
                      {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.sourceCitations.map(
                        (cite, i) => (
                          <div
                            key={i}
                            className="text-meta bg-white/90 p-2.5 rounded border border-brand-edge flex items-start gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-brand-deep">{cite.documentTitle}</span>
                              {cite.sectionOrPage && <span className="text-ink-dim ml-1">({cite.sectionOrPage})</span>}
                              {cite.excerpt && <p className="text-ink-dim mt-0.5 italic text-spec">"{cite.excerpt}"</p>}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Distinction note: Sales fit vs engineered design */}
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-edge text-meta text-amber-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Engineering Distinction Notice: </strong>
                    {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.distinctionNotes ||
                      "This recommendation represents a preliminary product fit. Formal AS/NZS 1158 certification and council sign-off requires a point-by-point Dialux photometric simulation by Plasgain Engineering."}
                  </div>
                </div>
              </div>
            )}

            {/* Alternatives */}
            {currentEnquiryAnalysis.productRecommendations?.alternatives &&
              currentEnquiryAnalysis.productRecommendations.alternatives.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-meta font-bold uppercase tracking-wide">
                    Alternative Product Options to Consider:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentEnquiryAnalysis.productRecommendations.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className="bg-raised p-3.5 rounded-edge border border-line text-meta space-y-1.5"
                      >
                        <div className="font-bold text-body">{alt.productName}</div>
                        <p className="text-ink-dim">
                          <strong className="text-body">When to use:</strong> {alt.whenToUse}
                        </p>
                        <p className="text-ink-dim text-spec">
                          <strong className="text-ink-dim">Trade-offs:</strong> {alt.tradeOffs}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Questions Before We Quote & Email Generator */}
          <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
              <div>
                <h3 className="font-bold text-body">
                  Questions Before We Quote (Select to Include in Email)
                </h3>
                <p className="text-meta text-ink-dim">
                  Specific technical and commercial questions tailored to this enquiry
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setSelectedQuestions(
                      currentEnquiryAnalysis.questionsBeforeWeQuote.map((q) => q.question)
                    )
                  }
                  className="text-meta text-ink-dim hover:text-ink underline font-medium cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedQuestions([])}
                  className="text-meta text-ink-dim hover:text-ink underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {currentEnquiryAnalysis.questionsBeforeWeQuote.map((q) => {
                const isChecked = selectedQuestions.includes(q.question);
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 p-3 rounded-edge border transition-all cursor-pointer ${
                      isChecked
                        ? "bg-brand-wash border-brand-edge"
                        : "bg-raised border-line hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleQuestion(q.question)}
                      className="mt-0.5 h-4 w-4 rounded text-brand-deep focus:ring-brand-deep border-line-strong"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-meta">{q.question}</span>
                        <span className="text-spec font-bold px-1.5 py-0.5 rounded bg-line">
                          {q.category}
                        </span>
                      </div>
                      <p className="text-spec text-ink-dim">
                        <strong className="text-ink-dim">Why it matters:</strong> {q.whyItMatters}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-meta text-ink-dim">
                {selectedQuestions.length} of {currentEnquiryAnalysis.questionsBeforeWeQuote.length} questions selected
              </span>
              <button
                onClick={handleGenerateReply}
                disabled={selectedQuestions.length === 0}
                className="bg-brand-deep hover:bg-brand-deep disabled:bg-line-strong text-white font-medium px-4 py-2 rounded-edge text-meta transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Mail className="w-4 h-4" />
                <span>Create Customer Reply Email ({selectedQuestions.length})</span>
              </button>
            </div>
          </div>

          {/* Internal Sales Coach Tip */}
          {currentEnquiryAnalysis.internalSalesCoachTip && (
            <div className="bg-raised rounded-panel border border-line p-4 text-meta flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-body">Plasgain Sales Coach Tip: </strong>
                <span>{currentEnquiryAnalysis.internalSalesCoachTip}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Reply Modal */}
      {isReplyModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-2xl w-full p-6 shadow-xl border border-line space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-deep" />
                <h3 className="font-bold text-body text-base">Generated Customer Clarification Email</h3>
              </div>
              <button
                onClick={() => setIsReplyModalOpen(false)}
                className="text-ink-faint hover:text-ink-dim text-body font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isGeneratingEmail ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                <p className="text-meta text-ink-dim font-medium">Generating professional B2B email...</p>
              </div>
            ) : generatedEmail ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-spec font-bold text-ink-dim uppercase mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={generatedEmail.subject}
                    onChange={(e) =>
                      setGeneratedEmail((prev) => (prev ? { ...prev, subject: e.target.value } : null))
                    }
                    className="w-full text-meta font-semibold p-2.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-raised"
                  />
                </div>

                <div>
                  <label className="block text-spec font-bold text-ink-dim uppercase mb-1">Email Body</label>
                  <textarea
                    value={generatedEmail.body}
                    onChange={(e) =>
                      setGeneratedEmail((prev) => (prev ? { ...prev, body: e.target.value } : null))
                    }
                    rows={12}
                    className="w-full text-meta p-3 rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans leading-relaxed bg-raised"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <span className="text-spec text-ink-dim">
                    Ready to copy into Outlook / Gmail
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`
                        );
                        showToast("Email copied to clipboard!", "success");
                      }}
                      className="bg-paper hover:bg-line font-medium px-3.5 py-2 rounded-edge text-meta transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy to Clipboard</span>
                    </button>
                    <button
                      onClick={() => {
                        handleSaveOpportunity();
                        setIsReplyModalOpen(false);
                      }}
                      className="bg-brand-deep hover:bg-brand-deep text-white font-medium px-4 py-2 rounded-edge text-meta transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Close</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : emailError ? (
              <AIUnavailableNotice
                detail={emailError.detail}
                guidance={emailError.guidance}
                onRetry={handleGenerateReply}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
