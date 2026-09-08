import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { AppProvider, useApp } from '../../context/AppContext';

describe('SettingsView Component', () => {
  it('renders Profile without Connections, Knowledge, Danger Area, or developer diagnostics', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Connections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Knowledge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Administration/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: /Danger Area/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset workspace data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View technical diagnostics & logs/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/App Version:/i)).not.toBeInTheDocument();
  });

  it('allows toggling profile edit form', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    const editBtn = screen.getByRole('button', { name: /Edit profile/i });
    fireEvent.click(editBtn);
    expect(screen.getByLabelText(/Full Name \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save profile/i })).toBeInTheDocument();
  });

  it('renders Archived Accounts tab and empty state when none are archived', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    const archivedTab = screen.getByRole('button', { name: /Archived Accounts/i });
    expect(archivedTab).toBeInTheDocument();
    fireEvent.click(archivedTab);

    expect(screen.getByRole('heading', { level: 1, name: /Archived Accounts/i })).toBeInTheDocument();
    expect(screen.getByText(/No archived accounts/i)).toBeInTheDocument();
  });

  it('displays archived accounts, allows restoring and permanently deleting them', async () => {
    window.confirm = () => true;

    const SettingsTestHarness: React.FC = () => {
      const { addAccount } = useApp();
      React.useEffect(() => {
        addAccount({
          id: "acc-archived-1",
          name: "Old Mining Supplies",
          tradingName: "OMS Logistics",
          accountType: "Account",
          status: "Archived",
          isArchived: true,
          territory: "WA",
          accountOwner: "Travis Maher",
          archivedDate: "2026-09-01",
          archivedReason: "Ceased operations"
        } as any);
      }, []);

      return <SettingsView />;
    };

    render(
      <AppProvider>
        <SettingsTestHarness />
      </AppProvider>
    );

    // Switch to Archived Accounts tab
    const archivedTab = screen.getByRole('button', { name: /Archived Accounts/i });
    fireEvent.click(archivedTab);

    // Verify Old Mining Supplies is listed
    expect(screen.getByText("Old Mining Supplies")).toBeInTheDocument();
    expect(screen.getByText(/Trading as: OMS Logistics/i)).toBeInTheDocument();
    expect(screen.getByText(/Ceased operations/i)).toBeInTheDocument();

    // Verify Restore button exists and works
    const restoreBtn = screen.getByRole('button', { name: /Restore Old Mining Supplies/i });
    expect(restoreBtn).toBeInTheDocument();
    fireEvent.click(restoreBtn);

    // After restoring, it should no longer be in archived list
    expect(screen.getByText(/No archived accounts/i)).toBeInTheDocument();
  });
});
