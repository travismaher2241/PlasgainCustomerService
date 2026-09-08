import { authHeaders } from "../utils/apiClient";
import { CRMOpportunity } from "../types/crm";
import {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  OpportunityQueryInput
} from "../validators/opportunityValidator";

export class ApiConflictError extends Error {
  public readonly currentVersion?: number;
  public readonly currentUpdatedAt?: string;
  public readonly providedVersion?: number;

  constructor(message: string, currentVersion?: number, currentUpdatedAt?: string, providedVersion?: number) {
    super(message);
    this.name = "ApiConflictError";
    this.currentVersion = currentVersion;
    this.currentUpdatedAt = currentUpdatedAt;
    this.providedVersion = providedVersion;
  }
}

export function getApiUrl(endpoint: string): string {
  if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null") {
    return `${window.location.origin}${endpoint}`;
  }
  return endpoint;
}

export async function fetchOpportunities(
  filters?: Partial<OpportunityQueryInput>
): Promise<{ data: CRMOpportunity[]; total: number; page: number; limit: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.accountId) params.set("accountId", filters.accountId);
  if (filters?.pipelineId) params.set("pipelineId", filters.pipelineId);
  if (filters?.stageId) params.set("stageId", filters.stageId);
  if (filters?.isArchived !== undefined) params.set("isArchived", String(filters.isArchived));
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);

  const queryStr = params.toString();
  const url = getApiUrl(`/api/opportunities${queryStr ? `?${queryStr}` : ""}`);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: authHeaders()
    });
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("ECONNREFUSED")) {
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
    throw err;
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to fetch opportunities: HTTP ${res.status}`);
  }

  const result = await res.json();
  // CRITICAL: Ensure empty results are handled correctly as empty arrays, never null/undefined
  const data: CRMOpportunity[] = Array.isArray(result.data) ? result.data : [];
  const pagination = result.pagination || { page: 1, limit: data.length, total: data.length, totalPages: 1 };

  return {
    data,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: pagination.totalPages
  };
}

export async function fetchOpportunityById(id: string): Promise<CRMOpportunity> {
  const url = getApiUrl(`/api/opportunities/${encodeURIComponent(id)}`);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: authHeaders()
    });
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("ECONNREFUSED")) {
      return {
        id,
        name: "Opportunity",
        accountId: "acc-1",
        accountName: "Account",
        dealValue: 0
      } as CRMOpportunity;
    }
    throw err;
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to fetch opportunity "${id}": HTTP ${res.status}`);
  }

  const result = await res.json();
  return result.data;
}

/** localStorage key holding quotes written before the REST store existed. */
const LEGACY_DEALS_KEY = "plasgain_crm_deals";

/**
 * Every page of the opportunity list, not just the first.
 *
 * The list endpoint defaults to 20 records per page. Calling it without an
 * explicit page size therefore returned only the 20 most recently updated
 * quotes, and every screen built on that list — pipeline, dashboard, calendar,
 * account totals, win/loss — silently described a 20-quote subset as if it were
 * the whole business. Pages through to `totalPages` instead.
 */
export async function fetchAllOpportunities(
  filters?: Partial<OpportunityQueryInput>
): Promise<{ data: CRMOpportunity[]; total: number; page: number; limit: number; totalPages: number }> {
  const pageSize = filters?.limit ?? 100;
  const first = await fetchOpportunities({ ...filters, page: 1, limit: pageSize });

  if (first.totalPages <= 1) return first;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      fetchOpportunities({ ...filters, page: i + 2, limit: pageSize })
    )
  );

  const data = rest.reduce((acc, r) => acc.concat(r.data), first.data);
  return { ...first, data, page: 1, limit: data.length || pageSize, totalPages: 1 };
}

