import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Kanban,
  ListFilter,
  Plus,
  FileUp,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
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
  MoreVertical,
  Sliders,
  Tag,
  Check,
  Package,
  RefreshCw,
  Phone,
  Zap,
  ClipboardCheck,
  X,
  Trash2,
  Archive
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CRMOpportunity, OpportunityProductLine } from "../../types/crm";
import { resolveQuotingStage } from "../../data/crmMockData";
import { formatAuDate } from "../../utils/dateUtils";
import { CustomerFollowUpModal } from "../CustomerFollowUpModal";
import { CRMDealDetailsWorkspace } from "./CRMDealDetailsWorkspace";
import {
  useOpportunities,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity
} from "../../hooks/useOpportunities";

export const CRMPipelineView: React.FC = () => {
  const { data: opportunitiesResponse, isLoading: isOppsLoading } = useOpportunities();
  const crmOpportunities: CRMOpportunity[] = opportunitiesResponse?.data || [];
  const createOpportunityMutation = useCreateOpportunity();
  const updateOpportunityMutation = useUpdateOpportunity();
  const deleteOpportunityMutation = useDeleteOpportunity();

  const {
    selectedCrmOpportunityId,
    setSelectedCrmOpportunityId,
    pipelines,
    activePipelineId,
    setActivePipelineId,
    accounts,
    contacts,
    openQuickLog,
    openCallPrep,
    openEmailComposer,
    navigateToCRM,
    currentUser,
    showToast,
    openQuoteImport
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed" | "all">("active");
  const [activeMenu, setActiveMenu] = useState<{
    deal: CRMOpportunity;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss floating action menu on window resize, scroll, or outside click
  useEffect(() => {
    if (!activeMenu) return;
    const handleClose = () => setActiveMenu(null);
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const trigger = (e.target as HTMLElement).closest?.(`[data-action-menu-trigger="${activeMenu.deal.id}"]`);
        if (!trigger) {
          setActiveMenu(null);
        }
      }
    };
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);

  // Close floating menu when filters or search change
  useEffect(() => {
    setActiveMenu(null);
  }, [searchQuery, statusFilter, activePipelineId]);
  const [followUpModalProps, setFollowUpModalProps] = useState<{
    isOpen: boolean;
    dealId?: string;
    accountId?: string;
    initialContactName?: string;
    initialCompanyName?: string;
    initialProjectName?: string;
    initialQuoteRef?: string;
    initialProducts?: string[];
    initialContactEmail?: string;
  }>({ isOpen: false });

  // New Deal Modal State
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    name: "",
    quoteNumber: "",
    accountId: accounts[0]?.id || "",
    primaryContactId: "",
    dealValue: 25000,
    stageName: "Proposal & Quoting" as const,
    expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    projectApplication: "Solar Public Lighting",
    notes: ""
  });

  const selectedPipelineAccount = accounts.find((a) => a.id === (newDealForm.accountId || accounts[0]?.id));
  const pipelineAccountContacts = useMemo(() => {
    if (!selectedPipelineAccount) return [];
    return contacts.filter(
      (c) =>
        c.accountId === selectedPipelineAccount.id ||
        (Boolean(selectedPipelineAccount.name) &&
          Boolean(c.accountName) &&
          c.accountName.trim().toLowerCase() === selectedPipelineAccount.name.trim().toLowerCase())
    );
  }, [contacts, selectedPipelineAccount]);

  const selectedDeal = crmOpportunities.find((d) => d.id === selectedCrmOpportunityId);

  // If a deal is selected, render the completed Step 2 Deal Details Workspace!
  if (selectedCrmOpportunityId && selectedDeal) {
    return <CRMDealDetailsWorkspace deal={selectedDeal} onClose={() => setSelectedCrmOpportunityId(null)} />;
  }

  // Filter quotes requiring follow-up
  const filteredDeals = crmOpportunities.filter((deal) => {
    const isClosed =
      deal.stageName.includes("Won") ||
      deal.stageName.includes("Lost") ||
      deal.stageId === "stage-won" ||
      deal.stageId === "stage-lost" ||
      deal.quoteStatus === "Accepted" ||
      deal.quoteStatus === "Declined" ||
      deal.quoteStatus === "PO Received";

    // Default "active" status filter only shows quotes that are outstanding and require follow up
    if (statusFilter === "active" && isClosed) return false;
    if (statusFilter === "closed" && !isClosed) return false;

    const matchesSearch =
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.accountName && deal.accountName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.quoteNumber && deal.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.ostendoQuoteRef && deal.ostendoQuoteRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.nextAction && deal.nextAction.toLowerCase().includes(searchQuery.toLowerCase())) ||
      deal.projectApplication?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const quotingStage = resolveQuotingStage("pipe-major-projects");
    if (!newDealForm.name.trim()) return;

    const acc = accounts.find((a) => a.id === newDealForm.accountId) || accounts[0];
    const matchedContact = pipelineAccountContacts.find((c) => c.id === newDealForm.primaryContactId) || pipelineAccountContacts[0];

    try {
      await createOpportunityMutation.mutateAsync({
        name: newDealForm.name.trim(),
        quoteNumber: newDealForm.quoteNumber ? newDealForm.quoteNumber.trim() : undefined,
        accountId: acc?.id || "acc-general",
        accountName: acc?.name || "General Account",
        primaryContactId: matchedContact?.id || undefined,
        primaryContactName: matchedContact ? `${matchedContact.firstName} ${matchedContact.lastName}`.trim() : undefined,
        primaryContactEmail: matchedContact?.email || undefined,
        primaryContactPhone: matchedContact?.phone || undefined,
        opportunityOwner: currentUser.name,
        pipelineId: "pipe-major-projects",
        stageId: quotingStage.id,
        stageName: quotingStage.name,
        dealValue: Number(newDealForm.dealValue) || 0,
        expectedCloseDate: newDealForm.expectedCloseDate || undefined,
        projectApplication: newDealForm.projectApplication || undefined,
        location: acc?.territory || "VIC/TAS",
        notes: newDealForm.notes || undefined
      });
      setIsNewDealModalOpen(false);
      showToast(`Quote "${newDealForm.name.trim()}" created!`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to create quote", "error");
    }
  };

  const getFollowUpStatusBadge = (opp: CRMOpportunity) => {
    const isWon = opp.stageId === "stage-won" || opp.stageName.toLowerCase().includes("won");
    const isLost = opp.stageId === "stage-lost" || opp.stageName.toLowerCase().includes("lost");
    if (isWon) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Won
        </span>
      );
    }
    if (isLost) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Closed
        </span>
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (!opp.nextAction || !opp.nextAction.trim() || !opp.nextActionDate) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Follow-Up Required
        </span>
      );
    }

    if (opp.nextActionDate < todayStr) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
          Overdue
        </span>
      );
    }

    if (opp.nextActionDate === todayStr) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Due Today
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Scheduled
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* HEADER & PIPELINE ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Outstanding Quotes</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            {filteredDeals.length} {filteredDeals.length === 1 ? "quote" : "quotes"} requiring follow-up · Total pipeline: <strong>${totalValue.toLocaleString()} (Ex GST)</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* The import lives here as well as in the mobile Log menu - this is
              the screen a rep is on when they have a quote PDF in hand, and the
              Log menu is hidden at desktop widths. */}
          <button
            type="button"
            onClick={() => openQuoteImport()}
            className="min-h-[44px] px-3 rounded-edge border border-line bg-white hover:bg-paper text-body font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileUp className="w-4 h-4 text-brand-deep" />
            <span>Import quote PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewDealModalOpen(true)}
            className="min-h-[44px] px-4 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New quote</span>
          </button>
        </div>
      </div>

      {/* CONSOLIDATED TOOLBAR (PART C) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-panel border border-line shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* SEARCH */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quotes or accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
            />
          </div>

          {/* ACTIVE VS CLOSED SELECTOR */}
          <div className="flex items-center rounded-edge border border-line overflow-hidden text-spec font-medium bg-paper/60">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusFilter === "active" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              Requires Follow-Up
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("closed")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusFilter === "closed" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              Closed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-xs cursor-pointer ${
                statusFilter === "all" ? "bg-chrome text-white font-bold" : "text-ink-dim hover:text-body"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT DEALS TABLE (PART C) */}
      {filteredDeals.length === 0 ? (
        <div className="p-12 text-center space-y-2 bg-white rounded-panel border border-line shadow-2xs">
          <Kanban className="w-10 h-10 text-ink-faint mx-auto" />
          <h2 className="text-base font-bold text-body">No outstanding quotes found</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            {statusFilter === "active"
              ? "All active quotes have been followed up, or try adjusting your search."
              : "No quotes match the current filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-panel border border-line shadow-2xs overflow-hidden">
          {/* Desktop table. Below md this became a 1,012px table inside a ~364px
              container, hiding value, due date, health and every row action
              behind an unsignposted sideways scroll — see the card list below. */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-spec">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-ink-dim text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Quote / Customer</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Value (Ex GST)</th>
                  <th className="py-2.5 px-4">Follow-Up &amp; Due</th>
                  <th className="py-2.5 px-4">Follow-Up</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedCrmOpportunityId(deal.id)}
                    className="hover:bg-raised/60 transition-colors cursor-pointer"
                  >
                    {/* QUOTE NAME & ACCOUNT BENEATH (PART C) */}
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-body text-spec hover:text-brand-deep transition-colors">
                          {deal.name}
                        </span>
                        {(deal.quoteNumber || deal.ostendoQuoteRef) && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-paper border border-line text-ink-dim">
                            {deal.quoteNumber || deal.ostendoQuoteRef}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-dim mt-0.5">
                        {deal.accountName || "Direct Customer"}
                      </div>
                    </td>

                    {/* STAGE */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                        {deal.stageName}
                      </span>
                    </td>

                    {/* VALUE */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-body">
                      <div>${(deal.dealValue || 0).toLocaleString()}</div>
                    </td>

                    {/* FOLLOW-UP & DUE DATE */}
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="text-xs font-medium text-body line-clamp-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-brand-deep shrink-0" />
                        <span>{deal.nextAction || "Follow up quotation"}</span>
                      </div>
                      <div className="text-[11px] text-ink-dim mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-ink-dim" />
                        <span>
                          {deal.nextActionDate
                            ? `Follow-up ${formatAuDate(deal.nextActionDate)}`
                            : deal.expectedCloseDate
                            ? `Target close ${formatAuDate(deal.expectedCloseDate)}`
                            : "Follow-up required"}
                        </span>
                      </div>
                    </td>

                    {/* FOLLOW-UP STATUS */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getFollowUpStatusBadge(deal)}
                    </td>

                    {/* ROW ACTIONS */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFollowUpModalProps({
                              isOpen: true,
                              dealId: deal.id,
                              accountId: deal.accountId,
                              initialContactName: deal.primaryContactName,
                              initialCompanyName: deal.accountName,
                              initialProjectName: deal.name,
                              initialQuoteRef: deal.ostendoQuoteRef || deal.quoteNumber || "",
                              initialProducts: (deal.products || []).map((p) => p.productName || p.productCode),
                              initialContactEmail: deal.primaryContactEmail
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-brand-deep bg-brand-wash hover:bg-brand-edge/30 rounded border border-brand-edge flex items-center gap-1 transition-colors cursor-pointer"
                          title="Generate follow-up email and schedule task"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Follow Up</span>
                        </button>

                        <div className="relative inline-block">
                          <button
                            type="button"
                            aria-label={`Actions for ${deal.name}`}
                            data-action-menu-trigger={deal.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenu?.deal.id === deal.id) {
                                setActiveMenu(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = typeof window !== "undefined" ? window.innerHeight - rect.bottom : 200;
                                const openUp = spaceBelow < 120 && rect.top > 120;
                                setActiveMenu({
                                  deal,
                                  top: openUp ? undefined : rect.bottom + 4,
                                  bottom: openUp ? Math.max(0, (typeof window !== "undefined" ? window.innerHeight : 800) - rect.top + 4) : undefined,
                                  right: Math.max(8, (typeof window !== "undefined" ? window.innerWidth : 1200) - rect.right),
                                });
                              }
                            }}
                            className="p-1 rounded hover:bg-line text-ink-dim hover:text-body transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list — same data, no sideways scrolling. */}
          <ul className="md:hidden divide-y divide-line">
            {filteredDeals.map((deal) => (
              <li key={deal.id}>
                <div
                  onClick={() => setSelectedCrmOpportunityId(deal.id)}
                  className="p-4 space-y-2.5 cursor-pointer hover:bg-raised/60 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-spec text-ink leading-snug break-words">{deal.name}</h3>
                    <p className="text-xs text-ink-dim break-words">{deal.accountName || "Direct customer"}</p>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono font-bold text-base text-ink">
                      ${(deal.dealValue || 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-ink-dim uppercase tracking-wide">ex GST</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                      {deal.stageName}
                    </span>
                    {getFollowUpStatusBadge(deal)}
                    {(deal.quoteNumber || deal.ostendoQuoteRef) && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-paper border border-line text-ink-dim">
                        {deal.quoteNumber || deal.ostendoQuoteRef}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-ink-dim space-y-0.5">
                    <div className="flex items-start gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
                      <span className="text-ink break-words">{deal.nextAction || "Follow up on this quote"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>
                        {deal.nextActionDate
                          ? `Follow-up ${formatAuDate(deal.nextActionDate)}`
                          : deal.expectedCloseDate
                          ? `Target close ${formatAuDate(deal.expectedCloseDate)}`
                          : "Follow-up required"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowUpModalProps({
                        isOpen: true,
                        dealId: deal.id,
                        accountId: deal.accountId,
                        initialContactName: deal.primaryContactName,
                        initialCompanyName: deal.accountName,
                        initialProjectName: deal.name,
                        initialQuoteRef: deal.ostendoQuoteRef || deal.quoteNumber || "",
                        initialProducts: (deal.products || []).map((p) => p.productName || p.productCode),
                        initialContactEmail: deal.primaryContactEmail
                      });
                    }}
                    className="flex-1 min-h-[44px] px-3 text-spec font-bold text-brand-deep bg-brand-wash hover:bg-brand-edge/30 rounded-edge border border-brand-edge flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Follow up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openQuickLog({ type: "call", accountId: deal.accountId, opportunityId: deal.id })}
                    className="flex-1 min-h-[44px] px-3 text-spec font-bold text-ink bg-paper hover:bg-line rounded-edge border border-line flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-ink-dim" />
                    <span>Log call</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* NEW DEAL MODAL */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-deal-modal-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="new-deal-modal-title" className="font-bold text-body text-base">
                Create New Quote
              </h3>
              <button onClick={() => setIsNewDealModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3">
              <div>
                <label htmlFor="pipeline-quote-account" className="block text-spec font-bold mb-1">
                  Customer / Account *
                </label>
                <select
                  id="pipeline-quote-account"
                  required
                  value={newDealForm.accountId}
                  onChange={(e) => {
                    const nextAccId = e.target.value;
                    const nextAcc = accounts.find((a) => a.id === nextAccId);
                    const nextContacts = nextAcc
                      ? contacts.filter(
                          (c) =>
                            c.accountId === nextAcc.id ||
                            (Boolean(nextAcc.name) &&
                              Boolean(c.accountName) &&
                              c.accountName.trim().toLowerCase() === nextAcc.name.trim().toLowerCase())
                        )
                      : [];
                    setNewDealForm((prev) => ({
                      ...prev,
                      accountId: nextAccId,
                      primaryContactId: nextContacts[0]?.id || ""
                    }));
                  }}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pipeline-quote-name" className="block text-spec font-bold mb-1">
                  Quote / Tender Name *
                </label>
                <input
                  id="pipeline-quote-name"
                  required
                  value={newDealForm.name}
                  onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. Wyndham Regional Park Solar Lighting"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pipeline-quote-val" className="block text-spec font-bold mb-1">
                    $ Value
                  </label>
                  <input
                    id="pipeline-quote-val"
                    type="number"
                    min={0}
                    required
                    value={newDealForm.dealValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="pipeline-quote-num" className="block text-spec font-bold mb-1">
                    Quote Number
                  </label>
                  <input
                    id="pipeline-quote-num"
                    type="text"
                    value={newDealForm.quoteNumber}
                    onChange={(e) => setNewDealForm({ ...newDealForm, quoteNumber: e.target.value })}
                    placeholder="e.g. Q-2026-108"
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pipeline-quote-followup" className="block text-spec font-bold mb-1">
                    Follow Up Date
                  </label>
                  <input
                    id="pipeline-quote-followup"
                    type="date"
                    value={newDealForm.expectedCloseDate}
                    onChange={(e) => setNewDealForm({ ...newDealForm, expectedCloseDate: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  />
                </div>

                <div>
                  <label htmlFor="pipeline-quote-contact" className="block text-spec font-bold mb-1">
                    Contact Name
                  </label>
                  <select
                    id="pipeline-quote-contact"
                    value={newDealForm.primaryContactId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, primaryContactId: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option value="">
                      {pipelineAccountContacts.length > 0 ? "Select contact..." : "No contacts for this customer"}
                    </option>
                    {pipelineAccountContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {`${c.firstName} ${c.lastName}`.trim()}{c.role ? ` (${c.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge cursor-pointer"
                >
                  Create Quote
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Customer Follow Up Modal */}
      {followUpModalProps.isOpen && (
        <CustomerFollowUpModal
          isOpen={followUpModalProps.isOpen}
          onClose={() => setFollowUpModalProps((prev) => ({ ...prev, isOpen: false }))}
          dealId={followUpModalProps.dealId}
          accountId={followUpModalProps.accountId}
          initialContactName={followUpModalProps.initialContactName}
          initialCompanyName={followUpModalProps.initialCompanyName}
          initialProjectName={followUpModalProps.initialProjectName}
          initialQuoteRef={followUpModalProps.initialQuoteRef}
          initialProducts={followUpModalProps.initialProducts}
          initialContactEmail={followUpModalProps.initialContactEmail}
        />
      )}

      {/* Portaled Row Action Dropdown Menu to prevent table overflow clipping */}
      {activeMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${activeMenu.deal.name}`}
            style={{
              position: "fixed",
              top: activeMenu.top !== undefined ? `${activeMenu.top}px` : undefined,
              bottom: activeMenu.bottom !== undefined ? `${activeMenu.bottom}px` : undefined,
              right: `${activeMenu.right}px`,
              zIndex: 9999,
            }}
            className="w-44 bg-white border border-line rounded-panel shadow-xl py-1 text-spec text-left animate-in fade-in zoom-in-95 duration-100 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const dealId = activeMenu.deal.id;
                setActiveMenu(null);
                setSelectedCrmOpportunityId(dealId);
              }}
              className="w-full px-3 py-2 hover:bg-raised flex items-center gap-2 text-body transition-colors cursor-pointer text-left"
            >
              <FileText className="w-4 h-4 text-ink-dim" />
              <span className="font-medium">View Details</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const deal = activeMenu.deal;
                setActiveMenu(null);
                openQuickLog({ type: "call", accountId: deal.accountId, opportunityId: deal.id });
              }}
              className="w-full px-3 py-2 hover:bg-raised flex items-center gap-2 text-body transition-colors cursor-pointer text-left"
            >
              <Phone className="w-4 h-4 text-ink-dim" />
              <span className="font-medium">Log Activity</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};