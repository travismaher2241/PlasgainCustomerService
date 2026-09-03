import React, { useState, useEffect, useRef } from "react";
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
  Archive,
  ArchiveRestore,
  Smartphone,
  TrendingUp,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  X,
  PhoneCall,
  Check
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  Account,
  AccountType,
  CRMContact,
  CRMOpportunity,
  CustomerRelationshipStatus,
  ProspectStage,
  CompetitorPricingRecord,
  CompetitorPriceBasis,
  CompetitorGstStatus,
  CompetitorSourceType,
  CompetitorPricingStatus,
  AccountIntelligenceSummary
} from "../../types/crm";
import { CRMContactModal } from "./CRMContactModal";
import { getLocalDateInputValue } from "../../utils/dateUtils";
import { sortActivitiesChronological, formatActivityTimestamp } from "../../utils/activityUtils";
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
    addCrmOpportunity,
    setSelectedCrmOpportunityId,
    openQuickLog,
    openEmailComposer,
    openCallPrep,
    navigateToCRM,
    currentUser,
    teamMembers,
    competitorPricingRecords,
    addCompetitorPricing,
    updateCompetitorPricing,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<"all" | AccountType>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [activeAccountTab, setActiveAccountTab] = useState<
    "overview" | "contacts" | "deals" | "activity" | "brief" | "competitors"
  >("overview");

  // State for mobile drill-down
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Expanded details toggle in Overview
  const [showFullOverviewDetails, setShowFullOverviewDetails] = useState(false);

  // Selected contact for detail drawer
  const [drawerContact, setDrawerContact] = useState<CRMContact | null>(null);

  // Header management menu
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Deals tab filter: active vs closed
  const [dealsFilter, setDealsFilter] = useState<"active" | "closed" | "all">("active");

  // Activity tab filter
  const [activityFilter, setActivityFilter] = useState<"all" | "call" | "email" | "meeting" | "note">("all");
  const [activityUserFilter, setActivityUserFilter] = useState("all");
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());

  // New Deal Modal State (Pre-fills current account!)
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    name: "",
    dealValue: 25000,
    stageName: "Discovery & Qualification" as const,
    expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    primaryContactId: "",
    projectApplication: "Solar Public Lighting",
    notes: ""
  });

  // Account Edit Modal State
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editAccountForm, setEditAccountForm] = useState({
    name: "",
    tradingName: "",
    accountType: "Prospect" as AccountType,
    status: "Prospect" as const,
    industry: "Government & Public Infrastructure",
    territory: "VIC/TAS" as const,
    accountOwner: currentUser.name,
    mainPhone: "",
    generalEmail: "",
    website: "",
    notes: "",
    customerRelationshipStatus: "Active" as CustomerRelationshipStatus,
    prospectStage: "Identified" as ProspectStage
  });

  // AI Account Summary / Account Brief
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
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [showTechnicalIntel, setShowTechnicalIntel] = useState(false);

  // Duplicate Account Detection State
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatchResult<Account> | null>(null);
  const [pendingAccountToCreate, setPendingAccountToCreate] = useState<Account | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Create new account modal state
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    name: "",
    tradingName: "",
    accountType: "Prospect" as AccountType,
    status: "Prospect" as const,
    industry: "Government & Public Infrastructure",
    territory: "VIC/TAS" as const,
    accountOwner: currentUser.name,
    mainPhone: "",
    generalEmail: "",
    website: "",
    notes: "",
    customerRelationshipStatus: "Active" as CustomerRelationshipStatus,
    prospectStage: "Identified" as ProspectStage
  });

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<CRMContact | null>(null);

  // Competitor Pricing Modal State
  const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false);
  const [editingCompetitorRecord, setEditingCompetitorRecord] = useState<CompetitorPricingRecord | null>(null);
  const [competitorForm, setCompetitorForm] = useState({
    competitorName: "",
    competitorProduct: "",
    price: 1850,
    plasgainQuotedPrice: "" as string | number,
    currency: "AUD",
    priceBasis: "Per Unit" as CompetitorPriceBasis,
    gstStatus: "Ex GST" as CompetitorGstStatus,
    quantity: "" as string | number,
    sourceType: "Customer Verbal" as CompetitorSourceType,
    observedDate: getLocalDateInputValue(),
    notes: "",
    status: "Active" as CompetitorPricingStatus
  });

  // Close header menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Visual badge for Account Type (Prospect, Account, Council)
  const getAccountTypeBadge = (type?: AccountType, size: "sm" | "md" = "md") => {
    const normalized: AccountType = type || "Prospect";
    const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

    if (normalized === "Council") {
      return (
        <span className={`font-bold rounded-full border border-blue-300 bg-blue-50 text-blue-800 inline-flex items-center gap-1 shadow-2xs ${sizeClasses}`}>
          <span>🏛️</span>
          <span>Council</span>
        </span>
      );
    }
    if (normalized === "Account") {
      return (
        <span className={`font-bold rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 inline-flex items-center gap-1 shadow-2xs ${sizeClasses}`}>
          <span>🏢</span>
          <span>Account</span>
        </span>
      );
    }
    return (
      <span className={`font-bold rounded-full border border-amber-300 bg-amber-50 text-amber-900 inline-flex items-center gap-1 shadow-2xs ${sizeClasses}`}>
        <span>🎯</span>
        <span>Prospect</span>
      </span>
    );
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const isArchived = Boolean(acc.isArchived || acc.status === "Archived");
    const matchesArchive =
      archiveFilter === "all" ? true : archiveFilter === "archived" ? isArchived : !isArchived;

    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.tradingName && acc.tradingName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      acc.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.territory.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      accountTypeFilter === "all" ||
      (acc.accountType || "Prospect") === accountTypeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      acc.customerRelationshipStatus === statusFilter ||
      acc.prospectStage === statusFilter;
    return matchesArchive && matchesSearch && matchesType && matchesStatus;
  });

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ||
    filteredAccounts[0] ||
    accounts[0];

  const accountContacts = contacts.filter((c) => c.accountId === selectedAccount?.id);
  const accountDeals = crmOpportunities.filter((d) => d.accountId === selectedAccount?.id);
  const accountActivities = sortActivitiesChronological(
    activities.filter((act) => act.accountId === selectedAccount?.id),
    "newest"
  );
  const accountCompetitorPricing = competitorPricingRecords.filter((r) => r.accountId === selectedAccount?.id);

  // Fetch Account Brief
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
      opportunities: accDeals.map((d) => ({
        updatedAt: d.latestActivityDate,
        stage: d.stageName,
        estimatedValue: d.dealValue
      })),
      activities: accActivities
    });

    if (!forceRefresh) {
      const cached = accountIntelligenceCache.get(acc.id, sourceHash);
      if (cached) {
        setAiSummary(cached.summary);
        setCacheTimestamp(cached.cachedAt);
        setIsAiLoading(false);
        return;
      }
    }

    setIsAiLoading(true);
    setAiError(null);
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
      accountIntelligenceCache.set(acc.id, sourceHash, data.summary);

      if (forceRefresh) {
        showToast("Refreshed Account brief!", "success");
      }
    } catch (err: any) {
      const cachedFallback = accountIntelligenceCache.get(acc.id);
      if (cachedFallback) {
        setAiSummary(cachedFallback.summary);
        setCacheTimestamp(cachedFallback.cachedAt);
      } else {
        setAiError(err.message || "Account brief is currently unavailable");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccountTab === "brief" && selectedAccount) {
      if (accountAiCache[selectedAccount.id]) {
        setAiSummary(accountAiCache[selectedAccount.id]);
      } else if (!isAiLoading) {
        handleFetchAiSummary(selectedAccount, false);
      }
    }
  }, [activeAccountTab, selectedAccount?.id]);

  // Handle Archive / Restore Toggle
  const handleArchiveToggle = (accountToToggle: Account) => {
    const isNowArchived = !accountToToggle.isArchived;
    updateAccount(accountToToggle.id, {
      isArchived: isNowArchived,
      archivedDate: isNowArchived ? new Date().toISOString().split("T")[0] : undefined,
      archivedReason: isNowArchived ? "Manually archived by user" : undefined,
      status: isNowArchived ? "Archived" : (accountToToggle.accountType === "Prospect" ? "Prospect" : "Customer")
    });
    showToast(
      isNowArchived
        ? `Account "${accountToToggle.name}" archived.`
        : `Account "${accountToToggle.name}" restored to active list.`,
      "info"
    );
  };

  // Handle Delete Account
  const handleDeleteAccount = async (accountToDelete: Account) => {
    if (
      window.confirm(
        `Permanently delete "${accountToDelete.name}"?\n\nThis will remove the account record from your workspace.`
      )
    ) {
      await deleteAccount(accountToDelete.id);
      showToast(`Account "${accountToDelete.name}" deleted.`, "info");
    }
  };

  // Handle New Account Creation
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.name.trim()) return;

    const isProspect = newAccountForm.accountType === "Prospect";

    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name: newAccountForm.name.trim(),
      tradingName: newAccountForm.tradingName.trim(),
      accountType: newAccountForm.accountType,
      status: isProspect ? "Prospect" : "Customer",
      customerRelationshipStatus: isProspect ? undefined : newAccountForm.customerRelationshipStatus || "Active",
      prospectStage: isProspect ? newAccountForm.prospectStage || "Identified" : undefined,
      industry: newAccountForm.industry,
      territory: newAccountForm.territory,
      accountOwner: newAccountForm.accountOwner,
      leadSource: "Direct Contact",
      createdDate: new Date().toISOString().split("T")[0],
      lastInteractionDate: new Date().toISOString().split("T")[0],
      mainPhone: newAccountForm.mainPhone,
      generalEmail: newAccountForm.generalEmail,
      website: newAccountForm.website,
      notes: newAccountForm.notes,
      tags: [newAccountForm.accountType],
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
    showToast(`Account "${newAcc.name}" (${newAcc.accountType}) created.`, "success");
  };

  // Open Edit Account Modal
  const openEditAccountModal = () => {
    if (!selectedAccount) return;
    const isProspect = selectedAccount.accountType === "Prospect";
    setEditAccountForm({
      name: selectedAccount.name,
      tradingName: selectedAccount.tradingName || "",
      accountType: selectedAccount.accountType || "Prospect",
      status: selectedAccount.status || (isProspect ? "Prospect" : "Customer"),
      industry: selectedAccount.industry || "Government & Public Infrastructure",
      territory: selectedAccount.territory || "VIC/TAS",
      accountOwner: selectedAccount.accountOwner || currentUser.name,
      mainPhone: selectedAccount.mainPhone || selectedAccount.phone || "",
      generalEmail: selectedAccount.generalEmail || "",
      website: selectedAccount.website || "",
      notes: selectedAccount.notes || "",
      customerRelationshipStatus: selectedAccount.customerRelationshipStatus || "Active",
      prospectStage: selectedAccount.prospectStage || "Identified"
    });
    setIsEditAccountModalOpen(true);
  };

  // Handle Account Update
  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !editAccountForm.name.trim()) return;

    const isProspect = editAccountForm.accountType === "Prospect";

    updateAccount(selectedAccount.id, {
      name: editAccountForm.name.trim(),
      tradingName: editAccountForm.tradingName.trim(),
      accountType: editAccountForm.accountType,
      status: isProspect ? "Prospect" : "Customer",
      customerRelationshipStatus: isProspect ? undefined : editAccountForm.customerRelationshipStatus,
      prospectStage: isProspect ? editAccountForm.prospectStage : undefined,
      industry: editAccountForm.industry,
      territory: editAccountForm.territory,
      accountOwner: editAccountForm.accountOwner,
      mainPhone: editAccountForm.mainPhone,
      generalEmail: editAccountForm.generalEmail,
      website: editAccountForm.website,
      notes: editAccountForm.notes
    });

    setIsEditAccountModalOpen(false);
    showToast(`Account "${editAccountForm.name}" updated successfully.`, "success");
  };

  // Handle New Deal Creation (Context preselected!)
  const handleCreateDealFromAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !newDealForm.name.trim()) return;

    const matchedContact = accountContacts.find((c) => c.id === newDealForm.primaryContactId) || accountContacts[0];

    const newDeal: CRMOpportunity = {
      id: `opp-${Date.now()}`,
      name: newDealForm.name,
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      primaryContactId: matchedContact?.id,
      primaryContactName: matchedContact?.name,
      primaryContactEmail: matchedContact?.email,
      primaryContactPhone: matchedContact?.phone,
      opportunityOwner: selectedAccount.accountOwner || currentUser.name,
      pipelineId: "pipe-major-projects",
      stageId: "stage-discovery",
      stageName: newDealForm.stageName,
      dealValue: Number(newDealForm.dealValue) || 0,
      weightedValue: (Number(newDealForm.dealValue) || 0) * 0.25,
      probability: 25,
      forecastCategory: "Pipeline",
      expectedCloseDate: newDealForm.expectedCloseDate,
      products: [
        {
          id: `prod-0`,
          productCode: "PB-75W-3K",
          productName: "Plasgain Pro Blade 75 Solar Luminaire",
          category: "Solar Public Lighting",
          quantity: 1
        }
      ],
      projectApplication: newDealForm.projectApplication,
      location: selectedAccount.territory,
      customerNeed: newDealForm.notes,
      keyRequirements: ["Verify AS/NZS 1158 compliance"],
      source: "Account Rep Engagement",
      latestActivity: `Deal created for ${selectedAccount.name} by ${currentUser.name}`,
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: "Issue preliminary luminaire specification and schedule initial design call",
      nextActionDate: new Date().toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["Newly created deal under active customer account"],
      notes: newDealForm.notes
    };

    addCrmOpportunity(newDeal);
    setIsNewDealModalOpen(false);
    showToast(`New deal "${newDeal.name}" added for ${selectedAccount.name}`, "success");
  };

  const getCustomerStatusBadge = (status?: CustomerRelationshipStatus) => {
    const st = status || "Active";
    switch (st) {
      case "Active":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Active
          </span>
        );
      case "Developing":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-sky-50 text-sky-800 border border-sky-200">
            Developing
          </span>
        );
      case "Occasional":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-slate-100 text-slate-700 border border-slate-300">
            Occasional
          </span>
        );
      case "At Risk":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-amber-50 text-amber-800 border border-amber-300">
            At Risk
          </span>
        );
      case "Dormant":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-stone-100 text-stone-600 border border-stone-300">
            Dormant
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {st}
          </span>
        );
    }
  };

  const getProspectStageBadge = (stage?: ProspectStage) => {
    const sg = stage || "Identified";
    switch (sg) {
      case "Identified":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-slate-100 text-slate-700 border border-slate-300">
            Identified
          </span>
        );
      case "Researching":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-slate-100 text-slate-800 border border-slate-300">
            Researching
          </span>
        );
      case "Contacting":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Contacting
          </span>
        );
      case "Engaged":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Engaged
          </span>
        );
      case "Opportunity Identified":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            Opportunity Identified
          </span>
        );
      case "Nurture":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-purple-50 text-purple-800 border border-purple-200">
            Nurture
          </span>
        );
      case "Not Pursuing":
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
            Not Pursuing
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-spec font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {sg}
          </span>
        );
    }
  };

  const renderAccountStatusBadge = (acc: Account) => {
    if (acc.accountType === "Prospect") {
      return getProspectStageBadge(acc.prospectStage || "Identified");
    }
    return getCustomerStatusBadge(acc.customerRelationshipStatus || "Active");
  };

  // Group activities by date
  const groupedActivities = accountActivities.reduce((acc, act) => {
    const d = act.timestamp ? act.timestamp.split("T")[0] : "Recent";
    let groupLabel = d;
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (d === todayStr) groupLabel = "Today";
    else if (d === yesterday) groupLabel = "Yesterday";
    if (!acc[groupLabel]) acc[groupLabel] = [];
    acc[groupLabel].push(act);
    return acc;
  }, {} as Record<string, typeof accountActivities>);

  // Empty state when no accounts exist
  if (accounts.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 w-full min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Accounts</h1>
          <button
            onClick={() => setIsNewAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-spec font-bold text-white bg-brand-deep hover:bg-brand rounded-edge transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add account</span>
          </button>
        </div>

        <div className="p-12 text-center space-y-3 bg-white rounded-panel border border-line shadow-2xs">
          <Building2 className="w-10 h-10 text-ink-faint mx-auto" />
          <h2 className="text-base font-bold text-body">No accounts yet</h2>
          <p className="text-spec text-ink-dim max-w-md mx-auto">
            Create an account to track customer organisations, key stakeholders, opportunities, and interactions.
          </p>
          <button
            onClick={() => setIsNewAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-spec font-bold text-white bg-brand-deep hover:bg-brand rounded-edge transition-colors shadow-xs cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add account</span>
          </button>
        </div>

        {/* Modal */}
        {isNewAccountModalOpen && (
          <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-acc-title"
              className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 id="new-acc-title" className="font-bold text-body text-base">Add New Account</h3>
                <button onClick={() => setIsNewAccountModalOpen(false)} className="text-ink-dim hover:text-body">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Account / Company Name *</label>
                  <input
                    required
                    value={newAccountForm.name}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    placeholder="e.g. City of Melton Council"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-spec font-bold mb-1">Account Type *</label>
                    <select
                      required
                      aria-label="Account Type"
                      value={newAccountForm.accountType}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, accountType: e.target.value as AccountType })}
                      className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                    >
                      <option value="Prospect">Prospect</option>
                      <option value="Account">Account</option>
                      <option value="Council">Council</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-spec font-bold mb-1">Territory</label>
                    <select
                      value={newAccountForm.territory}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, territory: e.target.value as any })}
                      className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                    >
                      <option>VIC/TAS</option>
                      <option>NSW/ACT</option>
                      <option>QLD/NT</option>
                      <option>WA/SA</option>
                      <option>National / Key Accounts</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsNewAccountModalOpen(false)}
                    className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* PART A: SINGLE CONSISTENT PAGE HEADING & TOP ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-body tracking-tight">Accounts</h1>
          <p className="text-spec text-ink-dim mt-0.5">
            Manage customer organisations, buying committees, active opportunities, and interaction history.
          </p>
        </div>
        <button
          onClick={() => setIsNewAccountModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-spec font-bold text-white bg-brand-deep hover:bg-brand rounded-edge transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add account</span>
        </button>
      </div>

      {/* PART D: 2-COLUMN DIRECTORY / DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: ACCOUNTS DIRECTORY (PART B & C) */}
        <div
          className={`lg:col-span-4 bg-white rounded-panel border border-line shadow-2xs overflow-hidden flex flex-col h-auto max-h-[520px] lg:h-[820px] lg:max-h-none ${
            mobileShowDetail ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* ACTIVE VS ARCHIVED FILTER TABS */}
          <div className="p-2 border-b border-line bg-paper/60 flex items-center gap-1 text-spec">
            <button
              type="button"
              onClick={() => setArchiveFilter("active")}
              className={`flex-1 py-1 px-2 rounded-edge text-spec font-bold transition-all text-center cursor-pointer ${
                archiveFilter === "active"
                  ? "bg-chrome text-white shadow-2xs"
                  : "text-ink-dim hover:text-ink hover:bg-white"
              }`}
            >
              Active ({accounts.filter((a) => !a.isArchived && a.status !== "Archived").length})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter("archived")}
              className={`flex-1 py-1 px-2 rounded-edge text-spec font-bold transition-all text-center cursor-pointer ${
                archiveFilter === "archived"
                  ? "bg-chrome text-white shadow-2xs"
                  : "text-ink-dim hover:text-ink hover:bg-white"
              }`}
            >
              Archived ({accounts.filter((a) => a.isArchived || a.status === "Archived").length})
            </button>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="p-3 border-b border-line space-y-2 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search accounts by name, territory, contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-spec border border-line rounded-edge bg-white placeholder:text-ink-dim/60 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Filter by account type"
                value={accountTypeFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setAccountTypeFilter(val);
                  setStatusFilter("all");
                }}
                className="p-1.5 text-xs border border-line rounded-edge bg-white text-ink font-semibold"
              >
                <option value="all">All Types</option>
                <option value="Prospect">Prospect</option>
                <option value="Customer">Customer</option>
                <option value="Council">Council</option>
                <option value="Account">Account</option>
              </select>

              <select
                aria-label="Filter by status or stage"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 text-xs border border-line rounded-edge bg-white text-ink font-medium"
              >
                {accountTypeFilter === "all" && (
                  <>
                    <option value="all">All Statuses &amp; Stages</option>
                    <optgroup label="Customer Relationship Status">
                      <option value="Active">Active</option>
                      <option value="Developing">Developing</option>
                      <option value="Occasional">Occasional</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Dormant">Dormant</option>
                    </optgroup>
                    <optgroup label="Prospect Stage">
                      <option value="Identified">Identified</option>
                      <option value="Researching">Researching</option>
                      <option value="Contacting">Contacting</option>
                      <option value="Engaged">Engaged</option>
                      <option value="Opportunity Identified">Opportunity Identified</option>
                      <option value="Nurture">Nurture</option>
                      <option value="Not Pursuing">Not Pursuing</option>
                    </optgroup>
                  </>
                )}
                {accountTypeFilter === "Prospect" && (
                  <>
                    <option value="all">All Prospect Stages</option>
                    <option value="Identified">Identified</option>
                    <option value="Researching">Researching</option>
                    <option value="Contacting">Contacting</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Opportunity Identified">Opportunity Identified</option>
                    <option value="Nurture">Nurture</option>
                    <option value="Not Pursuing">Not Pursuing</option>
                  </>
                )}
                {accountTypeFilter !== "all" && accountTypeFilter !== "Prospect" && (
                  <>
                    <option value="all">All Relationship Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Developing">Developing</option>
                    <option value="Occasional">Occasional</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Dormant">Dormant</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* SCROLLABLE COMPACT ACCOUNT ROWS */}
          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {filteredAccounts.length === 0 ? (
              <div className="p-8 text-center text-ink-dim space-y-1 text-spec">
                <Building2 className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                <p className="font-semibold text-body">No matching accounts found</p>
                <p className="text-xs">Adjust search query or filter options.</p>
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const isSelected = selectedAccount?.id === acc.id;
                const isArchived = Boolean(acc.isArchived || acc.status === "Archived");

                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setMobileShowDetail(true);
                    }}
                    className={`p-3 transition-colors cursor-pointer border-l-4 ${
                      isSelected
                        ? "border-brand-deep bg-brand-wash/40"
                        : "border-transparent hover:bg-raised/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-body text-spec truncate" title={acc.name}>
                            {acc.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {getAccountTypeBadge(acc.accountType, "sm")}
                          <span className="text-xs text-ink-dim truncate">
                            {acc.territory}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-deep font-medium truncate mt-1">
                          Next: {acc.nextAction || "Log follow-up activity"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {renderAccountStatusBadge(acc)}

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            aria-label={`${isArchived ? "Restore" : "Archive"} ${acc.name}`}
                            title={isArchived ? "Restore account" : "Archive account"}
                            onClick={() => handleArchiveToggle(acc)}
                            className="p-1 text-ink-dim hover:text-body rounded hover:bg-line transition-colors"
                          >
                            {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${acc.name}`}
                            title="Delete account"
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-1 text-ink-dim hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACCOUNT DETAIL WORKSPACE (PART E TO P) */}
        <div
          className={`lg:col-span-8 bg-white rounded-panel border border-line shadow-2xs overflow-hidden flex flex-col min-w-0 ${
            !mobileShowDetail ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedAccount ? (
            <div className="space-y-0 divide-y divide-line">
              {/* MOBILE BACK BUTTON */}
              <div className="lg:hidden p-3 bg-raised border-b border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>← Back to accounts</span>
                </button>
                <span className="text-spec font-mono text-ink-dim truncate max-w-[200px]">
                  {selectedAccount.name}
                </span>
              </div>

              {/* PART E: COMPACT ACCOUNT HEADER WITH PRIMARY ACTIONS */}
              <div className="p-4 sm:p-5 bg-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-body tracking-tight break-words">
                        {selectedAccount.name}
                      </h2>
                      {getAccountTypeBadge(selectedAccount.accountType, "md")}
                      {renderAccountStatusBadge(selectedAccount)}
                      {selectedAccount.isArchived && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          Archived Account
                        </span>
                      )}
                    </div>
                    <p className="text-spec text-ink-dim flex items-center gap-2 flex-wrap">
                      <span>Account Type: <strong className="text-body font-semibold">{selectedAccount.accountType || "Prospect"}</strong></span>
                      <span>•</span>
                      {selectedAccount.accountType === "Prospect" ? (
                        <span>Prospect Stage: <strong className="text-body font-semibold">{selectedAccount.prospectStage || "Identified"}</strong></span>
                      ) : (
                        <span>Relationship Status: <strong className="text-body font-semibold">{selectedAccount.customerRelationshipStatus || "Active"}</strong></span>
                      )}
                      <span>•</span>
                      <span>Owner: <strong className="text-body font-semibold">{selectedAccount.accountOwner || currentUser.name}</strong></span>
                      <span>•</span>
                      <span>{selectedAccount.territory}</span>
                    </p>
                  </div>

                  {/* PRIMARY ACTIONS: Log activity, Edit, & New deal */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={openEditAccountModal}
                      className="px-3 py-1.5 rounded-edge bg-white hover:bg-raised text-body border border-line font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Edit account details and type"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-ink-dim" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openQuickLog({
                          isOpen: true,
                          type: "call",
                          accountId: selectedAccount.id
                        })
                      }
                      className="px-3 py-1.5 rounded-edge bg-white hover:bg-raised text-brand-deep border border-brand-edge font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Log a phone call, meeting, or customer note"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Log activity</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewDealForm({
                          name: `${selectedAccount.name} - Public Lighting Tender`,
                          dealValue: 35000,
                          stageName: "Discovery & Qualification",
                          expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
                          primaryContactId: accountContacts[0]?.id || "",
                          projectApplication: "Solar Public Lighting",
                          notes: ""
                        });
                        setIsNewDealModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-edge bg-brand-deep hover:bg-brand text-white font-bold text-spec transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Create a new deal for this account"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New deal</span>
                    </button>

                    {/* SECONDARY ACTIONS DROPDOWN (PART E) */}
                    <div className="relative" ref={headerMenuRef}>
                      <button
                        type="button"
                        aria-label="Account actions"
                        onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                        className="p-1.5 rounded-edge border border-line hover:bg-raised text-ink-dim hover:text-body transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isHeaderMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-line rounded-panel shadow-lg py-1 z-30 text-spec animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              openEditAccountModal();
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-raised flex items-center gap-2 text-body cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4 text-ink-dim" />
                            <span>Edit Account</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              openEmailComposer({
                                to: selectedAccount.generalEmail || accountContacts[0]?.email || "",
                                recipientName: accountContacts[0]?.name || selectedAccount.name,
                                accountId: selectedAccount.id
                              });
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-raised flex items-center gap-2 text-body cursor-pointer"
                          >
                            <Mail className="w-4 h-4 text-ink-dim" />
                            <span>Email Account</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              openCallPrep({
                                accountId: selectedAccount.id,
                                contactId: accountContacts[0]?.id
                              });
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-raised flex items-center gap-2 text-body cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span>Prep Call</span>
                          </button>

                          <div className="border-t border-line my-1"></div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              handleArchiveToggle(selectedAccount);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-raised flex items-center gap-2 text-body cursor-pointer"
                          >
                            <Archive className="w-4 h-4 text-ink-dim" />
                            <span>{selectedAccount.isArchived ? "Restore Account" : "Archive Account"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              handleDeleteAccount(selectedAccount);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TABS NAVIGATION */}
              <div className="border-b border-line flex items-center gap-1 overflow-x-auto px-4 bg-white scrollbar-none" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-label="Overview Tab"
                  aria-selected={activeAccountTab === "overview"}
                  onClick={() => setActiveAccountTab("overview")}
                  className={`px-3 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                    activeAccountTab === "overview"
                      ? "border-brand-deep text-brand-deep"
                      : "border-transparent text-ink-dim hover:text-body"
                  }`}
                >
                  Overview
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-label="Contacts Tab"
                  aria-selected={activeAccountTab === "contacts"}
                  onClick={() => setActiveAccountTab("contacts")}
                  className={`px-3 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeAccountTab === "contacts"
                      ? "border-brand-deep text-brand-deep"
                      : "border-transparent text-ink-dim hover:text-body"
                  }`}
                >
                  <span>Contacts</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-line text-ink-dim text-[11px] font-mono">
                    {accountContacts.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-label="Deals Tab"
                  aria-selected={activeAccountTab === "deals"}
                  onClick={() => setActiveAccountTab("deals")}
                  className={`px-3 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeAccountTab === "deals"
                      ? "border-brand-deep text-brand-deep"
                      : "border-transparent text-ink-dim hover:text-body"
                  }`}
                >
                  <span>Deals</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-line text-ink-dim text-[11px] font-mono">
                    {accountDeals.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-label="Activity Tab"
                  aria-selected={activeAccountTab === "activity"}
                  onClick={() => setActiveAccountTab("activity")}
                  className={`px-3 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeAccountTab === "activity"
                      ? "border-brand-deep text-brand-deep"
                      : "border-transparent text-ink-dim hover:text-body"
                  }`}
                >
                  <span>Activity</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-line text-ink-dim text-[11px] font-mono">
                    {accountActivities.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-label="Account Brief Tab"
                  aria-selected={activeAccountTab === "brief"}
                  onClick={() => setActiveAccountTab("brief")}
                  className={`px-3 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeAccountTab === "brief"
                      ? "border-brand-deep text-brand-deep"
                      : "border-transparent text-ink-dim hover:text-body"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Account brief</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-label="Competitor Pricing Tab"
                  aria-selected={activeAccountTab === "competitors"}
                  onClick={() => setActiveAccountTab("competitors")}
                  className={`px-3 py-2.5 text-spec font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeAccountTab === "competitors"
                      ? "border-brand-deep text-brand-deep"
                      : "border-transparent text-ink-dim hover:text-body"
                  }`}
                >
                  <span>Competitor pricing</span>
                  {accountCompetitorPricing.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[11px] font-mono font-bold">
                      {accountCompetitorPricing.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB CONTENT AREA */}
              <div className="p-4 sm:p-5 bg-white">
                {/* 1. OVERVIEW TAB (PART Q, F, G) */}
                {activeAccountTab === "overview" && (
                  <div className="space-y-5">
                    {/* CONTACT DETAILS STRIP (EMPTY VALUES HIDDEN!) (PART F) */}
                    {(selectedAccount.mainPhone || selectedAccount.generalEmail || selectedAccount.website) && (
                      <div className="flex items-center gap-4 text-spec text-ink-dim flex-wrap bg-paper/60 p-3 rounded-panel border border-line">
                        {selectedAccount.mainPhone && (
                          <a
                            href={`tel:${selectedAccount.mainPhone}`}
                            className="flex items-center gap-1.5 text-body font-medium hover:text-brand-deep transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-brand-deep" />
                            <span>{selectedAccount.mainPhone}</span>
                          </a>
                        )}

                        {selectedAccount.generalEmail && (
                          <a
                            href={`mailto:${selectedAccount.generalEmail}`}
                            className="flex items-center gap-1.5 text-body font-medium hover:text-brand-deep transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-brand-deep" />
                            <span>{selectedAccount.generalEmail}</span>
                          </a>
                        )}

                        {selectedAccount.website && (
                          <a
                            href={selectedAccount.website.startsWith("http") ? selectedAccount.website : `https://${selectedAccount.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-body font-medium hover:text-brand-deep transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5 text-brand-deep" />
                            <span>{selectedAccount.website.replace(/^https?:\/\//, "")}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* CURRENT PRIORITY / NEXT BEST ACTION */}
                    <div className="bg-brand-wash/40 border border-brand-edge/60 rounded-panel p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                          Current Priority &amp; Next Step
                        </span>
                        <span className="text-[11px] font-mono text-ink-dim">
                          {selectedAccount.lastInteractionDate ? `Last Contact: ${selectedAccount.lastInteractionDate}` : "Recent"}
                        </span>
                      </div>
                      <p className="text-body font-bold text-base">
                        {selectedAccount.nextAction || "Review open tender requirements and schedule technical design consultation."}
                      </p>
                    </div>

                    {/* ACTIVE DEALS SUMMARY */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-spec font-bold text-body">Active Opportunities ({accountDeals.length})</h3>
                        <button
                          type="button"
                          onClick={() => setActiveAccountTab("deals")}
                          className="text-xs text-brand-deep font-bold hover:underline"
                        >
                          View all deals →
                        </button>
                      </div>

                      {accountDeals.length === 0 ? (
                        <div className="p-4 bg-paper/40 rounded-panel border border-line text-center text-spec text-ink-dim">
                          No active deals currently open. Click <strong>New deal</strong> to start an opportunity.
                        </div>
                      ) : (
                        <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                          {accountDeals.slice(0, 3).map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => {
                                setSelectedCrmOpportunityId(deal.id);
                                navigateToCRM("deals");
                              }}
                              className="p-3 hover:bg-raised/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <h4 className="font-bold text-body text-spec truncate">{deal.name}</h4>
                                <p className="text-xs text-ink-dim">{deal.stageName} · Expected: {deal.expectedCloseDate}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-body text-spec">
                                  ${deal.dealValue.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RECENT ACTIVITY SUMMARY */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-spec font-bold text-body">Recent Interactions ({accountActivities.length})</h3>
                        <button
                          type="button"
                          onClick={() => setActiveAccountTab("activity")}
                          className="text-xs text-brand-deep font-bold hover:underline"
                        >
                          View full timeline →
                        </button>
                      </div>

                      {accountActivities.length === 0 ? (
                        <div className="p-4 bg-paper/40 rounded-panel border border-line text-center text-spec text-ink-dim">
                          No activity logged yet. Click <strong>Log activity</strong> to record a call or meeting.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {accountActivities.slice(0, 3).map((act) => (
                            <div key={act.id} className="p-3 bg-paper/40 rounded-panel border border-line text-spec space-y-1">
                              <div className="flex items-center justify-between text-xs text-ink-dim">
                                <span className="font-bold text-body capitalize">{act.type.replace("_", " ")}</span>
                                <span>{formatActivityTimestamp(act.timestamp)}</span>
                              </div>
                              <p className="font-bold text-body">{act.title}</p>
                              {act.description && (
                                <p className="text-xs text-ink-dim line-clamp-2">{act.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* COLLAPSIBLE ADMINISTRATIVE DETAILS (PART G) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowFullOverviewDetails(!showFullOverviewDetails)}
                        className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showFullOverviewDetails ? "- Hide extra account details" : "+ View extra account details & notes"}</span>
                        {showFullOverviewDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showFullOverviewDetails && (
                        <div className="mt-3 p-4 bg-raised rounded-panel border border-line text-spec grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-bold text-ink-dim block">Account Notes</span>
                            <p className="text-body text-xs mt-1 whitespace-pre-wrap">
                              {selectedAccount.notes || "No additional account notes recorded."}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs uppercase tracking-wider font-bold text-ink-dim block">CRM System ID</span>
                              <span className="font-mono text-xs text-body">{selectedAccount.id}</span>
                            </div>
                            <div>
                              <span className="text-xs uppercase tracking-wider font-bold text-ink-dim block">Created Date</span>
                              <span className="text-xs text-body">{selectedAccount.createdDate || "2026-08-28"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. CONTACTS TAB (PART H & I) */}
                {activeAccountTab === "contacts" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-body">Contacts</h3>
                        <p className="text-spec text-ink-dim">Direct customer stakeholders, procurement leads, and engineers.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setContactToEdit(null);
                          setIsContactModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add contact</span>
                      </button>
                    </div>

                    {accountContacts.length === 0 ? (
                      <div className="p-8 text-center bg-paper/40 rounded-panel border border-line text-spec text-ink-dim">
                        <Users className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                        <p className="font-semibold text-body">No contacts listed for this account</p>
                        <p className="text-xs mt-0.5">Add project managers, procurement leads, or engineers.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                        {accountContacts.map((contact) => {
                          const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.name || "Unnamed Contact";
                          const displayName = contact.preferredName ? `${fullName} (${contact.preferredName})` : fullName;
                          const hasPersonal = Boolean(contact.hobbies || contact.hasPartner || contact.partnerName || contact.hasChildren || contact.birthday);

                          return (
                            <div
                              key={contact.id}
                              onClick={() => setDrawerContact(contact)}
                              className="p-3.5 hover:bg-raised/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-body text-spec">{displayName}</h4>
                                </div>
                                <p className="text-xs text-ink-dim font-medium">
                                  {contact.jobTitle || contact.role || "Contact"} {contact.department ? `· ${contact.department}` : ""}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-ink-dim flex-wrap pt-0.5">
                                  {contact.email && (
                                    <span className="text-body font-mono">{contact.email}</span>
                                  )}
                                  {(contact.mobile || contact.phone) && (
                                    <span>{contact.mobile || contact.phone}</span>
                                  )}
                                </div>

                                {hasPersonal && (
                                  <div className="flex items-center gap-2 text-[11px] text-ink-dim flex-wrap pt-1">
                                    {contact.hobbies && (
                                      <span className="bg-paper px-2 py-0.5 rounded border border-line">
                                        🎯 {contact.hobbies}
                                      </span>
                                    )}
                                    {contact.partnerName && (
                                      <span className="bg-paper px-2 py-0.5 rounded border border-line">
                                        Partner: {contact.partnerName}
                                      </span>
                                    )}
                                    {contact.childrenNames && contact.childrenNames.length > 0 && (
                                      <span className="bg-paper px-2 py-0.5 rounded border border-line">
                                        Kids: {contact.childrenNames.join(", ")}
                                      </span>
                                    )}
                                    {contact.birthday && (
                                      <span className="bg-paper px-2 py-0.5 rounded border border-line">
                                        🎂 {contact.birthday}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {(contact.thingsToRemember || contact.notes) && (
                                  <p className="text-xs text-brand-deep bg-brand-wash/50 p-1.5 rounded border border-brand-edge/30 line-clamp-2 mt-1">
                                    <strong>Remember:</strong> {contact.thingsToRemember || contact.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContactToEdit(contact);
                                    setIsContactModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-xs border border-line rounded hover:bg-white text-body font-medium cursor-pointer shadow-2xs"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. DEALS TAB (PART J) */}
                {activeAccountTab === "deals" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-body">Account Deals &amp; Quotations</h3>
                        <p className="text-spec text-ink-dim">Commercial opportunities and tenders for {selectedAccount.name}.</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={dealsFilter}
                          onChange={(e) => setDealsFilter(e.target.value as any)}
                          className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
                        >
                          <option value="active">Active Deals</option>
                          <option value="closed">Closed Deals</option>
                          <option value="all">All Deals</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setNewDealForm({
                              name: `${selectedAccount.name} - Public Lighting Tender`,
                              dealValue: 35000,
                              stageName: "Discovery & Qualification",
                              expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
                              primaryContactId: accountContacts[0]?.id || "",
                              projectApplication: "Solar Public Lighting",
                              notes: ""
                            });
                            setIsNewDealModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New deal</span>
                        </button>
                      </div>
                    </div>

                    {accountDeals.length === 0 ? (
                      <div className="p-8 text-center bg-paper/40 rounded-panel border border-line text-spec text-ink-dim">
                        <Briefcase className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                        <p className="font-semibold text-body">No deals recorded for this account</p>
                        <p className="text-xs mt-0.5">Create a deal to track quotation schedules and pipeline value.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                        {accountDeals
                          .filter((deal) => {
                            const isClosed = deal.stageName.includes("Won") || deal.stageName.includes("Lost");
                            if (dealsFilter === "active") return !isClosed;
                            if (dealsFilter === "closed") return isClosed;
                            return true;
                          })
                          .map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => {
                                setSelectedCrmOpportunityId(deal.id);
                                navigateToCRM("deals");
                              }}
                              className="p-3.5 hover:bg-raised/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-body text-spec">{deal.name}</h4>
                                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-brand-wash text-brand-deep border border-brand-edge">
                                    {deal.stageName}
                                  </span>
                                </div>
                                <p className="text-xs text-ink-dim">
                                  Next: {deal.nextAction || "Follow up proposal"} · Target Close: {deal.expectedCloseDate}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-body text-base">
                                  ${deal.dealValue.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ACTIVITY TAB (PART K) */}
                {activeAccountTab === "activity" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-body">Account Interaction Timeline</h3>
                        <p className="text-spec text-ink-dim">Chronological record of calls, emails, meetings, and notes.</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={activityUserFilter}
                          onChange={(e) => setActivityUserFilter(e.target.value)}
                          aria-label="Filter by Team Member"
                          className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
                        >
                          <option value="all">All Team Members</option>
                          {teamMembers.map((m) => (
                            <option key={m.id || m.name} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={activityFilter}
                          onChange={(e) => setActivityFilter(e.target.value as any)}
                          aria-label="Filter by Activity Type"
                          className="p-1.5 text-xs border border-line rounded-edge bg-white text-body font-medium"
                        >
                          <option value="all">All Activities</option>
                          <option value="call">Calls</option>
                          <option value="email">Emails</option>
                          <option value="meeting">Meetings</option>
                          <option value="note">Notes</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            openQuickLog({
                              isOpen: true,
                              type: "call",
                              accountId: selectedAccount.id
                            })
                          }
                          className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log activity</span>
                        </button>
                      </div>
                    </div>

                    {Object.keys(groupedActivities).length === 0 ? (
                      <div className="p-8 text-center bg-paper/40 rounded-panel border border-line text-spec text-ink-dim">
                        <Clock className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                        <p className="font-semibold text-body">No activity logged for this account</p>
                        <p className="text-xs mt-0.5">Record customer discussions, quotations, or meeting notes.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedActivities).map(([dayLabel, dayActivities]) => {
                          const filteredDayActs = dayActivities.filter((act) => {
                            if (activityFilter !== "all" && !act.type.includes(activityFilter)) return false;
                            if (activityUserFilter !== "all" && act.performedBy?.toLowerCase() !== activityUserFilter.toLowerCase()) return false;
                            return true;
                          });
                          if (filteredDayActs.length === 0) return null;

                          return (
                            <div key={dayLabel} className="space-y-2">
                              <span className="text-xs font-bold text-ink-dim uppercase tracking-wider block pl-1">
                                {dayLabel}
                              </span>

                              <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                                {filteredDayActs.map((act) => {
                                  const isExpanded = expandedActivityIds.has(act.id);
                                  const isCall = act.type === "call" || act.title.toLowerCase().includes("call");

                                  return (
                                    <div key={act.id} className="p-3.5 hover:bg-raised/40 transition-colors space-y-1.5 text-spec">
                                      <div className="flex items-center justify-between text-xs text-ink-dim flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                            isCall ? "bg-sky-50 text-sky-800 border border-sky-200" :
                                            act.type === "email" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                                            "bg-paper text-ink-dim border border-line"
                                          }`}>
                                            {isCall ? "📞 Call" : act.type.replace("_", " ")}
                                          </span>
                                          <span className="font-medium text-body">
                                            Logged by <strong className="text-brand-deep">{act.performedBy || "Sales Rep"}</strong>
                                          </span>
                                        </div>
                                        <span className="font-mono text-ink-dim">{formatActivityTimestamp(act.timestamp)}</span>
                                      </div>

                                      <p className="font-bold text-body">{act.title}</p>

                                      {act.description && (
                                        <div>
                                          <p className={`text-xs text-ink-dim leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                                            {act.description}
                                          </p>
                                          {act.description.length > 120 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = new Set(expandedActivityIds);
                                                if (isExpanded) next.delete(act.id);
                                                else next.add(act.id);
                                                setExpandedActivityIds(next);
                                              }}
                                              className="text-[11px] font-bold text-brand-deep hover:underline mt-0.5 cursor-pointer"
                                            >
                                              {isExpanded ? "Show less" : "Read full note..."}
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ACCOUNT BRIEF TAB (PART L, M, N, O, P) */}
                {activeAccountTab === "brief" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h3 className="text-base font-bold text-body flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Account Brief</span>
                        </h3>
                        <p className="text-spec text-ink-dim">
                          {cacheTimestamp
                            ? `Updated ${new Date(cacheTimestamp).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                              })}`
                            : "Derived from CRM activity, opportunities, and tender interactions."}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isAiLoading}
                        onClick={() => handleFetchAiSummary(selectedAccount, true)}
                        className="px-3 py-1.5 border border-line rounded-edge bg-white hover:bg-raised text-spec font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? "animate-spin" : ""}`} />
                        <span>Refresh brief</span>
                      </button>
                    </div>

                    {isAiLoading ? (
                      <div className="p-10 text-center space-y-2">
                        <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-spec text-ink-dim">Synthesizing account intelligence...</p>
                      </div>
                    ) : aiError ? (
                      <div className="p-4 bg-red-50 text-red-800 rounded-panel border border-red-200 text-spec">
                        {aiError}
                      </div>
                    ) : aiSummary ? (
                      <div className="space-y-4">
                        {/* 1. EXECUTIVE SUMMARY (PART L) */}
                        <div className="bg-brand-wash/30 border border-brand-edge/50 p-4 rounded-panel space-y-1">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                            Executive Relationship Summary
                          </h4>
                          <p className="text-body text-spec leading-relaxed">
                            {aiSummary.accountOverview ||
                              `${selectedAccount.name} is an active ${selectedAccount.accountType || "Account"} with ${accountDeals.length} active opportunities and regular technical engagement across AS/NZS 1158 solar lighting standards.`}
                          </p>
                        </div>

                        {/* 2. CURRENT RISKS (PART L) */}
                        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-panel space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Current Risks &amp; Commercial Watchpoints</span>
                          </h4>
                          <ul className="text-spec text-amber-950 space-y-1 text-xs">
                            {aiSummary.potentialRisks && aiSummary.potentialRisks.length > 0 ? (
                              aiSummary.potentialRisks.map((risk, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="font-bold">•</span>
                                  <span>{risk}</span>
                                </li>
                              ))
                            ) : (
                              <li>• No immediate blockers or severe relationship risks detected.</li>
                            )}
                          </ul>
                        </div>

                        {/* 3. NEXT 3 ACTIONS (MAX 3!) (PART L) */}
                        <div className="space-y-2">
                          <h4 className="text-spec font-bold text-body">Next 3 Strategic Actions</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(aiSummary.recommendedNextActions || [
                              "Schedule Dialux photometric verification with engineering team",
                              "Follow up quotation schedule with primary procurement contact",
                              "Confirm foundation and rag-bolt requirements for composite poles"
                            ])
                              .slice(0, 3)
                              .map((action, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-paper rounded-panel border border-line text-spec flex items-start gap-2"
                                >
                                  <span className="w-5 h-5 rounded-full bg-brand-deep text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-medium text-body">{action}</span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* COLLAPSIBLE TECHNICAL & COMPETITOR INTEL (PART M & O) */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowTechnicalIntel(!showTechnicalIntel)}
                            className="text-spec font-bold text-brand-deep hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{showTechnicalIntel ? "- Hide technical & competitor details" : "+ View technical & competitor intelligence"}</span>
                            {showTechnicalIntel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {showTechnicalIntel && (
                            <div className="mt-3 p-4 bg-raised rounded-panel border border-line text-spec space-y-3 animate-in fade-in duration-150">
                              <div>
                                <span className="text-xs font-bold text-ink-dim uppercase">Contact Role Analysis</span>
                                <p className="text-xs text-body mt-0.5">
                                  {aiSummary.buyingCommitteeInsights || "Primary stakeholders actively engaged in technical compliance sign-off."}
                                </p>
                              </div>

                              <div>
                                <span className="text-xs font-bold text-ink-dim uppercase">Competitive Positioning</span>
                                <p className="text-xs text-body mt-0.5">
                                  {aiSummary.competitorThreats || "Plasgain holds competitive advantage with Category P composite poles and 10-year warranty."}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-paper/40 rounded-panel border border-line text-spec text-ink-dim">
                        Click <strong>Refresh brief</strong> to generate structured customer insights.
                      </div>
                    )}
                  </div>
                )}

                {/* 6. COMPETITORS TAB */}
                {activeAccountTab === "competitors" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-body">Competitor Pricing Intelligence</h3>
                        <p className="text-spec text-ink-dim">Observed competitor quotations and market benchmarks.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCompetitorRecord(null);
                          setIsCompetitorModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add competitor price</span>
                      </button>
                    </div>

                    {accountCompetitorPricing.length === 0 ? (
                      <div className="p-8 text-center bg-paper/40 rounded-panel border border-line text-spec text-ink-dim">
                        No competitor pricing records logged for this account.
                      </div>
                    ) : (
                      <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
                        {accountCompetitorPricing.map((rec) => (
                          <div key={rec.id} className="p-3.5 hover:bg-raised/40 transition-colors flex items-center justify-between gap-3 text-spec">
                            <div>
                              <h4 className="font-bold text-body">{rec.competitorName}</h4>
                              <p className="text-xs text-ink-dim">{rec.competitorProduct} · Observed: {rec.observedDate}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-body text-base">${rec.price.toLocaleString()}</span>
                              <span className="text-xs text-ink-dim block">{rec.priceBasis} ({rec.gstStatus})</span>
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
            <div className="p-12 text-center text-ink-dim space-y-2">
              <Building2 className="w-10 h-10 text-ink-faint mx-auto" />
              <p className="font-bold text-body">Select an account to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* CONTACT DETAIL DRAWER / MODAL (PART I) */}
      {drawerContact && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Contact Details"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-body text-lg">
                    {`${drawerContact.firstName || ""} ${drawerContact.lastName || ""}`.trim() || drawerContact.name || "Contact Details"}
                  </h3>
                  {drawerContact.preferredName && (
                    <span className="text-spec text-ink-dim font-normal">
                      ("{drawerContact.preferredName}")
                    </span>
                  )}
                </div>
                <p className="text-spec text-ink-dim font-medium">
                  {drawerContact.jobTitle || "Contact"}
                  {drawerContact.department ? ` · ${drawerContact.department}` : ""}
                </p>
              </div>
              <button
                onClick={() => setDrawerContact(null)}
                className="p-1 text-ink-dim hover:text-body rounded hover:bg-line cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-spec">
              {/* Direct Communication */}
              <div className="p-3 bg-paper border border-line rounded-edge space-y-1.5">
                <span className="text-xs font-bold text-ink-dim uppercase block">Direct Communication</span>
                <div className="space-y-1 text-body">
                  {drawerContact.email && (
                    <p className="flex items-center gap-2">
                      <span className="text-ink-dim font-medium">Email:</span>
                      <a href={`mailto:${drawerContact.email}`} className="text-brand-deep hover:underline">
                        {drawerContact.email}
                      </a>
                    </p>
                  )}
                  {drawerContact.mobile && (
                    <p className="flex items-center gap-2">
                      <span className="text-ink-dim font-medium">Mobile:</span>
                      <a href={`tel:${drawerContact.mobile}`} className="text-body hover:underline">
                        {drawerContact.mobile}
                      </a>
                    </p>
                  )}
                  {drawerContact.phone && (
                    <p className="flex items-center gap-2">
                      <span className="text-ink-dim font-medium">Direct Phone:</span>
                      <span>{drawerContact.phone}</span>
                    </p>
                  )}
                  {drawerContact.preferredContactMethod && (
                    <p className="flex items-center gap-2 text-xs text-ink-dim pt-0.5">
                      <span>Prefers:</span>
                      <strong className="text-body font-semibold">{drawerContact.preferredContactMethod}</strong>
                    </p>
                  )}
                  {drawerContact.linkedinUrl && (
                    <p className="pt-0.5">
                      <a
                        href={drawerContact.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-deep hover:underline font-medium"
                      >
                        LinkedIn Profile ↗
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Personal Details (Only if populated) */}
              {(drawerContact.hobbies || drawerContact.hasPartner || drawerContact.partnerName || drawerContact.hasChildren || drawerContact.birthday) && (
                <div className="p-3 bg-paper border border-line rounded-edge space-y-2">
                  <span className="text-xs font-bold text-ink-dim uppercase block">Personal</span>
                  <div className="space-y-1.5 text-body text-spec">
                    {drawerContact.hobbies && (
                      <div>
                        <span className="text-ink-dim text-xs block">Hobbies &amp; Interests</span>
                        <p className="font-medium text-body">{drawerContact.hobbies}</p>
                      </div>
                    )}
                    {drawerContact.partnerName && (
                      <div>
                        <span className="text-ink-dim text-xs block">Partner</span>
                        <p className="font-medium text-body">{drawerContact.partnerName}</p>
                      </div>
                    )}
                    {drawerContact.childrenNames && drawerContact.childrenNames.length > 0 && (
                      <div>
                        <span className="text-ink-dim text-xs block">Children</span>
                        <p className="font-medium text-body">{drawerContact.childrenNames.join(" · ")}</p>
                      </div>
                    )}
                    {drawerContact.birthday && (
                      <div>
                        <span className="text-ink-dim text-xs block">Birthday</span>
                        <p className="font-medium text-body">
                          {drawerContact.birthday}
                          {drawerContact.birthdayReminder && " (Reminder active)"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Things to Remember */}
              {(drawerContact.thingsToRemember || drawerContact.notes) && (
                <div className="p-3 bg-brand-wash/40 border border-brand-edge/60 rounded-edge space-y-1">
                  <span className="text-xs font-bold text-brand-deep uppercase block">Things to Remember</span>
                  <p className="text-body whitespace-pre-wrap leading-relaxed text-spec">
                    {drawerContact.thingsToRemember || drawerContact.notes}
                  </p>
                </div>
              )}

              {/* Notable Events */}
              {drawerContact.notableEvents && drawerContact.notableEvents.length > 0 && (
                <div className="p-3 bg-paper border border-line rounded-edge space-y-2">
                  <span className="text-xs font-bold text-ink-dim uppercase block">Upcoming / Recent Notable Events</span>
                  <div className="space-y-2 divide-y divide-line">
                    {drawerContact.notableEvents.map((ev) => (
                      <div key={ev.id} className="pt-1.5 first:pt-0 space-y-0.5">
                        <p className="font-semibold text-body text-spec">{ev.title}</p>
                        <div className="flex items-center gap-3 text-xs text-ink-dim flex-wrap">
                          {ev.eventDate && <span>Event: {ev.eventDate}</span>}
                          {ev.followUpDate && (
                            <span className="text-brand-deep font-bold bg-brand-wash px-1.5 py-0.5 rounded border border-brand-edge/40">
                              Follow up: {ev.followUpDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setContactToEdit(drawerContact);
                  setDrawerContact(null);
                  setIsContactModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-raised text-body border border-line font-bold text-spec rounded-edge cursor-pointer"
              >
                Edit Contact
              </button>
              <button
                type="button"
                onClick={() => setDrawerContact(null)}
                className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge cursor-pointer"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* NEW DEAL MODAL (CONTEXT LOCKED TO SELECTED ACCOUNT!) (PART J) */}
      {isNewDealModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-deal-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 id="new-deal-title" className="font-bold text-body text-base">
                  Create New Deal
                </h3>
                <p className="text-spec text-ink-dim">
                  Account: <strong>{selectedAccount.name}</strong>
                </p>
              </div>
              <button onClick={() => setIsNewDealModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDealFromAccount} className="space-y-3">
              <div>
                <label className="block text-spec font-bold mb-1">Deal / Tender Name *</label>
                <input
                  required
                  value={newDealForm.name}
                  onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. Stage 2 Pathway Solar Lighting"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Estimated Value ($ AUD)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newDealForm.dealValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec font-mono"
                  />
                </div>

                <div>
                  <label className="block text-spec font-bold mb-1">Stage</label>
                  <select
                    value={newDealForm.stageName}
                    onChange={(e) => setNewDealForm({ ...newDealForm, stageName: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>Discovery &amp; Qualification</option>
                    <option>Design &amp; Compliance</option>
                    <option>Proposal &amp; Quoting</option>
                    <option>Negotiation &amp; Review</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Target Close Date</label>
                  <input
                    type="date"
                    value={newDealForm.expectedCloseDate}
                    onChange={(e) => setNewDealForm({ ...newDealForm, expectedCloseDate: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  />
                </div>

                <div>
                  <label className="block text-spec font-bold mb-1">Key Contact</label>
                  <select
                    value={newDealForm.primaryContactId}
                    onChange={(e) => setNewDealForm({ ...newDealForm, primaryContactId: e.target.value })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option value="">Select contact</option>
                    {accountContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role || "Contact"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Initial Scope &amp; Notes</label>
                <textarea
                  rows={2}
                  value={newDealForm.notes}
                  onChange={(e) => setNewDealForm({ ...newDealForm, notes: e.target.value })}
                  placeholder="e.g. 18 units required for local shared trail Cat P4"
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* CREATE NEW ACCOUNT MODAL */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-acc-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="new-acc-title" className="font-bold text-body text-base">Add New Account</h3>
              <button onClick={() => setIsNewAccountModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-spec font-bold mb-1">Account / Company Name *</label>
                <input
                  required
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. City of Melton Council"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Account Type *</label>
                  <select
                    required
                    aria-label="Account Type"
                    value={newAccountForm.accountType}
                    onChange={(e) => {
                      const nextType = e.target.value as AccountType;
                      setNewAccountForm((prev) => ({
                        ...prev,
                        accountType: nextType,
                        status: nextType === "Prospect" ? "Prospect" : "Customer",
                        prospectStage: nextType === "Prospect" ? "Identified" : prev.prospectStage,
                        customerRelationshipStatus: nextType !== "Prospect" ? (prev.customerRelationshipStatus || "Active") : prev.customerRelationshipStatus
                      }));
                    }}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                  >
                    <option value="Prospect">Prospect</option>
                    <option value="Customer">Customer</option>
                    <option value="Council">Council</option>
                    <option value="Account">Account</option>
                  </select>
                </div>

                {newAccountForm.accountType === "Prospect" ? (
                  <div>
                    <label className="block text-spec font-bold mb-1">Prospect Stage *</label>
                    <select
                      required
                      aria-label="Prospect Stage"
                      value={newAccountForm.prospectStage}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, prospectStage: e.target.value as ProspectStage })}
                      className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                    >
                      <option value="Identified">Identified</option>
                      <option value="Researching">Researching</option>
                      <option value="Contacting">Contacting</option>
                      <option value="Engaged">Engaged</option>
                      <option value="Opportunity Identified">Opportunity Identified</option>
                      <option value="Nurture">Nurture</option>
                      <option value="Not Pursuing">Not Pursuing</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-spec font-bold mb-1">Customer Relationship Status *</label>
                    <select
                      required
                      aria-label="Customer Relationship Status"
                      value={newAccountForm.customerRelationshipStatus}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, customerRelationshipStatus: e.target.value as CustomerRelationshipStatus })}
                      className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                    >
                      <option value="Active">Active</option>
                      <option value="Developing">Developing</option>
                      <option value="Occasional">Occasional</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Dormant">Dormant</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-spec font-bold mb-1">Territory</label>
                  <select
                    value={newAccountForm.territory}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, territory: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>VIC/TAS</option>
                    <option>NSW/ACT</option>
                    <option>QLD/NT</option>
                    <option>WA/SA</option>
                    <option>National / Key Accounts</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Create Account
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {isEditAccountModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-chrome/70 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-acc-title"
            className="bg-surface rounded-panel max-w-lg w-full p-5 border border-line shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-deep" />
                <h3 id="edit-acc-title" className="font-bold text-body text-base">Edit Account</h3>
              </div>
              <button onClick={() => setIsEditAccountModalOpen(false)} className="text-ink-dim hover:text-body">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAccount} className="space-y-3">
              <div>
                <label className="block text-spec font-bold mb-1">Account / Company Name *</label>
                <input
                  required
                  value={editAccountForm.name}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })}
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  placeholder="e.g. City of Melton Council"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Account Type *</label>
                  <select
                    required
                    aria-label="Edit Account Type"
                    value={editAccountForm.accountType}
                    onChange={(e) => {
                      const nextType = e.target.value as AccountType;
                      setEditAccountForm((prev) => ({
                        ...prev,
                        accountType: nextType,
                        status: nextType === "Prospect" ? "Prospect" : "Customer",
                        prospectStage: nextType === "Prospect" ? (prev.prospectStage || "Identified") : prev.prospectStage,
                        customerRelationshipStatus: nextType !== "Prospect" ? (prev.customerRelationshipStatus || "Active") : prev.customerRelationshipStatus
                      }));
                    }}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                  >
                    <option value="Prospect">Prospect</option>
                    <option value="Customer">Customer</option>
                    <option value="Council">Council</option>
                    <option value="Account">Account</option>
                  </select>
                </div>

                {editAccountForm.accountType === "Prospect" ? (
                  <div>
                    <label className="block text-spec font-bold mb-1">Prospect Stage *</label>
                    <select
                      required
                      aria-label="Edit Prospect Stage"
                      value={editAccountForm.prospectStage}
                      onChange={(e) => setEditAccountForm({ ...editAccountForm, prospectStage: e.target.value as ProspectStage })}
                      className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                    >
                      <option value="Identified">Identified</option>
                      <option value="Researching">Researching</option>
                      <option value="Contacting">Contacting</option>
                      <option value="Engaged">Engaged</option>
                      <option value="Opportunity Identified">Opportunity Identified</option>
                      <option value="Nurture">Nurture</option>
                      <option value="Not Pursuing">Not Pursuing</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-spec font-bold mb-1">Customer Relationship Status *</label>
                    <select
                      required
                      aria-label="Edit Customer Relationship Status"
                      value={editAccountForm.customerRelationshipStatus}
                      onChange={(e) => setEditAccountForm({ ...editAccountForm, customerRelationshipStatus: e.target.value as CustomerRelationshipStatus })}
                      className="w-full p-2 border border-line rounded-edge bg-white text-spec font-medium"
                    >
                      <option value="Active">Active</option>
                      <option value="Developing">Developing</option>
                      <option value="Occasional">Occasional</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Dormant">Dormant</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-spec font-bold mb-1">Territory</label>
                  <select
                    value={editAccountForm.territory}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, territory: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  >
                    <option>VIC/TAS</option>
                    <option>NSW/ACT</option>
                    <option>QLD/NT</option>
                    <option>WA/SA</option>
                    <option>National / Key Accounts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-spec font-bold mb-1">Main Phone</label>
                  <input
                    type="text"
                    value={editAccountForm.mainPhone}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, mainPhone: e.target.value })}
                    placeholder="e.g. 03 9747 7200"
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  />
                </div>
                <div>
                  <label className="block text-spec font-bold mb-1">General Email</label>
                  <input
                    type="email"
                    value={editAccountForm.generalEmail}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, generalEmail: e.target.value })}
                    placeholder="e.g. enquiries@melton.vic.gov.au"
                    className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                  />
                </div>
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Website</label>
                <input
                  type="text"
                  value={editAccountForm.website}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, website: e.target.value })}
                  placeholder="e.g. https://www.melton.vic.gov.au"
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec"
                />
              </div>

              <div>
                <label className="block text-spec font-bold mb-1">Account Notes</label>
                <textarea
                  rows={3}
                  value={editAccountForm.notes}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, notes: e.target.value })}
                  placeholder="Key relationships, compliance requirements, internal notes..."
                  className="w-full p-2 border border-line rounded-edge bg-white text-spec text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsEditAccountModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-edge text-spec font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand text-white font-bold text-spec rounded-edge"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* CONTACT MODAL */}
      {isContactModalOpen && selectedAccount && (
        <CRMContactModal
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false);
            setContactToEdit(null);
          }}
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          contactToEdit={contactToEdit}
          onSave={(contactData) => {
            if (contactToEdit) {
              updateContact(contactToEdit.id, contactData);
            } else {
              addContact({
                ...contactData,
                id: `contact-${Date.now()}`,
                accountId: selectedAccount.id,
                accountName: selectedAccount.name
              });
            }
            setIsContactModalOpen(false);
            setContactToEdit(null);
          }}
        />
      )}
    </div>
  );
};
