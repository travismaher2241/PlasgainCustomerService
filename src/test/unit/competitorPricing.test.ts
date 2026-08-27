import { describe, it, expect, beforeEach } from 'vitest';
import { competitorPricingStore } from '../../server/competitorPricingStore';

describe('Competitor Pricing Store & Intelligence Repository', () => {
  beforeEach(() => {
    competitorPricingStore.resetData(true);
  });

  it('retrieves all competitor pricing records and supports account filtering', () => {
    const allRecords = competitorPricingStore.getAllPricingRecords();
    expect(allRecords.length).toBeGreaterThan(0);

    const firstAccountId = allRecords[0].accountId;
    const filtered = competitorPricingStore.getAllPricingRecords({ accountId: firstAccountId });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.accountId === firstAccountId)).toBe(true);
  });

  it('creates a new competitor pricing record and automatically generates a team alert', () => {
    const { record, alert } = competitorPricingStore.createPricingRecord({
      accountId: 'acc-ballarat',
      accountName: 'City of Ballarat',
      competitorName: 'Leadsun Australia',
      competitorProduct: 'AE3 30W Solar',
      price: 1750,
      currency: 'AUD',
      priceBasis: 'Per Unit',
      gstStatus: 'Ex GST',
      quantity: 20,
      sourceType: 'Competitor Quote',
      observedDate: '2026-08-27',
      createdBy: 'Sarah Jenkins',
      status: 'Active',
      notes: 'Quoted on regional shared pathway tender'
    });

    expect(record.id).toBeDefined();
    expect(record.price).toBe(1750);
    expect(record.status).toBe('Active');

    // Verify alert was generated and returned
    expect(alert).toBeDefined();
    expect(alert.recordId).toBe(record.id);
    expect(alert.title).toBe('New competitor pricing');
    expect(alert.message).toContain('Leadsun Australia quoted AE3 30W Solar at $1,750.00 (Per Unit) for City of Ballarat');
    expect(alert.isRead).toBe(false);

    // Verify alert is in all alerts
    const alerts = competitorPricingStore.getAllAlerts();
    const matchingAlert = alerts.find((a) => a.recordId === record.id);
    expect(matchingAlert).toBeDefined();
  });

  it('updates competitor pricing status to Superseded', () => {
    const all = competitorPricingStore.getAllPricingRecords();
    const target = all[0];

    const updated = competitorPricingStore.updatePricingRecord(target.id, {
      status: 'Superseded',
      notes: 'Superseded by newer 2026 rate card'
    });

    expect(updated).toBeDefined();
    expect(updated?.status).toBe('Superseded');
    expect(updated?.notes).toBe('Superseded by newer 2026 rate card');
  });

  it('marks competitor alerts as read', () => {
    const alerts = competitorPricingStore.getAllAlerts();
    const unreadAlert = alerts.find((a) => !a.isRead);

    if (unreadAlert) {
      const updated = competitorPricingStore.markAlertRead(unreadAlert.id);
      expect(updated?.isRead).toBe(true);
    }
  });
});
