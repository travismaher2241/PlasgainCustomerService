// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, auditLogStore, opportunityStore } from '../../../server';

describe('Opportunity REST API & Shared-Database Integrity', () => {
  let repToken: string;
  let managerToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Reset in-memory stores for clean test isolation
    opportunityStore.clearForTesting();
    auditLogStore.clearForTesting();

    // 1. Authenticate Rep (Sarah Reed - Internal Sales)
    const sarahRes = await request(app)
      .post('/api/auth/verify-profile')
      .send({ userId: 'user-sarah-reed', pin: '2468' });
    expect(sarahRes.status).toBe(200);
    repToken = sarahRes.body.token;

    // 2. Authenticate Admin (Travis Maher - Admin / Tech Lead)
    const travisRes = await request(app)
      .post('/api/auth/verify-profile')
      .send({ userId: 'user-travis-maher', pin: '1234' });
    expect(travisRes.status).toBe(200);
    adminToken = travisRes.body.token;

    // 3. Register and Authenticate Manager (Jane Manager - Sales Manager)
    await request(app)
      .post('/api/auth/register-profile')
      .send({
        userId: 'user-jane-manager',
        name: 'Jane Manager',
        role: 'Sales Manager',
        isAdmin: false,
        pin: '5555'
      });

    const managerRes = await request(app)
      .post('/api/auth/verify-profile')
      .send({ userId: 'user-jane-manager', pin: '5555' });
    expect(managerRes.status).toBe(200);
    managerToken = managerRes.body.token;
  });

  describe('1. Authentication & Open-Read Policy ("Everyone sees everything")', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const getList = await request(app).get('/api/opportunities');
      expect(getList.status).toBe(401);

      const getSingle = await request(app).get('/api/opportunities/opp-123');
      expect(getSingle.status).toBe(401);

      const postRes = await request(app).post('/api/opportunities').send({ name: 'Test' });
      expect(postRes.status).toBe(401);

      const putRes = await request(app).put('/api/opportunities/opp-123').send({ name: 'Test' });
      expect(putRes.status).toBe(401);

      const delRes = await request(app).delete('/api/opportunities/opp-123');
      expect(delRes.status).toBe(401);
    });

    it('allows Reps, Managers, and Admins to list and read all opportunities', async () => {
      // Create an opportunity as Admin
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'North Sydney Lighting Upgrade',
          accountId: 'acc-north-sydney',
          accountName: 'North Sydney Council',
          dealValue: 120000
        });
      expect(createRes.status).toBe(201);
      const oppId = createRes.body.data.id;

      // Commercial Rep (Sarah) can read the list
      const repList = await request(app)
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`);
      expect(repList.status).toBe(200);
      expect(repList.body.data.length).toBe(1);
      expect(repList.body.data[0].id).toBe(oppId);

      // Commercial Rep (Sarah) can read the single opportunity
      const repSingle = await request(app)
        .get(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${repToken}`);
      expect(repSingle.status).toBe(200);
      expect(repSingle.body.data.name).toBe('North Sydney Lighting Upgrade');
    });
  });

  describe('2. Validation on POST and PUT', () => {
    it('rejects POST with 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          // missing name and accountId
          dealValue: 50000
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation failed/i);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('name'),
          expect.stringContaining('accountId')
        ])
      );
    });

    it('rejects POST with 400 when dealValue is negative', async () => {
      const res = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Solar Pole Retrofit',
          accountId: 'acc-brisbane',
          dealValue: -500
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.stringContaining('dealValue')])
      );
    });

    it('rejects PUT with 400 when invalid data types are submitted', async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Gold Coast Highway',
          accountId: 'acc-gold-coast',
          dealValue: 80000
        });
      const oppId = createRes.body.data.id;

      const putRes = await request(app)
        .put(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          dealValue: -100
        });

      expect(putRes.status).toBe(400);
      expect(putRes.body.error).toMatch(/validation failed/i);
    });
  });

  describe('3. Field-Level Updates & Optimistic Concurrency Control', () => {
    it('updates only specified fields without overwriting unmodified fields', async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Melbourne Metro Rail',
          accountId: 'acc-melbourne',
          accountName: 'Melbourne Metro Authority',
          dealValue: 250000,
          location: 'Melbourne, VIC',
          pipelineId: 'pipe-major-projects',
          stageName: 'Not Submitted'
        });

      expect(createRes.status).toBe(201);
      const original = createRes.body.data;
      expect(original.version).toBe(1);

      // Partial update: update ONLY dealValue and stageName. The version read
      // back from the create is echoed so the concurrency precondition is met.
      const updateRes = await request(app)
        .put(`/api/opportunities/${original.id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          version: original.version,
          dealValue: 275000,
          stageName: 'Submitted'
        });

      expect(updateRes.status).toBe(200);
      const updated = updateRes.body.data;

      // Changed fields
      expect(updated.dealValue).toBe(275000);
      expect(updated.stageName).toBe('Submitted');
      expect(updated.version).toBe(2);

      // Unchanged fields MUST be preserved
      expect(updated.name).toBe('Melbourne Metro Rail');
      expect(updated.accountId).toBe('acc-melbourne');
      expect(updated.accountName).toBe('Melbourne Metro Authority');
      expect(updated.location).toBe('Melbourne, VIC');
      expect(updated.pipelineId).toBe('pipe-major-projects');
      expect(updated.createdAt).toBe(original.createdAt);
      expect(updated.updatedAt).not.toBe(original.updatedAt);
    });

    it('rejects an update carrying no concurrency token with 428 rather than silently overwriting', async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Ballarat Ring Road',
          accountId: 'acc-ballarat',
          dealValue: 64000
        });
      const original = createRes.body.data;

      // No `version` in the body, no If-Match / If-Unmodified-Since header.
      const res = await request(app)
        .put(`/api/opportunities/${original.id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({ dealValue: 71000 });

      expect(res.status).toBe(428);
      expect(res.body.error).toMatch(/precondition required/i);

      // The record must be untouched — no partial write, no version bump.
      const after = await request(app)
        .get(`/api/opportunities/${original.id}`)
        .set('Authorization', `Bearer ${repToken}`);
      expect(after.body.data.dealValue).toBe(64000);
      expect(after.body.data.version).toBe(original.version);
    });

    it('accepts an If-Unmodified-Since token as the concurrency precondition', async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Shepparton Bypass',
          accountId: 'acc-shepparton',
          dealValue: 40000
        });
      const original = createRes.body.data;

      const res = await request(app)
        .put(`/api/opportunities/${original.id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .set('If-Unmodified-Since', original.updatedAt)
        .send({ dealValue: 45000 });

      expect(res.status).toBe(200);
      expect(res.body.data.dealValue).toBe(45000);
    });

    it('enforces optimistic concurrency control using version number and rejects stale updates with 409 Conflict', async () => {
      // 1. Create opportunity (version 1)
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Sydney Airport Perimeter',
          accountId: 'acc-sydney-airport',
          dealValue: 95000
        });
      const opp = createRes.body.data;
      expect(opp.version).toBe(1);

      // 2. User A updates opportunity with version 1 -> succeeds, increments to version 2
      const userAUpdate = await request(app)
        .put(`/api/opportunities/${opp.id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          version: 1,
          dealValue: 105000
        });
      expect(userAUpdate.status).toBe(200);
      expect(userAUpdate.body.data.version).toBe(2);
      expect(userAUpdate.body.data.dealValue).toBe(105000);

      // 3. User B (stale client) tries to update using version 1 -> MUST fail with 409 Conflict
      const userBUpdate = await request(app)
        .put(`/api/opportunities/${opp.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: 1,
          dealValue: 110000
        });
      expect(userBUpdate.status).toBe(409);
      expect(userBUpdate.body.error).toMatch(/concurrently/i);
      expect(userBUpdate.body.currentVersion).toBe(2);
      expect(userBUpdate.body.providedVersion).toBe(1);

      // 4. Concurrency control also supports HTTP If-Match header
      const headerStaleUpdate = await request(app)
        .put(`/api/opportunities/${opp.id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .set('If-Match', '"1"')
        .send({
          dealValue: 115000
        });
      expect(headerStaleUpdate.status).toBe(409);

      // 5. Updating with current version (2) via If-Match succeeds
      const headerValidUpdate = await request(app)
        .put(`/api/opportunities/${opp.id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .set('If-Match', '"2"')
        .send({
          dealValue: 115000
        });
      expect(headerValidUpdate.status).toBe(200);
      expect(headerValidUpdate.body.data.version).toBe(3);
    });
  });

  describe('4. Automatic Audit Log Emission on POST, PUT, and DELETE', () => {
    it('automatically records audit logs with verified session user and field-level diffs', async () => {
      // 1. Create Deal -> Audit record created
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Brisbane Port Terminal',
          accountId: 'acc-port-brisbane',
          dealValue: 60000,
          stageName: 'Not Submitted'
        });
      const oppId = createRes.body.data.id;

      let logs = auditLogStore.getAll();
      const createAudit = logs.find((l) => l.entityId === oppId && l.action === 'CREATE');
      expect(createAudit).toBeDefined();
      expect(createAudit?.userId).toBe('user-sarah-reed');
      expect(createAudit?.userName).toBe('Sarah Reed');
      expect(createAudit?.entityType).toBe('Deal');

      // 2. Update Deal -> Stage Change audit with diff
      const updateRes = await request(app)
        .put(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          version: 1,
          stageName: 'Submitted',
          dealValue: 65000
        });
      expect(updateRes.status).toBe(200);

      logs = auditLogStore.getAll();
      const updateAudit = logs.find((l) => l.entityId === oppId && (l.action === 'STAGE_CHANGE' || l.action === 'UPDATE'));
      expect(updateAudit).toBeDefined();
      expect(updateAudit?.userId).toBe('user-sarah-reed');
      expect(updateAudit?.changes?.stageName).toEqual({ from: 'Not Submitted', to: 'Submitted' });
      expect(updateAudit?.changes?.dealValue).toEqual({ from: 60000, to: 65000 });

      // 3. Delete Deal as Manager -> DELETE audit
      const deleteRes = await request(app)
        .delete(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Project cancelled by client' });
      expect(deleteRes.status).toBe(200);

      logs = auditLogStore.getAll();
      const deleteAudit = logs.find((l) => l.entityId === oppId && l.action === 'DELETE');
      expect(deleteAudit).toBeDefined();
      expect(deleteAudit?.userId).toBe('user-jane-manager');
      expect(deleteAudit?.userName).toBe('Jane Manager');
      expect(deleteAudit?.details).toMatch(/Project cancelled by client/);
    });
  });

  describe('5. Role Authorization for Destructive Actions (DELETE)', () => {
    it('forbids commercial Rep from deleting an opportunity (403 Forbidden)', async () => {
      const createRes = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Newcastle Steelworks',
          accountId: 'acc-newcastle',
          dealValue: 40000
        });
      const oppId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.error).toMatch(/Manager or Admin privileges/i);

      // Verify opportunity is NOT deleted
      const checkRes = await request(app)
        .get(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${repToken}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.isArchived).toBe(false);
    });

    it('allows Manager and Admin to soft-delete an opportunity', async () => {
      const opp1Res = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Wollongong Bypass',
          accountId: 'acc-wollongong',
          dealValue: 70000
        });
      const opp1Id = opp1Res.body.data.id;

      // Manager deletes opp1
      const managerDelete = await request(app)
        .delete(`/api/opportunities/${opp1Id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Duplicate entry' });
      expect(managerDelete.status).toBe(200);
      expect(managerDelete.body.data.isArchived).toBe(true);

      // Verify opp1 is soft-deleted (hidden from standard GET /:id)
      const check1 = await request(app)
        .get(`/api/opportunities/${opp1Id}`)
        .set('Authorization', `Bearer ${repToken}`);
      expect(check1.status).toBe(404);

      // Can still be retrieved if includeArchived=true
      const checkArchived = await request(app)
        .get(`/api/opportunities/${opp1Id}?includeArchived=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkArchived.status).toBe(200);
      expect(checkArchived.body.data.isArchived).toBe(true);
      expect(checkArchived.body.data.archivedReason).toBe('Duplicate entry');
    });
  });

  describe('6. Pagination, Search, and Filtering', () => {
    beforeEach(async () => {
      // Seed 5 test opportunities
      const testDeals = [
        { name: 'Adelaide Depot Phase 1', accountId: 'acc-adelaide', dealValue: 20000, pipelineId: 'pipe-standard', stageId: 'stage-lead' },
        { name: 'Adelaide Depot Phase 2', accountId: 'acc-adelaide', dealValue: 40000, pipelineId: 'pipe-standard', stageId: 'stage-quoted' },
        { name: 'Perth Airport Terminal', accountId: 'acc-perth', dealValue: 90000, pipelineId: 'pipe-major', stageId: 'stage-quoted' },
        { name: 'Darwin Mining Camp', accountId: 'acc-darwin', dealValue: 150000, pipelineId: 'pipe-major', stageId: 'stage-closed' },
        { name: 'Hobart Marina Lighting', accountId: 'acc-hobart', dealValue: 30000, pipelineId: 'pipe-standard', stageId: 'stage-lead' }
      ];

      for (const d of testDeals) {
        await request(app)
          .post('/api/opportunities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(d);
      }
    });

    it('filters opportunities by accountId', async () => {
      const res = await request(app)
        .get('/api/opportunities?accountId=acc-adelaide')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((d: any) => d.accountId === 'acc-adelaide')).toBe(true);
    });

    it('filters opportunities by pipelineId and stageId', async () => {
      const res = await request(app)
        .get('/api/opportunities?pipelineId=pipe-major&stageId=stage-quoted')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Perth Airport Terminal');
    });

    it('searches opportunities by keyword', async () => {
      const res = await request(app)
        .get('/api/opportunities?search=Airport')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Perth Airport Terminal');
    });

    it('paginates results correctly', async () => {
      const page1 = await request(app)
        .get('/api/opportunities?page=1&limit=2')
        .set('Authorization', `Bearer ${repToken}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(2);
      expect(page1.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3
      });

      const page2 = await request(app)
        .get('/api/opportunities?page=2&limit=2')
        .set('Authorization', `Bearer ${repToken}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(2);
      expect(page2.body.data[0].id).not.toBe(page1.body.data[0].id);
    });
  });
});
