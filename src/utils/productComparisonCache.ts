/**
 * Product Comparison Cache (P2-04)
 *
 * Implements symmetric product comparison caching:
 * - [Product A, Product B] produces the same cache key as [Product B, Product A]
 * - Incorporates canonical product IDs, requirements hash, standards dataset version, and catalogue version
 * - Automatic invalidation if product specs, catalogue revisions, or requirements change
 */

export interface ProductComparisonRecord {
  productIds: string[];
  standardsVersion: string;
  catalogueVersion: string;
  comparedAt: number;
  comparisonMatrix: {
    luminaireOutput?: Record<string, string>;
    windRating?: Record<string, string>;
    batteryReserve?: Record<string, string>;
    mountingHeight?: Record<string, string>;
    warranty?: Record<string, string>;
    [key: string]: Record<string, string> | undefined;
  };
  tradeOffsSummary: string;
}

export interface CachedProductComparison {
  key: string;
  symmetricProductKey: string;
  requirementsHash: string;
  catalogueVersion: string;
  standardsVersion: string;
  cachedAt: string;
  comparisonResult: ProductComparisonRecord;
}

const STORAGE_KEY = "plasgain_product_comparison_cache_v2";

export function generateSymmetricComparisonKey(
  productIds: string[],
  requirements: string = "",
  standardsVersion: string = "2026.1",
  catalogueVersion: string = "v4.2"
): string {
  const sortedIds = [...productIds].map((id) => id.trim().toLowerCase()).sort().join("<->");
  const normalizedReqs = requirements.trim().toLowerCase().replace(/\s+/g, " ");
  return `sym:${sortedIds}|req:${normalizedReqs}|std:${standardsVersion}|cat:${catalogueVersion}`;
}

class ProductComparisonCache {
  private cache: Map<string, CachedProductComparison> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: CachedProductComparison) => this.cache.set(item.key, item));
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const items = Array.from(this.cache.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // Ignore
    }
  }

  public get(
    productIds: string[],
    requirements: string = "",
    standardsVersion: string = "2026.1",
    catalogueVersion: string = "v4.2"
  ): ProductComparisonRecord | null {
    if (!productIds || productIds.length < 2) return null;
    const key = generateSymmetricComparisonKey(productIds, requirements, standardsVersion, catalogueVersion);
    const item = this.cache.get(key);
    return item ? item.comparisonResult : null;
  }

  public set(
    productIds: string[],
    comparisonResult: ProductComparisonRecord,
    requirements: string = "",
    standardsVersion: string = "2026.1",
    catalogueVersion: string = "v4.2"
  ): CachedProductComparison {
    const key = generateSymmetricComparisonKey(productIds, requirements, standardsVersion, catalogueVersion);
    const record: CachedProductComparison = {
      key,
      symmetricProductKey: [...productIds].sort().join("<->"),
      requirementsHash: requirements.trim().toLowerCase(),
      catalogueVersion,
      standardsVersion,
      cachedAt: new Date().toISOString(),
      comparisonResult
    };
    this.cache.set(key, record);
    this.saveToStorage();
    return record;
  }

  public clear() {
    this.cache.clear();
    this.saveToStorage();
  }
}

export const productComparisonCache = new ProductComparisonCache();
