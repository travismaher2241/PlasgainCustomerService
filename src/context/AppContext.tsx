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
  CRMNotification
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

export type NavTab =
  | "home"
  | "crm"
  | "new-enquiry"
  | "product-finder"
  | "ask-plasgain"
  | "opportunities"
  | "documents"
  | "tools"
  | "learn"
  | "settings";

export type CRMSubTab =
  | "today"
  | "accounts"
  | "pipeline"
  | "leads"
  | "tasks"
  | "analytics";

export type ToolSubTab =
  | "tender-analyser"
  | "quote-review"
  | "customer-research"
  | "call-prep"
  | "call-notes"
  | "follow-up"
  | "product-comparison";

interface AppContextType {
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
  dismissNotification: (id: string) => void;

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

  // Navigate helper
  navigateToWorkflow: (tab: NavTab, toolSub?: ToolSubTab, oppId?: string) => void;
  navigateToCRM: (subTab: CRMSubTab, entityId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [activeCRMTab, setActiveCRMTab] = useState<CRMSubTab>("today");
  const [activeToolTab, setActiveToolTab] = useState<ToolSubTab>("tender-analyser");

  // Load Relational CRM Data from LocalStorage or Defaults
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_accounts");
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [contacts, setContacts] = useState<CRMContact[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_contacts");
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [leads, setLeads] = useState<CRMLead[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_leads");
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [crmOpportunities, setCrmOpportunities] = useState<CRMOpportunity[]>(() => {
    const saved = localStorage.getItem("plasgain_crm_deals");
    return saved ? JSON.parse(saved) : INITIAL_OPPORTUNITIES;
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

  // Legacy Opportunities compatibility
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
    const saved = localStorage.getItem("plasgain_opportunities");
    return saved ? JSON.parse(saved) : SAMPLE_OPPORTUNITIES;
  });

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

  const [notifications, setNotifications] = useState<CRMNotification[]>([
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
    showToast(`Account "${account.name}" created`, "success");
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
    );
    showToast("Account updated", "success");
  };

  const addContact = (contact: CRMContact) => {
    setContacts((prev) => [contact, ...prev]);
    showToast(`Contact "${contact.firstName} ${contact.lastName}" added`, "success");
  };

  const updateContact = (id: string, updates: Partial<CRMContact>) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    showToast("Contact updated", "success");
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    showToast("Contact removed", "info");
  };

  const addLead = (lead: CRMLead) => {
    setLeads((prev) => [lead, ...prev]);
    showToast(`Lead "${lead.leadName}" added`, "success");
  };

  const updateLead = (id: string, updates: Partial<CRMLead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
    showToast("Lead updated", "success");
  };

  const convertLead = (leadId: string, targetAccountId?: string): { accountId: string; contactId: string; oppId: string } => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("Lead not found");

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
          accountOwner: lead.assignedSalesperson || "Marcus Vance",
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
      contactOwner: lead.assignedSalesperson || "Marcus Vance",
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
      opportunityOwner: lead.assignedSalesperson || "Marcus Vance",
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
        productCode: p.toUpperCase().replace(/\s+/g, "-"),
        productName: p,
        category: "Solar Luminaire",
        quantity: 1
      })),
      projectApplication: lead.enquiryType,
      location: lead.location,
      customerNeed: lead.notes,
      keyRequirements: ["Verify AS/NZS 1158 compliance", "Confirm mounting height"],
      source: lead.source,
      latestActivity: `Lead converted to opportunity by ${lead.assignedSalesperson || "Marcus Vance"}`,
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
      performedBy: "Marcus Vance"
    });

    showToast(`Lead successfully converted to Account, Contact, and Deal!`, "success");
    return { accountId: accountId!, contactId, oppId };
  };

  const addCrmOpportunity = (opp: CRMOpportunity) => {
    setCrmOpportunities((prev) => [opp, ...prev]);
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

    // Update last interaction on related account
    if (activityData.accountId) {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === activityData.accountId
            ? { ...acc, lastInteractionDate: new Date().toISOString().split("T")[0] }
            : acc
        )
      );
    }

    // Update last activity on related opportunity
    if (activityData.opportunityId) {
      setCrmOpportunities((prev) =>
        prev.map((opp) =>
          opp.id === activityData.opportunityId
            ? {
                ...opp,
                latestActivity: activityData.title,
                latestActivityDate: new Date().toISOString().split("T")[0]
              }
            : opp
        )
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
    showToast(`Task "${taskData.title}" created`, "success");
  };

  const updateTask = (id: string, updates: Partial<CRMTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    showToast("Task updated", "success");
  };

  const toggleTaskComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === "Completed";
          return {
            ...t,
            status: isDone ? "To Do" : "Completed",
            completedAt: isDone ? undefined : new Date().toISOString()
          };
        }
        return t;
      })
    );
    showToast("Task status updated", "success");
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Legacy sync
  const addOpportunity = (opp: Opportunity) => {
    setOpportunities((prev) => [opp, ...prev]);
    showToast(`Opportunity "${opp.project}" saved`, "success");
  };

  const updateOpportunity = (id: string, updates: Partial<Opportunity>) => {
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === id ? { ...opp, ...updates } : opp))
    );
  };

  const addDocument = (doc: KnowledgeDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    showToast(`Document "${doc.title}" added to knowledge base`, "success");
  };

  const navigateToWorkflow = (tab: NavTab, toolSub?: ToolSubTab, oppId?: string) => {
    setActiveTab(tab);
    if (toolSub) {
      setActiveToolTab(toolSub);
    }
    if (oppId) {
      setSelectedOpportunityId(oppId);
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
        notifications,
        dismissNotification,
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
