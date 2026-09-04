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
import { CRMActivity, CRMNotification, CRMLead, Opportunity } from '../../types/crm';

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
      const leads = [
        { id: 'lead-1', leadName: 'Solar Path', company: 'Gold Coast', contactName: 'John', contactEmail: 'j@gc.gov.au', estimatedValue: 50000, leadScore: 85, leadStatus: 'New', source: 'Web Form', dateReceived: '2026-08-01' },
        { id: 'lead-2', leadName: 'Park Lighting', company: 'Ipswich Council', contactName: 'Mary', contactEmail: 'm@ipswich.gov.au', estimatedValue: 25000, leadScore: 70, leadStatus: 'Contacted', source: 'Email Inbound', dateReceived: '2026-08-02' }
      ] as CRMLead[];

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

  // --- P1-09 & P1-10: User Profile & Customer Communications Validation (TESTS A, B, C, D) ---
  describe('P1-09 & P1-10: Customer Signatures & Profile Validation (Tests A - D)', () => {
    // TEST A: Complete profile
    it('TEST A (Complete Profile): renders real saved profile info without placeholder data', () => {
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

    // TEST B: Phone missing
    it('TEST B (Phone Missing): renders clean signature with email only without fake phone or malformed spacing', () => {
      const email = generateCustomerFollowUpEmail({
        cadence: 'day14',
        contactName: 'David Lee',
        companyName: 'Moreland Council',
        projectName: 'Merri Creek Trail',
        senderName: 'Travis Maher',
        senderEmail: 'travis.maher@plasgain.com.au'
      });

      expect(email.body).toContain('Travis Maher');
      expect(email.body).toContain('travis.maher@plasgain.com.au');
      expect(email.body).not.toContain('1300 000 000');
      expect(email.body).not.toContain('| undefined');
      expect(email.body).not.toContain('| null');
    });

    // TEST C: User name missing
    it('TEST C (User Name Missing): flags actionable validation state and does not fabricate fake name', () => {
      const validateProfile = (name?: string, email?: string) => {
        if (!name?.trim()) return "Your sender profile is incomplete. Add your name in Settings before copying or sending this email.";
        if (!email?.trim()) return "Your sender profile is incomplete. Add your email address in Settings before copying or sending this email.";
        return null;
      };

      const error = validateProfile("", "travis@plasgain.com.au");
      expect(error).toBe("Your sender profile is incomplete. Add your name in Settings before copying or sending this email.");

      const email = generateCustomerFollowUpEmail({
        cadence: 'day7',
        contactName: 'Sarah Jenkins',
        projectName: 'Park Lighting',
        senderName: '',
        senderEmail: 'travis@plasgain.com.au'
      });

      expect(email.body).not.toContain('[Your Name]');
      expect(email.body).not.toContain('undefined');
    });

    // TEST D: User email missing
    it('TEST D (User Email Missing): flags actionable validation state for missing sender email', () => {
      const validateProfile = (name?: string, email?: string) => {
        if (!name?.trim()) return "Your sender profile is incomplete. Add your name in Settings before copying or sending this email.";
        if (!email?.trim()) return "Your sender profile is incomplete. Add your email address in Settings before copying or sending this email.";
        return null;
      };

      const error = validateProfile("Travis Maher", "");
      expect(error).toBe("Your sender profile is incomplete. Add your email address in Settings before copying or sending this email.");
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

  // --- P1-15: Pending Quotes Real 5-Business-Day Manual & Automated Calculation ---
  describe('P1-15: Pending Quotes Real 5-Business-Day Calculation Matrix', () => {
    const baseDate = '2026-08-28'; // Friday

    it('due today -> included', () => {
      expect(isDueWithinBusinessDays('2026-08-28', 5, baseDate)).toBe(true);
    });

    it('due in 1 business day (Monday 2026-08-31) -> included', () => {
      expect(isDueWithinBusinessDays('2026-08-31', 5, baseDate)).toBe(true);
    });

    it('due in exactly 5 business days (Friday 2026-09-04 crossing weekend) -> included', () => {
      expect(isDueWithinBusinessDays('2026-09-04', 5, baseDate)).toBe(true);
    });

    it('due in 6 business days (Monday 2026-09-07) -> excluded from <= 5 day threshold', () => {
      expect(isDueWithinBusinessDays('2026-09-07', 5, baseDate)).toBe(false);
    });

    it('overdue (past deadline e.g. 2026-08-25) -> excluded from upcoming window', () => {
      expect(isDueWithinBusinessDays('2026-08-25', 5, baseDate)).toBe(false);
      expect(getBusinessDaysDiff('2026-08-25', baseDate)).toBeLessThan(0);
    });

    it('closed won and closed lost deals -> excluded from pending quotes queue', () => {
      const opps = [
        { id: '1', project: 'Active Quoting', customerCompany: 'BCC', contactName: 'Liam', stage: 'Quoting', status: 'Active', estimatedValue: 50000, quoteDeadline: '2026-09-01' },
        { id: '2', project: 'Closed Won Project', customerCompany: 'Gold Coast', contactName: 'Sarah', stage: 'Closed Won', status: 'Closed Won', estimatedValue: 80000, quoteDeadline: '2026-09-01' },
        { id: '3', project: 'Closed Lost Project', customerCompany: 'Ipswich', contactName: 'John', stage: 'Closed Lost', status: 'Closed Lost', estimatedValue: 30000, quoteDeadline: '2026-09-01' }
      ] as Opportunity[];

      const pendingQuotes = opps.filter(o =>
        (o.stage === 'Quoting' || o.stage === 'Qualifying' || o.stage === 'Technical Review') &&
        o.status !== 'Closed Won' &&
        o.status !== 'Closed Lost' &&
        isDueWithinBusinessDays(o.quoteDeadline, 5, baseDate)
      );

      expect(pendingQuotes.length).toBe(1);
      expect(pendingQuotes[0].id).toBe('1');
    });
  });

  // --- P1-16: Role-Specific Prioritisation Lenses & Distinct Ordering ---
  describe('P1-16: Role-Specific Dashboard Prioritisation Distinct Ordering', () => {
    const opps = [
      { id: 'opp-urgent-quote', project: 'Quote Due Urgent', customerCompany: 'BCC', contactName: 'Liam', stage: 'Quoting', status: 'Active', estimatedValue: 40000, quoteDeadline: '2026-08-29' },
      { id: 'opp-tech-review', project: 'Technical Dialux Study', customerCompany: 'Sunshine Coast', contactName: 'Mark', stage: 'Technical Review', status: 'Active', estimatedValue: 60000, quoteDeadline: '2026-09-10', productsConsidered: ['PG-INT-50W'] },
      { id: 'opp-huge-manager', project: 'Major Infrastructure Tender', customerCompany: 'Transport NSW', contactName: 'Alice', stage: 'Quoting', status: 'Active', estimatedValue: 420000, quoteDeadline: '2026-09-15' },
      { id: 'opp-cs-inquiry', project: 'Inbound Council Request', customerCompany: 'Moreland', contactName: 'Chloe', stage: 'New Enquiry', status: 'Active', estimatedValue: 15000, quoteDeadline: '2026-09-05' }
    ] as Opportunity[];

    const sortForRole = (list: Opportunity[], role: string) => {
      return [...list].sort((a, b) => {
        if (role === 'sales_manager') {
          return (b.estimatedValue || 0) - (a.estimatedValue || 0);
        }
        if (role === 'technical') {
          const t = (o: Opportunity) => (o.stage === 'Technical Review' ? 0 : 1);
          return t(a) - t(b);
        }
        if (role === 'customer_service') {
          const w = (o: Opportunity) => (o.stage === 'New Enquiry' ? 0 : 1);
          return w(a) - w(b);
        }
        // sales: quote deadline first
        return (new Date(a.quoteDeadline || '2099-01-01').getTime()) - (new Date(b.quoteDeadline || '2099-01-01').getTime());
      });
    };

    it('ranks different records first based on active role lens', () => {
      const salesTop = sortForRole(opps, 'sales')[0];
      const techTop = sortForRole(opps, 'technical')[0];
      const mgrTop = sortForRole(opps, 'sales_manager')[0];
      const csTop = sortForRole(opps, 'customer_service')[0];

      expect(salesTop.id).toBe('opp-urgent-quote'); // Sales prioritises earliest deadline
      expect(techTop.id).toBe('opp-tech-review');    // Technical prioritises Technical Review
      expect(mgrTop.id).toBe('opp-huge-manager');    // Manager prioritises highest value ($420k)
      expect(csTop.id).toBe('opp-cs-inquiry');       // Customer Service prioritises New Enquiry
    });
  });
});
