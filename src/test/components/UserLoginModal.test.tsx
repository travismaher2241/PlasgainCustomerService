import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider, useApp, DEFAULT_USER_PROFILE, UserProfile } from '../../context/AppContext';
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

const mockColleague: UserProfile = {
  id: "user-casey-jordan",
  name: "Casey Jordan",
  role: "Internal Sales",
  location: "Melbourne, VIC",
  email: "casey.jordan@plasgain.com.au",
  phone: "+61 3 9000 1122",
  pin: "2468",
  isAdmin: false
};

describe('User Login & Identity Switching Suite', () => {
  const verifyProfileFetch = vi.fn();
  let pinAccepted = true;

  beforeEach(() => {
    localStorage.clear();
    pinAccepted = true;
    verifyProfileFetch.mockReset();
    verifyProfileFetch.mockImplementation(async (url: any) => {
      if (String(url).includes('/api/auth/verify-profile')) {
        return pinAccepted
          ? { ok: true, json: async () => ({ success: true, token: 'verified-session-token' }) }
          : { ok: false, json: async () => ({ error: 'Incorrect PIN code for this profile.' }) };
      }
      if (String(url).includes('/api/auth/session')) {
        return {
          ok: true,
          json: async () => ({ userId: DEFAULT_USER_PROFILE.id, name: DEFAULT_USER_PROFILE.name })
        };
      }
      return { ok: true, json: async () => ([]) };
    });
    vi.stubGlobal('fetch', verifyProfileFetch);
  });

  it('opens login modal when clicking sidebar user footer and switches account', async () => {
    localStorage.setItem('plasgain_team_members', JSON.stringify([DEFAULT_USER_PROFILE, mockColleague]));

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
    expect(screen.getByText('Casey Jordan')).toBeInTheDocument();

    // Click Sign In as Casey Jordan
    const colleagueCard = screen.getByText('Casey Jordan').closest('[class*="rounded-panel"]')!;
    expect(colleagueCard).toBeInTheDocument();
    fireEvent.click(colleagueCard);

    // PIN authentication prompt appears
    expect(screen.getByText(/Authenticate Sign-In/i)).toBeInTheDocument();
    const pinInput = screen.getByLabelText(/4-Digit Security PIN/i);
    fireEvent.change(pinInput, { target: { value: '2468' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify & Sign In/i });
    fireEvent.click(verifyBtn);

    await waitFor(() =>
      expect(screen.getByTestId('active-user-name')).toHaveTextContent('Casey Jordan')
    );
    expect(verifyProfileFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/verify-profile'),
      expect.objectContaining({ method: 'POST' })
    );

    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Casey Jordan');
    expect(saved.email).toBe('casey.jordan@plasgain.com.au');
    expect(saved.pin).toBeUndefined();
  });

  it('lets the current profile renew its server session', async () => {
    render(<AppProvider><TestApp /></AppProvider>);
    fireEvent.click(screen.getByTitle(/Switch user account or update details/i));
    fireEvent.click(screen.getByRole('button', { name: 'Verify session' }));
    fireEvent.change(screen.getByLabelText(/4-Digit Security PIN/i), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Sign In/i }));
    await waitFor(() => expect(verifyProfileFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/verify-profile'),
      expect.objectContaining({ body: expect.stringContaining('user-travis-maher') })
    ));

    fireEvent.click(screen.getByTitle(/Switch user account or update details/i));
    expect(screen.getByRole('status')).toHaveTextContent('Session verified');
    expect(screen.queryByRole('button', { name: 'Verify session' })).not.toBeInTheDocument();
  });

  it('keeps the rejected PIN out of the next attempt', async () => {
    pinAccepted = false;
    localStorage.setItem('plasgain_team_members', JSON.stringify([DEFAULT_USER_PROFILE, mockColleague]));

    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    fireEvent.click(screen.getByTitle(/Switch user account or update details/i));
    fireEvent.click(screen.getByText('Casey Jordan').closest('[class*="rounded-panel"]')!);

    const pinInput = screen.getByLabelText(/4-Digit Security PIN/i) as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: '1111' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Sign In/i }));

    await waitFor(() =>
      expect(screen.getByText(/Incorrect PIN code/i)).toBeInTheDocument()
    );

    expect(pinInput.value).toBe('');
  });

  it('restores a verified session after the app is reloaded', async () => {
    localStorage.setItem('plasgain_session_token', 'persisted-session-token');

    render(<AppProvider><TestApp /></AppProvider>);
    fireEvent.click(screen.getByTitle(/Switch user account or update details/i));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Session verified');
    });
    expect(verifyProfileFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/session'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer persisted-session-token' })
      })
    );
    expect(screen.queryByRole('button', { name: 'Verify session' })).not.toBeInTheDocument();
  });

  it('allows deleting irrelevant users from workspace', async () => {
    const departedUser: UserProfile = {
      id: "user-departed-staff",
      name: "Departed Staff",
      role: "Sales Rep",
      location: "Sydney, NSW",
      email: "departed@plasgain.com.au",
      isAdmin: false
    };
    localStorage.setItem('plasgain_team_members', JSON.stringify([DEFAULT_USER_PROFILE, departedUser]));

    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    // Open from Settings "Switch user" button
    const settingsSwitchBtn = screen.getByRole('button', { name: /Switch user/i });
    fireEvent.click(settingsSwitchBtn);

    // Verify Departed Staff is in the list
    expect(screen.getByText('Departed Staff')).toBeInTheDocument();

    // Click delete on Departed Staff
    const deleteBtn = screen.getByLabelText(/Delete Departed Staff/i);
    fireEvent.click(deleteBtn);

    // Confirm banner appears
    expect(screen.getByText(/Delete Departed Staff from workspace\?/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmBtn);

    // Departed Staff should no longer be in the document
    expect(screen.queryByText('Departed Staff')).not.toBeInTheDocument();

    // Verify localStorage has removed Departed Staff
    const team = JSON.parse(localStorage.getItem('plasgain_team_members') || '[]');
    expect(team.some((m: any) => m.name === 'Departed Staff')).toBe(false);
  });

  it('allows custom login with custom name, email, and security PIN', async () => {
    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    // Open from Settings "Switch user" button
    const settingsSwitchBtn = screen.getByRole('button', { name: /Switch user/i });
    fireEvent.click(settingsSwitchBtn);

    // Switch to Custom Sign-In tab
    const customTab = screen.getByRole('button', { name: /Custom Sign-In/i });
    fireEvent.click(customTab);

    // Fill custom form
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Work Email/i);
    const pinInput = screen.getByLabelText(/4-Digit Login PIN/i);

    fireEvent.change(nameInput, { target: { value: 'Alexander Wright' } });
    fireEvent.change(emailInput, { target: { value: 'awright@plasgain.com.au' } });
    fireEvent.change(pinInput, { target: { value: '5566' } });

    const submitBtn = screen.getByRole('button', { name: /Save & Create Member/i });
    fireEvent.click(submitBtn);

    // Summary card with PIN should be displayed
    expect(screen.getByText(/Team Member Added Successfully!/i)).toBeInTheDocument();
    expect(screen.getByText('5566')).toBeInTheDocument();

    // Click Sign In As Alexander Wright
    const signInBtn = screen.getByRole('button', { name: /Sign In As Alexander Wright/i });
    fireEvent.click(signInBtn);

    // Active user should now be Alexander Wright
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Alexander Wright');

    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Alexander Wright');
    expect(saved.email).toBe('awright@plasgain.com.au');
  });
});
