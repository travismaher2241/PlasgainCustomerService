// @vitest-environment node
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server';

describe('Inbound Enquiry Parser Endpoint (/api/crm/parse-enquiry)', () => {
  it('rejects requests without rawEnquiryText', async () => {
    const res = await request(app)
      .post('/api/crm/parse-enquiry')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rawEnquiryText is required/i);
  });

  it('parses tender notice text into structured lead with source phrase attribution', async () => {
    const rawText = `TENDER NOTICE: Wyndham City Council - Parks & Open Spaces
Reference: WCC-2026-T881
Contact: David Henderson
Email: d.henderson@wyndham.vic.gov.au
Phone: 03 9742 0777
Location: Werribee River Trail Stage 2, Werribee VIC 3030

Requirement:
Supply of 14x integrated solar pathway lighting columns compliant with AS/NZS 1158.3.1.
Budgetary estimate: $65,000 AUD.
Submissions close: 2026-10-15.
Please submit technical compliance sheet and formal quotation prior to close date.`;

    const res = await request(app)
      .post('/api/crm/parse-enquiry')
      .send({
        rawEnquiryText: rawText,
        currentDate: '2026-09-05'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rawEnquiryText', rawText);

    // Company & source attribution
    expect(res.body.company).toBeDefined();
    expect(res.body.company.value).toContain('Wyndham');
    expect(res.body.company.sourcePhrase).toBeDefined();

    // Contact & source attribution
    expect(res.body.contact).toBeDefined();
    expect(res.body.contact.name).toContain('David Henderson');
    expect(res.body.contact.email).toBe('d.henderson@wyndham.vic.gov.au');
    expect(res.body.contact.phone).toBeDefined();

    // Project & Scope
    expect(res.body.project).toBeDefined();
    expect(res.body.project.enquiryType).toBe('Solar Pathway Lighting');
    expect(res.body.project.territory).toBe('VIC/TAS');
    expect(res.body.scope).toBeDefined();
    expect(res.body.scope.quantity).toBe(14);
    expect(res.body.scope.sourcePhrase).toBeDefined();

    // Commercial & Deadline
    expect(res.body.commercial).toBeDefined();
    expect(res.body.commercial.deadline).toBeDefined();
    expect(res.body.commercial.sourcePhrase).toBeDefined();

    // Next Action
    expect(res.body.nextAction).toBeDefined();
    expect(res.body.nextAction.action).toBeDefined();
    expect(res.body.nextAction.sourcePhrase).toBeDefined();
  }, 20000);

  it('parses civil contractor RFQ for composite poles', async () => {
    const rawText = `From: Sarah Jenkins <sjenkins@bmd.com.au>
To: sales@plasgain.com.au
Subject: RFQ: 28x Composite Light Poles - Townsville QLD

Can you please provide supply rates for 28 composite frp lighting poles?
Delivery required to Townsville QLD. Need quotes by Friday 18th September.
Call me on 0419 883 214.
Regards,
Sarah Jenkins`;

    const res = await request(app)
      .post('/api/crm/parse-enquiry')
      .send({
        rawEnquiryText: rawText,
        currentDate: '2026-09-05'
      });

    expect(res.status).toBe(200);
    expect(res.body.contact.name).toContain('Sarah Jenkins');
    expect(res.body.contact.email).toBe('sjenkins@bmd.com.au');
    expect(res.body.project.territory).toBe('QLD/NT');
    expect(res.body.project.enquiryType).toBe('Composite Poles');
    expect(res.body.scope.quantity).toBe(28);
  }, 20000);
});
