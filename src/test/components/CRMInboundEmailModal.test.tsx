import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMInboundEmailModal } from '../../components/crm/CRMInboundEmailModal';
import { AppProvider, useApp } from '../../context/AppContext';
import { InboundEmailParseResult, Account, CRMOpportunity, CRMContact } from '../../types/crm';

const mockAccount: Account = {
  id: "acc-cardinia-test",
  name: "Cardinia Shire Council",
  status: "Customer",
  industry: "Local Government",
  territory: "VIC/TAS",
  accountOwner: "Marcus Vance",
  createdDate: "2026-01-01",
  accountType: "Council",
  customerRelationshipStatus: "Active"
};

const mockContact: CRMContact = {
  id: "con-david-test",
  accountId: "acc-cardinia-test",
  accountName: "Cardinia Shire Council",
  firstName: "David",
  lastName: "Smith",
  jobTitle: "Senior Infrastructure Asset Manager",
  email: "david.smith@cardinia.vic.gov.au",
  contactOwner: "Marcus Vance",
  role: "Decision Maker",
  preferredContactMethod: "Email"
};

const mockDeal: CRMOpportunity = {
  id: "opp-cardinia-test",
  accountId: "acc-cardinia-test",
  accountName: "Cardinia Shire Council",
  name: "Shared Trail Solar Lighting",
  stageId: "stage-quote-sent",
  stageName: "Quote / Proposal Sent",
  pipelineId: "pipe-trail",
  dealValue: 55000,
  weightedValue: 33000,
  probability: 60,
  forecastCategory: "Likely",
  expectedCloseDate: "2026-10-31",
  products: [],
  daysInCurrentStage: 4,
  totalDealAgeDays: 14,
  dealHealth: "Healthy",
  dealHealthReasons: []
};

const InboundEmailHarness: React.FC<{ initialText?: string }> = ({ initialText }) => {
  const { openInboundEmailModal, addAccount, addContact, addCrmOpportunity, activities } = useApp();

  React.useEffect(() => {
    addAccount(mockAccount);
    addContact(mockContact);
    addCrmOpportunity(mockDeal);
  }, []);

  return (
    <div>
      <button
        type="button"
        data-testid="open-email-modal-btn"
        onClick={() => openInboundEmailModal({ initialText })}
      >
        Open Email Ingestion Modal
      </button>
      <div data-testid="activities-count">{activities.length}</div>
      <CRMInboundEmailModal />
    </div>
  );
};

describe('CRMInboundEmailModal Component Suite', () => {
  const mockEmailParseResult: InboundEmailParseResult = {
    senderEmail: "david.smith@cardinia.vic.gov.au",
    senderName: "David Smith",
    recipientEmail: "marcus.vance@plasgain.com.au",
    emailDate: "2026-09-04",
    subject: "Re: Plasgain Quotation Q-2026-892 - Shared Trail Lighting",
    summary: "Engineering committee reviewed DIALux photometrics and approved 3000K optics. Tender to be released in October.",
    sentiment: "Positive",
    matchedAccount: {
      id: "acc-cardinia-test",
      name: "Cardinia Shire Council",
      confidence: 0.95,
      sourcePhrase: "Cardinia Shire Council"
    },
    matchedOpportunity: {
      id: "opp-cardinia-test",
      name: "Shared Trail Solar Lighting",
      confidence: 0.9,
      sourcePhrase: "Shared Trail Lighting"
    },
    matchedContact: {
      id: "con-david-test",
      name: "David Smith",
      email: "david.smith@cardinia.vic.gov.au",
      confidence: 0.95,
      sourcePhrase: "David Smith"
    },
    clientCommitments: [
      {
        text: "The formal Council tender will be released in October.",
        date: "2026-10-01",
        sourcePhrase: "released in October"
      }
    ],
    clientObjectionsOrConcerns: [],
    suggestedNextAction: "Follow up David Smith ahead of October Council tender release",
    suggestedNextActionDate: "2026-10-01",
    suggestedNextActionPhrase: "released in October",
    stageRecommendation: {
      targetStageId: "stage-quote-sent",
      targetStageName: "Quote / Proposal Sent",
      reason: "Council tender proceeding in October",
      sourcePhrase: "tender"
    }
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    global.fetch = vi.fn().mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/crm/parse-inbound-email')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockEmailParseResult
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({})
      } as Response;
    });
  });

  it('renders closed by default, and opens with header and subtitle when triggered', () => {
    render(
      <AppProvider>
        <InboundEmailHarness />
      </AppProvider>
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('open-email-modal-btn'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText("Ingest Inbound Email")).toBeInTheDocument();
    expect(screen.getByText(/AI Extraction & Provenance/i)).toBeInTheDocument();
  });

  it('populates raw text from quick test sample presets', () => {
    render(
      <AppProvider>
        <InboundEmailHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-email-modal-btn'));

    const presetButton = screen.getByText(/Cardinia Shire · Tender Commitment/i);
    expect(presetButton).toBeInTheDocument();

    fireEvent.click(presetButton);

    const textarea = screen.getByPlaceholderText(/Paste inbound email text here/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('david.smith@cardinia.vic.gov.au');
    expect(textarea.value).toContain('Quotation Q-2026-892');
  });

  it('analyzes email, transitions to Proposed Changes Diff, and displays attributed intelligence', async () => {
    render(
      <AppProvider>
        <InboundEmailHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-email-modal-btn'));

    // Select preset and click analyze
    fireEvent.click(screen.getByText(/Cardinia Shire · Tender Commitment/i));

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Inbound Email/i });
    fireEvent.click(analyzeBtn);

    // Should transition to step 2 (diff view)
    await waitFor(() => {
      expect(screen.getByText(/Review extracted commitments and CRM updates/i)).toBeInTheDocument();
    });

    // Check attributed metadata
    expect(screen.getByText(/Sentiment: Positive/i)).toBeInTheDocument();
    expect(screen.getByText(/Re: Plasgain Quotation Q-2026-892 - Shared Trail Lighting/i)).toBeInTheDocument();

    // Check matched entities
    expect(screen.getByText("Target Account")).toBeInTheDocument();
    expect(screen.getByText("Linked Opportunity")).toBeInTheDocument();
    expect(screen.getByText("Sender Contact")).toBeInTheDocument();

    // Check extracted commitment with quote attribution
    expect(screen.getByText(/The formal Council tender will be released in October/i)).toBeInTheDocument();
    expect(screen.getByText(/Attribution: "released in October"/i)).toBeInTheDocument();

    // Check confirm button
    expect(screen.getByRole('button', { name: /Confirm & Apply Changes/i })).toBeInTheDocument();
  });

  it('applies confirmed diff, logs activity with AI provenance, and closes modal', async () => {
    render(
      <AppProvider>
        <InboundEmailHarness />
      </AppProvider>
    );

    const initialActivitiesCount = parseInt(screen.getByTestId('activities-count').textContent || '0', 10);

    fireEvent.click(screen.getByTestId('open-email-modal-btn'));
    fireEvent.click(screen.getByText(/Cardinia Shire · Tender Commitment/i));
    fireEvent.click(screen.getByRole('button', { name: /Analyze Inbound Email/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm & Apply Changes/i })).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Apply Changes/i });
    fireEvent.click(confirmBtn);

    // Modal should close and activity count should increment
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      const newCount = parseInt(screen.getByTestId('activities-count').textContent || '0', 10);
      expect(newCount).toBe(initialActivitiesCount + 1);
    });
  });
});
