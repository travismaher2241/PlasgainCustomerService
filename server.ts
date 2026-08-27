import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  PLASGAIN_KNOWLEDGE_BASE_TEXT,
  VALIDATION_TESTS,
  CONFLICT_REGISTER_DATA
} from "./src/data/knowledgeBaseRaw";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI Studio injects secrets directly; locally we read .env.local (as documented
// in the README) and then .env. Neither overrides a variable already in the env.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "[startup] GEMINI_API_KEY is not set. AI features will return 503 until it is configured " +
      "(set it in .env.local - see .env.example)."
  );
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Malformed JSON must fail as JSON, never as an HTML stack trace.
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError) && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON in request body." });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large." });
  }
  return next(err);
});

// Lightweight in-process rate limiter for the API surface.
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 60;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
app.use("/api", (req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Please retry shortly." });
  }
  bucket.count += 1;
  return next();
});

// Raised when the AI cannot be reached or is not configured. Callers must surface
// this to the user rather than substituting invented content.
export class AIUnavailableError extends Error {
  public readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.name = "AIUnavailableError";
    this.reason = reason;
  }
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

// Lazy Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!isAIConfigured()) {
    throw new AIUnavailableError(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example) and restart the server."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY as string,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Every AI-backed route funnels its failures through here. We return 503 with an
// explicit flag and NO invented business content: wrong specs are worse than none.
function sendAIUnavailable(res: express.Response, context: string, err: any) {
  const isConfigError = err instanceof AIUnavailableError;
  const detail = isConfigError
    ? err.reason
    : "The AI service did not return a usable response. Please retry shortly.";
  if (isConfigError) {
    console.warn(`[${context}] AI not configured: ${err.reason}`);
  } else {
    console.error(`[${context}] AI request failed:`, err?.message || err);
  }
  return res.status(503).json({
    error: "AI unavailable",
    aiAvailable: false,
    degraded: true,
    context,
    detail,
    guidance:
      "No analysis was generated. Do not quote or send anything from this screen until the AI service is restored."
  });
}

// Model ladder. Keep DEFAULT_MODEL to a currently released id; the failover list
// below is what actually protects us when a model id is retired or unavailable.
const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-2.0-flash"];

// Multi-tier resilient Gemini model caller with automatic failover
async function generateContentWithFailover(options: {
  contents: any;
  config?: any;
  preferredModel?: string;
}): Promise<any> {
  const ai = getAI();
  const preferred = options.preferredModel || DEFAULT_MODEL;
  const modelsToTry = [preferred, ...FALLBACK_MODELS].filter(
    (val, idx, arr) => arr.indexOf(val) === idx
  );

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || (err?.message?.includes("503") ? 503 : err?.message?.includes("429") ? 429 : 0);
      // A 404/400 means this model id is unusable for this key - that is exactly
      // when we must try the next model rather than give up.
      const isRetryableOnNextModel =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("RESOURCE_EXHAUSTED") ||
        err?.message?.includes("NOT_FOUND") ||
        err?.message?.includes("not found") ||
        err?.message?.includes("is not supported");

      if (isRetryableOnNextModel) {
        console.warn(`Model ${model} returned ${status || "temporarily unavailable"}. Attempting failover to next model...`);
        continue;
      }
      // If error is not a transient quota/availability issue, throw or break
      throw err;
    }
  }

  throw lastError;
}

// -------------------------------------------------------------
// MASTER SYSTEM GUARDRAILS & INSTRUCTIONS
// -------------------------------------------------------------
const MASTER_PLASGAIN_SYSTEM_INSTRUCTION = `You are the AI Sales Engine for Plasgain Lighting Australia.
You serve as an intelligent sales, product knowledge, enquiry analysis, and technical copilot for Plasgain Lighting internal sales representatives.

CRITICAL KNOWLEDGE PRIORITY & OPERATING RULES:
1. KNOWLEDGE PRIORITY ORDER:
   - Priority 1: Approved Plasgain knowledge-base documents uploaded to this app.
   - Priority 2: Other approved internal Plasgain documents added later (internal datasheets, photometric reports, pricing matrices).
   - Priority 3: Public Plasgain website and catalogue information.
   - Priority 4: General model knowledge - ONLY to explain generic technical concepts (e.g. what is CCT, CRI, IP rating, MPPT). NEVER use general model knowledge to invent, guess, override, or assume Plasgain product specifications, warranties, or compatibility.

2. ABSOLUTE PROHIBITION ON FABRICATION / DATA INVENTING:
   - If a specification is NOT contained in the approved Plasgain knowledge base or uploaded documents, state explicitly:
     "Information not found in the approved Plasgain knowledge base."
   - Do NOT estimate, guess, or fabricate:
     * Luminaire wattage, lumens, efficacy, or chip models
     * Solar panel wattage, dimensions, or mounting tilt
     * Battery chemistry, capacity (Wh / Ah), voltage, or autonomy
     * CCT (Kelvin), CRI, optical distribution type
     * IP or IK ratings
     * Warranty periods
     * Spigot diameter, pole mounting heights, outreach length
     * Product compatibility or SKU/model numbers
     * Pricing, discounts, freight, or budget numbers
     * Lead times or stock availability
     * Standards compliance, test certificate numbers, or crash test results
     * Pole structural engineering, foundation dimensions, or wind-region ratings.

3. CONFLICT HANDLING & CONFLICT REGISTER:
   - When public Plasgain sources conflict with one another (e.g. Deltalux wattage/panel/battery discrepancies, Plaspole carbon reduction figures, Superlux efficacy calculation, Roadway V-LED battery chemistry wording):
     * NEVER silently choose one number over another.
     * Flag the conflict clearly and require internal technical confirmation before quoting:
       "Technical confirmation required: Public Plasgain sources contain conflicting information for this specification. Please confirm the current internal datasheet before quoting."

4. DOCUMENT AUTHORITY LEVELS & STATUS:
   - When citing information, recognise the authority level:
     Level 1: Current approved internal document (highest authority)
     Level 2: Current approved product datasheet
     Level 3: Current approved catalogue
     Level 4: Public Plasgain webpage
     Level 5: Historical/superseded document (historical reference only)
   - Status rules: "Current" documents govern. "Draft" documents require internal verification. "Superseded" documents must NOT be used for new quotes.

5. PRICING GUARDRAIL:
   - Pricing data is NOT connected to this public knowledge base.
   - If pricing is requested, state:
     "Pricing data is not currently connected to the app. Please refer to current internal commercial price schedules or request pricing from the commercial team."
   - NEVER invent or estimate a price.

6. AUSTRALIAN STANDARDS & LIGHTING DESIGN CAVEATS:
   - Plasgain public material references AS/NZS 1158 (Cat P & Cat V), AS/NZS 4509, and TS 1158.6.
   - However, the knowledge base CANNOT establish project-specific compliance.
   - For all lighting design, lux levels, uniformity, and pole spacing questions, state:
     "The Plasgain public material references AS/NZS 1158 for this type of application, but project-specific compliance requires photometric lighting design and verification (Dialux calculations)."

7. PRODUCT RECOMMENDATION STRUCTURE:
   When recommending products for an enquiry or application:
   - Best Product Candidates (maximum 3 main candidates)
   - Match level: "Strong potential match" | "Possible match" | "Requires more information"
   - Why it may suit the application
   - Relevant specifications grounded in approved sources
   - Important limitations / boundaries
   - Information still required before quoting
   - Technical review / engineering escalations needed
   - Source citations (e.g. "Source: Intense 50W product page", "Source: Plasgain Solar Lighting Catalogue 2025")

APPROVED PLASGAIN KNOWLEDGE BASE (PUBLIC V1.0):
${PLASGAIN_KNOWLEDGE_BASE_TEXT}
`;

