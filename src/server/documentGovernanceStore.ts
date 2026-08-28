import fs from "fs";
import path from "path";

export interface ControlledDocument {
  id: string;
  title: string;
  productFamily: string;
  documentType: "Datasheet" | "Catalogue" | "Compliance Certificate" | "Installation Manual" | "Warranty Doc";
  version: string;
  effectiveDate: string;
  reviewExpiryDate: string;
  source: string;
  uploader: string;
  approvalStatus: "Draft" | "Pending Review" | "Approved" | "Superseded" | "Expired" | "Rejected";
  supersededById?: string;
  fileUrl: string;
  pageCount?: number;
  uploadedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

const STORAGE_FILE = path.resolve(process.cwd(), "server_data_controlled_documents.json");

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
    id: "doc-pg-roadway-100",
    title: "Plasgain Roadway Pro 100W Mains Luminaire Specification",
    productFamily: "Roadway Pro",
    documentType: "Datasheet",
    version: "Rev 3.1",
    effectiveDate: "2026-03-01",
    reviewExpiryDate: "2027-03-01",
    source: "Plasgain Engineering Dept",
    uploader: "Technical Sales",
    approvalStatus: "Approved",
    fileUrl: "/docs/roadway_pro_100_datasheet.pdf",
    pageCount: 5,
    uploadedAt: "2026-03-01T08:00:00.000Z",
    approvedBy: "Engineering Director",
    approvedAt: "2026-03-01T11:00:00.000Z"
  },
  {
    id: "doc-pg-composite-pole-6m",
    title: "Plasgain 6.0m Composite FRP Direct Buried Pole Engineering Certificate",
    productFamily: "Composite Poles",
    documentType: "Compliance Certificate",
    version: "Rev 1.4",
    effectiveDate: "2025-11-10",
    reviewExpiryDate: "2026-11-10",
    source: "Structural Engineering Australia",
    uploader: "Compliance Officer",
    approvalStatus: "Approved",
    fileUrl: "/docs/composite_pole_6m_certificate.pdf",
    pageCount: 6,
    uploadedAt: "2025-11-10T08:00:00.000Z",
    approvedBy: "Structural Review Board",
    approvedAt: "2025-11-12T09:00:00.000Z"
  },
  {
    id: "doc-pg-composite-pole-6m-v1",
    title: "Plasgain 6.0m Composite Pole (Old Spec)",
    productFamily: "Composite Poles",
    documentType: "Compliance Certificate",
    version: "Rev 1.0",
    effectiveDate: "2024-01-01",
    reviewExpiryDate: "2025-01-01",
    source: "Plasgain Engineering Dept",
    uploader: "Compliance Officer",
    approvalStatus: "Superseded",
    supersededById: "doc-pg-composite-pole-6m",
    fileUrl: "/docs/composite_pole_6m_v1.pdf",
    pageCount: 4,
    uploadedAt: "2024-01-01T08:00:00.000Z"
  },
  {
    id: "doc-pg-draft-smart-sensor",
    title: "Plasgain Smart Radar Dimming Controller (Draft Specification)",
    productFamily: "Sensors & Controls",
    documentType: "Datasheet",
    version: "Draft 0.3",
    effectiveDate: "2026-08-01",
    reviewExpiryDate: "2026-12-31",
    source: "R&D Prototype Division",
    uploader: "R&D Engineer",
    approvalStatus: "Draft",
    fileUrl: "/docs/smart_sensor_draft.pdf",
    pageCount: 2,
    uploadedAt: "2026-08-01T08:00:00.000Z"
  }
];

class DocumentGovernanceStore {
  private documents: Map<string, ControlledDocument> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        const items: ControlledDocument[] = JSON.parse(raw);
        items.forEach((item) => this.documents.set(item.id, item));
      } else {
        DEFAULT_DOCUMENTS.forEach((doc) => this.documents.set(doc.id, doc));
        this.saveToDisk();
      }
    } catch (err) {
      console.warn("[DocumentGovernanceStore] Could not load documents:", err);
      DEFAULT_DOCUMENTS.forEach((doc) => this.documents.set(doc.id, doc));
    }
  }

  private saveToDisk() {
    try {
      const items = Array.from(this.documents.values());
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(items, null, 2), "utf-8");
    } catch (err) {
      console.warn("[DocumentGovernanceStore] Could not save documents to disk:", err);
    }
  }

  public listAll(): ControlledDocument[] {
    return Array.from(this.documents.values());
  }

  public getAuthoritativeDocuments(): ControlledDocument[] {
    const now = new Date().toISOString().slice(0, 10);
    return Array.from(this.documents.values()).filter(
      (doc) => doc.approvalStatus === "Approved" && doc.reviewExpiryDate >= now
    );
  }

  public getDocument(id: string): ControlledDocument | undefined {
    return this.documents.get(id);
  }

  public createDocument(partial: Partial<ControlledDocument> & {
    title: string;
    productFamily: string;
    documentType: ControlledDocument["documentType"];
    version: string;
    effectiveDate: string;
    reviewExpiryDate: string;
    source: string;
    uploader: string;
    fileUrl: string;
  }): ControlledDocument {
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
    this.documents.set(id, fullDoc);
    this.saveToDisk();
    return fullDoc;
  }

  public saveDocument(doc: ControlledDocument): ControlledDocument {
    this.documents.set(doc.id, doc);
    this.saveToDisk();
    return doc;
  }

  public approveDocument(id: string, approvedBy: string, supersedesDocId?: string): ControlledDocument | undefined {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    doc.approvalStatus = "Approved";
    doc.approvedBy = approvedBy;
    doc.approvedAt = new Date().toISOString();

    if (supersedesDocId) {
      const oldDoc = this.documents.get(supersedesDocId);
      if (oldDoc) {
        oldDoc.approvalStatus = "Superseded";
        oldDoc.supersededById = id;
      }
    }

    this.saveToDisk();
    return doc;
  }
}

export const documentGovernanceStore = new DocumentGovernanceStore();
