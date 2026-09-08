import fs from "fs";
import path from "path";
import { CRMOpportunity } from "../types/crm";
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

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const OPPORTUNITIES_FILE = path.join(DATA_DIR, "opportunities.json");

const isTestEnv = (): boolean =>
  process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

export class OpportunityStore {
  private opportunities: Map<string, StoredOpportunity> = new Map();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    if (isTestEnv()) {
      this.isInitialized = true;
      return;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(OPPORTUNITIES_FILE)) {
        const raw = fs.readFileSync(OPPORTUNITIES_FILE, "utf-8");
        const list: StoredOpportunity[] = JSON.parse(raw);
        list.forEach((opp) => {
          if (opp && opp.id) {
            this.opportunities.set(opp.id, {
              ...opp,
              version: opp.version || 1,
              createdAt: opp.createdAt || new Date().toISOString(),
              updatedAt: opp.updatedAt || new Date().toISOString(),
              isArchived: Boolean(opp.isArchived)
            });
          }
        });
      } else {
        this.save();
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("[OpportunityStore] Failed to initialize from disk, using memory store:", err);
      this.isInitialized = true;
    }
  }

  private save() {
    if (isTestEnv()) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.opportunities.values());
      fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("[OpportunityStore] Failed to save opportunities to disk:", err);
    }
  }

  public getById(id: string): StoredOpportunity | null {
    this.init();
    return this.opportunities.get(id) || null;
  }

  public list(query: OpportunityQueryInput): { data: StoredOpportunity[]; total: number; page: number; limit: number; totalPages: number } {
    this.init();
    let records = Array.from(this.opportunities.values());

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

  public create(data: CreateOpportunityInput, creator: { userId: string; name: string }): StoredOpportunity {
    this.init();
    const id = `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: StoredOpportunity = {
      ...data,
      id,
      version: 1,
      isArchived: false,
      opportunityOwner: data.opportunityOwner || creator.name,
      assignedTo: data.assignedTo || creator.name,
      createdAt: now,
      updatedAt: now
    };

    this.opportunities.set(id, record);
    this.save();
    return record;
  }

  public update(
    id: string,
    updates: UpdateOpportunityInput,
    expectedVersion?: number,
    expectedUpdatedAt?: string
  ): { updated: StoredOpportunity; previous: StoredOpportunity } {
    this.init();
    const existing = this.opportunities.get(id);
    if (!existing) {
      throw new Error(`Opportunity with ID "${id}" not found.`);
    }

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
    const previous = { ...existing };
    const now = new Date().toISOString();
    const { version: _ignoredVersion, updatedAt: _ignoredUpdatedAt, ...cleanUpdates } = updates;

    const updated: StoredOpportunity = {
      ...existing,
      ...cleanUpdates,
      version: existing.version + 1,
      updatedAt: now
    };

    this.opportunities.set(id, updated);
    this.save();
    return { updated, previous };
  }

  public softDelete(
    id: string,
    reason: string = "Deleted by user",
    user: { userId: string; name: string }
  ): StoredOpportunity {
    this.init();
    const existing = this.opportunities.get(id);
    if (!existing) {
      throw new Error(`Opportunity with ID "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updated: StoredOpportunity = {
      ...existing,
      isArchived: true,
      archivedAt: now,
      archivedBy: user.userId,
      archivedReason: reason,
      version: existing.version + 1,
      updatedAt: now
    };

    this.opportunities.set(id, updated);
    this.save();
    return updated;
  }

  public clearForTesting() {
    this.opportunities.clear();
  }
}

export const opportunityStore = new OpportunityStore();
