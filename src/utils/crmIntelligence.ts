import {
  Account,
  CRMOpportunity,
  CRMLead,
  CRMTask,
  CRMActivity,
  NextBestActionItem,
  DealHealthRating,
  CompetitorPricingRecord
} from "../types/crm";

export interface DealSilenceRiskEvaluation {
  isSilent: boolean;
  daysSilent: number;
  riskLevel: "Critical" | "Warning" | "Moderate" | "None";
  diagnosis: string;
  reasonCategory: "Council Tender Window" | "Contractor Tender Closing" | "Competitor Presence" | "High-Value Silence" | "Normal Cadence";
  recommendedAction: {
    actionLabel: string;
    actionType: "send_email" | "log_call" | "schedule_meeting";
    subject?: string;
    suggestedNotes: string;
  };
}

/**
 * Value-weighted, segment-aware deal silence detection.
 * Analyzes why a deal has gone quiet (Council tender cycle vs Contractor closing window vs Competitor presence).
 */
export function evaluateDealSilenceRisk(
  deal: CRMOpportunity,
  options: {
    competitorPricing?: CompetitorPricingRecord[];
    activities?: CRMActivity[];
    account?: Account | null;
    todayStr?: string;
  } = {}
): DealSilenceRiskEvaluation {
  const todayStr = options.todayStr || new Date().toISOString().split("T")[0];

  // 1. Calculate latest customer contact date
  let latestDate = deal.quoteSentDate || deal.latestActivityDate;
  if (options.activities && options.activities.length > 0) {
    const dealActivities = options.activities.filter(
      (a) => a.opportunityId === deal.id || (deal.accountId && a.accountId === deal.accountId)
    );
    for (const a of dealActivities) {
      const actDate = a.timestamp ? a.timestamp.split("T")[0] : undefined;
      if (actDate && (!latestDate || actDate > latestDate)) {
        latestDate = actDate;
      }
    }
  }

  // Days silent since the latest confirmed interaction/quote
  let daysSilent = deal.daysInCurrentStage || 0;
  if (latestDate) {
    const diff = CRMIntelligenceEngine.daysBetween(latestDate, todayStr);
    daysSilent = Math.max(0, diff);
  }

  // 2. Identify active competitors for this deal/account
  const competitorPricing = options.competitorPricing || [];
  const activeCompetitor = competitorPricing.find(
    (c) =>
      c.status === "Active" &&
      ((deal.accountId && c.accountId === deal.accountId) || (c.opportunityId && c.opportunityId === deal.id))
  );

  // 3. Segment Identification
  const combinedName = `${deal.accountName || ""} ${options.account?.name || ""} ${deal.name}`.toLowerCase();
  const isCouncil =
    options.account?.accountType === "Council" ||
    /(?:council|shire|city\s+of|municipality|government|regional)/i.test(combinedName);
  const isContractor =
    options.account?.accountType === "Contractor" ||
    /(?:contract|civil|construction|downer|lendlease|fulton|cpb|electrical|builder)/i.test(combinedName);

  const dealVal = deal.dealValue || 0;

  // Case A: Active Competitor Presence
  if (activeCompetitor && (daysSilent >= 6 || deal.daysInCurrentStage >= 10)) {
    const varianceSnippet = activeCompetitor.plasgainQuotedPrice
      ? ` (quoted $${activeCompetitor.price.toLocaleString()} vs Plasgain $${activeCompetitor.plasgainQuotedPrice.toLocaleString()})`
      : ` (logged at $${activeCompetitor.price.toLocaleString()})`;

    return {
      isSilent: true,
      daysSilent,
      riskLevel: "Critical",
      reasonCategory: "Competitor Presence",
      diagnosis: `Active Competitor Risk: ${activeCompetitor.competitorName} pricing recorded${varianceSnippet}. ${daysSilent} days of silence suggests ${deal.accountName || "the customer"} is actively evaluating competing proposals. Re-anchor on Plasgain's 50-year design life, zero thermal sag, and IK10 durability.`,
      recommendedAction: {
        actionLabel: "Send Competitor Defense Email",
        actionType: "send_email",
        subject: `Proposal review & technical specifications for ${deal.name}`,
        suggestedNotes: `Re-anchor client on Plasgain's engineered composite core, IK10 vandal resistance, and 50-year maintenance-free lifecycle compared to ${activeCompetitor.competitorName}.`
      }
    };
  }

  // Case B: Council Tender Committee Window
  if (isCouncil && (daysSilent >= 10 || deal.daysInCurrentStage >= 14)) {
    return {
      isSilent: true,
      daysSilent,
      riskLevel: dealVal >= 50000 ? "Critical" : "Warning",
      reasonCategory: "Council Tender Window",
      diagnosis: `Council Procurement Silence: ${daysSilent} days since touchpoint on $${dealVal.toLocaleString()} project. Council committees review tenders on monthly schedules; silence signals waiting for agenda sign-off or pending compliance submittals.`,
      recommendedAction: {
        actionLabel: "Offer Council Compliance Submittal",
        actionType: "send_email",
        subject: `Engineering compliance & DIALux package for ${deal.name}`,
        suggestedNotes: `Offer to provide certified AS/NZS 1158 engineering calculations, photometric reports, or environmental certificates to support council committee approval.`
      }
    };
  }

  // Case C: Contractor Tender Closing Window
  if (isContractor && (daysSilent >= 7 || deal.daysInCurrentStage >= 10)) {
    return {
      isSilent: true,
      daysSilent,
      riskLevel: dealVal >= 50000 ? "Critical" : "Warning",
      reasonCategory: "Contractor Tender Closing",
      diagnosis: `Contractor Tender Closing Risk: ${daysSilent} days of silence on $${dealVal.toLocaleString()} quotation. Head contractors finalize sub-packages within 7–14 days. Urgent touchpoint required to guarantee delivery dates and lock specifications.`,
      recommendedAction: {
        actionLabel: "Call Contractor to Lock Spec",
        actionType: "log_call",
        subject: `Tender closing follow-up for ${deal.name}`,
        suggestedNotes: `Confirm tender award date with head contractor, verify bill of materials, and commit factory manufacturing slot to secure delivery timeline.`
      }
    };
  }

  // Case D: General High-Value Deal Stall
  if (dealVal >= 50000 && (daysSilent >= 12 || deal.daysInCurrentStage >= 14)) {
    return {
      isSilent: true,
      daysSilent,
      riskLevel: "Critical",
      reasonCategory: "High-Value Silence",
      diagnosis: `High-Value Stalled Momentum ($${dealVal.toLocaleString()}): In ${deal.stageName} with ${daysSilent} days of customer silence. High risk of project postponement or budget reallocation without executive re-engagement.`,
      recommendedAction: {
        actionLabel: "Executive Follow-up Call",
        actionType: "log_call",
        subject: `Executive check-in on ${deal.name}`,
        suggestedNotes: `Reach out directly to senior project sponsor to verify capital expenditure release and delivery milestones.`
      }
    };
  }

  // Case E: Normal Cadence
  return {
    isSilent: false,
    daysSilent,
    riskLevel: "None",
    reasonCategory: "Normal Cadence",
    diagnosis: "Deal cadence is active with regular stakeholder touchpoints.",
    recommendedAction: {
      actionLabel: "Review & Re-engage",
      actionType: "schedule_meeting",
      suggestedNotes: `Check project timeline and next milestones for ${deal.name}.`
    }
  };
}

