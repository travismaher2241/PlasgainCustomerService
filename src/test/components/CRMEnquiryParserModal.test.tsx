import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMEnquiryParserModal } from '../../components/crm/CRMEnquiryParserModal';
import { AppProvider, useApp } from '../../context/AppContext';

const EnquiryParserHarness: React.FC<{ initialText?: string; seedAccount?: boolean }> = ({ initialText, seedAccount }) => {
  const { openEnquiryParser, leads, addAccount } = useApp();

  React.useEffect(() => {
    if (seedAccount) {
      addAccount({
        id: "acc-wyndham-test",
        name: "Wyndham City Council",
        accountType: "Council",
        status: "Customer",
        industry: "Government & Public Infrastructure",
        customerSegment: "Local Government / Council",
        territory: "VIC/TAS",
        accountOwner: "Travis Maher",
        leadSource: "Tender Portal",
        createdDate: "2026-01-01",
        lastInteractionDate: "2026-03-01",
        metrics: {
          openPipelineValue: 50000,
          totalDealsWon: 1,
          activeDealsCount: 1,
          totalEnquiries: 2
        }
      });
    }
  }, [seedAccount]);

  return (
    <div>
      <button
        type="button"
        data-testid="open-parser-modal-btn"
        onClick={() => openEnquiryParser(initialText)}
      >
        Open Parser Modal
      </button>
      <div data-testid="leads-count">{leads.length}</div>
      <CRMEnquiryParserModal />
    </div>
  );
};

describe('CRMEnquiryParserModal Component', () => {
  const mockEnquiryResult = {
    rawEnquiryText: "Tender notice Wyndham City Council 14x solar pathway lights",
    company: {
      value: "Wyndham City Council",
      sourcePhrase: "Wyndham City Council"
    },
    contact: {
      name: "David Henderson",
      email: "d.henderson@wyndham.vic.gov.au",
      phone: "(03) 9742 0777",
      jobTitle: "Senior Project Engineer",
      sourcePhrase: "David Henderson"
    },
    project: {
      leadName: "Wyndham City Council - 14x Solar Shared Trail Lighting",
      enquiryType: "Solar Pathway Lighting",
      location: "Werribee VIC 3030",
      territory: "VIC/TAS",
      sourcePhrase: "Werribee River Trail"
    },
    scope: {
      quantity: 14,
      productInterest: ["Solar Pathway Lighting (14 units)"],
      sourcePhrase: "14x integrated solar pathway lighting columns"
    },
    commercial: {
      deadline: "2026-10-15",
      urgency: "Within 1 Month",
      estimatedValue: 65000,
      estimatedValueBasis: "Estimate",
      sourcePhrase: "$65,000 AUD"
    },
    nextAction: {
      action: "Submit technical compliance sheet & formal quotation",
      date: "2026-09-10",
      sourcePhrase: "submit technical compliance sheet"
    },
    summaryNotes: "Shared path lighting project along Werribee River. Category PP4 compliance required."
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    global.fetch = vi.fn().mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/crm/parse-enquiry')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockEnquiryResult
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({})
      } as Response;
    });
  });

  it('renders closed by default, and opens when triggered', () => {
    render(
      <AppProvider>
        <EnquiryParserHarness />
      </AppProvider>
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('open-parser-modal-btn'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Inbound Enquiry to Lead/i)).toBeInTheDocument();
  });

  it('populates raw text from preset sample button', () => {
    render(
      <AppProvider>
        <EnquiryParserHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-parser-modal-btn'));

    const samplePresetBtn = screen.getByText(/Wyndham Council \(14x Solar Trail\)/i);
    fireEvent.click(samplePresetBtn);

    const textarea = screen.getByLabelText(/Raw Enquiry Text/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Wyndham City Council');
  });

  it('extracts structured lead, displays source phrase attributions and duplicate warning', async () => {
    render(
      <AppProvider>
        <EnquiryParserHarness initialText="Wyndham tender enquiry text" seedAccount={true} />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('open-parser-modal-btn'));

    const extractBtn = screen.getByRole('button', { name: /Extract Structured Lead/i });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(screen.getByText(/Proposed Structured Lead/i)).toBeInTheDocument();
    });

    // Verify company and contact rendered in inputs
    expect(screen.getByDisplayValue('Wyndham City Council')).toBeInTheDocument();
    expect(screen.getByDisplayValue('David Henderson')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14')).toBeInTheDocument();

    // Verify phrase attribution quote rendered
    expect(screen.getByText(/"14x integrated solar pathway lighting columns"/i)).toBeInTheDocument();

    // Verify potential duplicate detection banner appears for Wyndham (existing account in demo state)
    expect(screen.getByText(/Potential CRM Duplicate Detected/i)).toBeInTheDocument();
  });

  it('creates a new lead and increments lead count when saved', async () => {
    render(
      <AppProvider>
        <EnquiryParserHarness initialText="Wyndham tender text" />
      </AppProvider>
    );

    const initialCount = parseInt(screen.getByTestId('leads-count').textContent || '0', 10);

    fireEvent.click(screen.getByTestId('open-parser-modal-btn'));
    fireEvent.click(screen.getByRole('button', { name: /Extract Structured Lead/i }));

    await waitFor(() => {
      expect(screen.getByText(/Proposed Structured Lead/i)).toBeInTheDocument();
    });

    // Click "Create Lead"
    const saveBtn = screen.getByRole('button', { name: /^Create Lead$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      const newCount = parseInt(screen.getByTestId('leads-count').textContent || '0', 10);
      expect(newCount).toBe(initialCount + 1);
    });
  });
});
