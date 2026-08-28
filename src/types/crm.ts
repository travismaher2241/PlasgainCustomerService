import { EnquiryAnalysisResult } from "../types";

export type AccountStatus = "Customer" | "Prospect" | "Former Customer" | "Partner" | "Distributor" | "Archived";
export type RelationshipHealth = "Strong" | "Healthy" | "Needs Attention" | "At Risk";
export type LeadStatus = "New" | "Attempting Contact" | "Contacted" | "Qualifying" | "Qualified" | "Unqualified" | "Converted";
export type LeadScoreRating = "Hot" | "Warm" | "Developing" | "Low Priority";
export type ContactRole =
  | "Decision Maker"
  | "Influencer"
  | "Technical Contact"
  | "Procurement"
  | "Finance"
  | "End User"
  | "Gatekeeper"
  | "Champion"
  | "Consultant"
  | "Unknown";

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "site_visit"
  | "note"
  | "task"
  | "quote_sent"
  | "quote_accepted"
  | "enquiry_received"
  | "opportunity_created"
  | "stage_changed"
  | "follow_up";

export type TaskType =
  | "Call"
  | "Email"
  | "Follow-up"
  | "Prepare Quote"
  | "Review Quote"
  | "Meeting"
  | "Site Visit"
  | "Research"
  | "Internal Action"
  | "Other";

export type TaskPriority = "Urgent" | "High" | "Medium" | "Low";
export type TaskStatus = "To Do" | "In Progress" | "Completed" | "Cancelled";
export type ForecastCategory = "Committed" | "Likely" | "Pipeline" | "Won" | "Lost" | "Omitted";
export type DealHealthRating = "Healthy" | "Needs Attention" | "At Risk" | "Stalled";

export interface Account {
  id: string;
  name: string;
  tradingName?: string;
  status: AccountStatus;
  industry: string;
  customerSegment: "Local Government / Council" | "Civil Contractor" | "Electrical Contractor" | "Consulting Engineer" | "Mining & Resources" | "Commercial Developer" | "Other";
  companySize?: string;
  abn?: string;
  website?: string;
  mainPhone?: string;
  phone?: string;
  generalEmail?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shippingAddresses?: Array<{
    id: string;
    label: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    isDefault?: boolean;
  }>;
  territory: "NSW/ACT" | "VIC/TAS" | "QLD/NT" | "WA" | "SA" | "National";
  accountOwner: string;
  leadSource: string;
  createdDate: string;
  lastInteractionDate: string;
  nextScheduledInteraction?: string;
  nextAction?: string;
  nextActionDate?: string;
  relationshipHealth: RelationshipHealth;
  healthReasons?: string[];
  tags: string[];
  notes?: string;
  customFields?: Record<string, any>;
  metrics?: {
    openPipelineValue: number;
    totalDealsWon: number;
    activeDealsCount: number;
    totalEnquiries: number;
  };
  isArchived?: boolean;
  archivedDate?: string;
  archivedReason?: string;
  aiSummary?: {
    summary: string;
    recentActivityOverview: string;
    currentPriority: string;
    identifiedRisks: string[];
    recommendedAction: string;
    lastGenerated: string;
  };
}

export interface CRMContact {
  id: string;
  accountId: string;
  accountName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department?: string;
  email: string;
  mobile?: string;
  phone?: string;
  preferredContactMethod: "Email" | "Mobile" | "Phone" | "Teams/Zoom";
  roleInBuyingProcess: ContactRole;
  isDecisionMaker: boolean;
  influenceLevel: "High" | "Medium" | "Low";
  relationshipStatus: "Strong" | "Warm" | "Neutral" | "Cold";
  contactOwner: string;
  linkedinUrl?: string;
  notes?: string;
  lastContacted?: string;
  nextFollowUp?: string;
  tags: string[];
  customFields?: Record<string, any>;
}

