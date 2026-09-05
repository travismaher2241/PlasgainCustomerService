import { describe, it, expect } from "vitest";
import { evaluateDealSilenceRisk, CRMIntelligenceEngine } from "../../utils/crmIntelligence";
import { CRMOpportunity, Account, CompetitorPricingRecord, CRMActivity } from "../../types/crm";

describe("Deal Silence Risk & Reason Diagnosis (Feature 05)", () => {
  const councilAccount: Account = {
    id: "acc-council",
    name: "City of Greater Geelong",
    accountType: "Council",
    status: "Customer",
    customerRelationshipStatus: "Active",
    territory: "VIC/TAS",
    accountOwner: "Marcus Vance",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z"
  };

  const contractorAccount: Account = {
    id: "acc-contractor",
    name: "Downer EDI Civil Infrastructure",
    accountType: "Contractor",
    status: "Customer",
    customerRelationshipStatus: "Active",
    territory: "QLD/NT",
    accountOwner: "Travis Maher",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z"
  };

  const highValueCouncilDeal: CRMOpportunity = {
    id: "deal-council-1",
    name: "Eastern Beach Foreshore Solar Path Lighting",
    accountId: "acc-council",
    accountName: "City of Greater Geelong",
    stageId: "stage-quote",
    stageName: "Quote / Proposal Sent",
    dealValue: 145000,
    quoteStatus: "Sent",
    quoteNumber: "Q-2026-8821",
    quoteSentDate: "2026-08-15",
    latestActivityDate: "2026-08-15",
    daysInCurrentStage: 16
  };

  const contractorDeal: CRMOpportunity = {
    id: "deal-contractor-1",
    name: "Bruce Highway Upgrade Lighting Package",
    accountId: "acc-contractor",
    accountName: "Downer EDI Civil Infrastructure",
    stageId: "stage-quote",
    stageName: "Quote / Proposal Sent",
    dealValue: 62000,
    quoteStatus: "Sent",
    quoteNumber: "Q-2026-9104",
    quoteSentDate: "2026-08-22",
    latestActivityDate: "2026-08-22",
    daysInCurrentStage: 9
  };

  it("diagnoses Council procurement silence with monthly committee context and compliance offer", () => {
    const evalResult = evaluateDealSilenceRisk(highValueCouncilDeal, {
      account: councilAccount,
      todayStr: "2026-08-28" // 13 days since quote
    });

    expect(evalResult.isSilent).toBe(true);
    expect(evalResult.daysSilent).toBe(13);
    expect(evalResult.riskLevel).toBe("Critical");
    expect(evalResult.reasonCategory).toBe("Council Tender Window");
    expect(evalResult.diagnosis).toContain("Council Procurement Silence");
    expect(evalResult.diagnosis).toContain("145,000");
    expect(evalResult.diagnosis).toContain("monthly schedules");

    // Re-engagement action offers compliance submittal
    expect(evalResult.recommendedAction.actionLabel).toBe("Offer Council Compliance Submittal");
    expect(evalResult.recommendedAction.actionType).toBe("send_email");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("AS/NZS 1158");
  });

  it("diagnoses Contractor tender closing risk with tight award window and spec confirmation", () => {
    const evalResult = evaluateDealSilenceRisk(contractorDeal, {
      account: contractorAccount,
      todayStr: "2026-08-30" // 8 days since quote
    });

    expect(evalResult.isSilent).toBe(true);
    expect(evalResult.daysSilent).toBe(8);
    expect(evalResult.riskLevel).toBe("Critical");
    expect(evalResult.reasonCategory).toBe("Contractor Tender Closing");
    expect(evalResult.diagnosis).toContain("Contractor Tender Closing Risk");
    expect(evalResult.diagnosis).toContain("62,000");
    expect(evalResult.diagnosis).toContain("7–14 days");

    // Re-engagement action calls contractor
    expect(evalResult.recommendedAction.actionLabel).toBe("Call Contractor to Lock Spec");
    expect(evalResult.recommendedAction.actionType).toBe("log_call");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("factory manufacturing slot");
  });

  it("detects acute competitor presence and prioritizes counter-positioning defense", () => {
    const competitorPricing: CompetitorPricingRecord[] = [
      {
        id: "comp-replas-1",
        accountId: "acc-council",
        accountName: "City of Greater Geelong",
        opportunityId: "deal-council-1",
        competitorName: "Replas",
        competitorProduct: "Recycled Plastic Post",
        price: 132000,
        plasgainQuotedPrice: 145000,
        currency: "AUD",
        priceBasis: "Project Lot",
        gstStatus: "Ex GST",
        sourceType: "Tender Debrief",
        observedDate: "2026-08-18",
        status: "Active",
        createdBy: "Marcus Vance",
        createdAt: "2026-08-18T00:00:00Z",
        updatedAt: "2026-08-18T00:00:00Z"
      }
    ];

    const evalResult = evaluateDealSilenceRisk(highValueCouncilDeal, {
      account: councilAccount,
      competitorPricing,
      todayStr: "2026-08-25" // 10 days silent
    });

    expect(evalResult.isSilent).toBe(true);
    expect(evalResult.riskLevel).toBe("Critical");
    expect(evalResult.reasonCategory).toBe("Competitor Presence");
    expect(evalResult.diagnosis).toContain("Active Competitor Risk: Replas");
    expect(evalResult.diagnosis).toContain("132,000");
    expect(evalResult.diagnosis).toContain("IK10 durability");

    // Generates competitor defense email
    expect(evalResult.recommendedAction.actionLabel).toBe("Send Competitor Defense Email");
    expect(evalResult.recommendedAction.actionType).toBe("send_email");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("IK10 vandal resistance");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("50-year maintenance-free");
  });

  it("generates intelligent Next Best Actions incorporating silence diagnosis", () => {
    const actions = CRMIntelligenceEngine.generateNextBestActions(
      [councilAccount],
      [highValueCouncilDeal],
      [],
      [],
      [],
      []
    );

    const stalledAction = actions.find((a) => a.ruleId === "RULE_STALLED_HIGH_VALUE");
    expect(stalledAction).toBeDefined();
    expect(stalledAction?.title).toContain("Re-energise High Value Stalled Deal ($145,000)");
    expect(stalledAction?.category).toBe("Deal Silence Risk");
    expect(stalledAction?.description).toContain("Council Procurement Silence");
  });
});
