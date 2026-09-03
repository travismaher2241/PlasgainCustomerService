import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Sparkles,
  UploadCloud,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Plus,
  Trash2,
  Save,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  KanbanSquare,
  HelpCircle,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Mail,
  X,
  ChevronDown,
  Columns,
  Maximize,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { BOMItem, DrawingTakeoffResult } from "../types";
import { apiPost, AIUnavailableError, toUserMessage } from "../utils/apiClient";
import { AIUnavailableNotice } from "./AIUnavailableNotice";
import { DatasheetPackageModal } from "./DatasheetPackageModal";
import { QuoteReadinessModal } from "./QuoteReadinessModal";
import { CommercialPricingRequestModal } from "./CommercialPricingRequestModal";
import { CRMDuplicateWarningModal } from "./crm/CRMDuplicateWarningModal";
import { detectDuplicateAccount, DuplicateMatchResult } from "../utils/duplicateDetector";
import { Account } from "../types/crm";
import {
  formatOstendoCSV,
  formatOstendoTabDelimited,
  validateOstendoItems,
  downloadOstendoCSV,
  copyOstendoProductList
} from "../utils/datasheetExporter";

export type TakeoffReviewStatus =
  | "Extracted"
  | "Needs review"
  | "Reviewed"
  | "Confirmed from source"
  | "Product matched"
  | "Match needs review"
  | "Unresolved";

export interface ExtendedBOMItem extends BOMItem {
  reviewStatus?: TakeoffReviewStatus;
}

