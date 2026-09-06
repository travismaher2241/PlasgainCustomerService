import { describe, it, expect } from "vitest";
import {
  computeWinLossPatterns,
  buildClosedDealFacts,
  MIN_TOTAL_CLOSED,
  MIN_GROUP_SIZE
} from "../../utils/winLossPatterns";
import { CRMOpportunity, CRMActivity, Account } from "../../types/crm";

let seq = 0;

function deal(overrides: Partial<CRMOpportunity>): CRMOpportunity {
  seq += 1;
  return {
    id: `deal-${seq}`,
    name: `Lighting package ${seq}`,
    accountId: `acc-${seq}`,
    accountName: "Generic Buyer Pty Ltd",
    stageId: "stage-won",
    stageName: "Closed Won",
    dealValue: 50000,
    ...overrides
  };
}

/** n closed deals, the first `wins` of which are won. */
function closedRun(n: number, wins: number, overrides: Partial<CRMOpportunity> = {}): CRMOpportunity[] {
  return Array.from({ length: n }, (_, i) =>
    deal({
      ...overrides,
      stageId: i < wins ? "stage-won" : "stage-lost",
      stageName: i < wins ? "Closed Won" : "Closed Lost",
      lostReason: i < wins ? undefined : "Price"
    })
  );
}

