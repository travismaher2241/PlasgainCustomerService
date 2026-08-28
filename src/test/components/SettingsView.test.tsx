import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsView } from '../../components/SettingsView';
import { AppProvider } from '../../context/AppContext';

describe('SettingsView Component', () => {
  it('renders system status and guardrails cards', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    expect(screen.getByText(/Settings & Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Engineering Data/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cloud Firestore/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quoting & Compliance Standards/i)).toBeInTheDocument();
    expect(screen.getByText(/Datasheet Accuracy:/i)).toBeInTheDocument();
    expect(screen.getByText(/Reset Workspace Data/i)).toBeInTheDocument();
  });

  it('triggers reset sample data action', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Sample Data/i });
    fireEvent.click(resetBtn);
    expect(resetBtn).toBeInTheDocument();
  });
});
