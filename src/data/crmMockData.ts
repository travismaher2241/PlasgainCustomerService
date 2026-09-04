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

export const DEFAULT_PIPELINES: PipelineConfig[] = [
  {
    id: "pipe-major-projects",
    name: "Council & Infrastructure Projects",
    description: "Standard pipeline for municipal, road authority, and infrastructure tenders.",
    isDefault: true,
    stages: [
      { id: "stage-new", name: "New Opportunity", order: 1, probability: 10, colorClass: "border-slate-300 bg-slate-50 text-slate-700", description: "Fresh inbound project or preliminary spec received." },
      { id: "stage-discovery", name: "Discovery & Qualification", order: 2, probability: 25, colorClass: "border-blue-300 bg-blue-50 text-blue-700", description: "Clarifying lighting standards, pole heights, site layout, and CCT requirements." },
      { id: "stage-solution", name: "Solution & Photometrics", order: 3, probability: 45, colorClass: "border-indigo-300 bg-indigo-50 text-indigo-700", description: "Dialux calculation, luminaire/pole selection, and engineering checks." },
      { id: "stage-quote", name: "Quote / Proposal Submitted", order: 4, probability: 65, colorClass: "border-amber-300 bg-amber-50 text-amber-700", description: "Official quote and technical datasheet schedule delivered to client." },
      { id: "stage-review", name: "Client Review & Follow-Up", order: 5, probability: 75, colorClass: "border-purple-300 bg-purple-50 text-purple-700", description: "Council/contractor reviewing price and compliance; actively answering questions." },
      { id: "stage-negotiation", name: "Negotiation / Preferred", order: 6, probability: 90, colorClass: "border-emerald-300 bg-emerald-50 text-emerald-700", description: "Selected as preferred supplier; finalizing freight, schedules, and delivery dates." },
      { id: "stage-won", name: "Closed Won", order: 7, probability: 100, colorClass: "border-green-400 bg-green-50 text-green-800", description: "Purchase order received." },
      { id: "stage-lost", name: "Closed Lost", order: 8, probability: 0, colorClass: "border-red-300 bg-red-50 text-red-700", description: "Project cancelled or went to competitor." }
    ]
  },
  {
    id: "pipe-distributor",
    name: "Commercial & Electrical Wholesale",
    description: "Faster sales cycle for standard stock luminaires and contractor orders.",
    isDefault: false,
    stages: [
      { id: "stage-inquiry", name: "Inquiry Received", order: 1, probability: 15, colorClass: "border-slate-300 bg-slate-50 text-slate-700", description: "Price check or product availability request." },
      { id: "stage-pricing", name: "Pricing Provided", order: 2, probability: 50, colorClass: "border-blue-300 bg-blue-50 text-blue-700", description: "Commercial pricing and ETA shared." },
      { id: "stage-followup", name: "Follow-Up", order: 3, probability: 70, colorClass: "border-amber-300 bg-amber-50 text-amber-700", description: "Checking if contractor won the tender or needs stock held." },
      { id: "stage-ordered", name: "Order Placed", order: 4, probability: 100, colorClass: "border-green-400 bg-green-50 text-green-800", description: "PO received." },
      { id: "stage-lost", name: "Lost / Abandoned", order: 5, probability: 0, colorClass: "border-red-300 bg-red-50 text-red-700", description: "Lost to competitor or project didn't proceed." }
    ]
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
 * Resolves the stage a newly created quote belongs in.
 *
 * The three "New quote" paths used to hard-code stageId "stage-proposal" with
 * stageName "Proposal & Quoting" — a pair that exists in neither pipeline. The
 * list rendered the stored name while the deal screen's stage <select>, bound to
 * stageId, found no matching option and fell back to the first, so one record
 * reported two different stages. Both values now come from the pipeline config.
 */
export function resolveQuotingStage(pipelineId: string = "pipe-major-projects"): PipelineStageConfig {
  const pipeline =
    DEFAULT_PIPELINES.find((p) => p.id === pipelineId) ||
    DEFAULT_PIPELINES.find((p) => p.isDefault) ||
    DEFAULT_PIPELINES[0];

  const stages = pipeline.stages;
  return (
    stages.find((s) => s.id === "stage-quote") ||
    stages.find((s) => /quote|proposal|pricing/i.test(s.name)) ||
    stages[0]
  );
}
