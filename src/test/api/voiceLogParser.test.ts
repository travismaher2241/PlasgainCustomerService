// @vitest-environment node
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server';

describe('Voice Log Parser Endpoint (/api/crm/voice-log-parse)', () => {
  const sampleAccounts = [
    { id: 'acc-cardinia', name: 'Cardinia Shire Council' },
    { id: 'acc-geelong', name: 'City of Greater Geelong' }
  ];

  const sampleContacts = [
    { id: 'cont-david', name: 'David Smith', accountId: 'acc-cardinia' },
    { id: 'cont-sarah', name: 'Sarah Jenkins', accountId: 'acc-geelong' }
  ];

  const sampleOpps = [
    { id: 'opp-trail', name: 'Shared Trail Lighting Upgrade', accountId: 'acc-cardinia' }
  ];

  it('rejects requests without rawTranscript', async () => {
    const res = await request(app)
      .post('/api/crm/voice-log-parse')
      .send({ knownAccounts: sampleAccounts });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rawTranscript is required/i);
  });

  it('parses spoken ute debrief and matches account, contact, and extracts next action with source phrase', async () => {
    const transcript = "Just left Cardinia, spoke to David, they want sixteen columns on the shared trail, budget's tight, needs pricing before the 20th.";

    const res = await request(app)
      .post('/api/crm/voice-log-parse')
      .send({
        rawTranscript: transcript,
        currentDate: '2026-09-05',
        knownAccounts: sampleAccounts,
        knownContacts: sampleContacts,
        knownOpportunities: sampleOpps
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rawTranscript', transcript);
    expect(res.body).toHaveProperty('activity');
    expect(res.body.activity).toHaveProperty('type');
    expect(res.body.activity).toHaveProperty('notes');

    // Account matching
    expect(res.body.matchedAccount).toBeDefined();
    expect(res.body.matchedAccount.id).toBe('acc-cardinia');
    expect(res.body.matchedAccount.name).toBe('Cardinia Shire Council');
    expect(res.body.matchedAccount.sourcePhrase).toBeDefined();

    // Contact matching
    expect(res.body.matchedContact).toBeDefined();
    expect(res.body.matchedContact.id).toBe('cont-david');
    expect(res.body.matchedContact.name).toContain('David');

    // Next Action and Proposed Task
    expect(res.body.nextAction).toBeDefined();
    expect(['2026-09-19', '2026-09-20']).toContain(res.body.nextAction.date);
    expect(res.body.nextAction.sourcePhrase).toBeDefined();

    // Proposed Task
    expect(res.body.proposedTask).toBeDefined();
    expect(res.body.proposedTask.title).toBeDefined();
    expect(['2026-09-19', '2026-09-20']).toContain(res.body.proposedTask.dueDate);
  }, 20000);
});
