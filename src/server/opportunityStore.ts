import { CRMOpportunity } from "../types/crm";
import { createDocBackend, DocBackend } from "./docStore";
import { CreateOpportunityInput, UpdateOpportunityInput, OpportunityQueryInput } from "../validators/opportunityValidator";

export class ConcurrencyConflictError extends Error {
  public readonly currentVersion: number;
  public readonly providedVersion?: number;
  public readonly currentUpdatedAt: string;

  constructor(message: string, currentVersion: number, currentUpdatedAt: string, providedVersion?: number) {
    super(message);
    this.name = "ConcurrencyConflictError";
    this.currentVersion = currentVersion;
    this.currentUpdatedAt = currentUpdatedAt;
    this.providedVersion = providedVersion;
  }
}

export interface StoredOpportunity extends CRMOpportunity {
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Quotes and deals.
 *
 * Backed by Firestore through the Admin SDK when credentials are configured,
 * and by a local JSON file otherwise. This previously wrote only to a file
 * which, on a serverless host, lived in /tmp — wiped on every deployment and
 * separate for each instance, so a quote one rep saved could be invisible to
 * another and then disappear entirely.
 *
 * Reads go to the backing store rather than an in-memory cache. Caching would
 * be faster, but two instances holding separate caches diverge the moment
 * either writes, and showing two reps different pipelines is worse than a
 * brief pause on read.
 */
/**
 * Deliberately NOT "opportunities". That collection is still read and written
 * directly by the browser through AppContext's legacy sync, using an older
 * `Opportunity` shape. Pointing this store at the same collection would mix two
 * record types in one place and let a stale tab overwrite a server-managed
 * quote. The REST-backed deals the CRM actually shows live here.
 */
const COLLECTION = "crm_deals";

export class OpportunityStore {
  private backend: DocBackend<StoredOpportunity> | null = null;

  private getBackend(): DocBackend<StoredOpportunity> {
    if (!this.backend) {
      this.backend = createDocBackend<StoredOpportunity>(COLLECTION, "opportunities.json");
    }
    return this.backend;
  }

  /** Normalises records written before this store enforced its own shape. */
  private normalise(opp: StoredOpportunity): StoredOpportunity {
    return {
      ...opp,
      version: opp.version || 1,
      createdAt: opp.createdAt || new Date().toISOString(),
      updatedAt: opp.updatedAt || new Date().toISOString(),
      isArchived: Boolean(opp.isArchived)
    };
  }

  public async getById(id: string): Promise<StoredOpportunity | null> {
    const found = await this.getBackend().get(id);
    return found ? this.normalise(found) : null;
  }

  /**
   * Every stored quote, unpaged. For server-side sweeps that must consider the
   * whole book rather than a page of it — `list()` is the paginated read for
   * callers with a query.
   */
  public async getAll(): Promise<StoredOpportunity[]> {
    const all = await this.getBackend().loadAll();
    return all.map((o) => this.normalise(o));
  }