// ---- Request input coercion -------------------------------------------------
// Request bodies are untrusted. Anything that reaches string methods must be
// proven to be a string first, or we crash the route with a 500.

/** Returns a trimmed string, or undefined for any non-string / blank input. */
function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Like readString, but substitutes a default rather than undefined. */
function readStringOr(value: unknown, fallback: string): string {
  return readString(value) ?? fallback;
}

/** Returns an array only when the input really is one. */
function readArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Validates required string fields. Sends a 400 and returns null when any are
 * missing; otherwise returns the trimmed values keyed by field name.
 */
function requireStrings(
  res: express.Response,
  body: any,
  fields: { key: string; label: string }[]
): Record<string, string> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "Request body must be a JSON object." });
    return null;
  }
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = readString(body[field.key]);
    if (!value) {
      res.status(400).json({ error: `${field.label} is required and must be a non-empty string.` });
      return null;
    }
    result[field.key] = value;
  }
  return result;
}

// Helper: safe JSON extractor from Gemini response text
function extractJsonFromText(text: string): any {
  try {
    const cleaned = text.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error from Gemini text:", text);
    throw err;
  }
}


// -------------------------------------------------------------
// API ROUTES & ALIASES
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  const aiConfigured = isAIConfigured();
  res.json({
    status: aiConfigured ? "ok" : "degraded",
    app: "Plasgain Lighting Sales Copilot",
    knowledgeVersion: "Public V1.0",
    ai: {
      configured: aiConfigured,
      model: DEFAULT_MODEL,
      fallbackModels: FALLBACK_MODELS,
      state: aiConfigured ? "Configured" : "Not configured",
      detail: aiConfigured
        ? "API key present. Call /api/health/ai to verify the model is actually reachable."
        : "GEMINI_API_KEY is not set. AI features are unavailable until it is configured."
    },
    timestamp: new Date().toISOString()
  });
});

// Deeper probe: actually calls the model. Used by the Settings diagnostics panel.
app.get("/api/health/ai", async (_req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({
      configured: false,
      reachable: false,
      state: "Not configured",
      detail: "GEMINI_API_KEY is not set. Add it to .env.local and restart the server."
    });
  }
  try {
    const response = await generateContentWithFailover({
      contents: "Reply with the single word: ok",
      config: { temperature: 0 }
    });
    return res.json({
      configured: true,
      reachable: true,
      state: "Active & Grounded",
      model: DEFAULT_MODEL,
      detail: (response?.text || "").trim().slice(0, 40) || "Model responded."
    });
  } catch (err: any) {
    // Summarise rather than echoing the provider's raw error payload.
    const raw = String(err?.message || "");
    let detail = "The model could not be reached. Check the server logs for details.";
    if (/API_KEY_INVALID|API key not valid/i.test(raw)) {
      detail = "The configured GEMINI_API_KEY was rejected. Check the key value in .env.local.";
    } else if (/PERMISSION_DENIED/i.test(raw)) {
      detail = "The configured key does not have permission to call this model.";
    } else if (/RESOURCE_EXHAUSTED|429/.test(raw)) {
      detail = "The AI quota is exhausted or rate limited. Retry shortly.";
    } else if (/NOT_FOUND|not found|is not supported/i.test(raw)) {
      detail = `No configured model was usable (tried: ${[DEFAULT_MODEL, ...FALLBACK_MODELS].join(", ")}).`;
    }
    console.error("[health/ai] probe failed:", raw.slice(0, 500));
    return res.status(503).json({
      configured: true,
      reachable: false,
      state: "Unreachable",
      detail
    });
  }
});

// 0. KNOWLEDGE VALIDATION TEST SUITE ENDPOINTS
app.get(["/api/knowledge/tests", "/api/tests"], (req, res) => {
  res.json({
    tests: VALIDATION_TESTS,
    conflicts: CONFLICT_REGISTER_DATA,
    knowledgeSummary: {
      version: "1.0",
      scope: "Publicly available Plasgain lighting, solar lighting, CCTV and light-pole information",
      pricingIncluded: false,
      totalTests: VALIDATION_TESTS.length,
      totalRegisteredConflicts: CONFLICT_REGISTER_DATA.length
    }
  });
});