describe("Win / Loss Pattern Learning (Feature 04)", () => {
  it("reports no comparative findings until there is enough closed history", () => {
    const summary = computeWinLossPatterns(closedRun(6, 3));

    expect(summary.closedDealCount).toBe(6);
    expect(summary.hasEnoughHistory).toBe(false);
    expect(summary.findings).toEqual([]);
    expect(summary.dataNote).toContain(String(MIN_TOTAL_CLOSED));
  });

  it("still reports the plain win rate and loss reasons on thin history", () => {
    // A tally has no denominator to mislead with, so it is safe from record one.
    const summary = computeWinLossPatterns(closedRun(4, 1));

    expect(summary.wonCount).toBe(1);
    expect(summary.lostCount).toBe(3);
    expect(summary.overallWinRatePercent).toBe(25);
    expect(summary.lossReasons[0]).toMatchObject({ reason: "Price", count: 3, sharePercent: 100 });
  });

  it("refuses a split where one side is below the minimum group size", () => {
    // 20 council deals against 2 contractor deals: plenty of total history, but
    // the contractor side cannot support a claim.
    const deals = [
      ...closedRun(20, 16, { accountName: "Wyndham City Council" }),
      ...closedRun(2, 0, { accountName: "Downer EDI Civil" })
    ];

    const summary = computeWinLossPatterns(deals);

    expect(summary.hasEnoughHistory).toBe(true);
    expect(summary.findings.find((f) => f.id === "segment")).toBeUndefined();
  });

  it("refuses a split whose gap is inside the noise threshold", () => {
    const deals = [
      ...closedRun(10, 5, { accountName: "Wyndham City Council" }), // 50%
      ...closedRun(10, 5, { accountName: "Downer EDI Civil" }) // 50%, gap of 0
    ];

    const summary = computeWinLossPatterns(deals);
    expect(summary.findings.find((f) => f.id === "segment")).toBeUndefined();
  });

  it("reports a segment finding when both sides are large enough and clearly differ", () => {
    const deals = [
      ...closedRun(10, 9, { accountName: "Wyndham City Council" }), // 90%
      ...closedRun(10, 2, { accountName: "Downer EDI Civil" }) // 20%
    ];

    const summary = computeWinLossPatterns(deals);
    const finding = summary.findings.find((f) => f.id === "segment");

    expect(finding).toBeDefined();
    expect(finding!.headline).toMatch(/Councils close 70 percentage points more often/i);
    expect(finding!.detail).toContain("9 of 10 won (90%)");
    expect(finding!.detail).toContain("2 of 10 won (20%)");
    expect(finding!.gapPercentagePoints).toBe(70);
  });

  it("grades confidence by the smaller side of the comparison", () => {
    const thin = computeWinLossPatterns([
      ...closedRun(MIN_GROUP_SIZE, MIN_GROUP_SIZE, { accountName: "Wyndham City Council" }),
      ...closedRun(10, 1, { accountName: "Downer EDI Civil" })
    ]);
    expect(thin.findings.find((f) => f.id === "segment")!.confidence).toBe("Indicative");

    const thick = computeWinLossPatterns([
      ...closedRun(20, 18, { accountName: "Wyndham City Council" }),
      ...closedRun(20, 3, { accountName: "Downer EDI Civil" })
    ]);
    expect(thick.findings.find((f) => f.id === "segment")!.confidence).toBe("Reasonable");
  });

  it("derives follow-up speed from the first activity after the quote went out", () => {
    const quick = deal({
      id: "deal-quick",
      quoteSentDate: "2026-08-01",
      stageId: "stage-won",
      stageName: "Closed Won"
    });
    const slow = deal({
      id: "deal-slow",
      quoteSentDate: "2026-08-01",
      stageId: "stage-lost",
      stageName: "Closed Lost"
    });

    const activities: CRMActivity[] = [
      {
        id: "act-1",
        type: "call",
        title: "Follow-up call",
        opportunityId: "deal-quick",
        timestamp: "2026-08-03T02:00:00Z",
        performedBy: "Travis Maher"
      },
      // Predates the quote, so it must not be counted as the follow-up.
      {
        id: "act-0",
        type: "call",
        title: "Scoping call",
        opportunityId: "deal-slow",
        timestamp: "2026-07-20T02:00:00Z",
        performedBy: "Travis Maher"
      },
      {
        id: "act-2",
        type: "call",
        title: "Late follow-up call",
        opportunityId: "deal-slow",
        timestamp: "2026-08-14T02:00:00Z",
        performedBy: "Travis Maher"
      }
    ] as CRMActivity[];

    const facts = buildClosedDealFacts([quick, slow], activities);

    expect(facts.find((f) => f.dealId === "deal-quick")!.daysToFirstFollowUp).toBe(2);
    expect(facts.find((f) => f.dealId === "deal-slow")!.daysToFirstFollowUp).toBe(13);
  });

  it("detects a site visit and classifies segment from the account record", () => {
    const councilAccount: Account = {
      id: "acc-seg",
      name: "Hansen Yuncken Group",
      accountType: "Customer",
      customerSegment: "Local Government / Council",
      status: "Customer",
      customerRelationshipStatus: "Active",
      territory: "VIC/TAS",
      accountOwner: "Travis Maher",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z"
    };

    const d = deal({ id: "deal-seg", accountId: "acc-seg", accountName: "Hansen Yuncken Group" });
    const activities = [
      {
        id: "act-v",
        type: "site_visit",
        title: "Walked the alignment",
        opportunityId: "deal-seg",
        timestamp: "2026-08-05T00:00:00Z",
        performedBy: "Travis Maher"
      }
    ] as CRMActivity[];

    const [fact] = buildClosedDealFacts([d], activities, [councilAccount]);

    // The name matches neither pattern, so only the segment field can classify it.
    expect(fact.segment).toBe("Council");
    expect(fact.hadSiteVisit).toBe(true);
  });

  it("ignores deals that are still open", () => {
    const open = deal({ stageId: "stage-quote", stageName: "Quote / Proposal Sent", quoteStatus: "Sent" });
    const summary = computeWinLossPatterns([open, ...closedRun(3, 2)]);

    expect(summary.closedDealCount).toBe(3);
  });

  it("returns an honest empty summary with no deals at all", () => {
    const summary = computeWinLossPatterns([]);

    expect(summary.closedDealCount).toBe(0);
    expect(summary.overallWinRatePercent).toBe(0);
    expect(summary.findings).toEqual([]);
    expect(summary.lossReasons).toEqual([]);
    expect(summary.hasEnoughHistory).toBe(false);
  });
});
