import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMAccountsView } from '../../components/crm/CRMAccountsView';
import { AppProvider, useApp } from '../../context/AppContext';

const AccountsTestWrapper: React.FC = () => {
  const { addAccount } = useApp();

  React.useEffect(() => {
    addAccount({
      id: 'acc-test-del',
      name: 'Townsville City Council',
      status: 'Active',
      industry: 'Government',
      customerSegment: 'Local Government / Council',
      territory: 'QLD/NT',
      accountOwner: 'Travis Maher',
      relationshipHealth: 'Healthy',
      tags: [],
      createdDate: '2026-08-28',
      lastInteractionDate: '2026-08-28'
    });
  }, []);

  return <CRMAccountsView />;
};

describe('CRMAccountsView Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('renders account list card with a direct delete button and allows deletion', () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    expect(screen.getAllByText(/Townsville City Council/i).length).toBeGreaterThan(0);

    // Delete button on the account list card and 360 header
    const cardDeleteBtns = screen.getAllByRole('button', { name: /Delete Townsville City Council/i });
    expect(cardDeleteBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(cardDeleteBtns[0]);

    expect(screen.queryByText(/Townsville City Council/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No matching accounts found/i)).toBeInTheDocument();
  });
});
