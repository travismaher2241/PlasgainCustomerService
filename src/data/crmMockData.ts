import {
  Account,
  CRMContact,
  CRMLead,
  CRMOpportunity,
  CRMActivity,
  CRMTask,
  PipelineConfig,
  PipelineStageConfig,
  CompetitorPricingRecord,
  CompetitorPricingAlert
} from "../types/crm";

export const STANDARD_QUOTE_STAGES: PipelineStageConfig[] = [
  { id: "stage-not-submitted", name: "Not Submitted", order: 1, probability: 10, colorClass: "border-slate-300 bg-slate-50 text-slate-700", description: "Quote drafted or added, not yet issued to customer." },
  { id: "stage-submitted", name: "Submitted", order: 2, probability: 40, colorClass: "border-blue-300 bg-blue-50 text-blue-700", description: "Quote sent to customer; awaiting initial review." },
  { id: "stage-followup-required", name: "Follow Up Required", order: 3, probability: 50, colorClass: "border-amber-300 bg-amber-50 text-amber-800", description: "2+ days post-submission; customer follow-up required." },
  { id: "stage-followed-up", name: "Followed Up", order: 4, probability: 70, colorClass: "border-purple-300 bg-purple-50 text-purple-700", description: "Customer contacted; feedback received or pending decision." },
  { id: "stage-won", name: "Won", order: 5, probability: 100, colorClass: "border-emerald-400 bg-emerald-50 text-emerald-800", description: "Customer accepted quote or purchase order received." },
  { id: "stage-lost", name: "Lost", order: 6, probability: 0, colorClass: "border-red-300 bg-red-50 text-red-700", description: "Project cancelled or awarded elsewhere." }
];

export const DEFAULT_PIPELINES: PipelineConfig[] = [
  {
    id: "pipe-major-projects",
    name: "Council & Infrastructure Projects",
    description: "Standard pipeline for municipal, road authority, and infrastructure quotes.",
    isDefault: true,
    stages: STANDARD_QUOTE_STAGES
  },
  {
    id: "pipe-distributor",
    name: "Commercial & Electrical Wholesale",
    description: "Faster sales cycle for standard stock luminaires and contractor orders.",
    isDefault: false,
    stages: STANDARD_QUOTE_STAGES
  }
];

// Clean initial CRM data (no sample records)
export const INITIAL_ACCOUNTS: Account[] = [];
export const INITIAL_CONTACTS: CRMContact[] = [];
export const INITIAL_LEADS: CRMLead[] = [];
export const INITIAL_OPPORTUNITIES: CRMOpportunity[] = [];
export const INITIAL_ACTIVITIES: CRMActivity[] = [];
export const INITIAL_TASKS: CRMTask[] = [];
export const INITIAL_COMPETITOR_PRICING: CompetitorPricingRecord[] = [];
export const INITIAL_COMPETITOR_ALERTS: CompetitorPricingAlert[] = [];

/**
 * Resolves the initial stage a newly created quote belongs in ("Not Submitted").
 */
export function resolveQuotingStage(pipelineId: string = "pipe-major-projects"): PipelineStageConfig {
  const pipeline =
    DEFAULT_PIPELINES.find((p) => p.id === pipelineId) ||
    DEFAULT_PIPELINES.find((p) => p.isDefault) ||
    DEFAULT_PIPELINES[0];

  const stages = pipeline.stages;
  return (
    stages.find((s) => s.id === "stage-not-submitted") ||
    stages.find((s) => /not submitted/i.test(s.name)) ||
    stages[0]
  );
}
