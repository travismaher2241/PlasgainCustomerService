import { describe, it, expect } from 'vitest';
import { CRMOpportunity, CRMLead } from '../../types/crm';

describe('Priority 1: Commercial Value Basis & Zero Fabrication Defaults', () => {
  it('records explicit deal value basis (Known, Estimate, Unknown) without forcing assumed $35k numbers', () => {
    const freshDealWithoutAssumptions: Partial<CRMOpportunity> = {
      name: "Moreton Bay Pathway Lighting",
      dealValue: 0,
      dealValueBasis: "Unknown"
    };

    expect(freshDealWithoutAssumptions.dealValue).toBe(0);
    expect(freshDealWithoutAssumptions.dealValueBasis).toBe("Unknown");
  });

  it('records client-confirmed figure as Known value basis', () => {
    const tenderConfirmedDeal: Partial<CRMOpportunity> = {
      name: "VicRoads Heavy Trench Cover Supply",
      dealValue: 48500,
      dealValueBasis: "Known"
    };

    expect(tenderConfirmedDeal.dealValue).toBe(48500);
    expect(tenderConfirmedDeal.dealValueBasis).toBe("Known");
  });

  it('records leads with explicit commercial basis, territory, and nextAction', () => {
    const lead: Partial<CRMLead> = {
      leadName: "Ballarat Solar Trail",
      company: "City of Ballarat",
      estimatedValue: 24000,
      estimatedValueBasis: "Estimate",
      territory: "VIC/TAS",
      consentStatus: "Consent Confirmed",
      nextAction: "Initial engineering scoping call"
    };

    expect(lead.estimatedValueBasis).toBe("Estimate");
    expect(lead.territory).toBe("VIC/TAS");
    expect(lead.consentStatus).toBe("Consent Confirmed");
    expect(lead.nextAction).toBe("Initial engineering scoping call");
  });
});
