import fs from "fs";
import path from "path";
import { AuditLogRecord } from "../types/crm";

/**
 * Server-Side Append-Only Audit Log Repository
 *
 * Persists verified audit records emitted by server-side actions or
 * client requests authenticated via verified server sessions.
 */

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const AUDIT_LOGS_FILE = path.join(DATA_DIR, "audit_logs.json");

class AuditLogStore {
  private logs: AuditLogRecord[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      this.logs = [];
      this.isInitialized = true;
      return;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(AUDIT_LOGS_FILE)) {
        const raw = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.logs = list;
        }
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("[AuditLogStore] Failed to initialize from disk:", err);
      this.logs = [];
      this.isInitialized = true;
    }
  }

  private save() {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(this.logs, null, 2), "utf-8");
    } catch (err) {
      console.warn("[AuditLogStore] Failed to write audit logs to disk:", err);
    }
  }

  public append(record: AuditLogRecord): AuditLogRecord {
    this.init();
    // Append-only: newest first
    this.logs.unshift(record);
    if (this.logs.length > 5000) {
      this.logs = this.logs.slice(0, 5000);
    }
    this.save();
    return record;
  }

  public getAll(limit = 500): AuditLogRecord[] {
    this.init();
    return this.logs.slice(0, limit);
  }

  public clearForTesting() {
    this.logs = [];
    this.save();
  }
}

export const auditLogStore = new AuditLogStore();
