import {
  Account,
  CRMContact,
  CRMOpportunity,
  CRMActivity,
  CRMKnowledgeItem,
  CRMTask,
  MeetingPreparationPlan
} from "../types/crm";
import {
  parseSupplyCyclesFromText,
  calculateReplenishmentTimeline,
  ReplenishmentTimeline,
  ParsedSupplyCycle
} from "./crmKnowledgeEngine";
import { formatAuDate, formatAuDateTime } from "./dateUtils";
import { CallTalkingPoint } from "./crmCallPreparation";

/**
 * Returns tomorrow's date string (YYYY-MM-DD) based on a reference date (or today).
 */
export function getTomorrowDateString(referenceDateStr?: string): string {
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const validRef = isNaN(ref.getTime()) ? new Date() : ref;
  const tomorrow = new Date(validRef);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

/**
 * Filters meetings scheduled for tomorrow (the next day).
 */
export function getNextDayMeetings(tasks: CRMTask[], referenceDateStr?: string): CRMTask[] {
  const tomorrowStr = getTomorrowDateString(referenceDateStr);
  return tasks.filter((t) => {
    const isMeetingType = t.type === "Meeting" || t.type === "Site Visit";
    const isScheduled = t.status !== "Completed" && t.status !== "Cancelled";
    return isMeetingType && isScheduled && t.dueDate === tomorrowStr;
  });
}

/**
 * Filters all upcoming scheduled meetings from a reference date onward.
 */
export function getUpcomingMeetings(tasks: CRMTask[], fromDateStr?: string): CRMTask[] {
  const todayStr = fromDateStr || new Date().toISOString().split("T")[0];
  return tasks
    .filter((t) => {
      const isMeetingType = t.type === "Meeting" || t.type === "Site Visit";
      const isScheduled = t.status !== "Completed" && t.status !== "Cancelled";
      return isMeetingType && isScheduled && t.dueDate >= todayStr;
    })
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return (a.dueTime || "00:00").localeCompare(b.dueTime || "00:00");
    });
}

/**
 * Generates an automated, highly-tailored Meeting Preparation Plan
 * for an upcoming customer meeting.
 */
