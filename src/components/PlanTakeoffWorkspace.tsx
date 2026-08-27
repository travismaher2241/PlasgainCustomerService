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
          unitPrice: 1650,
          totalPrice: 39600,
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
          unitPrice: 620,
          totalPrice: 14880,
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
          unitPrice: 18.5,
          totalPrice: 22200,
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
          unitPrice: 85,
          totalPrice: 255,
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
          description: "Pole spacing averages 48m on 6m mounting height. Requires Dialux photometric confirmation to ensure 0.5 lux minimum horizontal illuminance."
        },
        {
          type: "info",
          title: "Alluvial Soil Direct Burial Depth",
          description: "Drawing detail indicates soft riverbank soil. Direct burial depth specified at 1.2m embedment (H/5) with stabilized aggregate collar."
        }
      ],
      summary: "Deciphered 24x 6m Solar Pathway Poles, 1,200m underground civil trenching protection, and flagged canopy shading near river bend.",
      totalEstimatedValue: 76935
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
          unitPrice: 1980,
          totalPrice: 31680,
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
          unitPrice: 940,
          totalPrice: 15040,
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
          unitPrice: 24.0,
          totalPrice: 19200,
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
      summary: "Deciphered 16x 8m Intense 50W Solar Luminaires on Baseplate Steel Poles with 800m Polymeric Cable Protection.",
      totalEstimatedValue: 65920
    }
  }
];

