import React, { useState, useMemo, useRef } from "react";
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
  Info,
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
  X
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

interface SamplePlan {
  id: string;
  name: string;
  category: string;
  sheetTitle: string;
  drawingNumber: string;
  scale: string;
  description: string;
  result: DrawingTakeoffResult;
}

const SAMPLE_PLANS: SamplePlan[] = [
  {
    id: "ballarat-shared-path",
    name: "Ballarat 1.2km Shared Path Upgrade",
    category: "Civil & Solar Lighting",
    sheetTitle: "Public Lighting & Trenching Layout - Sheet E-02",
    drawingNumber: "BCC-2025-E02-REV-B",
    scale: "1:500 @ A1",
    description: "24x 6m Solar Pathway Poles, 1,200m underground civil trenching protection, and riverbank canopy notes.",
    result: {
      drawingMetadata: {
        sheetTitle: "Public Lighting & Trenching Layout - Sheet E-02",
        drawingNumber: "BCC-2025-E02-REV-B",
        scale: "1:500 @ A1",
        revision: "Rev B",
        standardsIdentified: ["AS/NZS 1158.3.1 (Cat P4)", "AS 4702", "AS/NZS 3000"]
      },
      legendAndSchedules: [
        { symbol: "Type S1", description: "Solar LED Pathway Luminaire (3000K Warm White)", scheduleRef: "Luminaire Schedule Type S1" },
        { symbol: "P-6M", description: "6.0m Recycled Composite Light Pole (Direct Burial)", scheduleRef: "Pole Schedule Detail 3" },
        { symbol: "CC-200", description: "Plasgain Polymeric Cable Cover Slab (200mm width)", scheduleRef: "Civil Trenching Spec 4.2" }
      ],
      billOfMaterials: [
        {
          id: "bom-1",
          category: "Solar Luminaire & Fitting",
          itemDescription: "Plasgain Pro Blade 75 Solar Luminaire (3000K Warm White, 75W PV, 460Wh LiFePO4)",
          quantity: 24,
          unit: "ea",
          recommendedProductCode: "PB-75W-3K",
          drawingReference: "Poles P1 to P24 along shared path alignment",
          confidence: "High",
          notes: "3000K specified in drawing notes for wildlife preservation buffer"
        },
        {
          id: "bom-2",
          category: "Pole & Structural Foundation",
          itemDescription: "Plaspole 6.0m Recycled Composite Light Pole (Direct Burial, Heritage Green finish)",
          quantity: 24,
          unit: "ea",
          recommendedProductCode: "PLASPOLE-6M-DB-GRN",
          drawingReference: "P1–P24 (1.2m embedment depth per detail 3/E02)",
          confidence: "High",
          notes: "Non-conductive composite suitable for riverbank salinity"
        },
        {
          id: "bom-3",
          category: "Civil & Trenching Protection",
          itemDescription: "Plasgain Polymeric Cable Cover Slabs (1000mm x 200mm x 6mm AS 4702 Cat 1)",
          quantity: 1200,
          unit: "m",
          recommendedProductCode: "PCC-200-1M",
          drawingReference: "Submains trench run T-01 to T-04 (1,200 linear metres)",
          confidence: "High",
          notes: "Replaces 31.8 Tonnes of heavy concrete slabs; 1200 interlocking units"
        },
        {
          id: "bom-4",
          category: "Civil & Electrical Warning",
          itemDescription: "AS/NZS 2648.1 Heavy Duty Underground Warning Tape (500m rolls)",
          quantity: 3,
          unit: "rolls",
          recommendedProductCode: "WT-ELEC-500M",
          drawingReference: "Laid 200mm above cable covers across 1.2km trench",
          confidence: "High",
          notes: "Continuous orange warning tape 'DANGER ELECTRICAL CABLE BELOW'"
        }
      ],
      engineeringAndSiteNotes: [
        {
          type: "warning",
          title: "Tree Canopy Shading Alert",
          description: "Dense mature eucalyptus canopy noted between chainage Ch 450m and Ch 620m (Poles P9–P12). Recommend verifying winter solar clearance or using extended outreach bracket."
        },
        {
          type: "compliance",
          title: "AS/NZS 1158.3.1 Category P4 Spacing",
          description: "Pole spacing averages 48m on 6m mounting height. Requires Dialux photometric confirmation to ensure 0.85 lux average (0.17 lux point minimum) horizontal illuminance."
        },
        {
          type: "info",
          title: "Alluvial Soil Direct Burial Depth",
          description: "Drawing detail indicates soft riverbank soil. Direct burial depth specified at 1.2m embedment (H/5) with stabilized aggregate collar."
        }
      ],
      summary: "Deciphered 24x 6m Solar Pathway Poles, 1,200m underground civil trenching protection, and flagged canopy shading near river bend."
    }
  },
  {
    id: "geelong-commercial-park",
    name: "Geelong Commercial Business Park",
    category: "Car Park & Area Lighting",
    sheetTitle: "Site Electrical & External Car Park Lighting - Plan E-101",
    drawingNumber: "GBP-2025-E101",
    scale: "1:250 @ A1",
    description: "16x 8.0m High-Output Solar Car Park Poles with 800m Polymeric Cover trenching.",
    result: {
      drawingMetadata: {
        sheetTitle: "Site Electrical & External Car Park Lighting - Plan E-101",
        drawingNumber: "GBP-2025-E101",
        scale: "1:250 @ A1",
        revision: "Rev C",
        standardsIdentified: ["AS/NZS 1158.3.1 (Cat P11b)", "AS 4702", "AS 1170.2 Region B"]
      },
      legendAndSchedules: [
        { symbol: "CP-SL", description: "High-Output Solar Area Luminaire (896Wh LiFePO4)", scheduleRef: "Type CP-1" },
        { symbol: "BP-8M", description: "8.0m Galvanised Steel Ragbolt Baseplate Pole", scheduleRef: "Pole Schedule BP-8" }
      ],
      billOfMaterials: [
        {
          id: "bom-1",
          category: "Solar Luminaire & Fitting",
          itemDescription: "Plasgain Intense 50W Solar Luminaire (8,500 lm, 130W PV, 896Wh LiFePO4, 4000K)",
          quantity: 16,
          unit: "ea",
          recommendedProductCode: "INTENSE-50W-4K",
          drawingReference: "Car park bays A1 to D4 perimeter poles",
          confidence: "High",
          notes: "Category P11b compliance for commercial pedestrian night safety"
        },
        {
          id: "bom-2",
          category: "Pole & Structural Foundation",
          itemDescription: "8.0m Galvanised Mild Steel Baseplate Pole (AS/NZS 4680 Hot-Dip Galvanised)",
          quantity: 16,
          unit: "ea",
          recommendedProductCode: "STEEL-8M-BP",
          drawingReference: "4x M24 ragbolt cage on 300mm PCD in concrete footing",
          confidence: "High",
          notes: "Engineered for Wind Region B coastal buffer"
        },
        {
          id: "bom-3",
          category: "Civil & Trenching Protection",
          itemDescription: "Plasgain Polymeric Cable Cover Slabs (1000mm x 300mm x 6mm AS 4702 Cat 1)",
          quantity: 800,
          unit: "m",
          recommendedProductCode: "PCC-300-1M",
          drawingReference: "Main distributor trench between switchboard and perimeter",
          confidence: "High",
          notes: "300mm wide for 3-phase multi-circuit conduit bank"
        }
      ],
      engineeringAndSiteNotes: [
        {
          type: "compliance",
          title: "Wind Region B Footing Design",
          description: "Minimum concrete footing volume 0.85 m³ per pole with 4x M24 Grade 8.8 J-bolts."
        },
        {
          type: "info",
          title: "Smart PIR Motion Profile",
          description: "Car park schedule specifies 100% output from dusk to 11:00 PM, then 30% dim with PIR motion activation."
        }
      ],
      summary: "Deciphered 16x 8m Intense 50W Solar Luminaires on Baseplate Steel Poles with 800m Polymeric Cable Protection."
    }
  }
];

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
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<{ detail: string; guidance?: string } | null>(null);

  // Take-off Result State
  const [takeoffResult, setTakeoffResult] = useState<DrawingTakeoffResult | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Plan Canvas Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // P2-08, P2-09 & P2-13: Quote Readiness, Pricing & Duplicate Detection State
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

    // File Input Handler with Strict Validation (F-04)
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

      // Immediately clear prior plan take-off result to prevent misleading BOM displays
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
        setProjectName(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        showToast(`Loaded "${file.name}". Click "Decipher Plan" to run AI vision analysis.`, "info");
      };
      reader.readAsDataURL(file);
    }
  };

  // Load Sample Plan
  const handleSelectSample = (sample: SamplePlan) => {
    setSelectedPlanId(sample.id);
    setProjectName(sample.name);
    setUploadedFile({
      name: `${sample.drawingNumber}.pdf`,
      size: "2.4 MB",
      type: "application/pdf"
    });
    setTakeoffResult(sample.result);
    setZoomLevel(1.0);
    setRotation(0);
    setExportValidationErrors([]);
    showToast(`Loaded sample plan: ${sample.name}`, "success");
  };

  // Run AI Drawing Analysis
  const handleRunAnalysis = async () => {
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
        setTakeoffResult(result);
        showToast("Plan successfully deciphered by Gemini Multimodal Vision!", "success");
      }
    } catch (err) {
      console.error("Drawing analysis error:", err);
      setTakeoffResult(null);
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
  const handleUpdateItem = (id: string, field: keyof BOMItem, value: any) => {
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
    const newItem: BOMItem = {
      id: `bom-${Date.now()}`,
      category: "Solar Luminaire & Fitting",
      itemDescription: "Plasgain Additional Luminaire / Custom Fitting",
      quantity: 1,
      unit: "ea",
      recommendedProductCode: "PB-75W-3K",
      drawingReference: "User Added Item",
      confidence: "High",
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
      showToast("No verified product take-off items to save to CRM", "warning");
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
    const newAccName = (customerName || "Council Authority").trim();
    const newAccId = `acc-${Date.now()}`;
    const isCouncil = newAccName.toLowerCase().includes("council") || newAccName.toLowerCase().includes("city") || newAccName.toLowerCase().includes("shire");
    const isVic = newAccName.toLowerCase().includes("ballarat") || newAccName.toLowerCase().includes("geelong") || newAccName.toLowerCase().includes("melbourne") || newAccName.toLowerCase().includes("bendigo");

    const newAcc: Account = {
      id: newAccId,
      name: newAccName,
      status: "Prospect",
      industry: "Government & Public Infrastructure",
      customerSegment: isCouncil ? "Local Government / Council" : "Civil Contractor",
      territory: isVic ? "VIC/TAS" : "QLD/NT",
      accountOwner: currentUser.name,
      leadSource: "Plan Take-off Ingestion",
      createdDate: new Date().toISOString().split("T")[0],
      lastInteractionDate: new Date().toISOString().split("T")[0],
      relationshipHealth: "Healthy",
      tags: ["Plan Take-off", "Infrastructure"],
      notes: `Created from plan take-off for project "${takeoffSaveFormData.projectName}"`,
      metrics: {
        openPipelineValue: Number(takeoffSaveFormData.dealValue) || 0,
        totalDealsWon: 0,
        activeDealsCount: 1,
        totalEnquiries: 1
      }
    };

    const duplicate = detectDuplicateAccount({ name: newAccName }, accounts);
    if (duplicate) {
      setPendingAccountToCreate(newAcc);
      setDuplicateMatch(duplicate);
      setIsDuplicateModalOpen(true);
      return;
    }

    addAccount(newAcc);
    setTakeoffSaveFormData((prev) => ({
      ...prev,
      accountId: newAccId,
      accountName: newAccName
    }));
    setAccountMismatchConfirmed(true);
    showToast(`Created and linked new CRM Account: "${newAccName}"!`, "success");
  };

  const handleConfirmTakeoffSave = () => {
    if (!takeoffResult || !takeoffResult.billOfMaterials) return;
    if (!takeoffSaveFormData.accountId) {
      showToast("Please select or create an account before saving to CRM pipeline.", "error");
      return;
    }
    const acc = accounts.find((a) => a.id === takeoffSaveFormData.accountId);
    if (!acc) {
      showToast("Selected account was not found. Please choose an account.", "error");
      return;
    }

    const isConflict = Boolean(
      acc &&
      customerName &&
      !acc.name.toLowerCase().includes(customerName.toLowerCase()) &&
      !customerName.toLowerCase().includes(acc.name.toLowerCase())
    );

    if (isConflict && !accountMismatchConfirmed) {
      showToast(`Cannot save: Selected account "${acc.name}" conflicts with drawing customer "${customerName}". Please confirm override or create a matching account.`, "error");
      return;
    }
    const pipe = pipelines.find((p) => p.id === takeoffSaveFormData.pipelineId) || pipelines[0];
    const stage = pipe.stages.find((s) => s.id === takeoffSaveFormData.stageId) || pipe.stages[0];

    const dealId = `opp-takeoff-${Date.now()}`;
    const newDeal = {
      id: dealId,
      name: takeoffSaveFormData.projectName,
      accountId: acc.id,
      accountName: acc.name,
      primaryContactId: "con-001",
      primaryContactName: "Engineering / Project Estimator",
      opportunityOwner: currentUser.name,
      pipelineId: pipe.id,
      stageId: stage.id,
      stageName: stage.name,
      dealValue: Number(takeoffSaveFormData.dealValue) || 0,
      weightedValue: (Number(takeoffSaveFormData.dealValue) || 0) * (stage.probability / 100),
      probability: stage.probability,
      forecastCategory: "Pipeline" as const,
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      products: takeoffResult.billOfMaterials.map((bom, idx) => ({
        id: `prod-${idx + 1}`,
        productCode: bom.recommendedProductCode || "",
        productName: bom.itemDescription,
        category: bom.category,
        quantity: bom.quantity,
        unit: bom.unit || "ea",
        notes: `Drawing Ref: ${bom.drawingReference || "N/A"} | ${bom.notes || ""}`
      })),
      projectApplication: `Plan Take-off: ${takeoffResult.drawingMetadata?.sheetTitle || "Engineering Plan"}`,
      location: "Australia",
      customerNeed: takeoffResult.summary || "Product schedule deciphered from engineering plan.",
      keyRequirements: [
        `Drawing: ${takeoffResult.drawingMetadata?.drawingNumber || "N/A"}`,
        `Standards: ${(takeoffResult.drawingMetadata?.standardsIdentified || []).join(", ") || "AS/NZS 1158"}`
      ],
      source: "AI Plan & Drawing Deciphering",
      ostendoQuoteRef: ostendoQuoteRef || undefined,
      latestActivity: `Plan take-off verified (${takeoffResult.billOfMaterials.length} items)`,
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Draft Ostendo quotation from verified product take-off schedule",
      nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy" as const,
      dealHealthReasons: ["Technical take-off verified from engineering drawing"],
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
    downloadOstendoCSV(csvData, `Ostendo_Product_List_${projectName.replace(/\s+/g, "_")}.csv`);
    showToast("Ostendo CSV downloaded. Ostendo will calculate customer pricing, tax and totals.", "success");
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
    showToast("Product list copied to clipboard! Pricing will be calculated in Ostendo.", "success");
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
      `"${item.confidence}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Takeoff_Schedule_${projectName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Downloaded Take-off Schedule CSV!", "success");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header & Feature Context */}
      <div className="bg-gradient-to-r from-brand-deep via-brand to-brand-deep text-white p-6 rounded-panel shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform origin-top-right pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-spec font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-soon" />
              <span>AI Drawing &amp; Plan Deciphering</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Engineering Plan &amp; Product Take-off
            </h1>
            <p className="text-white/80 text-meta max-w-2xl">
              Extract luminaire schedules, pole tables, and civil cable cover quantities directly from engineering drawings. Exports validated product lists for Ostendo ERP entry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsDatasheetModalOpen(true)}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-edge font-bold text-meta backdrop-blur-xs flex items-center gap-2 border border-white/20 transition-colors cursor-pointer"
              title="Download consolidated Tender Spec Package"
            >
              <Download className="w-4 h-4 text-cyan-300" />
              <span>Tender Package</span>
            </button>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalysing}
              className="px-4 py-2 bg-soon hover:bg-soon text-ink-base font-bold rounded-edge text-meta shadow-sm hover:shadow flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalysing ? "animate-spin" : ""}`} />
              <span>{isAnalysing ? "Deciphering Plan..." : "Re-Analyse Plan"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Error Notice if any */}
      {exportValidationErrors.length > 0 && (
        <div className="p-4 bg-urgent-wash border border-urgent/30 rounded-panel text-meta text-urgent space-y-1.5 animate-in fade-in duration-150">
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

      {/* Blueprint Ingestion Ribbon */}
      <div className="bg-white p-5 rounded-panel border border-line shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-deep" />
            <h2 className="font-bold text-body text-meta">Select or Upload Plan Drawing</h2>
          </div>

          {/* Sample Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-spec text-ink-dim font-semibold">Load Sample:</span>
            {SAMPLE_PLANS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`px-2.5 py-1 text-spec font-bold rounded border transition-colors cursor-pointer ${
                  selectedPlanId === sample.id
                    ? "bg-brand-deep text-white border-brand-deep"
                    : "bg-paper text-ink hover:bg-raised border-line"
                }`}
              >
                {sample.name.split(" ")[0]} Plan
              </button>
            ))}
          </div>
        </div>

        {/* Upload & Context Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Dropzone */}
          <div className="md:col-span-6 relative border-2 border-dashed border-line-strong hover:border-brand rounded-panel p-4 text-center bg-paper transition-colors">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
              <UploadCloud className="w-6 h-6 text-brand-deep" />
              <div className="text-meta font-bold text-body">
                {uploadedFile ? uploadedFile.name : "Drop Engineering PDF, CAD Drawing, or Site Plan here"}
              </div>
              <div className="text-spec text-ink-faint">
                {uploadedFile ? `${uploadedFile.type} • ${uploadedFile.size}` : "Supports PDF, PNG, JPG, TIFF (up to 25MB)"}
              </div>
            </div>
          </div>

          {/* Project & Context Fields */}
          <div className="md:col-span-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-medium"
                />
              </div>
              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">Customer / Authority</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 bg-paper text-meta rounded-edge border border-line font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-spec font-bold uppercase text-ink-dim mb-0.5">
                Engineer Notes / Clarifications
              </label>
              <input
                type="text"
                value={drawingNotes}
                onChange={(e) => setDrawingNotes(e.target.value)}
                placeholder="e.g. Verify 3000K wildlife buffer and 1.2m footing embedment depth"
                className="w-full p-2 bg-paper text-meta rounded-edge border border-line"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive CAD & Drawing Viewer */}
        <div className="lg:col-span-5 bg-slate-950 rounded-panel p-4 text-white shadow-md border border-slate-800 space-y-3">
          
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-spec font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                {takeoffResult?.drawingMetadata.drawingNumber || "CAD-VIEW"}
              </span>
              <span className="text-spec text-slate-400 truncate max-w-[180px]">
                {takeoffResult?.drawingMetadata.sheetTitle || "Engineering Layout"}
              </span>
            </div>

            {/* Zoom / Rotate Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 text-cyan-300" />
              </button>
              <span className="text-spec font-mono font-bold text-slate-300 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5 text-cyan-300" />
              </button>
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-300" />
              </button>
            </div>
          </div>

          {/* Interactive Canvas View */}
          <div className="relative h-[420px] bg-slate-900 rounded-edge border border-cyan-950 overflow-hidden flex items-center justify-center p-4">
            
            {/* Blueprint Grid Overlay */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }}
            />

            {/* Drawing Content Simulation with Zoom & Rotate */}
            <div
              className="transition-transform duration-150 ease-out flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
              }}
            >
              {/* Simulated CAD Sheet Graphics */}
              <div className="w-56 h-36 border-2 border-cyan-500/40 rounded bg-cyan-950/20 p-3 relative flex flex-col justify-between">
                
                {/* Title Block Box */}
                <div className="text-left font-mono text-[9px] text-cyan-400 border-b border-cyan-500/30 pb-1">
                  <div>DWG: {takeoffResult?.drawingMetadata.drawingNumber || "E-02"}</div>
                  <div>SCALE: {takeoffResult?.drawingMetadata.scale || "1:500"}</div>
                </div>

                {/* Simulated Pole & Luminaire Symbols */}
                <div className="flex justify-around items-center py-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-500/50 animate-pulse" />
                    <span className="text-[8px] font-mono text-amber-300 font-bold">P1 (6m)</span>
                  </div>
                  <div className="h-0.5 w-12 bg-dashed border-b border-dashed border-orange-400" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-500/50 animate-pulse" />
                    <span className="text-[8px] font-mono text-amber-300 font-bold">P2 (6m)</span>
                  </div>
                  <div className="h-0.5 w-12 bg-dashed border-b border-dashed border-orange-400" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-500/50 animate-pulse" />
                    <span className="text-[8px] font-mono text-amber-300 font-bold">P3 (6m)</span>
                  </div>
                </div>

                {/* Underground Trench Callout */}
                <div className="text-[8px] font-mono text-orange-400 bg-orange-950/60 px-1 py-0.5 rounded border border-orange-500/30">
                  ⚡ 1,200m Polymeric Cover Slab Run
                </div>
              </div>

              {/* Bottom Metadata Bar */}
              <div className="relative z-10 flex justify-between items-end text-spec text-cyan-300 font-mono pt-2 border-t border-white/10 w-full">
                <div className="text-[10px] text-slate-400">
                  Standards: {(takeoffResult?.drawingMetadata.standardsIdentified || []).join(" • ")}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">
                  {takeoffResult?.billOfMaterials.length || 0} ITEMS IDENTIFIED
                </div>
              </div>

            </div>
          </div>

          {/* Legends & Symbol Cross-reference */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-spec font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Deciphered Drawing Legend &amp; Symbols:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-spec">
              {takeoffResult?.legendAndSchedules.map((leg, idx) => (
                <div key={idx} className="p-2 rounded bg-white/5 border border-white/10 flex items-start gap-2">
                  <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded shrink-0">
                    {leg.symbol}
                  </span>
                  <span className="text-slate-300 text-meta truncate">{leg.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Editable Product & Quantity List & Actions */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Action Ribbon & Product Schedule Context */}
          <div className="bg-white p-4 rounded-panel border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                Product &amp; Quantity Take-off Schedule
              </span>
              <div className="text-lg font-black text-body mt-0.5 flex items-center gap-2">
                <span>{takeoffResult?.billOfMaterials.length || 0} Line Items Verified</span>
                <span className="text-spec font-normal text-brand-deep bg-brand-wash px-2 py-0.5 rounded">
                  Pricing calculated in Ostendo ERP
                </span>
              </div>
            </div>

                        {/* Actions: Download Ostendo CSV, Copy Product List, Tender Package, Export CSV, Save to CRM */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadOstendoCSV}
                className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Download standard UTF-8 CRLF CSV for Ostendo ERP"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-200" />
                <span>Download Ostendo CSV</span>
              </button>

              <button
                onClick={handleCopyOstendoProductList}
                className="px-3 py-1.5 bg-white hover:bg-brand-wash text-brand-deep border border-brand-edge font-bold text-meta rounded-edge flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Copy tab-delimited product and quantity list to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Product List</span>
              </button>

              <button
                onClick={() => setIsDatasheetModalOpen(true)}
                className="px-3 py-1.5 bg-paper hover:bg-raised text-body font-bold text-meta rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Generate and download consolidated Tender Spec Package"
              >
                <Download className="w-3.5 h-3.5 text-ink-dim" />
                <span>Tender Package</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-paper hover:bg-raised text-meta font-bold rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Download Take-off Schedule spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-ink-dim" />
                <span>Export Schedule</span>
              </button>

              <button
                onClick={() => setIsReadinessModalOpen(true)}
                className="px-3 py-1.5 bg-paper hover:bg-raised text-body font-bold text-meta rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Evaluate pre-quote readiness gate for this take-off"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                <span>Quote Readiness</span>
              </button>

              <button
                onClick={() => {
                  const firstItem = takeoffResult?.billOfMaterials[0];
                  setSelectedProductForPricing({
                    code: firstItem?.recommendedProductCode || "SOLAR-TAIZ-01",
                    name: firstItem?.itemDescription || "Public Lighting Luminaire",
                    quantity: firstItem?.quantity || 12
                  });
                  setIsPricingModalOpen(true);
                }}
                className="px-3 py-1.5 bg-paper hover:bg-raised text-body font-bold text-meta rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Submit commercial pricing request to sales leadership"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Request Pricing</span>
              </button>

              <button
                onClick={handleOpenTakeoffSaveModal}
                className="px-3.5 py-1.5 bg-brand-wash hover:bg-brand-wash/80 text-brand-deep text-meta font-bold rounded-edge border border-brand-edge shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Push products & quantities to CRM Command Centre Deal"
              >
                <KanbanSquare className="w-3.5 h-3.5 text-brand" />
                <span>Save to CRM Deal</span>
              </button>
            </div>
          </div>

          {/* Interactive Product & Quantity Table */}
          <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-meta text-body">Itemized Products &amp; Quantities</h3>
                <span className="text-spec font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep">
                  {takeoffResult?.billOfMaterials.length || 0} Line Items
                </span>
              </div>
              <button
                onClick={handleAddItem}
                className="text-spec font-bold text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-meta">
                <thead>
                  <tr className="border-b border-line text-spec font-bold text-ink-dim uppercase">
                    <th className="text-left py-2 pr-2">Item / Category</th>
                    <th className="text-left py-2 px-2">Plasgain Item Code</th>
                    <th className="text-left py-2 px-2">Drawing &amp; Page Ref</th>
                    <th className="text-center py-2 px-2">Extraction Confidence</th>
                    <th className="text-center py-2 px-2 w-28">Quantity</th>
                    <th className="text-left py-2 px-2">Notes / Standards</th>
                    <th className="py-2 pl-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {takeoffResult?.billOfMaterials.map((item) => (
                    <tr key={item.id} className="hover:bg-raised/50 group transition-colors">
                      
                      {/* Description & Category */}
                      <td className="py-2.5 pr-2">
                        <div className="font-bold text-body text-meta">{item.itemDescription}</div>
                        <span className="text-spec text-ink-dim px-1.5 py-0.5 bg-paper rounded border border-line">
                          {item.category}
                        </span>
                      </td>

                      {/* Explicit Item Code */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.recommendedProductCode}
                          onChange={(e) => handleUpdateItem(item.id, "recommendedProductCode", e.target.value)}
                          placeholder="e.g. PB-75W-3K"
                          className="font-mono text-spec font-bold text-brand-deep bg-brand-wash border border-brand-edge px-2 py-1 rounded w-36 focus:ring-1 focus:ring-brand"
                        />
                      </td>

                      {/* Drawing Ref */}
                      <td className="py-2.5 px-2 text-spec text-ink-dim">
                        <div className="font-semibold text-ink">{item.drawingReference}</div>
                        <span className="text-[10px] text-ink-faint">Sheet: {takeoffResult?.drawingMetadata.drawingNumber || "E-02"}</span>
                      </td>

                      {/* Confidence Tag (P2) */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-block ${
                          item.confidence === "High"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : item.confidence === "Medium"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}>
                          {item.confidence || "High"}
                        </span>
                      </td>

                      {/* Quantity & Unit Input */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, "quantity", Number(e.target.value) || 1)}
                            className="w-16 p-1 text-center font-bold bg-paper rounded border border-line focus:ring-1 focus:ring-brand text-meta"
                          />
                          <span className="text-spec font-bold text-ink-dim">{item.unit || "ea"}</span>
                        </div>
                      </td>

                      {/* Notes / Specs */}
                      <td className="py-2.5 px-2 text-spec text-ink-dim">
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => handleUpdateItem(item.id, "notes", e.target.value)}
                          placeholder="Line notes for Ostendo / spec sheet"
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
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-line flex justify-between items-center text-spec text-ink-dim">
              <span>* Line items above will be exported to Ostendo ERP where unit pricing, customer tiers, and GST are calculated.</span>
            </div>
          </div>

          {/* Engineering & Site Shading Warnings */}
          {takeoffResult?.engineeringAndSiteNotes && takeoffResult.engineeringAndSiteNotes.length > 0 && (
            <div className="bg-white p-4 rounded-panel border border-line shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-meta font-bold text-body border-b border-line pb-2">
                <AlertTriangle className="w-4 h-4 text-brand-deep" />
                <span>AI Engineering &amp; Environmental Intelligence</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {takeoffResult.engineeringAndSiteNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-edge border text-meta space-y-1 ${
                      note.type === "warning"
                        ? "bg-urgent-wash border-urgent/20 text-urgent"
                        : note.type === "compliance"
                        ? "bg-brand-wash border-brand-edge text-brand-deep"
                        : "bg-paper border-line text-ink"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {note.type === "warning" && <AlertTriangle className="w-3.5 h-3.5" />}
                      {note.type === "compliance" && <ShieldCheck className="w-3.5 h-3.5" />}
                      {note.type === "info" && <Info className="w-3.5 h-3.5" />}
                      <span>{note.title}</span>
                    </div>
                    <p className="text-spec leading-relaxed text-body">{note.description}</p>
                  </div>
                ))}
              </div>
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


      {/* Save Take-off to CRM Confirmation Modal (F-02, F-06) */}
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
                  {customerName && !accounts.some(a => a.name.toLowerCase() === customerName.toLowerCase()) && (
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
                Quantities and units ({takeoffResult?.billOfMaterials?.map(b => `${b.quantity} ${b.unit}`).join(", ")}) will be carried to Ostendo CSV export.
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
                        ? "bg-brand-deep hover:bg-brand text-white cursor-pointer"
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

      {/* P2-08: Pre-Quote Readiness Gate Modal */}
      {isReadinessModalOpen && takeoffResult && (
        <QuoteReadinessModal
          isOpen={isReadinessModalOpen}
          onClose={() => setIsReadinessModalOpen(false)}
          context={{
            quoteType: "firm",
            productFamily: takeoffResult.billOfMaterials[0]?.category || "Solar Public Lighting",
            isSolar: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("solar")),
            isMains: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("mains")),
            isPolePackage: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("pole")),
            isCivilCableCover: takeoffResult.billOfMaterials.some((b) => b.category.toLowerCase().includes("cable") || b.category.toLowerCase().includes("cover")),
            solarAutonomyDays: 5,
            windRegion: "Region B (AS/NZS 1170.2)",
            mountingHeight: 8,
            commercialPricingApproved: true,
            unitPrice: 1450
          }}
          onProceedWithQuote={() => {
            setIsReadinessModalOpen(false);
            showToast("Pre-quote readiness confirmed! Proceeding with quotation.", "success");
          }}
        />
      )}

      {/* P2-09: Commercial Pricing Request Modal */}
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

      {/* P2-13: Conservative Duplicate Account Warning Modal */}
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