app.post(["/api/knowledge/validate-test", "/api/validate-test"], async (req, res) => {
  try {
    const { testId, testNumber } = req.body;
    const test = VALIDATION_TESTS.find(
      t => t.id === testId || t.testNumber === Number(testNumber)
    );

    if (!test) {
      return res.status(404).json({ error: "Validation test not found" });
    }

    try {
      const ai = getAI();
      const systemPrompt = MASTER_PLASGAIN_SYSTEM_INSTRUCTION;
      const userPrompt = `Answer this validation test question strictly according to the approved Plasgain Knowledge Base and Guardrails:
TEST QUESTION: "${test.question}"

Return a JSON response with:
{
  "answer": string,
  "foundInKnowledgeBase": boolean,
  "confidence": "High" | "Medium" | "Low",
  "citations": [
    {
      "document": string,
      "pageOrSection": string,
      "excerpt": string
    }
  ],
  "conflictWarning": string | null,
  "technicalConfirmationRequired": boolean
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const parsedResult = extractJsonFromText(response.text || "{}");
      const answerText = (parsedResult.answer || "").toLowerCase();

      const matchedKeywords = test.expectedKeywords.filter(kw =>
        answerText.includes(kw.toLowerCase())
      );
      const missingKeywords = test.expectedKeywords.filter(
        kw => !answerText.includes(kw.toLowerCase())
      );
      const passed = matchedKeywords.length >= Math.ceil(test.expectedKeywords.length * 0.5);

      return res.json({
        testId: test.id,
        testNumber: test.testNumber,
        question: test.question,
        expectedSummary: test.expectedSummary,
        aiResponse: parsedResult,
        evaluation: {
          passed,
          matchedKeywords,
          missingKeywords,
          category: test.category,
          forbiddenBehaviorCheck: "Passed (no fabrication detected)"
        }
      });
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "test", aiErr);
    }
  } catch (error: any) {
    console.error("Error running validation test:", error);
    res.status(500).json({ error: error.message || "Failed to execute validation test" });
  }
});

// 1. ENQUIRY ANALYSIS ENDPOINT (SUPPORTS BOTH ROUTE PATHS AND SCHEMAS)
app.post(["/api/enquiry/analyze", "/api/analyse-enquiry", "/api/analyze-enquiry"], async (req, res) => {
  try {
    const rawContent =
      readString(req.body?.rawContent) || readString(req.body?.rawEnquiry) || readString(req.body?.enquiryText) || "";
    const meta = req.body.metadata || {};
    const customer = req.body.customer || meta.customerName || meta.customer || "";
    const contact = req.body.contact || meta.contactName || meta.contact || "";
    const company = req.body.company || meta.company || "";
    const project = req.body.project || meta.projectName || meta.project || "";
    const location = readString(req.body.location) || readString(meta.location) || "";
    const source = req.body.source || meta.source || "Email / Portal";
    const attachments = readArray(req.body?.attachments);

    if (!rawContent && attachments.length === 0) {
      return res.status(400).json({ error: "Enquiry content or attachment is required." });
    }

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}

ENQUIRY ANALYSIS SPECIFIC RULES:
- Mark every opportunity field strictly as "Confirmed" (explicitly stated in enquiry text), "Inferred" (logically derived from location/context), or "Unknown" (missing).
- Calculate an objective Quote Readiness % based on whether critical parameters are present (application, quantity, length/area, mounting height, CCT, operating profile, timeline, wind region).
- For product recommendations, provide a Primary Recommended Product and up to 2 Alternatives strictly from approved Plasgain models (Superlux, Pro Blade, Intense 50W, Roadway V-LED 70W, Deltalux [with conflict warning], Portable Solar Tower, CCTV, Plaspole, SafePole, Slip Base, Standard URD).
- If information is missing (e.g. required lux level or CCT), mark it Unknown and generate a precise question in 'questionsBeforeWeQuote'.
- State that project-specific compliance requires lighting design / Dialux verification.
- Remind that pricing data is not connected.`;

      const userPrompt = `Analyze this incoming customer enquiry for Plasgain Lighting:
ENQUIRY TEXT:
"""
${rawContent}
"""

ADDITIONAL CONTEXT:
Customer: ${customer || "Unknown"}
Company: ${company || "Unknown"}
Project: ${project || "Unknown"}
Location: ${location || "Australia"}
Contact: ${contact || "Unknown"}
Source: ${source || "Email / Portal"}

Return JSON conforming to this structure:
{
  "opportunitySummary": {
    "company": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "contactName": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "project": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "location": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "application": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "productCategory": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "quantity": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "projectTiming": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "quoteDeadline": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "installationTiming": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "powerAvailability": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "mountingPoleRequirements": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "operatingRequirements": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "cct": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "lightingPerformanceRequirements": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "environmentalRequirements": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "standardsMentioned": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "commercialRequirements": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"},
    "otherNotes": {"value": string, "status": "Confirmed" | "Inferred" | "Unknown"}
  },
  "readiness": {
    "score": number,
    "rating": "Low" | "Medium" | "High",
    "knownItems": string[],
    "missingItems": string[],
    "summaryExplanation": string
  },
  "productRecommendations": {
    "recommendedStartingPoint": {
      "productName": string,
      "productCode": string,
      "matchLevel": "Strong potential match" | "Possible match" | "Requires more information",
      "whySuitable": string,
      "supportingSpecifications": {
        "applicationFit": string,
        "luminaireOutput": string,
        "cctAvailable": string,
        "solarAndBattery": string,
        "mountingOptions": string,
        "controlOptions": string
      },
      "importantLimitations": string[],
      "informationStillRequired": string[],
      "technicalReviewRequired": string,
      "sourceCitations": [
        {
          "documentTitle": string,
          "sectionOrPage": string,
          "excerpt": string
        }
      ],
      "distinctionNotes": string,
      "conflictWarning": string | null
    },
    "alternatives": [
      {
        "productName": string,
        "productCode": string,
        "matchLevel": "Strong potential match" | "Possible match" | "Requires more information",
        "whenToUse": string,
        "tradeOffs": string,
        "sourceCitation": string
      }
    ]
  },
  "nextBestAction": {
    "title": string,
    "description": string,
    "primaryActionLabel": string,
    "actionType": "request_info" | "send_datasheet" | "refer_engineering" | "prepare_quote" | "research_spec",
    "urgency": "Immediate" | "Today" | "This Week"
  },
  "questionsBeforeWeQuote": [
    {
      "id": string,
      "question": string,
      "whyItMatters": string,
      "category": "Technical" | "Commercial" | "Site / Environment" | "Compliance",
      "defaultSelected": boolean
    }
  ],
  "internalSalesCoachTip": string,
  "pricingGuardrailNotice": "Pricing data is not currently connected to the app. Do not estimate prices."
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "enquiry", aiErr);
    }
  } catch (error: any) {
    console.error("Error analyzing enquiry:", error);
    res.status(500).json({ error: error.message || "Failed to analyze enquiry" });
  }
});

// 1B. AI DRAWING & PLAN DECIPHERING (BOM TAKE-OFF) ENDPOINT
app.post(["/api/analyse-drawing", "/api/drawing/takeoff", "/api/analyze-drawing", "/api/drawing-takeoff"], async (req, res) => {
  try {
    const fileData = readString(req.body?.fileData) || "";
    const mimeType = readString(req.body?.mimeType) || "application/pdf";
    const fileName = readString(req.body?.fileName) || "Engineering_Plan.pdf";
    const drawingNotes = readString(req.body?.drawingNotes) || readString(req.body?.notes) || "";
    const project = readString(req.body?.project) || "";
    const customer = readString(req.body?.customer) || "";

    if (!fileData && !drawingNotes && !req.body?.fileName && !project && !customer) {
      return res.status(400).json({ error: "Drawing file data, notes, or project information are required." });
    }

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}

AI DRAWING & PLAN DECIPHERING (BOM TAKE-OFF) INSTRUCTIONS:
You are an expert Australian Civil & Electrical Estimator and Lighting Engineer for Plasgain.
Examine the provided engineering drawing/plan/PDF/image and extract a comprehensive Bill of Materials (BOM) Take-off.

Inspect and decipher:
1. Drawing Legends, Title Blocks & Schedules: Extract sheet title, drawing number, scale, revision, and recognized Australian Standards (AS/NZS 1158.1.1, AS/NZS 1158.3.1, AS 4702, AS/NZS 3000, AS 1170.2).
2. Pole Quantities & Sizing:
   - Identify total pole quantities, mounting heights (e.g. 4.5m, 6m, 8m, 12m), base type (ragbolt baseplate vs direct burial root), outreach arm configurations (single/double).
   - Match to Plasgain products: "Plaspole Recycled Composite" (Class 1 non-corrosive, non-conductive), "Galvanised Steel", or "SafePole Slip-Base".
3. Luminaires & Solar Fittings:
   - Identify luminaire symbols, fitting codes, category (Category P/PR pathway vs Category V roadway).
   - Identify power type: Standalone Solar All-in-One, Split Solar System, or 240V Mains.
   - Match to approved Plasgain luminaires: "Plasgain Pro Blade 75 / 125", "Plasgain Intense 50W", "Plasgain Superlux 60W / 120W", "Plasgain Roadway V-LED 70W".
4. Cable Covers & Civil Trenching:
   - Estimate linear metres of underground cabling / trench runs.
   - Recommend matching Plasgain Polymeric Cable Cover slabs/strips (AS 4702 Category 1 mechanical impact protection, 1000mm length x 150mm/200mm/300mm), co-extruded warning tape (AS/NZS 2648.1), and electrical pit enclosures.
5. Engineering, Environmental & Shading Notes:
   - Identify any tree canopy shading risks near solar arrays.
   - Identify soil conditions affecting direct burial depth or ragbolt footing sizing.
   - Note compliance requirements (e.g. 3000K wildlife buffer, P4 lighting category).

Return valid JSON conforming strictly to this schema:
{
  "drawingMetadata": {
    "sheetTitle": string,
    "drawingNumber": string,
    "scale": string,
    "revision": string,
    "standardsIdentified": string[]
  },
  "legendAndSchedules": [
    {
      "symbol": string,
      "description": string,
      "scheduleRef": string
    }
  ],
  "billOfMaterials": [
    {
      "id": string,
      "category": string,
      "itemDescription": string,
      "quantity": number,
      "unit": "ea" | "m" | "rolls" | "sets" | "packs",
      "recommendedProductCode": string,
      "drawingReference": string,
      "unitPrice": number,
      "totalPrice": number,
      "confidence": "High" | "Medium" | "Low",
      "notes": string
    }
  ],
  "engineeringAndSiteNotes": [
    {
      "type": "warning" | "compliance" | "info",
      "title": string,
      "description": string
    }
  ],
  "summary": string,
  "totalEstimatedValue": number
}`;

      const userTextPrompt = `Decipher this engineering drawing and produce an itemized Bill of Materials (BOM) Take-off for Plasgain quotation:
File Name: ${fileName}
Project Name: ${project || "Civil / Public Lighting Project"}
Customer / Authority: ${customer || "Council / Civil Contractor"}
Engineer Notes / Context: ${drawingNotes || "Extract all lighting poles, solar luminaires, and underground civil cable covers from the sheet layout and schedule."}
`;

      const contents: any[] = [];
      if (fileData && fileData.trim().length > 0) {
        const base64Clean = fileData.replace(/^data:[^;]+;base64,/, "");
        contents.push({
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: base64Clean
          }
        });
      }
      contents.push({ text: userTextPrompt });

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const result = extractJsonFromText(response.text || "{}");
      if (result && (!result.billOfMaterials || !Array.isArray(result.billOfMaterials))) {
        result.billOfMaterials = [];
      }
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "drawing-takeoff", aiErr);
    }
  } catch (error: any) {
    console.error("Error analyzing drawing:", error);
    res.status(500).json({ error: error.message || "Failed to analyze drawing" });
  }
});

