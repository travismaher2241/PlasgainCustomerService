import fs from "fs";
import path from "path";

export interface CommercialPricingRequest {
  id: string;
  opportunityId?: string;
  projectId: string;
  customerCompany: string;
  productCode: string;
  productName: string;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
  requiredByDate: string;
  status: "Requested" | "In Review" | "Pricing Supplied" | "Expired";
  notes?: string;
  approvedUnitPrice?: number;
  approvedBy?: string;
  approvedAt?: string;
  approvedPriceReference?: string;
  reviewedBy?: string;
}

const STORAGE_FILE = path.resolve(process.cwd(), "server_data_pricing_requests.json");

class CommercialPricingStore {
  private requests: Map<string, CommercialPricingRequest> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        const items: CommercialPricingRequest[] = JSON.parse(raw);
        items.forEach((item) => this.requests.set(item.id, item));
      }
    } catch (err) {
      console.warn("[CommercialPricingStore] Could not load pricing requests:", err);
    }
  }

  private saveToDisk() {
    try {
      const items = Array.from(this.requests.values());
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(items, null, 2), "utf-8");
    } catch (err) {
      console.warn("[CommercialPricingStore] Could not save pricing requests:", err);
    }
  }

  public createRequest(partial: Partial<CommercialPricingRequest> & {
    projectId: string;
    customerCompany: string;
    productCode: string;
    productName: string;
    quantity: number;
    requestedBy: string;
    requiredByDate: string;
  }): CommercialPricingRequest {
    const id = partial.id || `cpr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullRequest: CommercialPricingRequest = {
      id,
      projectId: partial.projectId,
      opportunityId: partial.opportunityId,
      customerCompany: partial.customerCompany,
      productCode: partial.productCode,
      productName: partial.productName,
      quantity: partial.quantity,
      requestedBy: partial.requestedBy,
      requestedAt: partial.requestedAt || new Date().toISOString(),
      requiredByDate: partial.requiredByDate,
      status: partial.status || "Requested",
      notes: partial.notes,
      approvedUnitPrice: partial.approvedUnitPrice,
      approvedBy: partial.approvedBy,
      approvedAt: partial.approvedAt,
      approvedPriceReference: partial.approvedPriceReference
    };

    this.requests.set(id, fullRequest);
    this.saveToDisk();
    return fullRequest;
  }

  public getRequest(id: string): CommercialPricingRequest | undefined {
    return this.requests.get(id);
  }

  public listAll(): CommercialPricingRequest[] {
    return Array.from(this.requests.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  public listByProject(projectId: string): CommercialPricingRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  public updateStatus(
    id: string,
    status: CommercialPricingRequest["status"],
    details?: {
      approvedUnitPrice?: number;
      approvedBy?: string;
      approvedPriceReference?: string;
      reviewedBy?: string;
      notes?: string;
    }
  ): CommercialPricingRequest | undefined {
    const req = this.requests.get(id);
    if (!req) return undefined;

    req.status = status;
    if (details?.approvedUnitPrice !== undefined) req.approvedUnitPrice = details.approvedUnitPrice;
    if (details?.approvedBy) req.approvedBy = details.approvedBy;
    if (details?.reviewedBy) {
      req.approvedBy = details.reviewedBy;
      req.reviewedBy = details.reviewedBy;
    }
    if (details?.approvedPriceReference) req.approvedPriceReference = details.approvedPriceReference;
    if (details?.notes) req.notes = details.notes;
    if (status === "Pricing Supplied") req.approvedAt = new Date().toISOString();

    this.saveToDisk();
    return req;
  }
}

export const commercialPricingStore = new CommercialPricingStore();
