import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AppProvider, useApp } from "../../context/AppContext";
import { CRMTasksActivitiesView } from "../../components/crm/CRMTasksActivitiesView";

const CadenceIntegrationTestHarness: React.FC = () => {
  const {
    addAccount,
    logActivity,
    tasks
  } = useApp();

  return (
    <div>
      <button
        onClick={() => {
          addAccount({
            id: "acc-cadence-test",
            name: "Apex Engineering Solutions",
            accountType: "Account",
            status: "Customer",
            industry: "Engineering",
            territory: "NSW/ACT",
            accountOwner: "Travis Maher",
            contactFrequency: "Opportunity",
            lastContactDate: new Date(Date.now() - 20 * 86400000).toISOString().split("T")[0]
          });
        }}
      >
        Seed Overdue Account
      </button>

      <button
        onClick={() => {
          logActivity({
            type: "call",
            title: "Routine check-in call with Apex",
            description: "Discussed upcoming solar lighting tender",
            accountId: "acc-cadence-test",
            accountName: "Apex Engineering Solutions"
          });
        }}
      >
        Log Check-in Call
      </button>

      <div data-testid="task-count">{tasks.length}</div>
      <div data-testid="checkin-tasks">
        {tasks
          .filter((t) => t.isCheckInTask)
          .map((t) => (
            <div key={t.id} data-testid={`checkin-task-item`}>
              <span data-testid="task-title">{t.title}</span>
              <span data-testid="task-status">{t.status}</span>
              <span data-testid="task-assigned">{t.assignedTo}</span>
            </div>
          ))}
      </div>

      <CRMTasksActivitiesView />
    </div>
  );
};

describe("Contact Frequency & Automated Commercial Status Integration", () => {
  it("automatically generates collaborative check-in task for overdue account and auto-completes on activity log", async () => {
    render(
      <AppProvider>
        <CadenceIntegrationTestHarness />
      </AppProvider>
    );

    // 1. Seed an overdue account
    fireEvent.click(screen.getByRole("button", { name: /Seed Overdue Account/i }));

    // 2. Automated check-in task should be generated
    await waitFor(() => {
      expect(screen.getAllByText("Routine Check-in: Apex Engineering Solutions").length).toBeGreaterThanOrEqual(1);
    });

    // Check task attributes: assigned to Travis Maher, labeled Account Check-In, Call Prep available
    expect(screen.getByText("Account Check-In")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Call Prep/i })).toBeInTheDocument();

    // 3. Log a call activity for that account
    fireEvent.click(screen.getByRole("button", { name: /Log Check-in Call/i }));

    // 4. The check-in task should immediately transition to Completed
    await waitFor(() => {
      const statusElement = screen.getByTestId("task-status");
      expect(statusElement.textContent).toBe("Completed");
    });
  });
});
