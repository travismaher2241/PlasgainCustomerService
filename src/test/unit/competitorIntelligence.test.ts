import { describe, it, expect } from "vitest";
import { computeCompetitorIntelligence } from "../../utils/competitorIntelligence";
import { CompetitorPricingRecord } from "../../types/crm";

describe("Competitor Intelligence Engine (Feature 06)", () => {
  const sampleRecords: CompetitorPricingRecord[] = [
    {
      id: "comp-1",
      accountId: "acc-1",
      accountName: "Moreton Bay Regional Council",
      competitorName: "Replas",
      competitorProduct: "Recycled Plastic Bollard 150mm",
      price: 184,
      plasgainQuotedPrice: 200, // Replas is 8% cheaper
      currency: "AUD",
      priceBasis: "Per Unit",
      gstStatus: "Ex GST",
      sourceType: "Tender Debrief",
      observedDate: "2026-08-15",
      status: "Active",
      createdBy: "Travis Maher",
      createdAt: "2026-08-15T00:00:00Z",
      updatedAt: "2026-08-15T00:00:00Z"
    },
    {
      id: "comp-2",
      accountId: "acc-2",
      accountName: "Sunshine Coast Council",
      competitorName: "Replas",
      competitorProduct: "Recycled Plastic Bollard 125mm",
      price: 162,
      plasgainQuotedPrice: 180, // Replas is 10% cheaper
      currency: "AUD",
      priceBasis: "Per Unit",
      gstStatus: "Ex GST",
      sourceType: "Customer Verbal",
      observedDate: "2026-08-20",
      status: "Active",
      createdBy: "Travis Maher",
      createdAt: "2026-08-20T00:00:00Z",
      updatedAt: "2026-08-20T00:00:00Z"
    },
    {
      id: "comp-3",
      accountId: "acc-3",
      accountName: "Downer EDI Civil",
      competitorName: "EnviroPole",
      competitorProduct: "Composite Light Pole 6m",
      price: 2400,
      plasgainQuotedPrice: 2200, // EnviroPole is ~9.1% more expensive
      currency: "AUD",
      priceBasis: "Per Unit",
      gstStatus: "Ex GST",
      sourceType: "Competitor Proposal",
      observedDate: "2026-09-01",
      status: "Active",
      createdBy: "Travis Maher",
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z"
    }
  ];

  it("calculates encounter rates and price variance accurately across deals", () => {
    const intel = computeCompetitorIntelligence(sampleRecords);

    expect(intel.totalRecords).toBe(3);
    expect(intel.activeRecords).toBe(3);
    expect(intel.uniqueCompetitorsCount).toBe(2);

    const replasBreakdown = intel.competitorBreakdown.find((c) => c.competitorName === "Replas");
    expect(replasBreakdown).toBeDefined();
    expect(replasBreakdown?.count).toBe(2);
    expect(replasBreakdown?.encounterRatePercent).toBe(67); // 2 out of 3 = 67%
    expect(replasBreakdown?.avgVariancePercent).toBe(-9); // (-8% + -10%) / 2 = -9%

    const enviroBreakdown = intel.competitorBreakdown.find((c) => c.competitorName === "EnviroPole");
    expect(enviroBreakdown).toBeDefined();
    expect(enviroBreakdown?.count).toBe(1);
    expect(enviroBreakdown?.encounterRatePercent).toBe(33);
    expect(enviroBreakdown?.avgVariancePercent).toBeGreaterThan(8);
  });

  it("synthesizes actionable market takeaways and battlecards for sales reps", () => {
    const intel = computeCompetitorIntelligence(sampleRecords);

    // Replas is top competitor, should highlight -9% variance and TCO / IK10 angle
    expect(intel.marketTakeaway).toContain("Replas");
    expect(intel.marketTakeaway).toContain("IK10 durability");
    expect(intel.marketTakeaway).toContain("50-year TCO");

    // Check Replas battlecard
    const replasCard = intel.battlecards.find((b) => b.competitorName === "Replas");
    expect(replasCard).toBeDefined();
    expect(replasCard?.positioningBattlecard.plasgainDifferentiators.length).toBeGreaterThanOrEqual(3);
    expect(replasCard?.positioningBattlecard.plasgainDifferentiators.some((d) => d.includes("IK10"))).toBe(true);
    expect(replasCard?.positioningBattlecard.plasgainDifferentiators.some((d) => d.includes("Zero Thermal Sagging"))).toBe(true);

    // Check objection handling
    const objections = replasCard?.positioningBattlecard.objectionHandling;
    expect(objections && objections.length > 0).toBe(true);
    expect(objections![0].objection.toLowerCase()).toContain("cheaper");
    expect(objections![0].counterResponse.toLowerCase()).toContain("thermal creep");
  });

  it("gracefully handles empty records without crashing", () => {
    const emptyIntel = computeCompetitorIntelligence([]);
    expect(emptyIntel.totalRecords).toBe(0);
    expect(emptyIntel.competitorBreakdown.length).toBe(0);
    expect(emptyIntel.battlecards.length).toBe(0);
    expect(emptyIntel.marketTakeaway).toContain("No competitor pricing records");
  });
});
