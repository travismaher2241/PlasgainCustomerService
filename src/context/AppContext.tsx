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
  CompetitorPricingAlert
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
import {
  saveDocToCloud,
  loadDocFromCloud,
  loadCollectionFromCloud,
  syncBatchToCloud,
  deleteDocFromCloud
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

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Sarah Reed",
  role: "Internal Sales",
  location: "Melbourne",
  email: ""
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
  selectedCrmOpportunityId: string | null;
  setSelectedCrmOpportunityId: (id: string | null) => void;

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
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  dismissNotification: (id: string) => void;

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
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [activeCRMTab, setActiveCRMTab] = useState<CRMSubTab>("today");
  const [activeToolTab, setActiveToolTab] = useState<ToolSubTab>("plan-takeoff");

  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">("syncing");

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("plasgain_user_profile");
      return saved ? { ...DEFAULT_USER_PROFILE, ...JSON.parse(saved) } : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });

  const updateCurrentUser = (updates: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updates };
      saveDocToCloud("settings", "user_profile", next);
      return next;
    });
  };

  const resetCurrentUser = () => {
    setCurrentUser(DEFAULT_USER_PROFILE);
    saveDocToCloud("settings", "user_profile", DEFAULT_USER_PROFILE);
  };

  // Load Relational CRM Data from LocalStorage or Defaults

  const [crmOpportunities, setCrmOpportunities] = useState<CRMOpportunity[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_deals");
    return saved ? JSON.parse(saved) : INITIAL_OPPORTUNITIES;
  });

  const [rawAccounts, setRawAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_accounts");
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
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
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [leads, setLeads] = useState<CRMLead[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_leads");
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [activities, setActivities] = useState<CRMActivity[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_activities");
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  const [tasks, setTasks] = useState<CRMTask[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_tasks");
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [pipelines] = useState<PipelineConfig[]>(DEFAULT_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>("pipe-major-projects");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>("acc-001");
  const [selectedCrmOpportunityId, setSelectedCrmOpportunityId] = useState<string | null>("opp-001");

  // Unified opportunities derived dynamically from single CRM source of truth
  const opportunities = useMemo(() => {
    return crmOpportunities.map(crmOpportunityToOpportunity);
  }, [crmOpportunities]);

  const setOpportunities = (_newOpps?: any) => {
    // Compatibility stub - mutations must go through crmOpportunities
  };

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>("opp-001");

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

  
  // Server-backed Notifications
  const [serverNotifications, setServerNotifications] = useState<CRMNotification[]>([]);
  const unreadNotificationsCount = useMemo(() => {
    return (serverNotifications || []).filter((n) => !n.isRead && !n.isArchived).length;
  }, [serverNotifications]);
  const [copilotCustomContext, setCopilotCustomContext] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      if (typeof window === "undefined") return;
      const res = await fetch(getApiUrl("/api/notifications"));
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) setServerNotifications(data.notifications);
      }
    } catch (err) {
      // Ignored in offline / test mode
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/notifications/${id}/read`), { method: "PATCH" });
      if (res.ok) {
        setServerNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch(getApiUrl("/api/notifications/mark-all-read"), { method: "POST" });
      if (res.ok) {
        setServerNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/notifications/${id}/archive`), { method: "PATCH" });
      if (res.ok) {
        setServerNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error("Error archiving notification:", err);
    }
  };

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

  // Fallback initial notifications
  const [localNotifications, setLocalNotifications] = useState<CRMNotification[]>([

    {
      id: "notif-1",
      title: "Quote Follow-Up Overdue",
      message: "Gold Coast Foreshore Quote Q-1042 ($92,400) sent 15 days ago with no response.",
      timestamp: "Today",
      type: "warning",
      isRead: false,
      linkTo: { view: "opportunities", id: "opp-003" }
    },
    {
      id: "notif-2",
      title: "New Hot Lead Ingested",
      message: "Sunshine Coast Council (Liam O'Connor) requested 18x Intense 50W lights for Ewen Maddock Dam Trail.",
      timestamp: "Today",
      type: "action_required",
      isRead: false,
      linkTo: { view: "leads", id: "lead-001" }
    }
  ]);

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

        // 1. User Profile
        const cloudUser = await loadDocFromCloud<UserProfile>("settings", "user_profile");
        if (cloudUser && isMounted) {
          setCurrentUser((prev) => ({ ...prev, ...cloudUser }));
        } else {
          await saveDocToCloud("settings", "user_profile", currentUser);
        }

        // 2. Accounts
        const cloudAccounts = await loadCollectionFromCloud<Account>("crm_accounts");
        if (cloudAccounts.length > 0 && isMounted) {
          setAccounts(cloudAccounts);
        } else {
          await syncBatchToCloud("crm_accounts", INITIAL_ACCOUNTS);
        }

        // 3. Contacts
        const cloudContacts = await loadCollectionFromCloud<CRMContact>("crm_contacts");
        if (cloudContacts.length > 0 && isMounted) {
          setContacts(cloudContacts);
        } else {
          await syncBatchToCloud("crm_contacts", INITIAL_CONTACTS);
        }

        // 4. Leads
        const cloudLeads = await loadCollectionFromCloud<CRMLead>("crm_leads");
        if (cloudLeads.length > 0 && isMounted) {
          setLeads(cloudLeads);
        } else {
          await syncBatchToCloud("crm_leads", INITIAL_LEADS);
        }

        // 5. CRM Deals
        const cloudDeals = await loadCollectionFromCloud<CRMOpportunity>("crm_deals");
        if (cloudDeals.length > 0 && isMounted) {
          setCrmOpportunities(cloudDeals);
        } else {
          await syncBatchToCloud("crm_deals", INITIAL_OPPORTUNITIES);
        }

        // 6. Activities
        const cloudActivities = await loadCollectionFromCloud<CRMActivity>("crm_activities");
        if (cloudActivities.length > 0 && isMounted) {
          setActivities(cloudActivities);
        } else {
          await syncBatchToCloud("crm_activities", INITIAL_ACTIVITIES);
        }

        // 7. Tasks
        const cloudTasks = await loadCollectionFromCloud<CRMTask>("crm_tasks");
        if (cloudTasks.length > 0 && isMounted) {
          setTasks(cloudTasks);
        } else {
          await syncBatchToCloud("crm_tasks", INITIAL_TASKS);
        }

        // 8. Opportunities (Legacy)
        const cloudOpps = await loadCollectionFromCloud<Opportunity>("opportunities");
        if (cloudOpps.length > 0 && isMounted) {
          setOpportunities(cloudOpps);
        } else {
          await syncBatchToCloud("opportunities", SAMPLE_OPPORTUNITIES);
        }

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

    // Update lead status
    updateLead(leadId, {
      leadStatus: "Converted",
      convertedAccountId: accountId,
      convertedContactId: contactId,
      convertedOpportunityId: oppId
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
        currentUser,
        updateCurrentUser,
        resetCurrentUser,
        cloudSyncStatus,
        syncAllWithCloud,
        activeTab,
        setActiveTab,
        activeCRMTab,
        setActiveCRMTab,
        activeToolTab,
        setActiveToolTab,
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
        selectedCrmOpportunityId,
        setSelectedCrmOpportunityId,
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
        notifications: serverNotifications.length > 0 ? serverNotifications : localNotifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        archiveNotification,
        dismissNotification,
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
        isSearchOpen,
        setIsSearchOpen,
        quickLogModal,
        openQuickLog,
        closeQuickLog,
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
