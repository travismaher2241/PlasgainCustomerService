import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  Opportunity,
  KnowledgeDocument,
  PlasgainProduct,
  EnquiryAnalysisResult,
  LessonTopic,
  GlossaryTerm
} from "../types";
import {
  Account,
  CRMContact,
  CRMLead,
  CRMOpportunity,
  CRMActivity,
  CRMTask,
  PipelineConfig,
  NextBestActionItem,
  CRMNotification,
  CompetitorPricingRecord,
  CompetitorPricingAlert,
  EmailComposerLaunchContext
} from "../types/crm";
import {
  SAMPLE_OPPORTUNITIES,
  SAMPLE_DOCUMENTS,
  SAMPLE_PRODUCTS,
  SAMPLE_LESSONS,
  GLOSSARY_TERMS
} from "../data/mockData";
import {
  DEFAULT_PIPELINES,
  INITIAL_ACCOUNTS,
  INITIAL_CONTACTS,
  INITIAL_LEADS,
  INITIAL_OPPORTUNITIES,
  INITIAL_ACTIVITIES,
  INITIAL_TASKS
} from "../data/crmMockData";
import { CRMIntelligenceEngine } from "../utils/crmIntelligence";
import { normalizeNotification, getUnreadNotificationsCount } from "../utils/notificationUtils";
import {
  saveDocToCloud,
  loadDocFromCloud,
  loadCollectionFromCloud,
  syncBatchToCloud,
  deleteDocFromCloud,
  clearCollectionFromCloud
} from "../utils/firebase";
import { resolveToolRoute } from "../utils/toolRegistry";

export type NavTab =
  | "home"
  | "crm"
  | "new-enquiry"
  | "product-finder"
  | "documents"
  | "tools"
  | "settings";

export type CRMSubTab =
  | "today"
  | "accounts"
  | "pipeline"
  | "leads"
  | "tasks"
  | "competitor-pricing";

export type ToolSubTab =
  | "plan-takeoff"
  | "cable-cover-calc"
  | "pole-spacing-calc"
  | "wind-foundation-calc"
  | "solar-autonomy"
  | "conflict-resolver"
  | "quote-review"
  | "unknown";

/** Who is signed in. Editable in Settings; persisted per browser. */
export interface UserProfile {
  name: string;
  role: string;
  location: string;
  email: string;
  phone?: string;
}


export function crmOpportunityToOpportunity(crmOpp: CRMOpportunity): Opportunity {
  const stageMap: Record<string, any> = {
    "stage-new": "New Enquiry",
    "stage-discovery": "Qualifying",
    "stage-solution": "Technical Review",
    "stage-quote": "Quoting",
    "stage-review": "Follow-Up",
    "stage-negotiation": "Negotiation",
    "stage-won": "Closed Won",
    "stage-lost": "Closed Lost"
  };

  const totalQty = crmOpp.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || 0;

  return {
    id: crmOpp.id,
    customerCompany: crmOpp.accountName,
    contactName: crmOpp.primaryContactName,
    contactEmail: crmOpp.primaryContactEmail,
    contactPhone: crmOpp.primaryContactPhone,
    project: crmOpp.name,
    location: crmOpp.location,
    application: crmOpp.projectApplication,
    stage: stageMap[crmOpp.stageId] || crmOpp.stageName || "Qualifying",
    status: crmOpp.stageId === "stage-won" ? "Closed" : crmOpp.stageId === "stage-lost" ? "Closed" : "Active",
    estimatedQuantity: totalQty > 0 ? totalQty : 1,
    estimatedValue: crmOpp.dealValue,
    productsConsidered: crmOpp.products?.map((p) => p.productName) || [],
    quoteDeadline: crmOpp.expectedCloseDate,
    lastActivity: crmOpp.latestActivity,
    lastActivityDate: crmOpp.latestActivityDate,
    nextAction: crmOpp.nextAction,
    nextActionDate: crmOpp.nextActionDate,
    readinessScore: crmOpp.probability || 65,
    notes: crmOpp.notes,
    quoteNumber: crmOpp.quoteNumber,
    ostendoQuoteRef: crmOpp.ostendoQuoteRef,
    rawEnquiry: crmOpp.rawEnquiryText,
    analysis: crmOpp.analysis
  };
}

export const PRESET_TEAM_MEMBERS: UserProfile[] = [
  {
    id: "user-travis-maher",
    name: "Travis Maher",
    role: "Internal Sales",
    location: "Drouin",
    email: "travis@plasgain.com.au",
    phone: "0412 345 678"
  },
  {
    id: "user-sarah-reed",
    name: "Sarah Reed",
    role: "Internal Sales",
    location: "Melbourne",
    email: "sarah.reed@plasgain.com.au",
    phone: "+61 3 9000 1122"
  },
  {
    id: "user-rob-mitchell",
    name: "Rob Mitchell",
    role: "Sales Director",
    location: "Sydney",
    email: "rob.mitchell@plasgain.com.au",
    phone: "+61 400 999 888"
  }
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "user-travis-maher",
  name: "Travis Maher",
  role: "Internal Sales & Technical Lead",
  location: "Drouin, VIC",
  email: "travis@plasgain.com.au",
  phone: "0412 345 678"
};