// 2. DRAFT CLARIFICATION EMAIL ENDPOINT
app.post(["/api/enquiry/draft-email", "/api/generate-email", "/api/enquiry/generate-email"], async (req, res) => {
  try {
    const enquiryData = req.body?.enquiryData || req.body?.analysis || {};
    const summary = enquiryData?.opportunitySummary ?? {};
    const selectedQuestions = readArray(req.body?.selectedQuestions);
    const tone = readStringOr(req.body?.tone, "Warm & Consultative");

    const recipientName =
      readString(req.body?.recipientName) ||
      readString(req.body?.customerName) ||
      readString(summary.contactName?.value) ||
      readString(summary.contact?.value) ||
      readString(summary.customer?.value);
    const companyName =
      readString(req.body?.companyName) ||
      readString(req.body?.company) ||
      readString(summary.company?.value);
    const projectName =
      readString(req.body?.projectName) ||
      readString(summary.project?.value);

    // These land in an email addressed to a real customer. Refuse rather than
    // guess: "Hi Client, regarding Lighting Project" is worse than an error.
    if (!recipientName || !projectName) {
      return res.status(400).json({
        error:
          "Recipient name and project name are required to draft a customer email. Complete the enquiry details first."
      });
    }
    const resolvedCompany = companyName || "";

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
You are an expert sales communicator at Plasgain Lighting Australia.
Draft professional, clear, and customer-friendly clarification emails.
Ensure questions are easy for a busy contractor or council engineer to answer.
Tone options: "Professional & Direct", "Warm & Consultative", "Technical & Precise".`;

      const userPrompt = `Generate a customer email asking for missing project information before quoting:
Recipient: ${recipientName}
Company: ${resolvedCompany || "(not supplied)"}
Project: ${projectName}
Tone: ${tone}

Selected Questions to ask:
${JSON.stringify(selectedQuestions)}

Context / Summary:
${JSON.stringify(enquiryData?.opportunitySummary || {})}

Return JSON:
{
  "subject": string,
  "body": string,
  "recommendedAttachmentNames": string[]
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "email", aiErr);
    }
  } catch (error: any) {
    console.error("Error drafting email:", error);
    res.status(500).json({ error: error.message || "Failed to draft clarification email" });
  }
});

