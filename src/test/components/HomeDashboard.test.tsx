import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomeDashboard } from '../../components/HomeDashboard';
import { AppProvider } from '../../context/AppContext';

describe('HomeDashboard Radically Simplified Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders compact status, top 3 priorities and single Open action per item', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // 1. Status Section
    expect(screen.getByRole('heading', { level: 1, name: /clear|need attention/i })).toBeInTheDocument();

    // 2. Priorities Section (Top 3 only)
    expect(screen.getByRole('heading', { level: 2, name: /Your priorities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View all priorities in CRM/i })).toBeInTheDocument();

    // Verify Open buttons exist (exactly up to 3 for top 3)
    const openButtons = screen.getAllByRole('button', { name: /Open/i });
    expect(openButtons.length).toBeGreaterThan(0);
    expect(openButtons.length).toBeLessThanOrEqual(3);

    // Verify "Why this matters" is NOT present on Home
    expect(screen.queryByText(/Why this matters/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prioritisation Reason/i)).not.toBeInTheDocument();

    // Verify multi-button clutter is removed (no Prep Call or Review buttons on Home)
    expect(screen.queryByRole('button', { name: /Prep call/i })).not.toBeInTheDocument();
  });

  it('renders quick access navigation shortcuts', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Quick Access/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Enquiry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CRM Workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Product Finder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Catalogues/i })).toBeInTheDocument();
  });
});
