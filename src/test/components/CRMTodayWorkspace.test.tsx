import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CRMTodayWorkspace } from '../../components/crm/CRMTodayWorkspace';
import { AppProvider, useApp } from '../../context/AppContext';
import { getLocalDateInputValue } from '../../utils/dateUtils';

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
    expect(screen.getByRole('button', { name: /Log meeting outcome/i })).toBeInTheDocument();
  });

  it("Test 5 — Surfaces an imported quote on its saved follow-up date", () => {
    const today = getLocalDateInputValue();
    const quoteDueToday = {
      ...testDeals[0],
      id: 'opp-quote-due-today',
      quoteNumber: 'Q-2048',
      nextAction: 'Follow up on quote Q-2048',
      nextActionDate: today
    };

    render(
      <AppProvider>
        <TodayTestWrapper deals={[quoteDueToday]} tasks={[]} />
      </AppProvider>
    );

    expect(screen.getByText(/Follow up on quote Q-2048/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log follow-up/i })).toBeInTheDocument();
  });

  /**
   * A follow-up that turns out not to be needed has to be removable from here.
   * Leaving it to go overdue trains a rep to ignore the overdue marker on the
   * ones that do matter, and Today is where they actually meet these rows.
   */
  describe("deleting a task from the queue", () => {
    it("offers a delete control on a task row", () => {
      render(
        <AppProvider>
          <TodayTestWrapper />
        </AppProvider>
      );

      expect(
        screen.getByRole("button", { name: /delete task: Call Sarah about DIALux spacing/i })
      ).toBeInTheDocument();
    });

    it("asks before deleting, and keeps the task if the rep backs out", async () => {
      render(
        <AppProvider>
          <TodayTestWrapper />
        </AppProvider>
      );

      fireEvent.click(
        screen.getByRole("button", { name: /delete task: Call Sarah about DIALux spacing/i })
      );

      const dialog = await screen.findByRole("dialog", { name: /delete task/i });
      expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole("button", { name: /keep it/i }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: /delete task/i })).not.toBeInTheDocument()
      );
      expect(screen.getByText(/Call Sarah about DIALux spacing/i)).toBeInTheDocument();
    });

    it("removes the task from the queue once confirmed", async () => {
      render(
        <AppProvider>
          <TodayTestWrapper />
        </AppProvider>
      );

      fireEvent.click(
        screen.getByRole("button", { name: /delete task: Call Sarah about DIALux spacing/i })
      );

      const dialog = await screen.findByRole("dialog", { name: /delete task/i });
      fireEvent.click(within(dialog).getByRole("button", { name: /^delete task$/i }));

      // Asserted on the row's own control rather than its title: the test deal
      // carries the same string as its nextAction, so the text survives on the
      // quote follow-up row even once the task itself is gone.
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: /delete task: Call Sarah about DIALux spacing/i })
        ).not.toBeInTheDocument()
      );
    });

    it("does not offer deletion on rows that are not tasks", () => {
      // A quote follow-up row is a view of the deal's next action. There is no
      // task behind it to delete, and removing the row would only make it
      // reappear on the next render.
      render(
        <AppProvider>
          <TodayTestWrapper tasks={[]} />
        </AppProvider>
      );

      expect(screen.queryByRole("button", { name: /^delete task:/i })).not.toBeInTheDocument();
    });
  });
});