export class CRMIntelligenceEngine {
  static evaluateDealSilenceRisk = evaluateDealSilenceRisk;

  /**
   * Calculate Next Best Actions across all Accounts, Deals, Leads, and Tasks
   */
  static generateNextBestActions(
    accounts: Account[],
    deals: CRMOpportunity[],
    leads: CRMLead[],
    tasks: CRMTask[],
    activities: CRMActivity[] = [],
    competitorPricing: CompetitorPricingRecord[] = []
  ): NextBestActionItem[] {
    const actions: NextBestActionItem[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Rule 1: Quotes Sent without follow-up in > 3 days
    deals.forEach((deal) => {
      if (deal.quoteStatus === "Sent" && deal.quoteSentDate) {
        const daysSinceQuote = this.daysBetween(deal.quoteSentDate, todayStr);
        if (daysSinceQuote >= 3) {
          actions.push({
            id: `nba-quote-${deal.id}`,
            ruleId: "RULE_QUOTE_FOLLOWUP",
            title: `Follow up on Quote ${deal.quoteNumber || "Submitted"} ($${(deal.dealValue || 0).toLocaleString()})`,
            description: `Quote was sent ${daysSinceQuote} days ago to ${deal.primaryContactName || "the client"} with no recent confirmation.`,
            reason: `High conversion drop-off occurs if quotes remain un-followed for >3 days. Confirm receipt and address technical or commercial queries.`,
            urgency: daysSinceQuote >= 7 ? "Immediate" : "Today",
            category: "Quote Follow-up",
            relatedEntityType: "Opportunity",
            relatedEntityId: deal.id,
            relatedEntityName: deal.name,
            actionLabel: "Draft Follow-Up Email",
            actionPayload: {
              type: "send_email",
              defaultTitle: `Follow-up: Plasgain Proposal ${deal.quoteNumber || ""}`,
              defaultNotes: `Checking if ${deal.primaryContactName || "client"} had any questions on the luminaire selection and freight.`,
              opportunityId: deal.id,
              accountId: deal.accountId,
              recipientEmail: deal.primaryContactEmail
            }
          });
        }
      }
    });

    // Rule 2: Active Deals with No Next Action or Past Next Action Date
    deals.forEach((deal) => {
      if (deal.stageId !== "stage-won" && deal.stageId !== "stage-lost") {
        if (!deal.nextAction || deal.nextAction.trim() === "" || (deal.nextActionDate && deal.nextActionDate < todayStr)) {
          actions.push({
            id: `nba-no-action-${deal.id}`,
            ruleId: "RULE_MISSING_NEXT_ACTION",
            title: `Schedule Next Action for "${deal.name}"`,
            description: deal.nextActionDate && deal.nextActionDate < todayStr
              ? `Action "${deal.nextAction}" was due on ${deal.nextActionDate} and is overdue.`
              : `This active deal has no scheduled next step.`,
            reason: `Every active sales opportunity must have an unambiguous forward momentum date.`,
            urgency: "Immediate",
            category: "Missing Action",
            relatedEntityType: "Opportunity",
            relatedEntityId: deal.id,
            relatedEntityName: deal.name,
            actionLabel: "Set Next Action",
            actionPayload: {
              type: "create_task",
              defaultTitle: `Set next step for ${deal.name}`,
              opportunityId: deal.id,
              accountId: deal.accountId
            }
          });
        }
      }
    });

    // Rule 3: High Value Opportunities ($50k+) with Stalled Stage (> 14 days) or Segment-Aware Silence Risk
    deals.forEach((deal) => {
      if (deal.stageId !== "stage-won" && deal.stageId !== "stage-lost") {
        const account = accounts.find((a) => a.id === deal.accountId) || null;
        const silenceRisk = evaluateDealSilenceRisk(deal, {
          competitorPricing,
          activities,
          account,
          todayStr
        });

        const isClassicStall = deal.dealValue >= 50000 && deal.daysInCurrentStage >= 14;
        const isUrgentSilence = silenceRisk.isSilent && (silenceRisk.riskLevel === "Critical" || silenceRisk.riskLevel === "Warning");

        if (isClassicStall || isUrgentSilence) {
          const actionLabel = silenceRisk.recommendedAction.actionLabel || "Review & Re-engage";
          const actionType = silenceRisk.recommendedAction.actionType || "schedule_meeting";
          const defaultTitle = silenceRisk.recommendedAction.subject || `Strategy review for ${deal.name}`;
          const defaultNotes = silenceRisk.recommendedAction.suggestedNotes || `Checking timeline for ${deal.name}`;

          actions.push({
            id: `nba-stalled-${deal.id}`,
            ruleId: "RULE_STALLED_HIGH_VALUE",
            title: `Re-energise High Value Stalled Deal ($${(deal.dealValue || 0).toLocaleString()})`,
            description: silenceRisk.isSilent
              ? silenceRisk.diagnosis
              : `Opportunity has remained in ${deal.stageName} for ${deal.daysInCurrentStage} days without stage progression.`,
            reason: silenceRisk.isSilent
              ? silenceRisk.diagnosis
              : `High value infrastructure deals risk losing project budget if not actively championed with council or head contractors.`,
            urgency: silenceRisk.riskLevel === "Critical" ? "Immediate" : "Today",
            category: silenceRisk.isSilent ? "Deal Silence Risk" : "Stalled Deal",
            relatedEntityType: "Opportunity",
            relatedEntityId: deal.id,
            relatedEntityName: deal.name,
            actionLabel,
            actionPayload: {
              type: actionType,
              defaultTitle,
              defaultNotes,
              opportunityId: deal.id,
              accountId: deal.accountId,
              assignedContactId: deal.primaryContactId,
              recipientEmail: deal.primaryContactEmail
            }
          });
        }
      }
    });

    // Rule 4: Hot Leads (Score >= 75) Awaiting Contact
    leads.forEach((lead) => {
      if (lead.leadStatus === "New" || lead.leadStatus === "Attempting Contact" || lead.leadStatus === "Qualifying") {
        if (lead.leadScore >= 75) {
          actions.push({
            id: `nba-hot-lead-${lead.id}`,
            ruleId: "RULE_HOT_LEAD_RESPONSE",
            title: `Contact Hot Lead: ${lead.leadName} (${lead.leadScore} Score)`,
            description: `${lead.company} requested ${lead.enquiryType} with estimated value ~$${lead.estimatedValue.toLocaleString()}.`,
            reason: `Inbound leads contacted within 24 hours convert at 390% higher rates than aged leads.`,
            urgency: "Immediate",
            category: "Customer Waiting",
            relatedEntityType: "Lead",
            relatedEntityId: lead.id,
            relatedEntityName: lead.leadName,
            actionLabel: "Call Lead Now",
            actionPayload: {
              type: "log_call",
              defaultTitle: `Initial qualification call with ${lead.contactName}`,
              leadId: lead.id,
              accountId: lead.convertedAccountId
            }
          });
        }
      }
    });

    // Rule 5: Overdue Tasks
    tasks.forEach((task) => {
      if (task.status !== "Completed" && task.status !== "Cancelled" && task.dueDate < todayStr) {
        actions.push({
          id: `nba-overdue-task-${task.id}`,
          ruleId: "RULE_OVERDUE_TASK",
          title: `Complete Overdue Task: "${task.title}"`,
          description: `Task assigned to ${task.assignedTo} was due on ${task.dueDate}.`,
          reason: `Overdue commitments directly impact customer confidence and sales cycle speed.`,
          urgency: "Immediate",
          category: "Overdue Task",
          relatedEntityType: "Task",
          relatedEntityId: task.id,
          relatedEntityName: task.title,
          actionLabel: "Mark Complete / Reschedule",
          actionPayload: {
            type: "create_task",
            defaultTitle: `Follow up overdue task: ${task.title}`,
            opportunityId: task.opportunityId,
            accountId: task.accountId,
            dueDate: todayStr
          }
        });
      }
    });

    return actions;
  }

  /**
   * Evaluate Deal Health Rating
   */
  static evaluateDealHealth(
    deal: CRMOpportunity,
    todayStr: string = new Date().toISOString().split("T")[0],
    options?: {
      competitorPricing?: CompetitorPricingRecord[];
      activities?: CRMActivity[];
      account?: Account | null;
    }
  ): {
    rating: DealHealthRating;
    reasons: string[];
    silenceRisk?: DealSilenceRiskEvaluation;
  } {
    const reasons: string[] = [];
    let riskPoints = 0;

    // Evaluate segment and competitor silence risk
    const silenceRisk = evaluateDealSilenceRisk(deal, {
      todayStr,
      competitorPricing: options?.competitorPricing,
      activities: options?.activities,
      account: options?.account
    });

    if (silenceRisk.isSilent && silenceRisk.riskLevel === "Critical") {
      riskPoints += 2;
      reasons.push(silenceRisk.diagnosis);
    } else if (silenceRisk.isSilent && silenceRisk.riskLevel === "Warning") {
      riskPoints += 1;
      reasons.push(silenceRisk.diagnosis);
    }

    // Days in current stage check
    if (deal.daysInCurrentStage > 20) {
      riskPoints += 3;
      reasons.push(`Stalled in current stage (${deal.daysInCurrentStage} days without stage progression)`);
    } else if (deal.daysInCurrentStage > 10) {
      riskPoints += 1;
      reasons.push(`In stage for ${deal.daysInCurrentStage} days`);
    }

    // Days since last activity
    if (deal.latestActivityDate) {
      const daysSinceActivity = this.daysBetween(deal.latestActivityDate, todayStr);
      if (daysSinceActivity > 14) {
        riskPoints += 3;
        reasons.push(`No logged customer interaction for ${daysSinceActivity} days`);
      } else if (daysSinceActivity > 7) {
        riskPoints += 1;
        reasons.push(`Last activity was ${daysSinceActivity} days ago`);
      }
    } else {
      riskPoints += 2;
      reasons.push("No recorded activity date");
    }

    // Close date checks
    if (deal.expectedCloseDate) {
      if (deal.expectedCloseDate < todayStr) {
        riskPoints += 3;
        reasons.push(`Target close date (${deal.expectedCloseDate}) has passed`);
      } else {
        const daysToClose = this.daysBetween(todayStr, deal.expectedCloseDate);
        if (daysToClose <= 5 && deal.stageId !== "stage-negotiation" && deal.stageId !== "stage-won") {
          riskPoints += 2;
          reasons.push(`Close date is in ${daysToClose} days but deal is only in ${deal.stageName}`);
        }
      }
    }

    // Next action check
    if (!deal.nextAction || deal.nextAction.trim() === "") {
      riskPoints += 2;
      reasons.push("No scheduled next action");
    } else if (deal.nextActionDate && deal.nextActionDate < todayStr) {
      riskPoints += 2;
      reasons.push(`Next action is overdue (${deal.nextActionDate})`);
    }

    // Quote status
    if (deal.quoteStatus === "Sent" && deal.quoteSentDate) {
      const daysSinceQuote = this.daysBetween(deal.quoteSentDate, todayStr);
      if (daysSinceQuote > 10) {
        riskPoints += 2;
        reasons.push(`Quote submitted ${daysSinceQuote} days ago without formal response`);
      }
    }

    if (riskPoints >= 5) {
      return { rating: "At Risk", reasons, silenceRisk };
    }
    if (riskPoints >= 3) {
      return { rating: "Needs Attention", reasons, silenceRisk };
    }
    if (deal.daysInCurrentStage > 18) {
      return { rating: "Stalled", reasons, silenceRisk };
    }
    return {
      rating: "Healthy",
      reasons: reasons.length > 0 ? reasons : ["Recent activity logged", "Clear next action scheduled", "Healthy stage velocity"],
      silenceRisk
    };
  }

  /**
   * Dynamically calculate lead score and breakdown factors from lead data
   */
  static calculateLeadScore(lead: Partial<CRMLead>): {
    score: number;
    rating: "Hot" | "Warm" | "Developing" | "Low Priority";
    factors: Array<{ factor: string; scoreDelta: number; reason: string }>;
  } {
    const factors: Array<{ factor: string; scoreDelta: number; reason: string }> = [];
    let score = 20; // baseline

    // 1. Target authority / organization type
    const companyLower = (lead.company || "").toLowerCase();
    if (companyLower.includes("council") || companyLower.includes("shire") || companyLower.includes("city") || companyLower.includes("government")) {
      score += 30;
      factors.push({ factor: "Council Authority Target", scoreDelta: +30, reason: "Local government infrastructure project" });
    } else if (companyLower.includes("civil") || companyLower.includes("contract") || companyLower.includes("infrastructure") || companyLower.includes("downer") || companyLower.includes("lendlease")) {
      score += 25;
      factors.push({ factor: "Civil Head Contractor", scoreDelta: +25, reason: "Tier-1/Tier-2 civil infrastructure delivery" });
    } else if (lead.company) {
      score += 15;
      factors.push({ factor: "Verified Commercial Entity", scoreDelta: +15, reason: "Established commercial enterprise" });
    }

    // 2. Estimated Value band
    const val = lead.estimatedValue || 0;
    if (val >= 50000) {
      score += 25;
      factors.push({ factor: "High Value Opportunity ($50k+)", scoreDelta: +25, reason: `Estimated tender value ${val.toLocaleString()}` });
    } else if (val >= 20000) {
      score += 15;
      factors.push({ factor: "Commercial Value Band ($20k+)", scoreDelta: +15, reason: `Estimated value ${val.toLocaleString()}` });
    } else if (val > 0) {
      score += 8;
      factors.push({ factor: "Defined Budget", scoreDelta: +8, reason: `Estimated budget ${val.toLocaleString()}` });
    }

    // 3. Urgency & Timeline
    if (lead.urgency === "Immediate") {
      score += 15;
      factors.push({ factor: "Immediate Timeline", scoreDelta: +15, reason: "Active funding / urgent procurement" });
    } else if (lead.urgency === "Within 1 Month") {
      score += 10;
      factors.push({ factor: "Near-Term Timeline", scoreDelta: +10, reason: "Project closing within 30 days" });
    }

    // 4. Completeness of contact info
    const hasEmail = Boolean(lead.contactEmail && lead.contactEmail.includes("@"));
    const hasPhone = Boolean(lead.contactPhone && lead.contactPhone.length >= 8);
    if (hasEmail && hasPhone) {
      score += 10;
      factors.push({ factor: "Complete Contact Details", scoreDelta: +10, reason: "Direct email & telephone provided" });
    } else if (hasEmail || hasPhone) {
      score += 5;
      factors.push({ factor: "Partial Contact Info", scoreDelta: +5, reason: "Single communication channel provided" });
    }

    // Sanity clamp 0-100
    score = Math.min(100, Math.max(0, score));

    let rating: "Hot" | "Warm" | "Developing" | "Low Priority" = "Developing";
    if (score >= 80) rating = "Hot";
    else if (score >= 60) rating = "Warm";
    else if (score < 40) rating = "Low Priority";

    return { score, rating, factors };
  }

  /**
   * Helper: calculate days between two YYYY-MM-DD dates
   */
  private static daysBetween(startDate: string, endDate: string): number {
    try {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }
}
