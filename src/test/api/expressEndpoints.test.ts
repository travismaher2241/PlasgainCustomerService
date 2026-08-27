// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../server';

/**
 * These tests run with GEMINI_API_KEY deliberately unset.
 *
 * The contract being asserted is the one that matters for a sales tool: when the
 * AI cannot run, the API must say so loudly (503 + degraded) and must NOT return
 * invented specifications, warranties, quantities, or recommendations. A rep
 * acting on fabricated output can quote the wrong product to a real customer.
 */

const originalKey = process.env.GEMINI_API_KEY;

beforeAll(() => {
  delete process.env.GEMINI_API_KEY;
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

/** Every AI-backed route and a valid body for it. */
const AI_ROUTES: { name: string; path: string; body: Record<string, unknown> }[] = [
  {
    name: 'enquiry/analyze',
    path: '/api/enquiry/analyze',
    body: {
      rawContent: 'We need 20 solar street lights for a subdivision road in Bendigo, AS/NZS 1158.',
      customer: 'Bendigo Council',
      location: 'Bendigo, VIC'
    }
  },
  {
    name: 'enquiry/draft-email',
    path: '/api/enquiry/draft-email',
    body: {
      recipientName: 'Rob Mitchell',
      companyName: 'Apex Civil',
      projectName: 'Geelong Trail Upgrade',
      selectedQuestions: ['What is the required AS/NZS 1158 subcategory?']
    }
  },
  {
    name: 'product-finder',
    path: '/api/product-finder',
    body: { application: 'Pathway / Shared Trail', powerAvailability: 'Off-grid Solar required' }
  },
  {
    name: 'ask-plasgain',
    path: '/api/ask-plasgain',
    body: { question: 'What is the battery capacity of the Intense 50W?' }
  },
  {
    name: 'document/analyze',
    path: '/api/document/analyze',
    body: { documentText: 'Tender for Solar Lighting: 30 units, 6m mounting height, 3000K.' }
  },
  {
    name: 'analyse-drawing',
    path: '/api/analyse-drawing',
    body: {
      fileName: 'Ballarat_Pathway_Plan.pdf',
      mimeType: 'application/pdf',
      drawingNotes: 'Extract 24 solar poles and trenching',
      project: 'Ballarat 1.2km Shared Path'
    }
  },
  {
    name: 'quote/review',
    path: '/api/quote/review',
    body: {
      originalEnquiry: 'Customer requested 30x 6m solar pathway lights, 3000K CCT.',
      proposedQuote: 'Quote #PL-8924: 30x Intense Light 50W Solar, 3000K, 6m poles.'
    }
  },
  {
    name: 'customer/research',
    path: '/api/customer/research',
    body: { companyName: 'Downer EDI', location: 'Melbourne, VIC' }
  },
  {
    name: 'call/prep',
    path: '/api/call/prep',
    body: {
      contactName: 'Sarah Jenkins',
      company: 'City of Greater Geelong',
      project: 'Eastern Beach Foreshore Path'
    }
  },
  {
    name: 'call/process-notes',
    path: '/api/call/process-notes',
    body: { rawNotes: 'Spoke with Sarah. She approved 3000K. Needs Dialux by Friday.' }
  },
  {
    name: 'follow-up/suggest',
    path: '/api/follow-up/suggest',
    body: {
      customer: 'Mark Henderson',
      company: 'Downer Civil',
      project: 'Regional Highway Rest Area',
      daysSinceLastActivity: 18
    }
  },
  {
    name: 'product/compare',
    path: '/api/product/compare',
    body: { productA: 'Intense 50W Solar', productB: 'Pro Blade 75W Solar' }
  },
  {
    name: 'learn/quiz-evaluate',
    path: '/api/learn/quiz-evaluate',
    body: { question: 'Name five discovery questions.', userAnswer: 'Pole height and CCT.' }
  },
  {
    name: 'learn/roleplay',
    path: '/api/learn/roleplay',
    body: { latestUserMessage: 'Our solar option suits this site.' }
  },
  {
    name: 'knowledge/explain-term',
    path: '/api/knowledge/explain-term',
    body: { term: 'AS/NZS 1158 Category P' }
  },
  {
    name: 'copilot/chat',
    path: '/api/copilot/chat',
    body: { message: 'How do I position Intense 50W?', activeScreen: 'Product Finder' }
  }
];

/** Strings that only ever appeared in the old invented fallbacks. */
const FABRICATION_MARKERS = [
  '7,500 lm',
  '896Wh',
  '5-Year Commercial Warranty',
  'Rob Mitchell',
  'ABC Civil Pty Ltd',
  'PL-8924',
  'Apex Electrical'
];

describe('Non-AI endpoints still serve normally', () => {
  it('GET /api/health reports app metadata and the real AI state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.app).toBe('Plasgain Lighting Sales Copilot');
    expect(res.body.knowledgeVersion).toBeDefined();
    // With no key configured the app must not claim the AI is healthy.
    expect(res.body.ai.configured).toBe(false);
    expect(res.body.status).toBe('degraded');
  });

  it('GET /api/health/ai reports the AI as unavailable rather than guessing', async () => {
    const res = await request(app).get('/api/health/ai');
    expect(res.status).toBe(503);
    expect(res.body.configured).toBe(false);
    expect(res.body.reachable).toBe(false);
  });

  it('GET /api/knowledge/tests returns validation tests and conflicts', async () => {
    const res = await request(app).get('/api/knowledge/tests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tests)).toBe(true);
    expect(Array.isArray(res.body.conflicts)).toBe(true);
    expect(res.body.tests.length).toBeGreaterThan(0);
  });

  it('responds with JSON 404 on non-existent API routes', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('API route not found');
  });

  it('responds with JSON, not an HTML stack trace, on malformed JSON', async () => {
    const res = await request(app)
      .post('/api/ask-plasgain')
      .set('Content-Type', 'application/json')
      .send('{"question":');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.error).toBe('Malformed JSON in request body.');
    // Must not leak server filesystem paths.
    expect(JSON.stringify(res.body)).not.toMatch(/node_modules|[A-Za-z]:\\/);
  });
});

