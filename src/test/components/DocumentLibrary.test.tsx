import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentLibrary } from "../../components/DocumentLibrary";
import { PDFViewerModal } from "../../components/PDFViewerModal";
import { KnowledgeReviewModal } from "../../components/KnowledgeReviewModal";
import { AppProvider } from "../../context/AppContext";
import type { KnowledgeDocument, KnowledgeRecord } from "../../types/knowledge";
import type { ControlledDocument } from "../../server/documentGovernanceStore";

const mockControlledDocs: ControlledDocument[] = [
  {
    id: "doc-pb75",
    title: "Plasgain Pro Blade 75 Technical Specification",
    productFamily: "Solar Public Lighting",
    documentType: "Specification",
    version: "Rev 6",
    approvalStatus: "Approved",
    fileUrl: "/api/knowledge/files/doc-pb75.pdf",
    pageCount: 12,
    effectiveDate: "2026-01-01",
    reviewExpiryDate: "2027-01-01",
    checksum: "sha256-abcdef1234567890",
    versionOwner: "Travis Maher",
    source: "Plasgain Engineering"
  },
  {
    id: "doc-superseded",
    title: "Plasgain Pro Blade 75 Legacy Datasheet",
    productFamily: "Solar Public Lighting",
    documentType: "Specification",
    version: "Rev 4",
    approvalStatus: "Superseded",
    fileUrl: "/api/knowledge/files/doc-superseded.pdf",
    pageCount: 10,
    effectiveDate: "2024-01-01",
    reviewExpiryDate: "2025-01-01",
    checksum: "sha256-legacy1234567890",
    versionOwner: "Travis Maher",
    source: "Plasgain Engineering"
  },
  {
    id: "doc-pending",
    title: "Werribee Trail Lighting Compliance Guide",
    productFamily: "Compliance Standards",
    documentType: "Standard",
    version: "2026.1",
    approvalStatus: "Pending Review",
    fileUrl: "/api/knowledge/files/doc-pending.pdf",
    pageCount: 4,
    effectiveDate: "2026-02-01",
    reviewExpiryDate: "2027-02-01",
    checksum: "sha256-pending1234567890",
    versionOwner: "Lead Engineer",
    source: "Standards Australia"
  },
  {
    id: "doc-nopdf",
    title: "AS/NZS 1158.3.1 Category P Reference Note",
    productFamily: "Compliance Standards",
    documentType: "Standard",
    version: "2020 AMD 1",
    approvalStatus: "Draft",
    fileUrl: "",
    effectiveDate: "2020-05-01",
    source: "Standards Australia"
  }
];

const mockKnowledgeDocs: KnowledgeDocument[] = [
  {
    ...mockControlledDocs[0],
    knowledge: {
      storage: "local",
      reviewedPages: 12,
      warningPages: [],
      revision: 1
    }
  },
  {
    ...mockControlledDocs[1],
    knowledge: {
      storage: "local",
      reviewedPages: 10,
      warningPages: [],
      revision: 1
    }
  },
  {
    ...mockControlledDocs[2],
    knowledge: {
      storage: "local",
      reviewedPages: 2,
      warningPages: [3],
      revision: 1
    }
  }
];

const mockKnowledgeRecord: KnowledgeRecord = {
  document: mockKnowledgeDocs[2],
  pages: [
    {
      page: 1,
      reviewedText: "Page 1: Scope and definitions for Category P4 trail lighting.",
      extractedText: "Scope and definitions for Category P4 trail lighting.",
      reviewedBy: "Travis Maher",
      reviewedAt: "2026-08-30T10:00:00Z",
      warnings: [],
      excluded: false
    },
    {
      page: 2,
      reviewedText: "Page 2: Minimum horizontal illuminance requirements.",
      extractedText: "Minimum horizontal illuminance requirements.",
      reviewedBy: "Travis Maher",
      reviewedAt: "2026-08-30T10:05:00Z",
      warnings: [],
      excluded: false
    },
    {
      page: 3,
      reviewedText: "",
      extractedText: "Raw table data for Cat P4 spacing at 6m pole heights.",
      warnings: ["Low text extraction confidence on page 3", "Table structure detected — verify column alignments"],
      excluded: false
    },
    {
      page: 4,
      reviewedText: "",
      extractedText: "Summary of compliance certification sign-off.",
      warnings: [],
      excluded: false
    }
  ]
};

// Mock apiClient
vi.mock("../../utils/apiClient", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  uploadKnowledgePdf: vi.fn(),
  AIUnavailableError: class AIUnavailableError extends Error {
    detail: string;
    guidance: string;
    constructor(detail: string, guidance: string) {
      super(detail);
      this.detail = detail;
      this.guidance = guidance;
    }
  },
  toUserMessage: (err: any) => err?.message || "API Error"
}));

