import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CRMDealDetailsWorkspace } from '../../components/crm/CRMDealDetailsWorkspace';
import { AppProvider } from '../../context/AppContext';
import { CRMOpportunity } from '../../types/crm';

const mockDealPopulated: CRMOpportunity = {
  id: "deal-melton-01",
  name: "Melton Shared Path Lighting",
  accountId: "acc-wyndham-01",
  accountName: "Wyndham Civil Group",
  primaryContactId: "con-01",
  primaryContactName: "Sarah Jenkins",
  primaryContactEmail: "sarah@wyndhamcivil.com.au",
  opportunityOwner: "Travis Maher",
  pipelineId: "pipe-major-projects",
  stageId: "stage-solution",
  stageName: "Solution Scoping",
  dealValue: 68400,
  dealValueBasis: "Estimate",
  weightedValue: 34200,
  probability: 50,
  forecastCategory: "Pipeline",
  expectedCloseDate: "2026-10-15",
  products: [
    {
      id: "prod-1",
      productCode: "PB-75W-3K",
      productName: "Plasgain Pro Blade 75 Solar Luminaire",
      category: "Solar Luminaire",
      quantity: 24,
      unit: "ea",
      costPrice: 1050,
      unitPrice: 1650,
      totalPrice: 39600,
      marginPercent: 36,
      isOstendoVerified: true,
      notes: "3000K wildlife friendly"
    },
    {
      id: "prod-2",
      productCode: "PLASPOLE-6M-DB-GRN",
      productName: "Plaspole 6.0m Recycled Composite Light Pole",
      category: "Composite Poles",
      quantity: 24,
      unit: "ea",
      costPrice: 700,
      unitPrice: 1200,
      totalPrice: 28800,
      marginPercent: 42,
      isOstendoVerified: true
    }
  ],
  projectApplication: "Pedestrian Shared Trail",
  location: "Melton, VIC",
  customerNeed: "Upgrade 1.2km unlit riverside path to AS/NZS 1158.3.1 Cat P4.",
  keyRequirements: ["AS/NZS 1158.3.1 Cat P4", "Direct burial composite poles"],
  source: "Plan Take-off",
  ostendoQuoteRef: "Q-88210",
  quoteRevision: "Rev A",
  quoteStatus: "Draft",
  quoteExpiryDate: "2026-11-01",
  latestActivity: "Initial plan take-off extracted",
  latestActivityDate: "2026-08-31",
  nextAction: "Call Sarah Jenkins to confirm pole spacing",
  nextActionDate: "2026-09-03",
  daysInCurrentStage: 2,
  totalDealAgeDays: 5,
  dealHealth: "Healthy",
  dealHealthReasons: ["Technical take-off complete", "Client contact established"],
  notes: "Direct burial depth 1.2m specified."
};

const mockDealMissingPrice: CRMOpportunity = {
  ...mockDealPopulated,
  id: "deal-unpriced-02",
  name: "Unpriced Pathway Trial",
  dealValue: 0,
  products: [
    {
      id: "prod-unpriced-1",
      productCode: "CUSTOM-FITTING",
      productName: "Custom Architectural Luminaire",
      category: "Special Fitting",
      quantity: 10,
      unit: "ea",
      costPrice: 0,
      unitPrice: 0,
      totalPrice: 0,
      isOstendoVerified: false
    }
  ],
  nextAction: "",
  nextActionDate: ""
};

