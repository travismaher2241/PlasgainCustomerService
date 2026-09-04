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
    name: 'copilot/chat',
    path: '/api/copilot/chat',
    body: { message: 'How do I position Intense 50W?', activeScreen: 'CRM' }
  },
  {
    name: 'email/research-and-draft',
    path: '/api/email/research-and-draft',
    body: { mode: 'cold-outreach', researchSubject: 'BMD Group' }
  },
  {
    name: 'email/refine-draft',
    path: '/api/email/refine-draft',
    body: { currentDraft: { subject: 'Intro', body: 'Draft body text' }, refineAction: 'shorter' }
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
    expect(res.body.app).toBe('Plasgain Sales Workspace');
    expect(res.body.knowledgeVersion).toBeUndefined();
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

  it('GET /api/knowledge/tests no longer exists (its fabricated fixture content was removed)', async () => {
    const res = await request(app).get('/api/knowledge/tests');
    expect(res.status).toBe(404);
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
    expect(res.status).toBe(503);
    expect(res.body.degraded).toBe(true);
  });

  it('email/research-and-draft rejects requests with missing research subject', async () => {
    const res = await request(app)
      .post('/api/email/research-and-draft')
      .send({ mode: 'cold-outreach' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/research subject/i);
  });

  it('email/refine-draft rejects requests with missing draft body', async () => {
    const res = await request(app)
      .post('/api/email/refine-draft')
      .send({ refineAction: 'shorter' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/current email body/i);
  });

  it('validate-test still 404s for an unknown test id', async () => {
    const res = await request(app).post('/api/knowledge/validate-test').send({ testId: 'test-999' });
    expect(res.status).toBe(404);
  });
});
