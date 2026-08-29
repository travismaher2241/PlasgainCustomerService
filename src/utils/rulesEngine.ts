/**
 * Deterministic Rules Engine (Offline & Fast Fallback)
 * 
 * Provides instantaneous, zero-latency parsing and standard matching based on 
 * Australian Standards (AS/NZS 1158, AS/NZS 3000, AS 4702, AS/NZS 4509)
 * when AI providers are unavailable, offline, or rate-limited.
 */

import { EnquiryAnalysisResult, RecommendedProduct, AlternativeProduct, CustomerQuestion, NextBestAction, OpportunitySummary } from "../types";

interface EnquiryMetadata {
  customerName?: string;
  customer?: string;
  contactName?: string;
  company?: string;
  projectName?: string;
  project?: string;
  location?: string;
  source?: string;
  attachedFiles?: string[];
}

export function analyzeEnquiryDeterministic(
  rawText: string,
  metadata?: EnquiryMetadata
): EnquiryAnalysisResult {
  const text = (rawText || "").toLowerCase();
  const meta = metadata || {};
  const projectName = meta.projectName || meta.project || extractProjectName(text) || "Customer Project Enquiry";
  const company = meta.company || meta.customerName || meta.customer || "Prospective Client";
  const location = meta.location || extractLocation(text) || "Australia";

  // 1. Identify Domain / Category
  const isLighting = /light|luminaire|pole|shared\s*path|pathway|cycleway|road|car\s*park|photometric|lux|cct|\d{4}k|as\/?nzs\s*1158/i.test(text);
  const isSolar = /solar|battery|lifepo4|off-?grid|autonomy|pv\s*(?:panel|array)|dusk|dawn|no\s+(?:mains|trenching)/i.test(text);
  const isCableCover = !isLighting && /(?:cable|conduit)\s+(?:cover|protection|trench)|as\s*4702|polymeric\s+(?:cover|slab)|utility\s+trench|energex|ergon|ausgrid|endeavour|powercor|sp\s*ausnet|jemena|western\s*power|sapn/i.test(text);
  const isHighway = /v-?category|v3|v5|m-?category|highway|arterial|freeway|main\s*road|vicroads|tfnsw|tmr|main\s*roads/i.test(text);

  // 2. Determine Primary & Alternative Products
  let recommendedProduct: RecommendedProduct;
  let alternatives: AlternativeProduct[] = [];
  let scopeCategory = "Public & Commercial Lighting";

  if (isSolar && isLighting) {
    scopeCategory = "Clean Energy Solar Lighting (AS/NZS 1158.3.1 / AS/NZS 4509.2)";
    recommendedProduct = {
      productName: "Plasgain Intense Light 50W Solar Package (LiFePO4)",
      productCode: "INTENSE-50W-3K",
      matchLevel: "Candidate — engineering verification required",
      whySuitable: "Approved solar-lighting candidate for off-grid pathways; final battery, optical and pole selection must be verified against project inputs.",
      supportingSpecifications: {
        applicationFit: "Pathways, remote carparks, nature reserves, and council reserves without mains trenching.",
        luminaireOutput: "7,500 lumens nominal output (150 lm/W)",
        cctAvailable: "3000K Warm White / 4000K optional",
        solarAndBattery: "896Wh LiFePO4 Battery with 130W PV Panel",
        mountingOptions: "4.5m–6.0m subject to photometric and structural review",
        controlOptions: "PIR motion dimming or verified dusk-to-dawn profile"
      },
      importantLimitations: [
        "Do not quote until solar autonomy is calculated for the project postcode and operating profile.",
        "Final AS/NZS 1158 compliance requires a certified photometric design."
      ],
      informationStillRequired: [
        "Solar insolation zone / project postcode",
        "Required autonomy days and operating profile",
        "Mounting height, spacing and pole installation type"
      ],
      sourceCitations: [{
        documentTitle: "Plasgain Intense Light Solar Catalogue 2026.1",
        sectionOrPage: "Section 4.1 - Solar Sizing",
        authorityLevel: "Approved Datasheet"
      }]
    };
    alternatives = [{
      productName: "Plasgain Pro Blade Solar 75W / 125W Commercial",
      productCode: "PBS-75W-SOLAR",
      matchLevel: "Higher Output Candidate",
      whenToUse: "When a verified photometric and autonomy calculation requires a larger package.",
      tradeOffs: "Larger PV surface area, battery and wind loading."
    }];
  } else if (isCableCover) {
    scopeCategory = "Civil Mechanical Protection (AS 4702)";
    recommendedProduct = {
      productName: "Plasgain Heavy Duty Polymeric Cable Cover (AS 4702)",
      productCode: "CC-HD-150-100M",
      matchLevel: "Strong potential match",
      whySuitable: "Manufactured from 100% recycled HDPE composite conforming to AS 4702 impact and penetration resistance for electrical utilities & underground infrastructure.",
      supportingSpecifications: {
        applicationFit: "Underground electrical trenching, high voltage cabling, and utility mechanical protection.",
        luminaireOutput: "N/A (Civil Protection)",
        mountingOptions: "Direct burial over electrical conduit & backfill",
        controlOptions: "High-visibility warning print & interlock joining pins"
      },
      importantLimitations: [
        "Requires trench depth confirmation per utility standard (typically 450mm–750mm burial depth).",
        "Utility specification may require specific width (150mm, 200mm, 250mm, or 300mm)."
      ],
      informationStillRequired: [
        "Total trench length in linear meters",
        "Required width (150mm vs 200mm vs 300mm)",
        "Specific energy authority network specification (e.g., Ausgrid, Ergon, Powercor)"
      ],
      sourceCitations: [
        {
          documentTitle: "Plasgain Cable Cover Engineering Datasheet 2026.1",
          sectionOrPage: "Page 2 - AS 4702 Compliance",
          authorityLevel: "Approved Datasheet"
        }
      ]
    };

    alternatives = [
      {
        productName: "Plasgain Medium Duty Warning Tape & Tile",
        productCode: "WT-MD-200",
        matchLevel: "Alternative",
        whenToUse: "When client specifies secondary warning marker tape alongside hard covers.",
        tradeOffs: "Lower impact protection than continuous polymeric slab."
      }
    ];
  } else if (isSolar) {
    scopeCategory = "Clean Energy Solar Lighting (AS/NZS 1158.3.1 / AS 4509)";
    recommendedProduct = {
      productName: "Plasgain Intense Light 50W Solar Package (LiFePO4)",
      productCode: "INTENSE-50W-3K",
      matchLevel: "Strong potential match",
      whySuitable: "Commercial-grade standalone solar luminaire featuring high-efficiency MPPT charging, LiFePO4 battery storage, and 3000K warm fauna-friendly LED engine.",
      supportingSpecifications: {
        applicationFit: "Pathways, remote carparks, nature reserves, and council reserves without mains trenching.",
        luminaireOutput: "7,500 lumens nominal output (150 lm/W)",
        cctAvailable: "3000K Warm White (standard fauna compliance) / 4000K optional",
        solarAndBattery: "896Wh LiFePO4 Battery with 130W Integrated Monocrystalline PV Panel",
        mountingOptions: "4.5m – 6.0m Plaspole Composite or Rag-bolt Galv Pole",
        controlOptions: "Smart PIR Motion Dimming (6h 100% + 6h 30% Dim or Dusk-to-Dawn)"
      },
      importantLimitations: [
        "Southern latitude winter autonomy (VIC/TAS) requires minimum 4.5–5 nights battery capacity.",
        "Tree canopy or adjacent building shading requires site solar insolation verification."
      ],
      informationStillRequired: [
        "Solar insolation zone / Project postcode",
        "Required autonomy days (typically 3–5 nights)",
        "Mounting height and pole direct burial vs baseplate preference"
      ],
      sourceCitations: [
        {
          documentTitle: "Plasgain Intense Light Solar Catalogue 2026.1",
          sectionOrPage: "Section 4.1 - Solar Sizing",
          authorityLevel: "Approved Datasheet"
        }
      ]
    };

    alternatives = [
      {
        productName: "Plasgain Pro Blade Solar 75W / 125W Commercial",
        productCode: "PBS-75W-SOLAR",
        matchLevel: "Higher Output Alternative",
        whenToUse: "When sub-category requires higher lux levels (e.g. PP4 / P11 Carpark).",
        tradeOffs: "Larger PV surface area and heavier luminaire head."
      }
    ];
  } else if (isHighway) {
    scopeCategory = "V-Category Main Road & Highway Lighting (AS/NZS 1158.1.1)";
    recommendedProduct = {
      productName: "Plasgain Roadway V-LED 150W Luminaire",
      productCode: "ROADWAY-VLED-150W",
      matchLevel: "Strong potential match",
      whySuitable: "High-performance roadway luminaire designed to meet strict AS/NZS 1158.1.1 V3/V5 luminance and uniformity metrics with low glare optics.",
      supportingSpecifications: {
        applicationFit: "State road intersections, dual carriageways, arterial roads, and highway corridors.",
        luminaireOutput: "22,500 lumens (150 lm/W efficacy)",
        cctAvailable: "4000K Neutral White (standard V-Category)",
        mountingOptions: "8.5m – 10.5m steel or rag-bolt outreach arm (spigot 60mm)",
        controlOptions: "7-pin NEMA or Zhaga D4i smart city lighting receptacle"
      },
      importantLimitations: [
        "Must be supported by Dialux road calculation for exact tilt and overhang spacing.",
        "Requires certified wind region foundation design for tall outreach masts."
      ],
      informationStillRequired: [
        "Road reserve geometry (lane width, median width, shoulder setback)",
        "Target sub-category (V3, V5, etc.)",
        "Power supply (Mains 240V vs Private sub-circuit)"
      ],
      sourceCitations: [
        {
          documentTitle: "Plasgain Main Road & Highway Lighting Technical Manual",
          sectionOrPage: "Section 2 - V-Category Standards",
          authorityLevel: "Approved Engineering Spec"
        }
      ]
    };

    alternatives = [
      {
        productName: "Plasgain Pro Blade 120W Mains Area Luminaire",
        productCode: "PBS-120W-MAINS",
        matchLevel: "Alternative",
        whenToUse: "For local collector roads or mixed commercial access routes.",
        tradeOffs: "Lower maximum lumen output."
      }
    ];
  } else {
    // Default Pathway / Minor Area lighting (P-Category)
    scopeCategory = "Pedestrian & Area Lighting (AS/NZS 1158.3.1 - Category P)";
    recommendedProduct = {
      productName: "Plasgain Pro Blade Area Luminaire (Mains / Hybrid)",
      productCode: "PBS-75W-4K",
      matchLevel: "Strong potential match",
      whySuitable: "Versatile Type II/III optical luminaire engineered for Council shared paths, public reserves, and perimeter security lighting complying with P3/P4 standards.",
      supportingSpecifications: {
        applicationFit: "Council footpaths, active shared paths, public recreation reserves, and urban walkways.",
        luminaireOutput: "10,500 lumens",
        cctAvailable: "3000K Warm (fauna sensitive) / 4000K Neutral (standard)",
        mountingOptions: "4.5m – 6.5m direct burial composite Plaspole or rag-bolt column",
        controlOptions: "DALI-2 / 0-10V Dimming with optional photocell"
      },
      importantLimitations: [
        "Final compliance requires verification of pole spacing against path width.",
        "Check for local council heritage or wildlife lighting constraints (CCT ≤ 3000K)."
      ],
      informationStillRequired: [
        "Target lighting subcategory (e.g. PP4 / P3 / P2)",
        "Pathway width (m) and total route length (m)",
        "Preferred mounting height (typically 4.5m or 6.0m)"
      ],
      sourceCitations: [
        {
          documentTitle: "Plasgain Pro Blade Catalogue & Photometric Guide 2026.1",
          sectionOrPage: "Page 6 - Optical Distinctions",
          authorityLevel: "Approved Datasheet"
        }
      ]
    };

    alternatives = [
      {
        productName: "Plasgain Intense Light 50W LED Luminaire",
        productCode: "INTENSE-50W",
        matchLevel: "Direct Alternative",
        whenToUse: "When energy efficiency and lower mounting height (3.5m–4.5m) is priority.",
        tradeOffs: "Lower lumen package (7,500 lm vs 10,500 lm)."
      },
      {
        productName: "enLighten Zorro 2 Architectural Luminaire",
        productCode: "ZORRO-2-60W",
        matchLevel: "Architectural Upgrade",
        whenToUse: "When client requests architectural aesthetic or low upward-waste light ratio (UWLR < 1%).",
        tradeOffs: "Higher unit fixture cost."
      }
    ];
  }

  // 3. Readiness Scoring & Missing Items
  const knownItems: string[] = [];
  const missingItems: string[] = [];

  if (projectName && projectName !== "Customer Project Enquiry") knownItems.push(`Project Name: ${projectName}`);
  if (location && location !== "Australia") knownItems.push(`Location: ${location}`);
  if (company && company !== "Prospective Client") knownItems.push(`Client / Specifier: ${company}`);

  if (/3000k|4000k|5700k/i.test(text)) knownItems.push("Target Color Temperature (CCT) mentioned");
  else missingItems.push("Required CCT (3000K fauna-friendly vs 4000K standard)");

  if (/\b(?:pole|mount(?:ing|ed)?\s+height)\b.{0,24}\b\d+(?:\.\d+)?\s*m(?:etre)?s?\b|\b\d+(?:\.\d+)?\s*m(?:etre)?s?\s+(?:pole|mounting)/i.test(text)) knownItems.push("Mounting height / pole preference indicated");
  else missingItems.push("Mounting height & pole installation type (Direct Burial vs Rag-bolt)");

  if (/p[1-5]|pp[1-5]|v[1-5]/i.test(text)) knownItems.push("Australian Lighting Sub-Category (AS/NZS 1158) identified");
  else missingItems.push("Target AS/NZS 1158 lighting subcategory (e.g. PP4 / P3 / V5)");

  if (isSolar) {
    if (/night|autonomy/i.test(text)) knownItems.push("Autonomy duration specified");
    else missingItems.push("Required solar battery autonomy nights (typically 3–5 nights)");
  }

  let readinessScore = 50;
  if (knownItems.length >= 3) readinessScore += 25;
  if (missingItems.length <= 2) readinessScore += 15;
  readinessScore = Math.min(90, Math.max(35, readinessScore));

  const readinessRating = readinessScore >= 75 ? "High" : readinessScore >= 50 ? "Medium" : "Low";

  // 4. Questions Before We Quote
  const questionsBeforeWeQuote: CustomerQuestion[] = [
    {
      id: "q-subcat",
      question: "Which AS/NZS 1158 lighting subcategory or Australian Standard applies to this project (e.g., PP4 shared path, P11 carpark, or AS 4702)?",
      whyItMatters: "Ensures correct pole spacing and prevents non-compliant tender submissions.",
      category: "Compliance",
      defaultSelected: true
    },
    {
      id: "q-poles",
      question: "Are poles included in the scope, and do you prefer direct-burial composite Plaspole or rag-bolt baseplate mounted steel columns?",
      whyItMatters: "Direct burial composite poles eliminate excavation for concrete footings in standard soil and offer non-conductive electrical safety.",
      category: "Technical",
      defaultSelected: true
    },
    {
      id: "q-power",
      question: isSolar 
        ? "What is the exact project postcode / solar zone and required autonomy duration (e.g., 5 nights)?" 
        : "Is mains 240V power available at every pole location, or should off-grid solar alternatives be costed?",
      whyItMatters: isSolar 
        ? "Guarantees AS/NZS 4509 battery sizing avoids winter battery depletion." 
        : "Solar lighting eliminates expensive civil trenching and mains connection fees.",
      category: "Technical",
      defaultSelected: true
    }
  ];

  // 5. Next Best Action
  const nextBestAction: NextBestAction = {
    title: "Send Technical Datasheet & Confirm Project Parameters",
    description: `Acknowledge enquiry for ${projectName}, provide standard Plasgain engineering documentation, and confirm key missing parameters before issuing commercial quote.`,
    primaryActionLabel: "Prepare Customer Email & Technical Package",
    actionType: "request_info",
    urgency: "Today"
  };

  // 6. Opportunity Summary
  const sf = (value: string, status: "Confirmed" | "Inferred" | "Unknown" = "Confirmed"): { value: string; status: "Confirmed" | "Inferred" | "Unknown" } => ({
    value,
    status
  });

  const quantityMatch = rawText.match(/\b(?:quote|supply|need|require|for)?\s*(\d{1,5})\s*(?:x\s*)?(?:solar\s+)?(?:lights?|luminaires?|poles?|units?)\b/i);
  const explicitQuantity = quantityMatch ? Number(quantityMatch[1]) : null;
  const deadlineMatch = rawText.match(/\b(?:delivery|deliver|required|needed)\s+(?:by|before)\s+([^,.\n]+)/i);
  const cctMatch = rawText.match(/\b(2200k|2700k|3000k|4000k|5000k|5700k|6500k)\b/i);
  const standards = Array.from(rawText.matchAll(/\bAS(?:\/NZS)?\s*\d+(?:\.\d+)*(?::\d{4})?\b/gi)).map((m) => m[0]);

  const opportunitySummary: OpportunitySummary = {
    customer: sf(meta.contactName || meta.customer || "Prospective Client", meta.customer ? "Confirmed" : "Inferred"),
    company: sf(company, meta.company ? "Confirmed" : "Inferred"),
    project: sf(projectName, projectName !== "Customer Project Enquiry" ? "Confirmed" : "Inferred"),
    location: sf(location, location !== "Australia" ? "Confirmed" : "Unknown"),
    application: sf(scopeCategory, "Inferred"),
    productCategory: sf(scopeCategory, "Inferred"),
    quantity: explicitQuantity ? sf(String(explicitQuantity), "Confirmed") : sf("TBD", "Unknown"),
    projectTiming: sf("Not provided", "Unknown"),
    quoteDeadline: deadlineMatch ? sf(deadlineMatch[1].trim(), "Confirmed") : sf("Not provided", "Unknown"),
    installationTiming: sf("Not provided", "Unknown"),
    powerAvailability: sf(isSolar ? "Off-grid Solar Required" : "Mains 240V", "Inferred"),
    mountingPoleRequirements: sf("Not provided", "Unknown"),
    operatingRequirements: sf("Not provided", "Unknown"),
    cct: cctMatch ? sf(cctMatch[1].toUpperCase(), "Confirmed") : sf("Not provided", "Unknown"),
    lightingPerformanceRequirements: sf("Engineering verification required", "Unknown"),
    environmentalRequirements: sf("Not provided", "Unknown"),
    standardsMentioned: standards.length ? sf(standards.join(", "), "Confirmed") : sf("Not provided", "Unknown"),
    commercialRequirements: sf("Not provided", "Unknown"),
    otherNotes: sf(`Processed via Plasgain Deterministic Rules Engine for ${projectName}.`, "Confirmed")
  };

  return {
    opportunitySummary,
    readiness: {
      score: readinessScore,
      rating: readinessRating,
      knownItems,
      missingItems,
      summaryExplanation: `Found ${knownItems.length} verified project parameters. ${missingItems.length} key technical items required before final Dialux sign-off.`
    },
    productRecommendations: {
      recommendedStartingPoint: recommendedProduct,
      alternatives
    },
    nextBestAction,
    questionsBeforeWeQuote,
    internalSalesCoachTip: `Offline Rules Match: Recommended ${recommendedProduct.productCode} based on keyword match with Australian Standard ${scopeCategory}. Offer direct-burial Plaspole composite columns as an alternative to reduce civil trenching costs.`,
    sourcesUsed: [
      "Plasgain Verified Product Catalogue 2026.1",
      "AS/NZS 1158 Public Lighting Standards Reference",
      "AS 4702 Polymeric Cable Cover Specification"
    ],
    pricingGuardrailNotice: "Preliminary pricing based on 2026.1 standard catalogue rate card. Subject to quantity tier review."
  };
}

function extractProjectName(text: string): string | null {
  const match = text.match(/(?:project|site|tender|ref|job|location)[:\s]+([^\n,\.]{3,40})/i);
  return match ? match[1].trim() : null;
}

function extractLocation(text: string): string | null {
  const states = ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt", "brisbane", "sydney", "melbourne", "perth", "adelaide", "hobart", "darwin", "gold coast", "sunshine coast", "newcastle", "geelong", "drouin"];
  for (const s of states) {
    if (new RegExp(`\\b${s}\\b`, "i").test(text)) {
      return s.toUpperCase();
    }
  }
  return null;
}
