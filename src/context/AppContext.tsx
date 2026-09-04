import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  Account,
  CRMContact,
  CRMLead,
  CRMOpportunity,
  CRMActivity,
  CRMTask,
  TaskType,
  PipelineConfig,
  NextBestActionItem,
  CRMNotification,
  CompetitorPricingRecord,
  CompetitorPricingAlert,
  EmailComposerLaunchContext,
  AuditLogRecord,
  AuditActionType,
  AuditEntityType,
  Opportunity,
  CRMKnowledgeItem,
  ContactAccountHistoryItem,
  ActivityParticipant,
  ContactNotableEvent
} from "../types/crm";
import {
  extractCandidateNotableEvents,
  extractCrmKnowledge,
  deduplicateOrMergeKnowledge
} from "../utils/crmKnowledgeEngine";
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
import { formatAuDate, formatAuTime } from "../utils/dateUtils";
import { setSessionToken } from "../utils/apiClient";
import {
  saveDocToCloud,
  loadDocFromCloud,
  loadCollectionFromCloud,
  syncBatchToCloud,
  deleteDocFromCloud,
  clearCollectionFromCloud,
  checkCloudHealth,
  flushOfflineQueue,
  getQueuedWritesCount,
  getLastSyncTime,
  recordSuccessfulSync
} from "../utils/firebase";

export type NavTab = "home" | "crm" | "settings";

export type CRMSubTab =
  | "today"
  | "accounts"
  | "pipeline"
  | "calendar"
  | "leads"
  | "tasks"
  | "competitor-pricing";


/** Who is signed in. Editable in Settings; persisted per browser. */
export interface UserProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  email: string;
  phone?: string;
  pin?: string;
  isAdmin?: boolean;
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
    role: "Internal Sales & Technical Lead",
    location: "Drouin, VIC",
    email: "travis@plasgain.com.au",
    phone: "0412 345 678",
    isAdmin: true
  },
  {
    id: "user-sarah-reed",
    name: "Sarah Reed",
    role: "Internal Sales",
    location: "Melbourne, VIC",
    email: "sarah.reed@plasgain.com.au",
    phone: "+61 3 9000 1122",
    isAdmin: false
  },
  {
    id: "user-rob-mitchell",
    name: "Rob Mitchell",
    role: "Sales Director",
    location: "Sydney, NSW",
    email: "rob.mitchell@plasgain.com.au",
    phone: "+61 400 999 888",
    isAdmin: true
  }
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "user-travis-maher",
  name: "Travis Maher",
  role: "Internal Sales & Technical Lead",
  location: "Drouin, VIC",
  email: "travis@plasgain.com.au",
  phone: "0412 345 678",
  isAdmin: true
};

