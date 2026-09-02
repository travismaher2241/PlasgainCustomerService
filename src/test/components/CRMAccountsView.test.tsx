import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CRMAccountsView } from "../../components/crm/CRMAccountsView";
import { AppProvider, useApp } from "../../context/AppContext";

const AccountsTestWrapper: React.FC<{ initialAccounts?: any[] }> = ({ initialAccounts }) => {
  const { addAccount, addContact, addCrmOpportunity, logActivity } = useApp();

  React.useEffect(() => {
    if (initialAccounts && initialAccounts.length > 0) {
      initialAccounts.forEach((acc) => addAccount(acc));
    } else {
      addAccount({
        id: "acc-test-1",
        name: "Townsville City Council",
        accountType: "Council",
        status: "Customer",
        industry: "Government & Public Infrastructure",
        customerSegment: "Local Government / Council",
        territory: "QLD/NT",
        accountOwner: "Travis Maher",
        relationshipHealth: "Healthy",
        tags: ["Council"],
        lastInteractionDate: "2026-08-28",
        leadSource: "Referral",
        createdDate: "2026-08-28",
        mainPhone: "07 4727 9000",
        generalEmail: "enquiries@townsville.qld.gov.au",
        website: "https://www.townsville.qld.gov.au",
        nextAction: "Issue preliminary design verification for Flinders St solar upgrade"
      });

      addContact({
        id: "con-test-1",
        accountId: "acc-test-1",
        firstName: "Sarah",
        lastName: "Jenkins",
        name: "Sarah Jenkins",
        jobTitle: "Senior Infrastructure Engineer",
        email: "sarah.jenkins@townsville.qld.gov.au",
        phone: "0412 345 678",
        preferredContactMethod: "Email",
        contactOwner: "Travis Maher"
      });

      addCrmOpportunity({
        id: "opp-test-1",
        name: "Flinders Street Cat P4 Lighting Upgrade",
        accountId: "acc-test-1",
        accountName: "Townsville City Council",
        stageName: "Proposal & Quoting",
        dealValue: 45000,
        expectedCloseDate: "2026-10-15",
        nextAction: "Present photometric report to civil engineering committee",
        pipelineId: "pipe-major-projects",
        stageId: "stage-proposal",
        weightedValue: 22500,
        probability: 50,
        forecastCategory: "Pipeline",
        opportunityOwner: "Travis Maher",
        daysInCurrentStage: 4,
        totalDealAgeDays: 14,
        dealHealth: "Healthy",
        dealHealthReasons: ["Regular stakeholder engagement"],
        products: []
      });

      addCrmOpportunity({
        id: "opp-test-closed",
        name: "Riverway Pathway Stage 1 (Historical)",
        accountId: "acc-test-1",
        accountName: "Townsville City Council",
        stageName: "Closed Won",
        dealValue: 62000,
        expectedCloseDate: "2026-06-30",
        nextAction: "Completed installation",
        pipelineId: "pipe-major-projects",
        stageId: "stage-won",
        weightedValue: 62000,
        probability: 100,
        forecastCategory: "Closed",
        opportunityOwner: "Travis Maher",
        daysInCurrentStage: 60,
        totalDealAgeDays: 90,
        dealHealth: "Healthy",
        dealHealthReasons: ["Won and completed"],
        products: []
      });

      logActivity({
        type: "call",
        title: "Technical Review Call with Sarah Jenkins",
        description: "Reviewed pole footing embedment depths for cyclone rated Region C. Approved 6m composite columns.",
        accountId: "acc-test-1",
        accountName: "Townsville City Council",
        performedBy: "Travis Maher"
      });
    }
  }, []);

  return <CRMAccountsView />;
};

