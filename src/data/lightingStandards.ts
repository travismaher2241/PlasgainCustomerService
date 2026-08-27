/**
 * Authoritative AS/NZS Lighting Standards Dataset
 * 
 * Dataset Version: 2026.1 (Approved Technical Master)
 * Primary Reference: AS/NZS 1158.3.1:2020 (Pedestrian Area / Category P) & AS/NZS 1158.1.1:2022 (Vehicular / Category V)
 * Effective Date: 2020-11-20 / Current
 * 
 * RULE: ONE CATEGORY = ONE AUTHORITATIVE RECORD.
 * All modules (Product Finder, Lighting Explainer, Spacing Calculator, Take-off)
 * must derive their labels, lux targets, and calculation parameters from this dataset.
 */

export interface LightingStandardCategory {
  id: string;
  family: "Category P (Pedestrian & Shared Paths)" | "Category PR (Dedicated Cycleways)" | "Category V (Vehicular Roadways)";
  category: string;
  displayName: string;
  subTitle: string;
  maintainedIlluminanceLux: number; // Average horizontal illuminance (E_h,avg in lux)
  minimumIlluminanceLux: number; // Minimum point horizontal illuminance (E_h,min in lux)
  uniformityRequirement: string; // e.g. "U_o <= 10" (Point to average ratio)
  maxUniformityRatio: number;
  typicalMountingHeightM: number;
  typicalSpacingRangeM: string;
  recommendedOptics: string;
  cctGuideline: string;
  standardReference: string;
  standardVersion: string;
  effectiveDate: string;
  datasetRevision: string;
  notes: string;
  sourceId: string;
}

export const DATASET_METADATA = {
  name: "AS/NZS Authoritative Lighting Standards Dataset",
  revision: "2026.1",
  standardReference: "AS/NZS 1158.3.1:2020 & AS/NZS 1158.1.1:2022",
  effectiveDate: "2020-11-20",
  lastVerified: "2026-08-28",
  approvedBy: "Plasgain Technical & Engineering Compliance Group"
};

