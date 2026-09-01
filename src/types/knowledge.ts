import type { DocumentType } from "../utils/documentClassifier";

// Moved here from the deleted src/server/documentGovernanceStore.ts — that file
// was a parallel, unused-from-the-UI governance CRUD layer ("controlled
// documents publish AS/NZS compliance evidence that goes to councils"), but
// KnowledgeDocument, the type the live upload pipeline actually uses, extends
// this shape, so the interface itself stays.
export interface ControlledDocument {
  id: string;
  title: string;
  productFamily: string;
  documentType: DocumentType;
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

export interface KnowledgePage {
  page: number;
  extractedText: string;
  reviewedText: string;
  warnings: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  excluded?: boolean;
  exclusionReason?: string;
}

export interface KnowledgeDocument extends ControlledDocument {
  knowledge: {
    extractionMethod: "pdfjs-positioned-text-v1";
    status: "Pending Review" | "Ready";
    reviewedPages: number;
    warningPages: number[];
    storage: "local" | "cloud";
    revision: number;
  };
}

export interface KnowledgeRecord {
  document: KnowledgeDocument;
  pages: KnowledgePage[];
}

export interface KnowledgeEvidence {
  sourceId: string;
  documentId: string;
  title: string;
  version: string;
  page: number;
  fileUrl: string;
  text: string;
}
