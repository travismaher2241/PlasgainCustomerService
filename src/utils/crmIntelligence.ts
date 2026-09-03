import {
  Account,
  CRMOpportunity,
  CRMLead,
  CRMTask,
  CRMActivity,
  NextBestActionItem,
  DealHealthRating
} from "../types/crm";

export class CRMIntelligenceEngine {
  /**
   * Calculate Next Best Actions across all Accounts, Deals, Leads, and Tasks
   */
  static generateNextBestActions(
    accounts: Account[],
    deals: CRMOpportunity[],
    leads: CRMLead[],
    tasks: CRMTask[],
    _activities: CRMActivity[]
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
              defaultNotes: `Checking if ${deal.primaryContactName || "client"} had any questions on the luminaire selection and freight.`
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
              defaultTitle: `Set next step for ${deal.name}`
            }
          });
        }
      }
    });

    // Rule 3: High Value Opportunities ($50k+) with Stalled Stage (> 14 days)
    deals.forEach((deal) => {
      if (deal.dealValue >= 50000 && deal.daysInCurrentStage >= 14 && deal.stageId !== "stage-won" && deal.stageId !== "stage-lost") {
        actions.push({
          id: `nba-stalled-${deal.id}`,
          ruleId: "RULE_STALLED_HIGH_VALUE",
          title: `Re-energise High Value Stalled Deal ($${deal.dealValue.toLocaleString()})`,
          description: `Opportunity has remained in ${deal.stageName} for ${deal.daysInCurrentStage} days without stage progression.`,
          reason: `High value infrastructure deals risk losing project budget if not actively championed with council or head contractors.`,
          urgency: "Today",
          category: "Stalled Deal",
          relatedEntityType: "Opportunity",
          relatedEntityId: deal.id,
          relatedEntityName: deal.name,
          actionLabel: "Review & Re-engage",
          actionPayload: {
            type: "schedule_meeting",
            defaultTitle: `Strategy review for ${deal.name}`
          }
        });
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
              defaultTitle: `Initial qualification call with ${lead.contactName}`
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
            type: "create_task"
          }
        });
      }
    });

    return actions;
  }

  /**
   * Evaluate Deal Health Rating
   */
  static evaluateDealHealth(deal: CRMOpportunity, todayStr: string = new Date().toISOString().split("T")[0]): {
    rating: DealHealthRating;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskPoints = 0;

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
      return { rating: "At Risk", reasons };
    }
    if (riskPoints >= 3) {
      return { rating: "Needs Attention", reasons };
    }
    if (deal.daysInCurrentStage > 18) {
      return { rating: "Stalled", reasons };
    }
    return {
      rating: "Healthy",
      reasons: reasons.length > 0 ? reasons : ["Recent activity logged", "Clear next action scheduled", "Healthy stage velocity"]
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
