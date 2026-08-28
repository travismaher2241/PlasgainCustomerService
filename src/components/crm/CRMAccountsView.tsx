import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Tag,
  ShieldAlert,
  ArrowUpRight,
  Edit3,
  Trash2,
  Smartphone,
  TrendingUp
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Account, CRMContact, CRMOpportunity, RelationshipHealth, CompetitorPricingRecord, CompetitorPriceBasis, CompetitorGstStatus, CompetitorSourceType, CompetitorPricingStatus, AccountIntelligenceSummary } from "../../types/crm";
import { CRMContactModal } from "./CRMContactModal";
import { getLocalDateInputValue } from "../../utils/dateUtils";
import { sortActivitiesChronological } from "../../utils/activityUtils";
import { accountIntelligenceCache, generateAccountSourceHash } from "../../utils/accountIntelligenceCache";
import { detectDuplicateAccount, DuplicateMatchResult } from "../../utils/duplicateDetector";
import { CRMDuplicateWarningModal } from "./CRMDuplicateWarningModal";

export const CRMAccountsView: React.FC = () => {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    contacts,
    crmOpportunities,
    activities,
    tasks,
    updateAccount,
    addAccount,
    deleteAccount,
    addContact,
    updateContact,
    deleteContact,
    openQuickLog,
    openEmailComposer,
    openCallPrep,
    navigateToCRM,
    currentUser,
    competitorPricingRecords,
    addCompetitorPricing,
    updateCompetitorPricing,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [activeAccountTab, setActiveAccountTab] = useState<"overview" | "contacts" | "deals" | "timeline" | "quotes" | "competitor-pricing" | "ai-summary">("overview");

  // OPT-03: AI Account Summary Multi-Account Cache
  const [accountAiCache, setAccountAiCache] = useState<Record<string, AccountIntelligenceSummary>>(() => {
    try {
      const saved = localStorage.getItem("plasgain_ai_account_cache");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [aiSummary, setAiSummary] = useState<AccountIntelligenceSummary | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isCachedSummary, setIsCachedSummary] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);

  // P2-13: Duplicate Account Detection State
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatchResult<Account> | null>(null);
  const [pendingAccountToCreate, setPendingAccountToCreate] = useState<Account | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const handleFetchAiSummary = async (acc: Account, forceRefresh = false) => {
    const accActivities = activities.filter((a) => a.accountId === acc.id);
    const accDeals = crmOpportunities.filter((d) => d.accountId === acc.id);
    const accTasks = tasks.filter((t) => t.accountId === acc.id);
    const accCompetitors = competitorPricingRecords.filter((c) => c.accountId === acc.id);
    const accContacts = contacts.filter((c) => c.accountId === acc.id);

    const sourceHash = generateAccountSourceHash({
      id: acc.id,
      updatedAt: acc.lastInteractionDate || acc.createdDate || "",
      contacts: accContacts,
      opportunities: accDeals,
      activities: accActivities
    });

    // P2-03: Check deterministic source-hash cache
    if (!forceRefresh) {
      const cached = accountIntelligenceCache.get(acc.id, sourceHash);
      if (cached) {
        setAiSummary(cached.summary);
        setIsCachedSummary(true);
        setCacheTimestamp(cached.cachedAt);
        setIsAiLoading(false);
        return;
      }
    }

    setIsAiLoading(true);
    setAiError(null);
    setIsCachedSummary(false);
    try {
      const res = await fetch("/api/crm/account-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: acc,
          activities: accActivities,
          opportunities: accDeals,
          tasks: accTasks,
          competitorPricing: accCompetitors
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || "Failed to generate AI account summary");
      }

      const data = await res.json();
      setAiSummary(data.summary);
      setCacheTimestamp(Date.now());
      
      // Store in deterministic cache
      accountIntelligenceCache.set(acc.id, sourceHash, data.summary);

      if (forceRefresh) {
        showToast("Refreshed AI Account Intelligence synthesis!", "success");
      }
    } catch (err: any) {
      console.error("AI summary error:", err);
      // Check cache fallback
      const cachedFallback = accountIntelligenceCache.get(acc.id);
      if (cachedFallback) {
        setAiSummary(cachedFallback.summary);
        setIsCachedSummary(true);
        setCacheTimestamp(cachedFallback.cachedAt);
        showToast("Live AI synthesis failed — showing cached analysis", "warning");
      } else {
        setAiError(err.message || "AI service is currently unavailable");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccountTab === "ai-summary" && selectedAccount) {
      if (accountAiCache[selectedAccount.id]) {
        setAiSummary(accountAiCache[selectedAccount.id]);
        setIsCachedSummary(true);
      } else if (!isAiLoading) {
        handleFetchAiSummary(selectedAccount, false);
      }
    }
  }, [activeAccountTab, selectedAccountId]);

  // Competitor Pricing Modal State
  const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false);
  const [editingCompetitorRecord, setEditingCompetitorRecord] = useState<CompetitorPricingRecord | null>(null);
  const [competitorForm, setCompetitorForm] = useState({
    competitorName: "",
    competitorProduct: "",
    price: 1850,
    currency: "AUD",
    priceBasis: "Per Unit" as CompetitorPriceBasis,
    gstStatus: "Ex GST" as CompetitorGstStatus,
    quantity: "" as string | number,
    sourceType: "Customer Verbal" as CompetitorSourceType,
    observedDate: getLocalDateInputValue(),
    notes: "",
    status: "Active" as CompetitorPricingStatus
  });

  const resetCompetitorForm = () => {
    setCompetitorForm({
      competitorName: "",
      competitorProduct: "",
      price: 1850,
      plasgainQuotedPrice: "",
      currency: "AUD",
      priceBasis: "Per Unit",
      gstStatus: "Ex GST",
      quantity: "",
      sourceType: "Customer Verbal",
      observedDate: getLocalDateInputValue(),
      notes: "",
      status: "Active"
    });
    setEditingCompetitorRecord(null);
  };

  const handleOpenAddCompetitor = () => {
    resetCompetitorForm();
    setIsCompetitorModalOpen(true);
  };

  const handleOpenEditCompetitor = (record: CompetitorPricingRecord) => {
    setEditingCompetitorRecord(record);
    setCompetitorForm({
      competitorName: record.competitorName,
      competitorProduct: record.competitorProduct,
      price: record.price,
      plasgainQuotedPrice: record.plasgainQuotedPrice !== undefined ? record.plasgainQuotedPrice : "",
      currency: record.currency || "AUD",
      priceBasis: record.priceBasis,
      gstStatus: record.gstStatus,
      quantity: record.quantity || "",
      sourceType: record.sourceType,
      observedDate: record.observedDate,
      notes: record.notes || "",
      status: record.status
    });
    setIsCompetitorModalOpen(true);
  };

  const handleSaveCompetitorPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const priceNum = typeof competitorForm.price === "number" ? competitorForm.price : parseFloat(competitorForm.price);
    const qtyNum = competitorForm.quantity ? (typeof competitorForm.quantity === "number" ? competitorForm.quantity : parseFloat(competitorForm.quantity)) : undefined;
    const plasgainPriceNum = competitorForm.plasgainQuotedPrice !== "" && competitorForm.plasgainQuotedPrice !== undefined ? (typeof competitorForm.plasgainQuotedPrice === "number" ? competitorForm.plasgainQuotedPrice : parseFloat(competitorForm.plasgainQuotedPrice as string)) : undefined;

    if (editingCompetitorRecord) {
      await updateCompetitorPricing(editingCompetitorRecord.id, {
        competitorName: competitorForm.competitorName,
        competitorProduct: competitorForm.competitorProduct,
        price: priceNum,
        plasgainQuotedPrice: plasgainPriceNum,
        priceBasis: competitorForm.priceBasis,
        gstStatus: competitorForm.gstStatus,
        quantity: qtyNum,
        sourceType: competitorForm.sourceType,
        observedDate: competitorForm.observedDate,
        notes: competitorForm.notes,
        status: competitorForm.status
      });
    } else {
      await addCompetitorPricing({
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
        competitorName: competitorForm.competitorName,
        competitorProduct: competitorForm.competitorProduct,
        price: priceNum,
        plasgainQuotedPrice: plasgainPriceNum,
        currency: competitorForm.currency,
        priceBasis: competitorForm.priceBasis,
        gstStatus: competitorForm.gstStatus,
        quantity: qtyNum,
        sourceType: competitorForm.sourceType,
        observedDate: competitorForm.observedDate,
        notes: competitorForm.notes,
        createdBy: currentUser.name,
        status: competitorForm.status
      });
    }

    setIsCompetitorModalOpen(false);
    resetCompetitorForm();
  };

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<CRMContact | null>(null);

  // Create new account modal state
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    name: "",
    tradingName: "",
    status: "Customer" as const,
    industry: "Government & Public Infrastructure",
    customerSegment: "Local Government / Council" as const,
    territory: "QLD/NT" as const,
    accountOwner: currentUser.name,
    mainPhone: "",
    generalEmail: "",
    website: "",
    notes: ""
  });

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.tradingName && acc.tradingName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      acc.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSegment = segmentFilter === "all" || acc.customerSegment === segmentFilter;
    const matchesHealth = healthFilter === "all" || acc.relationshipHealth === healthFilter;
    return matchesSearch && matchesSegment && matchesHealth;
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const accountContacts = contacts.filter((c) => c.accountId === selectedAccount?.id);
  const accountDeals = crmOpportunities.filter((d) => d.accountId === selectedAccount?.id);
  const accountActivities = sortActivitiesChronological(
    activities.filter((act) => act.accountId === selectedAccount?.id),
    "newest"
  );
  const accountTasks = tasks.filter((t) => t.accountId === selectedAccount?.id);
  const accountCompetitorPricing = competitorPricingRecords.filter((r) => r.accountId === selectedAccount?.id);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.name.trim()) return;

    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name: newAccountForm.name,
      tradingName: newAccountForm.tradingName,
      status: newAccountForm.status,
      industry: newAccountForm.industry,
      customerSegment: newAccountForm.customerSegment,
      territory: newAccountForm.territory,
      accountOwner: newAccountForm.accountOwner,
      leadSource: "Direct Contact",
      createdDate: new Date().toISOString().split("T")[0],
      lastInteractionDate: new Date().toISOString().split("T")[0],
      mainPhone: newAccountForm.mainPhone,
      generalEmail: newAccountForm.generalEmail,
      website: newAccountForm.website,
      notes: newAccountForm.notes,
      relationshipHealth: "Healthy",
      tags: [newAccountForm.customerSegment],
      metrics: {
        openPipelineValue: 0,
        totalDealsWon: 0,
        activeDealsCount: 0,
        totalEnquiries: 0
      }
    };

    addAccount(newAcc);
    setSelectedAccountId(newAcc.id);
    setIsNewAccountModalOpen(false);
  };

  const getHealthBadge = (health: RelationshipHealth) => {
    switch (health) {
      case "Strong":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-brand-wash text-brand-deep border border-brand-edge">Strong</span>;
      case "Healthy":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-hold-wash text-hold border border-hold">Healthy</span>;
      case "Needs Attention":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-soon-wash text-soon border border-soon">Needs Attention</span>;
      case "At Risk":
        return <span className="px-2 py-0.5 rounded-full text-meta font-semibold bg-urgent-wash text-urgent border border-urgent">At Risk</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-body tracking-tight">Account & Customer 360°</h1>
          <p className="text-body text-ink-dim">
            Unified organizational records, multi-stakeholder relationships, active deals, and interaction history.
          </p>
        </div>
        <button
          onClick={() => setIsNewAccountModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Main 2-Column Split: Account List vs 360 Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Directory & Search (4 Columns) */}
        <div className="lg:col-span-4 bg-white rounded-panel border border-line shadow-sm overflow-hidden flex flex-col h-[780px]">
          {/* Filters */}
          <div className="p-3.5 border-b border-line space-y-2.5 bg-raised">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search account name, trading name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-meta bg-white border border-line rounded-edge focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="w-1/2 text-meta py-1 px-2 bg-white border border-line rounded-edge"
              >
                <option value="all">All Segments</option>
                <option value="Local Government / Council">Councils</option>
                <option value="Civil Contractor">Civil Contractors</option>
                <option value="Commercial Developer">Developers</option>
                <option value="Electrical Contractor">Wholesale / Electrical</option>
              </select>
              <select
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value)}
                className="w-1/2 text-meta py-1 px-2 bg-white border border-line rounded-edge"
              >
                <option value="all">All Health</option>
                <option value="Strong">Strong</option>
                <option value="Healthy">Healthy</option>
                <option value="Needs Attention">Needs Attention</option>
                <option value="At Risk">At Risk</option>
              </select>
            </div>
          </div>

          {/* Account Scroll List */}
          <div className="divide-y divide-line overflow-y-auto flex-1">
            {filteredAccounts.length === 0 ? (
              <div className="p-8 text-center text-meta text-ink-dim">
                No matching accounts found.
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = acc.id === selectedAccount?.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brand-wash border-l-4 border-brand-deep"
                        : "hover:bg-raised"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-meta font-bold leading-snug">{acc.name}</div>
                        <div className="text-spec text-ink-dim">{acc.customerSegment} · {acc.territory}</div>
                      </div>
                      {getHealthBadge(acc.relationshipHealth)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-spec text-ink-dim">
                      <span>Pipeline: <strong className="text-body font-semibold">${(acc.metrics?.openPipelineValue || 0).toLocaleString()}</strong></span>
                      <span>Owner: {acc.accountOwner.split(" ")[0]}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Account 360 Workspace (8 Columns) */}
        {selectedAccount ? (
          <div className="lg:col-span-8 bg-white rounded-panel border border-line shadow-sm overflow-hidden flex flex-col min-h-[780px]">
            {/* Account Header Banner */}
            <div className="p-6 border-b border-line bg-gradient-to-r from-line via-white to-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-meta font-semibold px-2.5 py-0.5 rounded-full bg-paper border border-line">
                      {selectedAccount.status}
                    </span>
                    <span className="text-meta text-ink-dim">{selectedAccount.customerSegment}</span>
                    <span className="text-meta text-ink-faint">·</span>
                    <span className="text-meta text-ink-dim">Territory: {selectedAccount.territory}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-body">{selectedAccount.name}</h2>
                  {selectedAccount.tradingName && selectedAccount.tradingName !== selectedAccount.name && (
                    <div className="text-meta text-ink-dim mt-0.5">T/A {selectedAccount.tradingName}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const accountContacts = contacts.filter((c) => c.accountId === selectedAccount.id);
                      const firstContact = accountContacts[0];
                      const accountOpps = crmOpportunities.filter((o) => o.accountId === selectedAccount.id);
                      const accountActs = activities.filter((a) => a.accountId === selectedAccount.id);

                      openEmailComposer({
                        defaultMode: "cold-outreach",
                        accountId: selectedAccount.id,
                        companyName: selectedAccount.name,
                        companyWebsite: selectedAccount.website,
                        contactId: firstContact?.id,
                        contactName: firstContact ? `${firstContact.firstName} ${firstContact.lastName}` : undefined,
                        contactEmail: firstContact?.email,
                        contactRole: firstContact?.jobTitle,
                        customerSegment: selectedAccount.customerSegment,
                        industry: selectedAccount.industry,
                        territory: selectedAccount.territory,
                        projectNotes: selectedAccount.notes,
                        productsQuoted: accountOpps.flatMap((o) => o.products || []),
                        recentActivities: accountActs.slice(0, 5).map((a) => `${a.type}: ${a.title} (${a.date})`)
                      });
                    }}
                    className="px-3 py-1.5 text-meta font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash/80 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Draft grounded AI outreach email for this account"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>AI Email</span>
                  </button>
                  <button
                    onClick={() => openCallPrep({ accountId: selectedAccount.id })}
                    className="px-3 py-1.5 text-meta font-bold text-brand-deep bg-brand-wash border border-brand-edge rounded-edge hover:bg-brand-wash/80 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Prepare talking points & pre-call briefing for this account"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Prep Call</span>
                  </button>
                  <button
                    onClick={() => openQuickLog("call", selectedAccount.id)}
                    className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm"
                  >
                    + Call
                  </button>
                  <button
                    onClick={() => openQuickLog("task", selectedAccount.id)}
                    className="px-3 py-1.5 text-meta font-semibold bg-white border border-line-strong rounded-edge hover:bg-raised shadow-sm"
                  >
                    + Task
                  </button>
                  <button
                    onClick={() => openQuickLog("note", selectedAccount.id)}
                    className="px-3 py-1.5 text-meta font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand shadow-sm cursor-pointer"
                  >
                    + Note
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${selectedAccount.name}" and all associated records?`)) {
                        deleteAccount(selectedAccount.id);
                      }
                    }}
                    className="p-1.5 text-meta font-semibold text-ink-dim hover:text-urgent hover:bg-urgent-wash border border-line rounded-edge transition-colors cursor-pointer"
                    title="Delete this account from workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Info Bar */}
              <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-meta">
                <div>
                  <span className="text-ink-faint block text-spec">Relationship Health</span>
                  <div className="mt-0.5">{getHealthBadge(selectedAccount.relationshipHealth)}</div>
                </div>
                <div>
                  <span className="text-ink-faint block text-spec">Open Pipeline</span>
                  <span className="font-bold text-body">
                    ${(selectedAccount.metrics?.openPipelineValue || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint block text-spec">Total Won to Date</span>
                  <span className="font-bold text-brand-deep text-body">
                    ${(selectedAccount.metrics?.totalDealsWon || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint block text-spec">Account Owner</span>
                  <span className="font-semibold text-body">{selectedAccount.accountOwner}</span>
                </div>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="px-6 border-b border-line flex items-center gap-6 overflow-x-auto text-meta font-semibold">
              <button
                onClick={() => setActiveAccountTab("overview")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "overview"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Overview & Details
              </button>
              <button
                onClick={() => setActiveAccountTab("contacts")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "contacts"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Contacts ({accountContacts.length})
              </button>
              <button
                onClick={() => setActiveAccountTab("deals")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "deals"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Opportunities ({accountDeals.length})
              </button>
              <button
                onClick={() => setActiveAccountTab("timeline")}
                className={`py-3.5 border-b-2 transition-colors ${
                  activeAccountTab === "timeline"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                Activity Timeline ({accountActivities.length})
              </button>
              <button
                onClick={() => setActiveAccountTab("ai-summary")}
                className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeAccountTab === "ai-summary"
                    ? "border-brand-deep text-brand-deep"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-hold" />
                AI Intelligence
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Tab 1: Overview */}
              {activeAccountTab === "overview" && (
                <div className="space-y-6">
                  {/* Account Summary Notes */}
                  {selectedAccount.notes && (
                    <div className="p-4 bg-raised rounded-edge border border-line">
                      <div className="text-meta font-bold mb-1">Key Account Notes & Preferences</div>
                      <p className="text-meta text-ink-dim leading-relaxed">{selectedAccount.notes}</p>
                    </div>
                  )}

                  {/* Health Reasons */}
                  {selectedAccount.healthReasons && selectedAccount.healthReasons.length > 0 && (
                    <div className="p-4 bg-hold-wash rounded-edge border border-hold">
                      <div className="text-meta font-bold text-hold mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-hold" />
                        Relationship Health Diagnosis
                      </div>
                      <ul className="text-meta text-hold space-y-1 list-disc list-inside">
                        {selectedAccount.healthReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Organization Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-line rounded-edge space-y-2 text-meta">
                      <div className="font-bold text-body border-b border-line pb-2">Contact & Channels</div>
                      {selectedAccount.mainPhone && (
                        <div className="flex items-center gap-2 text-ink-dim">
                          <Phone className="w-3.5 h-3.5 text-ink-faint" />
                          <span>{selectedAccount.mainPhone}</span>
                        </div>
                      )}
                      {selectedAccount.generalEmail && (
                        <div className="flex items-center gap-2 text-ink-dim">
                          <Mail className="w-3.5 h-3.5 text-ink-faint" />
                          <span>{selectedAccount.generalEmail}</span>
                        </div>
                      )}
                      {selectedAccount.website && (
                        <div className="flex items-center gap-2 text-ink-dim">
                          <Globe className="w-3.5 h-3.5 text-ink-faint" />
                          <a href={selectedAccount.website} target="_blank" rel="noreferrer" className="text-brand-deep hover:underline">
                            {selectedAccount.website}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-white border border-line rounded-edge space-y-2 text-meta">
                      <div className="font-bold text-body border-b border-line pb-2">Addresses & Depots</div>
                      {selectedAccount.billingAddress ? (
                        <div className="text-ink-dim flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-ink-faint mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-body">Billing:</span> {selectedAccount.billingAddress.street}, {selectedAccount.billingAddress.city} {selectedAccount.billingAddress.state} {selectedAccount.billingAddress.postcode}
                          </div>
                        </div>
                      ) : (
                        <div className="text-ink-faint italic">No formal billing address specified.</div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="text-meta font-bold mb-2">Account Tags & Classifications</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAccount.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-paper border border-line rounded-edge text-meta font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Contacts */}
              {activeAccountTab === "contacts" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-meta font-bold uppercase tracking-wider text-ink-dim">
                        Buying Committee & Stakeholders
                      </h3>
                      <p className="text-spec text-ink-faint mt-0.5">
                        Key council engineers, procurement contacts, and specifiers at {selectedAccount.name}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setContactToEdit(null);
                        setIsContactModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-meta font-semibold text-white bg-brand-deep hover:bg-brand-deep rounded-edge shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Contact
                    </button>
                  </div>

                  {accountContacts.length === 0 ? (
                    <div className="p-8 text-center bg-raised rounded-panel border border-dashed border-line space-y-3">
                      <Users className="w-8 h-8 text-ink-faint mx-auto" />
                      <div>
                        <div className="text-meta font-bold">No Stakeholders Listed</div>
                        <div className="text-spec text-ink-dim">
                          Add the primary engineer, lighting asset officer, or procurement contact for this account.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setContactToEdit(null);
                          setIsContactModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-meta font-semibold text-brand-deep bg-brand-wash hover:bg-brand-wash border border-brand-edge rounded-edge transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Contact
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accountContacts.map((contact) => (
                        <div key={contact.id} className="p-4 bg-white border border-line rounded-panel shadow-xs space-y-3 hover:border-line-strong transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-body">
                                  {contact.firstName} {contact.lastName}
                                </span>
                                {contact.isDecisionMaker && (
                                  <span className="px-2 py-0.5 bg-hold-wash text-hold border border-hold rounded-full text-spec font-bold flex items-center gap-1">
                                    <UserCheck className="w-2.5 h-2.5" /> Decision Maker
                                  </span>
                                )}
                              </div>
                              <div className="text-meta text-ink-dim font-medium">{contact.jobTitle}</div>
                              {contact.department && <div className="text-spec text-ink-faint">{contact.department}</div>}
                            </div>
                            
                            <button
                              onClick={() => {
                                setContactToEdit(contact);
                                setIsContactModalOpen(true);
                              }}
                              className="p-1.5 text-ink-faint hover:text-ink hover:bg-paper rounded-edge transition-colors flex items-center gap-1 text-spec font-semibold border border-line bg-raised cursor-pointer"
                              title="Edit Contact"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-ink-dim" />
                              <span>Edit</span>
                            </button>
                          </div>

                          <div className="space-y-1.5 text-meta text-ink-dim pt-2 border-t border-line">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <a href={`mailto:${contact.email}`} className="text-brand-deep hover:underline truncate">{contact.email}</a>
                              </div>
                              <span className="text-spec px-1.5 py-0.5 bg-paper text-ink-dim rounded">
                                {contact.preferredContactMethod || "Email"}
                              </span>
                            </div>

                            {contact.mobile && (
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <span>{contact.mobile}</span>
                              </div>
                            )}

                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>

                          {contact.notes && (
                            <div className="p-2 bg-raised rounded-edge border border-line text-spec text-ink-dim line-clamp-2">
                              {contact.notes}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-spec pt-2 border-t border-line text-ink-dim">
                            <span>Role: <strong className="text-body">{contact.roleInBuyingProcess}</strong></span>
                            <div className="flex items-center gap-2">
                              <span>Influence: <strong className="text-body">{contact.influenceLevel}</strong></span>
                              <span className={`px-1.5 py-0.5 rounded text-spec font-semibold ${
                                contact.relationshipStatus === "Strong"
                                  ? "bg-brand-wash text-brand-deep"
                                  : contact.relationshipStatus === "Warm"
                                  ? "bg-hold-wash text-hold"
                                  : contact.relationshipStatus === "Cold"
                                  ? "bg-urgent-wash text-urgent"
                                  : "bg-paper text-body"
                              }`}>
                                {contact.relationshipStatus}
                              </span>
                            </div>
                          </div>

                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {contact.tags.map((t, idx) => (
                                <span key={idx} className="text-spec px-2 py-0.5 bg-paper text-ink-dim rounded-edge">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Opportunities */}
              {activeAccountTab === "deals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-meta font-bold uppercase tracking-wider text-ink-dim">
                      Active & Historical Opportunities
                    </h3>
                    <button
                      onClick={() => navigateToCRM("pipeline")}
                      className="text-meta font-semibold text-brand-deep hover:text-brand-deep flex items-center gap-1"
                    >
                      + Create Opportunity
                    </button>
                  </div>

                  <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                    {accountDeals.length === 0 ? (
                      <div className="p-8 text-center text-meta text-ink-dim">
                        No opportunities linked to this account yet.
                      </div>
                    ) : (
                      accountDeals.map((deal) => (
                        <div
                          key={deal.id}
                          onClick={() => navigateToCRM("pipeline", deal.id)}
                          className="p-4 hover:bg-raised cursor-pointer transition-colors flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-meta font-bold px-2 py-0.5 rounded-full bg-paper">
                                {deal.stageName}
                              </span>
                              <span className="text-meta text-ink-faint">·</span>
                              <span className="text-meta text-ink-dim">{deal.projectApplication}</span>
                            </div>
                            <div className="text-body font-semibold">{deal.name}</div>
                            <div className="text-meta text-ink-dim">Next: {deal.nextAction || "None"}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-body font-bold">${deal.dealValue.toLocaleString()}</div>
                            <div className="text-meta text-ink-dim">{deal.probability}% probability</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Activity Timeline */}
              {activeAccountTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-meta font-bold uppercase tracking-wider text-ink-dim">
                      Interaction History
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openQuickLog("call", selectedAccount.id)}
                        className="text-meta font-semibold hover:text-ink"
                      >
                        + Call
                      </button>
                      <button
                        onClick={() => openQuickLog("note", selectedAccount.id)}
                        className="text-meta font-semibold hover:text-ink"
                      >
                        + Note
                      </button>
                    </div>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                    {accountActivities.length === 0 ? (
                      <div className="text-meta text-ink-dim py-4">No activities logged for this account yet.</div>
                    ) : (
                      accountActivities.map((act) => (
                        <div key={act.id} className="relative space-y-1">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-deep ring-4 ring-white" />
                          <div className="flex items-center justify-between text-meta">
                            <span className="font-bold text-body">{act.title}</span>
                            <span className="text-ink-faint text-spec">
                              {new Date(act.timestamp).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <p className="text-meta text-ink-dim">{act.description}</p>
                          <div className="text-spec text-ink-faint">Logged by {act.performedBy}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

                            {/* Tab 5: AI Intelligence */}
              {activeAccountTab === "ai-summary" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-panel border border-brand-edge p-6 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-edge pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-brand-deep text-white rounded">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <h3 className="text-base font-bold text-body">
                            Grounded Account Intelligence &amp; Preparation
                          </h3>
                        </div>
                        <p className="text-meta text-ink-dim mt-0.5">
                          Synthesised from recorded customer activities, open opportunities, and competitor intelligence.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isCachedSummary && !isAiLoading && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                            Cached Synthesis ({aiSummary?.generatedAt ? new Date(aiSummary.generatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : "Saved"})
                          </span>
                        )}
                        {aiSummary?.generatedAt && !isCachedSummary && (
                          <span className="text-spec text-ink-faint">
                            Live Synthesis: {new Date(aiSummary.generatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        <button
                          onClick={() => handleFetchAiSummary(selectedAccount, true)}
                          disabled={isAiLoading}
                          className="px-3 py-1.5 text-meta font-bold bg-brand-wash text-brand-deep border border-brand-edge rounded-edge hover:bg-brand-wash disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Force live re-analysis against latest CRM notes and deals"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isAiLoading ? "Synthesising..." : "Refresh Summary"}</span>
                        </button>
                      </div>
                    </div>

                    {isAiLoading && (
                      <div className="p-8 text-center space-y-2">
                        <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-meta text-ink-dim">Analyzing CRM interactions, deals, and competitor records...</p>
                      </div>
                    )}

                    {aiError && !isAiLoading && (
                      <div className="p-4 bg-urgent-wash border border-urgent/30 rounded-edge text-meta text-urgent space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          AI Service Notice
                        </div>
                        <p>{aiError}</p>
                        <p className="text-spec text-ink-dim">
                          Configure GEMINI_API_KEY in .env.local to enable real-time account synthesis.
                        </p>
                      </div>
                    )}

                    {aiSummary && !isAiLoading && (
                      <div className="space-y-5">
                        {/* Executive Summary */}
                        <div className="p-4 bg-brand-wash/30 rounded-edge border border-brand-edge/60 text-meta leading-relaxed">
                          <div className="text-spec font-bold uppercase text-brand-deep mb-1">
                            Account Relationship Summary
                          </div>
                          <p className="text-body font-medium">{aiSummary.accountSummary}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-meta">
                          {/* Known Requirements */}
                          <div className="p-4 bg-raised rounded-edge border border-line space-y-2">
                            <div className="font-bold text-body flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                              Confirmed Technical Requirements
                            </div>
                            {aiSummary.knownRequirements && aiSummary.knownRequirements.length > 0 ? (
                              <ul className="space-y-1 pl-4 list-disc text-spec">
                                {aiSummary.knownRequirements.map((req, i) => (
                                  <li key={i}>{req}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-spec text-ink-dim italic">No specific technical requirements recorded yet.</p>
                            )}
                          </div>

                          {/* Commercial Intelligence */}
                          <div className="p-4 bg-raised rounded-edge border border-line space-y-2">
                            <div className="font-bold text-body flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-brand-deep" />
                              Commercial &amp; Competitor Intelligence
                            </div>
                            {aiSummary.commercialIntelligence && aiSummary.commercialIntelligence.length > 0 ? (
                              <ul className="space-y-1 pl-4 list-disc text-spec">
                                {aiSummary.commercialIntelligence.map((intel, i) => (
                                  <li key={i}>{intel}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-spec text-ink-dim italic">No competitor pricing or tender schedule observed yet.</p>
                            )}
                          </div>
                        </div>

                        {/* Risks Matrix */}
                        {aiSummary.risks && aiSummary.risks.length > 0 && (
                          <div className="p-4 bg-raised rounded-edge border border-line space-y-2 text-meta">
                            <div className="font-bold text-urgent flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              Relationship &amp; Project Risks
                            </div>
                            <div className="space-y-2">
                              {aiSummary.risks.map((risk, i) => (
                                <div key={i} className="flex items-start justify-between gap-3 text-spec p-2 bg-white rounded border border-line">
                                  <span className="text-body font-medium">{risk.statement}</span>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-urgent-wash text-urgent shrink-0">
                                    {risk.sourceType}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended Next Actions */}
                        {aiSummary.recommendedNextActions && aiSummary.recommendedNextActions.length > 0 && (
                          <div className="p-4 bg-raised rounded-edge border border-line space-y-2 text-meta">
                            <div className="font-bold text-brand-deep flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" />
                              Recommended Next Actions
                            </div>
                            <div className="space-y-2">
                              {aiSummary.recommendedNextActions.map((item, i) => (
                                <div key={i} className="p-2.5 bg-white rounded border border-brand-edge text-spec space-y-1">
                                  <div className="font-bold text-body">{item.action}</div>
                                  <div className="text-ink-dim italic">Why: {item.reason}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-panel border border-line p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <Building2 className="w-10 h-10 text-ink-faint mb-3" />
            <h3 className="font-bold text-body text-ink">No Account Selected</h3>
            <p className="text-spec text-ink-dim mt-1 max-w-sm">
              Select an account from the directory or create a new customer account to view 360° details.
            </p>
            <button
              onClick={() => setIsNewAccountModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-spec font-bold text-white bg-brand-deep rounded-edge hover:bg-brand transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Account</span>
            </button>
          </div>
        )}
      </div>

      {/* New Account Modal */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 bg-chrome/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-body">Create New Account</h3>
              <button
                onClick={() => setIsNewAccountModalOpen(false)}
                className="text-ink-faint hover:text-ink-dim text-body"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-meta">
              <div>
                <label className="block font-semibold text-body mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City of Parramatta Council"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Customer Segment</label>
                  <select
                    value={newAccountForm.customerSegment}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, customerSegment: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="Local Government / Council">Local Government / Council</option>
                    <option value="Civil Contractor">Civil Contractor</option>
                    <option value="Electrical Contractor">Electrical Contractor</option>
                    <option value="Commercial Developer">Commercial Developer</option>
                    <option value="Mining & Resources">Mining & Resources</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Territory</label>
                  <select
                    value={newAccountForm.territory}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, territory: e.target.value as any })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  >
                    <option value="QLD/NT">QLD/NT</option>
                    <option value="NSW/ACT">NSW/ACT</option>
                    <option value="VIC/TAS">VIC/TAS</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-body mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="(02) 9000 0000"
                    value={newAccountForm.mainPhone}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, mainPhone: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-body mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="info@council.gov.au"
                    value={newAccountForm.generalEmail}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, generalEmail: e.target.value })}
                    className="w-full p-2 border border-line-strong rounded-edge"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-body mb-1">Account Notes & Spec Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Key standards, wildlife CCT preferences, etc."
                  value={newAccountForm.notes}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, notes: e.target.value })}
                  className="w-full p-2 border border-line-strong rounded-edge"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-4 py-2 text-ink-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-deep rounded-edge hover:bg-brand-deep"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Competitor Pricing Structured Modal */}
      {isCompetitorModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-chrome/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-deep" />
                <h3 className="text-lg font-bold text-body">
                  {editingCompetitorRecord ? "Edit Competitor Pricing" : "Record Competitor Pricing"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCompetitorModalOpen(false);
                  resetCompetitorForm();
                }}
                className="text-ink-faint hover:text-ink p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompetitorPricing} className="space-y-3.5 text-meta">
              <div className="p-2.5 bg-paper rounded-edge border border-line text-spec text-ink-dim">
                Customer Account: <strong className="text-body">{selectedAccount.name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Competitor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leadsun, Orca Solar"
                    value={competitorForm.competitorName}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, competitorName: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Competitor Model / Product *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AE3 30W All-In-One"
                    value={competitorForm.competitorProduct}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, competitorProduct: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Observed Price ($ AUD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={competitorForm.price}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-paper rounded-edge border border-line font-bold text-brand-deep text-meta"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Price Basis *
                  </label>
                  <select
                    value={competitorForm.priceBasis}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, priceBasis: e.target.value as CompetitorPriceBasis })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Per Unit">Per Unit</option>
                    <option value="Per System">Per System</option>
                    <option value="Project Total">Project Total</option>
                    <option value="Supply Only">Supply Only</option>
                    <option value="Installed">Installed</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    GST Treatment
                  </label>
                  <select
                    value={competitorForm.gstStatus}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, gstStatus: e.target.value as CompetitorGstStatus })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Ex GST">Ex GST</option>
                    <option value="Inc GST">Inc GST</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Intelligence Source *
                  </label>
                  <select
                    value={competitorForm.sourceType}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, sourceType: e.target.value as CompetitorSourceType })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Customer Verbal">Customer Verbal</option>
                    <option value="Competitor Quote">Competitor Quote</option>
                    <option value="Tender Schedule">Tender Schedule</option>
                    <option value="Email">Email</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Date Observed *
                  </label>
                  <input
                    type="date"
                    required
                    value={competitorForm.observedDate}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, observedDate: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Quantity (if known)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={competitorForm.quantity}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, quantity: e.target.value })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                    Status
                  </label>
                  <select
                    value={competitorForm.status}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, status: e.target.value as CompetitorPricingStatus })}
                    className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                  >
                    <option value="Active">Active</option>
                    <option value="Superseded">Superseded</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold uppercase text-ink-dim mb-1">
                  Context, Scope &amp; Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Includes delivery? Battery enclosure type? Lead times mentioned?"
                  value={competitorForm.notes}
                  onChange={(e) => setCompetitorForm({ ...competitorForm, notes: e.target.value })}
                  className="w-full p-2 bg-paper rounded-edge border border-line text-meta"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompetitorModalOpen(false);
                    resetCompetitorForm();
                  }}
                  className="px-4 py-2 text-ink-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-brand-deep rounded-edge hover:bg-brand transition-colors cursor-pointer shadow-xs"
                >
                  {editingCompetitorRecord ? "Update Intelligence" : "Save & Alert Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Contact Modal (Add & Edit) */}
      {selectedAccount && (
        <CRMContactModal
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false);
            setContactToEdit(null);
          }}
          onSave={(contactData, existingId) => {
            if (existingId) {
              updateContact(existingId, contactData);
            } else {
              addContact({
                ...contactData,
                id: `con-${Date.now()}`
              });
            }
          }}
          onDelete={(contactId) => {
            deleteContact(contactId);
          }}
          contactToEdit={contactToEdit}
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountWebsite={selectedAccount.website}
          accountOwner={selectedAccount.accountOwner}
        />
      )}

      {/* P2-13: CRM Duplicate Account Warning Modal */}
      {isDuplicateModalOpen && duplicateMatch && pendingAccountToCreate && (
        <CRMDuplicateWarningModal<Account>
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateMatch(null);
            setPendingAccountToCreate(null);
          }}
          entityType="Account"
          candidateName={pendingAccountToCreate.name}
          matchResult={duplicateMatch}
          onOpenExisting={(existingAcc) => {
            setSelectedAccountId(existingAcc.id);
            setIsNewAccountModalOpen(false);
            showToast(`Navigated to existing account "${existingAcc.name}"`, "info");
          }}
          onUseExisting={(existingAcc) => {
            setSelectedAccountId(existingAcc.id);
            setIsNewAccountModalOpen(false);
            showToast(`Attached to existing account "${existingAcc.name}"`, "success");
          }}
          onCreateAnyway={() => {
            addAccount(pendingAccountToCreate);
            setSelectedAccountId(pendingAccountToCreate.id);
            setIsNewAccountModalOpen(false);
            showToast(`Created new account "${pendingAccountToCreate.name}" (Duplicate override audit recorded)`, "warning");
          }}
        />
      )}
    </div>
  );
};
