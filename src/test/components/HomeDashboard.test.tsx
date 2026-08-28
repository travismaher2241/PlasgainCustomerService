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

describe('HomeDashboard Radically Simplified Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders compact clear status and empty priorities state when clean', () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    // 1. Status Section
    expect(screen.getByRole('heading', { level: 1, name: /You're clear/i })).toBeInTheDocument();

    // 2. Priorities Section
    expect(screen.getByRole('heading', { level: 2, name: /Your priorities/i })).toBeInTheDocument();
    expect(screen.getByText(/No urgent priorities/i)).toBeInTheDocument();

    // Verify "Why this matters" is NOT present on Home
    expect(screen.queryByText(/Why this matters/i)).not.toBeInTheDocument();
  });

  it('renders top priority items with single Open action when deals exist', () => {
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