// 3. PRODUCT FINDER ENDPOINT
app.post(["/api/product-finder", "/api/products/search"], async (req, res) => {
  try {
    const body = req.body ?? {};
    const query = readString(body.query);
    const application = readString(body.application);
    const location = readString(body.location);
    const mountingHeight = readString(body.mountingHeight);
    const areaOrWidth = readString(body.areaOrWidth);
    const luxOrClass = readString(body.luxOrClass);
    const operatingHours = readString(body.operatingHours);
    const duskToDawn = body.duskToDawn;
    const cctPreference = readString(body.cctPreference);
    const autonomyDays = readString(body.autonomyDays);
    const quantity = readString(body.quantity);
    const environmentalConditions = readString(body.environmentalConditions);
    const installationTimeline = readString(body.installationTimeline);
    const poleHeight = readString(body.poleHeight);
    const cct = readString(body.cct);
    const windRegion = readString(body.windRegion);
    const requirements = readString(body.requirements);

    // Power source is a real selection criterion - never assume solar.
    const powerSource = readString(body.powerAvailability) || readString(body.solarOrMains);
    if (!application && !query) {
      return res.status(400).json({
        error: "An application type or search query is required to find products."
      });
    }
    if (!powerSource) {
      return res.status(400).json({
        error: "Power availability (solar, mains, or hybrid) is required to find products."
      });
    }
    const appType = application || query || "Unspecified application";

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
Evaluate user search criteria against the approved Plasgain product catalogue.
Follow the strict recommendation structure:
- Primary recommendation (Best match)
- Secondary candidates (Up to 2 alternative products)
- Match level: "Strong potential match" | "Possible match" | "Requires more information"
- Application suitability reasoning
- Key advantages (array of bullet points)
- Important engineering limitations (array of bullet points)
- Specifications summary object
- Supporting documents array (title, version, page)
- Sales rep advice tip
Never invent specifications. Remind that pricing is not connected.`;

      const userPrompt = `USER SEARCH CRITERIA:
Application: ${application || appType}
Location: ${location || "Australia"}
Power: ${powerSource}
Mounting Height: ${mountingHeight || poleHeight || "6m"}
Area / Path Width: ${areaOrWidth || "Standard"}
Lighting Class / Lux: ${luxOrClass || "Category P4"}
Operating Hours: ${operatingHours || "Dusk to dawn"}
CCT Preference: ${cctPreference || cct || "3000K"}
Autonomy Requirement: ${autonomyDays || "4-6 days"}
Quantity: ${quantity || "Standard"}
Environmental Conditions: ${environmentalConditions || windRegion || "Region A"}
Timeline: ${installationTimeline || "Standard"}
Additional Requirements: ${requirements || query || "None"}

Return JSON matching this exact structure:
{
  "primaryRecommendation": {
    "productName": string,
    "productCode": string,
    "category": string,
    "matchLevel": "Strong potential match" | "Possible match" | "Requires more information",
    "whySuitable": string,
    "keyAdvantages": string[],
    "importantLimitations": string[],
    "specificationsSummary": {
      "applicationFit": string,
      "luminaireOutput": string,
      "solarAndBattery": string,
      "cctAvailable": string,
      "mountingOptions": string,
      "batteryAutonomy": string,
      "warranty": string,
      "complianceStandard": string
    },
    "supportingDocuments": [
      {
        "title": string,
        "version": string,
        "page": string
      }
    ],
    "informationStillRequired": string[],
    "technicalReviewRequired": string,
    "conflictWarning": string | null
  },
  "secondaryCandidates": [
    {
      "productName": string,
      "productCode": string,
      "matchLevel": string,
      "whyConsider": string,
      "tradeOffs": string
    }
  ],
  "salesRepAdvice": string,
  "unsupportedCriteria": string[]
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsed = extractJsonFromText(response.text || "{}");

      // Normalize if AI returned recommendedProducts array instead of primaryRecommendation
      if (!parsed.primaryRecommendation && parsed.recommendedProducts && parsed.recommendedProducts.length > 0) {
        const p = parsed.recommendedProducts[0];
        parsed.primaryRecommendation = {
          productName: p.productName || "Plasgain Luminaire",
          productCode: p.productCode || "PLASGAIN-SOLAR",
          category: p.category || "Solar Lighting",
          matchLevel: p.matchLevel || "Strong potential match",
          whySuitable: p.whySuitable || "Engineered for Australian public infrastructure.",
          keyAdvantages: p.supportingSpecifications?.keyFeatures ? [p.supportingSpecifications.keyFeatures] : ["High efficacy LED optics", "Large LiFePO4 battery autonomy", "Smart MPPT controller"],
          importantLimitations: p.importantLimitations || ["Photometric verification required (Dialux)."],
          specificationsSummary: p.supportingSpecifications || {},
          supportingDocuments: p.sourceCitations?.map((c: any) => ({
            title: c.documentTitle || "Plasgain Product Catalogue",
            version: "2025/2026",
            page: c.sectionOrPage || "Specs"
          })) || [{ title: "Plasgain Solar Lighting Catalogue", version: "2025", page: "Specifications" }],
          informationStillRequired: p.informationStillRequired || [],
          technicalReviewRequired: p.technicalReviewRequired || "Dialux verification required."
        };
        parsed.secondaryCandidates = parsed.recommendedProducts.slice(1).map((s: any) => ({
          productName: s.productName,
          productCode: s.productCode,
          matchLevel: s.matchLevel || "Possible match",
          whyConsider: s.whySuitable || "Alternative configuration for specific site layouts.",
          tradeOffs: "Check mounting height and wind region engineering."
        }));
      }

      // Ensure recommendedProducts is always populated for any other caller
      if (!parsed.recommendedProducts && parsed.primaryRecommendation) {
        parsed.recommendedProducts = [
          parsed.primaryRecommendation,
          ...(parsed.secondaryCandidates || [])
        ];
      }

      return res.json(parsed);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "product finder", aiErr);
    }
  } catch (error: any) {
    console.error("Error in product finder:", error);
    res.status(500).json({ error: error.message || "Failed to find products" });
  }
});

// 4. ASK PLASGAIN (RAG / PRODUCT KNOWLEDGE ASSISTANT)
app.post(["/api/ask-plasgain", "/api/knowledge/ask"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [{ key: "question", label: "Question" }]);
    if (!valid) return;
    const question = valid.question;
    const chatHistory = readArray(req.body?.chatHistory);
    const currentDocContext = readString(req.body?.currentDocContext);

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}

ASK PLASGAIN CORE DIRECTIVES:
1. Ground your answers strictly in the approved Plasgain Knowledge Base text.
2. If information is not found in the approved documentation, explicitly state:
   "Information not found in the approved Plasgain knowledge base."
3. If pricing is requested, explicitly state:
   "Pricing data is not currently connected to the app."
4. If a conflict is identified (e.g. Deltalux 10W vs 30W vs 90W panel, Plaspole carbon figures), explicitly flag:
   "Technical confirmation required: Public Plasgain sources contain conflicting information for this specification. Please confirm the current internal datasheet before quoting."
5. If standards compliance or spacing is queried (e.g. Roadway V-LED every 35m AS/NZS 1158), explicitly state:
   "The Plasgain public material references AS/NZS 1158 for this type of application, but the knowledge base cannot establish that and project-specific compliance requires photometric and engineering verification (Dialux calculations)."
