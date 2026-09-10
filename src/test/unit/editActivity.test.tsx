import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "../../context/AppContext";
import { CRMAccountsView } from "../../components/crm/CRMAccountsView";
import { CRMQuickLogModal } from "../../components/crm/CRMQuickLogModal";
import { makeAccount, makeContact } from "../factories";

vi.mock("../../utils/firebase", () => ({
  saveDocToCloud: vi.fn().mockResolvedValue(true),
  loadDocFromCloud: vi.fn().mockResolvedValue(null),
  loadCollectionFromCloud: vi.fn().mockReturnValue(new Promise(() => {})),
  deleteDocFromCloud: vi.fn().mockResolvedValue(true),
  clearCollectionFromCloud: vi.fn().mockResolvedValue(true),
  syncBatchToCloud: vi.fn().mockResolvedValue(true),
  checkCloudHealth: vi.fn().mockResolvedValue(true),
  flushOfflineQueue: vi.fn().mockResolvedValue({ success: true, processedCount: 0 }),
  getQueuedWritesCount: vi.fn().mockReturnValue(0),
  getLastSyncTime: vi.fn().mockReturnValue(new Date().toISOString()),
  recordSuccessfulSync: vi.fn()
}));

const ActivityEditHarness: React.FC = () => {
  const {
    activities,
    addAccount,
    addContact,
    logActivity,
    openEditActivity
  } = useApp();

  return (
    <div>
      <button
        data-testid="seed-btn"
        onClick={() => {
          addAccount(
            makeAccount({
              id: "acc-1",
              name: "Plasgain Industrial",
              accountType: "Account",
              status: "Customer"
            })
          );
          addContact(
            makeContact({
              id: "con-1",
              accountId: "acc-1",
              firstName: "Admin",
              lastName: "Admin",
              email: "admin@example.com"
            })
          );
          addContact(
            makeContact({
              id: "con-2",
              accountId: "acc-1",
              firstName: "Sarah",
              lastName: "Jenkins",
              email: "sarah@example.com"
            })
          );
          logActivity({
            type: "email",
            title: "Email sent to Admin Admin",
            description: "Sent catalog and requested specification details.",
            accountId: "acc-1",
            accountName: "Plasgain Industrial",
            contactId: "con-1",
            contactName: "Admin Admin",
            contactIds: ["con-1"],
            outcome: "Email Sent",
            activityDate: "2026-09-10",
            activityTime: "10:00 AM",
            timestamp: "2026-09-10T00:00:00.000Z"
          });
        }}
      >
        Seed
      </button>

      <button
        data-testid="edit-btn"
        onClick={() => {
          if (activities.length > 0) openEditActivity(activities[0]);
        }}
      >
        Open Edit Activity
      </button>

      <div data-testid="activity-title">
        {activities[0]?.title}
      </div>
      <div data-testid="activity-contact">
        {activities[0]?.contactName}
      </div>
      <div data-testid="activity-contact-id">
        {activities[0]?.contactId}
      </div>
      <div data-testid="activity-date">
        {activities[0]?.activityDate}
      </div>

      <CRMQuickLogModal />
    </div>
  );
};

