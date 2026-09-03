import React, { useState, useEffect, useRef } from "react";
import { apiPost, apiStreamPost, AIUnavailableError, toUserMessage } from "../utils/apiClient";
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
  Check,
  RotateCcw,
  BookOpen,
  Mail,
  User,
  Building2,
  MapPin,
  Tag,
  Lightbulb,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Save,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Zap,
  Plus,
  DollarSign,
  Trash2,
  Eye,
  SlidersHorizontal,
  XCircle,
  FileCheck
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { EnquiryAnalysisResult, StatusField, FieldStatus } from "../types";
import { CustomerFollowUpModal } from "./CustomerFollowUpModal";
import { DatasheetPackageModal } from "./DatasheetPackageModal";
import { QuoteReadinessModal } from "./QuoteReadinessModal";
import { CommercialPricingRequestModal } from "./CommercialPricingRequestModal";
import {
  formatOstendoCSV,
  formatOstendoTabDelimited,
  validateOstendoItems,
  downloadOstendoCSV,
  copyOstendoProductList,
  resolveProductsForDeal
} from "../utils/datasheetExporter";

export const NewEnquiryWorkspace: React.FC = () => {
  const {
    currentEnquiryAnalysis,
    setCurrentEnquiryAnalysis,
    rawEnquiryInput,
    setRawEnquiryInput,
    addOpportunity,
    addCrmOpportunity,
    accounts,
    pipelines,
    contacts,
    addAccount,
    addContact,
    setExplainingTerm,
    showToast,
    navigateToWorkflow,
    navigateToCRM,
    currentUser,
    addNotification,
    setActiveBackgroundAnalysisJob
  } = useApp();

  // Active Tab state for Results: Summary | Requirements | Products | Reply
  const [activeTab, setActiveTab] = useState<"summary" | "requirements" | "products" | "reply">("summary");

  // Input collapse toggle state (auto-collapses after successful analysis)
  const [isInputExpanded, setIsInputExpanded] = useState<boolean>(!currentEnquiryAnalysis);
  
  // Metadata collapsible section (open by default to display required Customer Name)
  const [isMetadataExpanded, setIsMetadataExpanded] = useState<boolean>(true);

  // Knowledge retention checkbox (Separate from Analyse)
  const [keepAsKnowledgeReview, setKeepAsKnowledgeReview] = useState<boolean>(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  type PanelError = { detail: string; guidance?: string };
  const [analysisError, setAnalysisError] = useState<PanelError | null>(null);
  const [emailError, setEmailError] = useState<PanelError | null>(null);

  // Question selection for Reply
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  
  // Email Reply draft state
  const [replyRecipient, setReplyRecipient] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Modals state
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDatasheetModalOpen, setIsDatasheetModalOpen] = useState(false);
  const [isReadinessGateOpen, setIsReadinessGateOpen] = useState(false);
  const [isPricingRequestOpen, setIsPricingRequestOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Attached files
  const [simulatedFiles, setSimulatedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [ostendoQuoteRef, setOstendoQuoteRef] = useState("");

  // Product extended detail accordion
  const [showExtendedProductSpecs, setShowExtendedProductSpecs] = useState(false);

  // Streaming progress
  const [analysisSourceHash, setAnalysisSourceHash] = useState<string>("");
  const [streamedChunkPreview, setStreamedChunkPreview] = useState<string>("");
  const [progressStages, setProgressStages] = useState<Array<{ id: string; label: string; status: "pending" | "active" | "complete" | "failed" }>>([
    { id: "reading", label: "Reading enquiry text & attachments", status: "pending" },
    { id: "extracting", label: "Extracting project scope & lighting requirements", status: "pending" },
    { id: "cross_checking", label: "Cross-checking extracted requirements", status: "pending" },
    { id: "product_matching", label: "Matching Plasgain luminaires & poles (exact SKUs)", status: "pending" },
    { id: "finalizing", label: "Compiling requirements matrix & readiness report", status: "pending" }
  ]);

  // Sync email draft when analysis completes or changes
  useEffect(() => {
    if (currentEnquiryAnalysis) {
      const summary = currentEnquiryAnalysis.opportunitySummary;
      const contact = (typeof summary?.customer === "object" ? summary.customer?.value : "") || rawEnquiryInput.customer || "Valued Client";
      const project = (typeof summary?.project === "object" ? summary.project?.value : "") || rawEnquiryInput.project || "Lighting Project";
      const company = (typeof summary?.company === "object" ? summary.company?.value : "") || rawEnquiryInput.company || "";
      const rec = currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint;
      
      setReplyRecipient(rawEnquiryInput.contact || rawEnquiryInput.customer || "");
      setReplySubject(`Plasgain Lighting Proposal / Technical Scope — ${project}${company ? ` (${company})` : ""}`);

      // Build default draft
      const qList = selectedQuestions.length > 0
        ? selectedQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")
        : (currentEnquiryAnalysis.questionsBeforeWeQuote || [])
            .slice(0, 3)
            .map((q, idx) => `${idx + 1}. ${q.question}`)
            .join("\n");

      const startingPointCode = rec?.productCode ? ` (${rec.productCode})` : "";
      const startingPointName = rec?.productName || "Plasgain Solar Public Lighting System";

      setReplyBody(
        `Hi ${contact},\n\nThank you for reaching out regarding the ${project} lighting requirements.\n\nBased on your preliminary scope, ${startingPointName}${startingPointCode} looks like a strong starting point for this installation.\n\nTo put together a firm quotation, could you please confirm the following details?\n\n${qList || "1. Target lighting subcategory (e.g. Cat P4/P5)\n2. Mounting height and pole preference (Direct burial composite vs Rag-bolt)\n3. Shading or solar aspect details"}\n\nOnce confirmed, we'll put together a full quotation schedule for your review.\n\nBest regards,\n${currentUser?.name || "Plasgain Sales Team"}\nPlasgain Pty Ltd`
      );
    }
  }, [currentEnquiryAnalysis]);

  // Update reply body when selected questions change
  const handleToggleQuestion = (qText: string) => {
    const nextSelected = selectedQuestions.includes(qText)
      ? selectedQuestions.filter((q) => q !== qText)
      : [...selectedQuestions, qText];
    
    setSelectedQuestions(nextSelected);

    // Update body with newly selected questions if replyBody is active
    if (replyBody) {
      const qList = nextSelected.length > 0
        ? nextSelected.map((q, idx) => `${idx + 1}. ${q}`).join("\n")
        : "1. Confirmation of target AS/NZS 1158 lighting subcategory\n2. Mounting height and pole preference\n3. Power supply or solar autonomy requirements";
      
      // Replace numbered list section in email body if possible
      const lines = replyBody.split("\n");
      const startIdx = lines.findIndex(l => /could you please confirm|details\?/i.test(l));
      const endIdx = lines.findIndex(l => /Once confirmed|Best regards/i.test(l));
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const pre = lines.slice(0, startIdx + 2).join("\n");
        const post = lines.slice(endIdx).join("\n");
        setReplyBody(`${pre}\n${qList}\n\n${post}`);
      }
    }
  };

  const handleInputChange = (field: keyof typeof rawEnquiryInput, value: string) => {
    setRawEnquiryInput({
      ...rawEnquiryInput,
      [field]: value
    });
  };

  const computeRawHash = (text: string) => {
    return `${text.trim().length}:${text.slice(0, 30)}`;
  };

  const hasCustomerName = Boolean(rawEnquiryInput.customer?.trim() || rawEnquiryInput.company?.trim());

  const isEnquiryModifiedSinceAnalysis = Boolean(
    currentEnquiryAnalysis &&
    analysisSourceHash &&
    computeRawHash(rawEnquiryInput.rawContent) !== analysisSourceHash
  );

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

  const handleRemoveFile = (index: number) => {
    setSimulatedFiles(simulatedFiles.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!hasCustomerName) {
      showToast("Please enter at least a customer name in Customer details before analysing", "warning");
      setIsMetadataExpanded(true);
      return;
    }

    const textareaEl = typeof document !== "undefined"
      ? (document.querySelector('textarea[aria-label="Pasted customer email, notes, or RFQ content"]') as HTMLTextAreaElement | null)
      : null;
    const content = rawEnquiryInput.rawContent || textareaEl?.value || "";

    if (!content && simulatedFiles.length === 0) {
      showToast("Please enter customer enquiry text or upload a document", "warning");
      return;
    }

    if (!rawEnquiryInput.rawContent && content) {
      setRawEnquiryInput({ ...rawEnquiryInput, rawContent: content });
    }

    setIsLoading(true);
    setAnalysisError(null);
    setStreamedChunkPreview("");

    // Reset stages
    setProgressStages([
      { id: "reading", label: "Reading enquiry text & attachments", status: "active" },
      { id: "extracting", label: "Extracting project scope & lighting requirements", status: "pending" },
      { id: "cross_checking", label: "Cross-checking extracted requirements", status: "pending" },
      { id: "product_matching", label: "Matching Plasgain luminaires & poles (exact SKUs)", status: "pending" },
      { id: "finalizing", label: "Compiling requirements matrix & readiness report", status: "pending" }
    ]);

    const jobId = `job-${Date.now()}`;
    const pName = rawEnquiryInput.project || rawEnquiryInput.company || "Customer Tender";
    setActiveBackgroundAnalysisJob({ id: jobId, projectName: pName, status: "running" });

    try {
      const data = await apiStreamPost<EnquiryAnalysisResult>(
        "/api/enquiry/analyze-stream",
        {
          rawEnquiry: content,
          metadata: {
            customerName: rawEnquiryInput.customer,
            customer: rawEnquiryInput.customer,
            contactName: rawEnquiryInput.customer,
            company: rawEnquiryInput.company,
            projectName: rawEnquiryInput.project,
            project: rawEnquiryInput.project,
            location: rawEnquiryInput.location,
            source: rawEnquiryInput.source,
            attachedFiles: simulatedFiles.map((f) => f.name),
            keepAsKnowledgeReview: keepAsKnowledgeReview
          }
        },
        {
          onStage: (stage) => {
            setProgressStages((prev) => {
              const stageOrder = ["reading", "extracting", "cross_checking", "product_matching", "finalizing"];
              const currentIdx = stageOrder.indexOf(stage.stage);
              return prev.map((s, idx) => {
                if (idx < currentIdx) return { ...s, status: "complete" };
                if (idx === currentIdx) return { ...s, status: stage.status === "failed" ? "failed" : "active" };
                return { ...s, status: "pending" };
              });
            });
          },
          onChunk: (delta) => {
            setStreamedChunkPreview((prev) => (prev + delta).slice(-400));
          },
          onComplete: (finalResult) => {
            if (finalResult) {
              setCurrentEnquiryAnalysis(finalResult);
              setAnalysisSourceHash(computeRawHash(rawEnquiryInput.rawContent));
              if (finalResult.questionsBeforeWeQuote && finalResult.questionsBeforeWeQuote.length > 0) {
                setSelectedQuestions(
                  finalResult.questionsBeforeWeQuote.slice(0, 3).map((q: { question: string }) => q.question)
                );
              }
              // Auto-collapse original input to make results the central workspace
              setIsInputExpanded(false);
            }
          }
        }
      );

      if (data) {
        setCurrentEnquiryAnalysis(data);
        setAnalysisSourceHash(computeRawHash(rawEnquiryInput.rawContent));
        if (data.questionsBeforeWeQuote && data.questionsBeforeWeQuote.length > 0) {
          setSelectedQuestions(
            data.questionsBeforeWeQuote.slice(0, 3).map((q: { question: string }) => q.question)
          );
        }
        setIsInputExpanded(false);
      }

      setProgressStages((prev) => prev.map((s) => ({ ...s, status: "complete" })));
      setActiveBackgroundAnalysisJob({ id: jobId, projectName: pName, status: "complete" });

      addNotification({
        type: "info",
        title: "Enquiry Analysis Completed",
        message: `Structured analysis generated for "${pName}".`,
        isArchived: false
      });

      if (keepAsKnowledgeReview && simulatedFiles.length > 0) {
        showToast(
          `Enquiry analysed! ${simulatedFiles.length} document(s) submitted for knowledge governance review (Pending Approval).`,
          "info"
        );
      } else {
        showToast("Enquiry analysed successfully!", "success");
      }
    } catch (err) {
      console.warn("Enquiry analysis failed:", err);
      // DO NOT wipe the user's raw input or attachments!
      setCurrentEnquiryAnalysis(null);
      setIsInputExpanded(true);
      setAnalysisError(
        err instanceof AIUnavailableError
          ? { detail: err.detail, guidance: err.guidance }
          : {
              detail: toUserMessage(err),
              guidance: "Retry analysis, or work the enquiry manually — your text and attachments have been preserved."
            }
      );

      setProgressStages((prev) =>
        prev.map((s) => (s.status === "complete" ? s : { ...s, status: "failed" }))
      );
      setActiveBackgroundAnalysisJob({ id: jobId, projectName: pName, status: "failed" });

      showToast("Analysis unavailable — enquiry text preserved for retry", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineCreateAccount = () => {
    if (!rawEnquiryInput.company) return;
    const newAcc = {
      id: `acc-${Date.now()}`,
      name: rawEnquiryInput.company,
      industry: "Civil Contractor / Lighting",
      tier: "Tier 2",
      totalPipelineValue: 0,
      openDealsCount: 0,
      activeProjectsCount: 0,
      health: "Healthy" as const,
      healthReasons: ["Created from New Enquiry ingestion"],
      primaryContactName: rawEnquiryInput.customer || "Engineering Contact",
      primaryContactEmail: rawEnquiryInput.contact?.includes("@") ? rawEnquiryInput.contact : "enquiries@" + rawEnquiryInput.company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com.au",
      primaryContactPhone: !rawEnquiryInput.contact?.includes("@") ? rawEnquiryInput.contact : "1300 PLASGAIN",
      billingAddress: rawEnquiryInput.location || "Victoria, Australia",
      shippingAddress: rawEnquiryInput.location || "Victoria, Australia",
      paymentTerms: "Net 30 Days",
      ostendoCustomerCode: `CUST-${rawEnquiryInput.company.slice(0, 4).toUpperCase()}`
    };
    addAccount(newAcc);
    showToast(`Created new CRM Account: ${rawEnquiryInput.company}`, "success");
  };

  const handleSaveOpportunity = (shouldNavigate: boolean = true) => {
    if (!currentEnquiryAnalysis) return;

    const oppSummary = currentEnquiryAnalysis.opportunitySummary;
    const rec = currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint;
    const company = (typeof oppSummary?.company === "object" ? oppSummary.company?.value : "") || rawEnquiryInput.company || "Prospective Client";
    const project = (typeof oppSummary?.project === "object" ? oppSummary.project?.value : "") || rawEnquiryInput.project || "Lighting Project";
    const contact = (typeof oppSummary?.customer === "object" ? oppSummary.customer?.value : "") || rawEnquiryInput.customer || "Primary Contact";
    const location = (typeof oppSummary?.location === "object" ? oppSummary.location?.value : "") || rawEnquiryInput.location || "VIC, Australia";
    const appType = (typeof oppSummary?.application === "object" ? oppSummary.application?.value : "") || "Public Pathway Lighting";
    const qty = parseInt((typeof oppSummary?.quantity === "object" ? oppSummary.quantity?.value : "1") || "1", 10) || 1;

    let matchedAccount = accounts.find((a) => a.name.toLowerCase() === company.toLowerCase());
    let accId = matchedAccount?.id;
    if (!matchedAccount && company) {
      accId = `acc-${Date.now()}`;
      addAccount({
        id: accId,
        name: company,
        industry: "Civil Contractor / Lighting",
        tier: "Tier 2",
        totalPipelineValue: 0,
        openDealsCount: 1,
        activeProjectsCount: 1,
        health: "Healthy",
        healthReasons: ["Auto-created from Enquiry Analysis Ingestion"],
        primaryContactName: contact,
        primaryContactEmail: rawEnquiryInput.contact?.includes("@") ? rawEnquiryInput.contact : "",
        primaryContactPhone: !rawEnquiryInput.contact?.includes("@") ? rawEnquiryInput.contact : "",
        billingAddress: location,
        shippingAddress: location,
        paymentTerms: "Net 30 Days",
        ostendoCustomerCode: `CUST-${company.slice(0, 4).toUpperCase()}`
      });
    }

    const crmOppId = `opp-${Date.now()}`;
    const unitPrice = 1450;
    const totalVal = qty * unitPrice;

    addCrmOpportunity({
      id: crmOppId,
      name: `${project} - ${company}`,
      accountId: accId || "acc-direct",
      accountName: company,
      primaryContactName: contact,
      primaryContactEmail: rawEnquiryInput.contact?.includes("@") ? rawEnquiryInput.contact : "",
      opportunityOwner: currentUser?.name || "Travis Maher",
      pipelineId: "pipe-major-projects",
      stageId: "stage-new",
      stageName: "New Opportunity",
      dealValue: totalVal,
      dealValueBasis: "Estimate",
      weightedValue: Math.round(totalVal * 0.2),
      probability: 20,
      forecastCategory: "Pipeline",
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      products: [
        {
          id: `prod-${Date.now()}`,
          productCode: rec?.productCode || "PB-75W-3K",
          productName: rec?.productName || "Plasgain Solar Luminaire",
          category: "Solar Public Lighting",
          quantity: qty,
          unit: "ea",
          costPrice: 900,
          unitPrice: unitPrice,
          totalPrice: totalVal,
          marginPercent: 38,
          isOstendoVerified: true,
          notes: rec?.whySuitable || "Matched via Enquiry Analyzer"
        }
      ],
      projectApplication: appType,
      location: location,
      customerNeed: rawEnquiryInput.rawContent.slice(0, 300),
      keyRequirements: [
        oppSummary?.mountingPoleRequirements?.value ? `Pole: ${oppSummary.mountingPoleRequirements.value}` : "6.0m Composite Pole",
        oppSummary?.operatingRequirements?.value ? `Operating: ${oppSummary.operatingRequirements.value}` : "AS/NZS 1158 Cat P4 Profile"
      ],
      source: rawEnquiryInput.source || "Email Enquiry",
      ostendoQuoteRef: ostendoQuoteRef || `Q-${Math.floor(10000 + Math.random() * 90000)}`,
      quoteRevision: "Rev A",
      quoteStatus: "Draft",
      quoteExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      latestActivity: "Enquiry analysed and created in CRM Deals",
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: currentEnquiryAnalysis.nextBestAction?.title || "Send preliminary quotation & schedule technical follow-up",
      nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["Fresh qualified enquiry from New Enquiry Workspace"],
      notes: `Original enquiry: ${rawEnquiryInput.rawContent.slice(0, 200)}...`
    });

    if (shouldNavigate) {
      showToast("Saved deal to CRM Pipeline!", "success");
      navigateToCRM("pipeline", crmOppId);
    }
    return crmOppId;
  };

  const renderStatusBadge = (field: StatusField | undefined) => {
    const status: FieldStatus = field?.status || "Unknown";
    if (status === "Confirmed") {
      return (
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
          <Check className="w-3 h-3 text-emerald-600" />
          Confirmed
        </span>
      );
    }
    if (status === "Inferred") {
      return (
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wider">
          <Info className="w-3 h-3 text-blue-600" />
          Inferred
        </span>
      );
    }
    if (status === "Conflicting") {
      return (
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3 text-purple-600" />
          Conflicting
        </span>
      );
    }
    if (status === "Needs clarification") {
      return (
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
          <HelpCircle className="w-3 h-3 text-amber-600" />
          Needs Clarification
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 uppercase tracking-wider">
        <XCircle className="w-3 h-3 text-red-600" />
        Missing
      </span>
    );
  };

  // Derive source provenance string for a requirement field
  const getFieldSource = (key: string, field: StatusField | undefined): string => {
    if (field?.source) return field.source;
    if (field?.status === "Confirmed") {
      if (simulatedFiles.length > 0) return `Attached Document (${simulatedFiles[0].name})`;
      return "Customer Enquiry Text";
    }
    if (field?.status === "Inferred") {
      return "Inferred from AS/NZS 1158 application standards";
    }
    if (field?.status === "Conflicting") {
      return "Discrepancy between Enquiry Text and Attached Spec";
    }
    return "Not supplied in customer input";
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* PART A: ONE CLEAR PAGE TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-body">New enquiry</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            Analyse customer RFQ notes or tender documents to extract technical parameters, ground product selection, and draft a response.
          </p>
        </div>

        {currentEnquiryAnalysis && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCurrentEnquiryAnalysis(null);
                setIsInputExpanded(true);
                setRawEnquiryInput({
                  rawContent: "",
                  customer: "",
                  contact: "",
                  company: "",
                  project: "",
                  location: "",
                  source: "Email"
                });
                setSimulatedFiles([]);
              }}
              className="text-spec text-ink-dim hover:text-ink bg-white hover:bg-raised px-3 py-1.5 rounded-edge border border-line font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>+ New enquiry</span>
            </button>

            {/* Consolidated Actions Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="text-spec font-bold px-3 py-1.5 rounded-edge bg-white hover:bg-raised text-body border border-line transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-ink-dim" />
                <span>Export & Tools</span>
                <ChevronDown className="w-3 h-3 text-ink-dim" />
              </button>

              {isActionMenuOpen && (
                <div className="absolute right-0 mt-1 w-60 bg-white rounded-edge shadow-lg border border-line p-1.5 z-40 space-y-1 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsDatasheetModalOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-meta text-body hover:bg-surface rounded font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Download Tender Package</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      const items = [];
                      if (currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint) {
                        const resolved = resolveProductsForDeal([currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productName]);
                        const prodCode = resolved[0]?.code || currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productCode || "";
                        const qty = parseInt(currentEnquiryAnalysis.opportunitySummary?.quantity?.value || "1", 10) || 1;
                        items.push({
                          itemCode: prodCode,
                          description: currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productName,
                          quantity: qty,
                          unit: "ea",
                          lineNotes: currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.whySuitable || ""
                        });
                      }
                      const validation = validateOstendoItems(items);
                      if (!validation.valid) {
                        showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                        return;
                      }
                      const csvData = formatOstendoCSV(items, ostendoQuoteRef || "OST-ENQUIRY");
                      downloadOstendoCSV(csvData, `Ostendo_Product_List_${(rawEnquiryInput.project || "Enquiry").replace(/\s+/g, "_")}.csv`);
                      showToast("Ostendo CSV downloaded. Ostendo will calculate pricing, tax, and totals.", "success");
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-meta text-body hover:bg-surface rounded font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Download Ostendo CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsActionMenuOpen(false);
                      const items = [];
                      if (currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint) {
                        const resolved = resolveProductsForDeal([currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productName]);
                        const prodCode = resolved[0]?.code || currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productCode || "";
                        const qty = parseInt(currentEnquiryAnalysis.opportunitySummary?.quantity?.value || "1", 10) || 1;
                        items.push({
                          itemCode: prodCode,
                          description: currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productName,
                          quantity: qty,
                          unit: "ea",
                          lineNotes: currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.whySuitable || ""
                        });
                      }
                      const validation = validateOstendoItems(items);
                      if (!validation.valid) {
                        showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                        return;
                      }
                      await copyOstendoProductList(items, ostendoQuoteRef || "OST-ENQUIRY");
                      showToast("Product list copied to clipboard!", "success");
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-meta text-body hover:bg-surface rounded font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Copy Product List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setIsFollowUpModalOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-meta text-body hover:bg-surface rounded font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Draft Follow-Up Sequence</span>
                  </button>
                </div>
              )}
            </div>

            {/* Primary Save Action */}
            <button
              onClick={() => handleSaveOpportunity(true)}
              className="text-spec font-bold px-4 py-1.5 rounded-edge bg-brand-deep hover:bg-brand text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Save structured opportunity to CRM Deals Pipeline"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to CRM</span>
            </button>
          </div>
        )}
      </div>

      {/* PART F: COLLAPSED ORIGINAL ENQUIRY SUMMARY (When analysed) */}
      {currentEnquiryAnalysis && !isInputExpanded && (
        <div className="bg-white rounded-panel border border-line p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-spec">
              <span className="font-bold text-body">Original enquiry:</span>
              <span className="text-brand-deep font-semibold truncate">
                {rawEnquiryInput.project || rawEnquiryInput.company || "Direct Customer Enquiry"}
              </span>
              <span className="text-ink-faint">•</span>
              <span className="text-ink-dim">
                {rawEnquiryInput.customer || "Contact not stated"}
                {rawEnquiryInput.company ? ` · ${rawEnquiryInput.company}` : ""}
              </span>
              {simulatedFiles.length > 0 && (
                <>
                  <span className="text-ink-faint">•</span>
                  <span className="bg-brand-wash text-brand-deep font-bold px-1.5 py-0.5 rounded text-[11px]">
                    {simulatedFiles.length} attachment(s)
                  </span>
                </>
              )}
            </div>
            <p className="text-spec text-ink-dim truncate font-mono max-w-2xl">
              "{rawEnquiryInput.rawContent.slice(0, 120)}..."
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsInputExpanded(true)}
              className="text-spec font-bold text-brand-deep hover:underline px-2.5 py-1 rounded bg-brand-wash border border-brand-edge flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View / Edit enquiry</span>
            </button>
          </div>
        </div>
      )}

      {/* PART B & C: PRIMARY INPUT FORM (Enquiry Text, Attachments, Collapsible Customer Details) */}
      {(!currentEnquiryAnalysis || isInputExpanded) && (
        <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-deep" />
              <h2 className="text-body font-bold text-base">
                {currentEnquiryAnalysis ? "Edit Customer Enquiry" : "What did the customer ask for?"}
              </h2>
            </div>
            {currentEnquiryAnalysis && (
              <button
                type="button"
                onClick={() => setIsInputExpanded(false)}
                className="text-spec text-ink-dim hover:text-ink font-medium cursor-pointer"
              >
                Hide form &uarr;
              </button>
            )}
          </div>

          {/* Primary Textarea: Pasted email, notes, RFQ */}
          <div>
            <textarea
              aria-label="Pasted customer email, notes, or RFQ content"
              value={rawEnquiryInput.rawContent}
              onChange={(e) => handleInputChange("rawContent", e.target.value)}
              placeholder="Paste raw customer email, telephone notes, RFQ extract, project specification, or tender requirements here..."
              rows={5}
              className="w-full text-meta p-3.5 rounded-edge border border-line focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep placeholder:text-ink-faint font-mono bg-raised"
            />
          </div>

          {/* Attachments & Knowledge Option Area */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-1.5 text-meta text-body hover:text-brand-deep bg-surface hover:bg-hover px-3 py-1.5 rounded-edge border border-line cursor-pointer transition-colors font-medium">
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

              <button
                type="button"
                onClick={() => navigateToWorkflow("tools", "plan-takeoff")}
                className="inline-flex items-center gap-1.5 text-meta text-brand-deep hover:bg-brand-wash px-3 py-1.5 rounded-edge border border-brand-edge font-bold transition-colors cursor-pointer"
                title="Open dedicated architectural drawing & schedule takeoff tool"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-deep" />
                <span>Decipher Plan / BOM Take-off &rarr;</span>
              </button>
            </div>

            {/* Attached file tags */}
            {simulatedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {simulatedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 bg-raised border border-line px-2.5 py-1 rounded text-spec text-body font-mono"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-deep" />
                    <span>{file.name}</span>
                    <span className="text-ink-faint">({file.size})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-ink-faint hover:text-urgent cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* PART D: SEPARATE ENQUIRY ANALYSIS FROM KNOWLEDGE INGESTION */}
            {simulatedFiles.length > 0 && (
              <div className="p-3 bg-surface/70 border border-line rounded-edge space-y-1">
                <label className="flex items-center gap-2 text-spec font-medium text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepAsKnowledgeReview}
                    onChange={(e) => setKeepAsKnowledgeReview(e.target.checked)}
                    className="rounded text-brand-deep focus:ring-brand-deep border-line-strong"
                  />
                  <span>Keep uploaded document for knowledge review (requires administrative approval)</span>
                </label>
                <p className="text-[11px] text-ink-dim pl-5 leading-tight">
                  Attached documents are used to analyse this specific enquiry. Checking this queues the document for review in Document Governance before it can be added to the approved product library.
                </p>
              </div>
            )}
          </div>

          {/* PART C: CUSTOMER DETAILS (Collapsible 3-column Grid) */}
          <div className="pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
              className="flex items-center justify-between w-full py-1 text-left text-spec font-bold text-ink-dim hover:text-body cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-ink-faint" />
                <span>Customer details</span>
                <span className="text-red-500 font-bold">*</span>
                {hasCustomerName ? (
                  <span className="text-brand-deep text-[11px] bg-brand-wash px-2 py-0.5 rounded font-semibold ml-2">
                    {[rawEnquiryInput.company, rawEnquiryInput.customer, rawEnquiryInput.project].filter(Boolean).length} entered
                  </span>
                ) : (
                  <span className="text-amber-700 text-[11px] bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium ml-2">
                    Required
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-ink-faint text-spec">
                <span>{isMetadataExpanded ? "Collapse" : "Expand"}</span>
                {isMetadataExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isMetadataExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-3 animate-in fade-in duration-150">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="company-name-input" className="block text-spec font-semibold text-ink-dim">Account / Company</label>
                    {rawEnquiryInput.company && !accounts.some(a => a.name.toLowerCase() === rawEnquiryInput.company.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={handleInlineCreateAccount}
                        className="text-[10px] text-brand-deep font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Create CRM Account</span>
                      </button>
                    )}
                  </div>
                  <input
                    id="company-name-input"
                    type="text"
                    value={rawEnquiryInput.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="e.g. Wyndham Civil Group"
                    className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
                  />
                  {rawEnquiryInput.company && (
                    <div className="mt-1 text-[10px]">
                      {accounts.some(a => a.name.toLowerCase() === rawEnquiryInput.company.toLowerCase()) ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched CRM Account
                        </span>
                      ) : (
                        <span className="text-ink-faint">New account (will be created on save)</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-name-input" className="block text-spec font-semibold text-ink-dim mb-1">
                    Customer Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    id="contact-name-input"
                    aria-label="Customer Name"
                    type="text"
                    value={rawEnquiryInput.customer}
                    onChange={(e) => handleInputChange("customer", e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
                  />
                </div>

                <div>
                  <label htmlFor="contact-details-input" className="block text-spec font-semibold text-ink-dim mb-1">Contact Email / Phone</label>
                  <input
                    id="contact-details-input"
                    type="text"
                    value={rawEnquiryInput.contact}
                    onChange={(e) => handleInputChange("contact", e.target.value)}
                    placeholder="sarah@wyndhamcivil.com.au"
                    className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
                  />
                </div>

                <div>
                  <label htmlFor="project-name-input" className="block text-spec font-semibold text-ink-dim mb-1">Project Name</label>
                  <input
                    id="project-name-input"
                    type="text"
                    value={rawEnquiryInput.project}
                    onChange={(e) => handleInputChange("project", e.target.value)}
                    placeholder="e.g. Melton Shared Path Lighting"
                    className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
                  />
                </div>

                <div>
                  <label htmlFor="location-input" className="block text-spec font-semibold text-ink-dim mb-1">Location / State</label>
                  <input
                    id="location-input"
                    type="text"
                    value={rawEnquiryInput.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="e.g. Melton, VIC"
                    className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
                  />
                </div>

                <div>
                  <label htmlFor="source-select" className="block text-spec font-semibold text-ink-dim mb-1">Enquiry Source</label>
                  <select
                    id="source-select"
                    value={rawEnquiryInput.source}
                    onChange={(e) => handleInputChange("source", e.target.value)}
                    className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-white"
                  >
                    <option value="Email">Email</option>
                    <option value="Phone Notes">Phone Call Notes</option>
                    <option value="Tender Portal">Tender Portal / RFQ</option>
                    <option value="Website Form">Website Form</option>
                    <option value="In-person Meeting">In-person Meeting</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* PART E: ANALYSIS ACTION HIERARCHY */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-line">
            {!hasCustomerName && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <span>* Enter a customer name in Customer details to analyse</span>
              </p>
            )}
            <div className="flex items-center justify-end flex-1">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading || !hasCustomerName}
                title={!hasCustomerName ? "Please enter at least a customer name to analyse enquiry" : "Analyse enquiry"}
                className="bg-brand-deep hover:bg-brand text-white font-bold px-6 py-2 rounded-edge text-meta transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analysing enquiry...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-soon-on-ink" />
                    <span>Analyse enquiry</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PART O: COMPACT STREAMING PROGRESS STEPPER */}
          {isLoading && (
            <div className="p-4 bg-paper rounded-edge border border-line space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span>Analysis In Progress</span>
                </span>
                <span className="text-spec font-mono text-ink-muted">Enquiry Analyser</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {progressStages.map((st, sIdx) => {
                  const isComplete = st.status === "complete";
                  const isActive = st.status === "active";
                  const isFailed = st.status === "failed";
                  return (
                    <div
                      key={st.id}
                      className={`p-2 rounded-edge border text-spec transition-all ${
                        isComplete
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : isActive
                          ? "bg-brand/10 border-brand text-brand-deep ring-1 ring-brand/30 font-bold"
                          : isFailed
                          ? "bg-red-50 border-red-300 text-red-900"
                          : "bg-surface/60 border-line text-ink-dim opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold">0{sIdx + 1}</span>
                        {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {isActive && <div className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />}
                        {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                      <p className="line-clamp-2 leading-tight font-medium text-[11px]">{st.label}</p>
                    </div>
                  );
                })}
              </div>

              {streamedChunkPreview && (
                <div className="p-2 bg-surface rounded border border-line font-mono text-[11px] text-ink-dim truncate">
                  <span className="text-brand-deep font-bold mr-1">Stream Output:</span>
                  {streamedChunkPreview}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stale Enquiry Warning if edited after analysis */}
      {isEnquiryModifiedSinceAnalysis && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-meta text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold text-amber-900">Enquiry text has changed since analysis was generated</p>
              <p className="text-spec text-amber-800">
                To prevent outdated specifications in quotes and customer communications, re-analyse the enquiry.
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-spec rounded-edge shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reanalyse enquiry</span>
          </button>
        </div>
      )}

      {/* Error state with user input preserved */}
      {analysisError && !currentEnquiryAnalysis && (
        <AIUnavailableNotice
          detail={analysisError.detail}
          guidance={analysisError.guidance}
          onRetry={handleAnalyze}
        />
      )}

      {/* PART G: RESULTS REBUILT AROUND FOUR SECTIONS */}
      {currentEnquiryAnalysis && (
        <div className="space-y-4">
          {/* SECTION NAVIGATION TABS: Summary | Requirements | Products | Reply */}
          <div className="border-b border-line flex items-center gap-1 overflow-x-auto">
            <button
              aria-label="Summary tab"
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "summary"
                  ? "border-brand-deep text-brand-deep"
                  : "border-transparent text-ink-dim hover:text-body"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Summary</span>
            </button>

            <button
              aria-label="Requirements tab"
              onClick={() => setActiveTab("requirements")}
              className={`px-4 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "requirements"
                  ? "border-brand-deep text-brand-deep"
                  : "border-transparent text-ink-dim hover:text-body"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Requirements</span>
              {currentEnquiryAnalysis.readiness?.missingItems?.length ? (
                <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-800 text-[10px] font-mono font-bold ml-1">
                  {currentEnquiryAnalysis.readiness.missingItems.length}
                </span>
              ) : null}
            </button>

            <button
              aria-label="Products tab"
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "products"
                  ? "border-brand-deep text-brand-deep"
                  : "border-transparent text-ink-dim hover:text-body"
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Products</span>
              {currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint?.productCode && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                  {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productCode}
                </span>
              )}
            </button>

            <button
              aria-label="Reply tab"
              onClick={() => setActiveTab("reply")}
              className={`px-4 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "reply"
                  ? "border-brand-deep text-brand-deep"
                  : "border-transparent text-ink-dim hover:text-body"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Reply</span>
              {selectedQuestions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-brand-deep text-white text-[10px] font-mono font-bold ml-1">
                  {selectedQuestions.length} Qs
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: SUMMARY (Part H) */}
          {activeTab === "summary" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* BLOCKERS ABOVE THE FOLD */}
              {currentEnquiryAnalysis.readiness?.missingItems && currentEnquiryAnalysis.readiness.missingItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-panel p-4 text-red-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <h3 className="text-spec font-bold uppercase tracking-wider text-red-900">
                        Quotation Blockers & Information Needed Before Firm Quote
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("requirements")}
                      className="text-spec font-bold text-red-800 hover:underline cursor-pointer"
                    >
                      Inspect Requirements &rarr;
                    </button>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-spec pl-6 list-disc">
                    {currentEnquiryAnalysis.readiness.missingItems.map((item, idx) => (
                      <li key={idx} className="leading-snug">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Next Best Action Card */}
                <div className="lg:col-span-2 bg-[#0F172A] text-white rounded-panel p-5 shadow-sm border border-chrome-line flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-spec font-bold tracking-widest text-brand-lift uppercase">
                        RECOMMENDED NEXT ACTION
                      </span>
                      <span className="text-spec font-semibold px-2 py-0.5 rounded bg-chrome-raised text-ink-faint border border-chrome-line">
                        Urgency: {currentEnquiryAnalysis.nextBestAction?.urgency || "Today"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {currentEnquiryAnalysis.nextBestAction?.title}
                    </h3>
                    <p className="text-meta text-ink-faint leading-relaxed max-w-xl">
                      {currentEnquiryAnalysis.nextBestAction?.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-chrome-line">
                    <button
                      onClick={() => setActiveTab("reply")}
                      className="bg-brand-deep hover:bg-brand text-white font-medium px-4 py-1.5 rounded-edge text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{currentEnquiryAnalysis.nextBestAction?.primaryActionLabel || "Draft Customer Reply"}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("products")}
                      className="bg-chrome-raised hover:bg-chrome-raised text-chrome-text font-medium px-3 py-1.5 rounded-edge text-spec transition-colors border border-chrome-line flex items-center gap-1 cursor-pointer"
                    >
                      <span>Review Product Matches &rarr;</span>
                    </button>
                  </div>
                </div>

                {/* Quoting Feasibility / Readiness Gauge */}
                <div className="bg-white rounded-panel border border-line p-5 shadow-xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-spec uppercase font-bold text-ink-faint">Readiness Rating</span>
                      <span
                        className={`text-spec font-bold px-2 py-0.5 rounded ${
                          (currentEnquiryAnalysis.readiness?.score ?? 0) >= 80
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : (currentEnquiryAnalysis.readiness?.score ?? 0) >= 50
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {currentEnquiryAnalysis.readiness?.rating || "In Review"}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-black text-brand-deep">
                        {(currentEnquiryAnalysis.readiness?.score ?? 0)}%
                      </span>
                      <span className="text-spec text-ink-dim">Scope Completeness</span>
                    </div>

                    <div className="w-full bg-paper rounded-full h-1.5 overflow-hidden mb-2 border border-line">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          (currentEnquiryAnalysis.readiness?.score ?? 0) >= 80
                            ? "bg-emerald-500"
                            : (currentEnquiryAnalysis.readiness?.score ?? 0) >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${(currentEnquiryAnalysis.readiness?.score ?? 0)}%` }}
                      ></div>
                    </div>

                    <p className="text-spec text-ink-dim leading-snug">
                      {currentEnquiryAnalysis.readiness?.summaryExplanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-spec">
                    <div className="bg-emerald-50/70 p-2 rounded-edge border border-emerald-200">
                      <span className="font-bold text-emerald-900 block">{(currentEnquiryAnalysis.readiness?.knownItems?.length ?? 0)} Confirmed</span>
                    </div>
                    <div className="bg-red-50/70 p-2 rounded-edge border border-red-200">
                      <span className="font-bold text-red-900 block">{(currentEnquiryAnalysis.readiness?.missingItems?.length ?? 0)} Missing</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Scope & Project Intent Summary */}
              <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-body text-spec uppercase tracking-wider text-ink-dim">
                  Project Intent & Environmental Scope
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-meta">
                  <div className="p-3 bg-surface rounded-edge border border-line">
                    <span className="text-spec text-ink-faint uppercase font-bold block">Application</span>
                    <span className="font-semibold text-body">
                      {(typeof currentEnquiryAnalysis.opportunitySummary?.application === "object" ? currentEnquiryAnalysis.opportunitySummary.application?.value : "") || "Public Trail / Roadway"}
                    </span>
                  </div>
                  <div className="p-3 bg-surface rounded-edge border border-line">
                    <span className="text-spec text-ink-faint uppercase font-bold block">Location / State</span>
                    <span className="font-semibold text-body">
                      {(typeof currentEnquiryAnalysis.opportunitySummary?.location === "object" ? currentEnquiryAnalysis.opportunitySummary.location?.value : "") || rawEnquiryInput.location || "Victoria, Australia"}
                    </span>
                  </div>
                  <div className="p-3 bg-surface rounded-edge border border-line">
                    <span className="text-spec text-ink-faint uppercase font-bold block">Target Quantity</span>
                    <span className="font-semibold text-body">
                      {(typeof currentEnquiryAnalysis.opportunitySummary?.quantity === "object" ? currentEnquiryAnalysis.opportunitySummary.quantity?.value : "") || "1 ea"}
                    </span>
                  </div>
                  <div className="p-3 bg-surface rounded-edge border border-line">
                    <span className="text-spec text-ink-faint uppercase font-bold block">Operating Profile</span>
                    <span className="font-semibold text-body">
                      {(typeof currentEnquiryAnalysis.opportunitySummary?.operatingRequirements === "object" ? currentEnquiryAnalysis.opportunitySummary.operatingRequirements?.value : "") || "Dusk to Dawn"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sales Coach Tip */}
              {currentEnquiryAnalysis.internalSalesCoachTip && (
                <div className="bg-surface rounded-panel border border-line p-4 text-meta flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-soon shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-body">Sales Advisory: </strong>
                    <span className="text-ink-dim">{currentEnquiryAnalysis.internalSalesCoachTip}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REQUIREMENTS TABLE & QUESTIONS (Part I & J) */}
          {activeTab === "requirements" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Consolidated Requirements Table */}
              <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                  <div>
                    <h3 className="font-bold text-body text-base">Consolidated Requirements Matrix</h3>
                    <p className="text-spec text-ink-dim">
                      Single source of truth for technical and commercial parameters with provenance tracking.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-spec">
                    <span className="flex items-center gap-1 text-emerald-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Confirmed
                    </span>
                    <span className="flex items-center gap-1 text-blue-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Inferred
                    </span>
                    <span className="flex items-center gap-1 text-red-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Missing
                    </span>
                    <span className="flex items-center gap-1 text-purple-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Conflicting
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-meta border-collapse">
                    <thead>
                      <tr className="bg-raised text-ink-dim border-b border-line text-spec font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-1/4">Requirement</th>
                        <th className="py-2.5 px-3 w-1/3">Extracted Value</th>
                        <th className="py-2.5 px-3 w-1/6">Status</th>
                        <th className="py-2.5 px-3 w-1/4">Source / Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-meta">
                      {Object.entries(currentEnquiryAnalysis.opportunitySummary).map(([key, rawField]) => {
                        const field = rawField as StatusField;
                        const label = key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase());
                        
                        const isMissing = !field?.value || field.status === "Unknown" || field.status === "Missing";

                        return (
                          <tr key={key} className="hover:bg-surface/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-body">{label}</td>
                            <td className="py-2.5 px-3 text-body">
                              {isMissing ? (
                                <span className="text-ink-faint italic">Unknown / Not specified</span>
                              ) : (
                                <span>{field.value}</span>
                              )}
                              {key === "cct" && (
                                <button
                                  type="button"
                                  onClick={() => setExplainingTerm("CCT (Correlated Colour Temperature)")}
                                  className="ml-2 text-spec text-brand-deep hover:underline font-medium cursor-pointer"
                                >
                                  Explain CCT
                                </button>
                              )}
                              {key === "standardsMentioned" && (
                                <button
                                  type="button"
                                  onClick={() => setExplainingTerm("AS/NZS 1158")}
                                  className="ml-2 text-spec text-brand-deep hover:underline font-medium cursor-pointer"
                                >
                                  Explain AS1158
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3">{renderStatusBadge(field)}</td>
                            <td className="py-2.5 px-3 text-spec text-ink-dim">
                              {getFieldSource(key, field)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PART J: CLARIFICATION QUESTIONS (Derived from Unresolved Requirements) */}
              {currentEnquiryAnalysis.questionsBeforeWeQuote && currentEnquiryAnalysis.questionsBeforeWeQuote.length > 0 && (
                <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                    <div>
                      <h3 className="font-bold text-body text-base">
                        Questions to Confirm with Customer
                      </h3>
                      <p className="text-spec text-ink-dim">
                        Derived directly from missing, inferred, or conflicting requirements above. Check questions to include in the reply email.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedQuestions(
                            currentEnquiryAnalysis.questionsBeforeWeQuote?.map((q) => q.question) || []
                          )
                        }
                        className="text-spec text-ink-dim hover:text-ink underline font-medium cursor-pointer"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedQuestions([])}
                        className="text-spec text-ink-dim hover:text-ink underline font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {currentEnquiryAnalysis.questionsBeforeWeQuote.map((q) => {
                      const isChecked = selectedQuestions.includes(q.question);
                      return (
                        <label
                          key={q.id}
                          className={`flex items-start gap-3 p-3 rounded-edge border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-brand-wash border-brand-edge"
                              : "bg-surface/50 border-line hover:border-line-strong"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleQuestion(q.question)}
                            className="mt-0.5 h-4 w-4 rounded text-brand-deep focus:ring-brand-deep border-line-strong cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-meta text-body">{q.question}</span>
                              <span className="text-spec font-bold px-1.5 py-0.5 rounded bg-white border border-line text-ink-dim">
                                {q.category}
                              </span>
                            </div>
                            <p className="text-spec text-ink-dim">
                              <strong className="text-ink-dim">Rationale:</strong> {q.whyItMatters}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between">
                    <span className="text-spec text-ink-dim">
                      {selectedQuestions.length} of {currentEnquiryAnalysis.questionsBeforeWeQuote.length} questions selected for reply
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("reply")}
                      className="bg-brand-deep hover:bg-brand text-white font-bold px-4 py-1.5 rounded-edge text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Review in Reply Draft &rarr;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCTS (Part K) */}
          {activeTab === "products" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Primary Recommended Starting Point */}
              {currentEnquiryAnalysis.productRecommendations?.recommendedStartingPoint ? (
                <div className="bg-white rounded-panel border border-brand-edge shadow-xs p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-spec font-bold uppercase tracking-wider text-brand-deep">
                          PRIMARY CANDIDATE
                        </span>
                        <span className="text-spec font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.matchLevel || "Suitable candidate"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-body mt-1">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productName}
                      </h3>
                      <span className="font-mono text-spec font-bold text-brand-deep bg-brand-wash px-2 py-0.5 rounded border border-brand-edge inline-block mt-1">
                        Exact SKU: {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productCode || "PB-75W-3K"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPricingRequestOpen(true)}
                        className="px-3 py-1.5 bg-surface hover:bg-hover text-body border border-line font-bold text-spec rounded-edge flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-brand-deep" />
                        <span>Request Pricing</span>
                      </button>
                    </div>
                  </div>

                  {/* Suitability */}
                  <div className="text-meta leading-relaxed">
                    <strong className="text-body font-bold">Suitability: </strong>
                    <span className="text-ink">
                      {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.whySuitable}
                    </span>
                  </div>

                  {/* Important Limitations */}
                  {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.importantLimitations && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-edge text-spec text-amber-950 space-y-1">
                      <strong className="font-bold block text-amber-900">Unresolved Limitations / Information Needed:</strong>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.importantLimitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Expandable Specifications Grid */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowExtendedProductSpecs(!showExtendedProductSpecs)}
                      className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showExtendedProductSpecs ? "Hide extended specifications" : "View full specifications & source citations"}</span>
                      {showExtendedProductSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showExtendedProductSpecs && (
                      <div className="pt-3 space-y-3 animate-in fade-in duration-150">
                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-surface p-3.5 rounded-edge border border-line text-meta">
                            {Object.entries(currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.supportingSpecifications).map(([specKey, specVal]) => (
                              <div key={specKey}>
                                <span className="text-spec font-bold text-ink-faint uppercase block">
                                  {specKey.replace(/([A-Z])/g, " $1")}
                                </span>
                                <span className="text-body font-medium">{specVal || "Standard"}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.sourceCitations && (
                          <div className="space-y-1.5">
                            <span className="text-spec font-bold block text-ink-dim">Supporting Document Citations:</span>
                            {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.sourceCitations.map((cite, i) => (
                              <div key={i} className="text-meta bg-white p-2.5 rounded border border-line flex items-start gap-2">
                                <FileText className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-brand-deep">{cite.documentTitle}</span>
                                  {cite.sectionOrPage && <span className="text-ink-dim ml-1">({cite.sectionOrPage})</span>}
                                  {cite.excerpt && <p className="text-ink-dim mt-0.5 italic text-spec">"{cite.excerpt}"</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-panel border border-line text-ink-dim">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <h4 className="font-bold text-body">No Exact Product Candidate Matched</h4>
                  <p className="text-meta max-w-md mx-auto mt-1">
                    The supplied requirements lack necessary mounting or lighting parameters to safely select a product SKU.
                  </p>
                </div>
              )}

              {/* Alternative Product Candidates Comparison Table */}
              {currentEnquiryAnalysis.productRecommendations?.alternatives && currentEnquiryAnalysis.productRecommendations.alternatives.length > 0 && (
                <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-3">
                  <h3 className="font-bold text-body text-base">Alternative Product Options</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-meta border-collapse">
                      <thead>
                        <tr className="bg-raised text-ink-dim border-b border-line text-spec font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-1/4">Product Option</th>
                          <th className="py-2.5 px-3 w-1/3">When to Use</th>
                          <th className="py-2.5 px-3 w-1/3">Key Trade-offs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {currentEnquiryAnalysis.productRecommendations.alternatives.map((alt, i) => (
                          <tr key={i} className="hover:bg-surface/50">
                            <td className="py-2.5 px-3 font-semibold text-body">{alt.productName}</td>
                            <td className="py-2.5 px-3 text-body">{alt.whenToUse}</td>
                            <td className="py-2.5 px-3 text-spec text-ink-dim">{alt.tradeOffs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPLY (Part L) */}
          {activeTab === "reply" && (
            <div className="bg-white rounded-panel border border-line p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                <div>
                  <h3 className="font-bold text-body text-base">Customer Clarification &amp; Response Draft</h3>
                  <p className="text-spec text-ink-dim">
                    Pre-populated with customer context and selected questions. Formatted in natural, professional language.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${replySubject}\n\n${replyBody}`);
                      showToast("Email draft copied to clipboard!", "success");
                    }}
                    className="bg-surface hover:bg-hover font-bold px-3 py-1.5 rounded-edge text-spec transition-colors flex items-center gap-1.5 cursor-pointer border border-line"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Clipboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveOpportunity(true)}
                    className="bg-brand-deep hover:bg-brand text-white font-bold px-3.5 py-1.5 rounded-edge text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Deal to CRM</span>
                  </button>
                </div>
              </div>

              {/* Recipient & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reply-recipient-input" className="block text-spec font-bold uppercase text-ink-dim mb-1">Recipient</label>
                  <input
                    id="reply-recipient-input"
                    type="text"
                    value={replyRecipient}
                    onChange={(e) => setReplyRecipient(e.target.value)}
                    placeholder="sarah@wyndhamcivil.com.au"
                    className="w-full text-meta px-3 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-raised font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="reply-subject-input" className="block text-spec font-bold uppercase text-ink-dim mb-1">Subject Line</label>
                  <input
                    id="reply-subject-input"
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full text-meta px-3 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep bg-raised font-medium"
                  />
                </div>
              </div>

              {/* Editable Email Body */}
              <div>
                <label htmlFor="reply-body-textarea" className="block text-spec font-bold uppercase text-ink-dim mb-1">Email Body (Fully Editable)</label>
                <textarea
                  id="reply-body-textarea"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={14}
                  className="w-full text-meta p-3.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep font-sans leading-relaxed bg-raised"
                />
              </div>

              <div className="pt-2 border-t border-line flex items-center justify-between text-spec text-ink-dim">
                <span>Ready to paste directly into Outlook or send to the customer.</span>
                <span className="font-semibold text-brand-deep">✓ Natural customer-facing language verified</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals & Supporting Workflows */}
      {isFollowUpModalOpen && (
        <CustomerFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          initialContactName={rawEnquiryInput.customer || currentEnquiryAnalysis?.opportunitySummary?.customer?.value || ""}
          initialCompanyName={rawEnquiryInput.company || currentEnquiryAnalysis?.opportunitySummary?.company?.value || ""}
          initialProjectName={rawEnquiryInput.project || currentEnquiryAnalysis?.opportunitySummary?.project?.value || ""}
          initialQuoteRef={ostendoQuoteRef}
          initialProducts={
            currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint
              ? [currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productName]
              : []
          }
        />
      )}

      {isDatasheetModalOpen && (
        <DatasheetPackageModal
          isOpen={isDatasheetModalOpen}
          onClose={() => setIsDatasheetModalOpen(false)}
          projectName={rawEnquiryInput.project || currentEnquiryAnalysis?.opportunitySummary?.project?.value || "Public Lighting Project"}
          customerName={rawEnquiryInput.company || currentEnquiryAnalysis?.opportunitySummary?.company?.value || "Council / Contractor"}
          quoteRef={ostendoQuoteRef}
          initialProductNames={
            currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint
              ? [currentEnquiryAnalysis.productRecommendations!.recommendedStartingPoint.productName]
              : ["Intense Light - 50W Solar", "Pro Blade Solar 75/125"]
          }
        />
      )}

      {isReadinessGateOpen && (
        <QuoteReadinessModal
          isOpen={isReadinessGateOpen}
          onClose={() => setIsReadinessGateOpen(false)}
          context={{
            quoteType: "firm",
            productFamily: currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint?.productName || "Solar Public Luminaire",
            productCode: currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint?.productCode || "PLASGAIN-SOLAR",
            mountingHeight: currentEnquiryAnalysis?.opportunitySummary?.mountingHeight?.value,
            autonomyDays: 5,
            commercialPricingApproved: false,
            operatingProfileConfirmed: true
          }}
          onRequestCommercialPricing={() => {
            setIsReadinessGateOpen(false);
            setIsPricingRequestOpen(true);
          }}
          onProceedWithQuote={(type) => {
            showToast(`Proceeding with ${type.toUpperCase()} quotation workflow`, "success");
            setIsDatasheetModalOpen(true);
          }}
        />
      )}

      {isPricingRequestOpen && (
        <CommercialPricingRequestModal
          isOpen={isPricingRequestOpen}
          onClose={() => setIsPricingRequestOpen(false)}
          productCode={currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint?.productCode || "PLASGAIN-SOLAR"}
          productName={currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint?.productName || "Solar Luminaire System"}
          projectName={rawEnquiryInput.project || "Public Lighting Project"}
          customerCompany={rawEnquiryInput.company || "Prospective Client"}
          initialQuantity={10}
          onRequestSubmitted={(req) => {
            showToast(`Pricing Request #${req.id} submitted for commercial review`, "success");
          }}
        />
      )}
    </div>
  );
};
