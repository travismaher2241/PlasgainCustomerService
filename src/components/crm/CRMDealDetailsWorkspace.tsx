import React, { useState, useMemo } from "react";
import {
  Kanban,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Mail,
  FileSpreadsheet,
  Download,
  Copy,
  Trash2,
  Sliders,
  Tag,
  Check,
  Package,
  RefreshCw,
  Phone,
  Zap,
  ClipboardCheck,
  X,
  ShieldCheck,
  AlertCircle,
  Edit3,
  ExternalLink,
  Plus,
  Archive,
  MoreHorizontal,
  MessageSquare
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, DealHealthRating, OpportunityProductLine, CRMActivity } from "../../types/crm";
import { CustomerFollowUpModal } from "../CustomerFollowUpModal";
import {
  formatOstendoCSV,
  validateOstendoItems,
  downloadOstendoCSV,
  copyOstendoProductList
} from "../../utils/ostendoExporter";
import { sortActivitiesChronological } from "../../utils/activityUtils";

export type DealDetailsTab = "overview" | "products" | "quote" | "activity";

interface CRMDealDetailsWorkspaceProps {
  deal: CRMOpportunity;
  onClose?: () => void;
  initialTab?: DealDetailsTab;
}

export const CRMDealDetailsWorkspace: React.FC<CRMDealDetailsWorkspaceProps> = ({
  deal,
  onClose,
  initialTab = "overview"
}) => {
  const {
    updateCrmOpportunity,
    deleteCrmOpportunity,
    pipelines,
    accounts,
    activities,
    tasks,
    openQuickLog,
    openCallPrep,
    openEmailComposer,
    navigateToCRM,
    logActivity,
    addTask,
    currentUser,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<DealDetailsTab>(initialTab);

  // Dropdown menus
  const [isCommMenuOpen, setIsCommMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Modals
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Products & Pricing local state
  const [targetMarginSlider, setTargetMarginSlider] = useState<number>(
    deal.grossMarginPercent || 36
  );
  const [isAddingBomLine, setIsAddingBomLine] = useState(false);
  const [newBomLine, setNewBomLine] = useState<{
    catalogId: string;
    productCode: string;
    productName: string;
    category: string;
    quantity: number;
    unit: string;
    costPrice: number;
    unitPrice: number;
  }>({
    catalogId: "",
    productCode: "",
    productName: "",
    category: "Solar Luminaire",
    quantity: 1,
    unit: "ea",
    costPrice: 0,
    unitPrice: 0
  });

  // Quote editing mode state
  const [isEditingQuoteDetails, setIsEditingQuoteDetails] = useState(false);
  const [quoteFormData, setQuoteFormData] = useState({
    ostendoQuoteRef: deal.ostendoQuoteRef || deal.quoteNumber || "",
    quoteRevision: deal.quoteRevision || "Rev A",
    quoteStatus: (deal.quoteStatus || "Draft") as NonNullable<CRMOpportunity["quoteStatus"]>,
    quoteExpiryDate:
      deal.quoteExpiryDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: deal.notes || "",
    customerNeed: deal.customerNeed || ""
  });

  // Activity filter & expanded state
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());

  // Close menus on outside click
  React.useEffect(() => {
    const handleDocumentClick = () => {
      setIsCommMenuOpen(false);
      setIsExportMenuOpen(false);
      setIsMoreMenuOpen(false);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Matched Account and Pipeline
  const matchedAccount = useMemo(() => {
    return accounts.find((a) => a.id === deal.accountId);
  }, [accounts, deal.accountId]);

  const currentPipeline = useMemo(() => {
    return pipelines.find((p) => p.id === deal.pipelineId) || pipelines[0];
  }, [pipelines, deal.pipelineId]);

  // Deal specific activities and tasks
  const dealActivities = useMemo(() => {
    const directActs = activities.filter(
      (a) => a.opportunityId === deal.id || (a.accountId === deal.accountId && a.opportunityName === deal.name)
    );
    return sortActivitiesChronological(directActs);
  }, [activities, deal.id, deal.accountId, deal.name]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return dealActivities;
    return dealActivities.filter((a) => a.type === activityFilter);
  }, [dealActivities, activityFilter]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { [dateLabel: string]: CRMActivity[] } = {};
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    filteredActivities.forEach((act) => {
      const actDate = act.timestamp ? act.timestamp.split("T")[0] : todayStr;
      let label = actDate;
      if (actDate === todayStr) {
        label = "Today";
      } else if (actDate === yesterdayStr) {
        label = "Yesterday";
      } else {
        try {
          const d = new Date(actDate);
          label = d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
        } catch {
          label = actDate;
        }
      }
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(act);
    });

    return groups;
  }, [filteredActivities]);

  // Quote Readiness / Blockers Calculation
  const quoteReadiness = useMemo(() => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const confirmed: string[] = [];

    // 1. Line items & pricing check
    const products = deal.products || [];
    if (products.length === 0) {
      blockers.push("No products or bill of materials added to deal");
    } else {
      const missingPrice = products.filter((p) => !p.unitPrice || p.unitPrice <= 0);
      if (missingPrice.length > 0) {
        blockers.push(`${missingPrice.length} product line(s) missing unit sell price`);
      } else {
        confirmed.push(`All ${products.length} line item prices populated`);
      }

      const missingCode = products.filter((p) => !p.productCode || p.productCode.trim() === "");
      if (missingCode.length > 0) {
        warnings.push(`${missingCode.length} product(s) missing exact SKU code`);
      }
    }

    // 2. Customer & Contact check
    if (!deal.accountId) {
      blockers.push("Deal not linked to a customer account");
    } else {
      confirmed.push(`Linked to account: ${deal.accountName}`);
    }

    if (!deal.primaryContactName) {
      warnings.push("No primary contact name recorded");
    }

    // 3. Expiry check
    if (deal.quoteExpiryDate && new Date(deal.quoteExpiryDate).getTime() < Date.now()) {
      warnings.push("Quotation expiry date has passed");
    }

    const isReady = blockers.length === 0;

    return { isReady, blockers, warnings, confirmed };
  }, [deal]);

  // Health Badge
  const getHealthBadge = (health?: DealHealthRating) => {
    switch (health) {
      case "Healthy":
        return (
          <span className="text-spec font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Healthy
          </span>
        );
      case "Needs Attention":
        return (
          <span className="text-spec font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Needs Attention
          </span>
        );
      case "At Risk":
      case "Stalled":
        return (
          <span className="text-spec font-bold px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {health}
          </span>
        );
      default:
        return (
          <span className="text-spec font-bold px-2 py-0.5 rounded bg-paper text-ink-dim border border-line">
            Active
          </span>
        );
    }
  };

  // Stage change handler
  const handleStageChange = (newStageId: string) => {
    const stageObj = currentPipeline.stages.find((s) => s.id === newStageId);
    if (!stageObj) return;

    const isWon = newStageId === "stage-won" || stageObj.name.toLowerCase().includes("won");
    const isLost = newStageId === "stage-lost" || stageObj.name.toLowerCase().includes("lost");

    updateCrmOpportunity(deal.id, {
      stageId: stageObj.id,
      stageName: stageObj.name,
      probability: stageObj.probability,
      weightedValue: (deal.dealValue || 0) * (stageObj.probability / 100),
      quoteStatus: isWon ? "PO Received" : isLost ? "Declined" : deal.quoteStatus,
      latestActivity: `Stage updated to ${stageObj.name}`,
      latestActivityDate: new Date().toISOString().split("T")[0]
    });
    showToast(`Moved deal to ${stageObj.name} (${stageObj.probability}%)`, "success");
  };

  // Save quote details edit form
  const handleSaveQuoteDetails = () => {
    updateCrmOpportunity(deal.id, {
      ostendoQuoteRef: quoteFormData.ostendoQuoteRef,
      quoteNumber: quoteFormData.ostendoQuoteRef,
      quoteRevision: quoteFormData.quoteRevision,
      quoteStatus: quoteFormData.quoteStatus as any,
      quoteExpiryDate: quoteFormData.quoteExpiryDate,
      notes: quoteFormData.notes,
      customerNeed: quoteFormData.customerNeed,
      latestActivity: `Updated quote details (${quoteFormData.ostendoQuoteRef || "Draft"})`,
      latestActivityDate: new Date().toISOString().split("T")[0]
    });
    setIsEditingQuoteDetails(false);
    showToast("Quote details updated", "success");
  };

  // Create new Quote Revision
  const handleCreateRevision = () => {
    const currentRev = deal.quoteRevision || "Rev A";
    const nextRev =
      currentRev === "Rev A" ? "Rev B" : currentRev === "Rev B" ? "Rev C" : "Rev D";
    const baseRef = (deal.ostendoQuoteRef || "Q-88200").replace(/-Rev[A-D]/, "");
    const newQuoteRef = `${baseRef}-${nextRev}`;

    updateCrmOpportunity(deal.id, {
      quoteRevision: nextRev,
      ostendoQuoteRef: newQuoteRef,
      quoteStatus: "Revising",
      latestActivity: `Created quote revision ${nextRev} (${newQuoteRef})`,
      latestActivityDate: new Date().toISOString().split("T")[0]
    });
    setQuoteFormData((prev) => ({
      ...prev,
      quoteRevision: nextRev,
      ostendoQuoteRef: newQuoteRef,
      quoteStatus: "Revising"
    }));
    showToast(`Created Revision ${nextRev} (${newQuoteRef})`, "success");
  };

  // Mark Won with PO Received
  const handleMarkWon = () => {
    const wonStage = currentPipeline.stages[currentPipeline.stages.length - 1] || {
      id: "stage-won",
      name: "Closed Won",
      probability: 100
    };

    updateCrmOpportunity(deal.id, {
      quoteStatus: "PO Received",
      stageId: wonStage.id,
      stageName: wonStage.name,
      probability: 100,
      weightedValue: deal.dealValue,
      latestActivity: "Purchase Order received! Deal marked Closed Won.",
      latestActivityDate: new Date().toISOString().split("T")[0],
      wonReason: "Accepted technical specification and competitive commercial offer."
    });
    showToast("🏆 Purchase Order Received! Deal marked Closed Won!", "success");
  };

  // Export full deal CSV
  const handleExportDealCSV = () => {
    const headers = [
      "Deal ID",
      "Deal Name",
      "Account Name",
      "Stage",
      "Deal Value (ex GST)",
      "Target Gross Margin %",
      "Expected Decision Date",
      "Quote Ref",
      "Quote Status",
      "Next Action",
      "Next Action Due"
    ];

    const row = [
      `"${deal.id}"`,
      `"${deal.name.replace(/"/g, '""')}"`,
      `"${deal.accountName.replace(/"/g, '""')}"`,
      `"${deal.stageName}"`,
      deal.dealValue,
      deal.grossMarginPercent !== undefined ? deal.grossMarginPercent : "",
      `"${deal.expectedCloseDate}"`,
      `"${deal.ostendoQuoteRef || deal.quoteNumber || ""}"`,
      `"${deal.quoteStatus || "Draft"}"`,
      `"${(deal.nextAction || "").replace(/"/g, '""')}"`,
      `"${deal.nextActionDate || ""}"`
    ];

    const csvContent = "\uFEFF" + [headers.join(","), row.join(",")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Deal_Summary_${deal.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Downloaded Deal Summary CSV", "success");
  };

  // Toggle activity notes expansion
  const toggleActivityExpand = (id: string) => {
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-panel border border-line shadow-sm space-y-4">
      {/* 1. COMPACT PERSISTENT DEAL SUMMARY HEADER */}
      <div className="p-4 sm:p-5 border-b border-line bg-surface/50 rounded-t-panel space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Deal Identity & Core Meta */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-spec">
              <button
                type="button"
                onClick={() => navigateToCRM("accounts", deal.accountId)}
                className="font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                title="View customer account in CRM"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{deal.accountName}</span>
              </button>
              <span className="text-ink-faint">•</span>
              {getHealthBadge(deal.dealHealth)}
              <span className="text-ink-faint">•</span>
              <span className="text-ink-dim">Owner: {deal.opportunityOwner}</span>
            </div>

            {/* Deal Name - Strongest Text Element */}
            <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight truncate" title={deal.name}>
              {deal.name}
            </h1>

            {/* Application & Location Subtitle */}
            <p className="text-spec text-ink-dim truncate">
              {deal.projectApplication || "Project Application"} · {deal.location || "Australia"}
            </p>
          </div>

          {/* Persistent Key Numbers: Stage & Value */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Stage Selector */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-ink-faint tracking-wider">Stage</span>
              <select
                aria-label="Change deal stage"
                value={deal.stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="text-meta font-bold bg-white border border-line rounded-edge px-2.5 py-1 text-body focus:ring-1 focus:ring-brand cursor-pointer shadow-2xs"
              >
                {currentPipeline.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.probability}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Deal Value */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-ink-faint tracking-wider">Current Value</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-brand-deep font-mono">
                  ${deal.dealValue.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-ink-dim uppercase">ex GST</span>
                {deal.dealValueBasis && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-paper text-ink-dim border border-line">
                    {deal.dealValueBasis}
                  </span>
                )}
              </div>
            </div>

            {/* Close / Return Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-xs font-bold text-ink-dim hover:text-ink hover:bg-hover rounded-edge border border-line cursor-pointer flex items-center gap-1.5 ml-1"
                title="Close deal details"
                aria-label="Back to deals"
              >
                <span>← Back to deals</span>
              </button>
            )}
          </div>
        </div>

        {/* Next Action Strip & Action Buttons Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-line/70">
          
          {/* Next Action Highlight */}
          <div className="flex items-center gap-2 text-meta min-w-0">
            <span className="text-spec font-bold text-brand-deep uppercase tracking-wider shrink-0">
              Next Action:
            </span>
            {deal.nextAction ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-body truncate">{deal.nextAction}</span>
                {deal.nextActionDate && (
                  <span className="text-spec font-bold text-ink-dim bg-paper px-2 py-0.5 rounded border border-line shrink-0">
                    Due {deal.nextActionDate}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-spec text-ink-dim italic">
                No immediate action scheduled
              </span>
            )}
          </div>

          {/* Streamlined Action Hierarchy */}
          <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            
            {/* 1. Frequent Primary Action: Log Activity */}
            <button
              type="button"
              onClick={() => openQuickLog({ type: "call", accountId: deal.accountId, opportunityId: deal.id })}
              className="px-3.5 py-1.5 text-meta font-bold bg-brand hover:bg-brand-deep text-white rounded-edge shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Log activity</span>
            </button>

            {/* 2. Frequent Secondary Action: Follow Up */}
            <button
              type="button"
              onClick={() => setIsFollowUpModalOpen(true)}
              className="px-3 py-1.5 text-meta font-semibold bg-white hover:bg-raised text-body border border-line rounded-edge shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-ink-dim" />
              <span>Follow up</span>
            </button>

            {/* 3. Grouped Communication Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCommMenuOpen((prev) => !prev);
                  setIsExportMenuOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="px-2.5 py-1.5 text-meta font-semibold bg-white hover:bg-raised text-body border border-line rounded-edge shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Communicate</span>
                <ChevronDown className="w-3 h-3 text-ink-faint" />
              </button>

              {isCommMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-panel shadow-lg border border-line py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      openEmailComposer({
                        defaultMode: "project-enquiry",
                        opportunityId: deal.id,
                        accountId: deal.accountId,
                        companyName: deal.accountName,
                        contactId: deal.primaryContactId,
                        contactName: deal.primaryContactName,
                        contactEmail: deal.primaryContactEmail,
                        projectName: deal.name,
                        projectLocation: deal.location,
                        projectNotes: `${deal.customerNeed || ""} | ${deal.notes || ""}`,
                        productsQuoted: (deal.products || []).map((p) => ({
                          productCode: p.productCode,
                          productName: p.productName,
                          quantity: p.quantity
                        })),
                        recentActivities: [deal.latestActivity || ""].filter(Boolean),
                        desiredOutcome: "Ask about the lighting package"
                      });
                      setIsCommMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>Project Enquiry Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      openCallPrep({ accountId: deal.accountId, opportunityId: deal.id });
                      setIsCommMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body"
                  >
                    <Phone className="w-3.5 h-3.5 text-brand-deep" />
                    <span>Prep Call / Talking Points</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateToCRM("accounts", deal.accountId);
                      setIsCommMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body border-t border-line"
                  >
                    <Building2 className="w-3.5 h-3.5 text-ink-dim" />
                    <span>View Account 360°</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Consolidated Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen((prev) => !prev);
                  setIsCommMenuOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                className="px-2.5 py-1.5 text-meta font-semibold bg-white hover:bg-raised text-body border border-line rounded-edge shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-ink-dim" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-ink-faint" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-panel shadow-lg border border-line py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      const items = (deal.products || []).map((p) => ({
                        itemCode: p.productCode,
                        description: p.productName,
                        quantity: p.quantity,
                        unit: p.unit || "ea",
                        lineNotes: p.notes,
                        quoteRef: deal.ostendoQuoteRef || deal.quoteNumber
                      }));
                      const validation = validateOstendoItems(items);
                      if (!validation.valid) {
                        showToast(`Ostendo Export Blocked: ${validation.errors[0]}`, "error");
                        return;
                      }
                      const csvData = formatOstendoCSV(items, deal.ostendoQuoteRef || deal.quoteNumber);
                      downloadOstendoCSV(csvData, `Ostendo_Product_List_${deal.name.replace(/\s+/g, "_")}.csv`);
                      showToast("Ostendo CSV downloaded", "success");
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-brand-deep" />
                    <span>Download Ostendo CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const items = (deal.products || []).map((p) => ({
                        itemCode: p.productCode,
                        description: p.productName,
                        quantity: p.quantity,
                        unit: p.unit || "ea",
                        lineNotes: p.notes,
                        quoteRef: deal.ostendoQuoteRef || deal.quoteNumber
                      }));
                      const validation = validateOstendoItems(items);
                      if (!validation.valid) {
                        showToast(`Ostendo Export Blocked: ${validation.errors[0]}`, "error");
                        return;
                      }
                      await copyOstendoProductList(items, deal.ostendoQuoteRef || deal.quoteNumber);
                      showToast("Product matrix copied to clipboard (Ostendo format)", "success");
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand" />
                    <span>Copy Ostendo Matrix</span>
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      handleExportDealCSV();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body"
                  >
                    <FileText className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Export Deal Summary CSV</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. More Actions Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen((prev) => !prev);
                  setIsCommMenuOpen(false);
                  setIsExportMenuOpen(false);
                }}
                className="p-1.5 text-meta bg-white hover:bg-raised text-ink-dim hover:text-body border border-line rounded-edge shadow-2xs flex items-center cursor-pointer transition-colors"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-panel shadow-lg border border-line py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      updateCrmOpportunity(deal.id, {
                        dealHealth: deal.dealHealth === "Healthy" ? "Needs Attention" : "Healthy"
                      });
                      setIsMoreMenuOpen(false);
                      showToast("Toggled deal health status", "info");
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-raised flex items-center gap-2 text-body"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Toggle Health Flag</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-meta hover:bg-red-50 flex items-center gap-2 text-red-600 border-t border-line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Deal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOUR TAB WORKSPACE NAVIGATION */}
      <div className="px-4 sm:px-5">
        <div className="flex border-b border-line gap-4 sm:gap-6 overflow-x-auto text-meta">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-brand text-brand-deep"
                : "border-transparent text-ink-dim hover:text-body"
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "products"
                ? "border-brand text-brand-deep"
                : "border-transparent text-ink-dim hover:text-body"
            }`}
          >
            <span>Products &amp; Pricing</span>
            <span className="text-spec font-bold px-1.5 py-0.2 rounded-full bg-raised text-ink-dim">
              {(deal.products || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quote")}
            className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "quote"
                ? "border-brand text-brand-deep"
                : "border-transparent text-ink-dim hover:text-body"
            }`}
          >
            <span>Quote</span>
            {quoteReadiness.blockers.length > 0 ? (
              <span className="w-2 h-2 rounded-full bg-red-500" title="Quote has blockers" />
            ) : (
              <span className="text-spec font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700">
                {deal.quoteStatus || "Draft"}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "activity"
                ? "border-brand text-brand-deep"
                : "border-transparent text-ink-dim hover:text-body"
            }`}
          >
            <span>Activity</span>
            <span className="text-spec font-bold px-1.5 py-0.2 rounded-full bg-raised text-ink-dim">
              {dealActivities.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. TAB BODIES */}
      <div className="px-4 sm:px-5 pb-5">
        
        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            
            {/* Actionable Next Best Action Card */}
            <div className="p-4 bg-brand-wash/40 rounded-panel border border-brand-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-spec font-bold text-brand-deep uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Next Action Plan</span>
                </div>
                <div className="text-meta font-bold text-body">
                  {deal.nextAction || "No scheduled action. Create one to keep deal momentum."}
                </div>
                <div className="text-spec text-ink-dim">
                  Target Due: <span className="font-semibold text-body">{deal.nextActionDate || "Not set"}</span> • Owner: {deal.opportunityOwner}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openQuickLog({ type: "call", accountId: deal.accountId, opportunityId: deal.id })}
                  className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge shadow-xs cursor-pointer transition-colors"
                >
                  Log activity
                </button>
                <button
                  type="button"
                  onClick={() => openQuickLog({ type: "task", accountId: deal.accountId, opportunityId: deal.id })}
                  className="px-3 py-1.5 bg-white hover:bg-raised text-body border border-line font-bold text-spec rounded-edge shadow-2xs cursor-pointer transition-colors"
                >
                  Reschedule / Task
                </button>
              </div>
            </div>

            {/* Blockers & Quote Readiness Summary (If any blockers exist) */}
            {quoteReadiness.blockers.length > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-panel space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-red-900 text-meta">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Quote Blockers ({quoteReadiness.blockers.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("quote")}
                    className="text-spec font-bold text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Fix in Quote tab</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <ul className="list-disc list-inside text-spec text-red-800 space-y-0.5">
                  {quoteReadiness.blockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Commercial Summary Strip */}
            {(() => {
              const costedProducts = (deal.products || []).filter((p) => typeof p.costPrice === "number" && p.costPrice > 0);
              const hasCostedProducts = costedProducts.length > 0 || (typeof deal.totalCostValue === "number" && deal.totalCostValue > 0);
              const totalCost = typeof deal.totalCostValue === "number" && deal.totalCostValue > 0
                ? deal.totalCostValue
                : costedProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0);
              const computedMargin = hasCostedProducts && deal.dealValue > 0
                ? Math.round(((deal.dealValue - totalCost) / deal.dealValue) * 100)
                : null;
              const displayMargin = deal.grossMarginPercent !== undefined && deal.grossMarginPercent !== null
                ? deal.grossMarginPercent
                : computedMargin;

              return (
                <div className="bg-raised/70 p-4 rounded-panel border border-line space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <span className="text-spec font-bold text-ink-dim uppercase tracking-wider">
                      Commercial Snapshot
                    </span>
                    <span className="text-spec font-bold text-brand-deep">
                      {hasCostedProducts && displayMargin !== null
                        ? `${displayMargin}% Target Gross Margin`
                        : "Not costed"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-meta pt-1">
                    <div>
                      <span className="text-spec text-ink-dim block">Deal Value (ex GST)</span>
                      <span className="font-bold text-body font-mono text-base">
                        ${deal.dealValue.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-spec text-ink-dim block">Inc. 10% GST</span>
                      <span className="font-semibold text-body font-mono">
                        ${Math.round(deal.dealValue * 1.1).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-spec text-ink-dim block">Est. COGS (Cost)</span>
                      <span className="font-medium text-ink-dim font-mono">
                        {hasCostedProducts ? `$${totalCost.toLocaleString()}` : "Not costed"}
                      </span>
                    </div>

                    <div>
                      <span className="text-spec text-ink-dim block">Weighted Pipeline</span>
                      <span className="font-bold text-brand-deep font-mono">
                        {hasCostedProducts
                          ? `$${Math.round(deal.weightedValue !== undefined ? deal.weightedValue : (deal.dealValue * (deal.probability || 0)) / 100).toLocaleString()}`
                          : "Not costed"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Project & Technical Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-panel border border-line space-y-2.5">
                <h3 className="font-bold text-meta text-body border-b border-line pb-1.5">
                  Project &amp; Technical Scope
                </h3>
                <div className="space-y-1.5 text-spec">
                  <div>
                    <span className="text-ink-dim font-semibold">Application: </span>
                    <span className="text-body font-medium">{deal.projectApplication || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-ink-dim font-semibold">Location: </span>
                    <span className="text-body font-medium">{deal.location || "Not specified"}</span>
                  </div>
                  {deal.windRegion && (
                    <div>
                      <span className="text-ink-dim font-semibold">Wind Region: </span>
                      <span className="text-body font-medium">{deal.windRegion}</span>
                    </div>
                  )}
                  {deal.foundationType && (
                    <div>
                      <span className="text-ink-dim font-semibold">Foundation: </span>
                      <span className="text-body font-medium">{deal.foundationType}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-ink-dim font-semibold">Target Close Date: </span>
                    <span className="text-body font-semibold">{deal.expectedCloseDate || "TBD"}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-panel border border-line space-y-2.5">
                <h3 className="font-bold text-meta text-body border-b border-line pb-1.5">
                  Customer Requirements &amp; Notes
                </h3>
                <div className="space-y-2 text-spec">
                  <p className="text-body leading-relaxed">
                    {deal.customerNeed || deal.notes || "No detailed project notes recorded."}
                  </p>
                  {Array.isArray(deal.dealHealthReasons) && deal.dealHealthReasons.length > 0 && (
                    <div className="pt-2 border-t border-line text-[11px] text-ink-dim space-y-0.5">
                      <span className="font-bold text-body block">Deal Health Rationale:</span>
                      <ul className="list-disc list-inside">
                        {deal.dealHealthReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: PRODUCTS & PRICING ===================== */}
        {activeTab === "products" && (
          <div className="space-y-4">
            
            {/* BOM Control Bar: Margin Slider & Actions */}
            <div className="p-3.5 bg-raised rounded-panel border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-deep" />
                  <span className="text-spec font-bold text-ink-dim uppercase">Target Margin:</span>
                  <span className="text-spec font-black text-brand-deep min-w-[36px]">
                    {targetMarginSlider}%
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={1}
                    value={targetMarginSlider}
                    onChange={(e) => setTargetMarginSlider(Number(e.target.value))}
                    className="w-24 accent-brand-deep cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const marginMultiplier = 1 - targetMarginSlider / 100;
                    const updatedProducts = (deal.products || []).map((p) => {
                      const cost = p.costPrice || (p.unitPrice ? Math.round(p.unitPrice * 0.65) : 500);
                      const newUnitPrice = Math.round(cost / marginMultiplier);
                      return {
                        ...p,
                        costPrice: cost,
                        unitPrice: newUnitPrice,
                        totalPrice: newUnitPrice * p.quantity,
                        marginPercent: targetMarginSlider
                      };
                    });
                    const newTotal = updatedProducts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
                    const newTotalCost = updatedProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0);

                    updateCrmOpportunity(deal.id, {
                      products: updatedProducts,
                      dealValue: newTotal,
                      totalCostValue: newTotalCost,
                      grossMarginPercent: targetMarginSlider,
                      weightedValue: newTotal * (deal.probability / 100)
                    });
                    showToast(`Applied ${targetMarginSlider}% target gross margin across all BOM items!`, "success");
                  }}
                  className="px-2.5 py-1 bg-brand-deep hover:bg-brand text-white font-bold text-[11px] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Apply Margin to All
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBomLine(!isAddingBomLine)}
                  className="px-3 py-1.5 bg-white hover:bg-paper text-body border border-line font-bold text-spec rounded-edge shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-brand" />
                  <span>{isAddingBomLine ? "Close" : "+ Add Item"}</span>
                </button>
              </div>
            </div>

            {/* Inline Add Product Line Form */}
            {isAddingBomLine && (
              <div className="p-4 bg-brand-wash/50 rounded-panel border border-brand-edge space-y-3 animate-in fade-in duration-150 text-meta">
                <div className="font-bold text-brand-deep text-spec uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Line Item to Bill of Materials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Product SKU Code *
                    </label>
                    <input
                      type="text"
                      value={newBomLine.productCode}
                      onChange={(e) => setNewBomLine({ ...newBomLine, productCode: e.target.value })}
                      placeholder="e.g. PB-75W-3K"
                      className="w-full p-2 bg-white rounded-edge border border-line text-spec font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newBomLine.category}
                      onChange={(e) => setNewBomLine({ ...newBomLine, category: e.target.value })}
                      placeholder="e.g. Solar Luminaire"
                      className="w-full p-2 bg-white rounded-edge border border-line text-spec"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Description / Line Notes
                    </label>
                    <input
                      type="text"
                      value={newBomLine.productName}
                      onChange={(e) => setNewBomLine({ ...newBomLine, productName: e.target.value })}
                      placeholder="e.g. 75W Modular Solar Light with 3000K LED"
                      className="w-full p-2 bg-white rounded-edge border border-line text-spec"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Qty &amp; Unit
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={1}
                        value={newBomLine.quantity}
                        onChange={(e) => setNewBomLine({ ...newBomLine, quantity: Math.max(1, Number(e.target.value)) })}
                        className="w-16 p-2 bg-white rounded-edge border border-line text-spec font-bold"
                      />
                      <input
                        type="text"
                        value={newBomLine.unit}
                        onChange={(e) => setNewBomLine({ ...newBomLine, unit: e.target.value })}
                        className="w-14 p-2 bg-white rounded-edge border border-line text-spec"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Unit Cost ($ AUD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newBomLine.costPrice}
                      onChange={(e) => setNewBomLine({ ...newBomLine, costPrice: Number(e.target.value) })}
                      className="w-full p-2 bg-white rounded-edge border border-line text-spec"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-ink-dim mb-1">
                      Unit Sell (ex GST)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newBomLine.unitPrice}
                      onChange={(e) => setNewBomLine({ ...newBomLine, unitPrice: Number(e.target.value) })}
                      className="w-full p-2 bg-white rounded-edge border border-line text-spec font-bold text-brand-deep"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingBomLine(false)}
                    className="px-3 py-1.5 text-ink-dim hover:text-ink text-spec"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newBomLine.productCode.trim() || !newBomLine.productName.trim()) {
                        showToast("Please provide product SKU code and description", "warning");
                        return;
                      }
                      const lineCost = newBomLine.costPrice || 0;
                      const lineSell = newBomLine.unitPrice || 0;
                      const lineMargin = lineSell > 0 ? Math.round(((lineSell - lineCost) / lineSell) * 100) : 0;

                      const newLine: OpportunityProductLine = {
                        id: `bom-line-${Date.now()}`,
                        productCode: newBomLine.productCode,
                        productName: newBomLine.productName,
                        category: newBomLine.category,
                        quantity: newBomLine.quantity,
                        unit: newBomLine.unit || "ea",
                        costPrice: lineCost,
                        unitPrice: lineSell,
                        totalPrice: lineSell * newBomLine.quantity,
                        marginPercent: lineMargin,
                        isOstendoVerified: true
                      };

                      const updatedProducts = [...(deal.products || []), newLine];
                      const newTotal = updatedProducts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
                      const newTotalCost = updatedProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0);
                      const overallMargin = newTotal > 0 ? Math.round(((newTotal - newTotalCost) / newTotal) * 100) : 35;

                      updateCrmOpportunity(deal.id, {
                        products: updatedProducts,
                        dealValue: newTotal,
                        totalCostValue: newTotalCost,
                        grossMarginPercent: overallMargin,
                        weightedValue: newTotal * (deal.probability / 100)
                      });

                      showToast(`Added ${newLine.productName} to BOM`, "success");
                      setIsAddingBomLine(false);
                    }}
                    className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge shadow-xs cursor-pointer"
                  >
                    + Insert Line to Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Line Items Table */}
            {(deal.products || []).length === 0 ? (
              <div className="p-8 text-center bg-paper rounded-panel border border-dashed border-line text-ink-dim">
                <Package className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                <div className="font-semibold text-body">No line items in this deal BOM</div>
                <p className="text-spec mt-1">Click "+ Add Item" above to add line items to this deal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-panel border border-line">
                <table className="w-full text-left text-meta border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-line bg-paper text-spec font-bold text-ink-dim uppercase">
                      <th className="py-2.5 px-3">Item / SKU</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Unit Sell (ex GST)</th>
                      <th className="py-2.5 px-3 text-right">Margin</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(deal.products || []).map((p, idx) => {
                      const hasUnitCost = typeof p.costPrice === "number" && p.costPrice > 0;
                      const cost = hasUnitCost ? p.costPrice! : 0;
                      const sell = p.unitPrice || 0;
                      const lineMargin = (hasUnitCost && sell > 0) ? Math.round(((sell - cost) / sell) * 100) : null;
                      const lineTotal = p.totalPrice !== undefined ? p.totalPrice : sell * p.quantity;

                      return (
                        <tr key={p.id || idx} className="hover:bg-raised/60 transition-colors group">
                          {/* SKU & Verification Status */}
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-deep text-spec">
                            <div className="flex items-center gap-1.5">
                              <span>{p.productCode || "CUSTOM"}</span>
                              {p.isOstendoVerified ? (
                                <span className="text-[9px] bg-brand-wash text-brand-deep border border-brand-edge px-1.5 py-0.2 rounded font-sans font-bold" title="Ostendo Registered & Verified Product SKU">
                                  ✓ Verified
                                </span>
                              ) : sell === 0 ? (
                                <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-sans font-bold">
                                  Needs price
                                </span>
                              ) : (
                                <span className="text-[9px] bg-paper text-ink-dim border border-line px-1.5 py-0.2 rounded font-sans font-medium">
                                  Custom
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-2.5 px-3 font-medium text-body text-spec">
                            <div>{p.productName}</div>
                            {p.notes && <div className="text-[11px] text-ink-dim font-normal italic">{p.notes}</div>}
                          </td>

                          {/* Qty & Unit */}
                          <td className="py-2.5 px-3 text-right font-bold text-body text-spec">
                            {p.quantity} {p.unit || "ea"}
                          </td>

                          {/* Unit Cost */}
                          <td className="py-2.5 px-3 text-right text-ink-dim text-spec font-mono">
                            {hasUnitCost ? `$${cost.toLocaleString()}` : <span className="text-ink-faint italic">Not costed</span>}
                          </td>

                          {/* Unit Sell */}
                          <td className="py-2.5 px-3 text-right font-bold text-body text-spec font-mono">
                            ${sell.toLocaleString()}
                          </td>

                          {/* Margin */}
                          <td className="py-2.5 px-3 text-right text-spec">
                            {lineMargin !== null ? (
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                                lineMargin >= 35
                                  ? "bg-emerald-50 text-emerald-800"
                                  : lineMargin >= 20
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-red-50 text-red-800"
                              }`}>
                                {lineMargin}%
                              </span>
                            ) : (
                              <span className="text-ink-faint italic text-spec">Not costed</span>
                            )}
                          </td>

                          {/* Line Total */}
                          <td className="py-2.5 px-3 text-right font-bold text-body text-spec font-mono">
                            ${lineTotal.toLocaleString()}
                          </td>

                          {/* Delete Action */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedProducts = (deal.products || []).filter((_, i) => i !== idx);
                                const newTotal = updatedProducts.reduce((sum, item) => sum + (item.totalPrice || (item.unitPrice ? item.unitPrice * item.quantity : 0)), 0);
                                const costedItems = updatedProducts.filter((item) => typeof item.costPrice === "number" && item.costPrice > 0);
                                const hasCost = costedItems.length > 0;
                                const newTotalCost = hasCost ? costedItems.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0) : undefined;
                                const overallMargin = hasCost && newTotal > 0 && newTotalCost !== undefined ? Math.round(((newTotal - newTotalCost) / newTotal) * 100) : undefined;

                                updateCrmOpportunity(deal.id, {
                                  products: updatedProducts,
                                  dealValue: newTotal,
                                  totalCostValue: newTotalCost,
                                  grossMarginPercent: overallMargin,
                                  weightedValue: newTotal * (deal.probability / 100)
                                });
                                showToast(`Removed line item from BOM`, "info");
                              }}
                              className="p-1 text-ink-faint hover:text-urgent rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-paper font-bold text-body">
                      <td colSpan={2} className="py-2.5 px-3 text-spec uppercase">
                        Total Schedule Scope ({(deal.products || []).length} items)
                      </td>
                      <td className="py-2.5 px-3 text-right text-spec">
                        {(deal.products || []).reduce((sum, p) => sum + p.quantity, 0)} Units
                      </td>
                      {(() => {
                        const costedProducts = (deal.products || []).filter((p) => typeof p.costPrice === "number" && p.costPrice > 0);
                        const hasCosted = costedProducts.length > 0 || (typeof deal.totalCostValue === "number" && deal.totalCostValue > 0);
                        const totalCost = typeof deal.totalCostValue === "number" && deal.totalCostValue > 0
                          ? deal.totalCostValue
                          : costedProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0);
                        const margin = hasCosted && deal.dealValue > 0 ? Math.round(((deal.dealValue - totalCost) / deal.dealValue) * 100) : (deal.grossMarginPercent ?? null);

                        return (
                          <>
                            <td className="py-2.5 px-3 text-right text-ink-dim text-spec font-mono">
                              {hasCosted ? `$${totalCost.toLocaleString()}` : <span className="text-ink-faint italic">Not costed</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right text-spec font-mono">
                              ${deal.dealValue.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-brand-deep text-spec">
                              {hasCosted && margin !== null ? `${margin}%` : <span className="text-ink-faint italic">Not costed</span>}
                            </td>
                          </>
                        );
                      })()}
                      <td className="py-2.5 px-3 text-right text-brand-deep text-base font-mono">
                        ${deal.dealValue.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="text-spec text-ink-dim pt-1">
              * Note: Line item amounts are quoted in AUD ex GST. GST (10%) is applied in the Ostendo ERP export and formal quotation.
            </div>
          </div>
        )}

        {/* ===================== TAB 3: QUOTE ===================== */}
        {activeTab === "quote" && (
          <div className="space-y-4">
            
            {/* Quote Readiness & Blockers Alert Banner */}
            <div className={`p-4 rounded-panel border space-y-2 ${
              quoteReadiness.isReady
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                : "bg-red-50/70 border-red-200 text-red-950"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-meta">
                  {quoteReadiness.isReady ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Quote Readiness Confirmed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Quote Readiness Blockers ({quoteReadiness.blockers.length})</span>
                    </>
                  )}
                </div>

                <span className={`text-spec font-bold px-2 py-0.5 rounded ${
                  quoteReadiness.isReady ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}>
                  {quoteReadiness.isReady ? "Ready to Issue" : "Action Required"}
                </span>
              </div>

              {quoteReadiness.blockers.length > 0 && (
                <ul className="list-disc list-inside text-spec text-red-800 space-y-1 pt-1">
                  {quoteReadiness.blockers.map((b, idx) => (
                    <li key={idx}>
                      <strong>Blocker:</strong> {b}
                    </li>
                  ))}
                </ul>
              )}

              {quoteReadiness.confirmed.length > 0 && (
                <div className="text-spec text-emerald-800 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                  {quoteReadiness.confirmed.map((c, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quote Details (Readable Values First by Default, Deliberate Edit Mode) */}
            <div className="bg-white p-4 rounded-panel border border-line space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-brand-deep" />
                  <h3 className="font-bold text-meta text-body">Quotation Lifecycle &amp; Metadata</h3>
                </div>
                {!isEditingQuoteDetails ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingQuoteDetails(true)}
                    className="text-spec font-bold text-brand-deep hover:bg-brand-wash px-2.5 py-1 rounded-edge border border-brand-edge flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Quote Details</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingQuoteDetails(false)}
                      className="text-spec text-ink-dim hover:text-ink px-2.5 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuoteDetails}
                      className="text-spec font-bold bg-brand-deep hover:bg-brand text-white px-3 py-1 rounded-edge shadow-xs cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {!isEditingQuoteDetails ? (
                /* READABLE VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-meta">
                  <div className="space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase block">Quote Reference</span>
                    <span className="font-mono font-bold text-brand-deep text-base">
                      {deal.ostendoQuoteRef || deal.quoteNumber || "Draft (Not Issued)"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase block">Revision</span>
                    <span className="font-bold text-body">{deal.quoteRevision || "Rev A"}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase block">Status</span>
                    <span className="font-bold text-body">{deal.quoteStatus || "Draft"}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase block">Expiry Date</span>
                    <span className="font-medium text-body">{deal.quoteExpiryDate || "30 Days from Issue"}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase block">Commercial Terms</span>
                    <span className="font-medium text-body">Net 30 Days (Standard)</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-spec font-bold text-ink-dim uppercase block">Delivery Basis</span>
                    <span className="font-medium text-body">FOB Melbourne / Direct Site Delivery</span>
                  </div>
                </div>
              ) : (
                /* EDIT FORM */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-meta pt-2">
                  <div>
                    <label htmlFor="quote-ref-input" className="block text-spec font-bold uppercase text-ink-dim mb-1">
                      Ostendo Quote Reference
                    </label>
                    <input
                      id="quote-ref-input"
                      type="text"
                      value={quoteFormData.ostendoQuoteRef}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, ostendoQuoteRef: e.target.value })}
                      placeholder="e.g. Q-88210"
                      className="w-full p-2 bg-white rounded-edge border border-line font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label htmlFor="quote-rev-select" className="block text-spec font-bold uppercase text-ink-dim mb-1">
                      Quote Revision
                    </label>
                    <select
                      id="quote-rev-select"
                      value={quoteFormData.quoteRevision}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, quoteRevision: e.target.value })}
                      className="w-full p-2 bg-white rounded-edge border border-line font-bold"
                    >
                      <option value="Rev A">Rev A (Original)</option>
                      <option value="Rev B">Rev B (Updated)</option>
                      <option value="Rev C">Rev C (Value Engineered)</option>
                      <option value="Rev D">Rev D (Final Tender)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quote-status-select" className="block text-spec font-bold uppercase text-ink-dim mb-1">
                      Quote Lifecycle Status
                    </label>
                    <select
                      id="quote-status-select"
                      value={quoteFormData.quoteStatus}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, quoteStatus: e.target.value as NonNullable<CRMOpportunity["quoteStatus"]> })}
                      className="w-full p-2 bg-white rounded-edge border border-line font-medium"
                    >
                      <option value="Draft">Draft (Estimating)</option>
                      <option value="Issued">Issued to Client</option>
                      <option value="Client Review">Client Review</option>
                      <option value="Revising">Revising</option>
                      <option value="PO Received">PO Received (Won)</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quote-expiry-input" className="block text-spec font-bold uppercase text-ink-dim mb-1">
                      Quote Expiry Date
                    </label>
                    <input
                      id="quote-expiry-input"
                      type="date"
                      value={quoteFormData.quoteExpiryDate}
                      onChange={(e) => setQuoteFormData({ ...quoteFormData, quoteExpiryDate: e.target.value })}
                      className="w-full p-2 bg-white rounded-edge border border-line font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Quotation Workflow Primary Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={handleCreateRevision}
                  className="px-3.5 py-1.5 bg-white hover:bg-brand-wash text-brand-deep border border-brand-edge font-bold text-spec rounded-edge flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Create Revision</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkWon}
                  className="px-3.5 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark PO Received (Won)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: ACTIVITY ===================== */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            
            {/* Filter Bar & Quick Log Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-line">
              <div className="flex flex-wrap items-center gap-1 text-spec">
                {["all", "call", "email", "meeting", "note", "task"].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setActivityFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-edge font-semibold capitalize cursor-pointer transition-colors ${
                      activityFilter === filterKey
                        ? "bg-brand-deep text-white shadow-2xs"
                        : "bg-paper hover:bg-raised text-ink-dim hover:text-body border border-line"
                    }`}
                  >
                    {filterKey === "all" ? "All Activity" : `${filterKey}s`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQuickLog({ type: "call", accountId: deal.accountId, opportunityId: deal.id })}
                  className="px-3 py-1 bg-brand hover:bg-brand-deep text-white font-bold text-spec rounded-edge shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>+ Log Activity</span>
                </button>
              </div>
            </div>

            {/* Chronological Expandable Feed */}
            {Object.keys(groupedActivities).length === 0 ? (
              <div className="p-8 text-center bg-paper rounded-panel border border-dashed border-line text-ink-dim">
                <MessageSquare className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                <div className="font-semibold text-body">No activity recorded on this deal</div>
                <p className="text-spec mt-1">Use the "+ Log Activity" button above to record calls, emails, or meetings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedActivities).map(([dateLabel, acts]) => (
                  <div key={dateLabel} className="space-y-2">
                    <div className="text-spec font-bold text-ink-dim uppercase tracking-wider pl-1">
                      {dateLabel}
                    </div>

                    <div className="space-y-2">
                      {acts.map((act) => {
                        const isExpanded = expandedActivityIds.has(act.id);
                        return (
                          <div
                            key={act.id}
                            className="bg-white rounded-panel border border-line p-3 hover:border-line-strong transition-colors space-y-2"
                          >
                            <div
                              className="flex items-start justify-between gap-2 cursor-pointer"
                              onClick={() => toggleActivityExpand(act.id)}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="p-1.5 rounded bg-brand-wash text-brand-deep shrink-0 mt-0.5">
                                  {act.type === "call" ? (
                                    <Phone className="w-3.5 h-3.5" />
                                  ) : act.type === "email" ? (
                                    <Mail className="w-3.5 h-3.5" />
                                  ) : act.type === "meeting" ? (
                                    <Calendar className="w-3.5 h-3.5" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                </div>

                                <div>
                                  <div className="font-bold text-meta text-body flex items-center gap-2">
                                    <span>{act.title}</span>
                                    {act.metadata?.outcome && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-paper text-ink-dim border border-line">
                                        {act.metadata.outcome}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-spec text-ink-dim">
                                    By {act.performedBy || "Sales Rep"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-spec text-ink-dim shrink-0">
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </div>
                            </div>

                            {/* Expandable description and notes */}
                            {isExpanded && act.description && (
                              <div className="pt-2 border-t border-line text-spec text-body leading-relaxed bg-paper/60 p-2.5 rounded-edge mt-2">
                                {act.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {isFollowUpModalOpen && (
        <CustomerFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          dealId={deal.id}
          accountId={deal.accountId}
          initialContactName={deal.primaryContactName}
          initialCompanyName={deal.accountName}
          initialProjectName={deal.name}
          initialQuoteRef={deal.ostendoQuoteRef || deal.quoteNumber || ""}
          initialProducts={(deal.products || []).map((p) => p.productName || p.productCode)}
        />
      )}

      {/* Delete Deal Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-5 border border-line shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Delete Deal</span>
            </div>
            <p className="text-meta text-body">
              Are you sure you want to permanently delete <strong>"{deal.name}"</strong>? This will remove all associated line items.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-3 py-1.5 text-meta text-ink-dim hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteCrmOpportunity(deal.id);
                  setIsDeleteConfirmOpen(false);
                  showToast(`Deleted deal "${deal.name}"`, "info");
                  if (onClose) onClose();
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-meta rounded-edge cursor-pointer"
              >
                Delete Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
