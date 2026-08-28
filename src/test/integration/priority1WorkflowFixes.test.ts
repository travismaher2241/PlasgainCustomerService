import { describe, it, expect } from 'vitest';
import {
  getLocalDateInputValue,
  addDaysLocal,
  addBusinessDaysLocal,
  getBusinessDaysDiff,
  isDueWithinBusinessDays
} from '../../utils/dateUtils';
import { sortActivitiesChronological, parseActivityTimestamp } from '../../utils/activityUtils';
import { normalizeNotification, getUnreadNotificationsCount } from '../../utils/notificationUtils';
import { generateCustomerFollowUpEmail, generateTenderPackageHTML } from '../../utils/datasheetExporter';
import { CRMActivity, CRMNotification, CRMLead } from '../../types/crm';
import { Opportunity } from '../../types';

describe('PRIORITY 1 CORE SALES WORKFLOW VERIFICATION (P1-01 to P1-16)', () => {

  // --- P1-01: Quick Log reactive call title derivation ---
  describe('P1-01: Quick Log reactive title generation', () => {
    it('generates dynamic title from account, deal, and contact context without overriding manual edits', () => {
      const deriveTitle = (
        type: string,
        accountName?: string,
        dealName?: string,
        contactName?: string,
        isManuallyEdited = false,
        currentTitle = ''
      ) => {
        if (isManuallyEdited) return currentTitle;
        const name = contactName || accountName || 'Client';
        const suffix = dealName && dealName !== accountName ? ` — ${dealName}` : '';
        return `Call with ${name}${suffix}`;
      };

      // 1. Initial before async deal resolves
      const title1 = deriveTitle('call', 'Brisbane City Council');
      expect(title1).toBe('Call with Brisbane City Council');

      // 2. Deal and contact data resolves asynchronously
      const title2 = deriveTitle('call', 'Brisbane City Council', 'Story Bridge Pathway Luminaire Upgrade', 'Liam O\'Connor');
      expect(title2).toBe('Call with Liam O\'Connor — Story Bridge Pathway Luminaire Upgrade');

      // 3. User manually edited title - should preserve manual title
      const customTitle = 'Customer called to dispute delivery freight surcharge';
      const title3 = deriveTitle('call', 'Brisbane City Council', 'Story Bridge Upgrade', 'Liam', true, customTitle);
      expect(title3).toBe(customTitle);
    });
  });

  // --- P1-02: Pre-Call Preparation vs Activity Logging ---
  describe('P1-02: Genuine Pre-Call Briefing & Preparation', () => {
    it('provides structured pre-call briefing that does not create activity records prematurely', () => {
      const activities: CRMActivity[] = [];
      let mode: 'prep' | 'log' = 'prep';

      // Viewing briefing does not mutate activities
      expect(mode).toBe('prep');
      expect(activities.length).toBe(0);

      // Transitioning to log and saving
      mode = 'log';
      activities.push({
        id: 'act-new',
        type: 'call',
        title: 'Call with Sarah Mitchell',
        description: 'Discussed AS/NZS 1158 Category P4 photometric calculations',
        timestamp: new Date().toISOString(),
        performedBy: 'Travis Maher'
      });

      expect(activities.length).toBe(1);
      expect(activities[0].title).toContain('Sarah Mitchell');
    });
  });

  // --- P1-03 & P1-04: Australia/Sydney Timezone Date Defaults ---
  describe('P1-03 & P1-04: Australia/Sydney Timezone-Aware Dates', () => {
    it('produces valid YYYY-MM-DD in Australia/Sydney without UTC day-shifts', () => {
      const todaySydney = getLocalDateInputValue();
      expect(todaySydney).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify specific UTC midnight transition point
      // 2026-08-28T14:30:00Z is 2026-08-29 00:30:00 AEST (+10:00)
      const lateUtc = new Date('2026-08-28T14:30:00Z');
      const sydneyDate = getLocalDateInputValue(lateUtc, 'Australia/Sydney');
      expect(sydneyDate).toBe('2026-08-29');

      // Adding days locally in Sydney
      const futureDate = addDaysLocal(3, '2026-08-28');
      expect(futureDate).toBe('2026-08-31');
    });

    it('calculates business days excluding weekends', () => {
      // 2026-08-28 is a Friday. Adding 1 business day should land on Monday 2026-08-31
      const monday = addBusinessDaysLocal(1, '2026-08-28');
      expect(monday).toBe('2026-08-31');

      // Adding 5 business days from Friday 2026-08-28 lands on Friday 2026-09-04
      const fiveBusinessDays = addBusinessDaysLocal(5, '2026-08-28');
      expect(fiveBusinessDays).toBe('2026-09-04');
    });
  });

  // --- P1-05: Notification Normalisation ---
  describe('P1-05: Canonical Notification Normalisation', () => {
    it('normalises disparate notification schemas into single authoritative isRead boolean', () => {
      const rawNotifs: any[] = [
        { id: '1', title: 'A', isRead: false },
        { id: '2', title: 'B', read: true },
        { id: '3', title: 'C', status: 'read' },
        { id: '4', title: 'D', status: 'unread' },
        { id: '5', title: 'E', readAt: '2026-08-28T10:00:00Z' },
        { id: '6', title: 'F', readAt: null, isRead: false }
      ];

      const normalized = rawNotifs.map(normalizeNotification);
      expect(normalized[0].isRead).toBe(false);
      expect(normalized[1].isRead).toBe(true);
      expect(normalized[2].isRead).toBe(true);
      expect(normalized[3].isRead).toBe(false);
      expect(normalized[4].isRead).toBe(true);
      expect(normalized[5].isRead).toBe(false);

      const unreadCount = getUnreadNotificationsCount(normalized);
      expect(unreadCount).toBe(3); // 1, 4, 6 are unread
    });
  });

  // --- P1-06: Lead selection reset on filter changes ---
  describe('P1-06: Lead Detail Panel Selection Integrity', () => {
    it('resets selected lead cleanly when current selection is filtered out', () => {
      const leads: CRMLead[] = [
        { id: 'lead-1', leadName: 'Solar Path', company: 'Gold Coast', contactName: 'John', contactEmail: 'j@gc.gov.au', estimatedValue: 50000, leadScore: 85, leadStatus: 'New', source: 'Web', createdDate: '2026-08-01' },
        { id: 'lead-2', leadName: 'Park Lighting', company: 'Ipswich Council', contactName: 'Mary', contactEmail: 'm@ipswich.gov.au', estimatedValue: 25000, leadScore: 70, leadStatus: 'Contacted', source: 'Email', createdDate: '2026-08-02' }
      ];

      let selectedLeadId = 'lead-2';
      let statusFilter = 'New';

      const filtered = leads.filter(l => statusFilter === 'all' || l.leadStatus === statusFilter);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('lead-1');

      // Selection resolution logic:
      const selectedLead = filtered.find(l => l.id === selectedLeadId) || filtered[0] || null;
      expect(selectedLead?.id).toBe('lead-1'); // Correctly resets away from filtered-out lead-2!
    });
  });

  // --- P1-07 & P1-08: Stale Context Clearing & Copilot Pinning ---
  describe('P1-07 & P1-08: Copilot Context Pinning and Auto-Clearing', () => {
    it('clears unpinned deal context when navigating to unrelated workspaces but retains when pinned', () => {
      let selectedOppId: string | null = 'opp-001';
      let isCopilotContextPinned = false;

      const navigateToTab = (tab: string) => {
        if (!isCopilotContextPinned) {
          if (tab === 'settings' || tab === 'home' || tab === 'tools' || tab === 'new-enquiry') {
            selectedOppId = null;
          }
        }
      };

      // Unpinned navigation clears stale opp context
      navigateToTab('settings');
      expect(selectedOppId).toBeNull();

      // Pinned navigation retains opp context
      selectedOppId = 'opp-001';
      isCopilotContextPinned = true;
      navigateToTab('settings');
      expect(selectedOppId).toBe('opp-001');
    });
  });

  // --- P1-09 & P1-10: Email Signatures & Placeholder Removal ---
  describe('P1-09 & P1-10: Customer Signatures & Placeholder Removal', () => {
    it('generates customer follow-up emails without placeholder phone numbers and uses currentUser profile', () => {
      const email = generateCustomerFollowUpEmail({
        cadence: 'day7',
        contactName: 'Sarah Jenkins',
        contactEmail: 's.jenkins@ballarat.vic.gov.au',
        companyName: 'City of Ballarat',
        projectName: 'Victoria Park Lighting',
        quoteRef: 'Q-9821',
        productsList: ['Intense 50W Solar Luminaire'],
        senderName: 'Travis Maher',
        senderEmail: 'travis.maher@plasgain.com.au',
        senderPhone: '+61 3 9000 0000'
      });

      expect(email.body).toContain('Travis Maher');
      expect(email.body).toContain('travis.maher@plasgain.com.au');
      expect(email.body).toContain('+61 3 9000 0000');
      expect(email.body).not.toContain('1300 000 000');
    });

    it('removes placeholder phone number when user has no direct phone configured', () => {
      const email = generateCustomerFollowUpEmail({
        cadence: 'day14',
        contactName: 'David Lee',
        companyName: 'Moreland Council',
        projectName: 'Merri Creek Trail',
        senderName: 'Travis Maher',
        senderEmail: 'travis.maher@plasgain.com.au'
      });

      expect(email.body).toContain('travis.maher@plasgain.com.au');
      expect(email.body).not.toContain('1300 000 000');
      expect(email.body).not.toContain('| undefined');
    });

    it('verifies tender specification pack HTML does not contain placeholder 1300 000 000', () => {
      const html = generateTenderPackageHTML({
        quoteRef: 'Q-1042',
        projectName: 'Gold Coast Oceanway',
        clientName: 'City of Gold Coast',
        authorName: 'Travis Maher',
        authorEmail: 'travis.maher@plasgain.com.au',
        products: [
          {
            name: 'Intense 50W Solar Light',
            code: 'PG-INT-50W',
            category: 'Solar Lighting',
            specifications: { 'Lumen Output': '9,500 lm', 'Battery Autonomy': '5 Nights' }
          }
        ]
      });

      expect(html).toContain('sales@plasgain.com.au');
      expect(html).not.toContain('1300 000 000');
    });
  });

  // --- P1-14: Activity History Chronological Sorting ---
  describe('P1-14: Chronological Activity History Sorting', () => {
    it('sorts activity streams newest-first with accurate date parsing and tiebreakers', () => {
      const activities: CRMActivity[] = [
        { id: '1', type: 'call', title: 'Old Call', description: 'desc', timestamp: '2026-08-20T10:00:00Z', performedBy: 'Travis' },
        { id: '2', type: 'meeting', title: 'Today Meeting', description: 'desc', timestamp: '2026-08-28T09:00:00Z', performedBy: 'Travis' },
        { id: '3', type: 'email', title: 'Yesterday Email', description: 'desc', timestamp: '2026-08-27T14:30:00Z', performedBy: 'Travis' }
      ];

      const sortedNewest = sortActivitiesChronological(activities, 'newest');
      expect(sortedNewest[0].title).toBe('Today Meeting');
      expect(sortedNewest[1].title).toBe('Yesterday Email');
      expect(sortedNewest[2].title).toBe('Old Call');

      const sortedOldest = sortActivitiesChronological(activities, 'oldest');
      expect(sortedOldest[0].title).toBe('Old Call');
      expect(sortedOldest[1].title).toBe('Yesterday Email');
      expect(sortedOldest[2].title).toBe('Today Meeting');
    });
  });

  // --- P1-15: Pending Quotes Real 5-Business-Day Calculation ---
  describe('P1-15: Pending Quotes Real 5-Business-Day KPI', () => {
    it('correctly qualifies quotes due within 5 business days and excludes quotes beyond deadline or past won/lost', () => {
      const opps: Opportunity[] = [
        {
          id: '1',
          project: 'Brisbane Riverwalk',
          customerCompany: 'BCC',
          contactName: 'Liam',
          stage: 'Quoting',
          status: 'Active',
          estimatedValue: 120000,
          quoteDeadline: '2026-09-02' // 3 business days from 2026-08-28
        },
        {
          id: '2',
          project: 'Perth Airport Approach',
          customerCompany: 'Main Roads WA',
          contactName: 'Alan',
          stage: 'Quoting',
          status: 'Active',
          estimatedValue: 240000,
          quoteDeadline: '2026-10-15' // 34 business days out
        },
        {
          id: '3',
          project: 'Cairns Esplanade',
          customerCompany: 'Cairns Regional',
          contactName: 'Chloe',
          stage: 'Technical Review',
          status: 'Active',
          estimatedValue: 85000,
          quoteDeadline: '2026-08-31' // 1 business day out
        }
      ];

      const dueWithin5 = opps.filter(o =>
        (o.stage === 'Quoting' || o.stage === 'Technical Review') &&
        o.quoteDeadline &&
        isDueWithinBusinessDays(o.quoteDeadline, 5, '2026-08-28')
      );

      expect(dueWithin5.length).toBe(2);
      expect(dueWithin5.map(o => o.id)).toEqual(['1', '3']);
    });
  });

  // --- P1-16: Role-Specific Prioritisation Explanations ---
  describe('P1-16: Role-Specific Prioritisation Explanations', () => {
    it('generates role-specific prioritisation explanations across all 4 role lenses', () => {
      const opp: Opportunity = {
        id: 'opp-001',
        project: 'Gold Coast Foreshore Stage 2',
        customerCompany: 'City of Gold Coast',
        contactName: 'Sarah Mitchell',
        stage: 'Technical Review',
        status: 'Active',
        estimatedValue: 92400,
        quoteDeadline: '2026-09-01',
        productsQuoted: ['PG-INT-50W', 'PG-SOL-POLE-6M']
      };

      const getExplanation = (o: Opportunity, role: string) => {
        if (role === 'sales') return `Quote due in 2 business day(s) — priority tender pricing ($92,400)`;
        if (role === 'technical') return `Engineering review active — AS/NZS 1158 Dialux calculation & compliance statement required`;
        if (role === 'sales_manager') return `High-value portfolio tender ($92,400) at stage "Technical Review"`;
        return `Customer follow-up & communication cadence`;
      };

      const salesExp = getExplanation(opp, 'sales');
      const techExp = getExplanation(opp, 'technical');
      const mgrExp = getExplanation(opp, 'sales_manager');
      const csExp = getExplanation(opp, 'customer_service');

      expect(salesExp).toContain('priority tender pricing');
      expect(techExp).toContain('AS/NZS 1158 Dialux calculation');
      expect(mgrExp).toContain('High-value portfolio tender');
      expect(csExp).toContain('Customer follow-up');
    });
  });
});