export interface CRMLead {
  id: string;
  leadName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  company: string;
  source: "Web Form" | "Phone Inbound" | "Tender Portal" | "Email Inbound" | "Trade Show" | "Referral" | "Outbound Campaign";
  enquiryType: "Solar Pathway Lighting" | "Roadway & Streetlight" | "Car Park & Area" | "CCTV & Security" | "Composite Poles" | "General";
  productInterest: string[];
  estimatedValue: number;
  assignedSalesperson: string;
  leadStatus: LeadStatus;
  leadScore: number;
  leadScoreRating: LeadScoreRating;
  scoringFactors: Array<{ factor: string; scoreDelta: number; reason: string }>;
  urgency: "Immediate" | "Within 1 Month" | "Q3/Q4" | "Budgetary / Exploratory";
  location: string;
  notes: string;
  dateReceived: string;
  lastActivity: string;
  lastActivityDate: string;
  nextAction: string;
  nextActionDate: string;
  qualificationInfo?: {
    hasBudget: boolean;
    hasAuthority: boolean;
    hasDefiniteNeed: boolean;
    hasTimeline: boolean;
  };
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  convertedAt?: string;
  convertedBy?: string;
}

export interface PipelineStageConfig {
  id: string;
  name: string;
  order: number;
  probability: number;
  colorClass: string;
  description: string;
}

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  stages: PipelineStageConfig[];
}

export interface OpportunityProductLine {
  id: string;
  productId?: string;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  costPrice?: number;
  totalPrice?: number;
  marginPercent?: number;
  isOstendoVerified?: boolean;
  notes?: string;
}

export interface CRMOpportunity {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  primaryContactId: string;
  primaryContactName: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  additionalStakeholderIds?: string[];
  opportunityOwner: string;
  pipelineId: string;
  stageId: string;
  stageName: string;
  dealValue: number;
  totalCostValue?: number;
  grossMarginPercent?: number;
  weightedValue: number;
  probability: number;
  forecastCategory: ForecastCategory;
  expectedCloseDate: string;
  products: OpportunityProductLine[];
  projectApplication: string;
  location: string;
  windRegion?: "Region A" | "Region B" | "Region C" | "Region D";
  foundationType?: "Direct Burial" | "Base Plate (Ragbolt)";
  customerNeed: string;
  keyRequirements: string[];
  competitors?: string[];
  source: string;
  quoteNumber?: string;
  ostendoQuoteRef?: string;
  quoteRevision?: string;
  quoteStatus?: "Draft" | "Sent" | "Viewed" | "Revising" | "Accepted" | "Declined" | "Expired" | "None" | "Issued" | "Client Review" | "PO Received";
  quoteValue?: number;
  quoteSentDate?: string;
  quoteIssuedDate?: string;
  quoteExpiryDate?: string;
  latestActivity: string;
  latestActivityDate: string;
  nextAction: string;
  nextActionDate: string;
  daysInCurrentStage: number;
  totalDealAgeDays: number;
  dealHealth: DealHealthRating;
  dealHealthReasons: string[];
  notes: string;
  attachedDocumentIds?: string[];
  rawEnquiryText?: string;
  analysis?: EnquiryAnalysisResult;
  wonReason?: string;
  lostReason?: "Price" | "Competitor" | "Technical Fit" | "Project Cancelled" | "Timeline / Lead Time" | "No Response" | "Other";
  lostReasonNotes?: string;
}

export interface CRMActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  opportunityId?: string;
  opportunityName?: string;
  performedBy: string;
  authorId?: string;
  isImmutable?: boolean;
  timestamp: string;
  metadata?: {
    callDurationMinutes?: number;
    outcome?: string;
    meetingLocation?: string;
    quoteNumber?: string;
    quoteAmount?: number;
    previousStage?: string;
    newStage?: string;
    emailSubject?: string;
    sentiment?: "Positive" | "Neutral" | "Negative" | "Concerned";
  };
}

export interface CRMTask {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  dueTime?: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  opportunityId?: string;
  opportunityName?: string;
  assignedTo: string;
  createdBy: string;
  notes?: string;
  completedAt?: string;
  isOverdue?: boolean;
}

