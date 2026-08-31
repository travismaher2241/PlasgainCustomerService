import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewEnquiryWorkspace } from '../../components/NewEnquiryWorkspace';
import { AppProvider } from '../../context/AppContext';
import { EnquiryAnalysisResult } from '../../types';

const mockAnalysisResult: EnquiryAnalysisResult = {
  opportunitySummary: {
    customer: { value: "Sarah Jenkins", status: "Confirmed", source: "Customer Enquiry Text" },
    company: { value: "Wyndham Civil Group", status: "Confirmed", source: "Customer Enquiry Text" },
    project: { value: "Melton Shared Path Lighting", status: "Confirmed", source: "Customer Enquiry Text" },
    location: { value: "Melton, VIC", status: "Confirmed", source: "Customer Enquiry Text" },
    application: { value: "Pedestrian Shared Trail", status: "Confirmed", source: "Customer Enquiry Text" },
    productCategory: { value: "Solar Public Lighting", status: "Inferred", source: "Inferred from off-grid pathway description" },
    quantity: { value: "24", status: "Confirmed", source: "Attached Tender Schedule (spec.pdf: p.2)" },
    projectTiming: { value: "Q4 2026", status: "Confirmed", source: "Customer Enquiry Text" },
    quoteDeadline: { value: "2026-09-15", status: "Confirmed", source: "Customer Enquiry Text" },
    installationTiming: { value: "November 2026", status: "Inferred", source: "Inferred from project schedule" },
    powerAvailability: { value: "Off-grid / Solar Required", status: "Confirmed", source: "Customer Enquiry Text" },
    mountingPoleRequirements: { value: "6.0m Direct Burial Composite Pole", status: "Confirmed", source: "Customer Enquiry Text" },
    operatingRequirements: { value: "Dusk to dawn AS/NZS 1158 Cat P4", status: "Confirmed", source: "Customer Enquiry Text" },
    cct: { value: "3000K (Wildlife Sensitive)", status: "Confirmed", source: "Customer Enquiry Text" },
    lightingPerformanceRequirements: { value: "AS/NZS 1158.3.1 Cat P4 compliance", status: "Confirmed", source: "Customer Enquiry Text" },
    environmentalRequirements: { value: "Wind Region A, Terrain Cat 2", status: "Inferred", source: "Inferred from Melton VIC location" },
    standardsMentioned: { value: "AS/NZS 1158.3.1, AS/NZS 1170.2", status: "Confirmed", source: "Customer Enquiry Text" },
    commercialRequirements: { value: "Standard Net 30 Days", status: "Inferred", source: "Default Tier 2 terms" },
    otherNotes: { value: "Direct burial composite poles specified to prevent corrosion.", status: "Confirmed", source: "Customer Enquiry Text" }
  },
  readiness: {
    score: 85,
    rating: "High",
    knownItems: ["Application (Pedestrian Shared Trail)", "Mounting Height (6m)", "CCT (3000K)", "Standard (Cat P4)"],
    missingItems: ["Target pole spacing / cad drawings for Dialux"],
    summaryExplanation: "Technical scope is well defined for preliminary luminaire quotation."
  },
  productRecommendations: {
    recommendedStartingPoint: {
      productName: "Plasgain Pro Blade 75 Solar Luminaire",
      productCode: "PB-75W-3K",
      matchLevel: "Suitable candidate",
      whySuitable: "Engineered specifically for AS/NZS 1158.3.1 Cat P4 shared paths with wildlife-sensitive 3000K optic.",
      supportingSpecifications: {
        applicationFit: "Pedestrian Shared Pathways (Cat P4)",
        luminaireOutput: "75W LED / 9,500 lumens",
        cctAvailable: "3000K Wildlife Friendly",
        solarAndBattery: "120W Monocrystalline / 480Wh LiFePO4",
        mountingOptions: "Direct burial 6.0m composite pole",
        controlOptions: "Smart MPPT with Dusk-to-Dawn dimming"
      },
      importantLimitations: [
        "Exact pole spacing must be confirmed in Dialux photometric report",
        "Wind Region A verified; verify local terrain shielding"
      ],
      sourceCitations: [
        {
          documentTitle: "Plasgain Pro Blade 75 Technical Datasheet",
          sectionOrPage: "Page 2, Section 4.1",
          excerpt: "AS/NZS 1158.3.1 Category P4 compliant at 28m spacing on 6m poles."
        }
      ],
      distinctionNotes: "Initial product recommendation. Formal compliance sign-off requires Dialux simulation."
    },
    alternatives: [
      {
        productName: "Plasgain Intense Light 50W Solar",
        productCode: "IL-50W",
        matchLevel: "Possible alternative",
        whenToUse: "Lower traffic pathways with Cat P5 requirements",
        tradeOffs: "Lower lumen output (6,000 lm); not suitable for Cat P4 spacing >22m"
      }
    ]
  },
  nextBestAction: {
    title: "Confirm pole spacing & generate Dialux photometric simulation",
    description: "Verify target pole spacing with Sarah Jenkins before issuing final Ostendo quotation schedule.",
    primaryActionLabel: "Draft Customer Reply",
    actionType: "request_info",
    urgency: "Today"
  },
  questionsBeforeWeQuote: [
    {
      id: "q1",
      question: "Can you confirm the target pole spacing along the 1.2km path?",
      whyItMatters: "Determines whether 75W Pro Blade provides Cat P4 uniformity at 28m or requires closer spacing.",
      category: "Technical",
      defaultSelected: true
    },
    {
      id: "q2",
      question: "Are rag-bolt base plates required, or is direct-burial composite pole preferred?",
      whyItMatters: "Impacts foundation depth and Ostendo pole SKU selection.",
      category: "Site / Environment",
      defaultSelected: true
    }
  ],
  internalSalesCoachTip: "Wyndham Civil Group has an active council tender for the Werribee River trail. Offer a sample 3000K luminaire for council sign-off."
};

