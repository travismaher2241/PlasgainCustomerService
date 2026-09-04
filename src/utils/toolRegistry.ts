/**
 * Canonical Tool & Route Registry
 * 
 * Maps user shortcuts, search commands, and deep links to supported application workflows.
 * Guarantees that every Home shortcut leads to a valid, working destination or a controlled fallback.
 */

export type ToolSubTab = string;
export type NavTab = string;

export interface ToolRouteDefinition {
  id: string;
  aliases: string[];
  displayName: string;
  description: string;
  category: "AI Workflow" | "CRM Review";
  destinationType: "tools" | "workflow" | "crm";
  navTab: NavTab;
  toolSubTab?: ToolSubTab;
  crmTab?: "pipeline" | "today" | "accounts" | "leads" | "tasks" | "competitor-pricing";
  iconName: string;
}

export const REGISTERED_TOOL_ROUTES: ToolRouteDefinition[] = [
  {
    id: "analyse-tender",
    aliases: ["tender-analyser", "tender-analyzer", "analyse-tender", "enquiry-analyser", "enquiry"],
    displayName: "Analyse Tender / AI Enquiry Workspace",
    description: "Extract luminaire specifications, mounting constraints, and AS/NZS requirements from tender documents.",
    category: "AI Workflow",
    destinationType: "workflow",
    navTab: "new-enquiry",
    iconName: "FileText"
  },
  {
    id: "plan-takeoff",
    aliases: ["takeoff", "drawing-takeoff", "plan-takeoff", "pdf-takeoff", "take-off"],
    displayName: "Plan Take-off Workspace",
    description: "Decipher civil PDF drawings and match the poles and luminaires called out on them to Plasgain products.",
    category: "AI Workflow",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "plan-takeoff",
    iconName: "Layers"
  },
  {
    id: "quote-review",
    aliases: ["quote-review", "quote-status", "ostendo-review", "review-quote"],
    displayName: "Quote & Proposal Review",
    description: "Review live CRM deal margins, Ostendo ERP quote revisions, and customer follow-up status.",
    category: "CRM Review",
    destinationType: "crm",
    navTab: "crm",
    crmTab: "pipeline",
    iconName: "FileSpreadsheet"
  }
];

export interface ResolvedRoute {
  isSupported: boolean;
  definition?: ToolRouteDefinition;
  requestedSlug: string;
  targetNavTab: NavTab;
  targetToolSubTab?: ToolSubTab;
  targetCrmTab?: "pipeline" | "today" | "accounts" | "leads" | "tasks" | "competitor-pricing";
}

/**
 * Resolves a requested tool slug or shortcut identifier to a registered destination.
 */
export function resolveToolRoute(slug: string): ResolvedRoute {
  if (!slug) {
    return {
      isSupported: true,
      definition: REGISTERED_TOOL_ROUTES.find((r) => r.id === "plan-takeoff"),
      requestedSlug: "",
      targetNavTab: "tools",
      targetToolSubTab: "plan-takeoff"
    };
  }

  const cleanSlug = slug.trim().toLowerCase();

  const match = REGISTERED_TOOL_ROUTES.find(
    (r) => r.id === cleanSlug || r.aliases.includes(cleanSlug)
  );

  if (match) {
    return {
      isSupported: true,
      definition: match,
      requestedSlug: slug,
      targetNavTab: match.navTab,
      targetToolSubTab: match.toolSubTab,
      targetCrmTab: match.crmTab
    };
  }

  return {
    isSupported: false,
    requestedSlug: slug,
    targetNavTab: "tools",
    targetToolSubTab: "unknown" as ToolSubTab
  };
}