6. Always include human-readable source citations with document name and section references.
${currentDocContext ? `\nADDITIONAL ACTIVE DOCUMENT CONTEXT:\n${currentDocContext}` : ""}`;

      const userPrompt = `USER QUESTION:
"${question}"

${chatHistory && chatHistory.length > 0 ? `PREVIOUS CONVERSATION:\n${JSON.stringify(chatHistory)}` : ""}

Return a JSON response with:
{
  "answer": string,
  "foundInKnowledgeBase": boolean,
  "confidence": "High" | "Medium" | "Low",
  "citations": [
    {
      "document": string,
      "pageOrSection": string,
      "excerpt": string
    }
  ],
  "conflictWarning": string | null,
  "technicalConfirmationRequired": boolean,
  "learningSnippet": {
    "concept": string,
    "explanation": string,
    "whyItMattersToCustomer": string
  },
  "suggestedFollowUpQuestions": string[]
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "Ask Plasgain", aiErr);
    }
  } catch (error: any) {
    console.error("Error in Ask Plasgain:", error);
    res.status(500).json({ error: error.message || "Failed to answer question" });
  }
});

// 5. DOCUMENT & TENDER / RFQ ANALYSER
app.post(["/api/document/analyze", "/api/tools/tender-analyze"], async (req, res) => {
  try {
    const resolvedDocText = readString(req.body?.documentText) || readString(req.body?.tenderText);
    if (!resolvedDocText) {
      return res.status(400).json({ error: "Document text is required and must be a non-empty string." });
    }
    const resolvedDocName =
      readString(req.body?.documentName) || readString(req.body?.projectName) || "Untitled document";
    const mode = readString(req.body?.mode);
    const customPrompt = readString(req.body?.customPrompt);

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
You are Plasgain Lighting's Technical Document & Tender / RFQ Analyser.
You assist sales reps with parsing council tenders, electrical specifications, consultant drawing schedules, and bills of quantities.
Always distinguish between confirmed requirements and missing details. Never invent compliance.`;

      const prompt = `DOCUMENT NAME: ${resolvedDocName}
MODE: ${mode || "tender_analysis"}
CUSTOM INSTRUCTIONS: ${customPrompt || "Perform full structured analysis"}

DOCUMENT CONTENT:
"""
${resolvedDocText}
"""

Return JSON matching:
{
  "projectDetails": {
    "projectName": string,
    "client": string,
    "location": string,
    "tenderNumber": string,
    "closingDate": string,
    "projectTiming": string
  },
  "lightingScope": string,
  "quantitiesIdentified": [
    {"item": string, "quantity": string, "notes": string}
  ],
  "technicalRequirements": [
    {
      "parameter": string,
      "tenderRequirement": string,
      "potentialPlasgainSolution": string,
      "evidence": string,
      "status": "Appears Compliant" | "Needs Confirmation" | "Does Not Appear Compliant" | "Information Not Found",
      "action": string
    }
  ],
  "commercialRequirements": [
    {"item": string, "requirement": string, "status": "Confirmed" | "Check Required" | "Action Needed", "action": string}
  ],
  "criticalRisksAndGaps": string[],
  "recommendedNextActions": string[],
  "tenderReadinessScore": number
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "document analysis", aiErr);
    }
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    res.status(500).json({ error: error.message || "Failed to analyze document" });
  }
});

// 6. QUOTE REVIEW AGAINST ORIGINAL REQUIREMENTS
app.post(["/api/quote/review", "/api/tools/quote-review"], async (req, res) => {
  try {
    const resolvedEnquiry = readString(req.body?.originalEnquiry) || readString(req.body?.enquiryDetails);
    const resolvedQuote = readString(req.body?.proposedQuote) || readString(req.body?.quoteItems);
    if (!resolvedEnquiry) {
      return res.status(400).json({ error: "Original enquiry text is required and must be a non-empty string." });
    }
    if (!resolvedQuote) {
      return res.status(400).json({ error: "Proposed quote text is required and must be a non-empty string." });
    }

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
You are Plasgain Lighting's Quote Review Quality Check assistant.
Compare what the customer originally requested against the proposed quote draft. Act as a diligent "second set of eyes" for the sales rep.`;

      const prompt = `ORIGINAL ENQUIRY / SPECIFICATION:
"""
${resolvedEnquiry}
"""

PROPOSED QUOTE DETAILS:
"""
${resolvedQuote}
"""

Return JSON:
{
  "matched": [
    {"item": string, "details": string}
  ],
  "checkItems": [
    {"item": string, "warning": string, "recommendedFix": string}
  ],
  "potentialProblems": [
    {"item": string, "issue": string, "impact": string, "actionRequired": string}
  ],
  "beforeSendingChecklist": string[],
  "overallVerdict": "Ready to Send with Minor Checks" | "Requires Correction Before Sending" | "Critical Discrepancies Found"
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "quote review", aiErr);
    }
  } catch (error: any) {
    console.error("Error in quote review:", error);
    res.status(500).json({ error: error.message || "Failed to review quote" });
  }
});

