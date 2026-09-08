import { z } from "zod";

export const createOpportunitySchema = z.object({
  name: z.string().min(1, "Opportunity name is required").trim(),
  accountId: z.string().min(1, "Account ID is required").trim(),
  accountName: z.string().optional(),
  primaryContactId: z.string().optional().nullable(),
  primaryContactName: z.string().optional().nullable(),
  primaryContactEmail: z.string().email("Invalid contact email").optional().nullable().or(z.literal("")),
  primaryContactPhone: z.string().optional().nullable(),
  additionalStakeholderIds: z.array(z.string()).optional(),
  opportunityOwner: z.string().optional(),
  assignedTo: z.string().optional(),
  pipelineId: z.string().default("pipe-major-projects"),
  stageId: z.string().default("stage-not-submitted"),
  stageName: z.string().default("Not Submitted"),
  stage: z.string().optional(),
  dealValue: z.number().nonnegative("Deal value must be zero or positive").default(0),
  dealValueBasis: z.enum(["Known", "Estimate", "Unknown"]).optional(),
  isDraft: z.boolean().optional(),
  totalCostValue: z.number().optional().nullable(),
  grossMarginPercent: z.number().optional().nullable(),
  weightedValue: z.number().optional().nullable(),
  probability: z.number().min(0).max(100).optional(),
  forecastCategory: z.enum(["Committed", "Likely", "Pipeline", "Won", "Lost", "Omitted"]).optional(),
  expectedCloseDate: z.string().optional().nullable(),
  projectApplication: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  windRegion: z.enum(["Region A", "Region B", "Region C", "Region D"]).optional().nullable(),
  foundationType: z.enum(["Direct Burial", "Base Plate (Ragbolt)"]).optional().nullable(),
  customerNeed: z.string().optional().nullable(),
  keyRequirements: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  source: z.string().optional().nullable(),
  quoteNumber: z.string().optional().nullable(),
  ostendoQuoteRef: z.string().optional().nullable(),
  quoteRevision: z.string().optional().nullable(),
  // Constrained to CRMOpportunity["quoteStatus"]. As a bare string this both
  // accepted any value the caller invented and left the stored record
  // disagreeing with the type it claims to be.
  quoteStatus: z
    .enum([
      "Draft",
      "Sent",
      "Viewed",
      "Revising",
      "Accepted",
      "Declined",
      "Expired",
      "None",
      "Issued",
      "Client Review",
      "PO Received"
    ])
    .optional()
    .nullable(),
  quoteValue: z.number().optional().nullable(),
  quoteSentDate: z.string().optional().nullable(),
  quoteIssuedDate: z.string().optional().nullable(),
  quoteExpiryDate: z.string().optional().nullable(),
  submittedAt: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  nextActionDate: z.string().optional().nullable(),
  dealHealth: z.enum(["Healthy", "Needs Attention", "At Risk", "Stalled"]).optional(),
  dealHealthReasons: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  products: z.array(z.any()).optional(),
  latestActivity: z.string().optional().nullable(),
  latestActivityDate: z.string().optional().nullable(),
  followUpReminderTriggeredAt: z.string().optional().nullable(),
  followUpCompletedAt: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  archivedAt: z.string().optional().nullable(),
  archivedBy: z.string().optional().nullable(),
  archivedReason: z.string().optional().nullable(),
  wonReason: z.string().optional().nullable(),
  lossReasonId: z.string().optional().nullable(),
  // Constrained to CRMOpportunity["lostReason"] for the same reason as
  // quoteStatus: loss reasons drive win/loss analysis, so a free-string here
  // would fragment the very field winLossPatterns groups on.
  lostReason: z
    .enum([
      "Price",
      "Competitor",
      "Technical Fit",
      "Project Cancelled",
      "Timeline / Lead Time",
      "No Response",
      "Other"
    ])
    .optional()
    .nullable(),
  lostReasonNotes: z.string().optional().nullable()
});

export type CreateOpportunityInput = z.input<typeof createOpportunitySchema>;
export type CreateOpportunityOutput = z.output<typeof createOpportunitySchema>;

export const updateOpportunitySchema = createOpportunitySchema.partial().extend({
  // Concurrency check fields
  version: z.number().int().positive().optional(),
  updatedAt: z.string().optional()
});

export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

export const opportunityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  accountId: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  isArchived: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
  sortBy: z.enum(["name", "dealValue", "createdAt", "updatedAt", "expectedCloseDate"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export type OpportunityQueryInput = z.infer<typeof opportunityQuerySchema>;
