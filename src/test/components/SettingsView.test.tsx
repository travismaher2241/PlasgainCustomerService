import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { AppProvider } from '../../context/AppContext';

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
});