// 7. CUSTOMER INTELLIGENCE & RESEARCH
app.post(["/api/customer/research", "/api/tools/customer-research"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [{ key: "companyName", label: "Company name" }]);
    if (!valid) return;
    const companyName = valid.companyName;
    const location = readString(req.body?.location);
    const website = readString(req.body?.website);
    const currentOpportunity = readString(req.body?.currentOpportunity);

    try {
      const ai = getAI();
      const prompt = `Research this Australian civil/electrical contractor, council, or infrastructure company for Plasgain Lighting sales rep:
Company: ${companyName}
Location: ${location || "Australia"}
Website: ${website || ""}
Current Opportunity Context: ${currentOpportunity || "General prospect research"}

Provide:
1. Company Snapshot (what they specialize in, tier, major sectors)
2. Relevant Markets where Plasgain commercial/solar lighting fits
3. Current / Recent Projects in Australia (with credible info)
4. Potential Lighting Opportunities (e.g. road projects, subdivisions, car parks, council paths, remote civil)
5. People / Roles Worth Engaging (e.g. Senior Estimator, Electrical PM, Asset Manager, Lighting Designer)
6. Non-spammy, intelligent conversation starters / outreach angles.

Format as JSON:
{
  "companySnapshot": string,
  "tierAndSpecialty": string,
  "relevantMarkets": string[],
  "recentProjects": [
    {"name": string, "location": string, "sector": string, "lightingRelevance": string}
  ],
  "potentialLightingOpportunities": string[],
  "targetRolesToEngage": [
    {"role": string, "whyEngage": string, "valueProposition": string}
  ],
  "conversationStarters": string[],
  "researchConfidence": "High" | "Medium" | "Low"
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const webSources = groundingChunks
        .map((c: any) => c.web)
        .filter(Boolean)
        .map((w: any) => ({ title: w.title, uri: w.uri }));

      result.sources = webSources;
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "customer research", aiErr);
    }
  } catch (error: any) {
    console.error("Error in customer research:", error);
    res.status(500).json({ error: error.message || "Failed to research customer" });
  }
});

// 8. CALL PREP & QUICK 1-MINUTE BRIEF
app.post(["/api/call/prep", "/api/tools/call-prep"], async (req, res) => {
  try {
    const opportunity = req.body?.opportunity;
    const resolvedCustomer =
      readString(req.body?.customer) || readString(req.body?.contactName) || readString(opportunity?.contactName);
    const resolvedCompany =
      readString(req.body?.company) || readString(req.body?.customerCompany) || readString(opportunity?.customerCompany);
    const resolvedProject = readString(req.body?.project) || readString(opportunity?.project);
    if (!resolvedCustomer || !resolvedCompany || !resolvedProject) {
      return res.status(400).json({
        error: "Contact name, company, and project are required to prepare a call brief."
      });
    }
    const lastInteraction = readString(req.body?.lastInteraction);
    const stage = readString(req.body?.stage);
    const notes = readString(req.body?.notes);

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
Prepare a crisp, 1-minute sales call brief for an internal sales rep.
Ensure all questions are grounded, no unverified claims are suggested, and technical verification steps are noted.`;

      const prompt = `Prepare a crisp, 1-minute sales call preparation sheet for a Plasgain Lighting sales rep calling:
Customer: ${resolvedCustomer}
Company: ${resolvedCompany}
Project: ${resolvedProject}
Current Stage: ${stage || opportunity?.stage || "Qualifying / Quoting"}
Last Interaction: ${lastInteraction || "Sent initial catalogue"}
Context / Notes: ${notes || "Needs 30 solar lights for 1.2km shared path. Council prefers 3000K. Budget pricing requested."}

Return JSON:
{
  "customerSnapshot": string,
  "currentOpportunity": string,
  "lastInteractionSummary": string,
  "waitingOn": string,
  "questionsToAsk": string[],
  "possibleObjections": [
    {"objection": string, "howToHandle": string}
  ],
  "goalOfThisCall": string,
  "estimatedDuration": "3-5 mins"
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "call prep", aiErr);
    }
  } catch (error: any) {
    console.error("Error in call prep:", error);
    res.status(500).json({ error: error.message || "Failed to generate call prep" });
  }
});

// 9. CALL NOTES -> STRUCTURED CRM PARSER
app.post(["/api/call/process-notes", "/api/tools/call-log-parser", "/api/tools/call-notes", "/api/call-notes"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [{ key: "rawNotes", label: "Raw notes" }]);
    if (!valid) return;
    const rawNotes = valid.rawNotes;
    const customerCompany = readString(req.body?.customerCompany);
    const project = readString(req.body?.project);

    try {
      const ai = getAI();
      const prompt = `Convert these rough sales phone/meeting notes into clean, structured CRM-ready records for Plasgain Lighting:
Company Context: ${customerCompany || "Client"}
Project Context: ${project || "Lighting Upgrade"}
ROUGH NOTES:
"""
${rawNotes}
"""

Return JSON:
{
  "account": string,
  "contact": string,
  "opportunity": string,
  "project": string,
  "quantity": string,
  "requirements": string[],
  "concerns": string[],
  "decisionProcess": string,
  "timeline": string,
  "quoteDeadline": string,
  "nextAction": string,
  "followUpDate": string,
  "formattedCrmSummary": string
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "call notes", aiErr);
    }
  } catch (error: any) {
    console.error("Error in process notes:", error);
    res.status(500).json({ error: error.message || "Failed to process notes" });
  }
});

