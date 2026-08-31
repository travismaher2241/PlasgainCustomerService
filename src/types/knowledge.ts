import type { ControlledDocument } from "../server/documentGovernanceStore";

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
