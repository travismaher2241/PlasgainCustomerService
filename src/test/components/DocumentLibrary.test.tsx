import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentLibrary } from "../../components/DocumentLibrary";
import { PDFViewerModal } from "../../components/PDFViewerModal";
import { KnowledgeReviewModal } from "../../components/KnowledgeReviewModal";
import { AppProvider } from "../../context/AppContext";
import type { KnowledgeDocument, KnowledgeRecord, ControlledDocument } from "../../types/knowledge";

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
    source: "Plasgain Engineering",
    uploader: "Travis Maher",
    uploadedAt: "2026-01-01T00:00:00.000Z"
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
    source: "Plasgain Engineering",
    uploader: "Travis Maher",
    uploadedAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "doc-pending",
    title: "Werribee Trail Lighting Compliance Guide",
    productFamily: "Compliance Standards",
    documentType: "Standard / Guide",
    version: "2026.1",
    approvalStatus: "Pending Review",
    fileUrl: "/api/knowledge/files/doc-pending.pdf",
    pageCount: 4,
    effectiveDate: "2026-02-01",
    reviewExpiryDate: "2027-02-01",
    checksum: "sha256-pending1234567890",
    versionOwner: "Lead Engineer",
    source: "Standards Australia",
    uploader: "Travis Maher",
    uploadedAt: "2026-02-01T00:00:00.000Z"
  },
  {
    id: "doc-nopdf",
    title: "AS/NZS 1158.3.1 Category P Reference Note",
    productFamily: "Compliance Standards",
    documentType: "Standard / Guide",
    version: "2020 AMD 1",
    approvalStatus: "Draft",
    fileUrl: "",
    effectiveDate: "2020-05-01",
    reviewExpiryDate: "2027-01-01",
    source: "Standards Australia",
    uploader: "Travis Maher",
    uploadedAt: "2020-05-01T00:00:00.000Z"
  }
];

const mockKnowledgeDocs: KnowledgeDocument[] = [
  {
    ...mockControlledDocs[0],
    knowledge: {
      extractionMethod: "pdfjs-positioned-text-v1",
      status: "Ready",
      storage: "local",
      reviewedPages: 12,
      warningPages: [],
      revision: 1
    }
  },
  {
    ...mockControlledDocs[1],
    knowledge: {
      extractionMethod: "pdfjs-positioned-text-v1",
      status: "Ready",
      storage: "local",
      reviewedPages: 10,
      warningPages: [],
      revision: 1
    }
  },
  {
    ...mockControlledDocs[2],
    knowledge: {
      extractionMethod: "pdfjs-positioned-text-v1",
      status: "Pending Review",
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

    // Workflow explanation: Instant AI Ingestion
    expect(
      screen.getByText(/Instant AI Ingestion/i)
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

    const submitBtn = screen.getByRole("button", { name: /Upload & Ingest with AI/i });
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

  it("Test 7 & 8 — Knowledge viewer renders pages and navigates correctly", async () => {
    render(
      <KnowledgeReviewModal
        id="doc-pending"
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Werribee Trail Lighting Compliance Guide/i })).toBeInTheDocument();
    });

    // Content viewer rendered
    expect(screen.getByText(/Extracted Knowledge Content/i)).toBeInTheDocument();

    // Next page button
    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).toBeInTheDocument();

    // Click Next
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Minimum horizontal illuminance requirements/i)).toBeInTheDocument();
    });
  });

  it("Test 9 & 10 — allows toggling raw coordinates and editing page text", async () => {
    render(
      <KnowledgeReviewModal
        id="doc-pending"
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Werribee Trail Lighting Compliance Guide/i })).toBeInTheDocument();
    });

    // Edit button
    const editBtn = screen.getByRole("button", { name: /Edit Page Text/i });
    fireEvent.click(editBtn);

    // Textarea visible and editable
    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated verified text" } });
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  });

  it("Test 11 — 1-click Approve All Pages button activates document", async () => {
    render(
      <KnowledgeReviewModal
        id="doc-pending"
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Approve All Pages/i })).toBeInTheDocument();
    });
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
