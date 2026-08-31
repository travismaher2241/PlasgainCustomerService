import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomeDashboard } from '../../components/HomeDashboard';
import { AppProvider } from '../../context/AppContext';

const sampleDeals = [
  {
    id: "opp-custom-1",
    accountId: "acc-custom-1",
    accountName: "Sunshine Coast Council",
    name: "Coastal Pathway Solar Lighting",
    stageId: "stage-new",
    stageName: "New Opportunity",
    pipelineId: "pipe-major-projects",
    dealValue: 68400,
    expectedCloseDate: "2026-09-26",
    nextAction: "Call Sarah about DIALux spacing",
    priority: "High"
  }
];

describe('HomeDashboard Step 8 Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders compact header and State A (No sales records) when empty', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // 1. Status Header
    expect(screen.getByRole('heading', { level: 1, name: /Welcome/i })).toBeInTheDocument();

    // 2. State A empty message
    expect(screen.getByText(/No sales records yet/i)).toBeInTheDocument();

    // 3. Compact quick creation actions
    expect(screen.getByRole('button', { name: /New enquiry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New deal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Log/i })).toBeInTheDocument();

    // Verify "Why this matters" is NOT present on Home
    expect(screen.queryByText(/Why this matters/i)).not.toBeInTheDocument();
  });

  it('renders priority items with single Open action when active deals exist', () => {
    localStorage.setItem("plasgain_crm_deals", JSON.stringify(sampleDeals));

    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    expect(screen.getByText(/Coastal Pathway Solar Lighting/i)).toBeInTheDocument();
    const openButtons = screen.getAllByRole('button', { name: /Open/i });
    expect(openButtons.length).toBe(1);
  });
});