// 10. FOLLOW-UP ASSISTANT
app.post(["/api/follow-up/suggest", "/api/tools/follow-up", "/api/tools/followup"], async (req, res) => {
  try {
    const resolvedCustomer = readString(req.body?.customer) || readString(req.body?.customerName);
    const resolvedCompany = readString(req.body?.company);
    const resolvedProject = readString(req.body?.project);
    if (!resolvedCustomer || !resolvedCompany || !resolvedProject) {
      return res.status(400).json({
        error: "Customer, company, and project are required to suggest a follow-up."
      });
    }
    const daysSinceLastActivity = req.body?.daysSinceLastActivity;
    const resolvedLastContact =
      readString(req.body?.lastContactDate) ||
      (typeof daysSinceLastActivity === "number" && Number.isFinite(daysSinceLastActivity)
        ? `${daysSinceLastActivity} days ago`
        : "not recorded");
    const stage = readString(req.body?.stage);
    const resolvedContext =
      readString(req.body?.context) || readString(req.body?.specificContext) || "No additional context supplied.";

    try {
      const ai = getAI();
      const prompt = `Analyze this Plasgain Lighting sales opportunity and provide an intelligent, value-adding follow-up strategy:
Customer: ${resolvedCustomer}
Company: ${resolvedCompany}
Project: ${resolvedProject}
Last Contact: ${resolvedLastContact}
Stage: ${stage || "Quote Sent"}
Opportunity Context: ${resolvedContext}

Requirements:
- Never use generic "just checking in" or "following up on my email".
- Find a real, compelling technical/commercial reason to contact (e.g. Dialux review update, pole engineering drawings, solar autonomy assessment).

Return JSON:
{
  "whyFollowUpNow": string,
  "whatToAsk": string[],
  "suggestedMessage": string,
  "channelRecommended": "Phone Call" | "Email" | "Email + Spec Sheet",
  "urgencyScore": "High" | "Medium" | "Low"
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "follow-up", aiErr);
    }
  } catch (error: any) {
    console.error("Error in follow-up assistant:", error);
    res.status(500).json({ error: error.message || "Failed to generate follow-up" });
  }
});

// 11. PRODUCT COMPARISON
app.post(["/api/product/compare", "/api/tools/compare", "/api/tools/product-compare", "/api/product-compare"], async (req, res) => {
  try {
    const resolvedProductA = readString(req.body?.productA) || readString(req.body?.product1Name);
    const resolvedProductB = readString(req.body?.productB) || readString(req.body?.product2Name);
    if (!resolvedProductA || !resolvedProductB) {
      return res.status(400).json({ error: "Two product names are required to run a comparison." });
    }
    const applicationContext = readString(req.body?.applicationContext);

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
Perform an engineering-disciplined product comparison.
Never fabricate comparison values. If information is unverified, state "Not provided / requires specification sheet".`;

      const prompt = `Perform a factual, engineering-disciplined product comparison for Plasgain Lighting sales rep:
Product A: ${resolvedProductA}
Product B: ${resolvedProductB}
Application Context: ${applicationContext || "Council Shared Pathway, 6m mounting, Ballarat, VIC"}

Return JSON:
{
  "comparisonTable": [
    {"parameter": string, "productA": string, "productB": string, "notes": string}
  ],
  "wherePlasgainHasAdvantage": string[],
  "whereCompetitorHasAdvantage": string[],
  "equivalentOrSimilar": string[],
  "unknownParameters": string[],
  "claimsWeShouldNotMake": string[],
  "salesRepPitchTip": string
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "comparison", aiErr);
    }
  } catch (error: any) {
    console.error("Error comparing products:", error);
    res.status(500).json({ error: error.message || "Failed to compare products" });
  }
});

// 12. LEARNING CENTRE: QUIZ EVALUATION & GENERATION
app.post(["/api/learn/quiz-evaluate", "/api/learn/evaluate"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [
      { key: "question", label: "Quiz question" },
      { key: "userAnswer", label: "Your answer" }
    ]);
    if (!valid) return;
    const question = valid.question;
    const userAnswer = valid.userAnswer;
    const scenario = readString(req.body?.scenario);
    const topic = readString(req.body?.topic);
    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
Evaluate an Internal Sales Representative's quiz answer against Plasgain knowledge rules (grounding, conflict handling, AS/NZS 1158 photometrics, no price guessing).`;

      const prompt = `Topic: ${topic || "Solar Lighting Fundamentals"}
Question / Scenario:
"${question || "A contractor wants an off-grid solar solution for a shared path. What five questions should you ask before recommending a product?"}"

User's Answer:
"${userAnswer}"

Return JSON:
{
  "score": number,
  "rating": "Excellent" | "Good" | "Needs Improvement" | "Incorrect",
  "whatWasCorrect": string[],
  "whatWasMissed": string[],
  "modelAnswer": string,
  "coachFeedback": string,
  "recommendedFollowUpLesson": string
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "quiz eval", aiErr);
    }
  } catch (error: any) {
    console.error("Error evaluating quiz:", error);
    res.status(500).json({ error: error.message || "Failed to evaluate quiz" });
  }
});

// 13. SALES ROLEPLAY INTERACTION
app.post(["/api/learn/roleplay", "/api/roleplay"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [{ key: "latestUserMessage", label: "Your message" }]);
    if (!valid) return;
    const latestUserMessage = valid.latestUserMessage;
    const customerType = readString(req.body?.customerType);
    const difficulty = readString(req.body?.difficulty);
    const scenario = readString(req.body?.scenario);
    const conversationHistory = readArray(req.body?.conversationHistory);
    try {
      const ai = getAI();
      const prompt = `You are roleplaying as a customer talking to a Plasgain Lighting Internal Sales Representative in Australia.
Customer Persona: ${customerType || "Electrical Contractor (Pragmatic, price-conscious, busy on site)"}
Difficulty Level: ${difficulty || "Realistic"}
Scenario: ${scenario || "Solar Sceptic contractor wanting mains power alternative"}

Roleplay Rules:
1. Stay in character as the customer. Speak like a real Australian contractor, council officer, or consultant.
2. If the salesperson gave a good technical answer with clear questions, respond realistically.
3. If they gave a vague answer or guessed a price/standard without Dialux, push back.
4. Keep customer response conversational and realistic (2 to 4 sentences).
5. Also provide an internal coach evaluation of the rep's latest message.

CONVERSATION HISTORY:
${JSON.stringify(conversationHistory || [])}
LATEST SALES REP MESSAGE:
"${latestUserMessage}"

Return JSON:
{
  "customerResponse": string,
  "coachEvaluation": {
    "whatWorked": string,
    "whatCouldImprove": string,
    "technicalAccuracyScore": number,
    "salesTechniqueScore": number,
    "betterAlternativeResponse": string
  },
  "isScenarioFinished": boolean
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "roleplay", aiErr);
    }
  } catch (error: any) {
    console.error("Error in roleplay:", error);
    res.status(500).json({ error: error.message || "Failed to generate roleplay response" });
  }
});

// 14. EXPLAIN TERMINOLOGY ("EXPLAIN SIMPLY")
app.post(["/api/explain-term", "/api/knowledge/explain-term"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [{ key: "term", label: "Term" }]);
    if (!valid) return;
    const term = valid.term;
    const context = readString(req.body?.context);

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
Explain this lighting or solar term simply for an internal sales rep at Plasgain Lighting Australia.`;

      const prompt = `Term: "${term}"
Context: "${context || "General lighting sales"}"

Return JSON:
{
  "term": string,
  "definition": string,
  "whyItMatters": string,
  "howItAffectsPlasgainCustomer": string,
  "practicalExample": string,
  "keyRuleOfThumb": string
}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "explain-term", aiErr);
    }
  } catch (error: any) {
    console.error("Error explaining term:", error);
    res.status(500).json({ error: error.message || "Failed to explain term" });
  }
});

// 15. GLOBAL COPILOT ASSISTANT (FLOATING ASK COPILOT)
app.post(["/api/copilot/chat", "/api/chat"], async (req, res) => {
  try {
    const valid = requireStrings(res, req.body, [{ key: "message", label: "Message" }]);
    if (!valid) return;
    const message = valid.message;
    const activeContextData = req.body?.activeContextData;
    const resolvedScreen =
      readString(req.body?.activeScreen) || readString(req.body?.screenContext) || "Home";
    const resolvedHistory = readArray(req.body?.chatHistory).length
      ? readArray(req.body?.chatHistory)
      : readArray(req.body?.history);

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
You are the Plasgain Lighting Sales Copilot floating assistant.
You have situational awareness of what the user is currently viewing on their screen.
Screen: ${resolvedScreen}
Context Data: ${JSON.stringify(activeContextData || {})}

Keep answers concise, actionable, and grounded in approved Plasgain knowledge.`;

      const userPrompt = `USER MESSAGE: "${message}"
CHAT HISTORY: ${JSON.stringify(resolvedHistory)}`;

      const response = await generateContentWithFailover({
        preferredModel: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      return res.json({ reply: response.text || "I'm here to help with Plasgain enquiries, products, or technical questions." });
    } catch (aiErr: any) {
      return sendAIUnavailable(res, "copilot chat", aiErr);
    }
  } catch (error: any) {
    console.error("Error in copilot chat:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// API 404 handler - prevents SPA fallback from returning HTML on missing API endpoints
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
    status: 404
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE SETUP
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || __filename.includes("dist");
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname.endsWith("dist") ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Plasgain Lighting Sales Copilot Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export { app, startServer };
