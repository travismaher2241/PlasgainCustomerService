import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMPipelineView } from '../../components/crm/CRMPipelineView';
import { AppProvider, useApp } from '../../context/AppContext';

const testDeals = [
  {
    id: "opp-custom-1",
    accountId: "acc-custom-1",
    accountName: "Sunshine Coast Council",
    name: "Coastal Pathway Solar Lighting",
    stageId: "stage-proposal",
    stageName: "Proposal & Quoting",
    pipelineId: "pipe-major-projects",
    dealValue: 68400,
    expectedCloseDate: "2026-09-26",
    nextAction: "Call Sarah about DIALux spacing",
    priority: "High",
    dealHealth: "Healthy"
  }
];

const PipelineTestWrapper: React.FC = () => {
  const { addCrmOpportunity } = useApp();

  React.useEffect(() => {
    testDeals.forEach((d) => addCrmOpportunity(d as any));
  }, []);

  return <CRMPipelineView />;
};

describe('CRM Deals Global Table Suite (Step 6)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Test 1 — Renders Deals header and table with account beneath deal name', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    // Header & Actions
    expect(screen.getByRole('heading', { level: 1, name: "Deals" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New quote/i })).toBeInTheDocument();

    // Table should be rendered directly
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText("Coastal Pathway Solar Lighting")).toBeInTheDocument();
    expect(screen.getByText("Sunshine Coast Council")).toBeInTheDocument();
    expect(screen.getAllByText(/\$68,400/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Proposal & Quoting")).toBeInTheDocument();
  });

  it('Test 2 — Clicking deal row opens Step 2 Deal Details workspace', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    // Click deal row
    const dealTitle = screen.getByText("Coastal Pathway Solar Lighting");
    fireEvent.click(dealTitle);

    // Step 2 Deal Details workspace opens
    expect(screen.getByRole('button', { name: /Close deal details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Overview$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Products & Pricing/i })).toBeInTheDocument();
  });

  it('Test 3 — Filters table rows via search and health filters', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Search deals or accounts/i);
    fireEvent.change(searchInput, { target: { value: "Coastal Pathway" } });
    expect(screen.getByText("Coastal Pathway Solar Lighting")).toBeInTheDocument();

    // Search with non-matching term
    fireEvent.change(searchInput, { target: { value: "NonExistentDealXYZ" } });
    expect(screen.queryByText("Coastal Pathway Solar Lighting")).not.toBeInTheDocument();
    expect(screen.getByText(/No deals found/i)).toBeInTheDocument();
  });
});