describe('CRMDealDetailsWorkspace Component', () => {
  const renderWorkspace = (deal: CRMOpportunity = mockDealPopulated) =>
    render(
      <AppProvider>
        <CRMDealDetailsWorkspace deal={deal} />
      </AppProvider>
    );

  it('Test 1 — renders compact persistent deal summary and 4 core tabs without oversized headers', () => {
    renderWorkspace();

    // 1. Deal Name & Account Identity
    expect(screen.getByRole('heading', { level: 1, name: /Melton Shared Path Lighting/i })).toBeInTheDocument();
    expect(screen.getByText(/Wyndham Civil Group/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Owner: Travis Maher/i).length).toBeGreaterThanOrEqual(1);

    // 2. Current Value & Stage
    expect(screen.getAllByText(/\$68,400/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Change deal stage/i)).toHaveValue("stage-solution");

    // 3. Four Core Tabs Available
    expect(screen.getByRole('button', { name: /^Overview$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Products & Pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Quote/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Activity/i })).toBeInTheDocument();

    // 4. Seven equal-weight header buttons are gone; frequent actions present
    expect(screen.getAllByRole('button', { name: /Log activity/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Follow up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Communicate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();

    // 5. Permanent call-outcome shortcuts banner removed
    expect(screen.queryByText(/1-Click Call Outcome Shortcuts/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/📞 Left Voicemail \(\+2d\)/i)).not.toBeInTheDocument();
  });

  it('Test 2 — displays scheduled next action and due date with quick logging routes', () => {
    renderWorkspace();

    // Next Action in header strip and Overview card
    expect(screen.getAllByText(/Call Sarah Jenkins to confirm pole spacing/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2026-09-03/i).length).toBeGreaterThanOrEqual(1);

    // Overview tab action buttons
    expect(screen.getAllByRole('button', { name: /Log activity/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Reschedule \/ Task/i })).toBeInTheDocument();
  });

  it('Test 3 — displays concise empty state when no next action is scheduled', () => {
    renderWorkspace(mockDealMissingPrice);

    expect(screen.getByText(/No immediate action scheduled/i)).toBeInTheDocument();
  });

  it('Test 4 — renders Products & Pricing tab with exact SKUs, quantities, units, and margin controls', () => {
    renderWorkspace();

    // Switch to Products & Pricing
    const prodTab = screen.getByRole('button', { name: /Products & Pricing/i });
    fireEvent.click(prodTab);

    // Exact SKUs preserved
    expect(screen.getByText("PB-75W-3K")).toBeInTheDocument();
    expect(screen.getByText("PLASPOLE-6M-DB-GRN")).toBeInTheDocument();

    // Quantities and units
    expect(screen.getAllByText(/24 ea/i).length).toBeGreaterThanOrEqual(1);

    // Margin controls
    expect(screen.getByText(/Target Margin:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply Margin to All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Item/i })).toBeInTheDocument();

    // GST Notice
    expect(screen.getByText(/Line item amounts are quoted in AUD ex GST/i)).toBeInTheDocument();
  });

  it('Test 5 — flags missing price in Products & Pricing and reacts in Quote readiness', () => {
    renderWorkspace(mockDealMissingPrice);

    // Switch to Products & Pricing
    fireEvent.click(screen.getByRole('button', { name: /Products & Pricing/i }));
    expect(screen.getByText(/Needs price/i)).toBeInTheDocument();

    // Switch to Quote tab
    fireEvent.click(screen.getByRole('button', { name: /^Quote/i }));
    expect(screen.getByText(/Quote Readiness Blockers/i)).toBeInTheDocument();
    expect(screen.getByText(/missing unit sell price/i)).toBeInTheDocument();
  });

  it('Test 6 — renders Quote tab with readable values first and deliberate edit mode', () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /^Quote/i }));

    // Readable values first
    expect(screen.getByText("Q-88210")).toBeInTheDocument();
    expect(screen.getByText("Rev A")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Quote Details/i })).toBeInTheDocument();

    // Enter Edit Mode deliberately
    fireEvent.click(screen.getByRole('button', { name: /Edit Quote Details/i }));
    expect(screen.getByLabelText(/Ostendo Quote Reference/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('Test 7 — handles quote lifecycle actions (Revision, Mark Won)', () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /^Quote/i }));

    expect(screen.getByRole('button', { name: /Create Revision/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark PO Received \(Won\)/i })).toBeInTheDocument();
  });

  it('Test 8 — opens consolidated Communicate menu for AI Email and Call Prep', () => {
    renderWorkspace();

    const commMenuBtn = screen.getByRole('button', { name: /Communicate/i });
    fireEvent.click(commMenuBtn);

    expect(screen.getByText(/Project Enquiry Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Prep Call \/ Talking Points/i)).toBeInTheDocument();
    expect(screen.getByText(/View Account 360°/i)).toBeInTheDocument();
  });

  it('Test 9 — opens consolidated Export menu for Ostendo CSV, Matrix, and Tender Package', () => {
    renderWorkspace();

    const exportMenuBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportMenuBtn);

    expect(screen.getByText(/Download Ostendo CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Ostendo Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Tender Package/i)).toBeInTheDocument();
    expect(screen.getByText(/Export Deal Summary CSV/i)).toBeInTheDocument();
  });

  it('Test 10 — renders Activity tab with filters and expandable chronology', () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /^Activity/i }));

    expect(screen.getByRole('button', { name: /All Activity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Calls/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emails/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Log Activity/i })).toBeInTheDocument();
  });
});
