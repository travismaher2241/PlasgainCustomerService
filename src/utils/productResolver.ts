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
  { pattern: /zorro.*60|ez-60w/i, productId: "prod-zorro-2", confidence: 0.98 },
  { pattern: /zorro.*30|ez-30w/i, productId: "prod-zorro-2", confidence: 0.98 },
  { pattern: /zorro.*15|ez-15w|ez-15w-3k/i, productId: "prod-zorro-2", confidence: 0.98 },
  { pattern: /zorro|enlighten/i, productId: "prod-zorro-2", confidence: 0.92 },

  // Roadway V-LED
  { pattern: /roadway.*v-?led|vled|roadway-vled/i, productId: "prod-roadway-vled", confidence: 0.98 },

  // Sonaray Solar Blade
  { pattern: /sonaray|solar.*blade/i, productId: "prod-sonaray-blade", confidence: 0.95 },

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
export function resolveSingleProduct(rawInput: string | any): ProductResolutionItem {
  let searchStr = "";
  if (typeof rawInput === "string") {
    searchStr = rawInput.trim();
  } else if (rawInput && typeof rawInput === "object") {
    searchStr = `${rawInput.productCode || rawInput.itemCode || rawInput.code || ""} ${rawInput.productName || rawInput.itemDescription || rawInput.description || rawInput.name || ""}`.trim();
  }

  const id = `item-${Math.random().toString(36).substring(2, 9)}`;

  if (!searchStr) {
    return {
      id,
      rawInput: "",
      status: "UNMATCHED",
      confidence: 0,
      suggestedMatches: SAMPLE_PRODUCTS.slice(0, 3)
    };
  }

  const cleanLower = searchStr.toLowerCase();

  // Tier 1: Exact code or exact name match
  const exact = SAMPLE_PRODUCTS.find(
    (p) =>
      p.code.toLowerCase() === cleanLower ||
      p.name.toLowerCase() === cleanLower ||
      p.id.toLowerCase() === cleanLower
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

  // Tier 2: Substring or code token containment
  const partial = SAMPLE_PRODUCTS.find(
    (p) =>
      cleanLower.includes(p.code.toLowerCase()) ||
      cleanLower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(cleanLower)
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

  // Tier 3: Approved alias matching
  for (const alias of APPROVED_PRODUCT_ALIASES) {
    if (alias.pattern.test(searchStr)) {
      const prod = SAMPLE_PRODUCTS.find((p) => p.id === alias.productId);
      if (prod) {
        return {
          id,
          rawInput: searchStr,
          status: "ALIAS_MATCH",
          confidence: alias.confidence,
          product: prod,
          suggestedMatches: []
        };
      }
    }
  }

  // Tier 4: Unmatched - provide smart suggestions based on tokens
  const tokens = cleanLower.split(/[\s-_,]+/);
  const suggestions = SAMPLE_PRODUCTS.filter((p) => {
    const pStr = `${p.name} ${p.code} ${p.category}`.toLowerCase();
    return tokens.some((t) => t.length > 2 && pStr.includes(t));
  }).slice(0, 3);

  return {
    id,
    rawInput: searchStr,
    status: "UNMATCHED",
    confidence: 0,
    suggestedMatches: suggestions.length > 0 ? suggestions : SAMPLE_PRODUCTS.slice(0, 3)
  };
}

/**
 * Runs a preflight check on a collection of product lines/strings.
 */
export function preflightProductPackage(
  inputs: (string | any)[],
  manualMappings: Record<string, string> = {}
): PackagePreflightResult {
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
    const item = resolveSingleProduct(raw);

    // Apply manual override if rep mapped it
    if (manualMappings[item.rawInput]) {
      const mappedId = manualMappings[item.rawInput];
      const mappedProduct = SAMPLE_PRODUCTS.find((p) => p.id === mappedId || p.code === mappedId);
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
    allResolved: unmatchedCount === 0,
    items,
    resolvedProducts: Array.from(resolvedProductsMap.values())
  };
}
