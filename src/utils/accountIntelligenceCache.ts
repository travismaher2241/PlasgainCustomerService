/**
 * Account Intelligence Cache (P2-03)
 *
 * Keys account intelligence by a deterministic hash of all relevant source state:
 * - accountId
 * - account.updatedAt / lastInteraction
 * - latestContactUpdatedAt
 * - latestOpportunityUpdatedAt
 * - latestActivityUpdatedAt
 * - schemaVersion
 *
 * Any change to contacts, opportunities, activities, or account details invalidates the cache.
 */

export interface CachedAccountIntelligence {
  key: string;
  accountId: string;
  sourceHash: string;
  cachedAt: number;
  summary: any;
}

const STORAGE_KEY = "plasgain_account_intelligence_cache_v2";

export function generateAccountSourceHash(account: {
  id: string;
  updatedAt?: string;
  lastInteraction?: string;
  contacts?: Array<{ updatedAt?: string; id?: string }>;
  opportunities?: Array<{ updatedAt?: string; stage?: string; estimatedValue?: number }>;
  activities?: Array<{ timestamp?: string; id?: string }>;
}): string {
  const accountUpdated = account.updatedAt || account.lastInteraction || "v1";
  const contactStamp = account.contacts?.map((c) => c.updatedAt || c.id).sort().join(",") || "";
  const oppStamp = account.opportunities?.map((o) => `${o.updatedAt}_${o.stage}_${o.estimatedValue}`).sort().join(",") || "";
  const activityStamp = account.activities?.map((a) => a.timestamp || a.id).sort().slice(0, 10).join(",") || "";

  return `${account.id}|acc:${accountUpdated}|cnt:${contactStamp}|opp:${oppStamp}|act:${activityStamp}|schema:v2`;
}

class AccountIntelligenceCache {
  private cache: Map<string, CachedAccountIntelligence> = new Map();

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
            parsed.forEach((item: CachedAccountIntelligence) => this.cache.set(item.accountId, item));
          }
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const items = Array.from(this.cache.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // Storage error
    }
  }

  public get(
    accountOrId: string | {
      id: string;
      updatedAt?: string;
      lastInteraction?: string;
      contacts?: Array<{ updatedAt?: string; id?: string }>;
      opportunities?: Array<{ updatedAt?: string; stage?: string; estimatedValue?: number }>;
      activities?: Array<{ timestamp?: string; id?: string }>;
    },
    explicitSourceHash?: string
  ): CachedAccountIntelligence | null {
    const accId = typeof accountOrId === "string" ? accountOrId : accountOrId.id;
    const requiredHash = explicitSourceHash || (typeof accountOrId === "object" ? generateAccountSourceHash(accountOrId) : null);

    const cached = this.cache.get(accId);
    if (!cached) return null;

    if (!requiredHash || cached.sourceHash === requiredHash) {
      return cached;
    }

    // Out of date -> clear invalid entry
    this.cache.delete(accId);
    this.saveToStorage();
    return null;
  }

  public set(
    accountOrId: string | {
      id: string;
      updatedAt?: string;
      lastInteraction?: string;
      contacts?: Array<{ updatedAt?: string; id?: string }>;
      opportunities?: Array<{ updatedAt?: string; stage?: string; estimatedValue?: number }>;
      activities?: Array<{ timestamp?: string; id?: string }>;
    },
    sourceHashOrSummary: string | any,
    summaryData?: any
  ): CachedAccountIntelligence {
    const accId = typeof accountOrId === "string" ? accountOrId : accountOrId.id;
    const hash = typeof sourceHashOrSummary === "string"
      ? sourceHashOrSummary
      : (typeof accountOrId === "object" ? generateAccountSourceHash(accountOrId) : `manual-hash-${Date.now()}`);
    const summary = summaryData !== undefined ? summaryData : sourceHashOrSummary;

    const record: CachedAccountIntelligence = {
      key: accId,
      accountId: accId,
      sourceHash: hash,
      cachedAt: Date.now(),
      summary
    };
    this.cache.set(accId, record);
    this.saveToStorage();
    return record;
  }

  public invalidate(accountId: string) {
    this.cache.delete(accountId);
    this.saveToStorage();
  }

  public clear() {
    this.cache.clear();
    this.saveToStorage();
  }
}

export const accountIntelligenceCache = new AccountIntelligenceCache();
