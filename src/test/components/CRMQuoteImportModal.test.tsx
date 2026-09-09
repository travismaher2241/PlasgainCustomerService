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

const Probe: React.FC<{ fromAccountId?: string }> = ({ fromAccountId }) => {
  const { openQuoteImport, addAccount, crmOpportunities, activities } = useApp();
  React.useEffect(() => {
    addAccount({
      id: 'acc-alpha', name: 'Alpha Industrial', accountType: 'Account',
      territory: 'VIC/TAS', accountOwner: 'Travis Maher', tags: []
    } as any);
    addAccount({
      id: 'acc-healey', name: 'Healey Infrastructure Group Pty Ltd', accountType: 'Account',
      territory: 'National', accountOwner: 'Alan Berryman', tags: []
    } as any);
    openQuoteImport(fromAccountId);
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

  const saveAndWaitForCompletion = async () => {
    fireEvent.click(screen.getByRole('button', { name: /save the quote/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /import a quote pdf/i })).not.toBeInTheDocument()
    );
    expect(JSON.parse(screen.getByTestId('deals').textContent || '[]')).toHaveLength(1);
    return JSON.parse(screen.getByTestId('activities').textContent || '[]');
  };

  it('files against the account the import was started from', async () => {
    // Opened from Healey's page, while the PDF names Alpha Industrial: the page
    // the rep was on is the stronger signal, and it must win over the name.
    render(<AppProvider><Probe fromAccountId="acc-healey" /></AppProvider>);
    await uploadAndReachReview();

    expect((screen.getByLabelText('Save against') as HTMLSelectElement).value).toBe('acc-healey');
    expect(screen.getByText(/account you opened this from/i)).toBeInTheDocument();
    // Addressed elsewhere, so it says so rather than quietly filing it.
    expect(screen.getByText(/does not look like this account/i)).toBeInTheDocument();
  });

  it('logs a quote that has gone to the customer as a touchpoint', async () => {
    render(<AppProvider><Probe /></AppProvider>);
    await uploadAndReachReview();

    // "Already sent to client" is on by default.
    const activities = await saveAndWaitForCompletion();

    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe('quote_sent');
    expect(activities[0].accountId).toBe('acc-alpha');
    // Dated when the customer received it, not when the PDF was filed.
    expect(activities[0].timestamp).toContain('2026-09-01');
  });

  it('does not log a touchpoint for a draft that never reached the customer', async () => {
    render(<AppProvider><Probe /></AppProvider>);
    await uploadAndReachReview();

    fireEvent.click(screen.getByRole('checkbox', { name: /already sent to client/i }));

    // Nobody has been contacted, so nothing may reset the contact-overdue clock.
    expect(await saveAndWaitForCompletion()).toEqual([]);
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