  public async list(query: OpportunityQueryInput): Promise<{ data: StoredOpportunity[]; total: number; page: number; limit: number; totalPages: number }> {
    let records = await this.getAll();

    // 1. Archival Filter
    if (!query.isArchived) {
      records = records.filter((r) => !r.isArchived);
    } else {
      records = records.filter((r) => r.isArchived === true);
    }

    // 2. Account Filter
    if (query.accountId) {
      records = records.filter((r) => r.accountId === query.accountId);
    }

    // 3. Pipeline Filter
    if (query.pipelineId) {
      records = records.filter((r) => r.pipelineId === query.pipelineId);
    }

    // 4. Stage Filter
    if (query.stageId) {
      records = records.filter((r) => r.stageId === query.stageId);
    }

    // 5. Search Filter (name, accountName, quoteNumber, location)
    if (query.search) {
      const s = query.search.toLowerCase().trim();
      records = records.filter((r) =>
        r.name.toLowerCase().includes(s) ||
        (r.accountName && r.accountName.toLowerCase().includes(s)) ||
        (r.quoteNumber && r.quoteNumber.toLowerCase().includes(s)) ||
        (r.location && r.location.toLowerCase().includes(s))
      );
    }

    // 6. Sorting
    records.sort((a, b) => {
      let aVal = (a as any)[query.sortBy];
      let bVal = (b as any)[query.sortBy];

      if (query.sortBy === "createdAt" || query.sortBy === "updatedAt" || query.sortBy === "expectedCloseDate") {
        const aTime = aVal ? new Date(aVal).getTime() : 0;
        const bTime = bVal ? new Date(bVal).getTime() : 0;
        return query.sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return query.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal || "").toLowerCase();
      const strB = String(bVal || "").toLowerCase();
      return query.sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    const total = records.length;
    const page = query.page;
    const limit = query.limit;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const data = records.slice(startIndex, startIndex + limit);

    return { data, total, page, limit, totalPages };
  }

  public async create(data: CreateOpportunityInput, creator: { userId: string; name: string }): Promise<StoredOpportunity> {

    // A caller may supply the id of a quote that already exists elsewhere (the
    // one-time migration of records created before this store existed). Honour
    // it so referencing records keep pointing at the right quote, and return
    // the existing record rather than a duplicate if it is already here — the
    // migration must be safe to run more than once, from more than one browser.
    const suppliedId = data.id?.trim();
    if (suppliedId) {
      const existing = await this.getById(suppliedId);
      if (existing) return existing;
    }

    const id = suppliedId || `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: StoredOpportunity = {
      ...data,
      id,
      version: 1,
      isArchived: false,
      // accountName is optional on the create payload but required on the
      // record, so it is resolved here rather than leaving the stored shape
      // disagreeing with its own type. (Both sides of the merge added this
      // line; the duplicate key silently made the later "" win over "Account".)
      accountName: data.accountName || "Account",
      opportunityOwner: data.opportunityOwner || creator.name,
      assignedTo: data.assignedTo || creator.name,
      createdAt: now,
      updatedAt: now
    } as StoredOpportunity;

    await this.getBackend().put(id, record);
    return record;
  }

  public async update(
    id: string,
    updates: UpdateOpportunityInput,
    expectedVersion?: number,
    expectedUpdatedAt?: string
  ): Promise<{ updated: StoredOpportunity; previous: StoredOpportunity }> {
    let previous: StoredOpportunity | null = null;

    // The version check and the write happen inside one transaction, so two
    // reps saving the same quote cannot both pass the check and have the later
    // write silently discard the earlier edit.
    const updated = await this.getBackend().mutate(id, (raw) => {
      if (!raw) {
        throw new Error(`Opportunity with ID "${id}" not found.`);
      }
      const existing = this.normalise(raw);
    // Optimistic Concurrency Control
    if (expectedVersion !== undefined && expectedVersion !== null) {
      if (existing.version !== expectedVersion) {
        throw new ConcurrencyConflictError(
          `Conflict: Opportunity "${existing.name}" has been modified concurrently (current version: ${existing.version}, provided version: ${expectedVersion}). Please reload before submitting updates.`,
          existing.version,
          existing.updatedAt,
          expectedVersion
        );
      }
    } else if (expectedUpdatedAt) {
      const existingTime = new Date(existing.updatedAt).getTime();
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      if (Math.abs(existingTime - expectedTime) > 1000) {
        throw new ConcurrencyConflictError(
          `Conflict: Opportunity "${existing.name}" has been updated since your last read. Please reload before saving.`,
          existing.version,
          existing.updatedAt
        );
      }
    }

      // Field-level update: preserves all existing fields and only overlays validated changes
      previous = { ...existing };
      const now = new Date().toISOString();
      const { version: _ignoredVersion, updatedAt: _ignoredUpdatedAt, ...cleanUpdates } = updates;

      return {
        ...existing,
        ...cleanUpdates,
        version: existing.version + 1,
        updatedAt: now
      } as StoredOpportunity;
    });

    return { updated, previous: previous as unknown as StoredOpportunity };
  }

  public async softDelete(
    id: string,
    reason: string = "Deleted by user",
    user: { userId: string; name: string }
  ): Promise<StoredOpportunity> {
    return this.getBackend().mutate(id, (raw) => {
      if (!raw) {
        throw new Error(`Opportunity with ID "${id}" not found.`);
      }
      const existing = this.normalise(raw);
      const now = new Date().toISOString();
      return {
        ...existing,
        isArchived: true,
        archivedAt: now,
        archivedBy: user.userId,
        archivedReason: reason,
        version: existing.version + 1,
        updatedAt: now
      };
    });
  }

  public async clearForTesting() {
    const all = await this.getBackend().loadAll();
    for (const opp of all) {
      await this.getBackend().remove(opp.id);
    }
  }
}

export const opportunityStore = new OpportunityStore();
