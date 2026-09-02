import { describe, it, expect, beforeEach } from 'vitest';
import { competitorPricingStore } from '../../server/competitorPricingStore';

describe('Competitor Pricing Store & Intelligence Repository', () => {
  beforeEach(() => {
    competitorPricingStore.resetData(false);
  });

  it('retrieves all competitor pricing records and supports account filtering', () => {
    competitorPricingStore.createPricingRecord({
      accountId: 'acc-test-1',
      accountName: 'Test Regional Council',
      competitorName: 'Test Competitor',
      competitorProduct: 'Model X',
      price: 2000,
      currency: 'AUD',
      priceBasis: 'Per Unit',
      gstStatus: 'Ex GST',
      quantity: 10,
      sourceType: 'Competitor Quote',
      observedDate: '2026-08-27',
      createdBy: 'Sales Rep',
      status: 'Active',
      notes: 'Test note'
    });

    const allRecords = competitorPricingStore.getAllPricingRecords();
    expect(allRecords.length).toBe(1);

    const firstAccountId = allRecords[0].accountId;
    const filtered = competitorPricingStore.getAllPricingRecords({ accountId: firstAccountId });
    expect(filtered.length).toBe(1);
    expect(filtered.every((r) => r.accountId === firstAccountId)).toBe(true);
  });

  it('creates a new competitor pricing record and automatically generates a team alert', () => {
    const { record, alert } = competitorPricingStore.createPricingRecord({
      accountId: 'acc-test-2',
      accountName: 'City of Greater Bendigo',
      competitorName: 'SunTech Lighting',
      competitorProduct: 'Solar 50W',
      price: 1750,
      currency: 'AUD',
      priceBasis: 'Per Unit',
      gstStatus: 'Ex GST',
      quantity: 20,
      sourceType: 'Competitor Quote',
      observedDate: '2026-08-27',
      createdBy: 'Sales Rep',
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
    expect(alert.message).toContain('SunTech Lighting quoted Solar 50W at $1,750.00 (Per Unit) for City of Greater Bendigo');
    expect(alert.isRead).toBe(false);

    // Verify alert is in all alerts
    const alerts = competitorPricingStore.getAllAlerts();
    const matchingAlert = alerts.find((a) => a.recordId === record.id);
    expect(matchingAlert).toBeDefined();
  });

  it('updates competitor pricing status to Superseded', () => {
    const { record } = competitorPricingStore.createPricingRecord({
      accountId: 'acc-test-3',
      accountName: 'Test Shire',
      competitorName: 'Other Vendor',
      competitorProduct: 'Fitting A',
      price: 1500,
      currency: 'AUD',
      priceBasis: 'Per Unit',
      gstStatus: 'Ex GST',
      quantity: 5,
      sourceType: 'Customer Verbal',
      observedDate: '2026-08-27',
      createdBy: 'Sales Rep',
      status: 'Active',
      notes: 'Initial verbal quote'
    });

    const updated = competitorPricingStore.updatePricingRecord(record.id, {
      status: 'Superseded',
      notes: 'Superseded by newer 2026 rate card'
    });

    expect(updated).toBeDefined();
    expect(updated?.status).toBe('Superseded');
    expect(updated?.notes).toBe('Superseded by newer 2026 rate card');
  });

  it('marks competitor alerts as read', () => {
    const { alert } = competitorPricingStore.createPricingRecord({
      accountId: 'acc-test-4',
      accountName: 'Test Council',
      competitorName: 'Vendor B',
      competitorProduct: 'Fitting B',
      price: 2200,
      currency: 'AUD',
      priceBasis: 'Supply Only',
      gstStatus: 'Ex GST',
      quantity: 8,
      sourceType: 'Tender Schedule',
      observedDate: '2026-08-27',
      createdBy: 'Sales Rep',
      status: 'Active',
      notes: 'Tender rate'
    });

    expect(alert.isRead).toBe(false);
    const updated = competitorPricingStore.markAlertRead(alert.id);
    expect(updated?.isRead).toBe(true);
  });
});
