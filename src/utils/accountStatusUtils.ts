import {
  Account,
  CRMOpportunity,
  CRMActivity,
  CRMTask,
  ContactFrequency,
  AccountCommercialStatus
} from "../types/crm";

/**
 * Resolves the contact frequency for an account, with fallback mapping from legacy relationship status.
 */
export function getAccountContactFrequency(account?: Account): ContactFrequency {
  if (!account) {
    return "Opportunity";
  }

  if (account.contactFrequency) {
    return account.contactFrequency;
  }

  // Fallback migration for legacy customerRelationshipStatus
  switch (account.customerRelationshipStatus) {
    case "Developing":
      return "Opportunity";
    case "Occasional":
      return "Occasional";
    case "At Risk":
    case "Dormant":
      return "As needed";
    case "Active":
      return "Occasional";
    default:
      return "Opportunity";
  }
}

/**
 * Returns required update interval in days for a contact frequency.
 * - Opportunity: fortnightly (14 days)
 * - Occasional: monthly (30 days)
 * - As needed: quarterly (90 days)
 */
export function getContactFrequencyDays(freq: ContactFrequency): number {
  switch (freq) {
    case "Opportunity":
      return 14;
    case "Occasional":
      return 30;
    case "As needed":
      return 90;
    default:
      return 14;
  }
}

export interface AccountContactCadence {
  frequency: ContactFrequency;
  thresholdDays: number;
  daysSinceLastContact: number;
  isOverdue: boolean;
  daysOverdue: number;
  nextDueInDays: number;
  lastContactDate?: string;
  nextDueDateStr: string;
}

/**
 * Calculates contact cadence metrics and overdue status for an account based on logged activities.
 */
export function computeAccountContactCadence(
  account?: Account,
  activities: CRMActivity[] = [],
  referenceDate?: Date
): AccountContactCadence {
  const refTime = (referenceDate || new Date()).getTime();
  if (!account) {
    return {
      frequency: "Opportunity",
      thresholdDays: 14,
      daysSinceLastContact: 0,
      isOverdue: false,
      daysOverdue: 0,
      nextDueInDays: 14,
      nextDueDateStr: new Date(refTime + 14 * 86400000).toISOString().split("T")[0]
    };
  }
  const frequency = getAccountContactFrequency(account);
  const thresholdDays = getContactFrequencyDays(frequency);

  // Find latest activity for this account
  const accountActs = activities.filter((a) => a.accountId === account.id && a.timestamp);
  let latestContactTime = 0;
  let lastContactDate: string | undefined = undefined;

  for (const act of accountActs) {
    const actTime = new Date(act.timestamp).getTime();
    if (!isNaN(actTime) && actTime > latestContactTime) {
      latestContactTime = actTime;
      lastContactDate = act.timestamp;
    }
  }

  // If no logged activity objects, fall back to account's explicit recorded lastContactDate (if set),
  // but never treat account creation dates (createdAt / createdDate) as a logged contact.
  if (latestContactTime === 0 && account.lastContactDate) {
    const fbTime = new Date(account.lastContactDate).getTime();
    if (!isNaN(fbTime)) {
      latestContactTime = fbTime;
      lastContactDate = account.lastContactDate;
    }
  }

  // If no contact activity has been logged for this account, it is not "routine contact overdue"
  if (latestContactTime === 0) {
    return {
      frequency,
      thresholdDays,
      daysSinceLastContact: 0,
      isOverdue: false,
      daysOverdue: 0,
      nextDueInDays: thresholdDays,
      lastContactDate: undefined,
      nextDueDateStr: new Date(refTime + thresholdDays * 86400000).toISOString().split("T")[0]
    };
  }

  const diffMs = Math.max(0, refTime - latestContactTime);
  const daysSinceLastContact = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = daysSinceLastContact > thresholdDays;
  const daysOverdue = isOverdue ? daysSinceLastContact - thresholdDays : 0;
  const nextDueInDays = isOverdue ? 0 : thresholdDays - daysSinceLastContact;

  const nextDueDate = new Date(latestContactTime + thresholdDays * 24 * 60 * 60 * 1000);
  const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

  return {
    frequency,
    thresholdDays,
    daysSinceLastContact,
    isOverdue,
    daysOverdue,
    nextDueInDays,
    lastContactDate,
    nextDueDateStr
  };
}

/**
 * 100% automatically computes the account commercial status based on sales recency and account age:
 * - Active: Sale in last 3 months (or new account created within last 3 months)
 * - Declining: Sale in last 6 months, but none in last 3 months
 * - Dormant: No sales in last 6+ months (up to 24 months)
 * - Inactive: No contact and no sale in the last 24 months
 */
