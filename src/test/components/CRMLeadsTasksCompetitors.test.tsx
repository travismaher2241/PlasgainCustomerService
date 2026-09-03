import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMLeadsView } from '../../components/crm/CRMLeadsView';
import { CRMTasksActivitiesView } from '../../components/crm/CRMTasksActivitiesView';
import { CRMCompetitorPricingView } from '../../components/crm/CRMCompetitorPricingView';
import { AppProvider, useApp } from '../../context/AppContext';

const testCompetitorRecords = [
  {
    id: "cp-fixture-1",
    accountId: "acc-fixture-1",
    accountName: "Wyndham Civil Group",
    competitorName: "Alpha Lighting",
    competitorProduct: "Alpha 60W Solar Column",
    price: 2100,
    currency: "AUD",
    priceBasis: "Per Unit",
    gstStatus: "Ex GST",
    sourceType: "Customer Verbal",
    observedDate: "2026-08-20",
    notes: "Quoted on 6m column",
    status: "Active",
    createdBy: "Travis Maher"
  },
  {
    id: "cp-fixture-2",
    accountId: "acc-fixture-2",
    accountName: "Historical Observation",
    competitorName: "Beta Solar",
    competitorProduct: "Beta Series (Superseded Model)",
    price: 1800,
    currency: "AUD",
    priceBasis: "Per Unit",
    gstStatus: "Ex GST",
    sourceType: "Public Tender Schedule",
    observedDate: "2025-05-10",
    notes: "Old generation model",
    status: "Superseded",
    createdBy: "Travis Maher"
  }
];

const LeadsTestWrapper: React.FC = () => {
  const { addLead } = useApp();

  React.useEffect(() => {
    addLead({
      id: "lead-test-1",
      leadName: "Cardinia Shire Lighting Upgrade",
      contactName: "David Miller",
      contactEmail: "david.miller@cardinia.vic.gov.au",
      contactPhone: "03 5945 0000",
      company: "Cardinia Shire Council",
      source: "Web Form",
      enquiryType: "Solar Pathway Lighting",
      leadStatus: "New",
      leadScore: 85,
      scoringFactors: [
        { factor: "Verified Organisation", scoreDelta: 30, reason: "Verified company organisation" },
        { factor: "High Intent", scoreDelta: 30, reason: "High intent scope" },
        { factor: "Direct Phone", scoreDelta: 25, reason: "Direct phone provided" }
      ],
      estimatedValue: 42000,
      estimatedValueBasis: "Estimate",
      territory: "VIC/TAS",
      productInterest: ["Plasgain Pro Blade 75"],
      location: "VIC",
      notes: "Enquiry for 16 composite solar lights on community shared trail.",
      nextAction: "Schedule technical consultation with council engineer",
      nextActionDate: "2026-09-05",
      dateReceived: "2026-08-28",
      leadScoreRating: "Warm",
      urgency: "Within 1 Month",
      lastActivity: "Lead created",
      lastActivityDate: "2026-08-28",
      assignedSalesperson: "Travis Maher"
    });
  }, []);

  return <CRMLeadsView />;
};

const TasksTestWrapper: React.FC = () => {
  const { addTask, logActivity } = useApp();

  React.useEffect(() => {
    addTask({
      title: "Review footing design for cyclone Region C",
      type: "Research",
      dueDate: "2026-09-10",
      priority: "High",
      status: "To Do",
      assignedTo: "Travis Maher",
      createdBy: "Travis Maher",
      accountName: "Townsville City Council",
      notes: "Confirm embedment depths with structural team."
    });

    addTask({
      title: "Archived historical task",
      type: "Call",
      dueDate: "2026-08-01",
      priority: "Medium",
      status: "Completed",
      assignedTo: "Travis Maher",
      createdBy: "Travis Maher"
    });

    logActivity({
      type: "meeting",
      title: "Design alignment meeting with Cardinia Shire",
      description: "Discussed Cat P4 requirements and confirmed 6m pole heights with zero glare optics.",
      accountName: "Cardinia Shire Council",
      performedBy: "Travis Maher"
    });
  }, []);

  return <CRMTasksActivitiesView />;
};

describe("CRM Leads, Tasks, Activity & Competitor Pricing Suite (Step 6)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Test 1 — Leads view uses 'Leads' title, 'Add lead' action, and collapses score details", () => {
    render(
      <AppProvider>
        <LeadsTestWrapper />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: "Leads" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add lead/i })).toBeInTheDocument();

    // Lead row
    expect(screen.getAllByText("Cardinia Shire Council").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Score 85")).toBeInTheDocument();

    // Next Action near top
    expect(screen.getAllByText(/Schedule technical consultation with council engineer/i).length).toBeGreaterThanOrEqual(1);

    // Why this score? disclosure
    const whyScoreBtn = screen.getByRole('button', { name: /Why this score\?/i });
    expect(whyScoreBtn).toBeInTheDocument();
    fireEvent.click(whyScoreBtn);
    expect(screen.getByText(/Verified company organisation/i)).toBeInTheDocument();
  });

  it("Test 2 — Tasks view hides bulk checkboxes by default and reveals them in Select mode", () => {
    render(
      <AppProvider>
        <TasksTestWrapper />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: "Tasks" })).toBeInTheDocument();

    // In normal mode, selection checkboxes are not present
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Open task is visible, completed task is filtered out by default
    expect(screen.getByText("Review footing design for cyclone Region C")).toBeInTheDocument();
    expect(screen.queryByText("Archived historical task")).not.toBeInTheDocument();

    // Toggle Select mode
    const selectModeBtn = screen.getByRole('button', { name: /Select Tasks/i });
    fireEvent.click(selectModeBtn);

    // Selection checkbox appears
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it("Test 3 — Tasks view does not display Activity Log sub-tab, remaining purely focused on tasks", () => {
    render(
      <AppProvider>
        <TasksTestWrapper />
      </AppProvider>
    );

    // Activity Log sub-tab is completely removed from Tasks view
    expect(screen.queryByRole('button', { name: /Activity Log/i })).not.toBeInTheDocument();

    // Tasks heading, counter and Add task button are displayed
    expect(screen.getByRole('heading', { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(screen.getAllByText(/open/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Add task/i })).toBeInTheDocument();
  });

  it("Test 4 — Competitor pricing defaults to Current records and preserves commercial evidence", () => {
    localStorage.setItem("plasgain_competitor_pricing", JSON.stringify(testCompetitorRecords));

    render(
      <AppProvider>
        <CRMCompetitorPricingView />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: "Competitor pricing" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add competitor price/i })).toBeInTheDocument();

    // Active record visible
    expect(screen.getAllByText("Alpha Lighting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Alpha 60W Solar Column")).toBeInTheDocument();
    expect(screen.getByText(/\$2,100/i)).toBeInTheDocument();
    expect(screen.getByText("Per Unit")).toBeInTheDocument();
    expect(screen.getByText("Ex GST")).toBeInTheDocument();

    // Superseded record filtered out by default
    expect(screen.queryByText("Beta Series (Superseded Model)")).not.toBeInTheDocument();

    // Switch to Superseded filter
    const supersededFilterBtn = screen.getByRole('button', { name: "Superseded" });
    fireEvent.click(supersededFilterBtn);

    expect(screen.getAllByText("Beta Solar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Beta Series (Superseded Model)")).toBeInTheDocument();
  });
});