describe('AI routes fail loudly instead of inventing content', () => {
  it.each(AI_ROUTES)('$name returns 503 degraded with no invented payload', async ({ path, body }) => {
    const res = await request(app).post(path).send(body);

    expect(res.status).toBe(503);
    expect(res.body.degraded).toBe(true);
    expect(res.body.aiAvailable).toBe(false);
    expect(res.body.detail).toBeTruthy();

    // The response must carry no business content a rep could act on.
    const serialised = JSON.stringify(res.body);
    for (const marker of FABRICATION_MARKERS) {
      expect(serialised).not.toContain(marker);
    }
  });
});

describe('Input validation rejects unusable requests', () => {
  it.each(AI_ROUTES)('$name rejects an empty body with 400', async ({ path }) => {
    const res = await request(app).post(path).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it.each([
    ['array', ['a']],
    ['object', { a: 1 }],
    ['number', 123],
    ['blank string', '   ']
  ])('ask-plasgain rejects a question passed as %s', async (_label, question) => {
    const res = await request(app).post('/api/ask-plasgain').send({ question });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('non-empty string');
  });

  it('product-finder requires an explicit power source rather than assuming solar', async () => {
    const res = await request(app).post('/api/product-finder').send({ application: 'Car park' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/power availability/i);
  });

  it('draft-email refuses to address an email to nobody', async () => {
    // The old code silently produced "Hi Client, regarding Lighting Project".
    const res = await request(app)
      .post('/api/enquiry/draft-email')
      .send({
        enquiryData: {
          opportunitySummary: {
            customerName: { value: 'Dave' },
            projectLocation: { value: 'Somewhere' }
          }
        }
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/recipient name and project name/i);
  });

  it('draft-email resolves the field names the analyze endpoint actually emits', async () => {
    const res = await request(app)
      .post('/api/enquiry/draft-email')
      .send({
        enquiryData: {
          opportunitySummary: {
            contactName: { value: 'Dave Kouris' },
            company: { value: 'Kouris Electrical' },
            project: { value: 'Marrickville Metro Car Park Upgrade' }
          }
        }
      });
    // Validation passes, so it reaches the AI and reports it unavailable.
    expect(res.status).toBe(503);
    expect(res.body.degraded).toBe(true);
  });

  it('validate-test still 404s for an unknown test id', async () => {
    const res = await request(app).post('/api/knowledge/validate-test').send({ testId: 'test-999' });
    expect(res.status).toBe(404);
  });
});
