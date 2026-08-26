export type FieldStatus = "Confirmed" | "Inferred" | "Unknown";

export interface StatusField {
  value: string;
  status: FieldStatus;
}

export interface OpportunitySummary {
  customer: StatusField;
  company: StatusField;
  project: StatusField;
  location: StatusField;
  application: StatusField;
  productCategory: StatusField;
  quantity: StatusField;
  projectTiming: StatusField;
  quoteDeadline: StatusField;
  installationTiming: StatusField;
  powerAvailability: StatusField;
  mountingPoleRequirements: StatusField;
  operatingRequirements: StatusField;
  cct: StatusField;
  lightingPerformanceRequirements: StatusField;
  environmentalRequirements: StatusField;
  standardsMentioned: StatusField;
  commercialRequirements: StatusField;
  otherNotes: StatusField;
  [key: string]: StatusField;
}

export interface ReadinessData {
  score: number;
  rating: "Low" | "Medium" | "High";
  knownItems: string[];
  missingItems: string[];
  summaryExplanation: string;
}

export interface SourceCitation {
  documentTitle: string;
  sectionOrPage?: string;
  excerpt?: string;
  sourceUrl?: string;
  authorityLevel?: string;
}

export interface RecommendedProduct {
  productName: string;
  productCode: string;
  matchLevel: "Strong potential match" | "Possible match" | "Requires more information" | string;
  whySuitable: string;
  supportingSpecifications: {
    applicationFit?: string;
    luminaireOutput?: string;
    cctAvailable?: string;
    solarAndBattery?: string;
    mountingOptions?: string;
    controlOptions?: string;
    [key: string]: string | undefined;
  };
  importantLimitations?: string[];
  informationStillRequired?: string[];
  technicalReviewRequired?: string;
  sourceCitations: SourceCitation[];
  distinctionNotes?: string;
  conflictWarning?: string;
}

export interface AlternativeProduct {
  productName: string;
  productCode?: string;
  matchLevel?: string;
  whenToUse?: string;
  tradeOffs?: string;
  sourceCitation?: string;
}

export interface NextBestAction {
  title: string;
  description: string;
  primaryActionLabel: string;
  actionType: "request_info" | "send_datasheet" | "refer_engineering" | "prepare_quote" | "research_spec" | string;
  urgency: "Immediate" | "Today" | "This Week" | string;
}

export interface CustomerQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  category: "Technical" | "Commercial" | "Site / Environment" | "Compliance" | string;
  defaultSelected: boolean;
}

export interface EnquiryAnalysisResult {
  opportunitySummary: OpportunitySummary;
  readiness: ReadinessData;
  productRecommendations: {
    recommendedStartingPoint: RecommendedProduct;
    alternatives: AlternativeProduct[];
  };
  nextBestAction: NextBestAction;
  questionsBeforeWeQuote: CustomerQuestion[];
  internalSalesCoachTip: string;
  sourcesUsed?: string[];
  pricingGuardrailNotice?: string;
}

export interface Customer {
  id: string;
  company: string;
  website?: string;
  industry: string;
  location: string;
  notes?: string;
  tier?: string;
}

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export type OpportunityStage =
  | "New Enquiry"
  | "Qualifying"
  | "Awaiting Information"
  | "Technical Review"
  | "Quoting"
  | "Quote Sent"
  | "Follow-Up"
  | "Negotiation"
  | "Won"
  | "Lost"
  | "On Hold"
  | "Closed Won"
  | "Closed Lost";

export interface Opportunity {
  id: string;
  customerCompany: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  project: string;
  location: string;
  application: string;
  stage: OpportunityStage;
  status: "Active" | "Pending Customer" | "Internal Review" | "Closed" | string;
  estimatedQuantity: number;
  estimatedValue?: number;
  productsConsidered: string[];
  quoteDeadline?: string;
  projectDate?: string;
  lastActivity: string;
  lastActivityDate: string;
  nextAction: string;
  nextActionDate: string;
  readinessScore: number;
  notes: string;
  rawEnquiry?: string;
  analysis?: EnquiryAnalysisResult;
}

export interface PlasgainProduct {
  id: string;
  name: string;
  code: string;
  series?: string;
  category: string;
  application?: string[];
  primaryApplications?: string[];
  lumens?: string;
  lumensTypical?: string;
  cct?: string;
  autonomy?: string;
  battery?: string;
  solarPanel?: string;
  poleHeight?: string;
  ingressImpact?: string;
  warranty?: string;
  keyFeatures?: string[];
  limitations?: string[];
  datasheetDoc?: string;
  sourceUrl?: string;
  status?: "Current" | "Superseded" | "Draft" | string;
  authorityLevel?: "1. Current approved internal document" | "2. Current approved product datasheet" | "3. Current approved catalogue" | "4. Public Plasgain webpage" | "5. Historical/superseded document" | string;
  conflictFlag?: {
    hasConflict: boolean;
    title: string;
    description: string;
    actionRequired: string;
  };
  standardCompliance?: string[];
}

export type DocumentAuthorityLevel =
  | "1. Current approved internal document"
  | "2. Current approved product datasheet"
  | "3. Current approved catalogue"
  | "4. Public Plasgain webpage"
  | "5. Historical/superseded document";

export type DocumentCategory =
  | "Product Sheet"
  | "Product Datasheets"
  | "Catalogues"
  | "Pricing"
  | "Installation Manual"
  | "Installation Manuals"
  | "Photometric Reports"
  | "Warranty"
  | "Warranty Terms"
  | "Compliance"
  | "Compliance Document"
  | "Engineering"
  | "Engineering Whitepaper"
  | "Sales Guide"
  | "Sales Material"
  | "Knowledge Base"
  | "FAQs"
  | "Case Studies"
  | "Competitor Information"
  | "Other";

export interface KnowledgeDocument {
  id: string;
  filename?: string;
  title: string;
  category: DocumentCategory | string;
  product?: string;
  applicableProducts?: string[];
  version: string;
  revisionDate?: string;
  uploadDate?: string;
  uploadedDate?: string;
  fileType?: string;
  fileSize?: string;
  status: "Current" | "Superseded" | "Draft" | string;
  documentStatus?: "Current" | "Superseded" | "Draft" | string;
  authorityLevel: DocumentAuthorityLevel | string;
  sourceUrl?: string;
  conflictWarning?: string;
  tags?: string[];
  summary: string;
  contentSnippet?: string;
  extractedKeyFacts?: string[];
}

export interface LessonTopic {
  id: string;
  category: string;
  title: string;
  duration?: string;
  readTimeMinutes?: number;
  summary: string;
  salesImportance?: string;
  salesRelevance?: string;
  practicalExample?: string;
  commonCustomerQuestion?: string;
  modelAnswer?: string;
  keyTakeaway?: string;
  keyTakeaways?: string[];
  conflictWarning?: string;
  testScenario?: {
    question: string;
    sampleGoodAnswer: string;
  };
}

export interface GlossaryTerm {
  term: string;
  definition?: string;
  shortDefinition?: string;
  salesRelevance?: string;
  whyItMatters?: string;
  practicalExample?: string;
  plasgainRelevance?: string;
}

export interface ConflictRecord {
  id: string;
  product: string;
  severity: "High" | "Medium" | "Low";
  nature: string;
  details: string;
  actionRequired: string;
}
