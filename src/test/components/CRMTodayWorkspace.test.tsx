import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMTodayWorkspace } from '../../components/crm/CRMTodayWorkspace';
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
    quoteStatus: "Sent"
  }
];

const testTasks = [
  {
    id: "task-custom-1",
    title: "Call Sarah about DIALux spacing",
    type: "Call",
    dueDate: "2026-08-20",
    priority: "High",
    status: "Pending",
    assignedTo: "Travis Maher",
    accountId: "acc-custom-1",
    accountName: "Sunshine Coast Council"
  }
];

const TodayTestWrapper: React.FC<{ deals?: any[]; tasks?: any[] }> = ({ deals = testDeals, tasks = testTasks }) => {
  const { addCrmOpportunity, addTask } = useApp();

  React.useEffect(() => {
    deals.forEach((d) => addCrmOpportunity(d));
    tasks.forEach((t) => addTask(t));
  }, []);

  return <CRMTodayWorkspace />;
};

describe("CRM Today's Action Queue Suite (Step 6)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Test 1 — Renders compact header, thin metric strip, and integrated top recommendation", () => {
    render(
      <AppProvider>
        <TodayTestWrapper />
      </AppProvider>
    );

    // 1. Clean Header
    expect(screen.getByRole('heading', { level: 1, name: "Today" })).toBeInTheDocument();

    // 2. Summary Metric Strip
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThanOrEqual(1);

    // 3. Unified Work Queue with Top Priority item
    expect(screen.getByText(/Call Sarah about DIALux spacing/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Priority/i)).toBeInTheDocument();
  });

  it("Test 2 — Renders concise empty state when no action items exist", () => {
    render(
      <AppProvider>
        <CRMTodayWorkspace />
      </AppProvider>
    );

    // Clean single empty state
    expect(screen.getByText(/No sales activity has been created yet/i)).toBeInTheDocument();
  });

  it("Test 3 — Filters work queue items using compact category pills", () => {
    render(
      <AppProvider>
        <TodayTestWrapper />
      </AppProvider>
    );

    // Find and click Overdue filter
    const overdueBtn = screen.getByRole('button', { name: /Overdue/i });
    expect(overdueBtn).toBeInTheDocument();
    fireEvent.click(overdueBtn);

    expect(screen.getByText(/Call Sarah about DIALux spacing/i)).toBeInTheDocument();
  });

  it("Test 4 — Displays proactive meeting preparation strip for tomorrow's meetings", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const meetingTasks = [
      {
        id: "task-meeting-tomorrow",
        title: "ATEC Group Product Review Meeting",
        type: "Meeting",
        dueDate: tomorrowStr,
        dueTime: "10:00",
        priority: "High",
        status: "Pending",
        assignedTo: "Travis Maher",
        accountId: "acc-custom-1",
        accountName: "ATEC Group",
        meetingFormat: "In Person"
      }
    ];

    render(
      <AppProvider>
        <TodayTestWrapper tasks={meetingTasks} />
      </AppProvider>
    );

    // Proactive meeting card is rendered
    expect(screen.getByText(/Upcoming Meetings & Proactive Briefing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ATEC Group Product Review Meeting/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Open Full Briefing/i)).toBeInTheDocument();
  });
});
