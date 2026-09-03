import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomeDashboard } from '../../components/HomeDashboard';
import { AppProvider } from '../../context/AppContext';

const sampleDeals = [
  {
    id: "deal-live-101",
    accountId: "acc-live-101",
    accountName: "City of Greater Bendigo",
    name: "Bendigo Heritage Park Upgrade",
    stageId: "stage-new",
    stageName: "New Opportunity",
    pipelineId: "pipe-major-projects",
    dealValue: 68400,
    expectedCloseDate: "2026-09-26",
    nextAction: "Send technical spec sheet to project manager",
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
    expect(screen.getByRole('button', { name: /New quote/i })).toBeInTheDocument();
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

    expect(screen.getByText(/Bendigo Heritage Park Upgrade/i)).toBeInTheDocument();
    const openButtons = screen.getAllByRole('button', { name: /Open/i });
    expect(openButtons.length).toBe(1);
  });

  it('opens Create New Quote modal directly on dashboard when clicking New quote', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    const newQuoteBtn = screen.getByRole('button', { name: /New quote/i });
    fireEvent.click(newQuoteBtn);

    expect(screen.getByRole('dialog', { name: /Create New Quote/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer \/ Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/\$ Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quote Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Follow Up Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Quote/i })).toBeInTheDocument();
  });
});