export const LIGHTING_STANDARDS_CATEGORIES: LightingStandardCategory[] = [
  // -------------------------------------------------------------
  // Category P: Pedestrian & Pathway Lighting (AS/NZS 1158.3.1:2020 Table 2.1)
  // -------------------------------------------------------------
  {
    id: "P1",
    family: "Category P (Pedestrian & Shared Paths)",
    category: "P1",
    displayName: "Category P1 — High Activity Commercial / Transport Precincts",
    subTitle: "Town centres, transit interchanges, civic plazas, high pedestrian density",
    maintainedIlluminanceLux: 7.0,
    minimumIlluminanceLux: 1.4,
    uniformityRequirement: "U_o ≤ 10 (E_avg / E_min)",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 6.0,
    typicalSpacingRangeM: "18m – 22m",
    recommendedOptics: "Type 2 / Type 3 Pathway",
    cctGuideline: "3000K – 4000K (Standard Civic)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.1",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Applies where pedestrian movement is dense, prestige civic appearance is paramount, or night-time crime risk is elevated.",
    sourceId: "AS1158-3-1-P1"
  },
  {
    id: "P2",
    family: "Category P (Pedestrian & Shared Paths)",
    category: "P2",
    displayName: "Category P2 — Active Promenades & High Pedestrian Paths",
    subTitle: "Major shared pathways connecting commercial precincts and foreshores",
    maintainedIlluminanceLux: 3.5,
    minimumIlluminanceLux: 0.7,
    uniformityRequirement: "U_o ≤ 10 (E_avg / E_min)",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 5.0,
    typicalSpacingRangeM: "24m – 28m",
    recommendedOptics: "Type 2 Pathway Asymmetric",
    cctGuideline: "3000K (Fauna & Public Amenity)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.1",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Applies to primary pedestrian routes and foreshores with moderate-to-high evening pedestrian traffic.",
    sourceId: "AS1158-3-1-P2"
  },
  {
    id: "P3",
    family: "Category P (Pedestrian & Shared Paths)",
    category: "P3",
    displayName: "Category P3 — Moderate Activity Pathways & Suburban Links",
    subTitle: "Suburban shared trails, park links, and local collector pathways",
    maintainedIlluminanceLux: 1.75,
    minimumIlluminanceLux: 0.35,
    uniformityRequirement: "U_o ≤ 10 (E_avg / E_min)",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 4.5,
    typicalSpacingRangeM: "30m – 36m",
    recommendedOptics: "Type 2 Pathway",
    cctGuideline: "3000K (Dark-Sky / Fauna Friendly)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.1",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Standard specification for community shared paths and suburban parkland links with moderate night use.",
    sourceId: "AS1158-3-1-P3"
  },
  {
    id: "P4",
    family: "Category P (Pedestrian & Shared Paths)",
    category: "P4",
    displayName: "Category P4 — Standard Shared Cycleway & Local Reserves",
    subTitle: "Council shared pathways, recreational bushland trails, local access roads",
    maintainedIlluminanceLux: 0.85,
    minimumIlluminanceLux: 0.17,
    uniformityRequirement: "U_o ≤ 10 (E_avg / E_min)",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 4.5,
    typicalSpacingRangeM: "38m – 45m",
    recommendedOptics: "Type 2 Long Pathway Throw",
    cctGuideline: "3000K (Wildlife Protection Standard)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.1",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Primary specification for 80%+ of municipal shared cycleway tenders. Maintained horizontal lux: 0.85 lx avg (0.17 lx point minimum).",
    sourceId: "AS1158-3-1-P4"
  },
  {
    id: "P5",
    family: "Category P (Pedestrian & Shared Paths)",
    category: "P5",
    displayName: "Category P5 — Minor Parkland Trails & Rural Footpaths",
    subTitle: "Low pedestrian volume rural trails and environmental reserves",
    maintainedIlluminanceLux: 0.45,
    minimumIlluminanceLux: 0.09,
    uniformityRequirement: "U_o ≤ 10 (E_avg / E_min)",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 4.0,
    typicalSpacingRangeM: "44m – 52m",
    recommendedOptics: "Type 2 Pathway",
    cctGuideline: "3000K (Fauna & Ecological Standard)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.1",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Used in low-density rural or environmentally sensitive reserves where low light pollution is mandatory.",
    sourceId: "AS1158-3-1-P5"
  },

  // -------------------------------------------------------------
  // Category PR: Dedicated Cycleways & Commuter Paths (AS/NZS 1158.3.1)
  // -------------------------------------------------------------
  {
    id: "PR1",
    family: "Category PR (Dedicated Cycleways)",
    category: "PR1",
    displayName: "Category PR1 — High Volume Commuter Cycle Expressways",
    subTitle: "Separated high-speed bicycle thoroughfares in urban corridors",
    maintainedIlluminanceLux: 7.0,
    minimumIlluminanceLux: 1.4,
    uniformityRequirement: "U_o ≤ 10",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 6.0,
    typicalSpacingRangeM: "18m – 22m",
    recommendedOptics: "Type 2 Asymmetric Cycleway",
    cctGuideline: "3000K – 4000K",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.2",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "High-speed segregated cycle corridors with high cyclist volume.",
    sourceId: "AS1158-3-1-PR1"
  },
  {
    id: "PR2",
    family: "Category PR (Dedicated Cycleways)",
    category: "PR2",
    displayName: "Category PR2 — Moderate-High Volume Cycleways",
    subTitle: "Dedicated arterial cycle paths and commuter routes",
    maintainedIlluminanceLux: 3.5,
    minimumIlluminanceLux: 0.7,
    uniformityRequirement: "U_o ≤ 10",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 5.0,
    typicalSpacingRangeM: "24m – 28m",
    recommendedOptics: "Type 2 Asymmetric Cycleway",
    cctGuideline: "3000K (Fauna & Cyclist Safety)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.2",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Standard for dedicated cycle tracks with steady two-way bike traffic.",
    sourceId: "AS1158-3-1-PR2"
  },
  {
    id: "PR3",
    family: "Category PR (Dedicated Cycleways)",
    category: "PR3",
    displayName: "Category PR3 — Suburban Commuter Cycle Paths",
    subTitle: "Separated suburban bike links and regional rail trails",
    maintainedIlluminanceLux: 1.75,
    minimumIlluminanceLux: 0.35,
    uniformityRequirement: "U_o ≤ 10",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 4.5,
    typicalSpacingRangeM: "30m – 36m",
    recommendedOptics: "Type 2 Asymmetric",
    cctGuideline: "3000K (Fauna Friendly)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.2",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Medium activity suburban cycleways.",
    sourceId: "AS1158-3-1-PR3"
  },
  {
    id: "PR4",
    family: "Category PR (Dedicated Cycleways)",
    category: "PR4",
    displayName: "Category PR4 — Minor / Recreational Cycle Paths",
    subTitle: "Off-road recreational bike paths in outer suburbs and reserves",
    maintainedIlluminanceLux: 0.85,
    minimumIlluminanceLux: 0.17,
    uniformityRequirement: "U_o ≤ 10",
    maxUniformityRatio: 10,
    typicalMountingHeightM: 4.5,
    typicalSpacingRangeM: "38m – 45m",
    recommendedOptics: "Type 2 Long Throw",
    cctGuideline: "3000K (Fauna Protection)",
    standardReference: "AS/NZS 1158.3.1:2020",
    standardVersion: "AS/NZS 1158.3.1:2020 Table 2.2",
    effectiveDate: "2020-11-20",
    datasetRevision: "2026.1",
    notes: "Low cyclist density off-road trails.",
    sourceId: "AS1158-3-1-PR4"
  },

  // -------------------------------------------------------------
  // Category V: Vehicular Roadways (AS/NZS 1158.1.1:2022)
  // -------------------------------------------------------------
  {
    id: "V3",
    family: "Category V (Vehicular Roadways)",
    category: "V3",
    displayName: "Category V3 — Arterial Roads & Industrial Corridors",
    subTitle: "Sub-arterial roads, industrial park connectors, bus routes",
    maintainedIlluminanceLux: 10.0,
    minimumIlluminanceLux: 2.0,
    uniformityRequirement: "U_o ≥ 0.33 (Luminance ratio)",
    maxUniformityRatio: 3,
    typicalMountingHeightM: 8.0,
    typicalSpacingRangeM: "32m – 40m",
    recommendedOptics: "Type 3 Medium Street Side",
    cctGuideline: "4000K (Road Safety Standard)",
    standardReference: "AS/NZS 1158.1.1:2022",
    standardVersion: "AS/NZS 1158.1.1:2022 Table 2.1",
    effectiveDate: "2022-06-30",
    datasetRevision: "2026.1",
    notes: "Requires formal Dialux / AGi32 luminance (cd/m²) calculation to certify roadway compliance.",
    sourceId: "AS1158-1-1-V3"
  },
  {
    id: "V5",
    family: "Category V (Vehicular Roadways)",
    category: "V5",
    displayName: "Category V5 — Commercial Access Roads & Heavy Vehicle Yards",
    subTitle: "Freight depot accessways, service station entries, commercial driveways",
    maintainedIlluminanceLux: 6.0,
    minimumIlluminanceLux: 1.2,
    uniformityRequirement: "U_o ≥ 0.30",
    maxUniformityRatio: 3.3,
    typicalMountingHeightM: 7.0,
    typicalSpacingRangeM: "35m – 42m",
    recommendedOptics: "Type 3 Roadway",
    cctGuideline: "4000K (Commercial)",
    standardReference: "AS/NZS 1158.1.1:2022",
    standardVersion: "AS/NZS 1158.1.1:2022 Table 2.1",
    effectiveDate: "2022-06-30",
    datasetRevision: "2026.1",
    notes: "Standard commercial road category.",
    sourceId: "AS1158-1-1-V5"
  }
];

/**
 * Retrieve lighting standard category by canonical ID (e.g. "P4", "PR2", "V3")
 */
export function getLightingCategory(idOrCode: string): LightingStandardCategory | undefined {
  if (!idOrCode) return undefined;
  const clean = idOrCode.trim().toUpperCase().replace(/^CATEGORY\s+/i, "").replace(/^CAT\s+/i, "");
  return LIGHTING_STANDARDS_CATEGORIES.find(
    (c) => c.id.toUpperCase() === clean || c.category.toUpperCase() === clean
  );
}

/**
 * Return all supported lighting categories
 */
export function getAllLightingCategories(): LightingStandardCategory[] {
  return LIGHTING_STANDARDS_CATEGORIES;
}

/**
 * Return human-readable standards provenance string for citations, badges, and export metadata
 */
export function getCategoryProvenanceString(categoryId: string): string {
  const cat = getLightingCategory(categoryId);
  if (!cat) return `AS/NZS 1158 (Dataset Rev ${DATASET_METADATA.revision})`;
  return `${cat.displayName} | Target: ${cat.maintainedIlluminanceLux} lx avg (${cat.minimumIlluminanceLux} lx min point) | Ref: ${cat.standardReference} (Rev ${cat.datasetRevision})`;
}
