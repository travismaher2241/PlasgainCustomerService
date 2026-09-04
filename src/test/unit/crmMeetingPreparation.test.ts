import { describe, it, expect } from "vitest";
import {
  getNextDayMeetings,
  getUpcomingMeetings,
  generateMeetingPreparationPlan,
  getTomorrowDateString
} from "../../utils/crmMeetingPreparation";
import { CRMTask, Account, CRMContact, CRMActivity, CRMKnowledgeItem, CRMOpportunity } from "../../types/crm";

describe("CRM Meeting Preparation & Scheduling Engine", () => {
  const dummyAccount: Account = {
    id: "acc-atec",
    name: "ATEC Group",
    accountType: "Customer",
    status: "Customer",
    customerRelationshipStatus: "Active",
    territory: "SA",
    accountOwner: "Travis Maher",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-04T00:00:00Z"
  };

  const gordonContact: CRMContact = {
    id: "con-gordon",
    accountId: "acc-atec",
    accountName: "ATEC Group",
    firstName: "Gordon",
    lastName: "Tian",
    jobTitle: "Operations Manager",
    email: "gtian@atecgroup.com.au",
    preferredContactMethod: "Mobile",
    contactOwner: "Travis Maher"
  };

  const ziaContact: CRMContact = {
    id: "con-zia",
    accountId: "acc-atec",
    accountName: "ATEC Group",
    firstName: "Zia",
    lastName: "Hakim",
    jobTitle: "Managing Director",
    email: "zhakim@atecgroup.com.au",
    preferredContactMethod: "Phone",
    contactOwner: "Travis Maher"
  };

  const atecActivity: CRMActivity = {
    id: "act-1",
    accountId: "acc-atec",
    accountName: "ATEC Group",
    contactId: "con-gordon",
    contactName: "Gordon Tian",
    type: "meeting",
    title: "Meeting with Gordon Tian",
    timestamp: "2026-09-04T10:00:00Z",
    description: "Met Gordon for the first time. They had ordered 600 of the PLASSLAB, which he mentioned would last them around 3 months. These are mostly sent to SA. Zia was over in Perth at his property as he had a water leak and had to rush over to get it fixed.",
    performedBy: "Travis Maher"
  };

  const openOpportunity: CRMOpportunity = {
    id: "opp-atec-1",
    accountId: "acc-atec",
    accountName: "ATEC Group",
    name: "SA Rail Corridors PLASSLAB Batch",
    stage: "Quote Submitted",
    stageId: "stage-quote",
    stageName: "Quote / Proposal Submitted",
    quoteNumber: "Q-2026-9041",
    dealValue: 88500,
    quoteStatus: "Sent",
    quoteSentDate: "2026-09-01",
    probability: 70,
    expectedCloseDate: "2026-10-15",
    assignedTo: "Travis Maher"
  };

  const tomorrowStr = getTomorrowDateString("2026-09-04"); // 2026-09-05

  const tomorrowMeeting: CRMTask = {
    id: "task-meet-1",
    title: "PLASSLAB Deployment & SA Rollout Review",
    type: "Meeting",
    status: "To Do",
    priority: "High",
    dueDate: tomorrowStr,
    dueTime: "10:00 AM",
    accountId: "acc-atec",
    accountName: "ATEC Group",
    contactId: "con-gordon",
    contactName: "Gordon Tian",
    contactIds: ["con-gordon", "con-zia"],
    opportunityId: "opp-atec-1",
    opportunityName: "SA Rail Corridors PLASSLAB Batch",
    meetingFormat: "In Person",
    durationMinutes: 45,
    location: "ATEC Adelaide Depot",
    agenda: "Review first batch delivery in SA and plan next supply order",
    assignedTo: "Travis Maher",
    createdBy: "Travis Maher"
  };

  const nextWeekTask: CRMTask = {
    id: "task-followup-1",
    title: "Check council tender specs",
    type: "Follow-up",
    status: "To Do",
    priority: "Medium",
    dueDate: "2026-09-12",
    assignedTo: "Travis Maher",
    createdBy: "Travis Maher"
  };

  it("filters next-day meetings accurately", () => {
    const nextDay = getNextDayMeetings([tomorrowMeeting, nextWeekTask], "2026-09-04");
    expect(nextDay.length).toBe(1);
    expect(nextDay[0].id).toBe("task-meet-1");
    expect(nextDay[0].title).toBe("PLASSLAB Deployment & SA Rollout Review");
  });

  it("sorts upcoming meetings chronologically", () => {
    const futureMeeting: CRMTask = {
      id: "task-meet-2",
      title: "Quarterly Executive Check-in",
      type: "Meeting",
      status: "To Do",
      priority: "High",
      dueDate: "2026-11-04",
      dueTime: "02:00 PM",
      assignedTo: "Travis Maher",
      createdBy: "Travis Maher"
    };

    const sorted = getUpcomingMeetings([futureMeeting, tomorrowMeeting], "2026-09-04");
    expect(sorted.length).toBe(2);
    expect(sorted[0].id).toBe("task-meet-1");
    expect(sorted[1].id).toBe("task-meet-2");
  });

  it("generates comprehensive Next-Day Meeting Preparation Plan with multi-participant rapport and quotes", () => {
    const plan = generateMeetingPreparationPlan(tomorrowMeeting, {
      accounts: [dummyAccount],
      contacts: [gordonContact, ziaContact],
      opportunities: [openOpportunity],
      activities: [atecActivity],
      knowledge: [],
      tasks: [tomorrowMeeting]
    });

    expect(plan.meetingTitle).toBe("PLASSLAB Deployment & SA Rollout Review");
    expect(plan.account?.name).toBe("ATEC Group");
    expect(plan.participants.length).toBe(2);

    // Multi-participant personal context: Zia's Perth water leak check-in
    const ziaContext = plan.participantContexts.find((pc) => pc.contact.id === "con-zia");
    expect(ziaContext).toBeDefined();
    expect(ziaContext?.rapportPoints.some((r) => r.toLowerCase().includes("water leak") && r.toLowerCase().includes("perth"))).toBe(true);

    // Talking points must include personal check-in for Zia
    const rapportPoint = plan.talkingPoints.find((tp) => tp.category === "Context");
    expect(rapportPoint).toBeDefined();
    expect(rapportPoint?.text).toContain("water leak repairs went at his property in Perth");

    // Commercial quote tracking
    expect(plan.openQuotes.length).toBe(1);
    expect(plan.openQuotes[0].quoteNumber).toBe("Q-2026-9041");
    expect(plan.openQuotes[0].dealValue).toBe(88500);

    // Executive briefing contains meeting metadata & objectives
    expect(plan.executiveBriefing).toContain("ATEC Group");
    expect(plan.executiveBriefing).toContain("Gordon Tian");
    expect(plan.executiveBriefing).toContain("Zia Hakim");

    // Agenda and suggested questions
    expect(plan.agendaItems.length).toBeGreaterThan(0);
    expect(plan.suggestedQuestions.length).toBeGreaterThan(0);
  });

  it("calculates replenishment status relative to meeting date (1 month out if meeting is in 2 months)", () => {
    const twoMonthsOutMeeting: CRMTask = {
      ...tomorrowMeeting,
      id: "task-meet-2m",
      dueDate: "2026-11-04"
    };

    const plan = generateMeetingPreparationPlan(twoMonthsOutMeeting, {
      accounts: [dummyAccount],
      contacts: [gordonContact, ziaContact],
      opportunities: [openOpportunity],
      activities: [atecActivity],
      knowledge: [],
      tasks: [twoMonthsOutMeeting]
    });

    expect(plan.supplyCycles.length).toBe(1);
    const sc = plan.supplyCycles[0];
    expect(sc.product).toBe("PLASSLAB");
    expect(sc.monthsRemaining).toBeLessThanOrEqual(1);
    expect(sc.statusText.toLowerCase()).toContain("1 month out from requiring more plasslab");

    // Executive briefing and commercial talking point must flag the 1-month-out replenishment window
    expect(plan.executiveBriefing.toLowerCase()).toContain("1 month out from requiring more plasslab");
    const commercialTp = plan.talkingPoints.find((tp) => tp.category === "Commercial" && tp.text.toLowerCase().includes("1 month out"));
    expect(commercialTp).toBeDefined();
  });
});
