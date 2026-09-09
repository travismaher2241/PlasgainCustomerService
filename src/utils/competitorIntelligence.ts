import { CompetitorPricingRecord, CRMOpportunity } from "../types/crm";

export interface CompetitorBattlecard {
  competitorName: string;
  encounterCount: number;
  avgPriceVariancePercent: number; // e.g. -8.5 means competitor is 8.5% cheaper than Plasgain on average
  recentEncounterDate: string;
  productsSeen: string[];
  keyThreatSummary: string;
  positioningBattlecard: {
    categoryEdge: string;
    plasgainDifferentiators: string[];
    counterArguments: string[];
    objectionHandling: Array<{ objection: string; counterResponse: string }>;
  };
}

export interface CompetitorBreakdownItem {
  competitorName: string;
  count: number;
  encounterRatePercent: number;
  avgVariancePercent: number;
  cheaperCount: number;
  pricierCount: number;
}

export interface CompetitorIntelligenceSummary {
  totalRecords: number;
  activeRecords: number;
  uniqueCompetitorsCount: number;
  competitorBreakdown: CompetitorBreakdownItem[];
  marketTakeaway: string;
  battlecards: CompetitorBattlecard[];
}

/**
 * Standard competitive intelligence battlecards for key Australian civil/streetscape competitors.
 */
const DEFAULT_BATTLECARDS: Record<string, {
  keyThreatSummary: string;
  categoryEdge: string;
  plasgainDifferentiators: string[];
  counterArguments: string[];
  objectionHandling: Array<{ objection: string; counterResponse: string }>;
}> = {
  replas: {
    keyThreatSummary: "Replas quotes aggressively on simple recycled plastic bollards and profile posts, typically 5-12% below Plasgain upfront.",
    categoryEdge: "Whole-of-life cost and replacement cycle vs lowest upfront unit rate",
    plasgainDifferentiators: [
      "Australian-made with local stock and support, so lead times and replacements are not tied to an import cycle.",
      "Longer service life in the field, which changes the replacement schedule a council has to budget for.",
      "Recycled Australian content, so sustainability and procurement criteria are still met."
    ],
    counterArguments: [
      "Acknowledge the upfront price difference honestly rather than arguing it away: the gap is real, the question is what it costs over the asset's life.",
      "Move the conversation to Total Cost of Ownership: an earlier replacement cycle costs a council more than the upfront saving.",
      "Ask what the customer has actually seen from installed product on their own sites — their experience carries more weight than either supplier's claims."
    ],
    objectionHandling: [
      {
        objection: "Replas is 8% cheaper per post on this tender.",
        counterResponse: "That is a fair gap and worth taking seriously. The question I would put back is what the replacement schedule looks like over the life of the asset, because that is where the difference usually shows up. If it would help, I can get the product team to give you specifics for your site conditions."
      },
      {
        objection: "We need recycled content for our council sustainability quota.",
        counterResponse: "Plasgain is also Australian recycled content, so the same procurement credits apply. I can get you the current documentation for your submission."
      }
    ]
  },
  modwood: {
    keyThreatSummary: "Modwood offers widely recognized composite profiles, primarily positioned in decorative decking and cladding.",
    categoryEdge: "Civil and municipal infrastructure use vs decorative decking and cladding",
    plasgainDifferentiators: [
      "Purpose-built for civil and municipal applications rather than residential decking.",
      "Supported locally, with the product team available on application questions."
    ],
    counterArguments: [
      "Clarify application scope: Modwood is positioned for decking and cladding; Plasgain is sold into civil and municipal infrastructure.",
      "Ask what the post or bollard actually has to carry on this site, then get the product team to confirm suitability rather than asserting it on the call."
    ],
    objectionHandling: [
      {
        objection: "We already have Modwood spec'd across our foreshore.",
        counterResponse: "That makes sense where it is doing a decking job. For the vertical posts and bollards, it is worth a separate look — tell me what those need to carry and I will get the product team to confirm what suits."
      }
    ]
  },
  timber: {
    keyThreatSummary: "Treated pine or hardwood specified as traditional low-cost legacy material by civil contractors.",
    categoryEdge: "Eliminates the painting, treatment and replacement cycle timber carries",
    plasgainDifferentiators: [
      "No painting, oiling or re-treatment cycle to budget for.",
      "No rot or termite replacement schedule in ground contact.",
      "Suited to sensitive waterway, wetland and coastal sites where treated timber raises questions."
    ],
    counterArguments: [
      "Compare the 10-year asset ledger rather than the unit rate: timber carries recurring maintenance and an earlier replacement, Plasgain does not.",
      "Ask the asset manager what they currently spend maintaining their timber assets — that number usually makes the case better than any product claim."
    ],
    objectionHandling: [
      {
        objection: "Hardwood timber is cheaper upfront for our sub-contractor.",
        counterResponse: "Upfront, yes. It is worth putting the maintenance and replacement cycle next to it before deciding, because that is usually where the difference sits for a council asset. I am happy to work through those numbers with you."
      }
    ]
  },
  enviropole: {
    keyThreatSummary: "Specialist pole supplier providing composite or steel street lighting alternatives.",
    categoryEdge: "Handling and installation effort, and Australian local supply",
    plasgainDifferentiators: [
      "Lighter to handle than steel, which affects crew size and plant on install.",
      "Australian recycled origin and local supply rather than overseas procurement.",
      "Local product support if the site throws up something unexpected."
    ],
    counterArguments: [
      "Emphasize local Australian recycling origin and supply over overseas composite procurement.",
      "Focus on install effort and site handling, which the crew feels directly, rather than competing on product claims."
    ],
    objectionHandling: [
      {
        objection: "Why not use galvanized steel poles?",
        counterResponse: "Steel is a reasonable option and worth comparing properly. The practical differences reps hear most about are handling weight on install and how each behaves in coastal conditions. For anything specific to your site, I can get the product team to confirm rather than guess on the call."
      }
    ]
  }
};

