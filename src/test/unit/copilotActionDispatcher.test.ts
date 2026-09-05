import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeCRMAction, ActionDispatchContext } from "../../utils/copilotActionDispatcher";
import { CRMActionPayload, CRMOpportunity, Account, CRMContact } from "../../types/crm";

describe("executeCRMAction dispatcher", () => {
  let mockContext: ActionDispatchContext;

  const mockDeals: CRMOpportunity[] = [
    {
      id: "deal-1",
      name: "Brimbank Boardwalk Substructure",
      accountId: "acc-1",
      accountName: "Brimbank City Council",
      primaryContactId: "con-1",
      primaryContactName: "David Miller",
      primaryContactEmail: "david@brimbank.vic.gov.au",
      opportunityOwner: "Marcus Vance",
      pipelineId: "pipe-1",
      stageId: "stage-quote",
      stageName: "Quote / Proposal Sent",
      dealValue: 75000,
      weightedValue: 45000,
      probability: 60,
      forecastCategory: "Likely",
      expectedCloseDate: "2026-10-15",
      products: [],
      daysInCurrentStage: 5,
      totalDealAgeDays: 14,
      dealHealth: "On Track",
      dealHealthReasons: []
    }
  ];

  const mockAccounts: Account[] = [
    {
      id: "acc-1",
      name: "Brimbank City Council",
      status: "Customer",
      industry: "Local Government",
      territory: "VIC/TAS",
      accountOwner: "Marcus Vance",
      createdDate: "2026-01-10",
      accountType: "Council",
      customerRelationshipStatus: "Active"
    }
  ];

  const mockContacts: CRMContact[] = [
    {
      id: "con-1",
      accountId: "acc-1",
      accountName: "Brimbank City Council",
      firstName: "David",
      lastName: "Miller",
      jobTitle: "Senior Asset Manager",
      email: "david@brimbank.vic.gov.au",
      phone: "03 9249 4000",
      mobile: "0412 345 678",
      contactRole: "Decision Maker",
      isPrimaryContact: true
    },
    {
      id: "con-2",
      accountId: "acc-1",
      accountName: "Brimbank City Council",
      firstName: "Rachel",
      lastName: "Green",
      jobTitle: "Procurement Officer",
      email: "rachel@brimbank.vic.gov.au",
      contactRole: "Procurement Lead",
      isPrimaryContact: false
    }
  ];

  beforeEach(() => {
    mockContext = {
      openEmailComposer: vi.fn(),
      openScheduleMeeting: vi.fn(),
      openQuickLog: vi.fn(),
      addTask: vi.fn(),
      updateOpportunity: vi.fn(),
      navigateToCRM: vi.fn(),
      showToast: vi.fn(),
      currentUser: { name: "Marcus Vance" },
      accounts: mockAccounts,
      crmOpportunities: mockDeals,
      contacts: mockContacts,
      leads: []
    };
  });

  it("returns error if action is undefined or missing type", () => {
    const result = executeCRMAction(null as any, mockContext);
    expect(result.success).toBe(false);
    expect(result.message).toContain("No action payload provided");
  });

  it("dispatches send_email and pre-fills email composer context", () => {
    const action: CRMActionPayload = {
      type: "send_email",
      opportunityId: "deal-1",
      accountId: "acc-1",
      defaultTitle: "Quote Follow-up",
      defaultNotes: "Hi David, following up on our proposal."
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.openEmailComposer).toHaveBeenCalledWith({
      opportunityId: "deal-1",
      accountId: "acc-1",
      contactEmail: "david@brimbank.vic.gov.au",
      contactName: "David Miller",
      projectName: "Brimbank Boardwalk Substructure",
      companyName: "Brimbank City Council",
      projectNotes: "Hi David, following up on our proposal.",
      rawContent: "Hi David, following up on our proposal."
    });
    expect(mockContext.showToast).toHaveBeenCalledWith(
      expect.stringContaining("Opened email composer"),
      "info"
    );
  });

  it("dispatches schedule_meeting with pre-filled context", () => {
    const action: CRMActionPayload = {
      type: "schedule_meeting",
      opportunityId: "deal-1",
      accountId: "acc-1",
      defaultTitle: "Product Specification Review",
      defaultNotes: "Walkthrough of Plaswood and Plasslab structural calculations"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.openScheduleMeeting).toHaveBeenCalledWith({
      accountId: "acc-1",
      opportunityId: "deal-1",
      contactId: "con-1",
      defaultTitle: "Product Specification Review",
      agenda: "Walkthrough of Plaswood and Plasslab structural calculations"
    });
    expect(mockContext.showToast).toHaveBeenCalledWith(
      expect.stringContaining("Opened meeting scheduler"),
      "info"
    );
  });

  it("dispatches log_call to open quick log modal with pre-fills", () => {
    const action: CRMActionPayload = {
      type: "log_call",
      opportunityId: "deal-1",
      accountId: "acc-1",
      defaultNotes: "Call regarding council tender spec timeline"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.openQuickLog).toHaveBeenCalledWith({
      type: "call",
      accountId: "acc-1",
      opportunityId: "deal-1",
      contactId: "con-1",
      prefillNotes: "Call regarding council tender spec timeline"
    });
    expect(mockContext.showToast).toHaveBeenCalledWith(
      expect.stringContaining("Opened quick call log"),
      "info"
    );
  });

  it("dispatches create_task to create a follow-up task with due date and owner", () => {
    const action: CRMActionPayload = {
      type: "create_task",
      opportunityId: "deal-1",
      accountId: "acc-1",
      defaultTitle: "Send recycled plastic technical specs",
      defaultNotes: "Send IK10 and UV stabilization certificates",
      dueDate: "2026-09-15"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.addTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Send recycled plastic technical specs",
        dueDate: "2026-09-15",
        priority: "High",
        status: "To Do",
        assignedTo: "Marcus Vance",
        createdBy: "Marcus Vance",
        opportunityId: "deal-1",
        accountId: "acc-1",
        notes: "Send IK10 and UV stabilization certificates"
      })
    );
    expect(mockContext.showToast).toHaveBeenCalledWith(
      expect.stringContaining("Created task"),
      "success"
    );
  });

  it("dispatches update_stage to advance deal stage", () => {
    const action: CRMActionPayload = {
      type: "update_stage",
      opportunityId: "deal-1",
      targetStageId: "stage-negotiation",
      targetStageName: "Negotiation / Review"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.updateOpportunity).toHaveBeenCalledWith("deal-1", {
      stageId: "stage-negotiation",
      stageName: "Negotiation / Review"
    });
    expect(mockContext.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Advanced "Brimbank Boardwalk Substructure" to Negotiation / Review'),
      "success"
    );
  });

  it("returns error on update_stage if opportunityId is missing", () => {
    const action: CRMActionPayload = {
      type: "update_stage",
      targetStageId: "stage-negotiation"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(false);
    expect(mockContext.showToast).toHaveBeenCalledWith(
      "Cannot update stage: No opportunity linked.",
      "error"
    );
    expect(mockContext.updateOpportunity).not.toHaveBeenCalled();
  });

  it("dispatches assign_contact to set primary contact on a deal", () => {
    const action: CRMActionPayload = {
      type: "assign_contact",
      opportunityId: "deal-1",
      assignedContactId: "con-2"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.updateOpportunity).toHaveBeenCalledWith("deal-1", {
      primaryContactId: "con-2",
      primaryContactName: "Rachel Green",
      primaryContactEmail: "rachel@brimbank.vic.gov.au",
      primaryContactPhone: undefined
    });
    expect(mockContext.showToast).toHaveBeenCalledWith(
      "Assigned Rachel Green as primary contact",
      "success"
    );
  });

  it("returns error on assign_contact if contact or deal ID is missing", () => {
    const action: CRMActionPayload = {
      type: "assign_contact",
      opportunityId: "deal-1"
    };

    const result = executeCRMAction(action, mockContext);

    expect(result.success).toBe(false);
    expect(mockContext.showToast).toHaveBeenCalledWith(
      "Cannot assign contact: Missing opportunity or contact ID.",
      "error"
    );
  });
});
