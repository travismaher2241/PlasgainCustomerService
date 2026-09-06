// @vitest-environment node
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server';

describe('Inbound Email Parser Endpoint (/api/crm/parse-inbound-email)', () => {
  it('rejects requests without rawEmailText', async () => {
    const res = await request(app)
      .post('/api/crm/parse-inbound-email')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rawEmailText is required/i);
  });

  it('parses council tender commitment email with entity matching and source phrase attribution', async () => {
    const rawEmail = `From: David Smith <david.smith@cardinia.vic.gov.au>
To: Marcus Vance <marcus.vance@plasgain.com.au>
Date: Fri, 04 Sep 2026 14:22:10 +1000
Subject: Re: Plasgain Quotation Q-2026-892 - Shared Trail Lighting

Hi Marcus,

Thanks for following up on the quotation for the shared trail solar lighting project. 

Our engineering committee reviewed the DIALux photometric calculations this morning. The committee is pleased with the 3000K fauna-friendly optic profile.

The formal Council tender will be released in October. We will require updated formal pricing held firm until 31 October 2026. Please follow up with me around 1 October so we can finalize the specification pack for the tender documents.

Kind regards,
David Smith
Senior Infrastructure Asset Manager
Cardinia Shire Council
03 5945 4200`;

    const knownAccounts = [
      { id: "acc-cardinia", name: "Cardinia Shire Council" }
    ];
    const knownContacts = [
      { id: "con-david", name: "David Smith", email: "david.smith@cardinia.vic.gov.au", accountId: "acc-cardinia" }
    ];
    const knownOpportunities = [
      { id: "opp-cardinia-trail", name: "Cardinia Shared Trail Solar Lighting", accountId: "acc-cardinia" }
    ];

    const res = await request(app)
      .post('/api/crm/parse-inbound-email')
      .send({
        rawEmailText: rawEmail,
        currentDate: '2026-09-05',
        knownAccounts,
        knownContacts,
        knownOpportunities
      });

    expect(res.status).toBe(200);

    // Sender details
    expect(res.body.senderName).toContain('David Smith');
    expect(res.body.senderEmail).toBe('david.smith@cardinia.vic.gov.au');
    expect(res.body.subject).toContain('Quotation Q-2026-892');

    // Account & Contact matching
    expect(res.body.matchedAccount).toBeDefined();
    expect(res.body.matchedAccount.name).toContain('Cardinia');
    expect(res.body.matchedAccount.confidence).toBeGreaterThanOrEqual(0.7);

    expect(res.body.matchedContact).toBeDefined();
    expect(res.body.matchedContact.name).toContain('David');

    // Opportunity matching
    expect(res.body.matchedOpportunity).toBeDefined();

    // Commitments & attribution
    expect(res.body.clientCommitments).toBeDefined();
    expect(res.body.clientCommitments.length).toBeGreaterThanOrEqual(1);
    expect(res.body.clientCommitments[0].sourcePhrase).toBeDefined();

    // Suggested Next Action & Date
    expect(res.body.suggestedNextAction).toBeDefined();
    expect(res.body.suggestedNextActionDate).toMatch(/2026-10/);
    expect(res.body.suggestedNextActionPhrase).toBeDefined();
  }, 25000);

  it('detects competitor mention and pricing objection in contractor email', async () => {
    const rawEmail = `From: Greg Thomas <greg.thomas@bmd.com.au>
To: Travis Maher <travis@plasgain.com.au>
Subject: Western Highway Package Pricing

Travis,

Your unit pricing on composite bollards is roughly 8% higher than Replas. Replas has offered us a bulk rebate if we sign by Friday.

Can you review volume pricing for 350 units? We need a final answer before next week.

Regards,
Greg Thomas
BMD Constructions`;

    const res = await request(app)
      .post('/api/crm/parse-inbound-email')
      .send({
        rawEmailText: rawEmail,
        currentDate: '2026-09-05'
      });

    expect(res.status).toBe(200);

    // Competitor detection
    expect(res.body.competitorMention).toBeDefined();
    expect(res.body.competitorMention.competitorName).toMatch(/Replas/i);

    // Objections detection
    expect(res.body.clientObjectionsOrConcerns).toBeDefined();
    expect(res.body.clientObjectionsOrConcerns.length).toBeGreaterThanOrEqual(1);

    // Sentiment
    expect(['Concerned', 'Neutral']).toContain(res.body.sentiment);
  }, 25000);
});
