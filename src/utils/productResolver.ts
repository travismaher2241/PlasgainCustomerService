/**
 * Canonical Product Resolution & Preflight Engine
 * 
 * Provides robust resolution from arbitrary CRM line items, drawing strings,
 * and ERP SKUs to verified PlasgainProduct specifications.
 */

import { PlasgainProduct } from "../types";
import { SAMPLE_PRODUCTS } from "../data/mockData";

export interface ProductResolutionItem {
  id: string;
  rawInput: string;
  status: "EXACT_MATCH" | "ALIAS_MATCH" | "MANUALLY_MAPPED" | "UNMATCHED";
  confidence: number; // 0 to 1
  product?: PlasgainProduct;
  suggestedMatches: PlasgainProduct[];
  userMappedProductId?: string;
}

export interface PackagePreflightResult {
  totalItems: number;
  matchedCount: number;
  unmatchedCount: number;
  allResolved: boolean;
  items: ProductResolutionItem[];
  resolvedProducts: PlasgainProduct[];
}

/**
 * Approved Product Alias & SKU Mapping Table
 */
const APPROVED_PRODUCT_ALIASES: Array<{
  pattern: RegExp;
  productId: string;
  confidence: number;
}> = [
  // Intense Series
  { pattern: /intense.*50w|50w.*intense|intense-50w|50w-intense/i, productId: "prod-intense-50w", confidence: 0.98 },
  { pattern: /intense/i, productId: "prod-intense-50w", confidence: 0.90 },

  // Pro Blade Series
  { pattern: /pro.*blade.*125|pbs-125|problade-125w/i, productId: "prod-pro-blade", confidence: 0.98 },
  { pattern: /pro.*blade.*75|pbs-75|problade-75w|pb-75w/i, productId: "prod-pro-blade", confidence: 0.98 },
  { pattern: /pro.*blade|problade|pb-100w|pb-50w/i, productId: "prod-pro-blade", confidence: 0.95 },

  // Superlux Series
  { pattern: /superlux.*120|sl-120/i, productId: "prod-superlux", confidence: 0.98 },
  { pattern: /superlux.*60|sl-60|superlux-60w/i, productId: "prod-superlux", confidence: 0.98 },
  { pattern: /superlux.*30|sl-30/i, productId: "prod-superlux", confidence: 0.98 },
  { pattern: /superlux/i, productId: "prod-superlux", confidence: 0.92 },

  // enLighten Zorro 2 Series
  { pattern: /zorro.*60|ez-60w/i, productId: "prod-enlighten-zorro-2", confidence: 0.98 },
  { pattern: /zorro.*30|ez-30w/i, productId: "prod-enlighten-zorro-2", confidence: 0.98 },
  { pattern: /zorro.*15|ez-15w|ez-15w-3k/i, productId: "prod-enlighten-zorro-2", confidence: 0.98 },
  { pattern: /zorro|enlighten/i, productId: "prod-enlighten-zorro-2", confidence: 0.92 },

  // Roadway V-LED
  { pattern: /roadway.*v-?led|vled|roadway-vled/i, productId: "prod-roadway-vled-70w", confidence: 0.98 },

  // Sonaray Solar Blade
  { pattern: /sonaray|solar.*blade/i, productId: "prod-solar-blade-sonaray", confidence: 0.95 },

  // Polymeric Cable Cover (AS 4702)
  { pattern: /polymeric.*cable|cable.*cover|as.*4702|pcc-150|pcc-300|cc-poly/i, productId: "prod-cable-cover", confidence: 0.98 },

  // Plaspole Composite Poles
  { pattern: /plaspole|composite.*pole|recycled.*pole|plaspole-4\.5m|plaspole-6m|plaspole-8m/i, productId: "prod-plaspole", confidence: 0.98 },

  // Rag-bolt / Steel Poles
  { pattern: /rag-?bolt|baseplate|galv-pole|steel.*pole|rag-m24|rag-m20/i, productId: "prod-rag-bolt", confidence: 0.92 }
];

/**
 * Resolves a single raw input string or object into a ProductResolutionItem.
 */
