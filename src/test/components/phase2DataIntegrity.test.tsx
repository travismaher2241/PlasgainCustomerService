import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppProvider, useApp } from '../../context/AppContext';
import { CRMQuickLogModal } from '../../components/crm/CRMQuickLogModal';
import { CRMAccountsView } from '../../components/crm/CRMAccountsView';
import { CRMDealDetailsWorkspace } from '../../components/crm/CRMDealDetailsWorkspace';
import { HomeDashboard } from '../../components/HomeDashboard';
import { makeAccount, makeOpportunity } from '../factories';

describe('Phase 2 — Wrong data and invented data tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('2.1 — Activities logged without a deal stay at account level and do not inherit unrelated deals', () => {
    const TestComponent: React.FC = () => {
      const { openQuickLog, addAccount, addCrmOpportunity } = useApp();

      React.useEffect(() => {
        addAccount(
          makeAccount({
            id: 'acc-1',
            name: 'Target Account',
            accountType: 'Customer'
          })
        );
        addAccount(
          makeAccount({
            id: 'acc-2',
            name: 'Other Account',
            accountType: 'Customer'
          })
        );
        addCrmOpportunity(
          makeOpportunity({
            id: 'opp-other',
            name: 'Other Account Deal',
            accountId: 'acc-2',
            accountName: 'Other Account'
          })
        );
      }, []);

      return (
        <div>
          <button
            data-testid="log-acc-1"
            onClick={() => openQuickLog({ type: 'call', accountId: 'acc-1' })}
          >
            Log for Acc 1
          </button>
          <button
            data-testid="log-mismatch"
            onClick={() => openQuickLog({ type: 'call', accountId: 'acc-1', opportunityId: 'opp-other' })}
          >
            Log Mismatch
          </button>
          <CRMQuickLogModal />
        </div>
      );
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Open log for Acc 1 without opportunityId
    fireEvent.click(screen.getByTestId('log-acc-1'));
    expect(screen.getByText('Target Account')).toBeInTheDocument();
    // Does NOT attach Other Account Deal
    expect(screen.queryByText('Other Account Deal')).not.toBeInTheDocument();

    // Close and try mismatch log (attempting to attach opp from acc-2 to acc-1)
    fireEvent.click(screen.getByRole('button', { name: /Close dialog/i }));
    fireEvent.click(screen.getByTestId('log-mismatch'));
    expect(screen.getByText('Target Account')).toBeInTheDocument();
    expect(screen.queryByText('Other Account Deal')).not.toBeInTheDocument();
  });

  it('2.2 — Deal details renders visible Back to deals button', () => {
    const onCloseMock = () => {};
    const deal = makeOpportunity({
      id: 'deal-1',
      name: 'Sample Test Deal',
      accountId: 'acc-1',
      accountName: 'Target Account'
    });

    render(
      <AppProvider>
        <CRMDealDetailsWorkspace deal={deal} onClose={onCloseMock} />
      </AppProvider>
    );

    const backButton = screen.getByRole('button', { name: /Back to deals/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveTextContent('← Back to deals');
  });

  it('2.3 — Customer accounts render a Customer badge instead of Prospect', () => {
    const TestComponent: React.FC = () => {
      const { addAccount } = useApp();
      React.useEffect(() => {
        addAccount(
          makeAccount({
            id: 'acc-customer-test',
            name: 'Acme Civils Pty Ltd',
            accountType: 'Customer',
            status: 'Customer'
          })
        );
      }, []);

      return <CRMAccountsView />;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Customer badge should exist
    const customerBadges = screen.getAllByText('Customer');
    expect(customerBadges.length).toBeGreaterThan(0);
  });

  it('2.4 — Uncosted deals display Not costed for Est. COGS, gross margin, and weighted pipeline', () => {
    const uncostedDeal = makeOpportunity({
      id: 'deal-uncosted-1',
      name: 'Uncosted Solar Lighting',
      dealValue: 50000,
      totalCostValue: undefined,
      grossMarginPercent: undefined,
      products: []
    });

    render(
      <AppProvider>
        <CRMDealDetailsWorkspace deal={uncostedDeal} />
      </AppProvider>
    );

    // Not costed must appear for gross margin and Est. COGS
    const notCostedElements = screen.getAllByText(/Not costed/i);
    expect(notCostedElements.length).toBeGreaterThanOrEqual(2);
    // Hardcoded 36% must NOT be displayed
    expect(screen.queryByText(/36% Target Gross Margin/i)).not.toBeInTheDocument();
  });

  it('2.5 & 2.6 — Quick quote creation modal has blank name and value, zero product lines, and Target Close Date label', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // Click New quote
    fireEvent.click(screen.getByRole('button', { name: /New quote/i }));

    // Quote dialog opens
    expect(screen.getByRole('dialog', { name: /Create New Quote/i })).toBeInTheDocument();

    // Name and value inputs must be blank
    const nameInput = screen.getByPlaceholderText(/Stage 2 Pathway Solar Lighting/i) as HTMLInputElement;
    expect(nameInput.value).toBe('');

    const valueInput = screen.getByPlaceholderText(/25000/i) as HTMLInputElement;
    expect(valueInput.value).toBe('');

    // Date field is labelled Target Close Date
    expect(screen.getByLabelText(/Target Close Date/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Follow Up Date/i)).not.toBeInTheDocument();
  });
});