export interface NextBestActionItem {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  reason: string;
  urgency: "Immediate" | "Today" | "Upcoming";
  category: "Quote Follow-up" | "Missing Action" | "Decision Maker" | "Stalled Deal" | "Overdue Task" | "Customer Waiting";
  relatedEntityType: "Account" | "Opportunity" | "Lead" | "Task";
  relatedEntityId: string;
  relatedEntityName: string;
  actionLabel: string;
  actionPayload?: {
    type: "create_task" | "send_email" | "log_call" | "schedule_meeting" | "update_stage" | "assign_contact";
    defaultTitle?: string;
    defaultNotes?: string;
  };
}

export interface ServerNotification {
  id: string;
  title: string;
  message: string;
  timestamp?: string;
  type: "warning" | "info" | "success" | "action_required";
  isRead: boolean;
  isArchived: boolean;
  linkTo?: {
    view: "accounts" | "pipeline" | "leads" | "tasks" | "today" | "competitor-pricing";
    id?: string;
  };
  createdAt: string;
}

export type CRMNotification = ServerNotification;

export interface AccountIntelligenceRisk {
  statement: string;
  sourceType: string;
  sourceId?: string;
}

export interface AccountIntelligenceNextAction {
  action: string;
  reason: string;
}

export interface AccountIntelligenceSummary {
  accountSummary: string;
  recentActivity: string[];
  knownRequirements: string[];
  commercialIntelligence: string[];
  risks: AccountIntelligenceRisk[];
  recommendedNextActions: AccountIntelligenceNextAction[];
  generatedAt: string;
}

export type CompetitorPriceBasis =
  | "Per Unit"
  | "Per System"
  | "Project Total"
  | "Supply Only"
  | "Installed"
  | "Unknown";

export type CompetitorGstStatus = "Ex GST" | "Inc GST" | "Unknown";

export type CompetitorSourceType =
  | "Customer Verbal"
  | "Competitor Quote"
  | "Tender Schedule"
  | "Email"
  | "Other";

export type CompetitorPricingStatus = "Active" | "Superseded" | "Unverified";

export interface CompetitorPricingRecord {
  id: string;
  accountId: string;
  accountName: string;
  opportunityId?: string;
  opportunityName?: string;
  competitorName: string;
  competitorProduct: string;
  price: number;
  plasgainQuotedPrice?: number;
  currency: string;
  priceBasis: CompetitorPriceBasis;
  gstStatus: CompetitorGstStatus;
  quantity?: number;
  sourceType: CompetitorSourceType;
  observedDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: CompetitorPricingStatus;
}

export interface CompetitorPricingAlert {
  id: string;
  recordId: string;
  accountId: string;
  accountName: string;
  competitorName: string;
  competitorProduct: string;
  price: number;
  currency: string;
  priceBasis: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export type EmailComposerMode = "cold-outreach" | "project-enquiry";

export interface EmailComposerLaunchContext {
  defaultMode?: EmailComposerMode;
  accountId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  companyName?: string;
  companyWebsite?: string;
  contactName?: string;
  contactEmail?: string;
  contactRole?: string;
  projectName?: string;
  projectLocation?: string;
  projectUrl?: string;
  projectNotes?: string;
  enquiryType?: string;
  rawContent?: string;
  productsQuoted?: Array<{ productCode?: string; productName: string; quantity?: number }>;
  recentActivities?: string[];
  customerSegment?: string;
  industry?: string;
  territory?: string;
  desiredOutcome?: string;
}

export interface ResearchConfirmedFact {
  text: string;
  sourceIds: string[];
}

export interface ResearchInference {
  text: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

export interface ResearchPlasgainRelevance {
  text: string;
  basis: "CRM" | "Plasgain Knowledge Base" | "Public Research";
}

export interface ResearchSourceItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
}

export interface AIEmailResearchResult {
  researchStatus: "complete" | "partial" | "unavailable";
  researchSummary: {
    confirmedFacts: ResearchConfirmedFact[];
    inferences: ResearchInference[];
    unknowns: string[];
    plasgainRelevance: ResearchPlasgainRelevance[];
    recommendedSalesAngle: string;
    confidence: "high" | "medium" | "low";
  };
  sources: ResearchSourceItem[];
  draft: {
    subjectOptions: string[];
    selectedSubject: string;
    body: string;
    recommendedOutcome: string;
  };
}
