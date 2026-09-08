// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, auditLogStore, opportunityStore } from '../../../server';
import { notificationStore } from '../../server/notificationStore';

describe('POST /api/automation/follow-up-sweep', () => {
  let repToken: string;

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(async () => {
    opportunityStore.clearForTesting();
    auditLogStore.clearForTesting();
    notificationStore.resetData(false);

    const res = await request(app)
      .post('/api/auth/verify-profile')
      .send({ userId: 'user-sarah-reed', pin: '2468' });
    repToken = res.body.token;
  });

  const submitQuote = async () => {
    const res = await request(app)
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        name: 'Wyndham Pathway Lighting',
        accountId: 'acc-wyndham',
        accountName: 'Wyndham City Council',
        dealValue: 96000,
        quoteNumber: 'Q-2001',
        stageId: 'stage-submitted',
        stageName: 'Submitted',
        submittedAt: threeDaysAgo
      });
    return res.body.data;
  };

  it('requires a verified session', async () => {
    const res = await request(app).post('/api/automation/follow-up-sweep');
    expect(res.status).toBe(401);
  });

  it('flags an overdue quote and reports what it did', async () => {
    const quote = await submitQuote();

    const res = await request(app)
      .post('/api/automation/follow-up-sweep')
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.triggered).toHaveLength(1);
    expect(res.body.triggered[0].id).toBe(quote.id);
    expect(res.body.failed).toEqual([]);

    const after = await request(app)
      .get(`/api/opportunities/${quote.id}`)
      .set('Authorization', `Bearer ${repToken}`);
    expect(after.body.data.stageName).toBe('Follow Up Required');
  });

  it('is safe to call repeatedly — the second run flags nothing', async () => {
    await submitQuote();

    await request(app)
      .post('/api/automation/follow-up-sweep')
      .set('Authorization', `Bearer ${repToken}`);
    const second = await request(app)
      .post('/api/automation/follow-up-sweep')
      .set('Authorization', `Bearer ${repToken}`);

    expect(second.body.triggered).toHaveLength(0);
    expect(notificationStore.getAll()).toHaveLength(1);
  });

  it('surfaces the reminder through the notifications the app already polls', async () => {
    await submitQuote();

    await request(app)
      .post('/api/automation/follow-up-sweep')
      .set('Authorization', `Bearer ${repToken}`);

    const notifications = await request(app).get('/api/notifications');
    const followUp = notifications.body.notifications.find((n: any) =>
      n.title.includes('Wyndham Pathway Lighting')
    );

    expect(followUp).toBeDefined();
    expect(followUp.type).toBe('action_required');
    expect(followUp.isRead).toBe(false);
  });
});