/** Two letters from the name, for the avatar. Falls back to "?" when empty. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface OpenQuickLogOptions {
  type?: "call" | "note" | "meeting" | "email" | "task" | "follow_up";
  accountId?: string;
  oppId?: string;
  opportunityId?: string;
  contactId?: string;
  prefillNotes?: string;
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
  moveContact: (
    contactId: string,
    destinationAccountId: string,
    reason?: string,
    updates?: { role?: string; email?: string; phone?: string }
  ) => void;
  archiveContact: (contactId: string, reason?: string) => void;
  restoreContact: (contactId: string) => void;
  confirmCandidateNotableEvent: (contactId: string, eventId: string) => void;
  dismissCandidateNotableEvent: (contactId: string, eventId: string) => void;

  knowledge: CRMKnowledgeItem[];
  setKnowledge: React.Dispatch<React.SetStateAction<CRMKnowledgeItem[]>>;
  addKnowledgeItem: (item: CRMKnowledgeItem) => void;
  updateKnowledgeItem: (id: string, updates: Partial<CRMKnowledgeItem>) => void;
  archiveKnowledgeItem: (id: string) => void;
  deleteKnowledgeItem: (id: string) => void;

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

  activities: CRMActivity[];
  logActivity: (activity: Omit<CRMActivity, "id" | "timestamp">) => {
    activity: CRMActivity;
    candidateNotableEvents: ContactNotableEvent[];
    extractedKnowledge: CRMKnowledgeItem[];
  };

  // Audit Logs & Workspace History (Append-Only)
  auditLogs: AuditLogRecord[];
  recordAuditLog: (
    action: AuditActionType,
    entityType: AuditEntityType,
    entityId: string,
    entityName: string,
    details: string,
    changes?: Record<string, { from?: any; to?: any }>,
    metadata?: Record<string, any>
  ) => Promise<void>;
  refreshSharedData: () => Promise<void>;

  tasks: CRMTask[];
  addTask: (task: Omit<CRMTask, "id">) => void;
  updateTask: (id: string, updates: Partial<CRMTask>) => void;
  toggleTaskComplete: (id: string) => void;
  scheduleCustomerMeeting: (meetingData: Partial<CRMTask>) => CRMTask;

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

  // Competitor Pricing Intelligence (Shared Server-Backed)
  competitorPricingRecords: CompetitorPricingRecord[];
  competitorAlerts: CompetitorPricingAlert[];
  unreadCompetitorAlertsCount: number;
  addCompetitorPricing: (recordData: Omit<CompetitorPricingRecord, "id" | "createdAt" | "updatedAt">) => Promise<CompetitorPricingRecord | null>;
  updateCompetitorPricing: (id: string, updates: Partial<CompetitorPricingRecord>) => Promise<CompetitorPricingRecord | null>;
  markCompetitorAlertRead: (alertId: string) => Promise<void>;
  fetchCompetitorData: () => Promise<void>;

  // Global Copilot Drawer
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  isCopilotContextPinned: boolean;
  setIsCopilotContextPinned: (pinned: boolean) => void;
  clearCopilotContext: () => void;
  copilotCustomContext: string | null;
  openCopilotWithContext: (contextStr: string, initialPrompt?: string) => void;
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
    /** Carried over from the call briefing so the rep does not retype it. */
    prefillNotes?: string;
  } | null;
  openQuickLog: {
    (options?: OpenQuickLogOptions): void;
    (
      type: "call" | "note" | "meeting" | "email" | "task" | "follow_up",
      accountId?: string,
      oppId?: string,
      contactId?: string,
      prefillNotes?: string
    ): void;
  };
  closeQuickLog: () => void;

  // Call Preparation & Briefing Modal State
  callPrepModal: {
    isOpen: boolean;
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
    taskId?: string;
    taskTitle?: string;
  } | null;
  openCallPrep: (context?: {
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
    taskId?: string;
    taskTitle?: string;
  }) => void;
  closeCallPrep: () => void;

  // Customer Meeting Scheduling Modal State
  scheduleMeetingModal: {
    isOpen: boolean;
    prefill?: {
      accountId?: string;
      contactId?: string;
      date?: string;
      opportunityId?: string;
    };
  } | null;
  openScheduleMeeting: (prefill?: {
    accountId?: string;
    contactId?: string;
    date?: string;
    opportunityId?: string;
  }) => void;
  closeScheduleMeeting: () => void;

  // Next-Day & Customer Meeting Preparation Modal State
  meetingPrepModal: {
    isOpen: boolean;
    meetingId?: string;
  } | null;
  openMeetingPrep: (meetingId: string) => void;
  closeMeetingPrep: () => void;

  // AI Email Composer Modal
  isEmailComposerOpen: boolean;
  emailComposerLaunchContext: EmailComposerLaunchContext | null;
  openEmailComposer: (context?: EmailComposerLaunchContext) => void;
  closeEmailComposer: () => void;

  // Notification / Toast
  toast: { message: string; type: "success" | "info" | "warning" | "error" } | null;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;

  // Cloud Firestore Sync
  cloudSyncStatus: "synced" | "syncing" | "offline" | "queued" | "error";
  lastCloudSyncTime: string | null;
  queuedWritesCount: number;
  syncAllWithCloud: () => Promise<void>;
  flushPendingWrites: () => Promise<void>;

  // Authentication & User Management
  switchUserWithPin: (userId: string, pin: string) => Promise<{ success: boolean; error?: string }>;

  // Navigate helper
  navigateToWorkflow: (tab: NavTab, toolSub?: string, oppId?: string) => void;
  navigateToCRM: (subTab: CRMSubTab, entityId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<NavTab>("home");
  const [activeCRMTab, setActiveCRMTab] = useState<CRMSubTab>("today");

  const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "offline" | "queued" | "error">("syncing");
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => getLastSyncTime());
  const [queuedWritesCount, setQueuedWritesCount] = useState<number>(() => getQueuedWritesCount());

  // Warn if user attempts to leave/close tab while offline writes are pending
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const count = getQueuedWritesCount();
      if (count > 0) {
        e.preventDefault();
        e.returnValue = `You have ${count} pending changes queued offline. Closing now may delay syncing.`;
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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
    const { pin: _discardedPin, ...safeProfile } = profile;
    const userWithId: UserProfile = { ...safeProfile, id: userId };
    setCurrentUser(userWithId);
    localStorage.setItem("plasgain_user_profile", JSON.stringify(userWithId));
    localStorage.setItem("plasgain_active_user_id", userId);
    saveDocToCloud("users", userId, userWithId);
    setIsLoginModalOpen(false);
    showToast(`Signed in as ${userWithId.name} (${userWithId.role || "Sales"})`, "success");
  };

  const switchUserWithPin = async (userId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const target = teamMembers.find((m) => m.id === userId || m.name.toLowerCase() === userId.toLowerCase());
    if (!target) return { success: false, error: "Team member profile not found" };
    try {
      const response = await fetch(getApiUrl("/api/auth/verify-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.id, pin: pin.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || "Unable to verify this profile." };
      }
      // Hold the session token so privileged calls carry a verified identity.
      // The role comes back from the server too — the client no longer decides
      // its own authority.
      setSessionToken(result.token || null);
      loginAsUser({
        ...target,
        role: result.profile?.role || target.role,
        isAdmin: result.profile?.isAdmin === true
      });
      return { success: true };
    } catch {
      return { success: false, error: "Authentication service unavailable. Please try again shortly." };
    }
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
    if (!currentUser.isAdmin) {
      showToast("Only administrators can remove team members.", "error");
      return;
    }
    const memberToDelete = teamMembers.find(
      (m) => m.id === idOrName || m.name.toLowerCase() === idOrName.toLowerCase()
    );
    if (!memberToDelete) return;

    if (
      currentUser.name.toLowerCase() === memberToDelete.name.toLowerCase() ||
      (currentUser.id && currentUser.id === memberToDelete.id)
    ) {
      showToast("You cannot remove the profile you are signed in as.", "warning");
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
    if (!currentUser.isAdmin) {
      showToast("Only administrators can add team members.", "error");
      return;
    }
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

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem("plasgain_audit_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const recordAuditLog = async (
    action: AuditActionType,
    entityType: AuditEntityType,
    entityId: string,
    entityName: string,
    details: string,
    changes?: Record<string, { from?: any; to?: any }>,
    metadata?: Record<string, any>
  ) => {
    const record: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id || "user-unknown",
      userName: currentUser.name || "Unknown User",
      userRole: currentUser.role || (currentUser.isAdmin ? "Administrator" : "Sales Team"),
      action,
      entityType,
      entityId,
      entityName,
      details,
      changes,
      metadata
    };

    setAuditLogs((prev) => {
      const updated = [record, ...prev].slice(0, 500);
      try {
        localStorage.setItem("plasgain_audit_logs", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    saveDocToCloud("audit_logs", record.id, record);
  };

  const resetCurrentUser = () => {
    setCurrentUser(DEFAULT_USER_PROFILE);
    localStorage.setItem("plasgain_user_profile", JSON.stringify(DEFAULT_USER_PROFILE));
    localStorage.removeItem("plasgain_active_user_id");
  };

  // Known sample prefixes and exact legacy seed IDs to purge from legacy caches and Firestore
  const KNOWN_SAMPLE_PREFIXES = [
    "sample-", "seed-", "test-", "mock-", "demo-",
    "acc-00", "opp-00", "lead-00", "con-00", "task-00", "act-00", "comp-00", "notif-",
    "acc-sample-", "acc-demo-", "lead-sample-", "lead-demo-", "opp-sample-", "opp-demo-",
    "con-sample-", "con-demo-", "task-sample-", "task-demo-", "act-sample-", "act-demo-",
    "acc-offline", "opp-offline", "offline-",
    "cp-00", "cpa-00", "comp-"
  ];
  const KNOWN_SAMPLE_IDS = new Set([
    "acc-1", "acc-2", "acc-3", "acc-4", "acc-5", "acc-6", "acc-7", "acc-8",
    "opp-1", "opp-2", "opp-3", "opp-4", "opp-5", "opp-6", "opp-7", "opp-8",
    "con-1", "con-2", "con-3", "con-4", "con-5", "con-6", "con-7", "con-8",
    "lead-1", "lead-2", "lead-3", "lead-4", "lead-5",
    "task-1", "task-2", "task-3", "task-4", "task-5",
    "act-1", "act-2", "act-3", "act-4", "act-5",
    "comp-1", "comp-2", "comp-3", "acc-offline-1", "acc-offline-2",
    "cp-001", "cp-002", "cp-003", "cpa-001", "cpa-002"
  ]);

  const isSampleRecord = (item: any): boolean => {
    if (!item) return false;
    if (item.isSample === true) return true;
    const id = String(item.id || "").toLowerCase();
    const accountId = String(item.accountId || "").toLowerCase();
    const dealId = String(item.dealId || item.opportunityId || "").toLowerCase();

    if (KNOWN_SAMPLE_PREFIXES.some((p) => id.startsWith(p) || accountId.startsWith(p) || dealId.startsWith(p))) {
      return true;
    }

    if (KNOWN_SAMPLE_IDS.has(id) || KNOWN_SAMPLE_IDS.has(accountId) || KNOWN_SAMPLE_IDS.has(dealId)) {
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

  const [knowledge, setKnowledge] = useState<CRMKnowledgeItem[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_knowledge");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  });

  const [pipelines] = useState<PipelineConfig[]>(DEFAULT_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>("pipe-major-projects");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => rawAccounts[0]?.id || null);
  const [selectedCrmOpportunityId, setSelectedCrmOpportunityId] = useState<string | null>(null);

  // Unified opportunities derived dynamically from single CRM source of truth
  const opportunities = useMemo(() => {
    return crmOpportunities.map(crmOpportunityToOpportunity);
  }, [crmOpportunities]);

  const setOpportunities = (_newOpps?: any) => {
    // Compatibility stub - mutations must go through crmOpportunities
  };

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [quickLogModal, setQuickLogModal] = useState<{
    isOpen: boolean;
    type: "call" | "note" | "meeting" | "email" | "task" | "follow_up";
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
    /** Carried over from the call briefing so the rep does not retype it. */
    prefillNotes?: string;
  } | null>(null);

  const [callPrepModal, setCallPrepModal] = useState<{
    isOpen: boolean;
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
    taskId?: string;
    taskTitle?: string;
  } | null>(null);

  // Customer Meeting Scheduling & Meeting Prep Modal States
  const [scheduleMeetingModal, setScheduleMeetingModal] = useState<{
    isOpen: boolean;
    prefill?: {
      accountId?: string;
      contactId?: string;
      date?: string;
      opportunityId?: string;
    };
  } | null>(null);

  const [meetingPrepModal, setMeetingPrepModal] = useState<{
    isOpen: boolean;
    meetingId?: string;
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
    setSelectedAccountId(null);
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
        if (data.notifications) {
          setServerNotifications(
            data.notifications
              .map(normalizeNotification)
              .filter((n: any) => !isSampleRecord(n))
          );
        }
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


  const openCopilotWithContext = (contextStr: string, initialPrompt?: string) => {
    setCopilotCustomContext(contextStr);
    setIsCopilotOpen(true);
  };

  // Server-backed Competitor Pricing Intelligence & Team Alerts (with localStorage fallback)
  const [competitorPricingRecords, setCompetitorPricingRecords] = useState<CompetitorPricingRecord[]>(() => {
    try {
      const saved = localStorage.getItem("plasgain_competitor_pricing");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
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
        if (data.records) setCompetitorPricingRecords(data.records.filter((r: any) => !isSampleRecord(r)));
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        if (data.alerts) setCompetitorAlerts(data.alerts.filter((a: any) => !isSampleRecord(a)));
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
        showToast("Competitor price saved. The team has been notified.", "success");
        return data.record;
      }
      return null;
    } catch (err: any) {
      console.error("Error adding competitor pricing:", err);
      showToast("The competitor price could not be saved. Try again.", "error");
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
      showToast("The competitor price could not be updated. Try again.", "error");
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
    // No title blocklist here. Test records were being hidden by matching on
    // "Test Alert" / "Mark Read Test", which masked the real problem — the suite
    // writing into the live store — and would have hidden a genuine
    // customer notification that happened to share the title.
    return list.map(normalizeNotification);
  }, [serverNotifications, localNotifications]);

  const unreadNotificationsCount = useMemo(() => {
    return getUnreadNotificationsCount(activeNotifications);
  }, [activeNotifications]);

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    // Clear stale deal/opportunity context on unrelated workspace navigation when not pinned (P1-07)
    if (!isCopilotContextPinned) {
      if (tab === "settings" || tab === "home") {
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
    localStorage.setItem("plasgain_crm_knowledge", JSON.stringify(knowledge));
  }, [knowledge]);

  useEffect(() => {
    localStorage.setItem("plasgain_opportunities", JSON.stringify(opportunities));
  }, [opportunities]);


  // Automatic Cloud Firestore Initialization & Bidirectional Sync
  useEffect(() => {
    let isMounted = true;
    async function initCloudSync() {
      try {
        setCloudSyncStatus("syncing");

        // Health probe
        const health = await checkCloudHealth();
        if (!health.online) {
          if (isMounted) {
            const queued = getQueuedWritesCount();
            setCloudSyncStatus(queued > 0 ? "queued" : "offline");
            setQueuedWritesCount(queued);
            setLastCloudSyncTime(getLastSyncTime());
          }
          return;
        }

        // Flush offline queue if any
        if (getQueuedWritesCount() > 0) {
          await flushOfflineQueue();
          if (isMounted) {
            setQueuedWritesCount(getQueuedWritesCount());
            setLastCloudSyncTime(getLastSyncTime());
          }
        }

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

        const isMigrationPurgeNeeded = !localStorage.getItem("plasgain_sample_purge_v1");
        let totalPurged = 0;

        // 2. Accounts
        const cloudAccounts = await loadCollectionFromCloud<Account>("crm_accounts");
        if (isMigrationPurgeNeeded) {
          const sampleAccounts = cloudAccounts.filter(isSampleRecord);
          sampleAccounts.forEach((a) => {
            console.warn('[Data Safety] Purged legacy sample record:', a.id);
            deleteDocFromCloud("crm_accounts", a.id);
            totalPurged++;
          });
        }
        const realAccounts = cloudAccounts.filter((a) => !isSampleRecord(a));
        if (isMounted) setAccounts(realAccounts);

        // 3. Contacts
        const cloudContacts = await loadCollectionFromCloud<CRMContact>("crm_contacts");
        if (isMigrationPurgeNeeded) {
          const sampleContacts = cloudContacts.filter(isSampleRecord);
          sampleContacts.forEach((c) => {
            console.warn('[Data Safety] Purged legacy sample record:', c.id);
            deleteDocFromCloud("crm_contacts", c.id);
            totalPurged++;
          });
        }
        const realContacts = cloudContacts.filter((c) => !isSampleRecord(c));
        if (isMounted) setContacts(realContacts);

        // 4. Leads
        const cloudLeads = await loadCollectionFromCloud<CRMLead>("crm_leads");
        if (isMigrationPurgeNeeded) {
          const sampleLeads = cloudLeads.filter(isSampleRecord);
          sampleLeads.forEach((l) => {
            console.warn('[Data Safety] Purged legacy sample record:', l.id);
            deleteDocFromCloud("crm_leads", l.id);
            totalPurged++;
          });
        }
        const realLeads = cloudLeads.filter((l) => !isSampleRecord(l));
        if (isMounted) setLeads(realLeads);

        // 5. CRM Deals
        const cloudDeals = await loadCollectionFromCloud<CRMOpportunity>("crm_deals");
        if (isMigrationPurgeNeeded) {
          const sampleDeals = cloudDeals.filter(isSampleRecord);
          sampleDeals.forEach((d) => {
            console.warn('[Data Safety] Purged legacy sample record:', d.id);
            deleteDocFromCloud("crm_deals", d.id);
            totalPurged++;
          });
        }
        const realDeals = cloudDeals.filter((d) => !isSampleRecord(d));
        if (isMounted) setCrmOpportunities(realDeals);

        // 6. Activities
        const cloudActivities = await loadCollectionFromCloud<CRMActivity>("crm_activities");
        if (isMigrationPurgeNeeded) {
          const sampleActivities = cloudActivities.filter(isSampleRecord);
          sampleActivities.forEach((a) => {
            console.warn('[Data Safety] Purged legacy sample record:', a.id);
            deleteDocFromCloud("crm_activities", a.id);
            totalPurged++;
          });
        }
        const realActivities = cloudActivities.filter((a) => !isSampleRecord(a));
        if (isMounted) setActivities(realActivities);

        // 7. Tasks
        const cloudTasks = await loadCollectionFromCloud<CRMTask>("crm_tasks");
        if (isMigrationPurgeNeeded) {
          const sampleTasks = cloudTasks.filter(isSampleRecord);
          sampleTasks.forEach((t) => {
            console.warn('[Data Safety] Purged legacy sample record:', t.id);
            deleteDocFromCloud("crm_tasks", t.id);
            totalPurged++;
          });
        }
        const realTasks = cloudTasks.filter((t) => !isSampleRecord(t));
        if (isMounted) setTasks(realTasks);

        // 8. Opportunities (Legacy)
        const cloudOpps = await loadCollectionFromCloud<Opportunity>("opportunities");
        if (isMigrationPurgeNeeded) {
          const sampleOpps = cloudOpps.filter(isSampleRecord);
          sampleOpps.forEach((o) => {
            console.warn('[Data Safety] Purged legacy sample record:', o.id);
            deleteDocFromCloud("opportunities", o.id);
            totalPurged++;
          });
        }
        const realOpps = cloudOpps.filter((o) => !isSampleRecord(o));
        if (isMounted) setOpportunities(realOpps);

        if (isMigrationPurgeNeeded) {
          try {
            localStorage.setItem("plasgain_sample_purge_v1", "true");
          } catch {
            // ignore localStorage quota errors
          }
          if (totalPurged > 0) {
            // Housekeeping the user did not ask for and cannot act on: logged, not shown.
            console.info(`[Plasgain] Removed ${totalPurged} legacy sample records`);
          }
        }

        // 9. Audit Logs (Append-Only)
        const cloudAuditLogs = await loadCollectionFromCloud<AuditLogRecord>("audit_logs");
        const realAuditLogs = cloudAuditLogs.filter((a) => !isSampleRecord(a));
        if (isMounted && realAuditLogs.length > 0) {
          setAuditLogs((prev) => {
            const map = new Map<string, AuditLogRecord>();
            [...prev, ...realAuditLogs].forEach((l) => {
              if (l && l.id) map.set(l.id, l);
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ).slice(0, 500);
          });
        }

        if (isMounted) {
          setCloudSyncStatus("synced");
          setLastCloudSyncTime(getLastSyncTime());
          setQueuedWritesCount(getQueuedWritesCount());
        }
      } catch (err) {
        console.warn("[Firebase] Initial cloud sync warning:", err);
        if (isMounted) {
          const queued = getQueuedWritesCount();
          setCloudSyncStatus(queued > 0 ? "queued" : "offline");
          setQueuedWritesCount(queued);
        }
      }
    }

    initCloudSync();

    // Setup periodic polling & window focus synchronization for multi-user real-time shared database
    const syncInterval = setInterval(() => {
      refreshSharedData();
    }, 25000);

    const onWindowFocus = () => {
      refreshSharedData();
    };

    window.addEventListener("focus", onWindowFocus);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  const refreshSharedData = async () => {
    try {
      const [
        cloudAccounts,
        cloudContacts,
        cloudLeads,
        cloudDeals,
        cloudActivities,
        cloudTasks,
        cloudAuditLogs
      ] = await Promise.all([
        loadCollectionFromCloud<Account>("crm_accounts"),
        loadCollectionFromCloud<CRMContact>("crm_contacts"),
        loadCollectionFromCloud<CRMLead>("crm_leads"),
        loadCollectionFromCloud<CRMOpportunity>("crm_deals"),
        loadCollectionFromCloud<CRMActivity>("crm_activities"),
        loadCollectionFromCloud<CRMTask>("crm_tasks"),
        loadCollectionFromCloud<AuditLogRecord>("audit_logs")
      ]);

      const realAccounts = cloudAccounts.filter((a) => !isSampleRecord(a));
      if (realAccounts.length > 0) setAccounts(realAccounts);

      const realContacts = cloudContacts.filter((c) => !isSampleRecord(c));
      if (realContacts.length > 0) setContacts(realContacts);

      const realLeads = cloudLeads.filter((l) => !isSampleRecord(l));
      if (realLeads.length > 0) setLeads(realLeads);

      const realDeals = cloudDeals.filter((d) => !isSampleRecord(d));
      if (realDeals.length > 0) setCrmOpportunities(realDeals);

      const realActivities = cloudActivities.filter((a) => !isSampleRecord(a));
      if (realActivities.length > 0) setActivities(realActivities);

      const realTasks = cloudTasks.filter((t) => !isSampleRecord(t));
      if (realTasks.length > 0) setTasks(realTasks);

      const realAudit = cloudAuditLogs.filter((a) => !isSampleRecord(a));
      if (realAudit.length > 0) {
        setAuditLogs((prev) => {
          const map = new Map<string, AuditLogRecord>();
          [...prev, ...realAudit].forEach((l) => {
            if (l && l.id) map.set(l.id, l);
          });
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ).slice(0, 500);
        });
      }

      setLastCloudSyncTime(getLastSyncTime());
    } catch (err) {
      console.warn("[SharedDB] Background sync skipped:", err);
    }
  };

  const flushPendingWrites = async () => {
    setCloudSyncStatus("syncing");
    try {
      const res = await flushOfflineQueue();
      setQueuedWritesCount(getQueuedWritesCount());
      setLastCloudSyncTime(getLastSyncTime());
      if (res.success) {
        setCloudSyncStatus("synced");
        showToast(`Saved ${res.processedCount} change${res.processedCount === 1 ? "" : "s"} that were waiting for a connection.`, "success");
      } else {
        setCloudSyncStatus("queued");
        showToast("Some changes are still waiting for a connection.", "warning");
      }
    } catch (err) {
      console.error("Error flushing offline queue:", err);
      setCloudSyncStatus("error");
      showToast("Could not save the waiting changes. They are still on this device.", "error");
    }
  };

  const syncAllWithCloud = async () => {
    setCloudSyncStatus("syncing");
    try {
      if (getQueuedWritesCount() > 0) {
        await flushOfflineQueue();
      }
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
      setLastCloudSyncTime(getLastSyncTime());
      setQueuedWritesCount(getQueuedWritesCount());
      showToast("Everything is saved to the team database.", "success");
    } catch (err) {
      console.error("Manual cloud sync error:", err);
      setCloudSyncStatus("error");
      showToast("Could not reach the team database. Your work is saved on this device.", "error");
    }
  };

  const showToast = (message: string, type: "success" | "info" | "warning" | "error" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const openQuickLog = (
    optionsOrType?: OpenQuickLogOptions | "call" | "note" | "meeting" | "email" | "task" | "follow_up",
    accountId?: string,
    oppId?: string,
    contactId?: string,
    prefillNotes?: string
  ) => {
    let opts: OpenQuickLogOptions = {};
    if (typeof optionsOrType === "object" && optionsOrType !== null) {
      opts = optionsOrType;
    } else if (typeof optionsOrType === "string") {
      opts = {
        type: optionsOrType,
        accountId,
        oppId,
        contactId,
        prefillNotes
      };
    }

    const type = opts.type || "call";
    const targetAccountId = opts.accountId;
    let targetOppId = opts.opportunityId || opts.oppId;

    if (targetAccountId) {
      // If accountId is provided and oppId is not, do not fall back to selectedCrmOpportunityId.
      // If both are provided, verify the deal belongs to the account before attaching it; if it doesn't, drop the deal and log a warning.
      if (targetOppId) {
        const deal = crmOpportunities.find((o) => o.id === targetOppId);
        if (deal && deal.accountId && deal.accountId !== targetAccountId) {
          console.warn(`[openQuickLog] Dropping opportunity ${targetOppId} because it belongs to account ${deal.accountId}, not ${targetAccountId}`);
          targetOppId = undefined;
        }
      }
    } else if (targetOppId) {
      // If oppId was provided without accountId, infer the account from the deal if possible
      const deal = crmOpportunities.find((o) => o.id === targetOppId);
      if (deal?.accountId) {
        // We can leave targetAccountId as deal.accountId or undefined
      }
    }

    setQuickLogModal({
      isOpen: true,
      type,
      accountId: targetAccountId,
      opportunityId: targetOppId,
      contactId: opts.contactId,
      prefillNotes: opts.prefillNotes
    });
  };

  const closeQuickLog = () => {
    setQuickLogModal(null);
  };

  const openCallPrep = (context?: {
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
    taskId?: string;
    taskTitle?: string;
  }) => {
    setCallPrepModal({
      isOpen: true,
      accountId: context?.accountId || selectedAccountId || undefined,
      opportunityId: context?.opportunityId || selectedCrmOpportunityId || undefined,
      contactId: context?.contactId,
      taskId: context?.taskId,
      taskTitle: context?.taskTitle
    });
  };

  const closeCallPrep = () => {
    setCallPrepModal(null);
  };

  const openScheduleMeeting = (prefill?: {
    accountId?: string;
    contactId?: string;
    date?: string;
    opportunityId?: string;
  }) => {
    setScheduleMeetingModal({
      isOpen: true,
      prefill
    });
  };

  const closeScheduleMeeting = () => {
    setScheduleMeetingModal(null);
  };

  const openMeetingPrep = (meetingId: string) => {
    setMeetingPrepModal({
      isOpen: true,
      meetingId
    });
  };

  const closeMeetingPrep = () => {
    setMeetingPrepModal(null);
  };

  const addAccount = (account: Account) => {
    setAccounts((prev) => [account, ...prev]);
    saveDocToCloud("crm_accounts", account.id, account);
    recordAuditLog("CREATE", "Account", account.id, account.name, `Created ${account.accountType || "Account"}: ${account.name}`);
    // The calling screen reports the outcome; two toasts meant the first was never seen.
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    const existing = accounts.find((a) => a.id === id);
    const targetName = updates.name || existing?.name || "Account";
    const typeChanged = Boolean(updates.accountType && existing && updates.accountType !== existing.accountType);
    const statusChanged = Boolean(updates.customerRelationshipStatus && existing && updates.customerRelationshipStatus !== existing.customerRelationshipStatus);
    const stageChanged = Boolean(updates.prospectStage && existing && updates.prospectStage !== existing.prospectStage);

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

    if (typeChanged) {
      recordAuditLog(
        "STATUS_CHANGE",
        "Account",
        id,
        targetName,
        `Changed Account Type: ${existing?.accountType} → ${updates.accountType} (${
          updates.accountType === "Prospect"
            ? `Prospect Stage: ${updates.prospectStage || "Identified"}`
            : `Relationship Status: ${updates.customerRelationshipStatus || "Active"}`
        })`
      );
    } else if (statusChanged) {
      recordAuditLog(
        "STATUS_CHANGE",
        "Account",
        id,
        targetName,
        `Changed Customer Relationship Status: ${existing?.customerRelationshipStatus || "Unset"} → ${updates.customerRelationshipStatus}`
      );
    } else if (stageChanged) {
      recordAuditLog(
        "STATUS_CHANGE",
        "Account",
        id,
        targetName,
        `Changed Prospect Stage: ${existing?.prospectStage || "Unset"} → ${updates.prospectStage}`
      );
    } else {
      recordAuditLog("UPDATE", "Account", id, targetName, `Updated account details for ${targetName}`);
    }

    // Reported by the calling screen.
  };

  const deleteAccount = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    const accName = acc?.name || id;
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
    recordAuditLog("DELETE", "Account", id, accName, `Deleted account ${accName}`);
    showToast(`Deleted "${accName}" and everything attached to it.`, "info");
  };

  const addContact = (contact: CRMContact) => {
    setContacts((prev) => [contact, ...prev]);
    saveDocToCloud("crm_contacts", contact.id, contact);
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";
    recordAuditLog("CREATE", "Contact", contact.id, fullName, `Added contact ${fullName} (${contact.jobTitle || "Contact"}) for ${contact.accountName || "Account"}`);
    showToast(`Contact "${contact.firstName} ${contact.lastName}" added`, "success");
  };

  const updateContact = (id: string, updates: Partial<CRMContact>) => {
    const existing = contacts.find((c) => c.id === id);
    const contactName = `${updates.firstName || existing?.firstName || ""} ${updates.lastName || existing?.lastName || ""}`.trim() || "Contact";
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
    recordAuditLog("UPDATE", "Contact", id, contactName, `Updated contact details for ${contactName}`);
    showToast("Contact updated", "success");
  };

  const deleteContact = (id: string) => {
    const con = contacts.find((c) => c.id === id);
    const conName = con ? `${con.firstName || ""} ${con.lastName || ""}`.trim() || "Contact" : id;
    setContacts((prev) => prev.filter((c) => c.id !== id));
    deleteDocFromCloud("crm_contacts", id);
    recordAuditLog("DELETE", "Contact", id, conName, `Removed contact ${conName}`);
    showToast("Contact removed", "info");
  };

  const moveContact = (
    contactId: string,
    destinationAccountId: string,
    reason?: string,
    updates?: { role?: string; email?: string; phone?: string }
  ) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const destAccount = accounts.find((a) => a.id === destinationAccountId);
    if (!destAccount) return;

    const previousAccountName = contact.accountName;
    const previousAccountId = contact.accountId;
    const historyItem: ContactAccountHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      accountId: previousAccountId,
      accountName: previousAccountName,
      role: contact.jobTitle || contact.role,
      email: contact.email,
      phone: contact.phone || contact.mobile,
      endDate: new Date().toISOString().split("T")[0],
      movedAt: new Date().toISOString(),
      movedBy: currentUser.name,
      notes: reason || `Moved from "${previousAccountName}" to "${destAccount.name}"`
    };

    const updatedContact: CRMContact = {
      ...contact,
      accountId: destAccount.id,
      accountName: destAccount.name,
      role: updates?.role !== undefined ? updates.role : contact.role,
      jobTitle: updates?.role !== undefined ? updates.role : (contact.jobTitle || contact.role),
      email: updates?.email !== undefined ? updates.email : contact.email,
      phone: updates?.phone !== undefined ? updates.phone : contact.phone,
      accountHistory: [...(contact.accountHistory || []), historyItem]
    };

    setContacts((prev) => prev.map((c) => (c.id === contactId ? updatedContact : c)));
    saveDocToCloud("crm_contacts", contactId, updatedContact);

    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";
    recordAuditLog(
      "MOVE",
      "Contact",
      contactId,
      fullName,
      `Moved contact ${fullName} from "${previousAccountName}" to "${destAccount.name}"${reason ? ` (${reason})` : ""}`
    );
    showToast(`Contact "${fullName}" moved to ${destAccount.name}`, "success");
  };

  const archiveContact = (contactId: string, reason?: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";

    const updatedContact: CRMContact = {
      ...contact,
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedReason: reason || "Archived from active contacts"
    };

    setContacts((prev) => prev.map((c) => (c.id === contactId ? updatedContact : c)));
    saveDocToCloud("crm_contacts", contactId, updatedContact);

    recordAuditLog("ARCHIVE", "Contact", contactId, fullName, `Archived contact ${fullName}${reason ? `: ${reason}` : ""}`);
    showToast(`Contact "${fullName}" archived`, "info");
  };

  const restoreContact = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";

    const updatedContact: CRMContact = {
      ...contact,
      isArchived: false,
      archivedAt: undefined,
      archivedReason: undefined
    };

    setContacts((prev) => prev.map((c) => (c.id === contactId ? updatedContact : c)));
    saveDocToCloud("crm_contacts", contactId, updatedContact);

    recordAuditLog("RESTORE", "Contact", contactId, fullName, `Restored archived contact ${fullName}`);
    showToast(`Contact "${fullName}" restored`, "success");
  };

  const confirmCandidateNotableEvent = (contactId: string, eventId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";

    let confirmedTitle = "";
    const updatedEvents = (contact.notableEvents || []).map((ev) => {
      if (ev.id === eventId) {
        confirmedTitle = ev.title;
        return { ...ev, status: "confirmed" as const };
      }
      return ev;
    });

    const updatedContact = { ...contact, notableEvents: updatedEvents };
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updatedContact : c)));
    saveDocToCloud("crm_contacts", contactId, updatedContact);

    recordAuditLog("UPDATE", "NotableEvent", eventId, confirmedTitle || "Notable Event", `Confirmed notable event for ${fullName}: "${confirmedTitle}"`);
    showToast(`Notable event confirmed for ${fullName}`, "success");
  };

  const dismissCandidateNotableEvent = (contactId: string, eventId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const updatedEvents = (contact.notableEvents || []).filter((ev) => ev.id !== eventId);
    const updatedContact = { ...contact, notableEvents: updatedEvents };
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updatedContact : c)));
    saveDocToCloud("crm_contacts", contactId, updatedContact);
  };

  const addKnowledgeItem = (item: CRMKnowledgeItem) => {
    setKnowledge((prev) => [item, ...prev]);
    saveDocToCloud("crm_knowledge", item.id, item);
    recordAuditLog("CREATE", "Knowledge", item.id, item.category, `Added knowledge (${item.category}): "${item.statement}" for ${item.accountName || item.accountId}`);
    showToast("Knowledge item recorded", "success");
  };

  const updateKnowledgeItem = (id: string, updates: Partial<CRMKnowledgeItem>) => {
    setKnowledge((prev) =>
      prev.map((k) => {
        if (k.id === id) {
          const updated = { ...k, ...updates };
          saveDocToCloud("crm_knowledge", id, updated);
          return updated;
        }
        return k;
      })
    );
    recordAuditLog("UPDATE", "Knowledge", id, "CRM Knowledge", `Updated knowledge item ${id}`);
    showToast("Knowledge updated", "success");
  };

  const archiveKnowledgeItem = (id: string) => {
    setKnowledge((prev) =>
      prev.map((k) => {
        if (k.id === id) {
          const updated = { ...k, status: "archived" as const };
          saveDocToCloud("crm_knowledge", id, updated);
          return updated;
        }
        return k;
      })
    );
    recordAuditLog("ARCHIVE", "Knowledge", id, "CRM Knowledge", `Archived knowledge item ${id}`);
    showToast("Knowledge item archived", "info");
  };

  const deleteKnowledgeItem = (id: string) => {
    setKnowledge((prev) => prev.filter((k) => k.id !== id));
    deleteDocFromCloud("crm_knowledge", id);
    recordAuditLog("DELETE", "Knowledge", id, "CRM Knowledge", `Removed knowledge item ${id}`);
    showToast("Knowledge item removed", "info");
  };

  const addLead = (lead: CRMLead) => {
    setLeads((prev) => [lead, ...prev]);
    saveDocToCloud("crm_leads", lead.id, lead);
    recordAuditLog("CREATE", "Lead", lead.id, lead.leadName, `Created lead ${lead.leadName} (${lead.company})`);
    showToast(`Lead "${lead.leadName}" added.`, "success");
  };

  const updateLead = (id: string, updates: Partial<CRMLead>) => {
    const existing = leads.find((l) => l.id === id);
    const leadName = updates.leadName || existing?.leadName || "Lead";
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
    recordAuditLog("UPDATE", "Lead", id, leadName, `Updated lead ${leadName}`);
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
    // Never let the name and the id describe different companies: whenever an
    // existing account is linked, the name comes from that account.
    let accountName = lead.company;

    if (accountId) {
      const linked = accounts.find((a) => a.id === accountId);
      if (linked) accountName = linked.name;
    }

    if (!accountId) {
      // Check if account already exists
      const existing = accounts.find((a) => a.name.toLowerCase() === lead.company.toLowerCase());
      if (existing) {
        accountId = existing.id;
        accountName = existing.name;
      } else {
        accountId = `acc-${Date.now()}`;
        const isCouncil = lead.company.toLowerCase().includes("council");
        const newAcc: Account = {
          id: accountId,
          name: lead.company,
          // A converted lead has never bought anything, so it is a Prospect and
          // is measured on the Prospect Stage scale. Council is a segment, not
          // a type: typing it "Council" previously put brand-new prospects on
          // the Customer Relationship scale instead.
          accountType: "Prospect",
          status: "Prospect",
          customerRelationshipStatus: undefined,
          prospectStage: "Opportunity Identified",
          industry: "Government & Public Infrastructure",
          customerSegment: isCouncil ? "Local Government / Council" : "Civil Contractor",
          territory: "QLD/NT",
          accountOwner: lead.assignedSalesperson || currentUser.name,
          leadSource: lead.source,
          createdDate: new Date().toISOString().split("T")[0],
          lastInteractionDate: new Date().toISOString().split("T")[0],
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
      products: lead.productInterest.map((p, idx) => ({
        id: `prod-line-${idx}`,
        productCode: "",
        productName: p,
        category: "Solar Luminaire",
        quantity: 1
      })),
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

    recordAuditLog("CONVERT", "Lead", leadId, lead.leadName, `Converted lead ${lead.leadName} into Account "${accountName}" and Opportunity "${lead.leadName}" ($${lead.estimatedValue?.toLocaleString() || 0})`);

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

    showToast(`Converted "${lead.leadName}" — created the account, contact and quote under ${accountName}.`, "success");
    return { accountId: accountId!, contactId, oppId };
  };

  const addCrmOpportunity = (opp: CRMOpportunity) => {
    setCrmOpportunities((prev) => [opp, ...prev]);
    saveDocToCloud("crm_deals", opp.id, opp);
    recordAuditLog("CREATE", "Deal", opp.id, opp.name, `Created deal: ${opp.name} ($${opp.dealValue?.toLocaleString() || 0}) for ${opp.accountName}`);
    showToast(`Quote "${opp.name}" created.`, "success");
  };

  const updateCrmOpportunity = (id: string, updates: Partial<CRMOpportunity>) => {
    const existing = crmOpportunities.find((d) => d.id === id);
    const dealName = updates.name || existing?.name || "Deal";
    const isStageMove = Boolean(updates.stageName && existing && updates.stageName !== existing.stageName);
    const oldStage = existing?.stageName || "";
    const newStage = updates.stageName || "";

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

    if (isStageMove) {
      recordAuditLog("STAGE_CHANGE", "Deal", id, dealName, `Moved deal "${dealName}" from ${oldStage} -> ${newStage}`);
    } else {
      recordAuditLog("UPDATE", "Deal", id, dealName, `Updated deal details for "${dealName}"`);
    }

    showToast("Quote updated.", "success");
  };

  const deleteCrmOpportunity = async (id: string) => {
    const opp = crmOpportunities.find((d) => d.id === id);
    const oppName = opp?.name || id;
    setCrmOpportunities((prev) => prev.filter((d) => d.id !== id));
    setTasks((prev) => prev.filter((t) => t.opportunityId !== id));
    setActivities((prev) => prev.filter((a) => a.opportunityId !== id));
    if (selectedCrmOpportunityId === id) {
      setSelectedCrmOpportunityId(null);
    }
    if (selectedOpportunityId === id) {
      setSelectedOpportunityId(null);
    }
    await deleteDocFromCloud("crm_deals", id);
    recordAuditLog("DELETE", "Deal", id, oppName, `Deleted opportunity ${oppName}`);
    showToast("Quote deleted.", "info");
  };

  const logActivity = (activityData: Omit<CRMActivity, "id" | "timestamp">) => {
    // P1: Deduplicate rapid identical technical draft / copy events (within 10 minutes)
    const isTechnicalDraft =
      activityData.title.toLowerCase().includes("ai email draft") ||
      activityData.title.toLowerCase().includes("copied to clipboard");

    if (isTechnicalDraft) {
      const existingRecent = activities.find((a) => {
        const matchesTitle = a.title === activityData.title && a.accountId === activityData.accountId;
        const timeDiff = Math.abs(Date.now() - new Date(a.timestamp).getTime());
        return matchesTitle && timeDiff < 10 * 60 * 1000;
      });
      if (existingRecent) {
        return {
          activity: existingRecent,
          candidateNotableEvents: [],
          extractedKnowledge: []
        };
      }
    }

    const resolvedContactIds = activityData.contactIds && activityData.contactIds.length > 0
      ? activityData.contactIds
      : activityData.contactId
      ? [activityData.contactId]
      : [];

    const primaryContactId = activityData.contactId || resolvedContactIds[0];
    const targetContact = contacts.find((c) => c.id === primaryContactId);
    const primaryContactName = activityData.contactName || (targetContact ? `${targetContact.firstName} ${targetContact.lastName}`.trim() : undefined);

    const resolvedParticipants: ActivityParticipant[] = activityData.participants && activityData.participants.length > 0
      ? activityData.participants
      : resolvedContactIds.map((cid) => {
          const con = contacts.find((c) => c.id === cid);
          return {
            contactId: cid,
            contactName: con ? `${con.firstName} ${con.lastName}`.trim() : "Participant",
            jobTitle: con?.jobTitle || con?.role,
            accountName: activityData.accountName || con?.accountName,
            email: con?.email,
            role: "participant"
          };
        });

    const newAct: CRMActivity = {
      ...activityData,
      id: `act-${Date.now()}`,
      contactId: primaryContactId,
      contactName: primaryContactName,
      contactIds: resolvedContactIds,
      participants: resolvedParticipants,
      performedBy: currentUser.name,
      authorId: currentUser.id,
      isImmutable: true,
      timestamp: new Date().toISOString()
    };
    setActivities((prev) => [newAct, ...prev]);
    saveDocToCloud("crm_activities", newAct.id, newAct);

    const isCall = activityData.type === "call" || activityData.title.toLowerCase().includes("call");
    recordAuditLog(
      isCall ? "CALL_LOGGED" : "CREATE",
      "Activity",
      newAct.id,
      activityData.title,
      `Logged ${activityData.type}: "${activityData.title}" (${activityData.outcome || "recorded"})${activityData.accountName ? ` for ${activityData.accountName}` : ""}`
    );

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

    // AI Analysis: Candidate Notable Events & CRM Knowledge
    const candidateNotableEvents = extractCandidateNotableEvents(newAct, contacts);
    const extractedKnowledge = extractCrmKnowledge(newAct, contacts);

    // If candidate notable events were discovered, stage them against the target contact
    if (candidateNotableEvents.length > 0) {
      for (const cne of candidateNotableEvents) {
        if (cne.contactId) {
          setContacts((prev) =>
            prev.map((c) => {
              if (c.id === cne.contactId) {
                const existingEvents = c.notableEvents || [];
                const updated = {
                  ...c,
                  notableEvents: [cne, ...existingEvents]
                };
                saveDocToCloud("crm_contacts", c.id, updated);
                return updated;
              }
              return c;
            })
          );
        }
      }
    }

    // Deduplicate and merge extracted knowledge items
    if (extractedKnowledge.length > 0) {
      const { toAdd, toUpdate } = deduplicateOrMergeKnowledge(knowledge, extractedKnowledge);
      if (toAdd.length > 0 || toUpdate.length > 0) {
        setKnowledge((prev) => {
          let next = [...prev];
          for (const u of toUpdate) {
            next = next.map((item) =>
              item.id === u.id
                ? { ...item, lastConfirmedAt: u.lastConfirmedAt, sourceActivityId: u.sourceActivityId }
                : item
            );
          }
          next = [...toAdd, ...next];
          return next;
        });
        for (const item of toAdd) {
          saveDocToCloud("crm_knowledge", item.id, item);
        }
      }
    }

    showToast(`Saved: ${activityData.title}`, "success");

    return {
      activity: newAct,
      candidateNotableEvents,
      extractedKnowledge
    };
  };

  const addTask = (taskData: Omit<CRMTask, "id">) => {
    const newTask: CRMTask = {
      ...taskData,
      id: `task-${Date.now()}`
    };
    setTasks((prev) => [newTask, ...prev]);
    saveDocToCloud("crm_tasks", newTask.id, newTask);
    recordAuditLog("CREATE", "Task", newTask.id, taskData.title, `Created task: ${taskData.title} (Priority: ${taskData.priority || "Medium"})`);
    showToast(`Task "${taskData.title}" created`, "success");
  };

  const updateTask = (id: string, updates: Partial<CRMTask>) => {
    let taskTitle = "Task";
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          taskTitle = t.title;
          const updated = { ...t, ...updates };
          saveDocToCloud("crm_tasks", id, updated);
          return updated;
        }
        return t;
      })
    );
    recordAuditLog("UPDATE", "Task", id, taskTitle, `Updated task ${taskTitle}`);
    showToast("Task updated", "success");
  };

  const toggleTaskComplete = (id: string) => {
    let taskTitle = "Task";
    let nowCompleted = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          taskTitle = t.title;
          const isDone = t.status === "Completed";
          nowCompleted = !isDone;
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
    recordAuditLog("STATUS_CHANGE", "Task", id, taskTitle, `Marked task "${taskTitle}" as ${nowCompleted ? "Completed" : "To Do"}`);
    showToast("Task status updated", "success");
  };

  const scheduleCustomerMeeting = (meetingData: Partial<CRMTask>): CRMTask => {
    const newTask: CRMTask = {
      id: `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: meetingData.title || "Customer Meeting",
      type: (meetingData.type || "Meeting") as TaskType,
      priority: meetingData.priority || "High",
      status: "To Do",
      dueDate: meetingData.dueDate || new Date().toISOString().split("T")[0],
      dueTime: meetingData.dueTime || "10:00 AM",
      accountId: meetingData.accountId,
      accountName: meetingData.accountName,
      contactId: meetingData.contactId,
      contactName: meetingData.contactName,
      contactIds: meetingData.contactIds || (meetingData.contactId ? [meetingData.contactId] : []),
      opportunityId: meetingData.opportunityId,
      opportunityName: meetingData.opportunityName,
      location: meetingData.location,
      meetingFormat: meetingData.meetingFormat || "In Person",
      durationMinutes: meetingData.durationMinutes || 45,
      agenda: meetingData.agenda,
      notes: meetingData.notes,
      assignedTo: currentUser.name,
      createdBy: currentUser.name
    };
    setTasks((prev) => [newTask, ...prev]);
    saveDocToCloud("crm_tasks", newTask.id, newTask);
    recordAuditLog("CREATE", "Task", newTask.id, newTask.title, `Scheduled customer meeting: ${newTask.title}`);
    showToast(`Meeting booked for ${formatAuDate(newTask.dueDate)}${newTask.dueTime ? ` at ${formatAuTime(newTask.dueTime)}` : ""}.`, "success");
    return newTask;
  };

  const dismissNotification = (id: string) => {
    archiveNotification(id);
  };

  // Legacy sync
  const addOpportunity = (opp: Opportunity) => {
    setOpportunities((prev) => [opp, ...prev]);
    saveDocToCloud("opportunities", opp.id, opp);
    showToast(`Quote "${opp.project}" saved.`, "success");
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

  const navigateToWorkflow = (tab: NavTab, _toolSub?: string, oppId?: string) => {
    setActiveTab(tab);
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
        cloudSyncStatus,
        lastCloudSyncTime,
        queuedWritesCount,
        syncAllWithCloud,
        flushPendingWrites,
        switchUserWithPin,
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
        moveContact,
        archiveContact,
        restoreContact,
        confirmCandidateNotableEvent,
        dismissCandidateNotableEvent,
        knowledge,
        setKnowledge,
        addKnowledgeItem,
        updateKnowledgeItem,
        archiveKnowledgeItem,
        deleteKnowledgeItem,
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
        activities,
        logActivity,
        auditLogs,
        recordAuditLog,
        refreshSharedData,
        tasks,
        addTask,
        updateTask,
        toggleTaskComplete,
        scheduleCustomerMeeting,
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
        competitorPricingRecords,
        competitorAlerts,
        unreadCompetitorAlertsCount,
        addCompetitorPricing,
        updateCompetitorPricing,
        markCompetitorAlertRead,
        fetchCompetitorData,
        isCopilotOpen,
        setIsCopilotOpen,
        isCopilotContextPinned,
        setIsCopilotContextPinned,
        clearCopilotContext,
        togglePinCopilotContext,
        copilotCustomContext,
        openCopilotWithContext,
        isSearchOpen,
        setIsSearchOpen,
        quickLogModal,
        openQuickLog,
        closeQuickLog,
        callPrepModal,
        openCallPrep,
        closeCallPrep,
        scheduleMeetingModal,
        openScheduleMeeting,
        closeScheduleMeeting,
        meetingPrepModal,
        openMeetingPrep,
        closeMeetingPrep,
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
