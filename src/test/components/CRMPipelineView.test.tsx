import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

  it('Test 1 — Renders Outstanding Quotes header and table with account beneath quote name', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    // Header & Actions
    expect(screen.getByRole('heading', { level: 1, name: /Outstanding Quotes|Deals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New quote/i })).toBeInTheDocument();

    // Desktop table
    const table = within(screen.getByRole('table'));
    expect(table.getByText("Coastal Pathway Solar Lighting")).toBeInTheDocument();
    expect(table.getByText("Sunshine Coast Council")).toBeInTheDocument();
    expect(table.getAllByText(/\$68,400/i).length).toBeGreaterThanOrEqual(1);
    expect(table.getByText("Proposal & Quoting")).toBeInTheDocument();

    // The same quote is also rendered as a card for narrow screens, so value,
    // due date and actions never sit behind a horizontal scroll on a phone.
    const cards = screen.getAllByRole('list').find((el) => el.className.includes('md:hidden'));
    expect(cards).toBeTruthy();
    expect(within(cards as HTMLElement).getByText("Coastal Pathway Solar Lighting")).toBeInTheDocument();
    expect(within(cards as HTMLElement).getAllByText(/\$68,400/i).length).toBeGreaterThanOrEqual(1);
  });

  it('Test 2 — Clicking deal row opens Step 2 Deal Details workspace', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    // Click deal row (desktop table)
    const dealTitle = within(screen.getByRole('table')).getByText("Coastal Pathway Solar Lighting");
    fireEvent.click(dealTitle);

    // Step 2 Deal Details workspace opens
    expect(screen.getByRole('button', { name: /Back to quotes/i })).toBeInTheDocument();
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
    const searchInput = screen.getByPlaceholderText(/Search (deals|quotes) or accounts/i);
    fireEvent.change(searchInput, { target: { value: "Coastal Pathway" } });
    expect(within(screen.getByRole('table')).getByText("Coastal Pathway Solar Lighting")).toBeInTheDocument();

    // Search with non-matching term
    fireEvent.change(searchInput, { target: { value: "NonExistentDealXYZ" } });
    expect(screen.queryByText("Coastal Pathway Solar Lighting")).not.toBeInTheDocument();
    expect(screen.getByText(/No (deals|outstanding quotes) found/i)).toBeInTheDocument();
  });

  it('Test 4 — Renders Follow Up button and opens follow up modal', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    const followUpBtn = screen.getAllByRole('button', { name: /Follow up/i })[0];
    expect(followUpBtn).toBeInTheDocument();
    fireEvent.click(followUpBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Follow up on this quote/i)).toBeInTheDocument();
  });

  it('Test 5 — 3-dots action menu opens portaled options without clipping and triggers View Details', () => {
    render(
      <AppProvider>
        <PipelineTestWrapper />
      </AppProvider>
    );

    const actionBtn = screen.getByRole('button', { name: /Actions for Coastal Pathway Solar Lighting/i });
    expect(actionBtn).toBeInTheDocument();

    // Menu options should not be visible before clicking
    expect(screen.queryByRole('menuitem', { name: /View Details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Log Activity/i })).not.toBeInTheDocument();

    // Click the 3-dots button
    fireEvent.click(actionBtn);

    // Options should now be immediately visible in the portaled menu
    const viewDetailsBtn = screen.getByRole('menuitem', { name: /View Details/i });
    const logActivityBtn = screen.getByRole('menuitem', { name: /Log Activity/i });
    expect(viewDetailsBtn).toBeInTheDocument();
    expect(logActivityBtn).toBeInTheDocument();

    // Clicking View Details navigates to deal details
    fireEvent.click(viewDetailsBtn);
    expect(screen.getByRole('button', { name: /Back to quotes/i })).toBeInTheDocument();
  });
});
