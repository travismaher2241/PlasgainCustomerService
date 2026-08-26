// @vitest-environment node
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server';

describe('Plasgain API Endpoints Integration Test Suite', () => {
  it('1. GET /api/health returns 200 OK with app metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.app).toBe('Plasgain Lighting Sales Copilot');
    expect(res.body.knowledgeVersion).toBeDefined();
  });

  it('2. GET /api/knowledge/tests returns validation tests and conflicts', async () => {
    const res = await request(app).get('/api/knowledge/tests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tests)).toBe(true);
    expect(Array.isArray(res.body.conflicts)).toBe(true);
    expect(res.body.tests.length).toBeGreaterThan(0);
  });

  it('3. POST /api/knowledge/validate-test executes validation test suite item', async () => {
    const res = await request(app)
      .post('/api/knowledge/validate-test')
      .send({ testId: 'test-1' });
    expect(res.status).toBe(200);
    expect(res.body.testId).toBe('test-1');
    expect(res.body.evaluation).toBeDefined();
  });

  it('4. POST /api/enquiry/analyze evaluates customer enquiry', async () => {
    const res = await request(app)
      .post('/api/enquiry/analyze')
      .send({
        rawContent: 'We need 20 solar street lights for a subdivision road in Bendigo. Must meet AS/NZS 1158 standard.',
        customer: 'Bendigo Council',
        location: 'Bendigo, VIC'
      });
    expect(res.status).toBe(200);
    expect(res.body.opportunitySummary).toBeDefined();
  });

  it('5. POST /api/enquiry/draft-email generates customer clarification email', async () => {
    const res = await request(app)
      .post('/api/enquiry/draft-email')
      .send({
        customerName: 'Rob Mitchell',
        companyName: 'Apex Civil',
        projectName: 'Geelong Trail Upgrade',
        selectedQuestions: ['What is the required AS/NZS 1158 subcategory?']
      });
    expect(res.status).toBe(200);
    expect(res.body.subject).toBeDefined();
    expect(res.body.body || res.body.emailBody).toBeDefined();
  });

  it('6. POST /api/product-finder returns matching Plasgain luminaire recommendations', async () => {
    const res = await request(app)
      .post('/api/product-finder')
      .send({
        application: 'Pathway / Shared Trail',
        mountingHeight: '5m',
        cct: '3000K',
        solarRequirement: 'All-In-One Solar'
      });
    expect(res.status).toBe(200);
    expect(res.body.primaryRecommendation || res.body.recommendedProducts).toBeDefined();
  });

  it('7. POST /api/ask-plasgain answers technical lighting questions with citations', async () => {
    const res = await request(app)
      .post('/api/ask-plasgain')
      .send({ question: 'What is the battery capacity and lumen output of Intense 50W?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeDefined();
    expect(res.body.foundInKnowledgeBase).toBeDefined();
  });

  it('8. POST /api/document/analyze performs tender and specification extraction', async () => {
    const res = await request(app)
      .post('/api/document/analyze')
      .send({
        documentText: 'Tender for Solar Lighting: 30 units, 6m mounting height, 3000K Warm White, minimum 5-year warranty.',
        documentTitle: 'Ballarat Council Tender Specs'
      });
    expect(res.status).toBe(200);
    expect(res.body.tenderReadinessScore !== undefined || res.body.technicalCompliance !== undefined).toBe(true);
  });

  it('9. POST /api/quote/review audits quotes against specifications', async () => {
    const res = await request(app)
      .post('/api/quote/review')
      .send({
        originalEnquiry: 'Customer requested 30x 6m solar pathway lights, 3000K CCT, delivered to site.',
        proposedQuote: 'Quote #PL-8924: 30x Intense Light 50W Solar, 3000K, 6m Galvanised Poles. Ex-works Melbourne.'
      });
    expect(res.status).toBe(200);
    expect(res.body.overallVerdict).toBeDefined();
  });

  it('10. POST /api/customer/research returns contractor & council intelligence', async () => {
    const res = await request(app)
      .post('/api/customer/research')
      .send({ companyName: 'Downer EDI', location: 'Melbourne, VIC' });
    expect(res.status).toBe(200);
    expect(res.body.companySnapshot || res.body.tierAndSpecialty).toBeDefined();
  });

  it('11. POST /api/call/prep provides tailored discovery agenda and objection handling', async () => {
    const res = await request(app)
      .post('/api/call/prep')
      .send({
        contactName: 'Sarah Jenkins',
        companyName: 'City of Greater Geelong',
        dealName: 'Eastern Beach Foreshore Path',
        dealValue: 65000
      });
    expect(res.status).toBe(200);
    expect(res.body.customerSnapshot || res.body.goalOfThisCall || res.body.questionsToAsk).toBeDefined();
  });

  it('12. POST /api/call/process-notes extracts CRM actions and next steps from raw notes', async () => {
    const res = await request(app)
      .post('/api/call/process-notes')
      .send({
        rawNotes: 'Spoke with Sarah. She approved 3000K. Needs updated Dialux calculation by Friday. Send revised quote.'
      });
    expect(res.status).toBe(200);
    expect(res.body.account || res.body.formattedCrmSummary || res.body.requirements).toBeDefined();
  });

  it('13. POST /api/follow-up/suggest generates actionable follow-up touchpoint strategies', async () => {
    const res = await request(app)
      .post('/api/follow-up/suggest')
      .send({
        dealName: 'Regional Highway Rest Area',
        dealValue: 120000,
        daysInStage: 18,
        lastActivity: 'Quote sent 18 days ago'
      });
    expect(res.status).toBe(200);
    expect(res.body.suggestedMessage || res.body.whyFollowUpNow || res.body.whatToAsk).toBeDefined();
  });

  it('14. POST /api/product/compare produces side-by-side technical specification matrix', async () => {
    const res = await request(app)
      .post('/api/product/compare')
      .send({
        productA: 'Intense 50W Solar',
        productB: 'Pro Blade 75W Solar'
      });
    expect(res.status).toBe(200);
    expect(res.body.comparisonTable || res.body.wherePlasgainHasAdvantage).toBeDefined();
  });

  it('15. POST /api/knowledge/explain-term delivers grounded terminology coaching', async () => {
    const res = await request(app)
      .post('/api/knowledge/explain-term')
      .send({ term: 'AS/NZS 1158 Category P' });
    expect(res.status).toBe(200);
    expect(res.body.term).toBe('AS/NZS 1158 Category P');
    expect(res.body.definition || res.body.whatItMeans).toBeDefined();
  });

  it('16. POST /api/copilot/chat answers contextual questions', async () => {
    const res = await request(app)
      .post('/api/copilot/chat')
      .send({
        message: 'How do I position Intense 50W against cheaper imported solar lights?',
        activeScreen: 'Product Finder'
      });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });

  it('17. Responds with JSON 404 on non-existent API routes', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('API route not found');
  });
});
