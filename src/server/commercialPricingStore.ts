import { saveDocToCloud, loadDocFromCloud, loadCollectionFromCloud } from "../utils/firebase";

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

const FIRESTORE_COLLECTION = "commercial_pricing_requests";

class CommercialPricingStore {
  private inMemoryCache: Map<string, CommercialPricingRequest> = new Map();

  constructor() {
    this.initFromCloud();
  }

  private async initFromCloud() {
    try {
      const records = await loadCollectionFromCloud<CommercialPricingRequest>(FIRESTORE_COLLECTION);
      if (records && records.length > 0) {
        records.forEach((r) => this.inMemoryCache.set(r.id, r));
      }
    } catch (err) {
      console.warn("[CommercialPricingStore] Cloud Firestore init fallback to memory cache:", err);
    }
  }

  public async createRequest(partial: Partial<CommercialPricingRequest> & {
    projectId: string;
    customerCompany: string;
    productCode: string;
    productName: string;
    quantity: number;
    requestedBy: string;
    requiredByDate: string;
  }): Promise<CommercialPricingRequest> {
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

    this.inMemoryCache.set(id, fullRequest);
    await saveDocToCloud(FIRESTORE_COLLECTION, id, fullRequest);
    return fullRequest;
  }

  public async getRequest(id: string): Promise<CommercialPricingRequest | undefined> {
    if (this.inMemoryCache.has(id)) {
      return this.inMemoryCache.get(id);
    }
    const cloudRecord = await loadDocFromCloud<CommercialPricingRequest>(FIRESTORE_COLLECTION, id);
    if (cloudRecord) {
      this.inMemoryCache.set(cloudRecord.id, cloudRecord);
      return cloudRecord;
    }
    return undefined;
  }

  public async listAll(): Promise<CommercialPricingRequest[]> {
    const all = await loadCollectionFromCloud<CommercialPricingRequest>(FIRESTORE_COLLECTION);
    if (all && all.length > 0) {
      all.forEach((r) => this.inMemoryCache.set(r.id, r));
    }
    return Array.from(this.inMemoryCache.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  public async listByProject(projectId: string): Promise<CommercialPricingRequest[]> {
    const all = await loadCollectionFromCloud<CommercialPricingRequest>(FIRESTORE_COLLECTION);
    if (all && all.length > 0) {
      all.forEach((r) => this.inMemoryCache.set(r.id, r));
    }
    return Array.from(this.inMemoryCache.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  public async updateStatus(
    id: string,
    status: CommercialPricingRequest["status"],
    details?: {
      approvedUnitPrice?: number;
      approvedBy?: string;
      approvedPriceReference?: string;
      reviewedBy?: string;
      notes?: string;
    }
  ): Promise<CommercialPricingRequest | undefined> {
    const req = await this.getRequest(id);
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

    this.inMemoryCache.set(id, req);
    await saveDocToCloud(FIRESTORE_COLLECTION, id, req);
    return req;
  }

  public clearLocalCache() {
    this.inMemoryCache.clear();
  }
}

export const commercialPricingStore = new CommercialPricingStore();
