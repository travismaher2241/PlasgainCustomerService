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
    expect(screen.getAllByText(/Clear Workspace Data/i).length).toBeGreaterThan(0);
  });

  it('triggers clear workspace data action', () => {
    render(
      <AppProvider>
        <SettingsView />
      </AppProvider>
    );

    const clearBtn = screen.getByRole('button', { name: /Clear Workspace Data/i });
    fireEvent.click(clearBtn);
    expect(clearBtn).toBeInTheDocument();
  });
});
