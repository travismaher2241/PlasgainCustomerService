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
  ChevronRight,
  Download,
  Zap,
  Plus,
  DollarSign
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { EnquiryAnalysisResult, StatusField } from "../types";
import { analyzeEnquiryDeterministic } from "../utils/rulesEngine";
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

  const [isLoading, setIsLoading] = useState(false);
  type PanelError = { detail: string; guidance?: string };
  const [analysisError, setAnalysisError] = useState<PanelError | null>(null);
  const [emailError, setEmailError] = useState<PanelError | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDatasheetModalOpen, setIsDatasheetModalOpen] = useState(false);
  const [isReadinessGateOpen, setIsReadinessGateOpen] = useState(false);
  const [isPricingRequestOpen, setIsPricingRequestOpen] = useState(false);
  const [ostendoQuoteRef, setOstendoQuoteRef] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [simulatedFiles, setSimulatedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavedToPipeline, setIsSavedToPipeline] = useState(false);

  // P2-01 / P2-02: Progressive Stages & Streaming Preview
  const [analysisSourceHash, setAnalysisSourceHash] = useState<string>("");
  const [streamedChunkPreview, setStreamedChunkPreview] = useState<string>("");
  const [progressStages, setProgressStages] = useState<Array<{ id: string; label: string; status: "pending" | "active" | "complete" | "failed" }>>([
    { id: "reading", label: "Reading enquiry source & tender metadata", status: "pending" },
    { id: "extracting", label: "Extracting project scope & luminaire requirements", status: "pending" },
    { id: "standards_check", label: "Verifying AS/NZS 1158 & AS/NZS 1170.2 criteria", status: "pending" },
    { id: "product_matching", label: "Resolving matching Plasgain luminaires & poles", status: "pending" },
    { id: "finalizing", label: "Formatting structured analysis & readiness report", status: "pending" }
  ]);

  const [saveFormData, setSaveFormData] = useState({
    projectName: "",
    accountId: "",
    accountName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    pipelineId: "pipe-major-projects",
    stageId: "stage-new",
    quantity: 1,
    dealValue: 0,
    productCode: "",
    productName: "",
    notes: ""
  });

  const handleInputChange = (field: keyof typeof rawEnquiryInput, value: string) => {
    setRawEnquiryInput({
      ...rawEnquiryInput,
      [field]: value
    });
  };

  const computeRawHash = (text: string) => {
    return `${text.trim().length}:${text.slice(0, 30)}`;
  };

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

  const handleAnalyze = async () => {
    if (!rawEnquiryInput.rawContent && simulatedFiles.length === 0) {
      showToast("Please enter customer enquiry text or upload a document", "warning");
      return;
    }

    setIsLoading(true);
    setAnalysisError(null);
    setStreamedChunkPreview("");

    // Reset stages to pending
    setProgressStages([
      { id: "reading", label: "Reading enquiry source & tender metadata", status: "active" },
      { id: "extracting", label: "Extracting project scope & luminaire requirements", status: "pending" },
      { id: "standards_check", label: "Verifying AS/NZS 1158 & AS/NZS 1170.2 criteria", status: "pending" },
      { id: "product_matching", label: "Resolving matching Plasgain luminaires & poles", status: "pending" },
      { id: "finalizing", label: "Formatting structured analysis & readiness report", status: "pending" }
    ]);

    const jobId = `job-${Date.now()}`;
    const pName = rawEnquiryInput.project || rawEnquiryInput.company || "Customer Tender";
    setActiveBackgroundAnalysisJob({ id: jobId, projectName: pName, status: "running" });

    try {
      const data = await apiStreamPost<EnquiryAnalysisResult>(
        "/api/enquiry/analyze-stream",
        {
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
        },
        {
          onStage: (stage) => {
            setProgressStages((prev) => {
              const stageOrder = ["reading", "extracting", "standards_check", "product_matching", "finalizing"];
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
      }

      // Mark all stages complete
      setProgressStages((prev) => prev.map((s) => ({ ...s, status: "complete" })));
      setActiveBackgroundAnalysisJob({ id: jobId, projectName: pName, status: "complete" });

      addNotification({
        type: "system",
        title: "Tender Analysis Completed",
        message: `Structured analysis generated for "${pName}".`,
        actionUrl: "new-enquiry",
        dealName: pName
      });

      showToast("Enquiry analysed successfully!", "success");
    } catch (err) {
      console.warn("AI service unavailable, falling back to deterministic rules engine:", err);
      const fallbackResult = analyzeEnquiryDeterministic(rawEnquiryInput.rawContent, {
        projectName: rawEnquiryInput.project,
        company: rawEnquiryInput.company,
        customerName: rawEnquiryInput.customer,
        location: rawEnquiryInput.location,
        source: rawEnquiryInput.source
      });

      setCurrentEnquiryAnalysis(fallbackResult);
      setAnalysisSourceHash(computeRawHash(rawEnquiryInput.rawContent));
      if (fallbackResult.questionsBeforeWeQuote && fallbackResult.questionsBeforeWeQuote.length > 0) {
        setSelectedQuestions(fallbackResult.questionsBeforeWeQuote.slice(0, 3).map((q) => q.question));
      }

      setProgressStages((prev) => prev.map((s) => ({ ...s, status: "complete" })));
      setActiveBackgroundAnalysisJob({ id: jobId, projectName: pName, status: "complete" });

      addNotification({
        type: "system",
        title: "Tender Analysis Completed (Rules Engine)",
        message: `Processed via Deterministic Rules Engine for "${pName}".`,
        actionUrl: "new-enquiry",
        dealName: pName
      });

      showToast("Processed via Deterministic Rules Engine (Offline Mode)", "info");
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
      const summary = currentEnquiryAnalysis.opportunitySummary;
      const data = await apiPost("/api/generate-email", {
        recipientName: (typeof summary.contactName === "object" ? (summary.contactName as any)?.value : summary.contactName) || rawEnquiryInput.customer,
        customerName: (typeof summary.contactName === "object" ? (summary.contactName as any)?.value : summary.contactName) || rawEnquiryInput.customer,
        companyName: (typeof summary.customerCompany === "object" ? (summary.customerCompany as any)?.value : summary.customerCompany) || rawEnquiryInput.company,
        projectName: (typeof summary.project === "object" ? (summary.project as any)?.value : summary.project) || rawEnquiryInput.project,
        recommendedProduct:
          currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.productName,
        selectedQuestions: selectedQuestions
      });
      setGeneratedEmail(data);
    } catch (err) {
      console.warn("AI email generation failed, falling back to standard sales template:", err);
      const summary = currentEnquiryAnalysis.opportunitySummary;
      const rec = currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint;
      const recipient = (typeof summary.contactName === "object" ? (summary.contactName as any)?.value : summary.contactName) || rawEnquiryInput.customer || "Valued Client";
      const project = (typeof summary.project === "object" ? (summary.project as any)?.value : summary.project) || rawEnquiryInput.project || "Lighting Project";
      
      const qBulletList = selectedQuestions.length > 0
        ? selectedQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")
        : "1. Confirmation of target AS/NZS 1158 lighting subcategory\n2. Mounting height and pole preference (Direct burial composite vs Rag-bolt)\n3. Available power supply or solar requirement";

      const fallbackEmail = {
        subject: `Plasgain Engineering & Commercial Quotation Proposal - ${project}`,
        bodyText: `Dear ${recipient},\n\nThank you for reaching out to Plasgain regarding the lighting requirements for ${project}.\n\nBased on your enquiry scope, we recommend the ${rec.productName} (${rec.productCode}). This solution complies with Australian Standards (AS/NZS 1158) for public lighting efficiency and photometric performance.\n\nTo ensure our engineering team prepares an accurate certified Dialux layout and formal commercial quote, could you please confirm the following details:\n\n${qBulletList}\n\nWe have attached standard technical datasheets for your review and look forward to assisting with your project.\n\nKind regards,\n\n${currentUser.name}\n${currentUser.role} | Plasgain Australia\nPhone: ${currentUser.phone || "1300 000 000"}\nEmail: ${currentUser.email || "sales@plasgain.com.au"}`
      };
      setGeneratedEmail(fallbackEmail);
      showToast("Template email generated via sales rules engine", "info");
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

  const handleInlineCreateAccount = () => {
    const compName = rawEnquiryInput.company.trim();
    if (!compName) {
      showToast("Please enter a company name to create an account", "warning");
      return;
    }
    const isCouncil = compName.toLowerCase().includes("council") || compName.toLowerCase().includes("city") || compName.toLowerCase().includes("shire");
    const isVic = (rawEnquiryInput.location || "").toLowerCase().includes("vic") || (rawEnquiryInput.location || "").toLowerCase().includes("victoria");
    const newAccId = `acc-${Date.now()}`;
    addAccount({
      id: newAccId,
      name: compName,
      status: "Prospect",
      industry: "Government & Public Infrastructure",
      customerSegment: isCouncil ? "Local Government / Council" : "Civil Contractor",
      territory: isVic ? "VIC/TAS" : "QLD/NT",
      accountOwner: currentUser.name,
      leadSource: rawEnquiryInput.source || "Email",
      createdDate: new Date().toISOString().split("T")[0],
      lastInteractionDate: new Date().toISOString().split("T")[0],
      relationshipHealth: "Healthy",
      tags: ["Enquiry Workspace", "New Account"],
      notes: `Created inline from Enquiry Workspace for project "${rawEnquiryInput.project || "New Project"}"`,
      metrics: {
        openPipelineValue: 0,
        totalDealsWon: 0,
        activeDealsCount: 1,
        totalEnquiries: 1
      }
    });
    showToast(`Created and matched CRM Account: "${compName}"!`, "success");
  };

  const handleSaveOpportunity = (shouldNavigate = true): string | null => {
    if (!currentEnquiryAnalysis) return null;

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
      return null;
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

    // Resolve or create matching Account in CRM
    const existingAccount = accounts.find(
      (a) => a.name.toLowerCase() === companyName.toLowerCase()
    );
    let targetAccountId = existingAccount?.id;
    if (!targetAccountId) {
      targetAccountId = `acc-${Date.now()}`;
      addAccount({
        id: targetAccountId,
        name: companyName,
        status: "Prospect",
        industry: "Government & Public Infrastructure",
        customerSegment: companyName.toLowerCase().includes("council") ? "Local Government / Council" : "Civil Contractor",
        territory: "QLD/NT",
        accountOwner: currentUser.name,
        leadSource: rawEnquiryInput.source || "Email",
        createdDate: new Date().toISOString().split("T")[0],
        lastInteractionDate: new Date().toISOString().split("T")[0],
        relationshipHealth: "Healthy",
        tags: ["Enquiry Analyzer", applicationVal || "Solar Lighting"],
        notes: `Created from enquiry for ${projectName}`,
        metrics: {
          openPipelineValue: quantityNum * 1600 || 38400,
          totalDealsWon: 0,
          activeDealsCount: 1,
          totalEnquiries: 1
        }
      });
    }

    // Resolve or create matching Contact in CRM
    const existingContact = contacts.find(
      (c) => c.accountId === targetAccountId && (c.email?.toLowerCase() === contactEmail.toLowerCase() || `${c.firstName} ${c.lastName}`.toLowerCase() === customerName.toLowerCase())
    );
    let targetContactId = existingContact?.id;
    if (!targetContactId) {
      targetContactId = `con-${Date.now()}`;
      const nameParts = customerName.trim().split(" ");
      addContact({
        id: targetContactId,
        accountId: targetAccountId,
        accountName: companyName,
        firstName: nameParts[0] || "Contact",
        lastName: nameParts.slice(1).join(" ") || "",
        jobTitle: "Project Enquirer",
        email: contactEmail,
        mobile: rawEnquiryInput.contact || "",
        preferredContactMethod: "Email",
        roleInBuyingProcess: "Evaluator",
        isDecisionMaker: true,
        influenceLevel: "Medium",
        relationshipStatus: "Warm",
        contactOwner: currentUser.name,
        tags: ["Enquiry Ingestion"],
        notes: `Contact for ${projectName}`
      });
    }

    // Use active/default pipeline
    const targetPipeline = (pipelines && pipelines.length > 0) ? (pipelines.find(p => p.isDefault) || pipelines[0]) : { id: "pipe-major-projects", stages: [{ id: "stage-new", name: "New Opportunity", probability: 10 }] };
    const targetStage = targetPipeline.stages[0] || { id: "stage-new", name: "New Opportunity", probability: 10 };

    // Also ingest into CRM pipeline
    const crmOppId = `crm-opp-${Date.now()}`;
    addCrmOpportunity({
      id: crmOppId,
      name: newOpp.project,
      accountId: targetAccountId,
      accountName: newOpp.customerCompany,
      primaryContactId: targetContactId,
      primaryContactName: newOpp.contactName,
      primaryContactEmail: newOpp.contactEmail,
      opportunityOwner: currentUser.name,
      pipelineId: targetPipeline.id,
      stageId: targetStage.id,
      stageName: targetStage.name,
      dealValue: newOpp.estimatedValue || 38400,
      probability: targetStage.probability || 25,
      weightedValue: (newOpp.estimatedValue || 38400) * ((targetStage.probability || 25) / 100),
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

    if (shouldNavigate) {
      showToast("Saved opportunity to CRM Deals Pipeline!", "success");
      navigateToCRM("pipeline", crmOppId);
    }
    return crmOppId;
  };

  // STRM-03: Unified Save Deal & Draft Follow-Up Package Action
  const handleSaveAndDraftFollowUp = () => {
    if (!currentEnquiryAnalysis) return;
    const oppId = handleSaveOpportunity(false);
    if (!oppId) return;
    setIsFollowUpModalOpen(true);
    showToast("Saved deal to CRM & opened follow-up draft package!", "success");
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
        <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-soon-wash text-soon uppercase tracking-wider">
          <Info className="w-3 h-3 text-soon" />
          INFERRED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-spec font-bold px-2 py-0.5 rounded bg-urgent-wash text-urgent uppercase tracking-wider">
        <AlertTriangle className="w-3 h-3 text-urgent" />
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
              onClick={() => setIsFollowUpModalOpen(true)}
              className="text-meta font-bold px-3 py-1.5 rounded-edge bg-soon-wash text-soon border border-soon/30 hover:bg-soon transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Draft customer follow-up sequence referencing Ostendo quote"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Follow-Up</span>
            </button>
            <button
              onClick={() => setIsDatasheetModalOpen(true)}
              className="text-meta font-bold px-3 py-1.5 rounded-edge bg-white hover:bg-raised text-body border border-line transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Download consolidated Tender Spec Package"
            >
              <Download className="w-3.5 h-3.5 text-ink-dim" />
              <span>Tender Package</span>
            </button>
                        <button
              onClick={() => {
                const items = [];
                if (currentEnquiryAnalysis?.primaryRecommendation) {
                  const resolved = resolveProductsForDeal([currentEnquiryAnalysis.primaryRecommendation.productName]);
                  const prodCode = resolved[0]?.code || currentEnquiryAnalysis.primaryRecommendation.productCode || "";
                  const qty = parseInt(currentEnquiryAnalysis.opportunitySummary?.quantity?.value || "1", 10) || 1;
                  items.push({
                    itemCode: prodCode,
                    description: currentEnquiryAnalysis.primaryRecommendation.productName,
                    quantity: qty,
                    unit: "ea",
                    lineNotes: currentEnquiryAnalysis.primaryRecommendation.whySuitable || ""
                  });
                }

                const validation = validateOstendoItems(items);
                if (!validation.valid) {
                  showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                  return;
                }

                const csvData = formatOstendoCSV(items, ostendoQuoteRef || "OST-ENQUIRY");
                downloadOstendoCSV(csvData, `Ostendo_Product_List_${(rawEnquiryInput.project || "Enquiry").replace(/\s+/g, "_")}.csv`);
                showToast("Ostendo CSV downloaded. Ostendo will calculate customer pricing, tax and totals.", "success");
              }}
              className="text-meta font-bold px-3 py-1.5 rounded-edge bg-white hover:bg-brand-wash text-brand-deep border border-brand-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Download standard UTF-8 CRLF CSV for Ostendo ERP"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Ostendo CSV</span>
            </button>
            <button
              onClick={async () => {
                const items = [];
                if (currentEnquiryAnalysis?.primaryRecommendation) {
                  const resolved = resolveProductsForDeal([currentEnquiryAnalysis.primaryRecommendation.productName]);
                  const prodCode = resolved[0]?.code || currentEnquiryAnalysis.primaryRecommendation.productCode || "";
                  const qty = parseInt(currentEnquiryAnalysis.opportunitySummary?.quantity?.value || "1", 10) || 1;
                  items.push({
                    itemCode: prodCode,
                    description: currentEnquiryAnalysis.primaryRecommendation.productName,
                    quantity: qty,
                    unit: "ea",
                    lineNotes: currentEnquiryAnalysis.primaryRecommendation.whySuitable || ""
                  });
                }

                const validation = validateOstendoItems(items);
                if (!validation.valid) {
                  showToast(`Ostendo Export Blocked: ${validation.errors.join("; ")}`, "error");
                  return;
                }

                await copyOstendoProductList(items, ostendoQuoteRef || "OST-ENQUIRY");
                showToast("Product list copied to clipboard! Pricing will be calculated in Ostendo.", "success");
              }}
              className="text-meta font-bold px-3 py-1.5 rounded-edge bg-white hover:bg-raised text-body border border-line transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Copy tab-delimited product and quantity list to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Product List</span>
            </button>
            <button
              onClick={() => handleSaveOpportunity(true)}
              className="text-meta font-medium px-3.5 py-1.5 rounded-edge bg-white hover:bg-raised text-body border border-line-strong transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 text-brand-deep" />
              <span>Save to Pipeline</span>
            </button>
            <button
              onClick={handleSaveAndDraftFollowUp}
              className="text-meta font-bold px-4 py-1.5 rounded-edge bg-brand-deep hover:bg-brand text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Save opportunity to CRM Deals and immediately open tailored follow-up draft"
            >
              <Zap className="w-4 h-4" />
              <span>Save Deal &amp; Draft Follow-Up</span>
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-spec font-semibold text-ink-dim">Company</label>
              {rawEnquiryInput.company && !accounts.some(a => a.name.toLowerCase() === rawEnquiryInput.company.toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleInlineCreateAccount}
                  className="text-[10px] text-brand-deep font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  title="Create new CRM Account"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Create</span>
                </button>
              )}
            </div>
            <input
              type="text"
              id="workspace-company-input"
              value={rawEnquiryInput.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="e.g. ABC Civil Pty Ltd"
              className="w-full text-meta px-2.5 py-1.5 rounded-edge border border-line focus:outline-none focus:border-brand-deep"
            />
            {rawEnquiryInput.company && (
              <div className="mt-1 text-[10px]">
                {accounts.some(a => a.name.toLowerCase() === rawEnquiryInput.company.toLowerCase()) ? (
                  <span className="text-brand-deep font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-brand-deep" /> Matched CRM Account
                  </span>
                ) : (
                  <span className="text-ink-faint">Not in CRM (Click + Create)</span>
                )}
              </div>
            )}
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
            <button
              type="button"
              onClick={() => navigateToWorkflow("tools", "plan-takeoff")}
              className="inline-flex items-center gap-1.5 text-meta text-brand-deep hover:bg-brand-wash px-3 py-1.5 rounded-edge border border-brand-edge font-bold transition-colors cursor-pointer"
              title="Open dedicated engineering drawing & plan takeoff tool"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-deep" />
              <span>Decipher Plan / BOM Take-off &rarr;</span>
            </button>
            {simulatedFiles.length > 0 && (
              <span className="text-meta text-brand-deep font-semibold bg-brand-wash px-2 py-0.5 rounded border border-brand-edge">
                {simulatedFiles.length} file(s) attached
              </span>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="bg-brand-deep hover:bg-brand text-white font-medium px-5 py-2 rounded-edge text-meta transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Streaming Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-soon-on-ink" />
                <span>Analyse Enquiry</span>
              </>
            )}
          </button>
        </div>

        {/* P2-01 / P2-02: Live Progress Stage Stepper */}
        {isLoading && (
          <div className="mt-4 p-4 bg-paper rounded-edge border border-line space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <span>AI Engineering Pipeline In Progress</span>
              </span>
              <span className="text-spec font-mono text-ink-muted">AS/NZS 1158 & 1170.2 Evaluator</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {progressStages.map((st, sIdx) => {
                const isComplete = st.status === "complete";
                const isActive = st.status === "active";
                const isFailed = st.status === "failed";
                return (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-edge border text-spec transition-all ${
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
                    <p className="line-clamp-2 leading-tight font-medium">{st.label}</p>
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

      {/* P2-05: Stale Enquiry Warning Banner */}
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
            <span>Reanalyse Enquiry</span>
          </button>
        </div>
      )}

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
          {/* Guided Enquiry-to-Quote Journey Stepper (P2) */}
          <div className="bg-white rounded-panel border border-line p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-spec font-bold uppercase tracking-wider text-ink-dim flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-deep" /> Guided Enquiry-to-Quote Journey
              </span>
              <button
                type="button"
                onClick={() => setIsReadinessGateOpen(true)}
                className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Readiness Checklist &rarr;</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 text-spec font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">1. Intake</div>
                  <div className="text-[11px] text-emerald-700">Enquiry Ingested</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 text-spec font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">2. Qualified</div>
                  <div className="text-[11px] text-emerald-700">Standards &amp; Scope</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-brand-wash border border-brand-edge text-brand-deep text-spec font-semibold flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-brand-deep text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <div>
                  <div className="font-bold">3. Shortlist</div>
                  <div className="text-[11px] text-ink-dim">{currentEnquiryAnalysis.primaryRecommendation?.productCode || "SKU Grounded"}</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-surface border border-line text-ink text-spec font-semibold flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-line-strong text-ink flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
                <div>
                  <div className="font-bold">4. Pricing/BOM</div>
                  <div className="text-[11px] text-ink-dim">Ostendo ERP Schedule</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-surface border border-line text-ink text-spec font-semibold flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-line-strong text-ink flex items-center justify-center text-[10px] font-bold shrink-0">5</div>
                <div>
                  <div className="font-bold">5. Proposal</div>
                  <div className="text-[11px] text-ink-dim">Follow-Up &amp; Pack</div>
                </div>
              </div>
            </div>
          </div>

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
                        ? "bg-soon-wash text-soon"
                        : "bg-urgent-wash text-urgent"
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
                        ? "bg-soon"
                        : "bg-urgent"
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
                <div className="bg-urgent-wash p-2.5 rounded-edge border border-urgent">
                  <div className="font-bold text-urgent flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-urgent" />
                    <span>{currentEnquiryAnalysis.readiness.missingItems.length} Missing</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsReadinessGateOpen(true)}
                  className="w-full py-2 px-3 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pre-Quote Readiness Gate &rarr;</span>
                </button>
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
            <div className="bg-white rounded-panel border border-urgent/80 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-urgent mb-3">
                <AlertTriangle className="w-4 h-4 text-urgent" />
                <h3 className="font-bold text-body">
                  Information Still Required Before Quoting
                </h3>
              </div>
              <ul className="space-y-2">
                {currentEnquiryAnalysis.readiness.missingItems.map((item, idx) => (
                  <li key={idx} className="text-meta flex items-start gap-2 bg-urgent-wash p-2.5 rounded-edge border border-urgent">
                    <span className="w-4 h-4 rounded-full bg-urgent-wash text-urgent flex items-center justify-center text-spec font-bold shrink-0 mt-0.5">
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
                  <span className="w-2 h-2 rounded-full bg-soon"></span> Inferred
                </span>
                <span className="flex items-center gap-1 text-ink-dim font-medium">
                  <span className="w-2 h-2 rounded-full bg-urgent"></span> Unknown
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
                  Plasgain Product Recommendations & Technical Matches
                </h3>
                <p className="text-meta text-ink-dim">
                  Matched against approved Plasgain product datasheets and Australian standards
                </p>
              </div>
              <span className="text-spec font-bold px-2.5 py-1 rounded bg-brand-wash text-brand-deep border border-brand-edge uppercase tracking-wider">
                Verified Against Datasheets
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
                <div className="bg-soon-wash border border-soon p-3 rounded-edge text-meta text-soon flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-soon shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Engineering Distinction Notice: </strong>
                    {currentEnquiryAnalysis.productRecommendations.recommendedStartingPoint.distinctionNotes ||
                      "This recommendation represents a preliminary product fit. Formal AS/NZS 1158 certification and council sign-off requires a point-by-point Dialux photometric simulation by Plasgain Engineering."}
                  </div>
                </div>

                {/* P2-09: Commercial Pricing Action */}
                <div className="flex items-center justify-end pt-2 border-t border-brand-edge">
                  <button
                    type="button"
                    onClick={() => setIsPricingRequestOpen(true)}
                    className="px-3.5 py-1.5 bg-surface hover:bg-hover text-brand-deep border border-brand-edge font-bold text-spec rounded-edge flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Request Approved Commercial Pricing</span>
                  </button>
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
              <Lightbulb className="w-5 h-5 text-soon shrink-0 mt-0.5" />
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

      {/* Customer Follow-Up Generator Modal */}
      {isFollowUpModalOpen && (
        <CustomerFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          initialContactName={rawEnquiryInput.customer || currentEnquiryAnalysis?.opportunitySummary?.customer?.value || ""}
          initialCompanyName={rawEnquiryInput.company || currentEnquiryAnalysis?.opportunitySummary?.company?.value || ""}
          initialProjectName={rawEnquiryInput.project || currentEnquiryAnalysis?.opportunitySummary?.project?.value || ""}
          initialQuoteRef={ostendoQuoteRef}
          initialProducts={
            currentEnquiryAnalysis?.primaryRecommendation
              ? [currentEnquiryAnalysis.primaryRecommendation.productName]
              : []
          }
        />
      )}

      {/* Datasheet & Tender Spec Package Modal */}
      {isDatasheetModalOpen && (
        <DatasheetPackageModal
          isOpen={isDatasheetModalOpen}
          onClose={() => setIsDatasheetModalOpen(false)}
          projectName={rawEnquiryInput.project || currentEnquiryAnalysis?.opportunitySummary?.project?.value || "Public Lighting Project"}
          customerName={rawEnquiryInput.company || currentEnquiryAnalysis?.opportunitySummary?.company?.value || "Council / Contractor"}
          quoteRef={ostendoQuoteRef}
          initialProductNames={
            currentEnquiryAnalysis?.primaryRecommendation
              ? [currentEnquiryAnalysis.primaryRecommendation.productName]
              : ["Intense Light - 50W Solar", "Pro Blade Solar 75/125"]
          }
        />
      )}

      {/* P2-08: Pre-Quote Readiness Gate Modal */}
      {isReadinessGateOpen && (
        <QuoteReadinessModal
          isOpen={isReadinessGateOpen}
          onClose={() => setIsReadinessGateOpen(false)}
          context={{
            quoteType: "firm",
            productFamily: currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint?.productName || "Solar Public Luminaire",
            productCode: currentEnquiryAnalysis?.productRecommendations?.recommendedStartingPoint?.productCode || "PLASGAIN-SOLAR",
            mountingHeight: currentEnquiryAnalysis?.opportunitySummary?.mountingHeight?.value,
            windRegion: currentEnquiryAnalysis?.opportunitySummary?.windRegion?.value,
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

      {/* P2-09: Commercial Pricing Request Modal */}
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