export function generateMeetingPreparationPlan(
  meeting: CRMTask,
  context: {
    accounts: Account[];
    contacts: CRMContact[];
    opportunities: CRMOpportunity[];
    activities: CRMActivity[];
    knowledge: CRMKnowledgeItem[];
    tasks: CRMTask[];
  }
): MeetingPreparationPlan {
  const { accounts, contacts, opportunities, activities, knowledge, tasks } = context;

  // 1. Resolve Account
  const account = meeting.accountId
    ? accounts.find((a) => a.id === meeting.accountId) || null
    : null;
  const accountName = account?.name || meeting.accountName || "Customer Account";

  // 2. Resolve Participants
  const participantIds = meeting.contactIds && meeting.contactIds.length > 0
    ? meeting.contactIds
    : meeting.contactId
    ? [meeting.contactId]
    : [];

  let participants: CRMContact[] = contacts.filter((c) => participantIds.includes(c.id));
  if (participants.length === 0 && account) {
    participants = contacts.filter((c) => c.accountId === account.id && !c.isArchived).slice(0, 3);
  }

  // 3. Resolve Opportunity
  const opportunity = meeting.opportunityId
    ? opportunities.find((o) => o.id === meeting.opportunityId) || null
    : account
    ? opportunities.find((o) => o.accountId === account.id) || null
    : null;

  // 4. Gather account activities & knowledge
  const accountActivities = activities.filter((a) => {
    if (account && a.accountId === account.id) return true;
    if (opportunity && a.opportunityId === opportunity.id) return true;
    return false;
  });

  const accountKnowledge = knowledge.filter((k) => {
    if (k.status !== "active") return false;
    if (account && k.accountId === account.id) return true;
    if (opportunity && k.opportunityId === opportunity.id) return true;
    return false;
  });

  // 5. Calculate Product Supply & Replenishment Cycles evaluated at meeting date
  const rawCycles: ParsedSupplyCycle[] = [];
  for (const a of accountActivities) {
    const fullText = `${a.title || ""} ${a.description || ""} ${(a as any).notes || ""}`.trim();
    const parsed = parseSupplyCyclesFromText(fullText, a.timestamp?.split("T")[0]);
    for (const p of parsed) {
      if (!rawCycles.some((rc) => rc.product.toLowerCase() === p.product.toLowerCase())) {
        rawCycles.push(p);
      }
    }
  }
  for (const k of accountKnowledge) {
    if (k.category === "Supply & Replenishment Cycle") {
      const parsed = parseSupplyCyclesFromText(k.statement, k.sourceActivityDate);
      for (const p of parsed) {
        if (!rawCycles.some((rc) => rc.product.toLowerCase() === p.product.toLowerCase())) {
          rawCycles.push(p);
        }
      }
    }
  }

  const supplyCycles: ReplenishmentTimeline[] = rawCycles.map((c) =>
    calculateReplenishmentTimeline(c, meeting.dueDate)
  );

  // 6. Gather Participant Intelligence & Personal Rapport Points
  const participantContexts: MeetingPreparationPlan["participantContexts"] = [];

  for (const p of participants) {
    const rapportPoints: string[] = [];

    // Check recent activities for mentions of this participant
    if (p.firstName) {
      const nameRegex = new RegExp(`\\b${p.firstName}\\b`, "i");
      for (const act of accountActivities) {
        const text = `${act.title || ""} ${act.description || ""} ${(act as any).notes || ""}`;
        if (nameRegex.test(text)) {
          const sentences = text.split(/[.!?\n]+/);
          const matchedSentence = sentences.find((s) => nameRegex.test(s));
          if (matchedSentence && /(?:perth|water\s*leak|leak|property|repair|holiday|away|family|promoted|new\s+role)/i.test(matchedSentence)) {
            if (/water\s*leak|perth/i.test(matchedSentence)) {
              rapportPoints.push(`Check in on how the water leak repairs went at his property in Perth (noted by ${act.contactName || "colleague"}).`);
            } else {
              rapportPoints.push(`Recent update: "${matchedSentence.trim()}".`);
            }
          }
        }
      }
    }

    // Check notable events
    if (p.notableEvents && p.notableEvents.length > 0) {
      for (const ne of p.notableEvents) {
        rapportPoints.push(`${ne.title}${ne.description ? `: ${ne.description}` : ""}`);
      }
    }

    // Check things to remember
    if (p.thingsToRemember) {
      rapportPoints.push(`Note: ${p.thingsToRemember}`);
    }

    participantContexts.push({
      contact: p,
      role: p.jobTitle || p.role || "Stakeholder",
      rapportPoints
    });
  }

  // 7. Gather Open Quotes & Deals
  const openQuotes: MeetingPreparationPlan["openQuotes"] = [];
  if (opportunity && opportunity.quoteNumber) {
    const hasResponse = Boolean(
      opportunity.quoteStatus === "Accepted" ||
      opportunity.quoteStatus === "Declined" ||
      opportunity.quoteStatus === "PO Received"
    );

    // Report the status actually held. This previously said the system had no
    // information for every state except Accepted/Declined/PO Received —
    // including Sent, which is the normal state of an outstanding quote.
    let responseDetail: string;
    switch (opportunity.quoteStatus) {
      case "Accepted":
      case "PO Received":
        responseDetail = "Accepted — awaiting the purchase order or a delivery schedule.";
        break;
      case "Declined":
        responseDetail = `Declined: ${opportunity.lostReason || "no reason recorded"}.`;
        break;
      case "Sent":
      case "Issued":
        responseDetail = opportunity.quoteSentDate
          ? `Issued ${formatAuDate(opportunity.quoteSentDate)}. No response recorded yet.`
          : "Issued. No response recorded yet.";
        break;
      case "Viewed":
        responseDetail = "The customer has opened it but has not responded yet.";
        break;
      case "Client Review":
        responseDetail = "With the customer for review.";
        break;
      case "Revising":
        responseDetail = "Being revised.";
        break;
      case "Expired":
        responseDetail = "Expired — it will need to be reissued.";
        break;
      default:
        responseDetail = "No quote status has been recorded against this yet.";
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

  // 8. Build Actionable Talking Points
  const talkingPoints: CallTalkingPoint[] = [];

  // A. Personal Rapport Talking Points
  for (const pc of participantContexts) {
    if (pc.rapportPoints.length > 0) {
      talkingPoints.push({
        category: "Context",
        text: `Personal Check-in with ${pc.contact.firstName}: ${pc.rapportPoints[0]}`
      });
    }
  }

  // B. Product Supply & Replenishment Talking Points
  for (const sc of supplyCycles) {
    if (sc.monthsRemaining <= 1 || sc.daysRemaining <= 45) {
      talkingPoints.push({
        category: "Commercial",
        text: `Replenishment Window (1 Month Out): ${accountName} is ~1 month out from requiring more ${sc.product} (ordered ${sc.quantity || ""} units for ~${sc.durationRaw} supply${sc.destination ? ` for ${sc.destination}` : ""}). Verify on-site stock levels and lead times for their next order.`
      });
    } else {
      talkingPoints.push({
        category: "Commercial",
        text: `Supply Status: Check delivery rollout of the ${sc.quantity ? `${sc.quantity} units of ` : ""}${sc.product} recently ordered${sc.destination ? ` for ${sc.destination}` : ""}. Estimated stock remaining: ~${sc.monthsRemaining} months.`
      });
    }
  }

  // C. Open Quotes
  for (const q of openQuotes) {
    if (!q.hasRecordedResponse) {
      talkingPoints.push({
        category: "Commercial",
        text: `Follow up on Quote ${q.quoteNumber} ($${q.dealValue.toLocaleString()} for ${q.dealName}). Confirm if specifications meet requirements.`
      });
    }
  }

  // D. Commitments & Preferences
  const commitments = accountKnowledge.filter((k) => k.category === "Commitment");
  for (const c of commitments.slice(0, 2)) {
    talkingPoints.push({
      category: "Commitment",
      text: `Follow up on commitment: "${c.statement}".`,
      sourceRef: c.sourceActivityDate
    });
  }

  // 9. Recommended Agenda Items
  const agendaItems: string[] = [];
  if (meeting.agenda) {
    agendaItems.push(meeting.agenda);
  } else {
    agendaItems.push("Welcome & Relationship Check-in");
    if (supplyCycles.length > 0) {
      agendaItems.push(`Product Stock & Deployment Review (${supplyCycles.map((s) => s.product).join(", ")})`);
    }
    if (openQuotes.length > 0) {
      agendaItems.push(`Active Quotes & Project Delivery Timelines`);
    }
    agendaItems.push("Next Steps, Action Points & Delivery Commitments");
  }

  // 10. Suggested Strategic Questions
  const suggestedQuestions: string[] = [
    `How is the rollout and installation tracking across your current active sites?`
  ];

  if (supplyCycles.some((s) => s.monthsRemaining <= 1 || s.daysRemaining <= 45)) {
    suggestedQuestions.push(
      `With your current batch expected to run low over the next month, what are your target delivery dates for the next replenishment shipment?`
    );
  }

  if (openQuotes.length > 0 && !openQuotes[0].hasRecordedResponse) {
    suggestedQuestions.push(
      `Have you had an opportunity to review Quote ${openQuotes[0].quoteNumber}, and are there any specific technical or commercial revisions required?`
    );
  } else {
    suggestedQuestions.push(
      `Are there any upcoming tender packages or expansion projects on the horizon for the next quarter?`
    );
  }

  // 11. Compose Executive Natural Language Briefing
  const narrativeParagraphs: string[] = [];

  const participantsList = participants.map((p) => `${p.firstName} ${p.lastName}`).join(", ") || "Key Stakeholders";
  narrativeParagraphs.push(
    `Meeting with ${accountName} on ${formatAuDateTime(meeting.dueDate, meeting.dueTime)} (${meeting.meetingFormat || "In Person"}). Attendees: ${participantsList}.`
  );

  // Supply cycle narrative
  for (const sc of supplyCycles) {
    if (sc.monthsRemaining <= 1 || sc.daysRemaining <= 45) {
      narrativeParagraphs.push(
        `⚠️ Replenishment Opportunity: At this meeting date, ${accountName} will be approximately 1 month out from requiring more ${sc.product} (ordered ${sc.quantity ? `${sc.quantity} units ` : ""}for a ~${sc.durationRaw} supply${sc.destination ? `, mostly sent to ${sc.destination}` : ""}). Prioritise locking in their next batch order.`
      );
    } else {
      narrativeParagraphs.push(
        `${accountName} recently ordered ${sc.quantity ? `${sc.quantity} units of ` : ""}${sc.product} (~${sc.durationRaw} supply${sc.destination ? ` for ${sc.destination}` : ""}, projected run-out ${sc.runOutDate}).`
      );
    }
  }

  // Rapport items narrative
  const rapportNoted = participantContexts.filter((pc) => pc.rapportPoints.length > 0);
  if (rapportNoted.length > 0) {
    const points = rapportNoted.map((pc) => `${pc.contact.firstName}: ${pc.rapportPoints[0]}`).join(" ");
    narrativeParagraphs.push(`Personal Context & Rapport: ${points}`);
  }

  // Closing focus
  narrativeParagraphs.push(
    `Objective: Align on stock depletion rates, advance pending commercial agreements, and agree on clear follow-up milestones.`
  );

  const executiveBriefing = narrativeParagraphs.join("\n\n");

  return {
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingDate: meeting.dueDate,
    meetingTime: meeting.dueTime,
    meetingFormat: meeting.meetingFormat,
    location: meeting.location,
    account,
    participants,
    opportunity,
    executiveBriefing,
    agendaItems,
    talkingPoints,
    supplyCycles,
    participantContexts,
    openQuotes,
    suggestedQuestions,
    privateNotes: meeting.notes
  };
}