/**
 * Normalizes a competitor name to key for matching default battlecards.
 */
function normalizeName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower.includes("replas")) return "replas";
  if (lower.includes("modwood")) return "modwood";
  if (lower.includes("timber") || lower.includes("hardwood") || lower.includes("pine")) return "timber";
  if (lower.includes("enviro") || lower.includes("steel")) return "enviropole";
  return lower;
}

/**
 * Computes cross-deal competitor intelligence:
 * - Encounter rates across deals and accounts
 * - Average price variance % against Plasgain quoted prices
 * - Dynamic and tailored counter-positioning battlecards
 */
export function computeCompetitorIntelligence(
  records: CompetitorPricingRecord[],
  deals: CRMOpportunity[] = []
): CompetitorIntelligenceSummary {
  const activeRecords = records.filter((r) => r.status === "Active");
  const total = records.length;

  if (total === 0) {
    return {
      totalRecords: 0,
      activeRecords: 0,
      uniqueCompetitorsCount: 0,
      competitorBreakdown: [],
      marketTakeaway: "No competitor pricing records logged yet. Log competitor observations to uncover cross-quote pricing patterns.",
      battlecards: []
    };
  }

  // Group by competitor name
  const compMap = new Map<string, {
    records: CompetitorPricingRecord[];
    variances: number[];
    products: Set<string>;
    latestDate: string;
  }>();

  for (const r of records) {
    const name = r.competitorName.trim() || "Unknown Competitor";
    if (!compMap.has(name)) {
      compMap.set(name, { records: [], variances: [], products: new Set(), latestDate: "" });
    }
    const entry = compMap.get(name)!;
    entry.records.push(r);
    if (r.competitorProduct) entry.products.add(r.competitorProduct);
    if (r.observedDate && (!entry.latestDate || r.observedDate > entry.latestDate)) {
      entry.latestDate = r.observedDate;
    }

    // If both competitor price and plasgain price exist, calculate variance
    // Formula: (competitorPrice - plasgainPrice) / plasgainPrice * 100
    // Negative = competitor is cheaper than Plasgain
    if (r.price > 0 && r.plasgainQuotedPrice && r.plasgainQuotedPrice > 0) {
      const variance = ((r.price - r.plasgainQuotedPrice) / r.plasgainQuotedPrice) * 100;
      entry.variances.push(variance);
    }
  }

  const competitorBreakdown: CompetitorBreakdownItem[] = [];
  const battlecards: CompetitorBattlecard[] = [];

  for (const [name, data] of compMap.entries()) {
    const count = data.records.length;
    const encounterRatePercent = Math.round((count / total) * 100);

    let avgVariancePercent = 0;
    let cheaperCount = 0;
    let pricierCount = 0;

    if (data.variances.length > 0) {
      const sum = data.variances.reduce((acc, v) => acc + v, 0);
      avgVariancePercent = Math.round((sum / data.variances.length) * 10) / 10;
      cheaperCount = data.variances.filter((v) => v < 0).length;
      pricierCount = data.variances.filter((v) => v > 0).length;
    }

    competitorBreakdown.push({
      competitorName: name,
      count,
      encounterRatePercent,
      avgVariancePercent,
      cheaperCount,
      pricierCount
    });

    // Build battlecard
    const normKey = normalizeName(name);
    const defaults = DEFAULT_BATTLECARDS[normKey] || {
      keyThreatSummary: `${name} is encountered in ${encounterRatePercent}% of competitive pricing bids.`,
      categoryEdge: "Whole-of-life cost, Australian supply and local support",
      plasgainDifferentiators: [
        "Australian-made with local stock and support.",
        "No ongoing painting, oiling or re-treatment cycle to budget for.",
        "Australian recycled content for procurement and sustainability criteria."
      ],
      counterArguments: [
        "Emphasize local manufacturing support, lead times and warranty backing.",
        "Demonstrate Total Cost of Ownership across the asset's life rather than competing on the unit rate."
      ],
      objectionHandling: [
        {
          objection: `Competitor ${name} has a lower upfront quote.`,
          counterResponse: `A lower unit rate from ${name} is worth taking at face value. The comparison that matters to a council is the 10-year cost including maintenance and replacement — that is the conversation to have. For anything product-specific, the Plasgain product team can confirm the detail.`
        }
      ]
    };

    battlecards.push({
      competitorName: name,
      encounterCount: count,
      avgPriceVariancePercent: avgVariancePercent,
      recentEncounterDate: data.latestDate || "Recent",
      productsSeen: Array.from(data.products),
      keyThreatSummary: defaults.keyThreatSummary,
      positioningBattlecard: {
        categoryEdge: defaults.categoryEdge,
        plasgainDifferentiators: defaults.plasgainDifferentiators,
        counterArguments: defaults.counterArguments,
        objectionHandling: defaults.objectionHandling
      }
    });
  }

  // Sort breakdown by encounter count descending
  competitorBreakdown.sort((a, b) => b.count - a.count);
  battlecards.sort((a, b) => b.encounterCount - a.encounterCount);

  // Synthesize market takeaway
  const topComp = competitorBreakdown[0];
  let marketTakeaway = "";
  if (topComp) {
    if (topComp.avgVariancePercent < -2) {
      marketTakeaway = `${topComp.competitorName} is the most frequent competitor (${topComp.encounterRatePercent}% of records), averaging ${Math.abs(topComp.avgVariancePercent)}% below Plasgain. Reps should lead with whole-of-life cost and local support rather than competing on margin.`;
    } else if (topComp.avgVariancePercent > 2) {
      marketTakeaway = `${topComp.competitorName} is the most frequent competitor (${topComp.encounterRatePercent}% of records), but quotes ${topComp.avgVariancePercent}% higher than Plasgain. Plasgain is competitive on price as well as on local supply and support.`;
    } else {
      marketTakeaway = `${topComp.competitorName} represents ${topComp.encounterRatePercent}% of all recorded market encounters. Positioning should emphasize Australian recycled content, local supply and whole-of-life cost.`;
    }
  }

  return {
    totalRecords: total,
    activeRecords: activeRecords.length,
    uniqueCompetitorsCount: compMap.size,
    competitorBreakdown,
    marketTakeaway,
    battlecards
  };
}