export const PlanTakeoffWorkspace: React.FC = () => {
  const {
    showToast,
    addCrmOpportunity,
    addAccount,
    navigateToCRM,
    currentUser,
    crmOpportunities,
    accounts,
    pipelines
  } = useApp();

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
    dataUrl?: string;
  } | null>(null);

  const [drawingNotes, setDrawingNotes] = useState("");
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [drawingRef, setDrawingRef] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<{ detail: string; guidance?: string } | null>(null);

  // Take-off Result State
  const [takeoffResult, setTakeoffResult] = useState<DrawingTakeoffResult | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Mobile Tab Switcher
  const [mobileActiveTab, setMobileActiveTab] = useState<"preview" | "schedule">("preview");

  // Plan Canvas Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  // Action Dropdowns
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Export & Datasheet Modal State
  const [isDatasheetModalOpen, setIsDatasheetModalOpen] = useState(false);
  const [ostendoQuoteRef, setOstendoQuoteRef] = useState("");
  const [exportValidationErrors, setExportValidationErrors] = useState<string[]>([]);
  const [isTakeoffSaveModalOpen, setIsTakeoffSaveModalOpen] = useState(false);
  const [accountMismatchConfirmed, setAccountMismatchConfirmed] = useState(false);
  const [takeoffSaveFormData, setTakeoffSaveFormData] = useState({
    projectName: "",
    accountId: "",
    accountName: "",
    pipelineId: "pipe-major-projects",
    stageId: "stage-new",
    dealValue: 0
  });

  // Quote Readiness, Pricing & Duplicate Detection State
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedProductForPricing, setSelectedProductForPricing] = useState<{
    code: string;
    name: string;
    quantity: number;
  }>({ code: "", name: "", quantity: 1 });
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatchResult<Account> | null>(null);
  const [pendingAccountToCreate, setPendingAccountToCreate] = useState<Account | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleDocumentClick = () => {
      setIsExportMenuOpen(false);
      setIsMoreMenuOpen(false);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // File Input Handler with Strict Validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validMimes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isValidType = validMimes.includes(file.type) || ["pdf", "png", "jpg", "jpeg", "webp"].includes(ext || "");

      if (!isValidType) {
        showToast(`Unsupported file type "${file.name}". Please upload a PDF, PNG, or JPG drawing.`, "error");
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds the maximum 25 MB limit.`, "error");
        return;
      }

      // Clear previous plan take-off results
      setTakeoffResult(null);
      setAnalysisError(null);
      setExportValidationErrors([]);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadedFile({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: file.type || "application/pdf",
          dataUrl
        });
        setSelectedPlanId("custom");
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        if (!projectName) setProjectName(cleanName);
        setDrawingRef(file.name.replace(/\.[^/.]+$/, ""));
        showToast(`Loaded "${file.name}". Click "Analyse plan" to generate take-off.`, "info");
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear Uploaded Plan
  const handleClearPlan = () => {
    setUploadedFile(null);
    setSelectedPlanId(null);
    setTakeoffResult(null);
    setAnalysisError(null);
    setExportValidationErrors([]);
    setProjectName("");
    setCustomerName("");
    setDrawingRef("");
    setDrawingNotes("");
  };

  // Run AI Drawing Analysis
  const handleRunAnalysis = async () => {
    if (!uploadedFile && !selectedPlanId) {
      showToast("Please upload a drawing before analysing", "warning");
      return;
    }
    setIsAnalysing(true);
    setAnalysisError(null);
    setExportValidationErrors([]);

    try {
      const payload = {
        fileData: uploadedFile?.dataUrl || "",
        mimeType: uploadedFile?.type || "application/pdf",
        fileName: uploadedFile?.name || "Engineering_Plan.pdf",
        drawingNotes,
        project: projectName,
        customer: customerName
      };

      const result = await apiPost<DrawingTakeoffResult>("/api/analyse-drawing", payload);
      if (result && result.billOfMaterials) {
        // Tag initial review statuses
        const taggedBOM = result.billOfMaterials.map((item) => ({
          ...item,
          reviewStatus: (item.confidence === "High" ? "Extracted" : "Needs review") as TakeoffReviewStatus
        }));
        setTakeoffResult({ ...result, billOfMaterials: taggedBOM });
        setMobileActiveTab("schedule");
        showToast("Plan analysed successfully. Review extracted line items.", "success");
      }
    } catch (err) {
      console.error("Drawing analysis error:", err);
      if (err instanceof AIUnavailableError) {
        setAnalysisError({ detail: err.detail, guidance: err.guidance });
        showToast(`AI Vision unavailable: ${err.detail}`, "error");
      } else {
        const msg = toUserMessage(err);
        setAnalysisError({ detail: msg, guidance: "Do not quote from this screen until analysis completes." });
        showToast(msg, "error");
      }
    } finally {
      setIsAnalysing(false);
    }
  };

  // Edit BOM Item
  const handleUpdateItem = (id: string, field: keyof ExtendedBOMItem, value: any) => {
    if (!takeoffResult) return;
    const updatedBOM = takeoffResult.billOfMaterials.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });

    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM
    });
  };

  // Toggle Review Status on Item
  const handleToggleItemStatus = (id: string) => {
    if (!takeoffResult) return;
    const updatedBOM = takeoffResult.billOfMaterials.map((item) => {
      if (item.id === id) {
        const current = (item as ExtendedBOMItem).reviewStatus || "Extracted";
        const next: TakeoffReviewStatus =
          current === "Reviewed" || current === "Confirmed from source"
            ? "Needs review"
            : "Reviewed";
        return { ...item, reviewStatus: next };
      }
      return item;
    });

    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM
    });
  };

  // Delete BOM Item
  const handleDeleteItem = (id: string) => {
    if (!takeoffResult) return;
    const updatedBOM = takeoffResult.billOfMaterials.filter((item) => item.id !== id);
    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM
    });
    showToast("Line item removed from take-off schedule", "info");
  };

  // Add New Custom Line Item
  const handleAddItem = () => {
    if (!takeoffResult) return;
    const newItem: ExtendedBOMItem = {
      id: `bom-${Date.now()}`,
      category: "Solar Luminaire & Fitting",
      itemDescription: "Plasgain Additional Luminaire / Custom Fitting",
      quantity: 1,
      unit: "ea",
      recommendedProductCode: "PB-75W-3K",
      drawingReference: "User Added Item",
      confidence: "High",
      reviewStatus: "Reviewed",
      notes: "Manually added to take-off schedule"
    };

    const updatedBOM = [...takeoffResult.billOfMaterials, newItem];
    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM
    });
    showToast("Added custom item to take-off schedule", "success");
  };

  const handleOpenTakeoffSaveModal = () => {
    if (!takeoffResult || !takeoffResult.billOfMaterials || takeoffResult.billOfMaterials.length === 0) {
      showToast("No product take-off items to save to CRM", "warning");
      return;
    }

    const matchedAcc = accounts.find(
      (a) =>
        customerName &&
        (a.name.toLowerCase().includes(customerName.toLowerCase()) ||
          customerName.toLowerCase().includes(a.name.toLowerCase()))
    );

    setTakeoffSaveFormData({
      projectName: projectName || "Engineering Plan Take-off Project",
      accountId: matchedAcc?.id || "",
      accountName: matchedAcc?.name || "",
      pipelineId: pipelines[0]?.id || "pipe-major-projects",
      stageId: pipelines[0]?.stages[2]?.id || "stage-solution",
      dealValue: 0
    });
    setAccountMismatchConfirmed(false);
    setIsTakeoffSaveModalOpen(true);
  };

  const handleInlineCreateAccount = () => {
    if (!customerName.trim()) {
      showToast("Please enter an account name to create", "warning");
      return;
    }

    const candidateAccount: Account = {
      id: `acc-auto-${Date.now()}`,
      name: customerName.trim(),
      industry: "Local Government / Civil",
      accountType: "Customer",
      status: "Customer",
      customerRelationshipStatus: "Active",
      billingAddress: {
        street: "1 Main Street",
        city: "Central",
        state: "VIC",
        postcode: "3000",
        country: "Australia"
      },
      territory: "VIC/TAS",
      accountOwner: currentUser.name,
      leadSource: "Plan Take-off",
      createdDate: new Date().toISOString().split("T")[0],
      lastInteractionDate: new Date().toISOString().split("T")[0],
      tags: ["Auto-Created from Plan Take-off"]
    };

    const duplicateCheck = detectDuplicateAccount(candidateAccount, accounts);
    if (duplicateCheck && duplicateCheck.confidence !== "NONE") {
      setDuplicateMatch(duplicateCheck);
      setPendingAccountToCreate(candidateAccount);
      setIsDuplicateModalOpen(true);
      return;
    }

    addAccount(candidateAccount);
    setTakeoffSaveFormData((prev) => ({
      ...prev,
      accountId: candidateAccount.id,
      accountName: candidateAccount.name
    }));
    showToast(`Created account "${candidateAccount.name}"`, "success");
  };

  const handleConfirmTakeoffSave = () => {
    if (!takeoffResult) return;
    const dealId = `deal-takeoff-${Date.now()}`;
    const selectedAccount = accounts.find((a) => a.id === takeoffSaveFormData.accountId);
    const selectedPipeline = pipelines.find((p) => p.id === takeoffSaveFormData.pipelineId) || pipelines[0];
    const selectedStage = selectedPipeline.stages.find((s) => s.id === takeoffSaveFormData.stageId) || selectedPipeline.stages[0];

    const newDeal = {
      id: dealId,
      name: takeoffSaveFormData.projectName || "Plan Take-off Project",
      accountId: selectedAccount?.id || "acc-general",
      accountName: selectedAccount?.name || customerName || "General Council / Contractor",
      primaryContactId: "con-001",
      primaryContactName: "Technical Estimator",
      opportunityOwner: currentUser.name,
      pipelineId: selectedPipeline.id,
      stageId: selectedStage.id,
      stageName: selectedStage.name,
      dealValue: takeoffSaveFormData.dealValue || 0,
      weightedValue: (takeoffSaveFormData.dealValue || 0) * (selectedStage.probability / 100),
      probability: selectedStage.probability,
      forecastCategory: "Pipeline" as const,
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      products: takeoffResult.billOfMaterials.map((bom, idx) => ({
        id: `deal-prod-${Date.now()}-${idx}`,
        productCode: bom.recommendedProductCode || `PROD-TAKEOFF-${idx + 1}`,
        productName: bom.itemDescription,
        category: bom.category || "General Take-off",
        quantity: bom.quantity,
        unit: bom.unit || "ea",
        notes: `Drawing Ref: ${bom.drawingReference || "N/A"} | ${bom.notes || ""}`
      })),
      projectApplication: `Plan Take-off: ${takeoffResult.drawingMetadata?.sheetTitle || "Plan"}`,
      location: "Australia",
      customerNeed: takeoffResult.summary || "Product schedule deciphered from plan.",
      keyRequirements: [
        `Drawing: ${takeoffResult.drawingMetadata?.drawingNumber || "N/A"}`
      ],
      source: "AI Plan & Drawing Deciphering",
      ostendoQuoteRef: ostendoQuoteRef || undefined,
      latestActivity: `Plan take-off created (${takeoffResult.billOfMaterials.length} items)`,
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Draft Ostendo quotation from product take-off schedule",
      nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy" as const,
      dealHealthReasons: ["Technical take-off extracted from engineering drawing"],
      notes: `Drawing: ${takeoffResult.drawingMetadata?.drawingNumber || "N/A"} (${takeoffResult.drawingMetadata?.revision || "Rev A"}). ${takeoffResult.summary}`
    };

    addCrmOpportunity(newDeal);
    setIsTakeoffSaveModalOpen(false);
    showToast(`Saved take-off as CRM Opportunity: "${newDeal.name}"`, "success");
    navigateToCRM("pipeline", dealId);
  };

  // Download Ostendo CSV (Strict product-only, validated)
  const handleDownloadOstendoCSV = () => {
    if (!takeoffResult) return;

    const items = takeoffResult.billOfMaterials.map((item) => ({
      itemCode: item.recommendedProductCode,
      description: item.itemDescription,
      quantity: item.quantity,
      unit: item.unit || "ea",
      lineNotes: item.notes || item.drawingReference,
      quoteRef: ostendoQuoteRef || takeoffResult.drawingMetadata.drawingNumber
    }));

    const validation = validateOstendoItems(items);
    if (!validation.valid) {
      setExportValidationErrors(validation.errors);
      showToast(`Export blocked: ${validation.errors[0]}`, "error");
      return;
    }

    setExportValidationErrors([]);
    const csvData = formatOstendoCSV(items, ostendoQuoteRef || takeoffResult.drawingMetadata.drawingNumber);
    downloadOstendoCSV(csvData, `Ostendo_Product_List_${(projectName || "Takeoff").replace(/\s+/g, "_")}.csv`);
    showToast("Ostendo CSV downloaded. Pricing & tax calculate in Ostendo.", "success");
  };

  // Copy Product List for Ostendo
  const handleCopyOstendoProductList = async () => {
    if (!takeoffResult) return;

    const items = takeoffResult.billOfMaterials.map((item) => ({
      itemCode: item.recommendedProductCode,
      description: item.itemDescription,
      quantity: item.quantity,
      unit: item.unit || "ea",
      lineNotes: item.notes || item.drawingReference,
      quoteRef: ostendoQuoteRef || takeoffResult.drawingMetadata.drawingNumber
    }));

    const validation = validateOstendoItems(items);
    if (!validation.valid) {
      setExportValidationErrors(validation.errors);
      showToast(`Export blocked: ${validation.errors[0]}`, "error");
      return;
    }

    setExportValidationErrors([]);
    await copyOstendoProductList(items, ostendoQuoteRef || takeoffResult.drawingMetadata.drawingNumber);
    showToast("Product list copied to clipboard (Ostendo format)", "success");
  };

  // Export Schedule as clean CSV
  const handleExportCSV = () => {
    if (!takeoffResult) return;

    const headers = [
      "Item #",
      "Category",
      "Description",
      "Plasgain Product Code",
      "Quantity",
      "Unit",
      "Drawing Reference",
      "Review Status",
      "Confidence",
      "Notes"
    ];

    const rows = takeoffResult.billOfMaterials.map((item, idx) => [
      `"${idx + 1}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.itemDescription.replace(/"/g, '""')}"`,
      `"${item.recommendedProductCode.replace(/"/g, '""')}"`,
      item.quantity,
      `"${item.unit}"`,
      `"${item.drawingReference.replace(/"/g, '""')}"`,
      `"${(item as ExtendedBOMItem).reviewStatus || "Extracted"}"`,
      `"${item.confidence}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Takeoff_Schedule_${(projectName || "Project").replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Downloaded Take-off Schedule CSV", "success");
  };

  // Verification Counts
  const statusCounts = useMemo(() => {
    if (!takeoffResult || !takeoffResult.billOfMaterials) return { total: 0, reviewed: 0, needsReview: 0, extracted: 0 };
    const items = takeoffResult.billOfMaterials as ExtendedBOMItem[];
    const reviewed = items.filter((i) => i.reviewStatus === "Reviewed" || i.reviewStatus === "Confirmed from source").length;
    const needsReview = items.filter((i) => i.reviewStatus === "Needs review" || i.reviewStatus === "Unresolved" || i.reviewStatus === "Match needs review").length;
    const extracted = items.filter((i) => !i.reviewStatus || i.reviewStatus === "Extracted" || i.reviewStatus === "Product matched").length;
    return { total: items.length, reviewed, needsReview, extracted };
  }, [takeoffResult]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      
      {/* 1. Clear Single Tool Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-body tracking-tight">Plan Take-off</h1>
          </div>
          <p className="text-meta text-ink-dim mt-0.5">
            Upload an engineering drawing to extract luminaire schedules, pole tables, and civil quantities.
          </p>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {takeoffResult ? (
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalysing || (!uploadedFile && !selectedPlanId)}
              className="px-3.5 py-1.5 bg-paper hover:bg-raised text-body font-bold text-meta rounded-edge border border-line flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalysing ? "animate-spin" : ""}`} />
              <span>{isAnalysing ? "Analysing..." : "Re-analyse plan"}</span>
            </button>
          ) : (
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalysing || (!uploadedFile && !selectedPlanId)}
              className="px-4 py-2 bg-brand hover:bg-brand-deep text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAnalysing ? "animate-spin" : ""}`} />
              <span>{isAnalysing ? "Analysing plan..." : "Analyse plan"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Error Banner */}
      {exportValidationErrors.length > 0 && (
        <div className="p-3.5 bg-urgent-wash border border-urgent/30 rounded-panel text-meta text-urgent space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Ostendo Export Blocked — Please correct the following line items:</span>
          </div>
          <ul className="list-disc pl-6 text-spec space-y-0.5">
            {exportValidationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Unavailable Notification */}
      {analysisError && (
        <AIUnavailableNotice
          detail={analysisError.detail}
          guidance={analysisError.guidance || "Do not quote from this screen until analysis is restored."}
          onRetry={() => handleRunAnalysis()}
        />
      )}

      {/* 2. Upload Plan & Compact Project Details Section */}
      <div className="bg-white p-4 rounded-panel border border-line shadow-2xs space-y-3">
        <div className="border-b border-line pb-2.5">
          <span className="text-spec font-bold text-ink-dim uppercase tracking-wider">
            Upload Plan &amp; Project Details
          </span>
        </div>

        {/* Upload Dropzone & Core Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          
          {/* Dropzone */}
          <div className="md:col-span-6 relative border-2 border-dashed border-line-strong hover:border-brand rounded-panel p-3.5 text-center bg-paper transition-colors">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              <UploadCloud className="w-5 h-5 text-brand" />
              <div className="text-meta font-bold text-body">
                {uploadedFile ? uploadedFile.name : "Drop Engineering PDF, CAD Drawing, or Site Plan here"}
              </div>
              <div className="text-spec text-ink-faint">
                {uploadedFile
                  ? `${uploadedFile.type || "PDF"} • ${uploadedFile.size}`
                  : "PDF, PNG, JPG (up to 25 MB)"}
              </div>
            </div>
            {uploadedFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearPlan();
                }}
                className="absolute top-2 right-2 p-1 text-ink-faint hover:text-urgent rounded bg-white border border-line shadow-2xs cursor-pointer z-10"
                title="Remove plan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Project Details Fields */}
          <div className="md:col-span-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ballarat Shared Path"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-medium focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">Customer / Account</label>
                <input
                  type="text"
                  placeholder="e.g. City of Ballarat"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-medium focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">Drawing Number / Rev</label>
                <input
                  type="text"
                  placeholder="e.g. BCC-2025-E02 (Rev B)"
                  value={drawingRef}
                  onChange={(e) => setDrawingRef(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-medium focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">Engineering Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 3000K wildlife buffer"
                  value={drawingNotes}
                  onChange={(e) => setDrawingNotes(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Working Layout: Responsive Split View */}
      
      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center gap-1 p-1 bg-paper border border-line rounded-lg">
        <button
          onClick={() => setMobileActiveTab("preview")}
          className={`flex-1 py-1.5 text-meta font-bold rounded-edge text-center ${
            mobileActiveTab === "preview" ? "bg-white text-body shadow-2xs border border-line" : "text-ink-dim"
          }`}
        >
          Plan Preview
        </button>
        <button
          onClick={() => setMobileActiveTab("schedule")}
          className={`flex-1 py-1.5 text-meta font-bold rounded-edge text-center flex items-center justify-center gap-1.5 ${
            mobileActiveTab === "schedule" ? "bg-white text-body shadow-2xs border border-line" : "text-ink-dim"
          }`}
        >
          <span>Take-off Schedule</span>
          {takeoffResult && (
            <span className="text-spec px-1.5 py-0.2 rounded-full bg-brand-wash text-brand-deep font-bold">
              {takeoffResult.billOfMaterials.length}
            </span>
          )}
        </button>
      </div>

      {/* Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Plan Preview */}
        <div
          className={`${
            mobileActiveTab === "preview" ? "block" : "hidden md:block"
          } md:col-span-5 bg-slate-950 rounded-panel p-3.5 text-white shadow-md border border-slate-800 space-y-3`}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-spec font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                {takeoffResult?.drawingMetadata.drawingNumber || drawingRef || (uploadedFile ? "PDF" : "NO PLAN")}
              </span>
              <span className="text-spec text-slate-400 truncate max-w-[160px]">
                {takeoffResult?.drawingMetadata.sheetTitle || projectName || "Drawing View"}
              </span>
            </div>

            {/* Zoom / Rotate Controls */}
            {uploadedFile && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                  className="p-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-cyan-300" />
                </button>
                <span className="text-spec font-mono font-bold text-slate-300 w-9 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                  className="p-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-cyan-300" />
                </button>
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-300" />
                </button>
              </div>
            )}
          </div>

          {/* Working Preview Canvas */}
          <div className="relative min-h-[400px] h-[460px] bg-slate-900 rounded-edge border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            
            {/* 1. Honest Empty State */}
            {!uploadedFile && !selectedPlanId && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="font-bold text-white text-meta">No plan uploaded</h3>
                  <p className="text-spec text-slate-400 leading-relaxed">
                    Upload an engineering PDF or site drawing to inspect the source drawing and extract bill of materials.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Real Uploaded PDF Preview */}
            {uploadedFile && uploadedFile.dataUrl && uploadedFile.type === "application/pdf" && (
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-150"
                style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
              >
                <object
                  data={uploadedFile.dataUrl}
                  type="application/pdf"
                  className="w-full h-full rounded bg-white shadow-inner pointer-events-auto"
                >
                  <div className="p-4 text-center text-spec text-slate-300">
                    PDF loaded ({uploadedFile.name}). Preview supported in browser.
                  </div>
                </object>
              </div>
            )}

            {/* 3. Real Uploaded Image (PNG/JPG) Preview */}
            {uploadedFile && uploadedFile.dataUrl && uploadedFile.type !== "application/pdf" && (
              <div
                className="w-full h-full flex items-center justify-center overflow-auto"
                style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
              >
                <img
                  src={uploadedFile.dataUrl}
                  alt={uploadedFile.name}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            )}
          </div>

          {/* Legends & Symbols (Only shown if available) */}
          {takeoffResult?.legendAndSchedules && takeoffResult.legendAndSchedules.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <span className="text-spec font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Drawing Legend &amp; Symbols
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-spec">
                {takeoffResult.legendAndSchedules.map((leg, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-white/5 border border-white/10 flex items-start gap-1.5">
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded shrink-0 text-[10px]">
                      {leg.symbol}
                    </span>
                    <span className="text-slate-300 text-spec truncate">{leg.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Take-off Schedule */}
        <div
          className={`${
            mobileActiveTab === "schedule" ? "block" : "hidden md:block"
          } md:col-span-7 space-y-4`}
        >
          {/* Result Action Bar (Only shown when results exist) */}
          {takeoffResult && (
            <div className="bg-white p-3.5 rounded-panel border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-meta font-bold text-body">
                    Take-off Schedule ({statusCounts.total} items)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-spec text-ink-dim mt-0.5">
                  <span className="text-slate-600 font-semibold">{statusCounts.extracted} Extracted</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">{statusCounts.reviewed} Reviewed</span>
                  {statusCounts.needsReview > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 font-semibold">{statusCounts.needsReview} Needs Review</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons: Save to Deal + Export Menu + More Menu */}
              <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {/* 1. Primary Action: Save to CRM Deal */}
                <button
                  onClick={handleOpenTakeoffSaveModal}
                  className="px-3.5 py-1.5 bg-brand hover:bg-brand-deep text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Save take-off to CRM Pipeline"
                >
                  <KanbanSquare className="w-3.5 h-3.5" />
                  <span>Save to deal</span>
                </button>

                {/* 2. Consolidated Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsExportMenuOpen((prev) => !prev);
                      setIsMoreMenuOpen(false);
                    }}
                    className="px-3 py-1.5 bg-paper hover:bg-raised text-body font-bold text-meta rounded-edge border border-line flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 text-ink-faint" />
                  </button>

                  {isExportMenuOpen && (
                    <div className="absolute right-0 mt-1 w-56 bg-white rounded-panel shadow-lg border border-line py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => {
                          handleDownloadOstendoCSV();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-meta hover:bg-raised transition-colors flex items-center gap-2 text-body"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-brand-deep" />
                        <span>Download Ostendo CSV</span>
                      </button>

                      <button
                        onClick={() => {
                          handleCopyOstendoProductList();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-meta hover:bg-raised transition-colors flex items-center gap-2 text-body"
                      >
                        <Copy className="w-3.5 h-3.5 text-brand" />
                        <span>Copy Product List</span>
                      </button>

                      <button
                        onClick={() => {
                          handleExportCSV();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-meta hover:bg-raised transition-colors flex items-center gap-2 text-body border-t border-line"
                      >
                        <Download className="w-3.5 h-3.5 text-ink-dim" />
                        <span>Export Schedule CSV</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Consolidated More Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen((prev) => !prev);
                      setIsExportMenuOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-paper hover:bg-raised text-ink-dim hover:text-body font-semibold text-meta rounded-edge border border-line flex items-center gap-1 transition-colors cursor-pointer"
                    title="Additional tools and package actions"
                  >
                    <span>More</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isMoreMenuOpen && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-panel shadow-lg border border-line py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => {
                          setIsDatasheetModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-meta hover:bg-raised transition-colors flex items-center gap-2 text-body"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Tender Package</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsReadinessModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-meta hover:bg-raised transition-colors flex items-center gap-2 text-body"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Quote Readiness</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstItem = takeoffResult?.billOfMaterials[0];
                          setSelectedProductForPricing({
                            code: firstItem?.recommendedProductCode || "SOLAR-01",
                            name: firstItem?.itemDescription || "Public Lighting Luminaire",
                            quantity: firstItem?.quantity || 12
                          });
                          setIsPricingModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-meta hover:bg-raised transition-colors flex items-center gap-2 text-body"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Request Pricing</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Table (Only rendered when results exist) */}
          {takeoffResult && (
            <div className="bg-white p-4 rounded-panel border border-line shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-meta text-body">Itemized Products &amp; Quantities</h3>
                </div>
                <button
                  onClick={handleAddItem}
                  className="text-spec font-bold text-brand hover:text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-meta min-w-[560px]">
                  <thead>
                    <tr className="border-b border-line text-spec font-bold text-ink-dim uppercase">
                      <th className="text-left py-2 pr-2">Item / Category</th>
                      <th className="text-left py-2 px-2">Plasgain SKU</th>
                      <th className="text-left py-2 px-2">Drawing Ref</th>
                      <th className="text-center py-2 px-2">Status</th>
                      <th className="text-center py-2 px-2 w-24">Quantity</th>
                      <th className="text-left py-2 px-2">Notes</th>
                      <th className="py-2 pl-2 w-7"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {takeoffResult.billOfMaterials.map((item) => {
                      const extItem = item as ExtendedBOMItem;
                      const status = extItem.reviewStatus || "Extracted";
                      const isReviewed = status === "Reviewed" || status === "Confirmed from source";
                      const isWarning = status === "Needs review" || status === "Unresolved" || status === "Match needs review";

                      return (
                        <tr key={item.id} className="hover:bg-raised/50 group transition-colors">
                          {/* Item Description & Category */}
                          <td className="py-2.5 pr-2 max-w-[200px]">
                            <div className="font-bold text-body text-meta truncate" title={item.itemDescription}>
                              {item.itemDescription}
                            </div>
                            <span className="text-[11px] text-ink-dim px-1.5 py-0.2 bg-paper rounded border border-line inline-block mt-0.5">
                              {item.category}
                            </span>
                          </td>

                          {/* SKU Code */}
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={item.recommendedProductCode}
                              onChange={(e) => handleUpdateItem(item.id, "recommendedProductCode", e.target.value)}
                              placeholder="e.g. PB-75W-3K"
                              className="font-mono text-spec font-bold text-brand-deep bg-brand-wash/40 border border-brand-edge px-2 py-1 rounded w-32 focus:ring-1 focus:ring-brand"
                            />
                          </td>

                          {/* Drawing Reference */}
                          <td className="py-2.5 px-2 text-spec text-ink-dim">
                            <input
                              type="text"
                              value={item.drawingReference}
                              onChange={(e) => handleUpdateItem(item.id, "drawingReference", e.target.value)}
                              className="w-full text-spec bg-paper px-1.5 py-1 rounded border border-line"
                            />
                          </td>

                          {/* Review / Verification Status */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleItemStatus(item.id)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                isReviewed
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                  : isWarning
                                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Click to toggle status"
                            >
                              {isReviewed && <Check className="w-2.5 h-2.5" />}
                              {isWarning && <AlertCircle className="w-2.5 h-2.5" />}
                              <span>{status}</span>
                            </button>
                          </td>

                          {/* Quantity & Unit */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, "quantity", Number(e.target.value) || 1)}
                                className="w-14 p-1 text-center font-bold bg-paper rounded border border-line focus:ring-1 focus:ring-brand text-meta"
                              />
                              <span className="text-spec font-bold text-ink-dim">{item.unit || "ea"}</span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-2.5 px-2 text-spec text-ink-dim">
                            <input
                              type="text"
                              value={item.notes || ""}
                              onChange={(e) => handleUpdateItem(item.id, "notes", e.target.value)}
                              placeholder="Line notes..."
                              className="w-full p-1 text-spec bg-paper rounded border border-line"
                            />
                          </td>

                          {/* Delete */}
                          <td className="py-2.5 pl-2 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-ink-faint hover:text-urgent p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-2.5 border-t border-line text-spec text-ink-dim">
                <span>* Line items above export to Ostendo ERP where live customer pricing and GST are applied.</span>
              </div>
            </div>
          )}

          {/* Notes (only rendered if there are any) */}
          {takeoffResult?.notes && takeoffResult.notes.length > 0 && (
            <div className="bg-white p-4 rounded-panel border border-line shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-meta font-bold text-body border-b border-line pb-2">
                <AlertTriangle className="w-4 h-4 text-brand-deep" />
                <span>Notes</span>
              </div>

              <div className="space-y-2">
                {takeoffResult.notes.map((note, idx) => (
                  <div key={idx} className="p-2.5 rounded-edge border border-line bg-paper text-meta text-body">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initial State Helper (When no result yet) */}
          {!takeoffResult && (
            <div className="bg-white p-6 rounded-panel border border-line shadow-2xs text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center text-ink-dim mx-auto border border-line">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-body text-meta">Take-off Schedule Ready</h3>
              <p className="text-spec text-ink-dim max-w-md mx-auto">
                Once a drawing is uploaded or selected, click <strong>Analyse plan</strong> to extract line items, verify quantities, and export to Ostendo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Datasheet & Tender Spec Package Modal */}
      {isDatasheetModalOpen && takeoffResult && (
        <DatasheetPackageModal
          isOpen={isDatasheetModalOpen}
          onClose={() => setIsDatasheetModalOpen(false)}
          projectName={projectName}
          customerName={customerName}
          quoteRef={ostendoQuoteRef || takeoffResult.drawingMetadata.drawingNumber}
          initialProductNames={takeoffResult.billOfMaterials.map((b) => b.recommendedProductCode || b.itemDescription)}
        />
      )}

      {/* Save Take-off to CRM Confirmation Modal */}
      {isTakeoffSaveModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-lg w-full shadow-2xl border border-line p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-edge bg-brand-wash text-brand-deep flex items-center justify-center font-bold">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-body">Save Take-off to CRM Pipeline</h3>
                  <p className="text-spec text-ink-dim">Match account and carry {takeoffResult?.billOfMaterials?.length || 0} product items</p>
                </div>
              </div>
              <button
                onClick={() => setIsTakeoffSaveModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-meta">
              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={takeoffSaveFormData.projectName}
                  onChange={(e) => setTakeoffSaveFormData({ ...takeoffSaveFormData, projectName: e.target.value })}
                  className="w-full p-2 text-meta rounded-edge border border-line focus:outline-none focus:border-brand-deep font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-spec font-bold text-ink-dim uppercase">
                    Target Customer Account *
                  </label>
                  {customerName && !accounts.some((a) => a.name.toLowerCase() === customerName.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={handleInlineCreateAccount}
                      className="text-spec text-brand-deep font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create "{customerName}"</span>
                    </button>
                  )}
                </div>
                <select
                  value={takeoffSaveFormData.accountId}
                  onChange={(e) => {
                    const acc = accounts.find((a) => a.id === e.target.value);
                    setTakeoffSaveFormData({
                      ...takeoffSaveFormData,
                      accountId: e.target.value,
                      accountName: acc?.name || ""
                    });
                  }}
                  className={`w-full p-2 text-meta rounded-edge border bg-white focus:outline-none ${
                    !takeoffSaveFormData.accountId ? "border-soon bg-soon-wash/20 font-semibold" : "border-line font-medium"
                  }`}
                >
                  <option value="">-- Select Customer Account (Required) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.territory})
                    </option>
                  ))}
                </select>
                {!takeoffSaveFormData.accountId && (
                  <p className="text-[11px] text-soon font-semibold mt-1">
                    Please select an account or click "Create" above to avoid unlinked deals.
                  </p>
                )}
                {(() => {
                  const selAcc = accounts.find((a) => a.id === takeoffSaveFormData.accountId);
                  const isConflict = Boolean(
                    selAcc &&
                      customerName &&
                      !selAcc.name.toLowerCase().includes(customerName.toLowerCase()) &&
                      !customerName.toLowerCase().includes(selAcc.name.toLowerCase())
                  );
                  if (isConflict && selAcc) {
                    return (
                      <div className="mt-2 p-3 bg-soon-wash border border-soon text-soon rounded text-spec space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Account / Authority Conflict:</strong> Selected account "{selAcc.name}" ({selAcc.territory}) does not match drawing authority "{customerName}".
                          </div>
                        </div>
                        <label className="flex items-center gap-2 pt-1 font-semibold text-body cursor-pointer border-t border-soon/30">
                          <input
                            type="checkbox"
                            checked={accountMismatchConfirmed}
                            onChange={(e) => setAccountMismatchConfirmed(e.target.checked)}
                            className="rounded border-soon text-brand cursor-pointer"
                          />
                          <span>I confirm this account is correct despite the mismatch with drawing authority</span>
                        </label>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Pipeline Stage
                </label>
                <select
                  value={takeoffSaveFormData.stageId}
                  onChange={(e) => setTakeoffSaveFormData({ ...takeoffSaveFormData, stageId: e.target.value })}
                  className="w-full p-2 text-meta rounded-edge border border-line bg-white focus:outline-none"
                >
                  {pipelines[0]?.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.probability}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-spec font-bold text-ink-dim uppercase mb-1">
                  Indicative Deal Value ($AUD)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Enter estimated deal value or leave 0"
                  value={takeoffSaveFormData.dealValue || ""}
                  onChange={(e) => setTakeoffSaveFormData({ ...takeoffSaveFormData, dealValue: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-2 text-meta rounded-edge border border-line focus:outline-none focus:border-brand-deep font-mono"
                />
              </div>

              <div className="p-2.5 bg-paper rounded-edge border border-line text-spec text-ink-dim">
                <span className="font-bold text-body">Product Units Preserved: </span>
                Quantities and units ({takeoffResult?.billOfMaterials?.map((b) => `${b.quantity} ${b.unit}`).join(", ")}) will be carried to Ostendo CSV export.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setIsTakeoffSaveModalOpen(false)}
                className="px-3 py-2 text-meta font-medium text-ink-dim hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              {(() => {
                const selAcc = accounts.find((a) => a.id === takeoffSaveFormData.accountId);
                const isConflict = Boolean(
                  selAcc &&
                    customerName &&
                    !selAcc.name.toLowerCase().includes(customerName.toLowerCase()) &&
                    !customerName.toLowerCase().includes(selAcc.name.toLowerCase())
                );
                const isBlocked = !takeoffSaveFormData.accountId || (isConflict && !accountMismatchConfirmed);

                return (
                  <button
                    onClick={handleConfirmTakeoffSave}
                    disabled={isBlocked}
                    className={`px-4 py-2 font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 transition-colors ${
                      !isBlocked
                        ? "bg-brand hover:bg-brand-deep text-white cursor-pointer"
                        : "bg-ink-faint text-white cursor-not-allowed opacity-75"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Save Deal</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Pre-Quote Readiness Gate Modal */}
      {isReadinessModalOpen && takeoffResult && (
        <QuoteReadinessModal
          isOpen={isReadinessModalOpen}
          onClose={() => setIsReadinessModalOpen(false)}
          context={{
            quoteType: "firm",
            customerCompany: customerName,
            projectName,
            productFamily: takeoffResult.billOfMaterials[0]?.category || "Solar Public Lighting",
            productCode: takeoffResult.billOfMaterials.map((b) => b.recommendedProductCode).filter(Boolean).join(", "),
            quantity: takeoffResult.billOfMaterials.length,
            isSolar: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("solar")),
            isMains: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("mains")),
            isPolePackage: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("pole")),
            isCivilCableCover: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("cable") || b.category.toLowerCase().includes("cover")),
            solarAutonomyDays: undefined,
            mountingHeight: takeoffResult.billOfMaterials
              .map((b) => b.itemDescription.match(/\b(\d+(?:\.\d+)?)m\b/i)?.[1])
              .find(Boolean),
            commercialPricingApproved: false,
            deliveryLocation: customerName || undefined
          }}
          onProceedWithQuote={() => {
            setIsReadinessModalOpen(false);
            showToast("Pre-quote readiness confirmed! Proceeding with quotation.", "success");
          }}
        />
      )}

      {/* Commercial Pricing Request Modal */}
      {isPricingModalOpen && (
        <CommercialPricingRequestModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          projectId={selectedPlanId || "proj-takeoff-01"}
          projectName={projectName}
          customerCompany={customerName || "Council Authority"}
          productCode={selectedProductForPricing.code}
          productName={selectedProductForPricing.name}
          initialQuantity={selectedProductForPricing.quantity}
          onRequestSubmitted={() => {
            setIsPricingModalOpen(false);
            showToast("Commercial pricing request submitted to Sales Management.", "success");
          }}
        />
      )}

      {/* Conservative Duplicate Account Warning Modal */}
      {isDuplicateModalOpen && duplicateMatch && pendingAccountToCreate && (
        <CRMDuplicateWarningModal
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setPendingAccountToCreate(null);
            setDuplicateMatch(null);
          }}
          entityType="Account"
          candidateName={pendingAccountToCreate.name}
          matchResult={duplicateMatch}
          onOpenExisting={(rec) => {
            navigateToCRM("accounts");
            setIsDuplicateModalOpen(false);
          }}
          onUseExisting={(rec) => {
            setTakeoffSaveFormData((prev) => ({
              ...prev,
              accountId: rec.id,
              accountName: rec.name
            }));
            setAccountMismatchConfirmed(true);
            setIsDuplicateModalOpen(false);
            showToast(`Linked to existing account: "${rec.name}"`, "success");
          }}
          onCreateAnyway={() => {
            addAccount(pendingAccountToCreate);
            setTakeoffSaveFormData((prev) => ({
              ...prev,
              accountId: pendingAccountToCreate.id,
              accountName: pendingAccountToCreate.name
            }));
            setAccountMismatchConfirmed(true);
            setIsDuplicateModalOpen(false);
            showToast(`Created account "${pendingAccountToCreate.name}" (Duplicate override logged)`, "success");
          }}
        />
      )}
    </div>
  );
};
