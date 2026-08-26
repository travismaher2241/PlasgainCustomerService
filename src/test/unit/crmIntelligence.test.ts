import { describe, it, expect } from 'vitest';
import { CRMIntelligenceEngine } from '../../utils/crmIntelligence';
import { Account, CRMOpportunity, CRMLead, CRMTask } from '../../types/crm';

describe('CRMIntelligenceEngine', () => {
  const mockAccount: Account = {
    id: 'acc-1',
    name: 'City of Greater Geelong',
    status: 'Customer',
    industry: 'Local Government',
    customerSegment: 'Local Government / Council',
    territory: 'VIC/TAS',
    accountOwner: 'Marcus Vance',
    leadSource: 'Council Tender',
    createdDate: '2026-01-01',
    lastInteractionDate: '2026-08-20',
    nextAction: 'Follow up with Sarah',
    nextActionDate: '2026-08-30',
    relationshipHealth: 'Healthy',
    tags: ['Council', 'Solar']
  };

  const mockDeal: CRMOpportunity = {
    id: 'deal-1',
    name: 'Eastern Beach Foreshore Path',
    accountId: 'acc-1',
    accountName: 'City of Greater Geelong',
    primaryContactId: 'con-1',
    primaryContactName: 'Sarah Jenkins',
    opportunityOwner: 'Marcus Vance',
    pipelineId: 'pipe-solar',
    stageId: 'stage-quote',
    stageName: 'Quote / Proposal Sent',
    dealValue: 65000,
    weightedValue: 39000,
    probability: 60,
    forecastCategory: 'Likely',
    expectedCloseDate: '2026-09-30',
    products: [],
    projectApplication: 'Foreshore Reserve',
    location: 'Geelong, VIC',
    customerNeed: 'Solar lighting upgrade',
    keyRequirements: ['3000K CCT', 'IK10'],
    source: 'Tender Portal',
    quoteStatus: 'Sent',
    quoteNumber: 'Q-2026-892',
    quoteSentDate: '2026-08-10',
    latestActivity: 'Quote sent',
    latestActivityDate: '2026-08-10',
    nextAction: 'Follow up quote with Sarah',
    nextActionDate: '2026-08-25',
    daysInCurrentStage: 16,
    totalDealAgeDays: 25,
    dealHealth: 'Needs Attention',
    dealHealthReasons: ['Quote sent > 3 days ago'],
    notes: 'Important council project'
  };

  const mockLead: CRMLead = {
    id: 'lead-1',
    leadName: 'Moreton Bay Shared Trail',
    contactName: 'James Wilson',
    contactEmail: 'jwilson@moretonbay.qld.gov.au',
    company: 'Moreton Bay Regional Council',
    source: 'Web Form',
    enquiryType: 'Solar Pathway Lighting',
    productInterest: ['Intense 50W'],
    estimatedValue: 45000,
    assignedSalesperson: 'Marcus Vance',
    leadStatus: 'New',
    leadScore: 85,
    leadScoreRating: 'Hot',
    scoringFactors: [{ factor: 'Direct Inbound', scoreDelta: 30, reason: 'Website Form' }],
    urgency: 'Within 1 Month',
    location: 'QLD',
    notes: 'Needs 25 solar lights',
    dateReceived: '2026-08-25',
    lastActivity: 'Lead received',
    lastActivityDate: '2026-08-25',
    nextAction: 'Call lead',
    nextActionDate: '2026-08-26'
  };

  const mockTask: CRMTask = {
    id: 'task-1',
    title: 'Call Rob Mitchell to confirm Dialux spec',
    type: 'Call',
    status: 'To Do',
    priority: 'High',
    dueDate: '2026-08-20',
    assignedTo: 'Marcus Vance',
    createdBy: 'Marcus Vance'
  };

  describe('generateNextBestActions', () => {
    it('should generate follow-up action for un-followed quotes sent > 3 days ago', () => {
      const actions = CRMIntelligenceEngine.generateNextBestActions([mockAccount], [mockDeal], [], [], []);
      const quoteAction = actions.find(a => a.ruleId === 'RULE_QUOTE_FOLLOWUP');
      expect(quoteAction).toBeDefined();
      expect(quoteAction?.relatedEntityId).toBe('deal-1');
      expect(quoteAction?.actionLabel).toBe('Draft Follow-Up Email');
    });

    it('should identify high value stalled opportunities (>= $50k in stage >= 14 days)', () => {
      const actions = CRMIntelligenceEngine.generateNextBestActions([mockAccount], [mockDeal], [], [], []);
      const stalledAction = actions.find(a => a.ruleId === 'RULE_STALLED_HIGH_VALUE');
      expect(stalledAction).toBeDefined();
      expect(stalledAction?.title).toContain('Re-energise High Value Stalled Deal');
    });

    it('should flag hot leads with score >= 75 awaiting initial contact', () => {
      const actions = CRMIntelligenceEngine.generateNextBestActions([], [], [mockLead], [], []);
      const hotLeadAction = actions.find(a => a.ruleId === 'RULE_HOT_LEAD_RESPONSE');
      expect(hotLeadAction).toBeDefined();
      expect(hotLeadAction?.title).toContain('Contact Hot Lead: Moreton Bay Shared Trail');
      expect(hotLeadAction?.actionLabel).toBe('Call Lead Now');
    });

    it('should trigger immediate actions for overdue tasks', () => {
      const actions = CRMIntelligenceEngine.generateNextBestActions([], [], [], [mockTask], []);
      const overdueAction = actions.find(a => a.ruleId === 'RULE_OVERDUE_TASK');
      expect(overdueAction).toBeDefined();
      expect(overdueAction?.urgency).toBe('Immediate');
    });
  });

  describe('evaluateDealHealth', () => {
    it('should evaluate a fresh, active deal as Healthy', () => {
      const freshDeal: CRMOpportunity = {
        ...mockDeal,
        daysInCurrentStage: 3,
        latestActivityDate: '2026-08-26',
        nextActionDate: '2026-08-29',
        quoteSentDate: undefined,
        quoteStatus: 'Draft'
      };
      const result = CRMIntelligenceEngine.evaluateDealHealth(freshDeal, '2026-08-26');
      expect(result.rating).toBe('Healthy');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should evaluate a deal with passed close date and no next action as At Risk', () => {
      const riskyDeal: CRMOpportunity = {
        ...mockDeal,
        expectedCloseDate: '2026-08-01',
        nextAction: '',
        daysInCurrentStage: 25,
        latestActivityDate: '2026-07-15'
      };
      const result = CRMIntelligenceEngine.evaluateDealHealth(riskyDeal, '2026-08-26');
      expect(result.rating).toBe('At Risk');
      expect(result.reasons.some(r => r.includes('passed'))).toBe(true);
    });
  });

  describe('evaluateAccountHealth', () => {
    it('should evaluate active engaged account as Strong or Healthy', () => {
      const result = CRMIntelligenceEngine.evaluateAccountHealth(
        mockAccount,
        [mockDeal],
        [
          { id: 'act-1', type: 'call', title: 'Call with Sarah', description: 'Review specs', accountId: 'acc-1', performedBy: 'Marcus', timestamp: '2026-08-24' },
          { id: 'act-2', type: 'email', title: 'Sent Dialux', description: 'Photometrics', accountId: 'acc-1', performedBy: 'Marcus', timestamp: '2026-08-22' }
        ],
        '2026-08-26'
      );
      expect(['Strong', 'Healthy']).toContain(result.health);
    });

    it('should evaluate disengaged account (>45 days inactivity) as At Risk', () => {
      const disengagedAccount: Account = {
        ...mockAccount,
        lastInteractionDate: '2026-06-01',
        nextAction: ''
      };
      const result = CRMIntelligenceEngine.evaluateAccountHealth(disengagedAccount, [], [], '2026-08-26');
      expect(result.health).toBe('At Risk');
    });
  });
});