export function computeAccountCommercialStatus(
  account?: Account,
  deals: CRMOpportunity[] = [],
  activities: CRMActivity[] = [],
  referenceDate?: Date
): AccountCommercialStatus {
  if (!account) {
    return "Active";
  }
  const refTime = (referenceDate || new Date()).getTime();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const oneEightyDaysMs = 180 * 24 * 60 * 60 * 1000;
  const sevenThirtyDaysMs = 730 * 24 * 60 * 60 * 1000; // ~24 months

  // Find all won deals or sales for this account
  const accountDeals = deals.filter((d) => d.accountId === account.id);
  const wonDeals = accountDeals.filter(
    (d) =>
      d.stageId === "stage-won" ||
      d.isWon ||
      d.quoteStatus === "Accepted" ||
      (typeof d.stageName === "string" && d.stageName.toLowerCase().includes("won"))
  );

  let latestSaleTime = 0;

  for (const d of wonDeals) {
    const dateStr = d.actualCloseDate || d.wonAt || d.expectedCloseDate || d.createdAt;
    if (dateStr) {
      const t = new Date(dateStr).getTime();
      if (!isNaN(t) && t > latestSaleTime) {
        latestSaleTime = t;
      }
    }
  }

  // Check account.lastSaleDate if available
  if (account.lastSaleDate) {
    const t = new Date(account.lastSaleDate).getTime();
    if (!isNaN(t) && t > latestSaleTime) {
      latestSaleTime = t;
    }
  }

  // Check latest activity time
  let latestActivityTime = 0;
  const accountActs = activities.filter((a) => a.accountId === account.id && a.timestamp);
  for (const a of accountActs) {
    const t = new Date(a.timestamp).getTime();
    if (!isNaN(t) && t > latestActivityTime) {
      latestActivityTime = t;
    }
  }
  if (account.lastInteractionDate) {
    const t = new Date(account.lastInteractionDate).getTime();
    if (!isNaN(t) && t > latestActivityTime) latestActivityTime = t;
  }

  // 1. Account has a recorded sale
  if (latestSaleTime > 0) {
    const timeSinceSale = Math.max(0, refTime - latestSaleTime);

    if (timeSinceSale <= ninetyDaysMs) {
      return "Active";
    }

    if (timeSinceSale <= oneEightyDaysMs) {
      return "Declining";
    }

    if (timeSinceSale <= sevenThirtyDaysMs) {
      return "Dormant";
    }

    // Sale is older than 24 months: check if there was any contact in last 24 months
    const timeSinceActivity = latestActivityTime > 0 ? refTime - latestActivityTime : Infinity;
    if (timeSinceActivity > sevenThirtyDaysMs) {
      return "Inactive";
    }
    return "Dormant";
  }

  // 2. Account has never had a sale
  const createdDateStr = account.createdAt || account.createdDate;
  const createdTime = createdDateStr ? new Date(createdDateStr).getTime() : refTime;
  const accountAgeMs = !isNaN(createdTime) ? Math.max(0, refTime - createdTime) : 0;

  // New account under 3 months old defaults to "Active" (per user confirmation)
  if (accountAgeMs <= ninetyDaysMs) {
    return "Active";
  }

  // Over 24 months without sale or activity: Inactive
  const timeSinceActivity = latestActivityTime > 0 ? refTime - latestActivityTime : accountAgeMs;
  if (accountAgeMs > sevenThirtyDaysMs && timeSinceActivity > sevenThirtyDaysMs) {
    return "Inactive";
  }

  // Accounts older than 3 months with no sales
  return "Dormant";
}

/**
 * Builds a collaborative routine check-in task for an overdue account.
 */
export function buildAccountCheckInTask(
  account: Account,
  cadence: AccountContactCadence
): CRMTask {
  const isUrgent = cadence.daysOverdue > 14;
  const todayStr = new Date().toISOString().split("T")[0];

  return {
    id: `checkin-${account.id}`,
    title: `Routine Check-in: ${account.name}`,
    type: "Call",
    priority: isUrgent ? "Urgent" : "High",
    status: "To Do",
    dueDate: todayStr,
    dueTime: "09:30 AM",
    accountId: account.id,
    accountName: account.name,
    assignedTo: account.accountOwner || "Travis Maher",
    createdBy: "System (Contact Frequency)",
    isOverdue: true,
    isCheckInTask: true,
    notes: `Routine contact overdue by ${cadence.daysOverdue} day${cadence.daysOverdue === 1 ? "" : "s"}. Account Contact Frequency is set to "${cadence.frequency}" (every ${cadence.thresholdDays} days). Last contact was ${cadence.daysSinceLastContact} days ago.`
  };
}