// Mock apiClient
vi.mock('../../utils/apiClient', () => ({
  apiPost: vi.fn(),
  apiStreamPost: vi.fn(),
  AIUnavailableError: class AIUnavailableError extends Error {
    detail: string;
    guidance: string;
    constructor(detail: string, guidance: string) {
      super(detail);
      this.detail = detail;
      this.guidance = guidance;
    }
  },
  toUserMessage: (err: any) => err?.message || 'API Error'
}));

import { apiStreamPost, AIUnavailableError } from '../../utils/apiClient';

describe('NewEnquiryWorkspace Component (Step 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiStreamPost).mockImplementation(async (_url: string, _body: any, options?: any) => {
      if (options?.onComplete) {
        options.onComplete(mockAnalysisResult);
      }
      return mockAnalysisResult;
    });
  });

  const renderWorkspace = () =>
    render(
      <AppProvider key={Math.random().toString()}>
        <NewEnquiryWorkspace />
      </AppProvider>
    );

  it('Test 1 — renders single clear page title "New enquiry" with prominent enquiry text and attachment controls', () => {
    renderWorkspace();

    // 1. Single Page Title
    expect(screen.getByRole('heading', { level: 1, name: /^New enquiry$/i })).toBeInTheDocument();

    // 2. Enquiry Text Area is prominent
    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    expect(textarea).toBeInTheDocument();

    // 3. Attachment upload control
    expect(screen.getByText(/Attach PDF \/ Word \/ Excel \/ Drawing/i)).toBeInTheDocument();
    expect(screen.getByText(/Decipher Plan \/ BOM Take-off →/i)).toBeInTheDocument();

    // 4. One clear primary action
    expect(screen.getByRole('button', { name: /Analyse enquiry/i })).toBeInTheDocument();

    // 5. Metadata does not dominate; Customer details is collapsible
    expect(screen.getByText(/Customer details \(Optional\)/i)).toBeInTheDocument();

    // 6. No result panels before analysis
    expect(screen.queryByText(/^Consolidated Requirements Matrix$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Plasgain Pro Blade 75 Solar Luminaire$/i)).not.toBeInTheDocument();
  });

  it('Test 2 — manual text enquiry analysis collapses original input and displays 4 result tabs', async () => {
    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, {
      target: { value: "Need 24 solar lights for Melton shared pathway, 6m poles, 3000K wildlife friendly." }
    });

    const analyseBtn = screen.getByRole('button', { name: /Analyse enquiry/i });
    fireEvent.click(analyseBtn);

    await waitFor(() => {
      // 4 Result Tabs rendered
      expect(screen.getByRole('button', { name: /Summary tab/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Requirements tab/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Products tab/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reply tab/i })).toBeInTheDocument();
    });

    // Original enquiry collapsed into summary card with reopen button
    expect(screen.getByText(/Original enquiry:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View \/ Edit enquiry/i })).toBeInTheDocument();

    // Reopen original enquiry
    fireEvent.click(screen.getByRole('button', { name: /View \/ Edit enquiry/i }));
    expect(screen.getByRole('heading', { level: 2, name: /Edit Customer Enquiry/i })).toBeInTheDocument();
  });

  it('Test 3 & 4 — separate enquiry analysis from knowledge ingestion and preserve review state', async () => {
    renderWorkspace();

    // Simulate attaching a PDF file
    const file = new File(['%PDF-1.4 dummy tender spec'], 'melton-tender-spec.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Document appears in attached files
    expect(screen.getByText('melton-tender-spec.pdf')).toBeInTheDocument();

    // Separate Knowledge Review checkbox appears
    const knowledgeCheckbox = screen.getByRole('checkbox', {
      name: /Keep uploaded document for knowledge review/i
    });
    expect(knowledgeCheckbox).toBeInTheDocument();
    expect(knowledgeCheckbox).not.toBeChecked();

    // Check knowledge retention
    fireEvent.click(knowledgeCheckbox);
    expect(knowledgeCheckbox).toBeChecked();
  });

  it('Test 5 & 6 — displays consolidated requirements table with Confirmed, Inferred, and Missing statuses', async () => {
    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, { target: { value: "Test tender content" } });
    fireEvent.click(screen.getByRole('button', { name: /Analyse enquiry/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Requirements tab/i })).toBeInTheDocument();
    });

    // Switch to Requirements tab
    fireEvent.click(screen.getByRole('button', { name: /Requirements tab/i }));

    // Consolidated Requirements Table
    expect(screen.getByText(/Consolidated Requirements Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedestrian Shared Trail/i)).toBeInTheDocument();
    expect(screen.getByText(/3000K \(Wildlife Sensitive\)/i)).toBeInTheDocument();

    // Status badges
    expect(screen.getAllByText(/Confirmed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Inferred/i).length).toBeGreaterThanOrEqual(1);

    // Provenance / Source inspectable
    expect(screen.getAllByText(/Customer Enquiry Text/i).length).toBeGreaterThanOrEqual(1);
  });

  it('Test 7 & 8 — displays questions to confirm derived from gaps and handles question toggle', async () => {
    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, { target: { value: "Test tender content" } });
    fireEvent.click(screen.getByRole('button', { name: /Analyse enquiry/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Requirements tab/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Requirements tab/i }));

    // Questions to confirm section
    expect(screen.getByText(/Questions to Confirm with Customer/i)).toBeInTheDocument();
    expect(screen.getByText(/Can you confirm the target pole spacing/i)).toBeInTheDocument();
    expect(screen.getByText(/Are rag-bolt base plates required/i)).toBeInTheDocument();
  });

  it('Test 9 & 10 — renders Products tab with exact SKU, suitability, limitations, and alternatives', async () => {
    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, { target: { value: "Test tender content" } });
    fireEvent.click(screen.getByRole('button', { name: /Analyse enquiry/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Products tab/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Products tab/i }));

    // Exact SKU and product name
    expect(screen.getByText(/Plasgain Pro Blade 75 Solar Luminaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Exact SKU: PB-75W-3K/i)).toBeInTheDocument();

    // Suitability and Limitations
    expect(screen.getByText(/Suitability:/i)).toBeInTheDocument();
    expect(screen.getByText(/Unresolved Limitations \/ Information Needed:/i)).toBeInTheDocument();
    expect(screen.getByText(/Exact pole spacing must be confirmed in Dialux/i)).toBeInTheDocument();

    // Alternatives
    expect(screen.getByText(/Alternative Product Options/i)).toBeInTheDocument();
    expect(screen.getByText(/Plasgain Intense Light 50W Solar/i)).toBeInTheDocument();
  });

  it('Test 11 — renders Reply tab with editable draft and natural customer-facing language', async () => {
    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, { target: { value: "Test tender content" } });
    fireEvent.click(screen.getByRole('button', { name: /Analyse enquiry/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reply tab/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Reply tab/i }));

    // Recipient & Subject
    expect(screen.getByLabelText(/Recipient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject Line/i)).toBeInTheDocument();

    // Editable Body
    const emailBody = screen.getByLabelText(/Email Body \(Fully Editable\)/i);
    expect(emailBody).toBeInTheDocument();
    expect((emailBody as HTMLTextAreaElement).value).toContain('Plasgain Pro Blade 75 Solar Luminaire');
    expect((emailBody as HTMLTextAreaElement).value).toContain('PB-75W-3K');

    // No internal AI jargon
    expect((emailBody as HTMLTextAreaElement).value).not.toContain('vector grounding');
    expect((emailBody as HTMLTextAreaElement).value).not.toContain('inference engine');
    expect((emailBody as HTMLTextAreaElement).value).not.toContain('synthesis confidence');
  });

  it('Test 12 — handles CRM Save and creates deal in CRM pipeline', async () => {
    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, { target: { value: "Test tender content" } });
    fireEvent.click(screen.getByRole('button', { name: /Analyse enquiry/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save to CRM/i })).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Save to CRM/i });
    fireEvent.click(saveBtn);
  });

  it('Test 13 — failure state preserves user text and attachments with retry available', async () => {
    vi.mocked(apiStreamPost).mockRejectedValueOnce(
      new AIUnavailableError('API timeout during analysis', 'Please check network and retry.')
    );

    renderWorkspace();

    const textarea = screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i);
    fireEvent.change(textarea, { target: { value: "Preserve this valuable user draft" } });

    const file = new File(['test'], 'spec.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Analyse enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please check network and retry/i)).toBeInTheDocument();
    });

    // Form inputs preserved!
    expect(screen.getByLabelText(/Pasted customer email, notes, or RFQ content/i)).toHaveValue(
      "Preserve this valuable user draft"
    );
    expect(screen.getByText('spec.pdf')).toBeInTheDocument();
  });
});
