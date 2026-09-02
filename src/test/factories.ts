/**
 * Typed fixture builders for CRM records.
 *
 * Tests previously hand-rolled partial object literals. With no `@types/react`
 * installed those literals were never checked, so several drifted away from the
 * real interfaces and would have masked the very field-name bugs the type
 * install surfaced. These fill every required field and take overrides, so a
 * test states only what it cares about and still gets a valid record.
 */

import { Account, CRMContact, CRMOpportunity, CRMTask, CRMActivity } from "../types/crm";

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-test",
    name: "Test Council",
    accountType: "Council",
    status: "Customer",
    industry: "Government & Public Infrastructure",
    customerSegment: "Local Government / Council",
    territory: "VIC/TAS",
    accountOwner: "Sarah Reed",
    relationshipHealth: "Healthy",
    tags: [],
    leadSource: "Referral",
    createdDate: "2026-08-28",
    lastInteractionDate: "2026-08-28",
    ...overrides
  };
}

export function makeOpportunity(overrides: Partial<CRMOpportunity> = {}): CRMOpportunity {
  return {
    id: "opp-test",
    name: "Test Lighting Upgrade",
    accountId: "acc-test",
    accountName: "Test Council",
    primaryContactId: "con-test",
    primaryContactName: "Dana Walker",
    opportunityOwner: "Sarah Reed",
    pipelineId: "pipe-major-projects",
    stageId: "stage-new",
    stageName: "New Opportunity",
    dealValue: 0,
    weightedValue: 0,
    probability: 10,
    forecastCategory: "Pipeline",
    expectedCloseDate: "2026-09-28",
    products: [],
    projectApplication: "",
    location: "Australia",
    customerNeed: "",
    keyRequirements: [],
    source: "Manual Ingestion",
    latestActivity: "",
    latestActivityDate: "2026-08-28",
    nextAction: "",
    nextActionDate: "2026-08-30",
    daysInCurrentStage: 0,
    totalDealAgeDays: 0,
    dealHealth: "Healthy",
    dealHealthReasons: [],
    notes: "",
    ...overrides
  };
}

export function makeContact(overrides: Partial<CRMContact> = {}): CRMContact {
  return {
    id: "con-test",
    accountId: "acc-test",
    accountName: "Test Council",
    firstName: "Dana",
    lastName: "Walker",
    jobTitle: "Infrastructure Manager",
    email: "dana.walker@testcouncil.vic.gov.au",
    preferredContactMethod: "Email",
    roleInBuyingProcess: "Decision Maker",
    isDecisionMaker: true,
    influenceLevel: "High",
    relationshipStatus: "Warm",
    contactOwner: "Sarah Reed",
    tags: [],
    ...overrides
  };
}

export function makeTask(overrides: Partial<CRMTask> = {}): CRMTask {
  return {
    id: "task-test",
    title: "Follow up with the customer",
    type: "Follow-up",
    status: "To Do",
    priority: "Medium",
    dueDate: "2026-08-30",
    assignedTo: "Sarah Reed",
    createdBy: "Sarah Reed",
    ...overrides
  };
}

export function makeActivity(overrides: Partial<CRMActivity> = {}): CRMActivity {
  return {
    id: "act-test",
    type: "call",
    title: "Call logged",
    description: "",
    performedBy: "Sarah Reed",
    timestamp: "2026-08-28T00:00:00.000Z",
    ...overrides
  };
}