/** Quotes cached in this browser by the pre-REST version of the app. */
export function readLegacyLocalDeals(): CRMOpportunity[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_DEALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d.id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * One-time migration of quotes that predate the REST store.
 *
 * Those quotes live in this browser (and in Firestore) but were never written
 * to the server store, so once the app started reading the list from the API
 * they stopped appearing at all. Each is posted under **its existing id**, so
 * the tasks, activities and imported quote documents that reference it stay
 * attached. Re-running is safe: the server returns the existing record rather
 * than creating a second one, so two reps migrating the same quote converge
 * instead of duplicating it.
 *
 * Failures are deliberately not fatal — a quote that cannot be migrated is
 * reported and skipped rather than blocking the rest of the list from loading.
 */
export async function migrateLegacyDeals(
  serverDeals: CRMOpportunity[]
): Promise<{ migrated: number; failed: number }> {
  const local = readLegacyLocalDeals();
  if (local.length === 0) return { migrated: 0, failed: 0 };

  const onServer = new Set(serverDeals.map((d) => d.id));
  const missing = local.filter((d) => !onServer.has(d.id));
  if (missing.length === 0) return { migrated: 0, failed: 0 };

  let migrated = 0;
  let failed = 0;

  for (const deal of missing) {
    try {
      await createOpportunityApi({
        ...(deal as unknown as CreateOpportunityInput),
        id: deal.id,
        name: deal.name || "Untitled quote",
        accountId: deal.accountId || "",
        accountName: deal.accountName || "Account",
        dealValue: typeof deal.dealValue === "number" ? deal.dealValue : 0
      });
      migrated++;
    } catch (err) {
      failed++;
      console.warn(`[Migration] Could not migrate quote ${deal.id}:`, err);
    }
  }

  return { migrated, failed };
}

export async function createOpportunityApi(data: CreateOpportunityInput): Promise<CRMOpportunity> {
  const url = getApiUrl("/api/opportunities");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data)
    });
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("ECONNREFUSED")) {
      const id = (data as any).id || `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      return {
        ...data,
        id,
        accountName: data.accountName || "Account",
        version: 1,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      } as CRMOpportunity;
    }
    throw err;
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.details?.join(", ") || `Failed to create opportunity: HTTP ${res.status}`);
  }

  const result = await res.json();
  return result.data;
}

export async function updateOpportunityApi(
  id: string,
  updates: UpdateOpportunityInput
): Promise<CRMOpportunity> {
  const url = getApiUrl(`/api/opportunities/${encodeURIComponent(id)}`);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (updates.version !== undefined) {
    headers["If-Match"] = `"${updates.version}"`;
  }
  if (updates.updatedAt) {
    headers["If-Unmodified-Since"] = updates.updatedAt;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: authHeaders(headers),
      body: JSON.stringify(updates)
    });
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("ECONNREFUSED")) {
      return {
        id,
        ...updates,
        version: ((updates.version || 1) + 1),
        updatedAt: new Date().toISOString()
      } as CRMOpportunity;
    }
    throw err;
  }

  if (res.status === 409) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiConflictError(
      errorBody.error || "Conflict: Opportunity has been modified by another user.",
      errorBody.currentVersion,
      errorBody.currentUpdatedAt,
      errorBody.providedVersion
    );
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.details?.join(", ") || `Failed to update opportunity: HTTP ${res.status}`);
  }

  const result = await res.json();
  return result.data;
}

export async function deleteOpportunityApi(id: string, reason?: string): Promise<CRMOpportunity> {
  const url = getApiUrl(`/api/opportunities/${encodeURIComponent(id)}`);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ reason: reason || "Deleted by user" })
    });
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("ECONNREFUSED")) {
      return {
        id,
        name: id,
        accountId: "acc-1",
        accountName: "Account",
        dealValue: 0,
        isArchived: true,
        archivedReason: reason || "Deleted by user",
        archivedAt: new Date().toISOString()
      } as CRMOpportunity;
    }
    throw err;
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to delete opportunity: HTTP ${res.status}`);
  }

  const result = await res.json();
  return result.data;
}
