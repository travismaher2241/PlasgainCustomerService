import { saveDocToCloud, loadDocFromCloud, loadCollectionFromCloud } from "../utils/firebase";

export interface ControlledDocument {
  id: string;
  title: string;
  productFamily: string;
  documentType: "Datasheet" | "Catalogue" | "Compliance Certificate" | "Installation Manual" | "Warranty Doc" | "Specification" | "Standard / Guide";
  version: string;
  effectiveDate: string;
  reviewExpiryDate: string;
  source: string;
  uploader: string;
  versionOwner?: string;
  checksum?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  fileName?: string;
  isExternalMetadataOnly?: boolean;
  validationResult?: {
    isValid: boolean;
    checkedAt: string;
    notes: string;
  };
  approvalStatus: "Draft" | "Pending Review" | "Approved" | "Superseded" | "Expired" | "Rejected";
  supersededById?: string;
  fileUrl: string;
  pageCount?: number;
  uploadedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

const FIRESTORE_COLLECTION = "controlled_documents";

const DEFAULT_DOCUMENTS: ControlledDocument[] = [
  {
    id: "doc-pg-pro-blade-125",
    title: "Plasgain Pro Blade Solar 125 Datasheet",
    productFamily: "Pro Blade Solar",
    documentType: "Datasheet",
    version: "Rev 4.2",
    effectiveDate: "2026-01-15",
    reviewExpiryDate: "2027-01-15",
    source: "Plasgain Engineering Dept",
    uploader: "Engineering Lead",
    approvalStatus: "Approved",
    fileUrl: "/docs/pro_blade_125_datasheet.pdf",
    pageCount: 4,
    uploadedAt: "2026-01-15T08:00:00.000Z",
    approvedBy: "Engineering Director",
    approvedAt: "2026-01-15T10:00:00.000Z"
  },
  {
    id: "doc-pg-path-master-30",
    title: "Plasgain PathMaster Solar 30W Datasheet",
    productFamily: "PathMaster Solar",
    documentType: "Datasheet",
    version: "Rev 2.0",
    effectiveDate: "2026-02-01",
    reviewExpiryDate: "2027-02-01",
    source: "Plasgain Engineering Dept",
    uploader: "Engineering Lead",
    approvalStatus: "Approved",
    fileUrl: "/docs/pathmaster_30_datasheet.pdf",
    pageCount: 3,
    uploadedAt: "2026-02-01T08:00:00.000Z",
    approvedBy: "Engineering Director",
    approvedAt: "2026-02-01T10:00:00.000Z"
  },
  {
    id: "doc-pg-plaspole-composite",
    title: "Plaspole Composite Frangible Pole Engineering Guide",
    productFamily: "Composite Poles",
    documentType: "Catalogue",
    version: "2026.1",
    effectiveDate: "2026-01-01",
    reviewExpiryDate: "2027-01-01",
    source: "Plasgain Civil & Structural",
    uploader: "Structural Engineer",
    approvalStatus: "Approved",
    fileUrl: "/docs/plaspole_composite_guide.pdf",
    pageCount: 8,
    uploadedAt: "2026-01-01T08:00:00.000Z",
    approvedBy: "Chief Technical Officer",
    approvedAt: "2026-01-01T12:00:00.000Z"
  },
  {
    id: "doc-pg-draft-cable-cover",
    title: "Polycover Heavy Duty Cable Cover Specification (Draft)",
    productFamily: "Civil & Cable Covers",
    documentType: "Compliance Certificate",
    version: "Rev 0.9-Draft",
    effectiveDate: "2026-07-01",
    reviewExpiryDate: "2027-07-01",
    source: "Plasgain Product Development",
    uploader: "Product Manager",
    approvalStatus: "Draft",
    fileUrl: "/docs/polycover_spec_draft.pdf",
    pageCount: 2,
    uploadedAt: "2026-07-01T08:00:00.000Z"
  },
  {
    id: "doc-pg-old-pro-blade-rev3",
    title: "Plasgain Pro Blade Solar (Legacy Rev 3.1)",
    productFamily: "Pro Blade Solar",
    documentType: "Datasheet",
    version: "Rev 3.1",
    effectiveDate: "2024-01-01",
    reviewExpiryDate: "2025-01-01",
    source: "Plasgain Engineering Dept",
    uploader: "Engineering Lead",
    approvalStatus: "Superseded",
    supersededById: "doc-pg-pro-blade-125",
    fileUrl: "/docs/pro_blade_legacy_rev3.pdf",
    pageCount: 4,
    uploadedAt: "2024-01-01T08:00:00.000Z",
    approvedBy: "Engineering Director",
    approvedAt: "2024-01-01T10:00:00.000Z"
  }
];

class DocumentGovernanceStore {
  private inMemoryCache: Map<string, ControlledDocument> = new Map();