export const PlanTakeoffWorkspace: React.FC = () => {
  const {
    showToast,
    addCrmOpportunity,
    navigateToCRM,
    currentUser,
    crmOpportunities
  } = useApp();

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: string;
    dataUrl?: string;
  } | null>(null);

  const [drawingNotes, setDrawingNotes] = useState("");
  const [projectName, setProjectName] = useState("Ballarat 1.2km Shared Path Upgrade");
  const [customerName, setCustomerName] = useState("Ballarat City Council");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<{ detail: string; guidance?: string } | null>(null);

  // Take-off Result State
  const [takeoffResult, setTakeoffResult] = useState<DrawingTakeoffResult | null>(SAMPLE_PLANS[0].result);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("ballarat-shared-path");

  // Plan Canvas Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Quotation Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteNotes, setQuoteNotes] = useState("Lead time: 2–3 weeks. Standard Plasgain 5-Year System Warranty included.");

  // File Input Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
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
        showToast(`Loaded "${file.name}" for plan deciphering`, "info");
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
    showToast(`Loaded sample plan: ${sample.name}`, "success");
  };

  // Run AI Drawing Analysis
  const handleRunAnalysis = async () => {
    setIsAnalysing(true);
    setAnalysisError(null);

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
      if (err instanceof AIUnavailableError) {
        setAnalysisError({ detail: err.detail, guidance: err.guidance });
        showToast("AI Vision unavailable — using grounded blueprint template", "error");
      } else {
        setAnalysisError({ detail: toUserMessage(err) });
        showToast(toUserMessage(err), "error");
      }
    } finally {
      setIsAnalysing(false);
    }
  };

  // Edit BOM Item Quantity or Price
  const handleUpdateItem = (id: string, field: keyof BOMItem, value: any) => {
    if (!takeoffResult) return;
    const updatedBOM = takeoffResult.billOfMaterials.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          const qty = Number(field === "quantity" ? value : updated.quantity) || 0;
          const price = Number(field === "unitPrice" ? value : updated.unitPrice) || 0;
          updated.totalPrice = Math.round(qty * price);
        }
        return updated;
      }
      return item;
    });

    const newTotal = updatedBOM.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM,
      totalEstimatedValue: newTotal
    });
  };

  // Delete BOM Item
  const handleDeleteItem = (id: string) => {
    if (!takeoffResult) return;
    const updatedBOM = takeoffResult.billOfMaterials.filter((item) => item.id !== id);
    const newTotal = updatedBOM.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM,
      totalEstimatedValue: newTotal
    });
    showToast("Line item removed from Bill of Materials", "info");
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
      recommendedProductCode: "PLASGAIN-CUSTOM",
      drawingReference: "User Added Item",
      unitPrice: 1500,
      totalPrice: 1500,
      confidence: "High",
      notes: "Manually added to take-off schedule"
    };

    const updatedBOM = [...takeoffResult.billOfMaterials, newItem];
    const newTotal = updatedBOM.reduce((acc, curr) => acc + curr.totalPrice, 0);
    setTakeoffResult({
      ...takeoffResult,
      billOfMaterials: updatedBOM,
      totalEstimatedValue: newTotal
    });
    showToast("Added custom item to take-off schedule", "success");
  };

  // Save BOM Take-off to CRM Command Centre Deal
  const handleSaveToCRM = () => {
    if (!takeoffResult) return;

    const newDealId = `crm-opp-${Date.now()}`;
    const productLines = takeoffResult.billOfMaterials.map((item) => ({
      id: `prod-${item.id}`,
      productCode: item.recommendedProductCode,
      productName: item.itemDescription,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: `Drawing Ref: ${item.drawingReference} | ${item.notes || ""}`
    }));

    addCrmOpportunity({
      id: newDealId,
      name: `${projectName} (Plan Take-off)`,
      accountId: "acc-1",
      accountName: customerName || "Ballarat City Council",
      primaryContactId: "con-1",
      primaryContactName: "Rob Mitchell",
      primaryContactEmail: "rmitchell@ballarat.vic.gov.au",
      opportunityOwner: currentUser.name,
      pipelineId: "pipe-solar",
      stageId: "stage-quote",
      stageName: "Quoting / Proposal",
      dealValue: takeoffResult.totalEstimatedValue || 75000,
      probability: 60,
      weightedValue: (takeoffResult.totalEstimatedValue || 75000) * 0.6,
      forecastCategory: "Likely",
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      products: productLines,
      projectApplication: "Public Lighting & Civil Infrastructure",
      location: "Victoria",
      customerNeed: `Engineering plan take-off extracted from ${takeoffResult.drawingMetadata.drawingNumber} (${takeoffResult.drawingMetadata.sheetTitle})`,
      keyRequirements: [
        `Poles & Luminaires: ${takeoffResult.billOfMaterials.filter(b => b.category.includes("Luminaire")).reduce((a,c) => a + c.quantity, 0)} Units`,
        `Standards: ${(takeoffResult.drawingMetadata.standardsIdentified || []).join(", ") || "AS/NZS 1158"}`,
        `Take-off Date: ${new Date().toLocaleDateString("en-AU")}`
      ],
      source: "AI Plan Deciphering / Take-off",
      latestActivity: `Plan Take-off generated with ${takeoffResult.billOfMaterials.length} line items`,
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Issue formal quotation and Dialux photometric verification report",
      nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["Detailed itemized bill of materials verified against engineering plan"],
      notes: `Drawing Metadata: ${takeoffResult.drawingMetadata.drawingNumber} (${takeoffResult.drawingMetadata.sheetTitle}). Total BOM Value: $${takeoffResult.totalEstimatedValue.toLocaleString("en-AU")}`
    });

    showToast("Saved BOM Take-off directly to CRM Deals Pipeline!", "success");
    navigateToCRM("pipeline", newDealId);
  };

  // Export BOQ as clean CSV
  const handleExportCSV = () => {
    if (!takeoffResult) return;

    const headers = [
      "Item #",
      "Category",
      "Product Code",
      "Item Description",
      "Drawing Reference",
      "Quantity",
      "Unit",
      "Unit Price (AUD)",
      "Total Price (AUD)",
      "Confidence",
      "Notes"
    ];

    const rows = takeoffResult.billOfMaterials.map((item, idx) => [
      `"${idx + 1}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.recommendedProductCode.replace(/"/g, '""')}"`,
      `"${item.itemDescription.replace(/"/g, '""')}"`,
      `"${item.drawingReference.replace(/"/g, '""')}"`,
      item.quantity,
      `"${item.unit}"`,
      item.unitPrice,
      item.totalPrice,
      `"${item.confidence}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Plasgain_BOQ_Takeoff_${projectName.replace(/\s+/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Downloaded Bill of Quantities (CSV)!", "success");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & File Dropzone */}
      <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-body">AI Drawing &amp; Plan Deciphering (BOM Take-off)</h2>
              <span className="text-spec font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                Gemini Multimodal Vision
              </span>
            </div>
            <p className="text-meta text-ink-dim mt-0.5">
              Upload electrical layouts, civil drawings, or site plans (PDF, PNG, JPG, TIFF) to automatically extract lighting schedules, pole tables, and civil trenching runs.
            </p>
          </div>

          {/* Sample Plans Selector */}
          <div className="flex items-center gap-2">
            <span className="text-spec font-bold text-ink-dim uppercase">Quick Sample:</span>
            {SAMPLE_PLANS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`px-2.5 py-1.5 rounded-edge text-meta font-medium border transition-colors cursor-pointer ${
                  selectedPlanId === sample.id
                    ? "bg-brand-wash text-brand-deep border-brand font-bold shadow-xs"
                    : "bg-paper text-ink-dim border-line hover:bg-raised"
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

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={drawingNotes}
                onChange={(e) => setDrawingNotes(e.target.value)}
                placeholder="Additional notes for AI (e.g. 'Extract all 3000K fittings and polymeric cable covers')..."
                className="flex-1 p-2 bg-paper text-meta rounded-edge border border-line"
              />
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalysing}
                className="px-4 py-2 bg-brand-deep hover:bg-brand text-white font-bold text-meta rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
              >
                {isAnalysing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deciphering...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-brand-lift" />
                    <span>Decipher Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {analysisError && (
          <AIUnavailableNotice
            detail={analysisError.detail}
            guidance={analysisError.guidance}
            onRetry={handleRunAnalysis}
          />
        )}
      </div>

      {/* Main Split Screen: Plan Preview Canvas (Left) & BOM Take-off Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Plan Canvas / CAD Viewer */}
        <div className="lg:col-span-5 bg-chrome rounded-panel border border-chrome-line p-4 flex flex-col min-h-[520px] shadow-md text-white">
          
          {/* Canvas Controls Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-meta">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-lift" />
              <span className="font-bold truncate max-w-[200px]">
                {takeoffResult?.drawingMetadata.drawingNumber || "Sheet E-02"}
              </span>
              <span className="text-spec bg-white/10 px-2 py-0.5 rounded text-ink-faint">
                {takeoffResult?.drawingMetadata.scale || "1:500"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 2.5))}
                className="p-1.5 rounded hover:bg-white/10 text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(Math.max(zoomLevel - 0.25, 0.5))}
                className="p-1.5 rounded hover:bg-white/10 text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((rotation + 90) % 360)}
                className="p-1.5 rounded hover:bg-white/10 text-white cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setZoomLevel(1.0); setRotation(0); }}
                className="p-1.5 rounded hover:bg-white/10 text-white cursor-pointer text-spec font-bold"
                title="Reset View"
              >
                1:1
              </button>
            </div>
          </div>

          {/* Interactive Plan Viewer Area */}
          <div className="flex-1 relative overflow-hidden bg-chrome-deep rounded-edge my-3 flex items-center justify-center p-4 border border-white/5">
            <div
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: "transform 0.15s ease-out"
              }}
              className="w-full h-full min-h-[360px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-edge p-5 flex flex-col justify-between border border-cyan-500/20 shadow-inner relative select-none"
            >
              {/* CAD Grid Simulation Background */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              {/* Top Title Block in CAD canvas */}
              <div className="relative z-10 flex justify-between items-start text-spec text-cyan-300 font-mono">
                <div>
                  <div className="font-bold tracking-wider text-white">
                    {takeoffResult?.drawingMetadata.sheetTitle || "CIVIL & LIGHTING LAYOUT"}
                  </div>
                  <div className="text-cyan-400/80">
                    DWG NO: {takeoffResult?.drawingMetadata.drawingNumber} | REV: {takeoffResult?.drawingMetadata.revision || "B"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                    CAD LAYER: LIGHTING_POLES &amp; CIVIL_TRENCH
                  </span>
                </div>
              </div>

              {/* Visualized CAD vector layout */}
              <div className="relative z-10 my-auto py-6 space-y-4">
                
                {/* Visual Pathway Alignment */}
                <div className="relative h-12 bg-slate-800/80 border-y border-dashed border-cyan-400/40 rounded flex items-center px-4 justify-between">
                  <span className="text-[10px] font-mono text-cyan-300/60 tracking-widest uppercase">
                    1.2km Shared Path Alignment (Ch 0.00m &rarr; Ch 1200m)
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <div key={p} className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-white shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        <span className="text-[8px] font-mono text-emerald-300 mt-0.5">P{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submains Cable Trench Run Indicator */}
                <div className="h-4 bg-amber-950/40 border border-amber-500/30 rounded flex items-center px-3 justify-between text-[9px] font-mono text-amber-300">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    Trench T-01: 1,200m Polymeric Cable Cover Slabs (AS 4702)
                  </span>
                  <span>Depth: 750mm</span>
                </div>
              </div>

              {/* Bottom Metadata Bar */}
              <div className="relative z-10 flex justify-between items-end text-spec text-cyan-300 font-mono pt-2 border-t border-white/10">
                <div className="text-[10px] text-ink-faint">
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
            <span className="text-spec font-bold text-ink-faint uppercase tracking-wider block mb-1.5">
              Deciphered Drawing Legend &amp; Symbols:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-spec">
              {takeoffResult?.legendAndSchedules.map((leg, idx) => (
                <div key={idx} className="p-2 rounded bg-white/5 border border-white/10 flex items-start gap-2">
                  <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded shrink-0">
                    {leg.symbol}
                  </span>
                  <span className="text-ink-faint text-meta truncate">{leg.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Editable Bill of Materials (BOM) & Actions */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Action Ribbon & Financial Summary */}
          <div className="bg-white p-4 rounded-panel border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                Total Bill of Materials Value (Ex GST)
              </span>
              <div className="text-2xl font-black text-brand-deep mt-0.5">
                $${(takeoffResult?.totalEstimatedValue || 0).toLocaleString("en-AU")}
                <span className="text-meta font-normal text-ink-dim ml-2">AUD</span>
              </div>
            </div>

            {/* Actions: Save to CRM, Export CSV, Draft Quote */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-paper hover:bg-raised text-meta font-bold rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Download Bill of Quantities spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-ink-dim" />
                <span>Export BOQ (CSV)</span>
              </button>

              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-3 py-1.5 bg-soon-wash hover:bg-soon text-soon text-meta font-bold rounded-edge border border-soon/30 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Draft Customer Quotation Document"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Draft Quote</span>
              </button>

              <button
                onClick={handleSaveToCRM}
                className="px-3.5 py-1.5 bg-brand-deep hover:bg-brand text-white text-meta font-bold rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Push itemized BOM to CRM Command Centre Deal"
              >
                <KanbanSquare className="w-3.5 h-3.5 text-brand-lift" />
                <span>Save to CRM Deal</span>
              </button>
            </div>
          </div>

          {/* Interactive BOM Table */}
          <div className="bg-white p-5 rounded-panel border border-line shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-meta text-body">Itemized Bill of Materials Take-off</h3>
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
                    <th className="text-left py-2 px-2">Plasgain Product Match</th>
                    <th className="text-left py-2 px-2">Drawing Ref</th>
                    <th className="text-center py-2 px-2 w-20">Qty</th>
                    <th className="text-right py-2 px-2 w-24">Unit ($)</th>
                    <th className="text-right py-2 pl-2 w-24">Total ($)</th>
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

                      {/* Code */}
                      <td className="py-2.5 px-2">
                        <span className="font-mono text-spec font-bold text-brand-deep bg-brand-wash px-2 py-0.5 rounded">
                          {item.recommendedProductCode}
                        </span>
                      </td>

                      {/* Drawing Ref */}
                      <td className="py-2.5 px-2 text-spec text-ink-dim">
                        {item.drawingReference}
                      </td>

                      {/* Quantity Input */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)}
                          className="w-16 p-1 text-center font-bold bg-paper rounded border border-line focus:ring-1 focus:ring-brand text-meta"
                        />
                        <span className="text-spec text-ink-faint block">{item.unit}</span>
                      </td>

                      {/* Unit Price Input */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                          className="w-20 p-1 text-right font-medium bg-paper rounded border border-line focus:ring-1 focus:ring-brand text-meta"
                        />
                      </td>

                      {/* Total Price */}
                      <td className="py-2.5 pl-2 text-right font-bold text-body">
                        $${(item.totalPrice || 0).toLocaleString("en-AU")}
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

            {/* Total Row */}
            <div className="pt-3 border-t border-line flex justify-between items-center text-meta font-bold">
              <span className="text-ink-dim">Estimated Materials Total (Ex GST):</span>
              <span className="text-lg text-brand-deep">
                $${(takeoffResult?.totalEstimatedValue || 0).toLocaleString("en-AU")} AUD
              </span>
            </div>
          </div>

          {/* Engineering & Site Shading Warnings */}
          {takeoffResult?.engineeringAndSiteNotes && takeoffResult.engineeringAndSiteNotes.length > 0 && (
            <div className="bg-white p-4 rounded-panel border border-line shadow-2xs space-y-2.5">
              <span className="text-spec font-bold text-ink-dim uppercase tracking-wider block">
                Engineering Observations &amp; Site Compliance Notes
              </span>
              <div className="space-y-2">
                {takeoffResult.engineeringAndSiteNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-edge border flex items-start gap-2.5 text-meta ${
                      note.type === "warning"
                        ? "bg-urgent-wash border-urgent text-urgent"
                        : note.type === "compliance"
                        ? "bg-brand-wash border-brand-edge text-brand-deep"
                        : "bg-paper border-line text-body"
                    }`}
                  >
                    {note.type === "warning" ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-urgent" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-deep" />
                    )}
                    <div>
                      <div className="font-bold">{note.title}</div>
                      <p className="text-spec leading-relaxed mt-0.5 opacity-90">{note.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Customer Quotation Generator Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-chrome/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 bg-raised border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-deep" />
                <h3 className="font-bold text-lg text-body">Draft Customer Quotation Document</h3>
              </div>
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Formatted Quote Preview */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-spec bg-paper border-y border-line">
              <div className="bg-white p-5 rounded-edge border border-line space-y-3">
                <div className="border-b border-line pb-2 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-meta text-body">PLASGAIN LIGHTING &amp; CIVIL SYSTEMS</h4>
                    <p className="text-spec text-ink-dim">Formal Quotation Schedule • Reference: {takeoffResult?.drawingMetadata.drawingNumber || "Q-2025"}</p>
                  </div>
                  <div className="text-right text-spec text-ink-faint">
                    Date: {new Date().toLocaleDateString("en-AU")}
                  </div>
                </div>

                <div>
                  <strong>Attention:</strong> {customerName}<br />
                  <strong>Project:</strong> {projectName}<br />
                  <strong>Drawing Source:</strong> {takeoffResult?.drawingMetadata.sheetTitle} ({takeoffResult?.drawingMetadata.drawingNumber})
                </div>

                {/* Table of BOM items */}
                <table className="w-full border-collapse border border-line text-spec">
                  <thead>
                    <tr className="bg-raised text-ink-dim font-bold">
                      <th className="border border-line p-1.5 text-left">Item</th>
                      <th className="border border-line p-1.5 text-left">Product Code</th>
                      <th className="border border-line p-1.5 text-left">Description</th>
                      <th className="border border-line p-1.5 text-center">Qty</th>
                      <th className="border border-line p-1.5 text-right">Unit ($)</th>
                      <th className="border border-line p-1.5 text-right">Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {takeoffResult?.billOfMaterials.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-line p-1.5">{i + 1}</td>
                        <td className="border border-line p-1.5 font-bold">{item.recommendedProductCode}</td>
                        <td className="border border-line p-1.5">{item.itemDescription}</td>
                        <td className="border border-line p-1.5 text-center">{item.quantity} {item.unit}</td>
                        <td className="border border-line p-1.5 text-right">$${item.unitPrice.toLocaleString("en-AU")}</td>
                        <td className="border border-line p-1.5 text-right font-bold">$${item.totalPrice.toLocaleString("en-AU")}</td>
                      </tr>
                    ))}
                    <tr className="bg-raised font-bold">
                      <td colSpan={5} className="border border-line p-1.5 text-right">SUBTOTAL (EX GST):</td>
                      <td className="border border-line p-1.5 text-right text-brand-deep">$${takeoffResult?.totalEstimatedValue.toLocaleString("en-AU")} AUD</td>
                    </tr>
                  </tbody>
                </table>

                {/* Terms and compliance notes */}
                <div className="pt-2 text-spec text-ink-dim space-y-1">
                  <strong>Engineering &amp; Compliance Notes:</strong><br />
                  • Luminaires compliant with AS/NZS 1158 Category P / V photometric standards.<br />
                  • Cable covers manufactured to AS 4702 Category 1 impact protection.<br />
                  • ${quoteNotes}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-raised flex items-center justify-between">
              <button
                onClick={() => {
                  const text = `PLASGAIN FORMAL QUOTATION\nProject: ${projectName}\nCustomer: ${customerName}\nDrawing Ref: ${takeoffResult?.drawingMetadata.drawingNumber}\n\n${takeoffResult?.billOfMaterials.map((b, i) => `${i+1}. ${b.recommendedProductCode} - ${b.itemDescription} | Qty: ${b.quantity} ${b.unit} | Unit: $\$${b.unitPrice} | Total: $\$${b.totalPrice}`).join("\n")}\n\nTotal (Ex GST): $\$${takeoffResult?.totalEstimatedValue} AUD\nWarranty: 5-Year Plasgain System Warranty\nLead Time: 2-3 Weeks`;
                  navigator.clipboard.writeText(text);
                  showToast("Copied formal quote text to clipboard!", "success");
                }}
                className="px-4 py-2 bg-white hover:bg-raised text-meta font-bold rounded-edge border border-line flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-ink-dim" />
                <span>Copy Quote Text</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2 bg-line hover:bg-line-strong text-meta font-medium rounded-edge cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsQuoteModalOpen(false);
                    handleSaveToCRM();
                  }}
                  className="px-4 py-2 bg-brand-deep hover:bg-brand text-white text-meta font-bold rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to CRM &amp; Send</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
