import fs from "fs";
import path from "path";
import { CompetitorPricingRecord, CompetitorPricingAlert } from "../types/crm";

/**
 * Server-Side Competitor Pricing Intelligence Repository
 *
 * NOTE FOR PRODUCTION DEPLOYMENT:
 * This implementation provides single-server file-backed persistence. For multi-instance
 * horizontal scaling in production, replace this file storage abstraction with a distributed
 * database (e.g. PostgreSQL / Prisma, Supabase, Cloud Firestore, or Redis).
 */

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const PRICING_FILE = path.join(DATA_DIR, "competitor_pricing.json");
const ALERTS_FILE = path.join(DATA_DIR, "competitor_alerts.json");

const SEED_PRICING: CompetitorPricingRecord[] = [];
const SEED_ALERTS: CompetitorPricingAlert[] = [];

class CompetitorPricingStore {
  private pricingRecords: CompetitorPricingRecord[] = [];
  private alerts: CompetitorPricingAlert[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(PRICING_FILE)) {
        const raw = fs.readFileSync(PRICING_FILE, "utf-8");
        this.pricingRecords = JSON.parse(raw);
      } else {
        this.pricingRecords = [...SEED_PRICING];
        this.savePricing();
      }

      if (fs.existsSync(ALERTS_FILE)) {
        const raw = fs.readFileSync(ALERTS_FILE, "utf-8");
        this.alerts = JSON.parse(raw);
      } else {
        this.alerts = [...SEED_ALERTS];
        this.saveAlerts();
      }

      this.isInitialized = true;
    } catch (err) {
      console.error("[CompetitorPricingStore] Failed to load store from disk, using memory state:", err);
      this.pricingRecords = [...SEED_PRICING];
      this.alerts = [...SEED_ALERTS];
      this.isInitialized = true;
    }
  }

  private savePricing() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PRICING_FILE, JSON.stringify(this.pricingRecords, null, 2), "utf-8");
    } catch (err) {
      console.error("[CompetitorPricingStore] Failed to write pricing to disk:", err);
    }
  }

  private saveAlerts() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(ALERTS_FILE, JSON.stringify(this.alerts, null, 2), "utf-8");
    } catch (err) {
      console.error("[CompetitorPricingStore] Failed to write alerts to disk:", err);
    }
  }

  public getAllPricingRecords(filters?: { accountId?: string; competitorName?: string; status?: string }): CompetitorPricingRecord[] {
    let list = [...this.pricingRecords];
    if (filters?.accountId) {
      list = list.filter((r) => r.accountId.toLowerCase() === filters.accountId!.toLowerCase());
    }
    if (filters?.competitorName) {
      list = list.filter((r) => r.competitorName.toLowerCase().includes(filters.competitorName!.toLowerCase()));
    }
    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    // Sort descending by observedDate
    return list.sort((a, b) => new Date(b.observedDate || b.createdAt).getTime() - new Date(a.observedDate || a.createdAt).getTime());
  }

  public getPricingRecordById(id: string): CompetitorPricingRecord | undefined {
    return this.pricingRecords.find((r) => r.id === id);
  }

  public createPricingRecord(
    data: Omit<CompetitorPricingRecord, "id" | "createdAt" | "updatedAt">
  ): { record: CompetitorPricingRecord; alert: CompetitorPricingAlert } {
    const now = new Date().toISOString();
    const record: CompetitorPricingRecord = {
      ...data,
      id: `cp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now
    };

    this.pricingRecords.unshift(record);
    this.savePricing();

    // Format price for alert
    const priceFormatted = `$${record.price.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const basisText = record.priceBasis ? ` (${record.priceBasis})` : "";
    const alertMessage = `${record.competitorName} quoted ${record.competitorProduct} at ${priceFormatted}${basisText} for ${record.accountName}`;

    const alert: CompetitorPricingAlert = {
      id: `cpa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recordId: record.id,
      accountId: record.accountId,
      accountName: record.accountName,
      competitorName: record.competitorName,
      competitorProduct: record.competitorProduct,
      price: record.price,
      currency: record.currency || "AUD",
      priceBasis: record.priceBasis,
      title: "New competitor pricing",
      message: alertMessage,
      createdAt: now,
      isRead: false
    };

    this.alerts.unshift(alert);
    this.saveAlerts();

    return { record, alert };
  }

  public updatePricingRecord(
    id: string,
    updates: Partial<CompetitorPricingRecord>
  ): CompetitorPricingRecord | undefined {
    const index = this.pricingRecords.findIndex((r) => r.id === id);
    if (index === -1) return undefined;

    const existing = this.pricingRecords[index];
    const updated: CompetitorPricingRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.pricingRecords[index] = updated;
    this.savePricing();
    return updated;
  }

  public getAllAlerts(): CompetitorPricingAlert[] {
    return [...this.alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public markAlertRead(alertId: string): CompetitorPricingAlert | undefined {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return undefined;
    alert.isRead = true;
    this.saveAlerts();
    return alert;
  }

  public resetData(useSeed = true): void {
    this.pricingRecords = useSeed ? [...SEED_PRICING] : [];
    this.alerts = useSeed ? [...SEED_ALERTS] : [];
    this.savePricing();
    this.saveAlerts();
  }
}

export const competitorPricingStore = new CompetitorPricingStore();
