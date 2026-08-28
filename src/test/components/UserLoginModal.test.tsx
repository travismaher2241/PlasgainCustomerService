import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppProvider, useApp } from '../../context/AppContext';
import { UserLoginModal } from '../../components/UserLoginModal';
import { Sidebar } from '../../components/Sidebar';
import { SettingsView } from '../../components/SettingsView';

const TestApp: React.FC = () => {
  const { openLoginModal, currentUser } = useApp();
  return (
    <div>
      <Sidebar />
      <SettingsView />
      <UserLoginModal />
      <div data-testid="active-user-name">{currentUser.name}</div>
    </div>
  );
};

describe('User Login & Identity Switching Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens login modal when clicking sidebar user footer and switches account', async () => {
    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    // Initial default user is Travis Maher
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Travis Maher');

    // Click sidebar user footer
    const sidebarButton = screen.getByTitle(/Switch user account or update details/i);
    fireEvent.click(sidebarButton);

    // Modal should be open
    expect(screen.getByText('Plasgain Sales Workspace Login')).toBeInTheDocument();
    expect(screen.getByText('Sarah Reed')).toBeInTheDocument();

    // Click Sign In as Sarah Reed
    const sarahCard = screen.getByText('Sarah Reed').closest('[class*="rounded-panel"]')!;
    expect(sarahCard).toBeInTheDocument();
    fireEvent.click(sarahCard);

    // PIN authentication prompt appears
    expect(screen.getByText(/Authenticate Sign-In/i)).toBeInTheDocument();
    const pinInput = screen.getByLabelText(/4-Digit Security PIN/i);
    fireEvent.change(pinInput, { target: { value: '2468' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify & Sign In/i });
    fireEvent.click(verifyBtn);

    // Active user should now be Sarah Reed
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Sarah Reed');

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Sarah Reed');
    expect(saved.email).toBe('sarah.reed@plasgain.com.au');
  });

  it('allows deleting irrelevant users from workspace', async () => {
    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    // Open from Settings "Switch Account / Sign In" button
    const settingsSwitchBtn = screen.getByRole('button', { name: /Switch Account \/ Sign In/i });
    fireEvent.click(settingsSwitchBtn);

    // Verify Rob Mitchell is in the list
    expect(screen.getByText('Rob Mitchell')).toBeInTheDocument();

    // Click delete on Rob Mitchell
    const deleteRobBtn = screen.getByLabelText(/Delete Rob Mitchell/i);
    fireEvent.click(deleteRobBtn);

    // Confirm banner appears
    expect(screen.getByText(/Delete Rob Mitchell from workspace\?/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmBtn);

    // Rob Mitchell should no longer be in the document
    expect(screen.queryByText('Rob Mitchell')).not.toBeInTheDocument();

    // Verify localStorage has removed Rob Mitchell
    const team = JSON.parse(localStorage.getItem('plasgain_team_members') || '[]');
    expect(team.some((m: any) => m.name === 'Rob Mitchell')).toBe(false);
  });

  it('allows custom login with custom name and email', async () => {
    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    // Open from Settings "Switch Account / Sign In" button
    const settingsSwitchBtn = screen.getByRole('button', { name: /Switch Account \/ Sign In/i });
    fireEvent.click(settingsSwitchBtn);

    // Switch to Custom Sign-In tab
    const customTab = screen.getByRole('button', { name: /Custom Sign-In/i });
    fireEvent.click(customTab);

    // Fill custom form
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Work Email/i);

    fireEvent.change(nameInput, { target: { value: 'Alexander Wright' } });
    fireEvent.change(emailInput, { target: { value: 'awright@plasgain.com.au' } });

    const submitBtn = screen.getByRole('button', { name: /Save & Sign In/i });
    fireEvent.click(submitBtn);

    // Active user should be Alexander Wright
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Alexander Wright');

    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Alexander Wright');
    expect(saved.email).toBe('awright@plasgain.com.au');
  });
});
