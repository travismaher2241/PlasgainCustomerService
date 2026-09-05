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
    categoryEdge: "Thermal stability & structural core vs unreinforced recycled plastic thermal creep",
    plasgainDifferentiators: [
      "IK10 Vandal Resistance: Sledgehammer and impact-tested composite core preventing shear breakage.",
      "Zero Thermal Sagging: Maintains structural rigidity in 40°C+ Australian summer heat (no bowing).",
      "50-Year Design Life: Engineered for long-term municipal assets with zero microplastic surface flake.",
      "Certified AS/NZS Structural Standards: Rated for specified lateral loading unlike soft recycled profiles."
    ],
    counterArguments: [
      "Acknowledge the upfront price difference honestly: 'Replas offers low upfront prices, but their unreinforced recycled polymer softens under continuous Australian sun.'",
      "Focus on Total Cost of Ownership (TCO): Replacing warped posts every 6 years costs councils double the upfront savings.",
      "Highlight impact survival in car parks and public thoroughfares: Plasgain rebounds from vehicular bumps where solid recycled plastic snaps."
    ],
    objectionHandling: [
      {
        objection: "Replas is 8% cheaper per post on this tender.",
        counterResponse: "Replas is cheaper upfront because it uses unreinforced recycled resin. In direct sunlight, unreinforced plastic experiences thermal creep and sags over 2-3 summers. Plasgain uses an engineered internal matrix that guarantees zero sag for 50 years, eliminating the replacement cycle."
      },
      {
        objection: "We need recycled content for our council sustainability quota.",
        counterResponse: "Plasgain is also 100% Australian recycled circular composite, giving your council the exact same green procurement credits, but with structural engineering certifications that protect council ratepayer funds."
      }
    ]
  },
  modwood: {
    keyThreatSummary: "Modwood offers widely recognized composite profiles, primarily positioned in decorative decking and cladding.",
    categoryEdge: "Structural engineering strength vs decorative wood-plastic composite (WPC)",
    plasgainDifferentiators: [
      "High Flexural Strength: Capable of supporting lighting, signage, and structural loads without bracket sagging.",
      "Zero Moisture Swelling: Sealed circular polymer core prevents edge water absorption and moss growth.",
      "Termite & Marine Borer Proof: Impervious to subterranean and marine organism attack."
    ],
    counterArguments: [
      "Clarify application scope: Modwood is designed for light-duty residential decking; Plasgain is purpose-built for heavy civil and municipal infrastructure.",
      "Highlight non-splinter and non-chalking surfaces over decades of heavy foot-traffic."
    ],
    objectionHandling: [
      {
        objection: "We already have Modwood spec'd across our foreshore.",
        counterResponse: "Modwood is great for low-impact decking, but for vertical posts and bollards subject to vehicle nudges or sign mounting, Plasgain provides 3x higher flexural yield strength without surface flaking."
      }
    ]
  },
  timber: {
    keyThreatSummary: "Treated pine or hardwood specified as traditional low-cost legacy material by civil contractors.",
    categoryEdge: "Eliminates chemical leaching (CCA/creosote), rot, splintering, and painting maintenance",
    plasgainDifferentiators: [
      "Zero Toxic Leaching: 100% inert in sensitive waterways, wetlands, and coastal reserves.",
      "Zero Ongoing Maintenance: No oiling, varnishing, or repainting cycles required.",
      "Termite & Fungus Immune: Will not rot in moist ground-contact or direct burial."
    ],
    counterArguments: [
      "Compare 10-year asset ledger: Timber requires painting every 3 years and replacement at year 7-10. Plasgain is install-and-forget for 50 years."
    ],
    objectionHandling: [
      {
        objection: "Hardwood timber is cheaper upfront for our sub-contractor.",
        counterResponse: "Timber seems cheaper until you account for delivery weight, ground-contact rot treatments, and ongoing maintenance. Council asset managers specifically prefer Plasgain because it eliminates maintenance callouts entirely."
      }
    ]
  },
  enviropole: {
    keyThreatSummary: "Specialist pole supplier providing composite or steel street lighting alternatives.",
    categoryEdge: "Lightweight handling, electrical non-conductivity, and Category P4 compliance",
    plasgainDifferentiators: [
      "Non-Conductive Safety: Completely non-conductive, eliminating step-and-touch voltage risks near public assets.",
      "Direct Burial Ready: Non-corrosive in acid sulfate soils or high-salinity coastal zones.",
      "Rapid Installation: Half the weight of steel poles, requiring fewer crew members and smaller plant."
    ],
    counterArguments: [
      "Emphasize local Australian recycling origin over overseas composite procurement.",
      "Highlight lightning and electrical safety advantages in park and pathway installations."
    ],
    objectionHandling: [
      {
        objection: "Why not use galvanized steel poles?",
        counterResponse: "Steel corrodes in coastal salt air within 10–15 years and requires separate electrical earthing. Plasgain composite poles are 100% non-conductive, salt-proof, and install without cranes."
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
      marketTakeaway: "No competitor pricing records logged yet. Log competitor observations to uncover cross-deal pricing patterns.",
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
      categoryEdge: "Engineered structural composite with 50-year design life",
      plasgainDifferentiators: [
        "IK10 Vandal Resistance & Sledgehammer Impact Certification.",
        "Zero thermal sagging or bowing in high ambient temperatures.",
        "Australian circular economy recycled composition."
      ],
      counterArguments: [
        "Emphasize local manufacturing support, lead times, and comprehensive 50-year structural engineering warranty.",
        "Demonstrate Total Cost of Ownership: Zero maintenance repainting or oiling cycles."
      ],
      objectionHandling: [
        {
          objection: `Competitor ${name} has a lower upfront quote.`,
          counterResponse: `While ${name} may propose a lower upfront unit rate, Plasgain provides certified structural engineering ratings and zero maintenance callouts, lowering the 10-year lifecycle cost.`
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
      marketTakeaway = `${topComp.competitorName} is the most frequent competitor (${topComp.encounterRatePercent}% of records), averaging ${Math.abs(topComp.avgVariancePercent)}% below Plasgain. Reps should lead with the IK10 durability, zero thermal sag, and 50-year TCO battlecard rather than competing on margin.`;
    } else if (topComp.avgVariancePercent > 2) {
      marketTakeaway = `${topComp.competitorName} is the most frequent competitor (${topComp.encounterRatePercent}% of records), but quotes ${topComp.avgVariancePercent}% higher than Plasgain. Plasgain holds both a commercial price and engineering advantage.`;
    } else {
      marketTakeaway = `${topComp.competitorName} represents ${topComp.encounterRatePercent}% of all recorded market encounters. Positioning should emphasize Australian circular certified material and AS/NZS compliance.`;
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
