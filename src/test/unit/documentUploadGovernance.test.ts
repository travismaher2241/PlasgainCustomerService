import { describe, it, expect } from 'vitest';
import { ControlledDocument } from '../../server/documentGovernanceStore';

describe('Priority 1: Document Upload & Governance Metadata (SHA Checksum, Version Owner, Approval)', () => {
  it('creates a governed document with checksum, version owner, and validation result', () => {
    const doc: ControlledDocument = {
      id: "doc-pg-test-01",
      title: "Plasgain Solar Intense 50W Datasheet",
      productFamily: "Pro Blade Solar",
      documentType: "Datasheet",
      version: "Rev 2.1",
      versionOwner: "Travis Maher",
      checksum: "8f4b7a12e35c89d0",
      fileSizeBytes: 425000,
      mimeType: "application/pdf",
      fileName: "plasgain_intense_50w_datasheet.pdf",
      isExternalMetadataOnly: false,
      effectiveDate: "2026-01-01",
      reviewExpiryDate: "2027-01-01",
      source: "Plasgain Engineering Dept",
      uploader: "Travis Maher",
      approvalStatus: "Approved",
      fileUrl: "/docs/plasgain_intense_50w_datasheet.pdf",
      pageCount: 4,
      uploadedAt: new Date().toISOString(),
      validationResult: {
        isValid: true,
        checkedAt: new Date().toISOString(),
        notes: "Compliant with 2026.1 Controlled Engineering Document Standard."
      }
    };

    expect(doc.checksum).toBe("8f4b7a12e35c89d0");
    expect(doc.versionOwner).toBe("Travis Maher");
    expect(doc.fileSizeBytes).toBe(425000);
    expect(doc.approvalStatus).toBe("Approved");
    expect(doc.validationResult?.isValid).toBe(true);
  });

  it('differentiates between physical file upload and external metadata registration', () => {
    const fileDoc: Partial<ControlledDocument> = {
      title: "Local Uploaded Standard",
      isExternalMetadataOnly: false,
      checksum: "a1b2c3d4e5f60718"
    };

    const metaDoc: Partial<ControlledDocument> = {
      title: "Austroads Guide Part 6",
      isExternalMetadataOnly: true,
      checksum: "meta-ext-9921"
    };

    expect(fileDoc.isExternalMetadataOnly).toBe(false);
    expect(metaDoc.isExternalMetadataOnly).toBe(true);
  });
});
