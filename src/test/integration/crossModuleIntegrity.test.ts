import { describe, it, expect } from 'vitest';
import { INITIAL_ACCOUNTS, INITIAL_OPPORTUNITIES, DEFAULT_PIPELINES } from '../../data/crmMockData';
import { CRMIntelligenceEngine } from '../../utils/crmIntelligence';

describe('Cross-Module System Integrity & Seams', () => {
  it('verifies every CRM deal resolves to an existing account', () => {
    const accountIds = new Set(INITIAL_ACCOUNTS.map((a) => a.id));
    for (const deal of INITIAL_OPPORTUNITIES) {
      expect(accountIds.has(deal.accountId)).toBe(true);
    }
  });

  it('verifies every CRM deal resolves to a valid pipeline and stage', () => {
    const pipelineMap = new Map(DEFAULT_PIPELINES.map((p) => [p.id, new Set(p.stages.map((s) => s.id))]));

    for (const deal of INITIAL_OPPORTUNITIES) {
      expect(pipelineMap.has(deal.pipelineId)).toBe(true);
      const stageSet = pipelineMap.get(deal.pipelineId)!;
      expect(stageSet.has(deal.stageId)).toBe(true);
    }
  });

  it('verifies dynamic lead scoring calculates scores across diverse parameters', () => {
    const councilLead = {
      company: 'City of Gold Coast Council',
      estimatedValue: 75000,
      urgency: 'Immediate' as const,
      contactEmail: 'engineer@goldcoast.qld.gov.au',
      contactPhone: '0412 345 678'
    };
    const scoredCouncil = CRMIntelligenceEngine.calculateLeadScore(councilLead);
    expect(scoredCouncil.score).toBeGreaterThanOrEqual(80);
    expect(scoredCouncil.rating).toBe('Hot');

    const lowLead = {
      company: '',
      estimatedValue: 0,
      urgency: 'Budgetary / Exploratory' as const
    };
    const scoredLow = CRMIntelligenceEngine.calculateLeadScore(lowLead);
    expect(scoredLow.score).toBeLessThan(50);
    expect(scoredLow.rating).not.toBe('Hot');
  });
});
