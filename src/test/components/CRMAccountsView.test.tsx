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
        customerRelationshipStatus: "Active",
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
    // No second filter on initial load when All Types is selected
    expect(screen.queryByLabelText(/Filter by relationship status|Filter by prospect stage|Filter by status or stage/i)).not.toBeInTheDocument();

    // Compact row rendered
    expect(screen.getAllByText(/Townsville City Council/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/QLD\/NT/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Next: Issue preliminary design verification/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThanOrEqual(1);
  });

  it("Test 3 — Compact account header prioritises identity, health, and primary actions", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    // Primary action buttons
    expect(screen.getByRole("button", { name: /Log activity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New quote/i })).toBeInTheDocument();

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

    // Click New quote button
    const newQuoteBtn = screen.getAllByRole("button", { name: /New quote/i })[0];
    fireEvent.click(newQuoteBtn);

    expect(screen.getByRole("dialog", { name: /Create New Quote/i })).toBeInTheDocument();
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

  it("Test 12 — Verifies filter dependency: initial load, conditional reveal, option isolation, switching reset, and returning to All Types", () => {
    const multiAccounts = [
      {
        id: "acc-customer-active",
        name: "Brisbane City Council",
        accountType: "Customer",
        status: "Customer",
        industry: "Government",
        customerSegment: "Local Government / Council",
        territory: "QLD/NT",
        accountOwner: "Travis Maher",
        customerRelationshipStatus: "Active",
        tags: []
      },
      {
        id: "acc-customer-developing",
        name: "Sydney Metro Water",
        accountType: "Customer",
        status: "Customer",
        industry: "Utilities",
        customerSegment: "Water Authority",
        territory: "NSW/ACT",
        accountOwner: "Travis Maher",
        customerRelationshipStatus: "Developing",
        tags: []
      },
      {
        id: "acc-prospect-engaged",
        name: "Apex Civil Contracting",
        accountType: "Prospect",
        status: "Prospect",
        industry: "Civil Infrastructure",
        customerSegment: "Civil Contractor",
        territory: "NSW/ACT",
        accountOwner: "Travis Maher",
        prospectStage: "Engaged",
        tags: []
      },
      {
        id: "acc-prospect-nurture",
        name: "Pioneer Roadworks",
        accountType: "Prospect",
        status: "Prospect",
        industry: "Civil Infrastructure",
        customerSegment: "Civil Contractor",
        territory: "VIC/TAS",
        accountOwner: "Travis Maher",
        prospectStage: "Nurture",
        tags: []
      }
    ];

    render(
      <AppProvider>
        <AccountsTestWrapper initialAccounts={multiAccounts} />
      </AppProvider>
    );

    // 1. Initial page load: only All Types filter is present
    const typeFilter = screen.getByLabelText(/Filter by account type/i);
    expect(typeFilter).toBeInTheDocument();
    expect(typeFilter).toHaveValue("all");
    expect(screen.queryByLabelText(/Filter by relationship status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Filter by prospect stage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/All Statuses & Stages/i)).not.toBeInTheDocument();

    // All accounts visible initially
    expect(screen.getAllByText("Brisbane City Council").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sydney Metro Water").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Apex Civil Contracting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pioneer Roadworks").length).toBeGreaterThanOrEqual(1);

    // 2. Select Customer -> reveals "All Relationship Statuses"
    fireEvent.change(typeFilter, { target: { value: "Customer" } });
    const relStatusFilter = screen.getByLabelText(/Filter by relationship status/i);
    expect(relStatusFilter).toBeInTheDocument();
    expect(screen.queryByLabelText(/Filter by prospect stage/i)).not.toBeInTheDocument();

    // Verify Customer filter contains ONLY Customer Relationship Status options
    const relOptions = Array.from(relStatusFilter.querySelectorAll("option")).map((o) => o.textContent);
    expect(relOptions).toEqual([
      "All Relationship Statuses",
      "Active",
      "Developing",
      "Occasional",
      "At Risk",
      "Dormant"
    ]);
    expect(relOptions).not.toContain("Identified");
    expect(relOptions).not.toContain("Engaged");

    // Filter Customer + Developing
    fireEvent.change(relStatusFilter, { target: { value: "Developing" } });
    expect(screen.queryByText("Brisbane City Council")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sydney Metro Water").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Apex Civil Contracting")).not.toBeInTheDocument();

    // 3. Switch Customer -> Prospect
    fireEvent.change(typeFilter, { target: { value: "Prospect" } });
    expect(screen.queryByLabelText(/Filter by relationship status/i)).not.toBeInTheDocument();
    const prospectStageFilter = screen.getByLabelText(/Filter by prospect stage/i);
    expect(prospectStageFilter).toBeInTheDocument();

    // Previous "Developing" filter was reset to "all"
    expect(prospectStageFilter).toHaveValue("all");
    expect(screen.getAllByText("Apex Civil Contracting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pioneer Roadworks").length).toBeGreaterThanOrEqual(1);

    // Verify Prospect filter contains ONLY Prospect Stage options
    const stageOptions = Array.from(prospectStageFilter.querySelectorAll("option")).map((o) => o.textContent);
    expect(stageOptions).toEqual([
      "All Prospect Stages",
      "Identified",
      "Researching",
      "Contacting",
      "Engaged",
      "Opportunity Identified",
      "Nurture",
      "Not Pursuing"
    ]);
    expect(stageOptions).not.toContain("Active");
    expect(stageOptions).not.toContain("Developing");

    // Filter Prospect + Engaged
    fireEvent.change(prospectStageFilter, { target: { value: "Engaged" } });
    expect(screen.getAllByText("Apex Civil Contracting").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Pioneer Roadworks")).not.toBeInTheDocument();

    // 4. Return to All Types
    fireEvent.change(typeFilter, { target: { value: "all" } });
    expect(screen.queryByLabelText(/Filter by prospect stage/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Filter by relationship status/i)).not.toBeInTheDocument();

    // All accounts visible again
    expect(screen.getAllByText("Brisbane City Council").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sydney Metro Water").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Apex Civil Contracting").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pioneer Roadworks").length).toBeGreaterThanOrEqual(1);
  });

  it("Test 13 — Creating a new account conditionally requires Prospect Stage or Customer Relationship Status", () => {
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

    // Initially Prospect -> shows Prospect Stage
    expect(within(dialog).getByLabelText(/Prospect Stage/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Customer Relationship Status/i)).not.toBeInTheDocument();

    // Switch Account Type to Customer -> shows Customer Relationship Status
    fireEvent.change(typeSelect, { target: { value: "Customer" } });
    expect(within(dialog).queryByLabelText(/Prospect Stage/i)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Customer Relationship Status/i)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByPlaceholderText(/e\.g\. City of Melton Council/i), {
      target: { value: "Geelong City Council" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /Create Account/i }));

    expect(screen.getAllByText("Geelong City Council").length).toBeGreaterThanOrEqual(1);
  });

  it("Test 14 — Editing an account dynamically switches between Prospect Stage and Customer Relationship Status", () => {
    render(
      <AppProvider>
        <AccountsTestWrapper />
      </AppProvider>
    );

    const editBtn = screen.getAllByRole("button", { name: /^Edit$/i })[0];
    fireEvent.click(editBtn);

    expect(screen.getByRole("dialog", { name: /Edit Account/i })).toBeInTheDocument();
    const editTypeSelect = screen.getByLabelText(/Edit Account Type/i);

    // Switch to Prospect
    fireEvent.change(editTypeSelect, { target: { value: "Prospect" } });
    expect(screen.getByLabelText(/Edit Prospect Stage/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Edit Customer Relationship Status/i)).not.toBeInTheDocument();

    // Switch back to Customer
    fireEvent.change(editTypeSelect, { target: { value: "Customer" } });
    expect(screen.queryByLabelText(/Edit Prospect Stage/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Edit Customer Relationship Status/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(screen.getByText(/Account Type:/i)).toBeInTheDocument();
  });
});
