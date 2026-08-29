import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  // PIN verification happens on the server, so the modal needs a stubbed
  // endpoint rather than a PIN baked into the client bundle. The provider also
  // polls notifications and competitor pricing on mount, so the stub routes by
  // URL instead of by call order.
  const verifyProfileFetch = vi.fn();
  let pinAccepted = true;

  beforeEach(() => {
    localStorage.clear();
    pinAccepted = true;
    verifyProfileFetch.mockReset();
    verifyProfileFetch.mockImplementation(async (url: any) => {
      if (String(url).includes('/api/auth/verify-profile')) {
        return pinAccepted
          ? { ok: true, json: async () => ({ success: true }) }
          : { ok: false, json: async () => ({ error: 'Incorrect PIN code for this profile.' }) };
      }
      return { ok: true, json: async () => ([]) };
    });
    vi.stubGlobal('fetch', verifyProfileFetch);
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

    // PIN verification is a server round-trip now (PINs are no longer shipped to
    // the browser), so the switch resolves asynchronously.
    await waitFor(() =>
      expect(screen.getByTestId('active-user-name')).toHaveTextContent('Sarah Reed')
    );
    expect(verifyProfileFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/verify-profile'),
      expect.objectContaining({ method: 'POST' })
    );

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Sarah Reed');
    expect(saved.email).toBe('sarah.reed@plasgain.com.au');
    // The PIN must never be persisted in the browser.
    expect(saved.pin).toBeUndefined();
  });

  it('keeps the rejected PIN out of the next attempt', async () => {
    pinAccepted = false;

    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    fireEvent.click(screen.getByTitle(/Switch user account or update details/i));
    fireEvent.click(screen.getByText('Sarah Reed').closest('[class*="rounded-panel"]')!);

    const pinInput = screen.getByLabelText(/4-Digit Security PIN/i) as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: '1111' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Sign In/i }));

    await waitFor(() =>
      expect(screen.getByText(/Incorrect PIN code/i)).toBeInTheDocument()
    );

    // A rejected PIN must be cleared. Leaving it in a masked, 6-char-capped
    // field made every retry silently concatenate and truncate.
    expect(pinInput.value).toBe('');
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
