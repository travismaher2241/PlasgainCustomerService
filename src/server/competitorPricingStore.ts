import { CompetitorPricingRecord, CompetitorPricingAlert } from "../types/crm";
import { createDocBackend, DocBackend } from "./docStore";

/**
 * Server-Side Competitor Pricing Intelligence Repository
 *
 * Backed by Firestore through the Admin SDK when credentials are configured,
 * and by local JSON files otherwise.
 *
 * The previous file-only implementation carried a note asking for exactly this
 * change. On a serverless host those files lived in /tmp: pricing a rep logged
 * after a site visit was lost on the next deployment, and was never visible to
 * the other instances serving their colleagues.
 */

class CompetitorPricingStore {
  private pricingBackend: DocBackend<CompetitorPricingRecord> | null = null;
  private alertBackend: DocBackend<CompetitorPricingAlert> | null = null;

  private pricing(): DocBackend<CompetitorPricingRecord> {
    if (!this.pricingBackend) {
      this.pricingBackend = createDocBackend<CompetitorPricingRecord>(
        "competitor_pricing",
        "competitor_pricing.json"
      );
    }
    return this.pricingBackend;
  }

  private alertStore(): DocBackend<CompetitorPricingAlert> {
    if (!this.alertBackend) {
      this.alertBackend = createDocBackend<CompetitorPricingAlert>(
        "competitor_alerts",
        "competitor_alerts.json"
      );
    }
    return this.alertBackend;
  }

  public async getAllPricingRecords(filters?: {
    accountId?: string;
    competitorName?: string;
    status?: string;
  }): Promise<CompetitorPricingRecord[]> {
    let list = await this.pricing().loadAll();
    if (filters?.accountId) {
      list = list.filter((r) => r.accountId.toLowerCase() === filters.accountId!.toLowerCase());
    }
    if (filters?.competitorName) {
      list = list.filter((r) =>
        r.competitorName.toLowerCase().includes(filters.competitorName!.toLowerCase())
      );
    }
    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    return list.sort(
      (a, b) =>
        new Date(b.observedDate || b.createdAt).getTime() -
        new Date(a.observedDate || a.createdAt).getTime()
    );
  }

  public async getPricingRecordById(id: string): Promise<CompetitorPricingRecord | undefined> {
    const all = await this.pricing().loadAll();
    return all.find((r) => r.id === id);
  }

  public async createPricingRecord(
    data: Omit<CompetitorPricingRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<{ record: CompetitorPricingRecord; alert: CompetitorPricingAlert }> {
    const now = new Date().toISOString();
    const record: CompetitorPricingRecord = {
      ...data,
      id: `cp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now
    };

    await this.pricing().put(record.id, record);

    const priceFormatted = `$${record.price.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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

    await this.alertStore().put(alert.id, alert);

    return { record, alert };
  }

  public async updatePricingRecord(
    id: string,
    updates: Partial<CompetitorPricingRecord>
  ): Promise<CompetitorPricingRecord | undefined> {
    const existing = await this.getPricingRecordById(id);
    if (!existing) return undefined;

    const updated: CompetitorPricingRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    await this.pricing().put(id, updated);
    return updated;
  }

  public async getAllAlerts(): Promise<CompetitorPricingAlert[]> {
    const all = await this.alertStore().loadAll();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markAlertRead(alertId: string): Promise<CompetitorPricingAlert | undefined> {
    const all = await this.alertStore().loadAll();
    const alert = all.find((a) => a.id === alertId);
    if (!alert) return undefined;
    const updated = { ...alert, isRead: true };
    await this.alertStore().put(alertId, updated);
    return updated;
  }

  public async resetData(): Promise<void> {
    for (const r of await this.pricing().loadAll()) {
      await this.pricing().remove(r.id);
    }
    for (const a of await this.alertStore().loadAll()) {
      await this.alertStore().remove(a.id);
    }
  }
}

export const competitorPricingStore = new CompetitorPricingStore();