describe("Edit Activity functionality", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("opens the modal with activity details prefilled and allows changing contact and date", async () => {
    render(
      <AppProvider>
        <ActivityEditHarness />
      </AppProvider>
    );

    // Seed test data
    fireEvent.click(screen.getByTestId("seed-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("activity-title").textContent).toBe("Email sent to Admin Admin");
      expect(screen.getByTestId("activity-contact").textContent).toBe("Admin Admin");
    });

    // Open Edit modal
    fireEvent.click(screen.getByTestId("edit-btn"));

    // Modal should show edit headers
    await waitFor(() => {
      expect(screen.getByText("Edit customer interaction")).toBeInTheDocument();
      expect(screen.getByText("Save changes")).toBeInTheDocument();
    });

    // Check prefilled fields
    const titleInput = screen.getByPlaceholderText(/e\.g\. Email sent to Sarah Jenkins/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Email sent to Admin Admin");

    // Change contact: uncheck Admin Admin, check Sarah Jenkins
    const adminCheckbox = screen.getByLabelText(/Admin Admin/i) as HTMLInputElement;
    const sarahCheckbox = screen.getByLabelText(/Sarah Jenkins/i) as HTMLInputElement;

    expect(adminCheckbox.checked).toBe(true);
    expect(sarahCheckbox.checked).toBe(false);

    fireEvent.click(adminCheckbox);
    fireEvent.click(sarahCheckbox);

    expect(adminCheckbox.checked).toBe(false);
    expect(sarahCheckbox.checked).toBe(true);

    // Click auto-generate title to test title recalculation
    const autoGenBtn = screen.getByText("Auto-generate title");
    fireEvent.click(autoGenBtn);
    expect(titleInput.value).toBe("Email sent to Sarah Jenkins");

    // Change date to a past date
    const dateInput = screen.getByLabelText("Activity Date") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-09-08" } });

    // Submit changes
    const saveBtn = screen.getByText("Save changes");
    fireEvent.click(saveBtn);

    // Verify modal closes and activity updates
    await waitFor(() => {
      expect(screen.queryByText("Edit customer interaction")).not.toBeInTheDocument();
      expect(screen.getByTestId("activity-title").textContent).toBe("Email sent to Sarah Jenkins");
      expect(screen.getByTestId("activity-contact").textContent).toBe("Sarah Jenkins");
      expect(screen.getByTestId("activity-contact-id").textContent).toBe("con-2");
      expect(screen.getByTestId("activity-date").textContent).toBe("2026-09-08");
    });
  });

  it("renders Edit button in CRMAccountsView timeline and clicking it opens edit modal", async () => {
    const FullTimelineHarness: React.FC = () => {
      const { addAccount, addContact, logActivity } = useApp();

      return (
        <div>
          <button
            data-testid="seed-btn"
            onClick={() => {
              addAccount(
                makeAccount({
                  id: "acc-timeline",
                  name: "Civil Co",
                  accountType: "Account",
                  status: "Customer"
                })
              );
              addContact(
                makeContact({
                  id: "con-timeline",
                  accountId: "acc-timeline",
                  accountName: "Civil Co",
                  firstName: "Bob",
                  lastName: "Builder"
                })
              );
              logActivity({
                type: "call",
                title: "Call with Bob Builder",
                description: "Discussed project timelines.",
                accountId: "acc-timeline",
                accountName: "Civil Co",
                contactId: "con-timeline",
                contactName: "Bob Builder",
                contactIds: ["con-timeline"],
                outcome: "Spoke — follow-up needed",
                activityDate: "2026-09-09",
                activityTime: "11:00 AM",
                timestamp: "2026-09-09T01:00:00.000Z"
              });
            }}
          >
            Seed
          </button>
          <CRMAccountsView />
          <CRMQuickLogModal />
        </div>
      );
    };

    render(
      <AppProvider>
        <FullTimelineHarness />
      </AppProvider>
    );

    // Seed
    fireEvent.click(screen.getByTestId("seed-btn"));

    // Navigate to Activity tab
    const activityTab = await screen.findByRole("tab", { name: /Activity Tab/i });
    fireEvent.click(activityTab);

    // Find the activity in timeline
    await screen.findByText("Call with Bob Builder");

    // Verify Edit button is rendered next to Change Date
    const editBtn = screen.getByRole("button", { name: /Edit activity Call with Bob Builder/i });
    expect(editBtn).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change date for Call with Bob Builder/i })).toBeInTheDocument();

    // Click Edit button
    fireEvent.click(editBtn);

    // Edit modal should open with activity prefilled
    await waitFor(() => {
      expect(screen.getByText("Edit customer interaction")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Call with Bob Builder")).toBeInTheDocument();
    });
  });
});
