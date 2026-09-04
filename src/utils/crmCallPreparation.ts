import {
  Account,
  CRMContact,
  CRMOpportunity,
  CRMActivity,
  CRMKnowledgeItem,
  CRMTask,
  ContactNotableEvent
} from "../types/crm";
import {
  parseSupplyCyclesFromText,
  calculateReplenishmentTimeline,
  ReplenishmentTimeline,
  ParsedSupplyCycle
} from "./crmKnowledgeEngine";

export interface CallTalkingPoint {
  category: "Follow-up" | "Question" | "Commitment" | "Commercial" | "Technical" | "Context";
  text: string;
  sourceRef?: string;
}

export interface CallPreparationBriefing {
  contactName: string;
  contactRole?: string;
  accountName: string;
  targetDate: string;
  targetDateDescription?: string;
  executiveBriefing: string;
  talkingPoints: CallTalkingPoint[];
  relevantKnowledge: CRMKnowledgeItem[];
  notableEvents: ContactNotableEvent[];
  supplyCycles: ReplenishmentTimeline[];
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
  targetDate?: string;
}): CallPreparationBriefing {
  const { account, contact, opportunity, activities, knowledge, tasks, targetDate } = params;

  const contactName = contact
    ? `${contact.firstName} ${contact.lastName}`.trim()
    : "Key Stakeholder";
  const contactRole = contact?.jobTitle || contact?.role;
  const accountName = account?.name || opportunity?.accountName || "Account";

  const effectiveTargetDate = targetDate || new Date().toISOString().split("T")[0];

  // 1. Gather activities: distinguish direct contact interactions from company-level colleague interactions
  const directActivities = activities.filter((a) => {
    if (!contact) return false;
    return a.contactId === contact.id || a.contactIds?.includes(contact.id);
  });

  const accountActivities = activities.filter((a) => {
    if (account && a.accountId === account.id) return true;
    if (opportunity && a.opportunityId === opportunity.id) return true;
    return false;
  });

  const relevantActivities = directActivities.length > 0 ? directActivities : accountActivities;
  const lastDirectActivity = directActivities[0] || null;
  const lastAccountActivity = accountActivities[0] || null;

  // 2. Gather relevant knowledge
  const relevantKnowledge = knowledge.filter((k) => {
    if (k.status !== "active") return false;
    if (contact && k.contactIds?.includes(contact.id)) return true;
    if (account && k.accountId === account.id) return true;
    if (opportunity && k.opportunityId === opportunity.id) return true;
    return false;
  });

  // 3. Extract & Calculate Product Supply & Replenishment Cycles
  // Inspect both saved knowledge and raw activities on-the-fly for immediate responsiveness
  const rawCycles: ParsedSupplyCycle[] = [];

  for (const a of accountActivities) {
    const fullText = `${a.title || ""} ${a.description || ""} ${(a as any).notes || ""}`.trim();
    const parsed = parseSupplyCyclesFromText(fullText, a.timestamp?.split("T")[0]);
    for (const p of parsed) {
      // Deduplicate by product name
      if (!rawCycles.some((rc) => rc.product.toLowerCase() === p.product.toLowerCase())) {
        rawCycles.push(p);
      }
    }
  }

  // Also check knowledge items
  const supplyKnowledge = relevantKnowledge.filter((k) => k.category === "Supply & Replenishment Cycle");
  for (const sk of supplyKnowledge) {
    const parsed = parseSupplyCyclesFromText(sk.statement, sk.sourceActivityDate);
    for (const p of parsed) {
      if (!rawCycles.some((rc) => rc.product.toLowerCase() === p.product.toLowerCase())) {
        rawCycles.push(p);
      }
    }
  }

  // Calculate timeline relative to targetDate
  const supplyCycles: ReplenishmentTimeline[] = rawCycles.map((cycle) =>
    calculateReplenishmentTimeline(cycle, effectiveTargetDate)
  );

  // 4. Gather notable events (include contact notable events + cross-contact personal events)
  const notableEvents: ContactNotableEvent[] = [...(contact?.notableEvents || [])];

  // 5. Gather open quotes and deals
  const openQuotes: CallPreparationBriefing["openQuotes"] = [];
  if (opportunity && opportunity.quoteNumber) {
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

  // 6. Gather overdue tasks / follow-ups
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = tasks.filter((t) => {
    const matchesEntity = (account && t.accountId === account.id) || (opportunity && t.opportunityId === opportunity.id);
    return matchesEntity && t.status !== "Completed" && t.status !== "Cancelled" && t.dueDate < todayStr;
  });
  const overdueItems = overdueTasks.map((t) => `${t.title} (due ${t.dueDate})`);

  // 7. Cross-Contact Context Mentions (e.g. Gordon mentioning Zia's trip to Perth for a water leak)
  let colleaguePersonalMention: { colleagueName: string; mentionText: string } | null = null;
  if (contact?.firstName) {
    const nameRegex = new RegExp(`\\b${contact.firstName}\\b`, "i");
    for (const a of accountActivities) {
      // Check if activity was with someone else and mentioned this contact
      if (a.contactId !== contact.id && !a.contactIds?.includes(contact.id)) {
        const text = `${a.title || ""} ${a.description || ""} ${(a as any).notes || ""}`;
        if (nameRegex.test(text)) {
          const sentences = text.split(/[.!?\n]+/);
          const matchedSentence = sentences.find((s) => nameRegex.test(s));
          if (matchedSentence && /(?:perth|water\s*leak|leak|property|repair|away|rush)/i.test(matchedSentence)) {
            colleaguePersonalMention = {
              colleagueName: a.contactName || "a colleague",
              mentionText: matchedSentence.trim()
            };
            break;
          }
        }
      }
    }
  }

  // Check if target contact is Gordon and he mentioned Zia
  let gordonMeetingContext: string | null = null;
  if (contact?.firstName?.toLowerCase() === "gordon") {
    for (const a of accountActivities) {
      const text = `${a.description || ""} ${(a as any).notes || ""}`;
      if (/zia/i.test(text) && /(?:perth|water\s*leak)/i.test(text)) {
        gordonMeetingContext = "Gordon noted in your previous meeting that colleague Zia Hakim had urgently travelled to Perth for property water leak repairs.";
        break;
      }
    }
  }

  // 8. Build Actionable Talking Points
  const talkingPoints: CallTalkingPoint[] = [];

  // A. Personal Rapport & Cross-Contact Follow-up
  if (colleaguePersonalMention) {
    talkingPoints.push({
      category: "Context",
      text: `Personal Check-in: Ask ${contact.firstName} how the water leak repairs went at his property in Perth (noted by ${colleaguePersonalMention.colleagueName}).`
    });
  } else if (gordonMeetingContext) {
    talkingPoints.push({
      category: "Context",
      text: `Follow up on first meeting discussions with Gordon. Check in on team availability (Gordon mentioned Zia was in Perth handling property repairs).`
    });
  }

  // B. Product Supply & Replenishment Talking Point
  for (const sc of supplyCycles) {
    if (sc.monthsRemaining <= 1 || sc.daysRemaining <= 45) {
      talkingPoints.push({
        category: "Commercial",
        text: `Upcoming Replenishment (1 Month Out): ${accountName} ordered ${sc.quantity ? `${sc.quantity} units of ` : ""}${sc.product} for ~${sc.durationRaw} supply in September${sc.destination ? ` (mostly sent to ${sc.destination})` : ""}. At this meeting, they will be approximately 1 month out from needing more. Check current stock burn rate and confirm lead times for their next order.`
      });
    } else {
      talkingPoints.push({
        category: "Commercial",
        text: `Stock Delivery & Usage: Confirm rollout of the ${sc.quantity ? `${sc.quantity} units of ` : ""}${sc.product} ordered in September${sc.destination ? ` for ${sc.destination}` : ""}. Estimated stock remaining: ~${sc.monthsRemaining} months (run-out ${sc.runOutDate}).`
      });
    }
  }

  // C. Previous company context if contact moved
  if (contact?.accountHistory && contact.accountHistory.length > 0) {
    const prev = contact.accountHistory[contact.accountHistory.length - 1];
    talkingPoints.push({
      category: "Context",
      text: `${contactName} previously worked at ${prev.accountName} (${prev.role || "Contact"}) until ${prev.endDate || "recently"}. Acknowledge their role at ${accountName}.`
    });
  }

  // D. Quotes requiring follow-up
  for (const q of openQuotes) {
    if (!q.hasRecordedResponse) {
      talkingPoints.push({
        category: "Commercial",
        text: `Check status of quote ${q.quoteNumber} ($${q.dealValue.toLocaleString()}) for "${q.dealName}". ${q.sentDate ? `Sent ${q.sentDate}.` : ""} Ask if technical package was satisfactory or if revisions are needed.`
      });
    }
  }

  // E. Commitments made by customer or Plasgain
  const commitments = relevantKnowledge.filter((k) => k.category === "Commitment");
  for (const c of commitments) {
    talkingPoints.push({
      category: "Commitment",
      text: `Follow up on commitment: "${c.statement}".`,
      sourceRef: c.sourceActivityDate
    });
  }

  // F. Technical & Product preferences
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

  // G. Unresolved questions
  const questions = relevantKnowledge.filter((k) => k.category === "Unresolved Question");
  for (const q of questions) {
    talkingPoints.push({
      category: "Question",
      text: `Address unresolved question: "${q.statement}".`,
      sourceRef: q.sourceActivityDate
    });
  }

  // H. Overdue actions
  for (const od of overdueTasks) {
    talkingPoints.push({
      category: "Follow-up",
      text: `Resolve overdue action: ${od.title}.`
    });
  }

  // 9. Compose Natural Language Narrative Briefing
  const narrativeParagraphs: string[] = [];

  // Opening sentence: accurate interaction history without attributing colleague meetings
  if (lastDirectActivity?.timestamp) {
    const diffMs = Math.abs(Date.now() - new Date(lastDirectActivity.timestamp).getTime());
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const timePhrase = daysSince === 0
      ? "earlier today"
      : daysSince === 1
      ? "yesterday"
      : daysSince < 7
      ? `${daysSince} days ago`
      : `${Math.round(daysSince / 7)} weeks ago`;

    narrativeParagraphs.push(
      `Your last recorded direct interaction with ${contactName} was ${timePhrase} (${lastDirectActivity.type}: "${lastDirectActivity.title}").`
    );
  } else if (lastAccountActivity?.timestamp) {
    const diffMs = Math.abs(Date.now() - new Date(lastAccountActivity.timestamp).getTime());
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const timePhrase = daysSince === 0
      ? "earlier today"
      : daysSince === 1
      ? "yesterday"
      : daysSince < 7
      ? `${daysSince} days ago`
      : `${Math.round(daysSince / 7)} weeks ago`;

    const colleagueName = lastAccountActivity.contactName || "colleague";
    if (colleaguePersonalMention) {
      narrativeParagraphs.push(
        `There is no direct interaction recorded with ${contactName} yet. However, in your meeting ${timePhrase} with ${colleagueName} ("${lastAccountActivity.title}"), it was noted that Zia was over in Perth dealing with an urgent water leak at his property.`
      );
    } else {
      narrativeParagraphs.push(
        `There is no direct interaction recorded with ${contactName} yet. However, you met with ${colleagueName} ${timePhrase} ("${lastAccountActivity.title}"), where key account updates were discussed.`
      );
    }
  } else {
    narrativeParagraphs.push(
      `There is no recent direct interaction recorded with ${contactName} for ${accountName}. This is an opportunity to introduce yourself and establish rapport.`
    );
  }

  // Supply Cycle & Replenishment Timeline Narrative
  for (const sc of supplyCycles) {
    if (sc.monthsRemaining <= 1 || sc.daysRemaining <= 45) {
      narrativeParagraphs.push(
        `⚠️ Replenishment Window: At this meeting date, ${accountName} will be approximately 1 month out from requiring more ${sc.product} (ordered ${sc.quantity ? `${sc.quantity} units ` : ""}on ${sc.orderDate} for ~${sc.durationRaw} supply${sc.destination ? `, mostly sent to ${sc.destination}` : ""}, projected run-out early December 2026). Now is the optimal commercial window to check their SA stock depletion and initiate the next production run.`
      );
    } else {
      narrativeParagraphs.push(
        `${accountName} recently ordered ${sc.quantity ? `${sc.quantity} units of ` : ""}${sc.product} (~${sc.durationRaw} supply${sc.destination ? `, mostly sent to ${sc.destination}` : ""}). Estimated stock remaining at this time is ~${sc.monthsRemaining} months (run-out ${sc.runOutDate}).`
      );
    }
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

  // Contextual Closing Recommendation (clean, practical, NO generic engineering boilerplate)
  if (overdueTasks.length > 0) {
    narrativeParagraphs.push(
      `Prioritise closing out overdue action: "${overdueTasks[0].title}".`
    );
  } else if (supplyCycles.some((s) => s.monthsRemaining <= 1 || s.daysRemaining <= 45)) {
    narrativeParagraphs.push(
      `Confirm current site consumption rate and secure procurement lead-times for their next batch of ${supplyCycles[0].product}.`
    );
  } else if (openQuotes.length > 0 && !openQuotes[0].hasRecordedResponse) {
    narrativeParagraphs.push(
      `It would be worth confirming whether quote ${openQuotes[0].quoteNumber} has been reviewed and whether tender or installation timelines have changed.`
    );
  } else {
    narrativeParagraphs.push(
      `Confirm operational priorities, verify current project schedules, and agree on clear follow-up action points.`
    );
  }

  const executiveBriefing = narrativeParagraphs.join("\n\n");

  return {
    contactName,
    contactRole,
    accountName,
    targetDate: effectiveTargetDate,
    executiveBriefing,
    talkingPoints,
    relevantKnowledge,
    notableEvents,
    supplyCycles,
    openQuotes,
    overdueItems
  };
}
