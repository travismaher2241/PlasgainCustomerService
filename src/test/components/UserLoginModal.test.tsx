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

  it('opens login modal when clicking sidebar user footer and switches to Travis Maher', async () => {
    render(
      <AppProvider>
        <TestApp />
      </AppProvider>
    );

    // Initial default user
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Sarah Reed');

    // Click sidebar user footer
    const sidebarButton = screen.getByTitle(/Switch user account or update details/i);
    fireEvent.click(sidebarButton);

    // Modal should be open
    expect(screen.getByText('Plasgain Sales Workspace Login')).toBeInTheDocument();
    expect(screen.getByText('Travis Maher')).toBeInTheDocument();

    // Click Sign In as Travis Maher
    const travisButton = screen.getByText('Travis Maher').closest('button');
    expect(travisButton).toBeInTheDocument();
    fireEvent.click(travisButton!);

    // Active user should now be Travis Maher
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Travis Maher');

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Travis Maher');
    expect(saved.email).toBe('travis@plasgain.com.au');
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

    const submitBtn = screen.getByRole('button', { name: /Sign In & Save Details/i });
    fireEvent.click(submitBtn);

    // Active user should be Alexander Wright
    expect(screen.getByTestId('active-user-name')).toHaveTextContent('Alexander Wright');

    const saved = JSON.parse(localStorage.getItem('plasgain_user_profile') || '{}');
    expect(saved.name).toBe('Alexander Wright');
    expect(saved.email).toBe('awright@plasgain.com.au');
  });
});
