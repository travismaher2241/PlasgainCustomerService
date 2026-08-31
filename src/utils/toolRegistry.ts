/**
 * Canonical Tool & Route Registry
 * 
 * Maps user shortcuts, search commands, and deep links to supported application workflows.
 * Guarantees that every Home shortcut leads to a valid, working destination or a controlled fallback.
 */

import { NavTab, ToolSubTab } from "../context/AppContext";

export interface ToolRouteDefinition {
  id: string;
  aliases: string[];
  displayName: string;
  description: string;
  category: "Engineering Calculator" | "AI Workflow" | "CRM Review" | "Compliance";
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
    id: "solar-autonomy",
    aliases: ["solar-sizing", "solar-autonomy", "solar-calc", "battery-sizing", "autonomy-calc"],
    displayName: "Solar Sizing & Battery Autonomy Calculator",
    description: "Calculate daily watt-hour draw, geographic peak sun hours, and 5-day LiFePO4 battery autonomy.",
    category: "Engineering Calculator",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "solar-autonomy",
    iconName: "Sun"
  },
  {
    id: "wind-foundation-calc",
    aliases: ["wind-region", "wind-pole-sizing", "wind-calc", "pole-sizing", "foundation-calc", "footing-calc"],
    displayName: "Wind Region (AS 1170.2) & Foundation Hardware Estimator",
    description: "Determine cyclonic vs inland wind pressure (Regions A-D), embedment depth, and foundation concrete surcharge.",
    category: "Engineering Calculator",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "wind-foundation-calc",
    iconName: "Wind"
  },
  {
    id: "pole-spacing-calc",
    aliases: ["spacing-calc", "pole-spacing", "pathway-spacing", "as1158-calc", "cat-p-calc"],
    displayName: "Pathway Pole Spacing & Lux Estimator (AS/NZS 1158)",
    description: "Compute pole spacing and required fittings per km across Category P1-P5 and PR1-PR4 standards.",
    category: "Engineering Calculator",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "pole-spacing-calc",
    iconName: "Zap"
  },
  {
    id: "cable-cover-calc",
    aliases: ["cable-cover", "polymeric-calc", "as4702-calc", "trench-calc", "trench-cover"],
    displayName: "Trench Polymeric Cable Cover & Concrete Offset Calculator (AS 4702)",
    description: "Calculate polymeric roll quantities, freight weight savings, and carbon reduction vs precast concrete slabs.",
    category: "Engineering Calculator",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "cable-cover-calc",
    iconName: "ShieldCheck"
  },
  {
    id: "plan-takeoff",
    aliases: ["takeoff", "drawing-takeoff", "plan-takeoff", "pdf-takeoff", "take-off"],
    displayName: "Engineering Plan Take-off Workspace",
    description: "Decipher civil PDF drawings, extract luminaire BOM counts, and detect compliance risks.",
    category: "AI Workflow",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "plan-takeoff",
    iconName: "Layers"
  },
  {
    id: "conflict-resolver",
    aliases: ["spec-resolver", "conflict-resolver", "spec-conflict", "compliance-resolver", "spec-review"],
    displayName: "Specification Review",
    description: "Cross-examine customer tender specifications against AS/NZS 1158 and AS 4282 dark-sky mandates.",
    category: "Compliance",
    destinationType: "tools",
    navTab: "tools",
    toolSubTab: "conflict-resolver",
    iconName: "AlertTriangle"
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
