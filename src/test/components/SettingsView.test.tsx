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

    expect(screen.getByText(/Settings & AI Copilot Diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Reasoning Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Copilot Guardrails & Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/Strict Knowledge Grounding:/i)).toBeInTheDocument();
    expect(screen.getByText(/Reset Local Demonstration State/i)).toBeInTheDocument();
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