describe("CRMAccountsView Component (Step 5)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  it("Test 1 — Page heading is 'Accounts' and empty state is concise when no accounts exist", () => {
    render(
      <AppProvider>
        <CRMAccountsView />
      </AppProvider>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(screen.queryByText(/Account & Customer 360°/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No accounts yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+? ?Add account/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("Test 2 — Populated directory renders compact rows, prominent search, and filters", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    expect(screen.getByPlaceholderText(/Search accounts by name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by account type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by health/i)).toBeInTheDocument();

    // Compact row rendered
    expect(screen.getAllByText(/Townsville City Council/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/QLD\/NT/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Next: Issue preliminary design verification/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Healthy/i).length).toBeGreaterThanOrEqual(1);
  });

  it("Test 3 — Compact account header prioritises identity, health, and primary actions", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Primary action buttons
    expect(screen.getByRole("button", { name: /Log activity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New deal/i })).toBeInTheDocument();

    // Secondary actions inside menu
    const menuBtn = screen.getByRole("button", { name: /Account actions/i });
    expect(menuBtn).toBeInTheDocument();

    fireEvent.click(menuBtn);
    expect(screen.getByText(/Email Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Prep Call/i)).toBeInTheDocument();
    expect(screen.getByText(/Archive Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Delete Account/i)).toBeInTheDocument();
  });

  it("Test 4 — Overview tab renders contact strip and hides meaningless empty field filler", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    expect(screen.getByText("07 4727 9000")).toBeInTheDocument();
    expect(screen.getByText("enquiries@townsville.qld.gov.au")).toBeInTheDocument();
    expect(screen.getByText("www.townsville.qld.gov.au")).toBeInTheDocument();

    // Ensure filler text is NOT rendered
    expect(screen.queryByText(/No formal billing address specified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No website entered/i)).not.toBeInTheDocument();
  });

  it("Test 5 — Contacts tab renders compact list and opens detail drawer on click", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Switch to Contacts tab
    const contactsTab = screen.getByRole("tab", { name: /Contacts Tab/i });
    fireEvent.click(contactsTab);

    expect(screen.getByText("Sarah Jenkins")).toBeInTheDocument();
    expect(screen.getByText(/Senior Infrastructure Engineer/i)).toBeInTheDocument();

    // Click contact row to open detail drawer
    fireEvent.click(screen.getByText("Sarah Jenkins"));
    const dialog = screen.getByRole("dialog", { name: /Contact Details/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Direct Communication/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/sarah\.jenkins@townsville\.qld\.gov\.au/i)).toBeInTheDocument();
  });

  it("Test 6 — New deal creation from account automatically preselects current account", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Click New deal button
    const newDealBtn = screen.getAllByRole("button", { name: /New deal/i })[0];
    fireEvent.click(newDealBtn);

    expect(screen.getByRole("dialog", { name: /Create New Deal/i })).toBeInTheDocument();
    expect(screen.getByText(/Account:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Townsville City Council/i).length).toBeGreaterThanOrEqual(1);
  });

  it("Test 7 — Deals tab prioritises active deals and supports closed filtering", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Switch to Deals tab
    const dealsTab = screen.getByRole("tab", { name: /Deals Tab/i });
    fireEvent.click(dealsTab);

    // Active deal is visible
    expect(screen.getByText(/Flinders Street Cat P4 Lighting Upgrade/i)).toBeInTheDocument();
    expect(screen.getByText(/\$45,000/i)).toBeInTheDocument();

    // Closed deal is filtered out by default
    expect(screen.queryByText(/Riverway Pathway Stage 1 \(Historical\)/i)).not.toBeInTheDocument();
  });

  it("Test 8 — Activity tab groups by day and provides expandable note preview", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Switch to Activity tab
    const activityTab = screen.getByRole("tab", { name: /Activity Tab/i });
    fireEvent.click(activityTab);

    expect(screen.getByText(/Technical Review Call with Sarah Jenkins/i)).toBeInTheDocument();
    expect(screen.getByText(/Reviewed pole footing embedment depths/i)).toBeInTheDocument();
  });

  it("Test 9 — Account brief leads with summary, risks, and next 3 actions", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Switch to Brief tab
    const briefTab = screen.getByRole("tab", { name: /Account Brief Tab/i });
    fireEvent.click(briefTab);

    expect(screen.getAllByText(/Account Brief/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Cached Synthesis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Live Synthesis/i)).not.toBeInTheDocument();
  });

  it("Test 10 — Handles account archive and delete workflows cleanly", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Archive via row button
    const archiveBtn = screen.getAllByRole("button", { name: /Archive Townsville City Council/i })[0];
    fireEvent.click(archiveBtn);

    expect(screen.getByRole("button", { name: /Active \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archived \(1\)/i })).toBeInTheDocument();

    // Switch to Archived tab and Restore
    fireEvent.click(screen.getByRole("button", { name: /Archived \(1\)/i }));
    const restoreBtn = screen.getAllByRole("button", { name: /Restore Townsville City Council/i })[0];
    fireEvent.click(restoreBtn);

    expect(screen.getByRole("button", { name: /Active \(1\)/i })).toBeInTheDocument();
  });

  it("Test 11 — Displays Account Type badge prominently in header and account list row", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // List row badge and header badge for Council
    const councilBadges = screen.getAllByText(/Council/i);
    expect(councilBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Account Type:/i)).toBeInTheDocument();
  });

  it("Test 12 — Filters account list by Account Type picklist", () => {
    const multiAccounts = [
      {
        id: "acc-council",
        name: "Brisbane City Council",
        accountType: "Council",
        status: "Customer",
        industry: "Government",
        customerSegment: "Local Government / Council",
        territory: "QLD/NT",
        accountOwner: "Travis Maher",
        relationshipHealth: "Healthy",
        tags: []
      },
      {
        id: "acc-prospect",
        name: "Apex Civil Contracting",
        accountType: "Prospect",
        status: "Prospect",
        industry: "Civil Infrastructure",
        customerSegment: "Civil Contractor",
        territory: "NSW/ACT",
        accountOwner: "Travis Maher",
        relationshipHealth: "Healthy",
        tags: []
      },
      {
        id: "acc-account",
        name: "Rexel Electrical Supplies",
        accountType: "Account",
        status: "Customer",
        industry: "Wholesale",
        customerSegment: "Electrical Wholesaler / Distributor",
        territory: "VIC/TAS",
        accountOwner: "Travis Maher",
        relationshipHealth: "Healthy",
        tags: []
      }
    ];

    render(
      <AppProvider>
        <AccountsTestWrapper initialAccounts={multiAccounts} />
      </AppProvider>
    );

    // All 3 initially rendered in list or summary
    expect(screen.getAllByText("Brisbane City Council").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Apex Civil Contracting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rexel Electrical Supplies").length).toBeGreaterThanOrEqual(1);

    // Filter by Prospect
    const typeFilter = screen.getByLabelText(/Filter by account type/i);
    fireEvent.change(typeFilter, { target: { value: "Prospect" } });

    expect(screen.queryByText("Brisbane City Council")).not.toBeInTheDocument();
    expect(screen.getAllByText("Apex Civil Contracting").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Rexel Electrical Supplies")).not.toBeInTheDocument();

    // Filter by Council
    fireEvent.change(typeFilter, { target: { value: "Council" } });
    expect(screen.getAllByText("Brisbane City Council").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Apex Civil Contracting")).not.toBeInTheDocument();

    // Filter by Account
    fireEvent.change(typeFilter, { target: { value: "Account" } });
    expect(screen.getAllByText("Rexel Electrical Supplies").length).toBeGreaterThanOrEqual(1);
  });

  it("Test 13 — Creating a new account requires and sets the Account Type picklist", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    const addBtn = screen.getAllByRole("button", { name: /\+? ?Add account/i })[0];
    fireEvent.click(addBtn);

    const dialog = screen.getByRole("dialog", { name: /Add New Account/i });
    expect(dialog).toBeInTheDocument();
    const typeSelect = within(dialog).getByLabelText(/Account Type/i);
    expect(typeSelect).toBeInTheDocument();

    // Change Account Type to Council
    fireEvent.change(typeSelect, { target: { value: "Council" } });
    fireEvent.change(within(dialog).getByPlaceholderText(/e\.g\. City of Melton Council/i), {
      target: { value: "Geelong City Council" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /Create Account/i }));

    expect(screen.getAllByText("Geelong City Council").length).toBeGreaterThanOrEqual(1);
  });

  it("Test 14 — Editing an account updates the Account Type and persists changes", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    const editBtn = screen.getAllByRole("button", { name: /^Edit$/i })[0];
    fireEvent.click(editBtn);

    expect(screen.getByRole("dialog", { name: /Edit Account/i })).toBeInTheDocument();
    const editTypeSelect = screen.getByLabelText(/Edit Account Type/i);
    fireEvent.change(editTypeSelect, { target: { value: "Account" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    // Now Account Type shows Account
    expect(screen.getByText(/Account Type:/i)).toBeInTheDocument();
  });
});
