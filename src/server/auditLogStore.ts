import { AuditLogRecord } from "../types/crm";
import { createDocBackend, DocBackend } from "./docStore";

/**
 * Server-Side Append-Only Audit Log Repository
 *
 * Persists verified audit records emitted by server-side actions or
 * client requests authenticated via verified server sessions.
 *
 * Backed by Firestore through the Admin SDK. The client rules deliberately say
 * `allow create: if false` on audit_logs — an audit trail a client can write is
 * not an audit trail — so this is the only path that can add to it.
 *
 * Previously this wrote a JSON file which, on a serverless host, lived in /tmp:
 * wiped on every deployment and not shared between the instances serving
 * concurrent users. An audit trail that disappears is worse than none, because
 * it is trusted.
 */

const RETAINED_RECORDS = 5000;

class AuditLogStore {
  private backend: DocBackend<AuditLogRecord> | null = null;

  private getBackend(): DocBackend<AuditLogRecord> {
    if (!this.backend) {
      this.backend = createDocBackend<AuditLogRecord>("audit_logs", "audit_logs.json");
    }
    return this.backend;
  }

  /** Newest first, matching the order the endpoint and UI expect. */
  private sortNewestFirst(records: AuditLogRecord[]): AuditLogRecord[] {
    return [...records].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  }

  public async append(record: AuditLogRecord): Promise<AuditLogRecord> {
    await this.getBackend().put(record.id, record);
    return record;
  }

  public async getAll(limit = 500): Promise<AuditLogRecord[]> {
    const all = await this.getBackend().loadAll();
    return this.sortNewestFirst(all).slice(0, Math.max(0, limit));
  }

  /**
   * Trims the oldest records beyond the retention ceiling. Kept separate from
   * append so a single write is one round trip rather than a read of the whole
   * collection; call it on a schedule or after bulk imports.
   */
  public async prune(): Promise<number> {
    const all = this.sortNewestFirst(await this.getBackend().loadAll());
    if (all.length <= RETAINED_RECORDS) return 0;
    const excess = all.slice(RETAINED_RECORDS);
    for (const record of excess) {
      await this.getBackend().remove(record.id);
    }
    return excess.length;
  }

  public async clearForTesting() {
    const all = await this.getBackend().loadAll();
    for (const record of all) {
      await this.getBackend().remove(record.id);
    }
  }
}

export const auditLogStore = new AuditLogStore();
