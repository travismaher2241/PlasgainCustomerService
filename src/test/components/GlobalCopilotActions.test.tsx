import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlobalCopilot, deriveActionsFromContext } from "../../components/GlobalCopilot";
import { AppProvider, useApp } from "../../context/AppContext";
import { CRMOpportunity, Account, NextBestActionItem } from "../../types/crm";

const mockDeal: CRMOpportunity = {
  id: "deal-copilot-1",
  name: "Wyndham Park Retaining Wall",
  accountId: "acc-copilot-1",
  accountName: "Wyndham City Council",
  primaryContactId: "con-1",
  primaryContactName: "David Miller",
  primaryContactEmail: "david@wyndham.vic.gov.au",
  opportunityOwner: "Travis Maher",
  pipelineId: "pipe-retaining",
  stageId: "stage-quote-sent",
  stageName: "Quote / Proposal Sent",
  dealValue: 92000,
  weightedValue: 55200,
  probability: 60,
  forecastCategory: "Likely",
  expectedCloseDate: "2026-10-30",
  products: [],
  daysInCurrentStage: 4,
  totalDealAgeDays: 12,
  dealHealth: "Healthy",
  dealHealthReasons: []
};

const mockAccount: Account = {
  id: "acc-copilot-1",
  name: "Wyndham City Council",
  status: "Customer",
  industry: "Local Government",
  territory: "VIC/TAS",
  accountOwner: "Travis Maher",
  createdDate: "2026-01-10",
  accountType: "Council",
  customerRelationshipStatus: "Active"
};

const mockNBA: NextBestActionItem = {
  id: "nba-wyndham-1",
  ruleId: "nba-rule-1",
  title: "Follow up on Sent Quote",
  description: "Quote sent 4 days ago without customer response",
  reason: "Quote sent without response",
  actionLabel: "Email David",
  urgency: "Upcoming",
  relatedEntityType: "Opportunity",
  relatedEntityId: "deal-copilot-1",
  relatedEntityName: "Wyndham Park Retaining Wall",
  category: "Quote Follow-up",
  actionPayload: {
    type: "send_email",
    opportunityId: "deal-copilot-1",
    accountId: "acc-copilot-1",
    recipientEmail: "david@wyndham.vic.gov.au",
    defaultTitle: "Quote Follow-up: Wyndham Park",
    defaultNotes: "Hi David, following up on quote for Wyndham Park Retaining Wall."
  }
};

describe("deriveActionsFromContext helper", () => {
  it("prioritizes NBA actions matching current deal", () => {
    const actions = deriveActionsFromContext(
      "Here is the status of Wyndham Park",
      mockDeal,
      mockAccount,
      [mockNBA]
    );

    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe("send_email");
    expect(actions[0].label).toBe("Email David");
    expect(actions[0].payload.opportunityId).toBe("deal-copilot-1");
  });

  it("synthesizes follow-up email and schedule meeting if no NBA matches and text mentions follow up", () => {
    const actions = deriveActionsFromContext(
      "We need to follow up on the quote and schedule a meeting with the client.",
      mockDeal,
      mockAccount,
      []
    );

    expect(actions.length).toBeGreaterThanOrEqual(2);
    const types = actions.map((a) => a.type);
    expect(types).toContain("send_email");
    expect(types).toContain("schedule_meeting");
  });
});

const CopilotTestWrapper: React.FC = () => {
  const {
    setIsCopilotOpen,
    setSelectedCrmOpportunityId,
    setSelectedAccountId,
    addCrmOpportunity,
    addAccount
  } = useApp();

  React.useEffect(() => {
    addAccount(mockAccount);
    addCrmOpportunity(mockDeal);
    setSelectedAccountId("acc-copilot-1");
    setSelectedCrmOpportunityId("deal-copilot-1");
    setIsCopilotOpen(true);
  }, []);

  return <GlobalCopilot />;
};

describe("GlobalCopilot Action Execution Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders recommended actions bar when active deal is selected", async () => {
    render(
      <AppProvider>
        <CopilotTestWrapper />
      </AppProvider>
    );

    // Verify Copilot header and context banner
    expect(screen.getByText("Plasgain Sales Assistant")).toBeInTheDocument();
    expect(screen.getAllByText(/Wyndham Park Retaining Wall/i).length).toBeGreaterThanOrEqual(1);

    // Verify recommended action strip
    expect(screen.getByText(/Recommended Next Actions/i)).toBeInTheDocument();

    // The NBA generated for this deal provides "Set Next Action"
    expect(screen.getByText("Set Next Action")).toBeInTheDocument();
  });

  it("triggers action execution on click and transitions to 'Done'", async () => {
    render(
      <AppProvider>
        <CopilotTestWrapper />
      </AppProvider>
    );

    // Look for the "Set Next Action" button in the recommended actions strip
    const targetButton = screen.getByRole("button", { name: /Set Next Action/i });
    expect(targetButton).toBeInTheDocument();

    fireEvent.click(targetButton);

    // After clicking, button text should change to "Done"
    await waitFor(() => {
      expect(targetButton).toHaveTextContent(/Done/i);
    });
  });
});