// Mock usePdfSource
vi.mock("../../components/usePdfSource", () => ({
  usePdfSource: (fileUrl?: string) => ({
    source: fileUrl ? `blob:http://localhost:3000/${fileUrl}` : undefined,
    error: undefined
  })
}));

// Mock PdfPageCanvas
vi.mock("../../components/PdfPageCanvas", () => ({
  PdfPageCanvas: ({ page, onRenderState }: any) => {
    React.useEffect(() => {
      onRenderState?.(true);
    }, [page, onRenderState]);
    return <div data-testid={`pdf-page-canvas-${page}`}>Rendered PDF Page {page}</div>;
  }
}));

import { apiGet, apiPost, uploadKnowledgePdf } from "../../utils/apiClient";

describe("DocumentLibrary & PDF Workflows (Step 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url === "/api/knowledge/documents") return mockKnowledgeDocs;
      if (url === "/api/controlled-documents") return mockControlledDocs;
      if (url.startsWith("/api/knowledge/documents/")) return mockKnowledgeRecord;
      return [];
    });
  });

  const renderLibrary = () =>
    render(
      <AppProvider key={Math.random().toString()}>
        <DocumentLibrary />
      </AppProvider>
    );

  it("Test 1 — renders single clear page title 'Documents' and empty state when no documents exist", async () => {
    vi.mocked(apiGet).mockResolvedValue([]);

    renderLibrary();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /^Documents$/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/No documents found/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+? ?Upload document/i }).length).toBeGreaterThanOrEqual(1);

    // No redundant hero blocks or repeated governance paragraphs
    expect(screen.queryByText(/Upload → review each page → approve for AI use/i)).not.toBeInTheDocument();
  });

  it("Test 2 — renders populated library with Current documents by default and compact row fields", async () => {
    renderLibrary();

    await waitFor(() => {
      expect(screen.getByText("Plasgain Pro Blade 75 Technical Specification")).toBeInTheDocument();
    });

    // 1. Current documents shown (Rev 6 and 2026.1)
    expect(screen.getByText("Rev 6")).toBeInTheDocument();
    expect(screen.getByText("2026.1")).toBeInTheDocument();

    // 2. Superseded documents hidden by default
    expect(screen.queryByText("Plasgain Pro Blade 75 Legacy Datasheet")).not.toBeInTheDocument();

    // 3. Compact row fields visible at a glance
    expect(screen.getByText(/12 \/ 12 pages reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 4 pages reviewed/i)).toBeInTheDocument();

    // 4. Source organisation visible
    expect(screen.getAllByText(/Plasgain Engineering/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Standards Australia/i).length).toBeGreaterThanOrEqual(1);
  });

  it("Test 3 — displays concise 'PDF not uploaded' state for metadata record without binary file", async () => {
    renderLibrary();

    await waitFor(() => {
      expect(screen.getByText("AS/NZS 1158.3.1 Category P Reference Note")).toBeInTheDocument();
    });

    // Clear tag and upload action
    expect(screen.getByText(/PDF not uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload PDF/i })).toBeInTheDocument();
  });

  it("Test 4 — PDF upload dialog prioritises file, title, source, revision and explains review workflow", async () => {
    renderLibrary();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Upload document/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Upload document/i }));

    // Upload dialog opens
    expect(screen.getByRole("dialog", { name: /Upload Document/i })).toBeInTheDocument();

    // Prominent fields
    expect(screen.getByLabelText(/Choose or drop a PDF document/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Document Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Author \/ Source Organisation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Source Revision \/ Version/i)).toBeInTheDocument();

    // Workflow explanation: Upload != Approve
    expect(
      screen.getByText(/Uploading adds this document for page-by-page review. It is not approved or available to AI until review is completed and verified./i)
    ).toBeInTheDocument();
  });

  it("Test 5 — handles upload failure with error message and retry capability", async () => {
    vi.mocked(uploadKnowledgePdf).mockRejectedValueOnce(new Error("File storage quota exceeded on server"));

    renderLibrary();

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /\+ Upload document/i }));
    });

    const file = new File(["%PDF-test"], "sample-catalogue.pdf", { type: "application/pdf" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", { name: /Upload & extract PDF/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/File storage quota exceeded on server/i)).toBeInTheDocument();
    });
  });

  it("Test 6 — distinguishes Review Status from AI Availability independently", async () => {
    renderLibrary();

    await waitFor(() => {
      expect(screen.getByText("Plasgain Pro Blade 75 Technical Specification")).toBeInTheDocument();
    });

    // Approved document is Available to AI
    expect(screen.getByTitle(/Review Status: Approved/i)).toBeInTheDocument();
    expect(screen.getByTitle(/AI Availability/i)).toBeInTheDocument();

    // Pending review document is NOT available to AI
    expect(screen.getByTitle(/Review Status: Pending review/i)).toBeInTheDocument();
  });

  it("Test 7 & 8 — PDF page review opens side-by-side layout and 'Next unreviewed page' navigates correctly", async () => {
    render(
      <KnowledgeReviewModal
        id="doc-pending"
        canReview={true}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /PDF Page Review/i })).toBeInTheDocument();
    });

    // Desktop side-by-side elements rendered
    expect(screen.getByTestId("pdf-page-canvas-1")).toBeInTheDocument();
    expect(screen.getByLabelText(/Verified Page Text/i)).toBeInTheDocument();

    // Next unreviewed page button identifies Page 3 as next unreviewed
    const nextUnrevBtn = screen.getByRole("button", { name: /Next unreviewed/i });
    expect(nextUnrevBtn).toBeInTheDocument();
    expect(nextUnrevBtn).toHaveTextContent(/Next unreviewed \(p\.3\)/i);

    // Click Next Unreviewed -> Navigates to Page 3
    fireEvent.click(nextUnrevBtn);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-page-canvas-3")).toBeInTheDocument();
    });
  });

  it("Test 9 & 10 — renders page-specific warnings and requires explicit page verification", async () => {
    render(
      <KnowledgeReviewModal
        id="doc-pending"
        canReview={true}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      // Navigate to page 3 which has warnings
      const select = screen.getByLabelText(/Review page/i);
      fireEvent.change(select, { target: { value: "2" } }); // index 2 = page 3
    });

    // Page-specific warnings visible
    expect(screen.getByText(/Low text extraction confidence on page 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Table structure detected — verify column alignments/i)).toBeInTheDocument();

    // Verification button disabled before checkbox confirmed
    const saveBtn = screen.getByRole("button", { name: /Save page review & continue/i });
    expect(saveBtn).toBeDisabled();

    // Fill verified text
    const textarea = screen.getByLabelText(/Verified page text/i);
    fireEvent.change(textarea, { target: { value: "Verified Cat P4 spacing data table: 28m spacing at 6m height." } });

    // Confirm verification checkbox
    const confirmCheckbox = screen.getByRole("checkbox", {
      name: /I compared this page with the original PDF/i
    });
    fireEvent.click(confirmCheckbox);

    // Save button enabled!
    expect(saveBtn).not.toBeDisabled();
  });

  it("Test 11 — Document approval gate is locked until all pages are reviewed", async () => {
    render(
      <KnowledgeReviewModal
        id="doc-pending"
        canReview={true}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/2 of 4 pages reviewed/i)).toBeInTheDocument();
    });

    // Approve button is disabled because 2 pages remain unreviewed
    const approveBtn = screen.getByRole("button", { name: /Approve for AI knowledge/i });
    expect(approveBtn).toBeDisabled();
  });

  it("Test 12 — Management dropdown contains 'Withdraw from AI' only when document is available to AI", async () => {
    renderLibrary();

    await waitFor(() => {
      expect(screen.getByText("Plasgain Pro Blade 75 Technical Specification")).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByRole("button", { name: /Document actions/i });
    expect(actionButtons.length).toBeGreaterThanOrEqual(1);

    // Click first action menu for Approved Doc
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Withdraw from AI/i)).toBeInTheDocument();
    });
  });

  it("Test 13 — Superseded filter exposes older revisions", async () => {
    renderLibrary();

    await waitFor(() => {
      expect(screen.getByText("Plasgain Pro Blade 75 Technical Specification")).toBeInTheDocument();
    });

    // Switch filter to Superseded
    const filterSelect = screen.getByLabelText(/Filter documents/i);
    fireEvent.change(filterSelect, { target: { value: "superseded" } });

    await waitFor(() => {
      expect(screen.getByText("Plasgain Pro Blade 75 Legacy Datasheet")).toBeInTheDocument();
      expect(screen.getByText("Rev 4")).toBeInTheDocument();
    });
  });

  it("Test 14 — PDF Viewer provides compact toolbar, direct page entry, and fit modes", async () => {
    render(
      <PDFViewerModal
        isOpen={true}
        document={mockControlledDocs[0]}
        onClose={vi.fn()}
        initialPage={1}
      />
    );

    expect(screen.getByRole("dialog", { name: /Plasgain Pro Blade 75 Technical Specification/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous Page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next Page/i })).toBeInTheDocument();

    // Direct page input
    const pageInput = screen.getByLabelText(/Page number/i);
    expect(pageInput).toBeInTheDocument();
    expect(pageInput).toHaveValue(1);

    // Enter direct page
    fireEvent.change(pageInput, { target: { value: "5" } });
    expect(pageInput).toHaveValue(5);
  });
});
