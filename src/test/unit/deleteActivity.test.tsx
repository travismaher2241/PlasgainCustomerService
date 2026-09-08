import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "../../context/AppContext";
import { CRMAccountsView } from "../../components/crm/CRMAccountsView";
import { makeAccount, makeContact } from "../factories";
import * as firebase from "../../utils/firebase";

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

const ActivityDeleteTestConsumer: React.FC = () => {
  const {
    activities,
    tasks,
    accounts,
    auditLogs,
    addAccount,
    logActivity,
    deleteActivity
  } = useApp();

  return (
    <div>
      <div data-testid="activity-count">{activities.length}</div>
      <div data-testid="task-count">{tasks.length}</div>
      <div data-testid="account-last-contact">
        {accounts.find((a) => a.id === "acc-delete-test")?.lastContactDate || "none"}
      </div>
      <div data-testid="audit-log-count">{auditLogs.length}</div>

      <button
        onClick={() => {
          addAccount(
            makeAccount({
              id: "acc-delete-test",
              name: "Lowe Construction",
              accountType: "Account",
              status: "Customer"
            })
          );
        }}
      >
        Setup Account
      </button>

      <button
        onClick={() => {
          logActivity({
            type: "call",
            title: "Discussion with Lowe team",
            accountId: "acc-delete-test",
            accountName: "Lowe Construction",
            timestamp: "2026-02-10T11:00:00.000Z"
          });
        }}
      >
        Log Call
      </button>

      <button
        onClick={() => {
          logActivity({
            type: "meeting",
            title: "Site visit and scope alignment",
            accountId: "acc-delete-test",
            accountName: "Lowe Construction",
            timestamp: "2026-02-15T10:00:00.000Z"
          });
        }}
      >
        Log Meeting
      </button>

      <button
        onClick={() => {
          const act = activities.find((a) => a.title === "Discussion with Lowe team");
          if (act) deleteActivity(act.id);
        }}
      >
        Delete Call Activity
      </button>

      <button
        onClick={() => {
          const act = activities.find((a) => a.title === "Site visit and scope alignment");
          if (act) deleteActivity(act.id);
        }}
      >
        Delete Meeting Activity
      </button>
    </div>
  );
};

describe("deleteActivity functionality", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("deletes an activity from AppContext, updates cloud, and records audit log", async () => {
    render(
      <AppProvider>
        <ActivityDeleteTestConsumer />
      </AppProvider>
    );

    // 1. Setup account
    fireEvent.click(screen.getByText("Setup Account"));

    // 2. Log call activity
    fireEvent.click(screen.getByText("Log Call"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-count").textContent).toBe("1");
    });

    // 3. Delete call activity
    fireEvent.click(screen.getByText("Delete Call Activity"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-count").textContent).toBe("0");
    });

    // Verify deleteDocFromCloud was called for crm_activities
    expect(firebase.deleteDocFromCloud).toHaveBeenCalledWith(
      "crm_activities",
      expect.stringMatching(/^act-/)
    );
  });

  it("deletes linked auto-created calendar meeting tasks when meeting activity is deleted", async () => {
    render(
      <AppProvider>
        <ActivityDeleteTestConsumer />
      </AppProvider>
    );

    fireEvent.click(screen.getByText("Setup Account"));
    fireEvent.click(screen.getByText("Log Meeting"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-count").textContent).toBe("1");
      // Meeting generates an auto-created task in tasks list
      expect(Number(screen.getByTestId("task-count").textContent)).toBeGreaterThan(0);
    });

    const initialTaskCount = Number(screen.getByTestId("task-count").textContent);

    // Delete meeting activity
    fireEvent.click(screen.getByText("Delete Meeting Activity"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-count").textContent).toBe("0");
      expect(Number(screen.getByTestId("task-count").textContent)).toBe(initialTaskCount - 1);
    });

    // Verify task was deleted from cloud
    expect(firebase.deleteDocFromCloud).toHaveBeenCalledWith(
      "crm_tasks",
      expect.stringMatching(/^meeting-log-/)
    );
  });

  it("recalculates account contact date to remaining activities after deletion", async () => {
    render(
      <AppProvider>
        <ActivityDeleteTestConsumer />
      </AppProvider>
    );

    fireEvent.click(screen.getByText("Setup Account"));
    fireEvent.click(screen.getByText("Log Call")); // 2026-02-10
    fireEvent.click(screen.getByText("Log Meeting")); // 2026-02-15

    await waitFor(() => {
      expect(screen.getByTestId("account-last-contact").textContent).toBe("2026-02-15");
    });

    // Delete the later meeting activity
    fireEvent.click(screen.getByText("Delete Meeting Activity"));

    await waitFor(() => {
      // Recalculates to the remaining call activity date
      expect(screen.getByTestId("account-last-contact").textContent).toBe("2026-02-10");
    });
  });

  it("allows deleting an activity from CRMAccountsView timeline with confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const AccountsTestSetup: React.FC = () => {
      const { addAccount, addContact, logActivity } = useApp();

      return (
        <div>
          <button
            onClick={() => {
              addAccount(
                makeAccount({
                  id: "acc-lowe",
                  name: "Lowe",
                  accountType: "Account",
                  status: "Customer"
                })
              );
              addContact(
                makeContact({
                  id: "con-lowe-1",
                  accountId: "acc-lowe",
                  accountName: "Lowe",
                  firstName: "Alan",
                  lastName: "Berryman"
                })
              );
              logActivity({
                accountId: "acc-lowe",
                accountName: "Lowe",
                type: "quote_sent",
                title: "Quote PL5597 sent",
                description: "$17,625.33 ex GST — Grant street and Pawan road public lighting",
                timestamp: "2026-02-10T11:00:00.000Z"
              });
            }}
          >
            Seed Lowe
          </button>
          <CRMAccountsView />
        </div>
      );
    };

    render(
      <AppProvider>
        <AccountsTestSetup />
      </AppProvider>
    );

    fireEvent.click(screen.getByText("Seed Lowe"));

    // Navigate to Activity tab
    const activityTab = await screen.findByRole("tab", { name: /Activity Tab/i });
    fireEvent.click(activityTab);

    // Find the activity in timeline
    await screen.findByText("Quote PL5597 sent");

    // Click Delete button on the activity card
    const deleteBtn = screen.getByRole("button", { name: /Delete activity Quote PL5597 sent/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();

    // Verify activity card is removed from timeline
    await waitFor(() => {
      expect(screen.queryByText("Quote PL5597 sent")).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});
