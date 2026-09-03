import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "../../context/AppContext";
import { AdminAuditLogView } from "../../components/AdminAuditLogView";
import { CRMQuickLogModal } from "../../components/crm/CRMQuickLogModal";
import { CRMAccountsView } from "../../components/crm/CRMAccountsView";

// Mock Firebase cloud functions
vi.mock("../../utils/firebase", () => ({
  saveDocToCloud: vi.fn().mockResolvedValue(true),
  loadDocFromCloud: vi.fn().mockResolvedValue(null),
  loadCollectionFromCloud: vi.fn().mockResolvedValue([]),
  deleteDocFromCloud: vi.fn().mockResolvedValue(true),
  clearCollectionFromCloud: vi.fn().mockResolvedValue(true),
  syncBatchToCloud: vi.fn().mockResolvedValue(true),
  checkCloudHealth: vi.fn().mockResolvedValue(true),
  flushOfflineQueue: vi.fn().mockResolvedValue({ success: true, processedCount: 0 }),
  getQueuedWritesCount: vi.fn().mockReturnValue(0),
  getLastSyncTime: vi.fn().mockReturnValue(new Date().toISOString()),
  recordSuccessfulSync: vi.fn()
}));

const TestMutationsTrigger: React.FC = () => {
  const { addAccount, addContact, logActivity, addCrmOpportunity, updateCrmOpportunity, currentUser } = useApp();

  return (
    <div>
      <button
        onClick={() =>
          addAccount({
            id: "acc-test-101",
            name: "Brisbane Civil Works",
            accountType: "Account",
            status: "Customer",
            industry: "Civil Infrastructure",
            customerRelationshipStatus: "Active"
          })
        }
      >
        Add Test Account
      </button>

      <button
        onClick={() =>
          addContact({
            id: "con-test-101",
            accountId: "acc-test-101",
            accountName: "Brisbane Civil Works",
            firstName: "David",
            lastName: "Miller",
            jobTitle: "Senior Project Engineer",
            email: "david@brisbanecivil.com.au",
            mobile: "0412 345 678"
          })
        }
      >
        Add Test Contact
      </button>

      <button
        onClick={() =>
          logActivity({
            type: "call",
            title: "Project Discovery Call with David",
            description: "Discussed solar bollard specifications for riverside precinct.",
            accountId: "acc-test-101",
            accountName: "Brisbane Civil Works",
            outcome: "Connected / Positive"
          })
        }
      >
        Log Test Call
      </button>

      <button
        onClick={() =>
          addCrmOpportunity({
            id: "deal-test-101",
            name: "Riverside Shared Path Lighting",
            accountId: "acc-test-101",
            accountName: "Brisbane Civil Works",
            pipelineId: "pipe-major-projects",
            stageId: "stage-discovery",
            stageName: "Discovery & Qualification",
            dealValue: 45000,
            weightedValue: 11250,
            probability: 25,
            forecastCategory: "Pipeline",
            expectedCloseDate: "2026-10-15",
            products: []
          })
        }
      >
        Add Test Deal
      </button>

      <button
        onClick={() =>
          updateCrmOpportunity("deal-test-101", {
            stageId: "stage-quote-sent",
            stageName: "Quote Sent & Follow-up",
            probability: 60
          })
        }
      >
        Advance Deal Stage
      </button>
    </div>
  );
};

describe("Multi-User Shared Database, Call Attribution & Admin Audit Trail", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("1. automatically records audit log entries when accounts, contacts, and deals are created and modified", async () => {
    render(
      <AppProvider>
        <TestMutationsTrigger />
        <AdminAuditLogView />
      </AppProvider>
    );

    // Create Account
    fireEvent.click(screen.getByText("Add Test Account"));
    expect(screen.getByText(/Created Account: Brisbane Civil Works/i)).toBeInTheDocument();

    // Create Contact
    fireEvent.click(screen.getByText("Add Test Contact"));
    expect(screen.getByText(/Added contact David Miller \(Senior Project Engineer\) for Brisbane Civil Works/i)).toBeInTheDocument();

    // Log Call
    fireEvent.click(screen.getByText("Log Test Call"));
    expect(screen.getByText(/Logged call: "Project Discovery Call with David"/i)).toBeInTheDocument();

    // Create Deal
    fireEvent.click(screen.getByText("Add Test Deal"));
    expect(screen.getByText(/Created deal: Riverside Shared Path Lighting \(\$45,000\)/i)).toBeInTheDocument();

    // Advance Deal Stage
    fireEvent.click(screen.getByText("Advance Deal Stage"));
    expect(screen.getByText(/Moved deal "Riverside Shared Path Lighting" from Discovery & Qualification -> Quote Sent & Follow-up/i)).toBeInTheDocument();
  });

  it("2. provides filtering by user, action type, entity type, and search query in AdminAuditLogView", async () => {
    render(
      <AppProvider>
        <TestMutationsTrigger />
        <AdminAuditLogView />
      </AppProvider>
    );

    fireEvent.click(screen.getByText("Add Test Account"));
    fireEvent.click(screen.getByText("Log Test Call"));

    // Filter by Action Type: Customer Calls Logged
    const actionSelect = screen.getByLabelText(/Filter by Action Type/i);
    fireEvent.change(actionSelect, { target: { value: "CALL_LOGGED" } });

    // Call should be visible, account creation should be filtered out
    expect(screen.getAllByText(/Project Discovery Call with David/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Created Account: Brisbane Civil Works/i)).not.toBeInTheDocument();

    // Filter by Entity Type: Account
    fireEvent.change(actionSelect, { target: { value: "all" } });
    const entitySelect = screen.getByLabelText(/Filter by Entity Type/i);
    fireEvent.change(entitySelect, { target: { value: "Account" } });

    expect(screen.getByText(/Created Account: Brisbane Civil Works/i)).toBeInTheDocument();
    expect(screen.queryByText(/Project Discovery Call with David/i)).not.toBeInTheDocument();

    // Search query filter
    fireEvent.change(entitySelect, { target: { value: "all" } });
    const searchInput = screen.getByPlaceholderText(/Search by details, account, user.../i);
    fireEvent.change(searchInput, { target: { value: "Discovery" } });

    expect(screen.getAllByText(/Project Discovery Call with David/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Created Account: Brisbane Civil Works/i)).not.toBeInTheDocument();
  });

  it("3. displays caller attribution in Account Interaction Timeline", async () => {
    render(
      <AppProvider>
        <TestMutationsTrigger />
        <CRMAccountsView />
      </AppProvider>
    );

    fireEvent.click(screen.getByText("Add Test Account"));
    fireEvent.click(screen.getByText("Log Test Call"));

    // Navigate to Account detail and activity tab
    const activityTabBtn = screen.getByRole("tab", { name: "Activity Tab" });
    fireEvent.click(activityTabBtn);

    // Verify caller attribution indicator
    expect(screen.getByText(/Account Interaction Timeline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Logged by/i).length).toBeGreaterThan(0);
  });
});