export function resolveSingleProduct(
  rawInput: string | any,
  catalogue: PlasgainProduct[] = SAMPLE_PRODUCTS
): ProductResolutionItem {
  let searchStr = "";
  if (typeof rawInput === "string") {
    searchStr = rawInput.trim();
  } else if (rawInput && typeof rawInput === "object") {
    searchStr = `${rawInput.productCode || rawInput.itemCode || rawInput.code || ""} ${rawInput.productName || rawInput.itemDescription || rawInput.description || rawInput.name || ""}`.trim();
  }

  const id = `item-${Math.random().toString(36).substring(2, 9)}`;
  const productList = Array.isArray(catalogue) ? catalogue : [];

  if (!searchStr || productList.length === 0) {
    return {
      id,
      rawInput: searchStr || "",
      status: "UNMATCHED",
      confidence: 0,
      suggestedMatches: productList.slice(0, 3)
    };
  }

  const cleanLower = searchStr.toLowerCase();

  // Tier 1: Exact code or exact name match
  const exact = productList.find(
    (p) =>
      p.code?.toLowerCase() === cleanLower ||
      p.name?.toLowerCase() === cleanLower ||
      p.id?.toLowerCase() === cleanLower
  );
  if (exact) {
    return {
      id,
      rawInput: searchStr,
      status: "EXACT_MATCH",
      confidence: 1.0,
      product: exact,
      suggestedMatches: []
    };
  }

  // Tier 2: Full canonical product name or full product code contained in longer drawing text.
  const codeVariants = (code: string): string[] =>
    (code || "")
      .toLowerCase()
      .split(/[/,]| or /)
      .map((c) => c.replace(/\(.*?\)/g, "").trim())
      .filter((c) => c.length >= 4);

  const partial = productList.find(
    (p) =>
      codeVariants(p.code).some((variant) => cleanLower.includes(variant)) ||
      (p.name && p.name.length >= 6 && cleanLower.includes(p.name.toLowerCase()))
  );
  if (partial) {
    return {
      id,
      rawInput: searchStr,
      status: "EXACT_MATCH",
      confidence: 0.95,
      product: partial,
      suggestedMatches: []
    };
  }

  // Tier 3: Alias / Regex match
  const aliasMatch = APPROVED_PRODUCT_ALIASES.find((a) => a.pattern.test(searchStr));
  if (aliasMatch) {
    const matchedProduct = productList.find((p) => p.id === aliasMatch.productId);
    if (matchedProduct) {
      return {
        id,
        rawInput: searchStr,
        status: "ALIAS_MATCH",
        confidence: aliasMatch.confidence,
        product: matchedProduct,
        suggestedMatches: []
      };
    }
  }

  // Tier 4: Fuzzy / Substring fallback suggestion
  const suggestions = productList.filter((p) => {
    const pTerms = `${p.name || ""} ${p.code || ""} ${p.category || ""}`.toLowerCase();
    const queryParts = cleanLower.split(/\s+/).filter((part) => part.length >= 3);
    return queryParts.some((part) => pTerms.includes(part));
  });

  return {
    id,
    rawInput: searchStr,
    status: "UNMATCHED",
    confidence: 0,
    suggestedMatches: suggestions.slice(0, 3)
  };
}

/**
 * Preflights an entire package of products (e.g., from CRM or Take-off).
 */
export function preflightProductPackage(
  inputs: Array<string | any>,
  catalogue: PlasgainProduct[] = SAMPLE_PRODUCTS,
  manualMappings: Record<string, string> = {}
): PackagePreflightResult {
  const productList = Array.isArray(catalogue) ? catalogue : [];

  if (!inputs || inputs.length === 0) {
    return {
      totalItems: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      allResolved: true,
      items: [],
      resolvedProducts: []
    };
  }

  const items: ProductResolutionItem[] = [];
  const resolvedProductsMap = new Map<string, PlasgainProduct>();

  for (const raw of inputs) {
    const item = resolveSingleProduct(raw, productList);

    // Apply manual override if rep mapped it
    if (manualMappings[item.rawInput]) {
      const mappedId = manualMappings[item.rawInput];
      const mappedProduct = productList.find((p) => p.id === mappedId || p.code === mappedId);
      if (mappedProduct) {
        item.status = "MANUALLY_MAPPED";
        item.confidence = 1.0;
        item.product = mappedProduct;
        item.userMappedProductId = mappedProduct.id;
      }
    }

    items.push(item);
    if (item.product && !resolvedProductsMap.has(item.product.id)) {
      resolvedProductsMap.set(item.product.id, item.product);
    }
  }

  const matchedCount = items.filter((i) => i.product !== undefined).length;
  const unmatchedCount = items.length - matchedCount;

  return {
    totalItems: items.length,
    matchedCount,
    unmatchedCount,
    allResolved: unmatchedCount === 0 && items.length > 0,
    items,
    resolvedProducts: Array.from(resolvedProductsMap.values())
  };
}
