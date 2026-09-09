import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMQuoteImportModal } from '../../components/crm/CRMQuoteImportModal';
import { AppProvider, useApp } from '../../context/AppContext';
import * as opportunityClient from '../../api/opportunityClient';

vi.mock('../../utils/apiClient', async (orig) => {
  const actual = await (orig() as any);
  return {
    ...actual,
    apiPost: vi.fn(async (path: string) => {
      if (path === '/api/quotes/import-pdf') {
        return {
          document: { id: 'doc-1', fileName: 'q.pdf', sizeBytes: 10 },
          parsed: {
            quoteNumber: 'Q-1001',
            quoteDate: '2026-09-01',
            customerName: 'Alpha Industrial',
            projectName: 'Depot Lighting',
            lineItems: [],
            nettTotal: 5000,
            warnings: []
          }
        };
      }
      return {};
    })
  };
});

const Probe: React.FC = () => {
  const { openQuoteImport, addAccount, crmOpportunities, activities } = useApp();
  React.useEffect(() => {
    addAccount({
      id: 'acc-alpha', name: 'Alpha Industrial', accountType: 'Account',
      territory: 'VIC/TAS', accountOwner: 'Travis Maher', tags: []
    } as any);
    openQuoteImport();
  }, []);
  return (
    <div>
      <div data-testid="deals">
        {JSON.stringify(crmOpportunities.map((d: any) => ({ accountId: d.accountId })))}
      </div>
      <div data-testid="activities">{JSON.stringify(activities)}</div>
      <CRMQuoteImportModal />
    </div>
  );
};

const uploadAndReachReview = async () => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array([1, 2, 3])], 'q.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText('Save against')).toBeInTheDocument());
};

describe('Quote import — saving against the account', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('links the imported quote to the matched account', async () => {
    render(<AppProvider><Probe /></AppProvider>);
    await uploadAndReachReview();

    expect((screen.getByLabelText('Save against') as HTMLSelectElement).value).toBe('acc-alpha');
    fireEvent.click(screen.getByRole('button', { name: /save the quote/i }));

    await waitFor(() => {
      const deals = JSON.parse(screen.getByTestId('deals').textContent || '[]');
      expect(deals).toEqual([{ accountId: 'acc-alpha' }]);
    });
  });

  it('files the quote without writing to the customer discussion timeline', async () => {
    render(<AppProvider><Probe /></AppProvider>);
    await uploadAndReachReview();

    fireEvent.click(screen.getByRole('button', { name: /save the quote/i }));

    await waitFor(() => {
      const deals = JSON.parse(screen.getByTestId('deals').textContent || '[]');
      expect(deals).toHaveLength(1);
    });

    // Importing a PDF is not a conversation with the customer, and must not
    // reset the contact-overdue clock on an account nobody has spoken to.
    expect(JSON.parse(screen.getByTestId('activities').textContent || '[]')).toEqual([]);
  });

  it('reports a failed write instead of claiming the quote was saved', async () => {
    // What production was actually doing: the API 500s, so nothing is stored.
    vi.spyOn(opportunityClient, 'createOpportunityApi').mockRejectedValue(
      new Error('Failed to create opportunity: HTTP 500')
    );

    render(<AppProvider><Probe /></AppProvider>);
    await uploadAndReachReview();

    fireEvent.click(screen.getByRole('button', { name: /save the quote/i }));

    // The modal stays open and says so, rather than announcing success.
    await waitFor(() =>
      expect(screen.getByText(/could not be saved/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/saved to Alpha Industrial/i)).not.toBeInTheDocument();
  });
});
