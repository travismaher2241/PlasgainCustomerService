import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { AppProvider } from '../../context/AppContext';

describe('SettingsView Component Step 8', () => {
  it('renders primary groups: Profile, Connections, and Administration', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Connections/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Knowledge/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Administration/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Danger Area/i })).toBeInTheDocument();
  });

  it('triggers reset workspace data action in danger area', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    const resetBtn = screen.getByRole('button', { name: /Reset workspace data/i });
    fireEvent.click(resetBtn);
    expect(screen.getByRole('button', { name: /Confirm Reset/i })).toBeInTheDocument();
  });
});
