import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { AppProvider } from '../../context/AppContext';

describe('SettingsView Component', () => {
  it('renders Profile and Administration without Connections or Danger Area', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Connections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Knowledge/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Administration/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: /Danger Area/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset workspace data/i })).not.toBeInTheDocument();
  });

  it('allows viewing technical diagnostics in administration', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    const diagnosticsBtn = screen.getByRole('button', { name: /View technical diagnostics & logs/i });
    fireEvent.click(diagnosticsBtn);
    expect(screen.getByText(/App Version:/i)).toBeInTheDocument();
  });
});