/** Two letters from the name, for the avatar. Falls back to "?" when empty. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AppContextType {
  /** The signed-in user. Stamped on records this person creates. */
  currentUser: UserProfile;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
  resetCurrentUser: () => void;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginAsUser: (profile: UserProfile) => void;
  teamMembers: UserProfile[];
  deleteTeamMember: (idOrName: string) => void;
  addTeamMember: (member: UserProfile) => void;

  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeCRMTab: CRMSubTab;
  setActiveCRMTab: (crmTab: CRMSubTab) => void;
  activeToolTab: ToolSubTab;
  setActiveToolTab: (tool: ToolSubTab) => void;

  // Legacy/Compatibility Opportunities
  opportunities: Opportunity[];
  setOpportunities: React.Dispatch<React.SetStateAction<Opportunity[]>>;
  addOpportunity: (opp: Opportunity) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  selectedOpportunityId: string | null;
  setSelectedOpportunityId: (id: string | null) => void;

  // Core Relational CRM Entities
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => Promise<void>;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;

  contacts: CRMContact[];
  setContacts: React.Dispatch<React.SetStateAction<CRMContact[]>>;
  addContact: (contact: CRMContact) => void;
  updateContact: (id: string, updates: Partial<CRMContact>) => void;
  deleteContact: (id: string) => void;

  leads: CRMLead[];
  setLeads: React.Dispatch<React.SetStateAction<CRMLead[]>>;
  addLead: (lead: CRMLead) => void;
  updateLead: (id: string, updates: Partial<CRMLead>) => void;
  convertLead: (leadId: string, accountId?: string) => { accountId: string; contactId: string; oppId: string };

  crmOpportunities: CRMOpportunity[];
  setCrmOpportunities: React.Dispatch<React.SetStateAction<CRMOpportunity[]>>;
  addCrmOpportunity: (opp: CRMOpportunity) => void;
  updateCrmOpportunity: (id: string, updates: Partial<CRMOpportunity>) => void;
  deleteCrmOpportunity: (id: string) => Promise<void>;
  selectedCrmOpportunityId: string | null;
  setSelectedCrmOpportunityId: (id: string | null) => void;
  clearAllWorkspaceData: () => Promise<void>;

  activities: CRMActivity[];
  logActivity: (activity: Omit<CRMActivity, "id" | "timestamp">) => void;

  tasks: CRMTask[];
  addTask: (task: Omit<CRMTask, "id">) => void;
  updateTask: (id: string, updates: Partial<CRMTask>) => void;
  toggleTaskComplete: (id: string) => void;

  pipelines: PipelineConfig[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;

  // Intelligence & Next Best Actions
  nextBestActions: NextBestActionItem[];
  notifications: CRMNotification[];
  unreadNotificationsCount: number;
  addNotification: (notification: Omit<CRMNotification, "id" | "isRead" | "createdAt">) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  dismissNotification: (id: string) => void;
  activeBackgroundAnalysisJob: { id: string; projectName: string; status: "running" | "complete" | "failed" } | null;
  setActiveBackgroundAnalysisJob: (job: { id: string; projectName: string; status: "running" | "complete" | "failed" } | null) => void;

  // Competitor Pricing Intelligence (Shared Server-Backed)
  competitorPricingRecords: CompetitorPricingRecord[];
  competitorAlerts: CompetitorPricingAlert[];
  unreadCompetitorAlertsCount: number;
  addCompetitorPricing: (recordData: Omit<CompetitorPricingRecord, "id" | "createdAt" | "updatedAt">) => Promise<CompetitorPricingRecord | null>;
  updateCompetitorPricing: (id: string, updates: Partial<CompetitorPricingRecord>) => Promise<CompetitorPricingRecord | null>;
  markCompetitorAlertRead: (alertId: string) => Promise<void>;
  fetchCompetitorData: () => Promise<void>;

  // Knowledge & Training
  documents: KnowledgeDocument[];
  addDocument: (doc: KnowledgeDocument) => void;
  products: PlasgainProduct[];
  lessons: LessonTopic[];
  glossary: GlossaryTerm[];

  // Active Enquiry Analysis State
  currentEnquiryAnalysis: EnquiryAnalysisResult | null;
  setCurrentEnquiryAnalysis: (analysis: EnquiryAnalysisResult | null) => void;
  rawEnquiryInput: {
    rawContent: string;
    customer: string;
    contact: string;
    company: string;
    project: string;
    location: string;
    source: string;
  };
  setRawEnquiryInput: React.Dispatch<
    React.SetStateAction<{
      rawContent: string;
      customer: string;
      contact: string;
      company: string;
      project: string;
      location: string;
      source: string;
    }>
  >;

  // Explain Terminology Popover / Modal
  explainingTerm: string | null;
  setExplainingTerm: (term: string | null) => void;

  // Global Copilot Drawer
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  isCopilotContextPinned: boolean;
  setIsCopilotContextPinned: (pinned: boolean) => void;
  clearCopilotContext: () => void;
  togglePinCopilotContext: () => void;

  // Global Search Modal
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Quick Activity Logging Modal State
  quickLogModal: {
    isOpen: boolean;
    type: "call" | "note" | "meeting" | "email" | "task" | "follow_up";
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
  } | null;
  openQuickLog: (type: "call" | "note" | "meeting" | "email" | "task" | "follow_up", accountId?: string, oppId?: string, contactId?: string) => void;
  closeQuickLog: () => void;

  // AI Email Composer Modal
  isEmailComposerOpen: boolean;
  emailComposerLaunchContext: EmailComposerLaunchContext | null;
  openEmailComposer: (context?: EmailComposerLaunchContext) => void;
  closeEmailComposer: () => void;

  // Notification / Toast
  toast: { message: string; type: "success" | "info" | "warning" | "error" } | null;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;

  // Cloud Firestore Sync
  cloudSyncStatus: "synced" | "syncing" | "offline" | "error";
  syncAllWithCloud: () => Promise<void>;

  // Navigate helper
  navigateToWorkflow: (tab: NavTab, toolSub?: ToolSubTab, oppId?: string) => void;
  navigateToCRM: (subTab: CRMSubTab, entityId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<NavTab>("home");
  const [activeCRMTab, setActiveCRMTab] = useState<CRMSubTab>("today");
  const [activeToolTab, setActiveToolTab] = useState<ToolSubTab>("plan-takeoff");

  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">("syncing");

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("plasgain_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("plasgain_sidebar_collapsed", String(next));
      return next;
    });
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem("plasgain_sidebar_collapsed", String(collapsed));
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("plasgain_user_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          return { ...DEFAULT_USER_PROFILE, ...parsed };
        }
      }
      return DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });

  const loginAsUser = (profile: UserProfile) => {
    const userId = profile.id || `user-${profile.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const userWithId: UserProfile = { ...profile, id: userId };
    setCurrentUser(userWithId);
    localStorage.setItem("plasgain_user_profile", JSON.stringify(userWithId));
    localStorage.setItem("plasgain_active_user_id", userId);
    saveDocToCloud("users", userId, userWithId);
    setIsLoginModalOpen(false);
  };

  const updateCurrentUser = (updates: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updates };
      const userId = next.id || `user-${next.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      next.id = userId;
      localStorage.setItem("plasgain_user_profile", JSON.stringify(next));
      localStorage.setItem("plasgain_active_user_id", userId);
      saveDocToCloud("users", userId, next);

      // Also update teamMembers array so user list reflects latest profile details
      setTeamMembers((prevTeam) => {
        const updatedTeam = prevTeam.map((m) =>
          m.id === userId || m.name.toLowerCase() === prev.name.toLowerCase() ? { ...m, ...next } : m
        );
        localStorage.setItem("plasgain_team_members", JSON.stringify(updatedTeam));
        saveDocToCloud("settings", "team_members", { members: updatedTeam });
        return updatedTeam;
      });

      return next;
    });
  };

  const [teamMembers, setTeamMembers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem("plasgain_team_members");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return PRESET_TEAM_MEMBERS;
    } catch {
      return PRESET_TEAM_MEMBERS;
    }
  });

  const deleteTeamMember = (idOrName: string) => {
    const memberToDelete = teamMembers.find(
      (m) => m.id === idOrName || m.name.toLowerCase() === idOrName.toLowerCase()
    );
    if (!memberToDelete) return;

    if (
      currentUser.name.toLowerCase() === memberToDelete.name.toLowerCase() ||
      (currentUser.id && currentUser.id === memberToDelete.id)
    ) {
      showToast("Cannot delete the currently signed-in user profile", "warning");
      return;
    }

    setTeamMembers((prev) => {
      const updated = prev.filter(
        (m) => m.id !== memberToDelete.id && m.name.toLowerCase() !== memberToDelete.name.toLowerCase()
      );
      localStorage.setItem("plasgain_team_members", JSON.stringify(updated));
      saveDocToCloud("settings", "team_members", { members: updated });
      return updated;
    });

    showToast(`Removed "${memberToDelete.name}" from workspace`, "info");
  };

  const addTeamMember = (member: UserProfile) => {
    const userId = member.id || `user-${member.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-")}`;
    const newMember: UserProfile = { ...member, id: userId };
    setTeamMembers((prev) => {
      const exists = prev.some((m) => m.name.toLowerCase() === newMember.name.toLowerCase());
      const updated = exists
        ? prev.map((m) => (m.name.toLowerCase() === newMember.name.toLowerCase() ? newMember : m))
        : [...prev, newMember];
      localStorage.setItem("plasgain_team_members", JSON.stringify(updated));
      saveDocToCloud("settings", "team_members", { members: updated });
      return updated;
    });
  };

  const resetCurrentUser = () => {
    setCurrentUser(DEFAULT_USER_PROFILE);
    localStorage.setItem("plasgain_user_profile", JSON.stringify(DEFAULT_USER_PROFILE));
    localStorage.removeItem("plasgain_active_user_id");
  };

  // Known sample prefixes to permanently filter and purge from legacy caches and Firestore
  const KNOWN_SAMPLE_PREFIXES = ["acc-00", "opp-00", "lead-00", "con-00", "task-00", "act-00", "comp-00", "notif-", "sample-"];

  const isSampleRecord = (item: any): boolean => {
    if (!item) return false;
    if (item.isSample === true) return true;
    const id = String(item.id || "").toLowerCase();
    const accountId = String(item.accountId || "").toLowerCase();
    const dealId = String(item.dealId || item.opportunityId || "").toLowerCase();
    const title = String(item.title || item.name || "").toLowerCase();

    if (KNOWN_SAMPLE_PREFIXES.some((p) => id.startsWith(p) || accountId.startsWith(p) || dealId.startsWith(p))) {
      return true;
    }

    if (title === "call with client" || title === "follow-up: call with client" || title === "account note: client") {
      return true;
    }

    return false;
  };

  // Load Relational CRM Data from LocalStorage (with sample filtering)

  const [crmOpportunities, setCrmOpportunities] = useState<CRMOpportunity[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_deals");
    const parsed = saved ? JSON.parse(saved) : INITIAL_OPPORTUNITIES;
    return Array.isArray(parsed) ? parsed.filter((d: any) => !isSampleRecord(d)) : [];
  });

  const [rawAccounts, setRawAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_accounts");
    const parsed = saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
    return Array.isArray(parsed) ? parsed.filter((a: any) => !isSampleRecord(a)) : [];
  });

  // Dynamically compute account metrics from real CRM deals
  const accounts = useMemo(() => {
    return rawAccounts.map((acc) => {
      const accDeals = crmOpportunities.filter((d) => d.accountId === acc.id);
      const activeDeals = accDeals.filter((d) => d.stageId !== "stage-won" && d.stageId !== "stage-lost");
      const wonDeals = accDeals.filter((d) => d.stageId === "stage-won");
      const openPipelineValue = activeDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
      const totalDealsWon = wonDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0) + (acc.metrics?.totalDealsWon && wonDeals.length === 0 ? acc.metrics.totalDealsWon : 0);

      return {
        ...acc,
        metrics: {
          openPipelineValue,
          totalDealsWon,
          activeDealsCount: activeDeals.length,
          totalEnquiries: accDeals.length + (acc.metrics?.totalEnquiries && accDeals.length === 0 ? acc.metrics.totalEnquiries : 0)
        }
      };
    });
  }, [rawAccounts, crmOpportunities]);

  const setAccounts = setRawAccounts;

  const [contacts, setContacts] = useState<CRMContact[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_contacts");
    const parsed = saved ? JSON.parse(saved) : INITIAL_CONTACTS;
    return Array.isArray(parsed) ? parsed.filter((c: any) => !isSampleRecord(c)) : [];
  });

  const [leads, setLeads] = useState<CRMLead[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_leads");
    const parsed = saved ? JSON.parse(saved) : INITIAL_LEADS;
    return Array.isArray(parsed) ? parsed.filter((l: any) => !isSampleRecord(l)) : [];
  });

  const [activities, setActivities] = useState<CRMActivity[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_activities");
    const parsed = saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
    return Array.isArray(parsed) ? parsed.filter((a: any) => !isSampleRecord(a)) : [];
  });

  const [tasks, setTasks] = useState<CRMTask[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_tasks");
    const parsed = saved ? JSON.parse(saved) : INITIAL_TASKS;
    return Array.isArray(parsed) ? parsed.filter((t: any) => !isSampleRecord(t)) : [];
  });

  const [pipelines] = useState<PipelineConfig[]>(DEFAULT_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>("pipe-major-projects");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => rawAccounts[0]?.id || null);
  const [selectedCrmOpportunityId, setSelectedCrmOpportunityId] = useState<string | null>(() => crmOpportunities[0]?.id || null);

  // Unified opportunities derived dynamically from single CRM source of truth
  const opportunities = useMemo(() => {
    return crmOpportunities.map(crmOpportunityToOpportunity);
  }, [crmOpportunities]);

  const setOpportunities = (_newOpps?: any) => {
    // Compatibility stub - mutations must go through crmOpportunities
  };

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(() => crmOpportunities[0]?.id || null);

  const [documents, setDocuments] = useState<KnowledgeDocument[]>(() => {
    const saved = localStorage.getItem("plasgain_documents");
    return saved ? JSON.parse(saved) : SAMPLE_DOCUMENTS;
  });

  const [products] = useState<PlasgainProduct[]>(SAMPLE_PRODUCTS);
  const [lessons] = useState<LessonTopic[]>(SAMPLE_LESSONS);
  const [glossary] = useState<GlossaryTerm[]>(GLOSSARY_TERMS);

  const [currentEnquiryAnalysis, setCurrentEnquiryAnalysis] = useState<EnquiryAnalysisResult | null>(null);

  const [rawEnquiryInput, setRawEnquiryInput] = useState({
    rawContent: "",
    customer: "",
    contact: "",
    company: "",
    project: "",
    location: "",
    source: "Email"
  });

  const [explainingTerm, setExplainingTerm] = useState<string | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [quickLogModal, setQuickLogModal] = useState<{
    isOpen: boolean;
    type: "call" | "note" | "meeting" | "email" | "task" | "follow_up";
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
  } | null>(null);

  // AI Email Composer Modal State
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState<boolean>(false);
  const [emailComposerLaunchContext, setEmailComposerLaunchContext] = useState<EmailComposerLaunchContext | null>(null);

  const openEmailComposer = (context?: EmailComposerLaunchContext) => {
    setEmailComposerLaunchContext(context || null);
    setIsEmailComposerOpen(true);
  };

  const closeEmailComposer = () => {
    setIsEmailComposerOpen(false);
    setEmailComposerLaunchContext(null);
  };

  
  // Server-backed Notifications with canonical normalization (P1-05)
  const [serverNotifications, setServerNotifications] = useState<CRMNotification[]>([]);
  const [copilotCustomContext, setCopilotCustomContext] = useState<string | null>(null);
  const [isCopilotContextPinned, setIsCopilotContextPinned] = useState(false);

  const clearCopilotContext = () => {
    setCopilotCustomContext(null);
    setSelectedOpportunityId(null);
    setSelectedCrmOpportunityId(null);
    setIsCopilotContextPinned(false);
  };

  const togglePinCopilotContext = () => {
    setIsCopilotContextPinned((prev) => !prev);
  };

  const fetchNotifications = async () => {
    try {
      if (typeof window === "undefined") return;
      const res = await fetch(getApiUrl("/api/notifications"));
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) setServerNotifications(data.notifications.map(normalizeNotification));
      }
    } catch (err) {
      // Ignored in offline / test mode
    }
  };

  const markNotificationRead = async (id: string) => {
    setServerNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    try {
      if (typeof window !== "undefined") {
        await fetch(getApiUrl(`/api/notifications/${id}/read`), { method: "PATCH" });
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    setServerNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setLocalNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    try {
      if (typeof window !== "undefined") {
        await fetch(getApiUrl("/api/notifications/mark-all-read"), { method: "POST" });
      }
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  };

  const archiveNotification = async (id: string) => {
    setServerNotifications((prev) => prev.filter((n) => n.id !== id));
    setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      if (typeof window !== "undefined") {
        await fetch(getApiUrl(`/api/notifications/${id}/archive`), { method: "PATCH" });
      }
    } catch (err) {
      console.error("Error archiving notification:", err);
    }
  };

  const addNotification = (notif: Omit<CRMNotification, "id" | "isRead" | "createdAt">) => {
    const newN = normalizeNotification({
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    setLocalNotifications((prev) => [newN, ...prev]);
  };

  const [activeBackgroundAnalysisJob, setActiveBackgroundAnalysisJob] = useState<{
    id: string;
    projectName: string;
    status: "running" | "complete" | "failed";
  } | null>(null);

  const openCopilotWithContext = (contextStr: string, initialPrompt?: string) => {
    setCopilotCustomContext(contextStr);
    setIsCopilotOpen(true);
  };

  // Server-backed Competitor Pricing Intelligence & Team Alerts
  const [competitorPricingRecords, setCompetitorPricingRecords] = useState<CompetitorPricingRecord[]>([]);
  const [competitorAlerts, setCompetitorAlerts] = useState<CompetitorPricingAlert[]>([]);

  const getApiUrl = (endpoint: string) => {
    if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null") {
      return `${window.location.origin}${endpoint}`;
    }
    return endpoint;
  };

  const fetchCompetitorData = async () => {
    try {
      if (typeof window === "undefined") return;
      const [pricingRes, alertsRes] = await Promise.all([
        fetch(getApiUrl("/api/competitor-pricing")),
        fetch(getApiUrl("/api/competitor-pricing/alerts"))
      ]);
      if (pricingRes.ok) {
        const data = await pricingRes.json();
        if (data.records) setCompetitorPricingRecords(data.records);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        if (data.alerts) setCompetitorAlerts(data.alerts);
      }
    } catch (err) {
      // Ignored during testing/offline
    }
  };

  useEffect(() => {
    fetchCompetitorData();
    fetchNotifications();

    // Refresh when window regains focus
    const handleFocus = () => {
      fetchCompetitorData();
    };
    window.addEventListener("focus", handleFocus);

    // Modest polling interval (20 seconds) for team sync
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchCompetitorData();
      fetchNotifications();
    }, 20000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(intervalId);
    };
  }, []);

  const addCompetitorPricing = async (
    recordData: Omit<CompetitorPricingRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<CompetitorPricingRecord | null> => {
    try {
      const res = await fetch(getApiUrl("/api/competitor-pricing"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details?.join(", ") || err.error || "Failed to add competitor pricing");
      }
      const data = await res.json();
      if (data.record) {
        setCompetitorPricingRecords((prev) => [data.record, ...prev]);
        if (data.alert) {
          setCompetitorAlerts((prev) => [data.alert, ...prev]);
        }
        // Also log to CRM activity
        logActivity({
          type: "note",
          title: `Competitor Intelligence: ${data.record.competitorName}`,
          description: `Recorded ${data.record.competitorProduct} at $${data.record.price} (${data.record.priceBasis}) - ${data.record.sourceType}`,
          accountId: data.record.accountId,
          accountName: data.record.accountName,
          performedBy: data.record.createdBy
        });
        showToast("Competitor pricing recorded & team alert dispatched!", "success");
        return data.record;
      }
      return null;
    } catch (err: any) {
      console.error("Error adding competitor pricing:", err);
      showToast(err.message || "Failed to record competitor pricing", "error");
      return null;
    }
  };

  const updateCompetitorPricing = async (
    id: string,
    updates: Partial<CompetitorPricingRecord>
  ): Promise<CompetitorPricingRecord | null> => {
    try {
      const res = await fetch(getApiUrl(`/api/competitor-pricing/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update competitor pricing");
      }
      const data = await res.json();
      if (data.record) {
        setCompetitorPricingRecords((prev) =>
          prev.map((r) => (r.id === id ? data.record : r))
        );
        showToast("Competitor pricing record updated", "success");
        return data.record;
      }
      return null;
    } catch (err: any) {
      console.error("Error updating competitor pricing:", err);
      showToast(err.message || "Failed to update competitor record", "error");
      return null;
    }
  };

  const markCompetitorAlertRead = async (alertId: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/competitor-pricing/alerts/${alertId}/read`), {
        method: "PATCH"
      });
      if (res.ok) {
        setCompetitorAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
        );
      }
    } catch (err) {
      console.error("Error marking competitor alert read:", err);
    }
  };

  const unreadCompetitorAlertsCount = useMemo(() => {
    return competitorAlerts.filter((a) => !a.isRead).length;
  }, [competitorAlerts]);

  // Initial notifications (empty clean state)
  const [localNotifications, setLocalNotifications] = useState<CRMNotification[]>([]);

  const activeNotifications = useMemo(() => {
    const list = serverNotifications.length > 0 ? serverNotifications : localNotifications;
    return list.map(normalizeNotification);
  }, [serverNotifications, localNotifications]);

  const unreadNotificationsCount = useMemo(() => {
    return getUnreadNotificationsCount(activeNotifications);
  }, [activeNotifications]);

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    // Clear stale deal/opportunity context on unrelated workspace navigation when not pinned (P1-07)
    if (!isCopilotContextPinned) {
      if (tab === "settings" || tab === "home" || tab === "tools" || tab === "new-enquiry") {
        setSelectedOpportunityId(null);
        setSelectedCrmOpportunityId(null);
        setCopilotCustomContext(null);
      }
    }
  };

  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error" } | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("plasgain_user_profile", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("plasgain_crm_accounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("plasgain_crm_contacts", JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem("plasgain_crm_leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem("plasgain_crm_deals", JSON.stringify(crmOpportunities));
  }, [crmOpportunities]);

  useEffect(() => {
    localStorage.setItem("plasgain_crm_activities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem("plasgain_crm_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("plasgain_opportunities", JSON.stringify(opportunities));
  }, [opportunities]);

  useEffect(() => {
    localStorage.setItem("plasgain_documents", JSON.stringify(documents));
  }, [documents]);

  // Automatic Cloud Firestore Initialization & Bidirectional Sync
  useEffect(() => {
    let isMounted = true;
    async function initCloudSync() {
      try {
        setCloudSyncStatus("syncing");

        // 1. User Profile Sync (per user rather than generic global override)
        const localUserRaw = localStorage.getItem("plasgain_user_profile");
        const parsedLocal = localUserRaw ? JSON.parse(localUserRaw) : null;
        const activeUserId = localStorage.getItem("plasgain_active_user_id") ||
          parsedLocal?.id ||
          (parsedLocal?.name && parsedLocal.name !== DEFAULT_USER_PROFILE.name
            ? `user-${parsedLocal.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
            : null);

        if (activeUserId) {
          const cloudUser = await loadDocFromCloud<UserProfile>("users", activeUserId);
          if (cloudUser && cloudUser.name && isMounted) {
            setCurrentUser((prev) => ({ ...prev, ...cloudUser, id: activeUserId }));
          } else if (parsedLocal && isMounted) {
            await saveDocToCloud("users", activeUserId, { ...parsedLocal, id: activeUserId });
          }
        }

        // 2. Accounts
        const cloudAccounts = await loadCollectionFromCloud<Account>("crm_accounts");
        const sampleAccounts = cloudAccounts.filter(isSampleRecord);
        sampleAccounts.forEach((a) => deleteDocFromCloud("crm_accounts", a.id));
        const realAccounts = cloudAccounts.filter((a) => !isSampleRecord(a));
        if (isMounted) setAccounts(realAccounts);

        // 3. Contacts
        const cloudContacts = await loadCollectionFromCloud<CRMContact>("crm_contacts");
        const sampleContacts = cloudContacts.filter(isSampleRecord);
        sampleContacts.forEach((c) => deleteDocFromCloud("crm_contacts", c.id));
        const realContacts = cloudContacts.filter((c) => !isSampleRecord(c));
        if (isMounted) setContacts(realContacts);

        // 4. Leads
        const cloudLeads = await loadCollectionFromCloud<CRMLead>("crm_leads");
        const sampleLeads = cloudLeads.filter(isSampleRecord);
        sampleLeads.forEach((l) => deleteDocFromCloud("crm_leads", l.id));
        const realLeads = cloudLeads.filter((l) => !isSampleRecord(l));
        if (isMounted) setLeads(realLeads);

        // 5. CRM Deals
        const cloudDeals = await loadCollectionFromCloud<CRMOpportunity>("crm_deals");
        const sampleDeals = cloudDeals.filter(isSampleRecord);
        sampleDeals.forEach((d) => deleteDocFromCloud("crm_deals", d.id));
        const realDeals = cloudDeals.filter((d) => !isSampleRecord(d));
        if (isMounted) setCrmOpportunities(realDeals);

        // 6. Activities
        const cloudActivities = await loadCollectionFromCloud<CRMActivity>("crm_activities");
        const sampleActivities = cloudActivities.filter(isSampleRecord);
        sampleActivities.forEach((a) => deleteDocFromCloud("crm_activities", a.id));
        const realActivities = cloudActivities.filter((a) => !isSampleRecord(a));
        if (isMounted) setActivities(realActivities);

        // 7. Tasks
        const cloudTasks = await loadCollectionFromCloud<CRMTask>("crm_tasks");
        const sampleTasks = cloudTasks.filter(isSampleRecord);
        sampleTasks.forEach((t) => deleteDocFromCloud("crm_tasks", t.id));
        const realTasks = cloudTasks.filter((t) => !isSampleRecord(t));
        if (isMounted) setTasks(realTasks);

        // 8. Opportunities (Legacy)
        const cloudOpps = await loadCollectionFromCloud<Opportunity>("opportunities");
        const sampleOpps = cloudOpps.filter(isSampleRecord);
        sampleOpps.forEach((o) => deleteDocFromCloud("opportunities", o.id));
        const realOpps = cloudOpps.filter((o) => !isSampleRecord(o));
        if (isMounted) setOpportunities(realOpps);

        if (isMounted) setCloudSyncStatus("synced");
      } catch (err) {
        console.warn("[Firebase] Initial cloud sync warning:", err);
        if (isMounted) setCloudSyncStatus("offline");
      }
    }

    initCloudSync();

    return () => {
      isMounted = false;
    };
  }, []);

  const syncAllWithCloud = async () => {
    setCloudSyncStatus("syncing");
    try {
      await Promise.all([
        saveDocToCloud("settings", "user_profile", currentUser),
        syncBatchToCloud("crm_accounts", accounts),
        syncBatchToCloud("crm_contacts", contacts),
        syncBatchToCloud("crm_leads", leads),
        syncBatchToCloud("crm_deals", crmOpportunities),
        syncBatchToCloud("crm_activities", activities),
        syncBatchToCloud("crm_tasks", tasks),
        syncBatchToCloud("opportunities", opportunities)
      ]);
      setCloudSyncStatus("synced");
      showToast("All workspace data synchronized with Cloud Firestore!", "success");
    } catch (err) {
      console.error("Manual cloud sync error:", err);
      setCloudSyncStatus("error");
      showToast("Cloud sync failed. Local cache preserved.", "error");
    }
  };

  const showToast = (message: string, type: "success" | "info" | "warning" | "error" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const openQuickLog = (
    type: "call" | "note" | "meeting" | "email" | "task" | "follow_up",
    accountId?: string,
    oppId?: string,
    contactId?: string
  ) => {
    setQuickLogModal({
      isOpen: true,
      type,
      accountId: accountId || selectedAccountId || undefined,
      opportunityId: oppId || selectedCrmOpportunityId || undefined,
      contactId
    });
  };

  const closeQuickLog = () => {
    setQuickLogModal(null);
  };

  const addAccount = (account: Account) => {
    setAccounts((prev) => [account, ...prev]);
    saveDocToCloud("crm_accounts", account.id, account);
    showToast(`Account "${account.name}" created`, "success");
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const updated = { ...acc, ...updates };
          saveDocToCloud("crm_accounts", id, updated);
          return updated;
        }
        return acc;
      })
    );
    showToast("Account updated", "success");
  };

  const deleteAccount = async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setCrmOpportunities((prev) => prev.filter((d) => d.accountId !== id));
    setContacts((prev) => prev.filter((c) => c.accountId !== id));
    setLeads((prev) => prev.filter((l) => l.convertedAccountId !== id));
    setTasks((prev) => prev.filter((t) => t.accountId !== id));
    setActivities((prev) => prev.filter((a) => a.accountId !== id));
    if (selectedAccountId === id) {
      setSelectedAccountId(null);
    }
    await deleteDocFromCloud("crm_accounts", id);
    showToast("Account removed from workspace", "info");
  };

  const addContact = (contact: CRMContact) => {
    setContacts((prev) => [contact, ...prev]);
    saveDocToCloud("crm_contacts", contact.id, contact);
    showToast(`Contact "${contact.firstName} ${contact.lastName}" added`, "success");
  };

  const updateContact = (id: string, updates: Partial<CRMContact>) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          saveDocToCloud("crm_contacts", id, updated);
          return updated;
        }
        return c;
      })
    );
    showToast("Contact updated", "success");
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    deleteDocFromCloud("crm_contacts", id);
    showToast("Contact removed", "info");
  };

  const addLead = (lead: CRMLead) => {
    setLeads((prev) => [lead, ...prev]);
    saveDocToCloud("crm_leads", lead.id, lead);
    showToast(`Lead "${lead.leadName}" added`, "success");
  };

  const updateLead = (id: string, updates: Partial<CRMLead>) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...updates };
          saveDocToCloud("crm_leads", id, updated);
          return updated;
        }
        return l;
      })
    );
    showToast("Lead updated", "success");
  };

  const convertLead = (leadId: string, targetAccountId?: string): { accountId: string; contactId: string; oppId: string } => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("Lead not found");

    // P0-17: Idempotency Guard - return existing linked IDs if already converted
    if (lead.leadStatus === "Converted" && lead.convertedOpportunityId) {
      showToast(`Lead "${lead.leadName}" is already converted.`, "info");
      return {
        accountId: lead.convertedAccountId || "",
        contactId: lead.convertedContactId || "",
        oppId: lead.convertedOpportunityId
      };
    }

    let accountId = targetAccountId;
    let accountName = lead.company;

    if (!accountId) {
      // Check if account already exists
      const existing = accounts.find((a) => a.name.toLowerCase() === lead.company.toLowerCase());
      if (existing) {
        accountId = existing.id;
        accountName = existing.name;
      } else {
        accountId = `acc-${Date.now()}`;
        const newAcc: Account = {
          id: accountId,
          name: lead.company,
          status: "Prospect",
          industry: "Government & Public Infrastructure",
          customerSegment: lead.company.toLowerCase().includes("council") ? "Local Government / Council" : "Civil Contractor",
          territory: "QLD/NT",
          accountOwner: lead.assignedSalesperson || currentUser.name,
          leadSource: lead.source,
          createdDate: new Date().toISOString().split("T")[0],
          lastInteractionDate: new Date().toISOString().split("T")[0],
          relationshipHealth: "Healthy",
          tags: ["Converted Lead", lead.enquiryType],
          notes: lead.notes,
          metrics: {
            openPipelineValue: lead.estimatedValue,
            totalDealsWon: 0,
            activeDealsCount: 1,
            totalEnquiries: 1
          }
        };
        addAccount(newAcc);
      }
    }

    // Create Contact
    const nameParts = lead.contactName.trim().split(" ");
    const firstName = nameParts[0] || "Contact";
    const lastName = nameParts.slice(1).join(" ") || "";
    const contactId = `con-${Date.now()}`;
    const newContact: CRMContact = {
      id: contactId,
      accountId: accountId!,
      accountName,
      firstName,
      lastName,
      jobTitle: "Key Contact",
      email: lead.contactEmail,
      mobile: lead.contactPhone,
      preferredContactMethod: "Email",
      roleInBuyingProcess: "Decision Maker",
      isDecisionMaker: true,
      influenceLevel: "High",
      relationshipStatus: "Warm",
      contactOwner: lead.assignedSalesperson || currentUser.name,
      tags: ["Converted Lead"],
      notes: `Ingested from lead ${lead.leadName}`
    };
    addContact(newContact);

    // Create Opportunity
    const oppId = `opp-${Date.now()}`;
    const newOpp: CRMOpportunity = {
      id: oppId,
      name: lead.leadName,
      accountId: accountId!,
      accountName,
      primaryContactId: contactId,
      primaryContactName: lead.contactName,
      primaryContactEmail: lead.contactEmail,
      primaryContactPhone: lead.contactPhone,
      opportunityOwner: lead.assignedSalesperson || currentUser.name,
      pipelineId: "pipe-major-projects",
      stageId: "stage-discovery",
      stageName: "Discovery & Qualification",
      dealValue: lead.estimatedValue,
      weightedValue: lead.estimatedValue * 0.25,
      probability: 25,
      forecastCategory: "Pipeline",
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      products: lead.productInterest.map((p, idx) => {
        const resolved = SAMPLE_PRODUCTS.find(sp => sp.name.toLowerCase().includes(p.toLowerCase()) || sp.code.toLowerCase().includes(p.toLowerCase()));
        return {
          id: `prod-line-${idx}`,
          productCode: resolved?.code || "",
          productName: resolved?.name || p,
          category: resolved?.category || "Solar Luminaire",
          quantity: 1
        };
      }),
      projectApplication: lead.enquiryType,
      location: lead.location,
      customerNeed: lead.notes,
      keyRequirements: ["Verify AS/NZS 1158 compliance", "Confirm mounting height"],
      source: lead.source,
      latestActivity: `Lead converted to opportunity by ${lead.assignedSalesperson || currentUser.name}`,
      latestActivityDate: new Date().toISOString().split("T")[0],
      nextAction: lead.nextAction || "Contact customer to begin discovery phase",
      nextActionDate: lead.nextActionDate || new Date().toISOString().split("T")[0],
      daysInCurrentStage: 0,
      totalDealAgeDays: 0,
      dealHealth: "Healthy",
      dealHealthReasons: ["Fresh converted opportunity with verified customer intent"],
      notes: lead.notes
    };
    addCrmOpportunity(newOpp);

    // Update lead status with full persisted linkage metadata
    updateLead(leadId, {
      leadStatus: "Converted",
      convertedAccountId: accountId,
      convertedContactId: contactId,
      convertedOpportunityId: oppId,
      convertedAt: new Date().toISOString(),
      convertedBy: currentUser.name
    });

    logActivity({
      type: "opportunity_created",
      title: `Lead Converted: ${lead.leadName}`,
      description: `Converted into Account "${accountName}" and Opportunity "${lead.leadName}" ($${lead.estimatedValue.toLocaleString()}).`,
      accountId: accountId!,
      accountName,
      contactId,
      contactName: lead.contactName,
      opportunityId: oppId,
      opportunityName: lead.leadName,
      performedBy: currentUser.name
    });

    showToast(`Lead successfully converted to Account, Contact, and Deal!`, "success");
    return { accountId: accountId!, contactId, oppId };
  };

  const addCrmOpportunity = (opp: CRMOpportunity) => {
    setCrmOpportunities((prev) => [opp, ...prev]);
    saveDocToCloud("crm_deals", opp.id, opp);
    showToast(`Opportunity "${opp.name}" added to pipeline`, "success");
  };

  const updateCrmOpportunity = (id: string, updates: Partial<CRMOpportunity>) => {
    setCrmOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id === id) {
          const updated = { ...opp, ...updates };
          // Re-evaluate deal health
          const healthEval = CRMIntelligenceEngine.evaluateDealHealth(updated);
          updated.dealHealth = healthEval.rating;
          updated.dealHealthReasons = healthEval.reasons;
          saveDocToCloud("crm_deals", id, updated);
          return updated;
        }
        return opp;
      })
    );
    showToast("Opportunity updated", "success");
  };

  const deleteCrmOpportunity = async (id: string) => {
    setCrmOpportunities((prev) => prev.filter((d) => d.id !== id));
    setTasks((prev) => prev.filter((t) => t.dealId !== id && t.relatedEntityId !== id));
    setActivities((prev) => prev.filter((a) => a.opportunityId !== id));
    if (selectedCrmOpportunityId === id) {
      setSelectedCrmOpportunityId(null);
    }
    if (selectedOpportunityId === id) {
      setSelectedOpportunityId(null);
    }
    await deleteDocFromCloud("crm_deals", id);
    showToast("Opportunity deleted", "info");
  };

  const clearAllWorkspaceData = async () => {
    // 1. Immediately zero-out React state
    setAccounts([]);
    setCrmOpportunities([]);
    setContacts([]);
    setLeads([]);
    setActivities([]);
    setTasks([]);
    setLocalNotifications([]);
    setServerNotifications([]);
    setSelectedAccountId(null);
    setSelectedCrmOpportunityId(null);
    setSelectedOpportunityId(null);

    // 2. Clear localStorage and write empty arrays so no key resurrects defaults
    localStorage.clear();
    localStorage.setItem("plasgain_crm_accounts", "[]");
    localStorage.setItem("plasgain_crm_deals", "[]");
    localStorage.setItem("plasgain_crm_contacts", "[]");
    localStorage.setItem("plasgain_crm_leads", "[]");
    localStorage.setItem("plasgain_crm_activities", "[]");
    localStorage.setItem("plasgain_crm_tasks", "[]");
    localStorage.setItem("plasgain_notifications", "[]");
    localStorage.setItem("plasgain_competitor_pricing", "[]");
    localStorage.setItem("plasgain_opportunities", "[]");

    // 3. Purge all Firestore collections
    try {
      await Promise.all([
        clearCollectionFromCloud("crm_accounts"),
        clearCollectionFromCloud("crm_deals"),
        clearCollectionFromCloud("crm_contacts"),
        clearCollectionFromCloud("crm_leads"),
        clearCollectionFromCloud("crm_activities"),
        clearCollectionFromCloud("crm_tasks"),
        clearCollectionFromCloud("opportunities"),
        clearCollectionFromCloud("competitor_pricing")
      ]);
    } catch (err) {
      console.warn("[Firebase] Error during clearAllWorkspaceData cloud purge:", err);
    }

    showToast("Workspace & cloud data completely cleared", "info");
  };

  const logActivity = (activityData: Omit<CRMActivity, "id" | "timestamp">) => {
    const newAct: CRMActivity = {
      ...activityData,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setActivities((prev) => [newAct, ...prev]);
    saveDocToCloud("crm_activities", newAct.id, newAct);

    // Update last interaction on related account
    if (activityData.accountId) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === activityData.accountId) {
            const updated = { ...acc, lastInteractionDate: new Date().toISOString().split("T")[0] };
            saveDocToCloud("crm_accounts", acc.id, updated);
            return updated;
          }
          return acc;
        })
      );
    }

    // Update last activity on related opportunity
    if (activityData.opportunityId) {
      setCrmOpportunities((prev) =>
        prev.map((opp) => {
          if (opp.id === activityData.opportunityId) {
            const updated = {
              ...opp,
              latestActivity: activityData.title,
              latestActivityDate: new Date().toISOString().split("T")[0]
            };
            saveDocToCloud("crm_deals", opp.id, updated);
            return updated;
          }
          return opp;
        })
      );
    }

    showToast(`Activity logged: ${activityData.title}`, "success");
  };

  const addTask = (taskData: Omit<CRMTask, "id">) => {
    const newTask: CRMTask = {
      ...taskData,
      id: `task-${Date.now()}`
    };
    setTasks((prev) => [newTask, ...prev]);
    saveDocToCloud("crm_tasks", newTask.id, newTask);
    showToast(`Task "${taskData.title}" created`, "success");
  };

  const updateTask = (id: string, updates: Partial<CRMTask>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          saveDocToCloud("crm_tasks", id, updated);
          return updated;
        }
        return t;
      })
    );
    showToast("Task updated", "success");
  };

  const toggleTaskComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === "Completed";
          const updated = {
            ...t,
            status: (isDone ? "To Do" : "Completed") as "To Do" | "In Progress" | "Completed",
            completedAt: isDone ? undefined : new Date().toISOString()
          };
          saveDocToCloud("crm_tasks", id, updated);
          return updated;
        }
        return t;
      })
    );
    showToast("Task status updated", "success");
  };

  const dismissNotification = (id: string) => {
    archiveNotification(id);
  };

  // Legacy sync
  const addOpportunity = (opp: Opportunity) => {
    setOpportunities((prev) => [opp, ...prev]);
    saveDocToCloud("opportunities", opp.id, opp);
    showToast(`Opportunity "${opp.project}" saved`, "success");
  };

  const updateOpportunity = (id: string, updates: Partial<Opportunity>) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id === id) {
          const updated = { ...opp, ...updates };
          saveDocToCloud("opportunities", id, updated);
          return updated;
        }
        return opp;
      })
    );
  };

  const addDocument = (doc: KnowledgeDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    saveDocToCloud("knowledge_documents", doc.id, doc);
    showToast(`Document "${doc.title}" added to knowledge base`, "success");
  };

  const navigateToWorkflow = (tab: NavTab, toolSub?: string, oppId?: string) => {
    if (tab === "tools" && toolSub) {
      const route = resolveToolRoute(toolSub);
      if (route.isSupported) {
        if (route.targetNavTab === "crm") {
          navigateToCRM(route.targetCrmTab || "pipeline", oppId);
          return;
        }
        setActiveTab(route.targetNavTab);
        if (route.targetToolSubTab) {
          setActiveToolTab(route.targetToolSubTab);
        }
        if (oppId) {
          setSelectedOpportunityId(oppId);
          setSelectedCrmOpportunityId(oppId);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      } else {
        setActiveTab("tools");
        setActiveToolTab(toolSub as ToolSubTab);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setActiveTab(tab);
    if (toolSub) {
      setActiveToolTab(toolSub as ToolSubTab);
    }
    if (oppId) {
      setSelectedOpportunityId(oppId);
      setSelectedCrmOpportunityId(oppId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToCRM = (subTab: CRMSubTab, entityId?: string) => {
    setActiveTab("crm");
    setActiveCRMTab(subTab);
    if (entityId) {
      if (subTab === "accounts") setSelectedAccountId(entityId);
      if (subTab === "pipeline") setSelectedCrmOpportunityId(entityId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dynamic Next Best Actions evaluation
  const nextBestActions = useMemo(() => {
    return CRMIntelligenceEngine.generateNextBestActions(accounts, crmOpportunities, leads, tasks, activities);
  }, [accounts, crmOpportunities, leads, tasks, activities]);

  return (
    <AppContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        activeTab,
        setActiveTab,
        activeCRMTab,
        setActiveCRMTab,
        activeToolTab,
        setActiveToolTab,
        cloudSyncStatus,
        syncAllWithCloud,
        currentUser,
        updateCurrentUser,
        resetCurrentUser,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginAsUser,
        teamMembers,
        deleteTeamMember,
        addTeamMember,
        opportunities,
        setOpportunities,
        addOpportunity,
        updateOpportunity,
        selectedOpportunityId,
        setSelectedOpportunityId,
        accounts,
        setAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
        selectedAccountId,
        setSelectedAccountId,
        contacts,
        setContacts,
        addContact,
        updateContact,
        deleteContact,
        leads,
        setLeads,
        addLead,
        updateLead,
        convertLead,
        crmOpportunities,
        setCrmOpportunities,
        addCrmOpportunity,
        updateCrmOpportunity,
        deleteCrmOpportunity,
        selectedCrmOpportunityId,
        setSelectedCrmOpportunityId,
        clearAllWorkspaceData,
        activities,
        logActivity,
        tasks,
        addTask,
        updateTask,
        toggleTaskComplete,
        pipelines,
        activePipelineId,
        setActivePipelineId,
        nextBestActions,
        notifications: activeNotifications,
        unreadNotificationsCount,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        archiveNotification,
        dismissNotification,
        activeBackgroundAnalysisJob,
        setActiveBackgroundAnalysisJob,
        competitorPricingRecords,
        competitorAlerts,
        unreadCompetitorAlertsCount,
        addCompetitorPricing,
        updateCompetitorPricing,
        markCompetitorAlertRead,
        fetchCompetitorData,
        documents,
        addDocument,
        products,
        lessons,
        glossary,
        currentEnquiryAnalysis,
        setCurrentEnquiryAnalysis,
        rawEnquiryInput,
        setRawEnquiryInput,
        explainingTerm,
        setExplainingTerm,
        isCopilotOpen,
        setIsCopilotOpen,
        isCopilotContextPinned,
        setIsCopilotContextPinned,
        clearCopilotContext,
        togglePinCopilotContext,
        isSearchOpen,
        setIsSearchOpen,
        quickLogModal,
        openQuickLog,
        closeQuickLog,
        isEmailComposerOpen,
        emailComposerLaunchContext,
        openEmailComposer,
        closeEmailComposer,
        toast,
        showToast,
        navigateToWorkflow,
        navigateToCRM
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
