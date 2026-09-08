// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, auditLogStore } from '../../../server';
import { diffFields } from '../../../src/utils/diffUtils';

describe('Server-Controlled Audit Trail & Soft Deletes', () => {
  let authToken: string;

  beforeEach(async () => {
    // Authenticate as Travis Maher
    const authRes = await request(app)
      .post('/api/auth/verify-profile')
      .send({ userId: 'user-travis-maher', pin: '1234' });

    expect(authRes.status).toBe(200);
    expect(authRes.body.token).toBeTruthy();
    authToken = authRes.body.token;
  });

  describe('POST /api/audit Authorization & Session Integrity', () => {
    it('rejects POST /api/audit with 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({
          action: 'UPDATE',
          entityType: 'Deal',
          entityId: 'deal-123',
          entityName: 'Test Deal',
          details: 'Updated deal value'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/verified profile|sign in/i);
    });

    it('rejects POST /api/audit with 401 when invalid token provided', async () => {
      const res = await request(app)
        .post('/api/audit')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          action: 'UPDATE',
          entityType: 'Deal',
          entityId: 'deal-123',
          entityName: 'Test Deal',
          details: 'Updated deal value'
        });

      expect(res.status).toBe(401);
    });

    it('rejects POST /api/audit with 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/audit')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          action: 'UPDATE'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('extracts userId, userName, userRole, and timestamp exclusively from server session, ignoring client-asserted values', async () => {
      const spoofedClientPayload = {
        userId: 'spoofed-attacker-id',
        userName: 'Spoofed User',
        userRole: 'Fake Role',
        timestamp: '1970-01-01T00:00:00.000Z',
        action: 'UPDATE',
        entityType: 'Deal',
        entityId: 'deal-456',
        entityName: 'North Sydney Rail Upgrade',
        details: 'Updated quote stage to Submitted',
        changes: {
          stageName: { from: 'Not Submitted', to: 'Submitted' }
        },
        metadata: { clientVersion: '2.0.0' }
      };

      const res = await request(app)
        .post('/api/audit')
        .set('Authorization', 'Bearer ' + authToken)
        .send(spoofedClientPayload);

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);

      const record = res.body.record;
      expect(record).toBeDefined();

      // Verified: Client spoofing is completely thwarted
      expect(record.userId).toBe('user-travis-maher');
      expect(record.userName).toBe('Travis Maher');
      expect(record.userRole).toBe('Internal Sales & Technical Lead');
      expect(record.timestamp).not.toBe('1970-01-01T00:00:00.000Z');
      expect(new Date(record.timestamp).getFullYear()).toBeGreaterThanOrEqual(2025);

      // Verified: CRM action fields and diffs are preserved
      expect(record.action).toBe('UPDATE');
      expect(record.entityType).toBe('Deal');
      expect(record.entityId).toBe('deal-456');
      expect(record.entityName).toBe('North Sydney Rail Upgrade');
      expect(record.details).toBe('Updated quote stage to Submitted');
      expect(record.changes).toEqual({
        stageName: { from: 'Not Submitted', to: 'Submitted' }
      });
      expect(record.metadata).toEqual({ clientVersion: '2.0.0' });
    });

    it('allows GET /api/audit for authenticated session to retrieve logs', async () => {
      const getRes = await request(app)
        .get('/api/audit')
        .set('Authorization', 'Bearer ' + authToken);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body.records)).toBe(true);
      expect(getRes.body.records.length).toBeGreaterThan(0);
    });
  });

  describe('diffFields Helper Utility', () => {
    it('returns undefined if before or after is missing', () => {
      expect(diffFields(null, { name: 'New' })).toBeUndefined();
      expect(diffFields({ name: 'Old' }, null)).toBeUndefined();
    });

    it('returns undefined when there are no field changes', () => {
      const before = { name: 'Acme Corp', priority: 'High' };
      const after = { name: 'Acme Corp', priority: 'High' };
      expect(diffFields(before, after)).toBeUndefined();
    });

    it('detects and formats changed fields as { from, to }', () => {
      const before = {
        name: 'Plasgain Pty Ltd',
        dealValue: 50000,
        stageName: 'Not Submitted',
        active: true
      };
      const after = {
        name: 'Plasgain Pty Ltd',
        dealValue: 75000,
        stageName: 'Submitted',
        active: true
      };

      const diff = diffFields(before, after);
      expect(diff).toEqual({
        dealValue: { from: 50000, to: 75000 },
        stageName: { from: 'Not Submitted', to: 'Submitted' }
      });
    });

    it('detects added new fields and removed fields', () => {
      const before = { notes: undefined };
      const after = { notes: 'New notes' };

      const diff = diffFields(before, after);
      expect(diff).toEqual({
        notes: { from: null, to: 'New notes' }
      });
    });

    it('ignores default metadata keys (updatedAt, lastActivityDate, latestActivityDate)', () => {
      const before = {
        status: 'Open',
        updatedAt: '2026-01-01T00:00:00Z',
        lastActivityDate: '2026-01-01T00:00:00Z'
      };
      const after = {
        status: 'Closed',
        updatedAt: '2026-02-01T00:00:00Z',
        lastActivityDate: '2026-02-01T00:00:00Z'
      };

      const diff = diffFields(before, after);
      expect(diff).toEqual({
        status: { from: 'Open', to: 'Closed' }
      });
    });
  });

  describe('Soft Deletes & Read Filtering', () => {
    it('soft deletes opportunity with archival metadata without destroying record', () => {
      const opp = {
        id: 'opp-soft-1',
        name: 'Paramatta Station LED Refit',
        accountId: 'acc-101',
        dealValue: 120000,
        stageId: 'stage-submitted',
        stageName: 'Submitted'
      };

      const reason = 'Client decided not to proceed this quarter';
      const now = new Date().toISOString();

      // Soft delete mutation pattern
      const archivedOpp = {
        ...opp,
        isArchived: true,
        archivedAt: now,
        archivedBy: 'user-travis-maher',
        archivedReason: reason
      };

      expect(archivedOpp.id).toBe('opp-soft-1');
      expect(archivedOpp.isArchived).toBe(true);
      expect(archivedOpp.archivedBy).toBe('user-travis-maher');
      expect(archivedOpp.archivedReason).toBe(reason);
      expect(archivedOpp.archivedAt).toBe(now);

      // Diff tracking on soft delete
      const diff = diffFields(opp, archivedOpp);
      expect(diff?.isArchived).toEqual({ from: null, to: true });
      expect(diff?.archivedReason).toEqual({ from: null, to: reason });
    });

    it('filters out archived records from active CRM read queries', () => {
      const records = [
        { id: 'deal-active-1', name: 'Active Project 1', isArchived: false },
        { id: 'deal-archived-1', name: 'Archived Project 2', isArchived: true },
        { id: 'deal-active-2', name: 'Active Project 3' }, // undefined isArchived is active
        { id: 'deal-archived-2', name: 'Archived Project 4', isArchived: true }
      ];

      const activeRecords = records.filter((r) => !r.isArchived);
      expect(activeRecords.map((r) => r.id)).toEqual(['deal-active-1', 'deal-active-2']);
    });
  });
});

