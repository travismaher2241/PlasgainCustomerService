import {
  Account,
  CRMContact,
  CRMOpportunity,
  CRMActivity,
  CRMKnowledgeItem,
  CRMTask,
  ContactNotableEvent
} from "../types/crm";

export interface CallTalkingPoint {
  category: "Follow-up" | "Question" | "Commitment" | "Commercial" | "Technical" | "Context";
  text: string;
  sourceRef?: string;
}

export interface CallPreparationBriefing {
  contactName: string;
  contactRole?: string;
  accountName: string;
  executiveBriefing: string;
  talkingPoints: CallTalkingPoint[];
  relevantKnowledge: CRMKnowledgeItem[];
  notableEvents: ContactNotableEvent[];
  openQuotes: Array<{
    quoteNumber: string;
    dealName: string;
    dealValue: number;
    quoteStatus?: string;
    sentDate?: string;
    hasRecordedResponse: boolean;
    responseDetail: string;
  }>;
  overdueItems: string[];
}

export function generateCallPreparationBriefing(params: {
  account: Account | null;
  contact: CRMContact | null;
  otherContacts?: CRMContact[];
  opportunity: CRMOpportunity | null;
  activities: CRMActivity[];
  knowledge: CRMKnowledgeItem[];
  tasks: CRMTask[];
}): CallPreparationBriefing {
  const { account, contact, opportunity, activities, knowledge, tasks } = params;

  const contactName = contact
    ? `${contact.firstName} ${contact.lastName}`.trim()
    : "Key Stakeholder";
  const contactRole = contact?.jobTitle || contact?.role;
  const accountName = account?.name || opportunity?.accountName || "Account";

  // 1. Gather recent activities relevant to this contact and account
  const relevantActivities = activities.filter((a) => {
    if (contact && (a.contactId === contact.id || a.contactIds?.includes(contact.id))) return true;
    if (account && a.accountId === account.id) return true;
    if (opportunity && a.opportunityId === opportunity.id) return true;
    return false;
  }).slice(0, 5);

  const lastActivity = relevantActivities[0];
  let daysSinceLastContact: number | null = null;
  if (lastActivity?.timestamp) {
    const diffMs = Math.abs(Date.now() - new Date(lastActivity.timestamp).getTime());
    daysSinceLastContact = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // 2. Gather relevant knowledge
  const relevantKnowledge = knowledge.filter((k) => {
    if (k.status !== "active") return false;
    if (contact && k.contactIds?.includes(contact.id)) return true;
    if (account && k.accountId === account.id) return true;
    if (opportunity && k.opportunityId === opportunity.id) return true;
    return false;
  });

  // 3. Gather notable events
  const notableEvents: ContactNotableEvent[] = contact?.notableEvents || [];

  // 4. Gather open quotes and deals
  const openQuotes: CallPreparationBriefing["openQuotes"] = [];
  if (opportunity && opportunity.quoteNumber) {
    // Check if there is an activity recording a customer response to this quote
    const hasResponseActivity = relevantActivities.some(
      (a) =>
        a.outcome?.toLowerCase().includes("accepted") ||
        a.outcome?.toLowerCase().includes("revision") ||
        a.outcome?.toLowerCase().includes("lost") ||
        a.title.toLowerCase().includes(opportunity.quoteNumber!.toLowerCase())
    );

    const hasResponse = Boolean(
      hasResponseActivity ||
      opportunity.quoteStatus === "Accepted" ||
      opportunity.quoteStatus === "Declined" ||
      opportunity.quoteStatus === "PO Received"
    );

    let responseDetail = "The CRM does not currently show whether the customer has responded to this quote.";
    if (opportunity.quoteStatus === "Accepted" || opportunity.quoteStatus === "PO Received") {
      responseDetail = "Quote has been accepted (awaiting PO or final delivery schedule).";
    } else if (opportunity.quoteStatus === "Declined") {
      responseDetail = `Quote declined: ${opportunity.lostReason || "No details provided"}.`;
    }

    openQuotes.push({
      quoteNumber: opportunity.quoteNumber,
      dealName: opportunity.name,
      dealValue: opportunity.dealValue || 0,
      quoteStatus: opportunity.quoteStatus || "Sent",
      sentDate: opportunity.quoteSentDate || opportunity.quoteIssuedDate,
      hasRecordedResponse: hasResponse,
      responseDetail
    });
  }

  // 5. Gather overdue tasks / follow-ups
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = tasks.filter((t) => {
    const matchesEntity = (account && t.accountId === account.id) || (opportunity && t.opportunityId === opportunity.id);
    return matchesEntity && t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr;
  });
  const overdueItems = overdueTasks.map((t) => `${t.title} (due ${t.dueDate})`);

  // 6. Build Actionable Talking Points
  const talkingPoints: CallTalkingPoint[] = [];

  // Previous company context if contact moved
  if (contact?.accountHistory && contact.accountHistory.length > 0) {
    const prev = contact.accountHistory[contact.accountHistory.length - 1];
    talkingPoints.push({
      category: "Context",
      text: `${contactName} previously worked at ${prev.accountName} (${prev.role || "Contact"}) until ${prev.endDate || "recently"}. Acknowledge their role at ${accountName}.`
    });
  }

  // Quotes requiring follow-up
  for (const q of openQuotes) {
    if (!q.hasRecordedResponse) {
      talkingPoints.push({
        category: "Commercial",
        text: `Check status of quote ${q.quoteNumber} ($${q.dealValue.toLocaleString()}) for "${q.dealName}". ${q.sentDate ? `Sent ${q.sentDate}.` : ""} Ask if technical package was satisfactory or if revisions are needed.`
      });
    }
  }

  // Commitments made by customer or Plasgain
  const commitments = relevantKnowledge.filter((k) => k.category === "Commitment");
  for (const c of commitments) {
    talkingPoints.push({
      category: "Commitment",
      text: `Follow up on commitment: "${c.statement}".`,
      sourceRef: c.sourceActivityDate
    });
  }

  // Technical & Pole preferences
  const techKnowledge = relevantKnowledge.filter(
    (k) => k.category === "Product & Pole Preference" || k.category === "Technical & Specification"
  );
  for (const t of techKnowledge.slice(0, 2)) {
    talkingPoints.push({
      category: "Technical",
      text: `Keep specification in mind: "${t.statement}".`,
      sourceRef: t.sourceActivityDate
    });
  }

  // Unresolved questions
  const questions = relevantKnowledge.filter((k) => k.category === "Unresolved Question");
  for (const q of questions) {
    talkingPoints.push({
      category: "Question",
      text: `Address unresolved question: "${q.statement}".`,
      sourceRef: q.sourceActivityDate
    });
  }

  // Overdue actions
  for (const od of overdueTasks) {
    talkingPoints.push({
      category: "Follow-up",
      text: `Resolve overdue action: ${od.title}.`
    });
  }

  // 7. Compose Natural Language Narrative Briefing
  const narrativeParagraphs: string[] = [];

  // Opening sentence: relationship recency & contact background
  if (daysSinceLastContact !== null) {
    const timePhrase = daysSinceLastContact === 0
      ? "earlier today"
      : daysSinceLastContact === 1
      ? "yesterday"
      : daysSinceLastContact < 7
      ? `${daysSinceLastContact} days ago`
      : `${Math.round(daysSinceLastContact / 7)} weeks ago`;

    narrativeParagraphs.push(
      `Your last recorded interaction with ${contactName} was ${timePhrase} (${lastActivity.type}: "${lastActivity.title}").`
    );
  } else {
    narrativeParagraphs.push(
      `There is no recent direct interaction recorded with ${contactName} for ${accountName}. This is an opportunity to re-engage.`
    );
  }

  // Active deals & quotes
  if (openQuotes.length > 0) {
    const q = openQuotes[0];
    if (!q.hasRecordedResponse) {
      narrativeParagraphs.push(
        `Plasgain submitted quote ${q.quoteNumber} for $${q.dealValue.toLocaleString()} (${q.dealName})${q.sentDate ? ` on ${q.sentDate}` : ""}. The CRM does not currently show whether ${contactName} has confirmed or responded to this quote.`
      );
    } else {
      narrativeParagraphs.push(
        `Quote ${q.quoteNumber} ($${q.dealValue.toLocaleString()}) is marked as ${q.quoteStatus}. Verify next operational milestones or delivery timing.`
      );
    }
  } else if (opportunity) {
    narrativeParagraphs.push(
      `Active deal "${opportunity.name}" is currently in ${opportunity.stageName} ($${(opportunity.dealValue || 0).toLocaleString()}).`
    );
  }

  // Key known preferences or milestones
  const topPrefs = relevantKnowledge.filter(
    (k) => k.category === "Product & Pole Preference" || k.category === "Decision & Criteria"
  );
  if (topPrefs.length > 0) {
    const prefSummary = topPrefs.map((k) => k.statement).join("; ");
    narrativeParagraphs.push(
      `Key preferences and criteria previously noted: ${prefSummary}.`
    );
  }

  // Closing suggestion
  if (overdueTasks.length > 0) {
    narrativeParagraphs.push(
      `Prioritise closing out overdue action: "${overdueTasks[0].title}".`
    );
  } else if (openQuotes.length > 0 && !openQuotes[0].hasRecordedResponse) {
    narrativeParagraphs.push(
      `It would be worth confirming whether quote ${openQuotes[0].quoteNumber} has been reviewed and whether tender or installation timelines have changed.`
    );
  } else {
    narrativeParagraphs.push(
      `Confirm current project programme, any upcoming tender releases, and whether additional technical submittals are required.`
    );
  }

  const executiveBriefing = narrativeParagraphs.join("\n\n");

  return {
    contactName,
    contactRole,
    accountName,
    executiveBriefing,
    talkingPoints,
    relevantKnowledge,
    notableEvents,
    openQuotes,
    overdueItems
  };
}