  constructor() {
    DEFAULT_DOCUMENTS.forEach((doc) => this.inMemoryCache.set(doc.id, doc));
    this.initFromCloud();
  }

  private async initFromCloud() {
    try {
      const records = await loadCollectionFromCloud<ControlledDocument>(FIRESTORE_COLLECTION);
      if (records && records.length > 0) {
        records.forEach((doc) => this.inMemoryCache.set(doc.id, doc));
      } else {
        // Seed defaults to Firestore if empty
        DEFAULT_DOCUMENTS.forEach((doc) => {
          saveDocToCloud(FIRESTORE_COLLECTION, doc.id, doc);
        });
      }
    } catch (err) {
      console.warn("[DocumentGovernanceStore] Cloud Firestore init fallback to default seed:", err);
    }
  }

  public async listAll(): Promise<ControlledDocument[]> {
    const records = await loadCollectionFromCloud<ControlledDocument>(FIRESTORE_COLLECTION);
    if (records && records.length > 0) {
      records.forEach((doc) => this.inMemoryCache.set(doc.id, doc));
    }
    return Array.from(this.inMemoryCache.values());
  }

  public async getAuthoritativeDocuments(): Promise<ControlledDocument[]> {
    const all = await this.listAll();
    const now = new Date().toISOString().slice(0, 10);
    return all.filter(
      (doc) => doc.approvalStatus === "Approved" && doc.reviewExpiryDate >= now
    );
  }

  public async getDocument(id: string): Promise<ControlledDocument | undefined> {
    if (this.inMemoryCache.has(id)) {
      return this.inMemoryCache.get(id);
    }
    const cloudRecord = await loadDocFromCloud<ControlledDocument>(FIRESTORE_COLLECTION, id);
    if (cloudRecord) {
      this.inMemoryCache.set(cloudRecord.id, cloudRecord);
      return cloudRecord;
    }
    return undefined;
  }

  public async createDocument(partial: Partial<ControlledDocument> & {
    title: string;
    productFamily: string;
    documentType: ControlledDocument["documentType"];
    version: string;
    effectiveDate: string;
    reviewExpiryDate: string;
    source: string;
    uploader: string;
    fileUrl: string;
  }): Promise<ControlledDocument> {
    const id = partial.id || `doc-gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullDoc: ControlledDocument = {
      id,
      title: partial.title,
      productFamily: partial.productFamily,
      documentType: partial.documentType,
      version: partial.version,
      effectiveDate: partial.effectiveDate,
      reviewExpiryDate: partial.reviewExpiryDate,
      source: partial.source,
      uploader: partial.uploader,
      approvalStatus: partial.approvalStatus || "Draft",
      supersededById: partial.supersededById,
      fileUrl: partial.fileUrl,
      pageCount: partial.pageCount || 1,
      uploadedAt: partial.uploadedAt || new Date().toISOString(),
      approvedBy: partial.approvedBy,
      approvedAt: partial.approvedAt
    };

    this.inMemoryCache.set(id, fullDoc);
    await saveDocToCloud(FIRESTORE_COLLECTION, id, fullDoc);
    return fullDoc;
  }

  public async saveDocument(doc: ControlledDocument): Promise<ControlledDocument> {
    this.inMemoryCache.set(doc.id, doc);
    await saveDocToCloud(FIRESTORE_COLLECTION, doc.id, doc);
    return doc;
  }

  public async approveDocument(id: string, approvedBy: string, supersedesDocId?: string): Promise<ControlledDocument | undefined> {
    const doc = await this.getDocument(id);
    if (!doc) return undefined;
    doc.approvalStatus = "Approved";
    doc.approvedBy = approvedBy;
    doc.approvedAt = new Date().toISOString();

    if (supersedesDocId) {
      const oldDoc = await this.getDocument(supersedesDocId);
      if (oldDoc) {
        oldDoc.approvalStatus = "Superseded";
        oldDoc.supersededById = id;
        await saveDocToCloud(FIRESTORE_COLLECTION, oldDoc.id, oldDoc);
      }
    }

    this.inMemoryCache.set(id, doc);
    await saveDocToCloud(FIRESTORE_COLLECTION, id, doc);
    return doc;
  }

  public clearLocalCache() {
    this.inMemoryCache.clear();
    DEFAULT_DOCUMENTS.forEach((doc) => this.inMemoryCache.set(doc.id, doc));
  }
}

export const documentGovernanceStore = new DocumentGovernanceStore();
