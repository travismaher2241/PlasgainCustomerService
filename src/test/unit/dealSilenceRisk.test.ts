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
    accountType: "Customer",
    customerSegment: "Civil Contractor",
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

    // Re-engagement asks what the committee needs rather than offering
    // compliance work the app cannot back.
    expect(evalResult.recommendedAction.actionLabel).toBe("Ask What the Committee Needs");
    expect(evalResult.recommendedAction.actionType).toBe("send_email");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("what documentation the council committee needs");
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
    expect(evalResult.recommendedAction.actionLabel).toBe("Call Contractor to Confirm Award");
    expect(evalResult.recommendedAction.actionType).toBe("log_call");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("manufacturing slot");
  });

  it("classifies a contractor from its segment when the company name gives nothing away", () => {
    // The existing contractor fixture is named "Downer EDI Civil Infrastructure",
    // so it matches the name regex and passes whether or not the segment check
    // works - which is how a permanently-false accountType comparison survived
    // here unnoticed. This account's name contains none of the trigger words,
    // so only the segment can classify it.
    const quietlyNamedContractor: Account = {
      id: "acc-hansen",
      name: "Hansen Yuncken Group",
      accountType: "Customer",
      customerSegment: "Civil Contractor",
      status: "Customer",
      customerRelationshipStatus: "Active",
      territory: "QLD/NT",
      accountOwner: "Travis Maher",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z"
    };

    const deal: CRMOpportunity = {
      id: "deal-hansen-1",
      name: "Bruce Highway Stage 4 Lighting Package",
      accountId: "acc-hansen",
      accountName: "Hansen Yuncken Group",
      stageId: "stage-quote",
      stageName: "Quote / Proposal Sent",
      dealValue: 62000,
      quoteStatus: "Sent",
      quoteNumber: "Q-2026-9411",
      quoteSentDate: "2026-08-22",
      latestActivityDate: "2026-08-22",
      daysInCurrentStage: 9
    };

    const evalResult = evaluateDealSilenceRisk(deal, {
      account: quietlyNamedContractor,
      todayStr: "2026-08-30" // 8 days since quote
    });

    expect(evalResult.reasonCategory).toBe("Contractor Tender Closing");
    expect(evalResult.recommendedAction.actionLabel).toBe("Call Contractor to Confirm Award");
  });

  it("does not treat an unsegmented, plainly named account as a contractor", () => {
    const plainAccount: Account = {
      id: "acc-plain",
      name: "Hansen Yuncken Group",
      accountType: "Customer",
      status: "Customer",
      customerRelationshipStatus: "Active",
      territory: "QLD/NT",
      accountOwner: "Travis Maher",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z"
    };

    const deal: CRMOpportunity = {
      id: "deal-plain-1",
      name: "Bruce Highway Stage 4 Lighting Package",
      accountId: "acc-plain",
      accountName: "Hansen Yuncken Group",
      stageId: "stage-quote",
      stageName: "Quote / Proposal Sent",
      dealValue: 20000,
      quoteStatus: "Sent",
      quoteSentDate: "2026-08-22",
      latestActivityDate: "2026-08-22",
      daysInCurrentStage: 9
    };

    const evalResult = evaluateDealSilenceRisk(deal, {
      account: plainAccount,
      todayStr: "2026-08-30"
    });

    expect(evalResult.reasonCategory).not.toBe("Contractor Tender Closing");
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
        priceBasis: "Project Total",
        gstStatus: "Ex GST",
        sourceType: "Tender Schedule",
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
    expect(evalResult.diagnosis).toContain("whole-of-life cost");

    // Generates competitor defense email positioned on commercial ground
    expect(evalResult.recommendedAction.actionLabel).toBe("Send Competitor Defense Email");
    expect(evalResult.recommendedAction.actionType).toBe("send_email");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("whole-of-life cost");
    expect(evalResult.recommendedAction.suggestedNotes).toContain("local support");
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
    expect(stalledAction?.title).toMatch(/Re-energise High Value Stalled (Deal|Quote) \(\$145,000\)/);
    expect(stalledAction?.category).toBe("Deal Silence Risk");
    expect(stalledAction?.description).toContain("Council Procurement Silence");
  });
});
