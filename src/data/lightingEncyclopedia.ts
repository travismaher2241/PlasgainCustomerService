export interface LightingTermExplanation {
  term: string;
  category: "Solar & Battery" | "Lighting Standards" | "Photometry & Optics" | "Electrical & Mechanical" | "Commercial & Rebates";
  plainEnglish: string;
  whyItMattersInSales: string;
  howToExplainToCustomer: string;
  practicalExample: string;
  commonMistakesToAvoid: string;
  relatedPlasgainProducts: string[];
  australianStandardRef?: string;
}

export const COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA: Record<string, LightingTermExplanation> = {};

export function lookupLightingTerm(query: string): LightingTermExplanation | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  if (COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA[q]) {
    return COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA[q];
  }
  return Object.values(COMPREHENSIVE_LIGHTING_ENCYCLOPEDIA).find(
    (item) => item.term.toLowerCase().includes(q) || q.includes(item.term.toLowerCase())
  );
}
