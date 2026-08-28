import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRMAccountsView } from '../../components/crm/CRMAccountsView';
import { AppProvider, useApp } from '../../context/AppContext';

const AccountsTestWrapper: React.FC = () => {
  const { addAccount } = useApp();

  React.useEffect(() => {
    addAccount({
      id: 'acc-test-1',
      name: 'Townsville City Council',
      status: 'Customer',
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

  it('renders account list card with a direct delete button and allows permanent deletion', () => {
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

  it('allows archiving an account, moving it to Archived tab, and restoring it', () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Initial state: 1 active account
    expect(screen.getByRole('button', { name: /Active \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archived \(0\)/i })).toBeInTheDocument();

    // Click Archive on the account card
    const archiveBtn = screen.getAllByRole('button', { name: /Archive Townsville City Council/i })[0];
    fireEvent.click(archiveBtn);

    // Account disappears from Active list
    expect(screen.getByRole('button', { name: /Active \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archived \(1\)/i })).toBeInTheDocument();
    expect(screen.getByText(/No matching accounts found/i)).toBeInTheDocument();

    // Switch to Archived tab
    fireEvent.click(screen.getByRole('button', { name: /Archived \(1\)/i }));

    // Account is listed with Archived badge
    expect(screen.getAllByText(/Townsville City Council/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Archived Account:/i)).toBeInTheDocument();

    // Click Restore Account
    const restoreBtn = screen.getAllByRole('button', { name: /Restore Townsville City Council/i })[0];
    fireEvent.click(restoreBtn);

    // Account restored back to Active
    expect(screen.getByRole('button', { name: /Active \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archived \(0\)/i })).toBeInTheDocument();
  });
});
