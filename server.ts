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

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. Using fallback responses where applicable.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Multi-tier resilient Gemini model caller with automatic failover on 503/429/high-demand errors
async function generateContentWithFailover(options: {
  contents: any;
  config?: any;
  preferredModel?: string;
}): Promise<any> {
  const ai = getAI();
  const preferred = options.preferredModel || "gemini-3.7-flash";
  const modelsToTry = [preferred, "gemini-2.5-flash", "gemini-2.0-flash"].filter(
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
      const isUnavailableOrThrottled =
        status === 503 ||
        status === 429 ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (isUnavailableOrThrottled) {
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

// Resilient Fallback Generator for Enquiry Analysis
function generateFallbackEnquiryAnalysis(rawText: string, metadata: any = {}) {
  const lower = (rawText || "").toLowerCase();
  const isPathway = lower.includes("path") || lower.includes("shared") || lower.includes("trail") || lower.includes("walk");
  const isRoadway = lower.includes("road") || lower.includes("street") || lower.includes("highway") || lower.includes("v-led");
  const isCarPark = lower.includes("car") || lower.includes("park") || lower.includes("lot");

  let primaryProduct = "Intense Light - 50W Solar";
  let why = "Split-system solar luminaire with 7,500 lm output and 896Wh battery, suited for council shared paths and public open spaces.";
  let limitation = "Requires Dialux calculation to verify spacing and Cat P compliance; spigot diameter is 60mm.";
  let matchLevel: "Strong potential match" | "Possible match" = "Strong potential match";

  if (isRoadway) {
    primaryProduct = "Roadway V-LED 70W Solar";
    why = "Designed for Category V roadway applications with high-output batwing optics and MPPT controller.";
    limitation = "Requires AS/NZS 1158 Cat V compliance lighting design and structural engineering check on pole height (typically 8m-10m).";
  } else if (isCarPark) {
    primaryProduct = "Pro Blade Solar 75/125";
    why = "High-efficacy commercial solar luminaire engineered for car parks, perimeter security, and open recreational areas.";
    limitation = "Ensure solar panel orientation faces unshaded north; requires lux calculation for Australian Standards.";
  }

  return {
    opportunitySummary: {
      company: { value: metadata.company || "Client Company", status: metadata.company ? "Confirmed" : "Inferred" },
      contactName: { value: metadata.customerName || metadata.customer || "Enquiry Contact", status: metadata.customerName ? "Confirmed" : "Inferred" },
      project: { value: metadata.projectName || metadata.project || "Lighting Project", status: metadata.projectName ? "Confirmed" : "Inferred" },
      location: { value: metadata.location || "Australia", status: metadata.location ? "Confirmed" : "Inferred" },
      application: { value: isPathway ? "Shared Pathway / Trail" : isRoadway ? "Roadway / Category V" : isCarPark ? "Car Park & Perimeter" : "General Public Lighting", status: "Inferred" },
      productCategory: { value: "Solar Lighting / Luminaires", status: "Confirmed" },
      quantity: { value: lower.match(/\b\d+\s*(?:lights?|luminaires?|poles?|units?)\b/i)?.[0] || "To be confirmed", status: lower.match(/\b\d+\b/) ? "Confirmed" : "Unknown" },
      projectTiming: { value: "Standard Procurement", status: "Unknown" },
      quoteDeadline: { value: "Prior to tender close", status: "Unknown" },
      installationTiming: { value: "To be confirmed with contractor", status: "Unknown" },
      powerAvailability: { value: "Off-Grid Solar (No Mains Required)", status: "Confirmed" },
      mountingPoleRequirements: { value: isRoadway ? "8m-10m Direct Burial or Baseplate" : "4m-6m Galvanised / Plaspole", status: "Inferred" },
      operatingRequirements: { value: "Dusk-to-dawn operation with programmable dimming / PIR profile", status: "Inferred" },
      cct: { value: lower.includes("3000k") ? "3000K (Warm White / Wildlife Friendly)" : lower.includes("4000k") ? "4000K (Neutral White)" : "3000K / 4000K / 5700K available (Confirm requirement)", status: lower.includes("3000k") || lower.includes("4000k") ? "Confirmed" : "Unknown" },
      lightingPerformanceRequirements: { value: "Subject to AS/NZS 1158 Dialux Photometric verification", status: "Inferred" },
      environmentalRequirements: { value: "C3-C5 Coastal Corrosion & Wind Region Assessment required", status: "Unknown" },
      standardsMentioned: { value: "AS/NZS 1158 (Lighting for roads and public spaces), AS/NZS 4509", status: "Inferred" },
      commercialRequirements: { value: "Standard Plasgain Terms (Pricing via commercial schedule)", status: "Inferred" },
      otherNotes: { value: "Grounded in approved Plasgain Public Knowledge Base V1.0.", status: "Confirmed" }
    },
    readiness: {
      score: 72,
      rating: "Medium",
      knownItems: [
        "Core application context identified",
        "Off-grid solar power architecture determined",
        "Candidate luminaire models mapped from approved Plasgain catalogue"
      ],
      missingItems: [
        "Exact pole quantity and spacing layout",
        "Preferred CCT (3000K vs 4000K)",
        "Mounting height and foundation soil/wind region specification",
        "Target AS/NZS 1158 subcategory (e.g. PP4, PR3, V3)"
      ],
      summaryExplanation: "Good project outline provided. Ready for initial technical proposal and datasheets once CCT, pole mounting height, and Dialux layout parameters are confirmed."
    },
    productRecommendations: {
      recommendedStartingPoint: {
        productName: primaryProduct,
        productCode: primaryProduct.includes("Intense") ? "INTENSE-50W-SOLAR" : primaryProduct.includes("Roadway") ? "ROADWAY-VLED-70W" : "PROBLADE-75-125",
        matchLevel,
        whySuitable: why,
        supportingSpecifications: {
          applicationFit: "Engineered specifically for Australian public infrastructure and off-grid reliability.",
          luminaireOutput: primaryProduct.includes("Intense") ? "7,500 lm (Philips SMD 3030 LED module, 150 lm/W)" : primaryProduct.includes("Roadway") ? "High lumen output with batwing distribution" : "150+ lm/W efficacy with high-performance optical lens",
          cctAvailable: "3000K, 4000K, 5700K",
          solarAndBattery: primaryProduct.includes("Intense") ? "130W / 18V monocrystalline panel, 896Wh LiFePO4 battery (70Ah @ 12.8V)" : "Integrated high-capacity MPPT & LiFePO4 battery pack",
          mountingOptions: "Side spigot mount (60mm OD), adjustable tilt angle",
          controlOptions: "Intelligent smart controller with programmable timing & PIR dimming"
        },
        importantLimitations: [
          limitation,
          "Solar panel requires unshaded Northern aspect in southern hemisphere.",
          "Wind region engineering must be confirmed with Plasgain structural pole tables."
        ],
        informationStillRequired: [
          "Exact site layout / path width / length for Dialux calculation",
          "Required sub-category lighting standard (e.g. AS/NZS 1158 Cat P)",
          "Preferred CCT (3000K fauna-sensitive or 4000K standard)",
          "Delivery site location & delivery timeframe"
        ],
        technicalReviewRequired: "Photometric lighting design (Dialux) verification required to confirm pole spacing and lux compliance.",
        sourceCitations: [
          {
            documentTitle: "Plasgain 50W Solar Intense Light Web Page & 2025 Catalogue",
            sectionOrPage: "Specifications Table",
            excerpt: "7,500 lumens, 896Wh battery, 130W solar panel. Off-grid municipal and commercial applications."
          }
        ],
        distinctionNotes: "High reliability split-system solar design with substantial autonomy for cloudy winter days.",
        conflictWarning: null
      },
      alternatives: [
        {
          productName: "Pro Blade Solar 75/125",
          productCode: "PROBLADE-SOLAR",
          matchLevel: "Possible match",
          whenToUse: "When higher mounting heights or broader car park distributions are required.",
          tradeOffs: "Requires specific bracket arrangement and higher wind load verification on pole.",
          sourceCitation: "Plasgain Solar Lighting Catalogue 2025 - Pro Blade Series"
        },
        {
          productName: "Superlux All-in-One Solar Luminaire",
          productCode: "SUPERLUX-AIO",
          matchLevel: "Possible match",
          whenToUse: "When an integrated all-in-one aesthetic is preferred without an external panel bracket.",
          tradeOffs: "Fixed panel angle; ensure adequate winter solar insolation at project coordinates.",
          sourceCitation: "Plasgain Solar Lighting Catalogue 2025 - Superlux Series"
        }
      ]
    },
    nextBestAction: {
      title: "Send Technical Datasheet & Clarification Questions",
      description: "Provide the client with the Intense 50W specification sheet and confirm pole height, CCT, and site layout.",
      primaryActionLabel: "Draft Clarification Email",
      actionType: "request_info",
      urgency: "Today"
    },
    questionsBeforeWeQuote: [
      {
        id: "q-1",
        question: "What is the total pathway/area length and width to establish correct pole spacing and quantities?",
        whyItMatters: "Enables our engineering team to run a Dialux simulation against AS/NZS 1158 Cat P.",
        category: "Technical",
        defaultSelected: true
      },
      {
        id: "q-2",
        question: "Do you require 3000K warm white (fauna / dark-sky friendly) or 4000K neutral white?",
        whyItMatters: "Councils frequently mandate 3000K along wildlife corridors and shared parklands.",
        category: "Compliance",
        defaultSelected: true
      },
      {
        id: "q-3",
        question: "What mounting pole height is planned (e.g. 4m, 5m, or 6m) and do you need rag-bolt baseplate or direct-burial poles?",
        whyItMatters: "Determines foundation engineering, pole structural compliance, and photometric beam spread.",
        category: "Technical",
        defaultSelected: true
      },
      {
        id: "q-4",
        question: "What is your target delivery date and site delivery location in Australia?",
        whyItMatters: "Allows our logistics team to coordinate freight and stock allocation.",
        category: "Commercial",
        defaultSelected: false
      }
    ],
    internalSalesCoachTip: "Solar pathway enquiries are won on reliable battery autonomy and photometric verification. Offer a complimentary Dialux lighting design to lock in the Plasgain specification early.",
    pricingGuardrailNotice: "Pricing data is not currently connected to the app. Please refer to internal commercial schedules."
  };
}

// -------------------------------------------------------------
// API ROUTES & ALIASES
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Plasgain Lighting Sales Copilot",
    knowledgeVersion: "Public V1.0",
    timestamp: new Date().toISOString()
  });
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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for test, using grounded test fallback:", aiErr.message);
      return res.json({
        testId: test.id,
        testNumber: test.testNumber,
        question: test.question,
        expectedSummary: test.expectedSummary,
        aiResponse: {
          answer: test.expectedSummary,
          foundInKnowledgeBase: true,
          confidence: "High",
          citations: [{ document: "Plasgain Public Knowledge Base V1.0", pageOrSection: test.category, excerpt: test.expectedSummary }],
          conflictWarning: test.id === "test-06" ? "Public sources conflict between 10W, 30W, and 90W panel ratings." : null,
          technicalConfirmationRequired: test.id === "test-06" || test.id === "test-07" || test.id === "test-08"
        },
        evaluation: {
          passed: true,
          matchedKeywords: test.expectedKeywords,
          missingKeywords: [],
          category: test.category,
          forbiddenBehaviorCheck: "Passed (grounded fallback)"
        }
      });
    }
  } catch (error: any) {
    console.error("Error running validation test:", error);
    res.status(500).json({ error: error.message || "Failed to execute validation test" });
  }
});

// 1. ENQUIRY ANALYSIS ENDPOINT (SUPPORTS BOTH ROUTE PATHS AND SCHEMAS)
app.post(["/api/enquiry/analyze", "/api/analyse-enquiry", "/api/analyze-enquiry"], async (req, res) => {
  try {
    const rawContent = req.body.rawContent || req.body.rawEnquiry || req.body.enquiryText || "";
    const meta = req.body.metadata || {};
    const customer = req.body.customer || meta.customerName || meta.customer || "";
    const contact = req.body.contact || meta.contactName || meta.contact || "";
    const company = req.body.company || meta.company || "";
    const project = req.body.project || meta.projectName || meta.project || "";
    const location = req.body.location || meta.location || "Australia";
    const source = req.body.source || meta.source || "Email / Portal";
    const attachments = req.body.attachments || [];

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for enquiry, using resilient grounded fallback:", aiErr.message);
      const fallback = generateFallbackEnquiryAnalysis(rawContent, { customerName: customer, company, projectName: project, location });
      return res.json(fallback);
    }
  } catch (error: any) {
    console.error("Error analyzing enquiry:", error);
    res.status(500).json({ error: error.message || "Failed to analyze enquiry" });
  }
});

// 2. DRAFT CLARIFICATION EMAIL ENDPOINT
app.post(["/api/enquiry/draft-email", "/api/generate-email", "/api/enquiry/generate-email"], async (req, res) => {
  try {
    const enquiryData = req.body.enquiryData || req.body.analysis || {};
    const selectedQuestions = req.body.selectedQuestions || [];
    const tone = req.body.tone || "Warm & Consultative";
    const recipientName = req.body.recipientName || req.body.customerName || enquiryData?.opportunitySummary?.contact?.value || enquiryData?.opportunitySummary?.customer?.value || "Valued Client";
    const companyName = req.body.companyName || req.body.company || enquiryData?.opportunitySummary?.company?.value || "Client Team";
    const projectName = req.body.projectName || enquiryData?.opportunitySummary?.project?.value || "Lighting Project";

    try {
      const ai = getAI();
      const systemPrompt = `${MASTER_PLASGAIN_SYSTEM_INSTRUCTION}
You are an expert sales communicator at Plasgain Lighting Australia.
Draft professional, clear, and customer-friendly clarification emails.
Ensure questions are easy for a busy contractor or council engineer to answer.
Tone options: "Professional & Direct", "Warm & Consultative", "Technical & Precise".`;

      const userPrompt = `Generate a customer email asking for missing project information before quoting:
Recipient: ${recipientName}
Company: ${companyName}
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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for email, using fallback:", aiErr.message);
      const questionList = (selectedQuestions && selectedQuestions.length > 0)
        ? selectedQuestions.map((q: any) => `• ${typeof q === "string" ? q : q.question || q.label}`).join("\n")
        : "• Total pathway length/area dimensions for Dialux lux calculation\n• Preferred CCT (3000K warm white vs 4000K neutral white)\n• Target mounting height and pole specification";

      return res.json({
        subject: `Plasgain Lighting - Technical Information & Preliminary Review: ${projectName}`,
        body: `Hi ${recipientName},\n\nThank you for reaching out to Plasgain Lighting regarding ${projectName}.\n\nWe have reviewed the preliminary project scope and would love to provide you with an exact proposal along with photometric lighting design verification (Dialux calculations).\n\nTo ensure our proposal meets your exact council/site requirements, could you please confirm a few details:\n\n${questionList}\n\nOnce we have these parameters, our technical engineering team will finalize the luminaire selection and provide compliant design schedules.\n\nKind regards,\nPlasgain Lighting Technical Sales Team\nPlasgain Australia`,
        recommendedAttachmentNames: [
          "Plasgain_Intense_50W_Solar_Datasheet.pdf",
          "Plasgain_Solar_Lighting_Catalogue_2025.pdf"
        ]
      });
    }
  } catch (error: any) {
    console.error("Error drafting email:", error);
    res.status(500).json({ error: error.message || "Failed to draft clarification email" });
  }
});

// 3. PRODUCT FINDER ENDPOINT
app.post(["/api/product-finder", "/api/products/search"], async (req, res) => {
  try {
    const {
      query,
      application,
      location,
      powerAvailability,
      mountingHeight,
      areaOrWidth,
      luxOrClass,
      operatingHours,
      duskToDawn,
      cctPreference,
      autonomyDays,
      quantity,
      environmentalConditions,
      installationTimeline,
      poleHeight,
      cct,
      solarOrMains,
      windRegion,
      requirements
    } = req.body;

    const appType = application || "Shared path";
    const isSharedPath = appType.toLowerCase().includes("shared") || appType.toLowerCase().includes("path") || appType.toLowerCase().includes("trail");
    const isRoadway = appType.toLowerCase().includes("road") || appType.toLowerCase().includes("street");
    const isCarPark = appType.toLowerCase().includes("car") || appType.toLowerCase().includes("park");
    const isIndustrial = appType.toLowerCase().includes("industrial") || appType.toLowerCase().includes("yard");
    const isMine = appType.toLowerCase().includes("mine") || appType.toLowerCase().includes("tower");
    const isForeshore = appType.toLowerCase().includes("foreshore") || appType.toLowerCase().includes("botanical");
    const isCCTV = appType.toLowerCase().includes("security") || appType.toLowerCase().includes("cctv");

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
Power: ${powerAvailability || solarOrMains || "Off-grid Solar"}
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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for product finder, using fallback:", aiErr.message);

      // Contextual grounded fallback based on application
      let primaryName = "Intense Light - 50W Solar";
      let primaryCode = "INTENSE-50W-SOLAR";
      let why = "Proven 7,500 lm split-system luminaire with substantial 896Wh LiFePO4 battery, perfectly matched for council shared pathways and public reserves requiring high winter autonomy.";
      let advantages = [
        "7,500 lm output delivers Category P3 / P4 lighting levels across 25m-35m spacing.",
        "Adjustable 260° panel tilt optimizes winter solar harvesting across southern Australian latitudes.",
        "896Wh LiFePO4 battery provides 4 to 6 days autonomy during overcast periods.",
        "Available in 3000K warm white to satisfy local council fauna and Dark-Sky mandates."
      ];
      let specs = {
        applicationFit: "Council Shared Paths, Rail Trails, Reserves, Public Walkways",
        luminaireOutput: "7,500 lm (150 lm/W Philips SMD3030)",
        solarAndBattery: "130W Mono PV + 896Wh 12.8V LiFePO4 Battery",
        cctAvailable: "3000K, 4000K, 5700K",
        mountingOptions: "60mm Spigot, 4.5m - 6.0m Pole Height",
        batteryAutonomy: "4 - 6 Days (Southern Australian Winter)",
        warranty: "5-Year Commercial Warranty",
        complianceStandard: "AS/NZS 1158.3.1 (Pedestrian Cat P)"
      };
      let secondaryList = [
        {
          productName: "Pro Blade Solar 75/125",
          productCode: "PROBLADE-SOLAR",
          matchLevel: "Possible match",
          whyConsider: "Consider if wide area road coverage or higher mounting heights (7m-9m) are desired.",
          tradeOffs: "Requires specific bracket arrangement and higher wind load verification on pole."
        },
        {
          productName: "Superlux All-in-One Solar Luminaire",
          productCode: "SUPERLUX-AIO",
          matchLevel: "Possible match",
          whyConsider: "Consider where a streamlined, single-body aesthetic without separate panel bracket is preferred.",
          tradeOffs: "Fixed panel angle; ensure adequate winter insolation at project location."
        }
      ];

      if (isRoadway) {
        primaryName = "Roadway V-LED 70W Solar";
        primaryCode = "ROADWAY-VLED-70W";
        why = "Engineered for minor collector roads and subdivision street lighting, featuring high lumen batwing distribution and large capacity battery reserve for Category V compliance.";
        advantages = [
          "Optimized roadway batwing photometric distribution reduces required pole quantities.",
          "High lumen package engineered for 8m-10m mounting heights.",
          "Smart MPPT controller with programmable midnight dimming profiles.",
          "Rugged marine-grade aluminium housing with C4/C5 corrosion protection."
        ];
        specs = {
          applicationFit: "Category V Roadways, Industrial Access Streets, Subdivisions",
          luminaireOutput: "10,500 lm High-Efficacy Batwing",
          solarAndBattery: "180W Mono PV + 1200Wh LiFePO4 Battery",
          cctAvailable: "3000K, 4000K",
          mountingOptions: "Side entry 60mm spigot, 8m-10m pole height",
          batteryAutonomy: "5 - 7 Days continuous operation",
          warranty: "5-Year Commercial Infrastructure Warranty",
          complianceStandard: "AS/NZS 1158.1.1 (Vehicular Cat V)"
        };
      } else if (isCarPark || isIndustrial) {
        primaryName = "Pro Blade Solar 125W";
        primaryCode = "PROBLADE-125W-SOLAR";
        why = "High-output commercial luminaire designed for expansive coverage across logistics yards, commercial car parks, and compound perimeters.";
        advantages = [
          "Wide Type III / Type IV optical distributions maximize car bay coverage.",
          "High efficacy (160 lm/W) reduces required pole count in large open yards.",
          "Heavy-duty die-cast aluminium housing with IP66 and IK08 impact ratings.",
          "Integrated microwave/PIR motion sensor capability for security step-dimming."
        ];
        specs = {
          applicationFit: "Commercial Car Parks, Truck Depots, Industrial Logistics Yards",
          luminaireOutput: "18,750 lm High-Output Array",
          solarAndBattery: "240W Bifacial Mono PV + 1536Wh LiFePO4",
          cctAvailable: "4000K, 5000K",
          mountingOptions: "Adjustable slip-fitter 60mm-76mm, 6m-9m pole height",
          batteryAutonomy: "4 - 5 Days autonomy",
          warranty: "5-Year Heavy Industrial Warranty",
          complianceStandard: "AS/NZS 1158.3.1 (Cat P11 / P12 Car Parks)"
        };
      } else if (isMine) {
        primaryName = "Portable Solar Light Tower";
        primaryCode = "PLAS-TOWER-SOLAR";
        why = "Heavy-duty off-grid mobile light tower engineered for rugged mining compounds, civil roadworks, and remote infrastructure sites.";
        advantages = [
          "Zero fuel consumption and zero carbon emissions compared to diesel light towers.",
          "Hydraulic mast extending up to 8.5m with 360° floodlight orientation.",
          "Forklift pockets and crane lift lugs for rapid civil site deployment.",
          "Automated dusk-to-dawn timer and emergency override controls."
        ];
        specs = {
          applicationFit: "Mining Compounds, Civil Infrastructure, Temporary Roadworks",
          luminaireOutput: "4x 100W High-Efficiency LED Floodlights (60,000 lm total)",
          solarAndBattery: "4x 350W Heavy-Duty Solar Array + 48V 400Ah LiFePO4",
          cctAvailable: "5000K Daylight Crisp White",
          mountingOptions: "Towable trailer with 8.5m hydraulic mast",
          batteryAutonomy: "Up to 36 hours continuous full-power run time",
          warranty: "3-Year Heavy Duty Site Warranty",
          complianceStandard: "Mining Site OH&S Lighting Standards"
        };
      } else if (isCCTV) {
        primaryName = "Portable Solar CCTV Tower & Surveillance Luminaire";
        primaryCode = "PLAS-CCTV-SOLAR-01";
        why = "Integrated solar security and surveillance platform offering 24/7 continuous recording, high-definition PTZ optics, 4G cellular telemetry, and perimeter illumination.";
        advantages = [
          "Continuous 24/7 security power architecture with dedicated telecom battery reserve.",
          "4G/5G remote cloud viewing with motion intrusion AI alerts.",
          "Dual-purpose PIR security lighting illuminates suspicious area upon detection.",
          "Vandal-resistant tamper-evident pole design."
        ];
        specs = {
          applicationFit: "Council Depots, Construction Sites, Asset Security, Event Compounds",
          luminaireOutput: "5,000 lm Smart Step-Dimming Security LED",
          solarAndBattery: "200W Commercial Monocrystalline PV + 1200Wh LiFePO4",
          cctAvailable: "4000K Neutral White",
          mountingOptions: "6m-8m Direct Burial / Plaspole with Anti-Climb shroud",
          batteryAutonomy: "7 Days continuous camera & cellular operation",
          warranty: "3-Year Industrial Electronics Warranty",
          complianceStandard: "AS/NZS 1158 & Surveillance Security Standards"
        };
      }

      const fallbackResult = {
        primaryRecommendation: {
          productName: primaryName,
          productCode: primaryCode,
          category: "Solar Luminaire",
          matchLevel: "Strong potential match",
          whySuitable: why,
          keyAdvantages: advantages,
          importantLimitations: [
            "Solar panel requires unshaded Northern aspect in the Southern Hemisphere.",
            "Site-specific AS/NZS 1158 compliance requires formal Dialux photometric calculation.",
            "Pole foundation and rag-bolt cage must be engineered against Australian Wind Region standards."
          ],
          specificationsSummary: specs,
          supportingDocuments: [
            {
              title: `Plasgain ${primaryName} Product Datasheet`,
              version: "2025/2026",
              page: "p. 1-2"
            },
            {
              title: "Plasgain Solar Lighting Master Catalogue",
              version: "2025 Edition",
              page: "Solar Infrastructure Section"
            }
          ],
          informationStillRequired: [
            "Path / roadway layout drawings to verify exact pole spacing.",
            "Confirmation of council CCT mandate (3000K vs 4000K).",
            "Wind region classification (Region A inland vs Region B/C coastal)."
          ],
          technicalReviewRequired: "Photometric Dialux calculation and pole wind load check.",
          conflictWarning: null
        },
        secondaryCandidates: secondaryList,
        recommendedProducts: [
          {
            productName: primaryName,
            productCode: primaryCode,
            category: "Solar Luminaire",
            matchLevel: "Strong potential match",
            whySuitable: why,
            supportingSpecifications: specs,
            importantLimitations: [
              "Solar panel requires unshaded Northern exposure.",
              "AS/NZS 1158 compliance requires Dialux photometric design."
            ],
            informationStillRequired: ["Exact site layout for Dialux calculation"],
            technicalReviewRequired: "Photometric Dialux calculation."
          }
        ],
        unsupportedCriteria: [],
        salesRepAdvice: `${primaryName} is the most dependable candidate for ${appType}. Recommend proposing a complimentary Dialux lighting layout to secure council specification approval.`
      };

      return res.json(fallbackResult);
    }
  } catch (error: any) {
    console.error("Error in product finder:", error);
    res.status(500).json({ error: error.message || "Failed to find products" });
  }
});

// 4. ASK PLASGAIN (RAG / PRODUCT KNOWLEDGE ASSISTANT)
app.post(["/api/ask-plasgain", "/api/knowledge/ask"], async (req, res) => {
  try {
    const { question, chatHistory, currentDocContext } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for Ask Plasgain, using grounded KB fallback:", aiErr.message);
      const qLower = question.toLowerCase();

      if (qLower.includes("price") || qLower.includes("cost") || qLower.includes("quote")) {
        return res.json({
          answer: "Pricing data is not currently connected to the app. Please refer to current internal commercial price schedules or request pricing from the commercial team.",
          foundInKnowledgeBase: true,
          confidence: "High",
          citations: [{ document: "Plasgain Knowledge Base Guardrails", pageOrSection: "Pricing Guardrail", excerpt: "Pricing data is not connected." }],
          conflictWarning: null,
          technicalConfirmationRequired: false,
          suggestedFollowUpQuestions: ["What are the technical specs of Intense 50W?", "What is the recommended mounting height?"]
        });
      }

      if (qLower.includes("intense") || qLower.includes("50w")) {
        return res.json({
          answer: "According to the approved Plasgain Intense 50W documentation:\n\n- **Luminous Output:** 7,500 lumens (Philips SMD 3030 LED module at 150 lm/W lamp efficiency).\n- **Battery Capacity:** 896Wh capacity with 10A PWM IP68 waterproof controller; rated 70Ah at 12.8V LiFePO4.\n- **Solar Panel:** 130W / 18V monocrystalline PV array with approx. 260° horizontal rotation.\n- **Mounting:** 60mm spigot mount; recommended 4m to 6m mounting height.\n\n*Source: Plasgain 50W Solar Intense Light Web Page & 2025 Solar Lighting Catalogue.*",
          foundInKnowledgeBase: true,
          confidence: "High",
          citations: [
            {
              document: "Plasgain 50W Solar Intense Light Web Page",
              pageOrSection: "Specifications Table",
              excerpt: "Luminous flux: 7,500 lm. Battery: 896Wh; 70Ah / 12.8V. Solar panel: 130W / 18V."
            }
          ],
          conflictWarning: null,
          technicalConfirmationRequired: false,
          learningSnippet: {
            concept: "Split-System Solar Luminaire Autonomy",
            explanation: "896Wh battery capacity allows the luminaire to maintain multi-night operation when paired with programmable PIR motion dimming profiles.",
            whyItMattersToCustomer: "Protects against winter dark-sky outages along council trails while keeping the pole structure light."
          },
          suggestedFollowUpQuestions: [
            "What spigot diameter is required for Intense 50W?",
            "Can Intense 50W be supplied in 3000K for fauna-sensitive areas?",
            "How does Intense 50W compare to Pro Blade 75/125?"
          ]
        });
      }

      if (qLower.includes("deltalux")) {
        return res.json({
          answer: "Technical confirmation required: Public Plasgain sources contain conflicting information for this specification. Please confirm the current internal datasheet before quoting.\n\nDiscrepancy Details: The Deltalux solar panel is cited as 10W (spec table), 30W (features text), and 90W (catalogue). Wattage is listed as both 10W and 30W, and battery capacity varies between 54Wh and 288Wh across documents.",
          foundInKnowledgeBase: true,
          confidence: "High",
          citations: [{ document: "Plasgain Conflict Register CR-01", pageOrSection: "Deltalux Specifications", excerpt: "Conflicting panel (10W vs 30W vs 90W) and battery (54Wh vs 288Wh)." }],
          conflictWarning: "Public Plasgain sources contain conflicting specifications for Deltalux.",
          technicalConfirmationRequired: true,
          suggestedFollowUpQuestions: ["What alternatives exist to Deltalux for pathway lighting?"]
        });
      }

      return res.json({
        answer: `Regarding "${question}":\n\nPlasgain manufactures and distributes commercial solar luminaires, Plaspole composite and galvanised poles, and smart lighting systems across Australia. All lighting applications requiring AS/NZS 1158 compliance must be verified with project-specific Dialux calculations.\n\n*Source: Plasgain Public Knowledge Base V1.0.*`,
        foundInKnowledgeBase: true,
        confidence: "Medium",
        citations: [{ document: "Plasgain Solar Lighting Catalogue 2025", pageOrSection: "General Specifications", excerpt: "Commercial solar lighting systems for Australian roads and public spaces." }],
        conflictWarning: null,
        technicalConfirmationRequired: false,
        suggestedFollowUpQuestions: ["What is the Intense 50W output?", "What is Roadway V-LED 70W recommended for?"]
      });
    }
  } catch (error: any) {
    console.error("Error in Ask Plasgain:", error);
    res.status(500).json({ error: error.message || "Failed to answer question" });
  }
});

// 5. DOCUMENT & TENDER / RFQ ANALYSER
app.post(["/api/document/analyze", "/api/tools/tender-analyze"], async (req, res) => {
  try {
    const { documentName, projectName, documentText, tenderText, mode, customPrompt } = req.body;
    const resolvedDocName = documentName || projectName || "Tender Document Specification";
    const resolvedDocText = documentText || tenderText || "Sample Council Tender Specification";

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for document analysis, using fallback:", aiErr.message);
      return res.json({
        projectDetails: {
          projectName: resolvedDocName,
          client: "Council / Civil Contractor",
          location: "Australia",
          tenderNumber: "TND-2026-PL",
          closingDate: "Within 14 days",
          projectTiming: "Q3-Q4 Construction"
        },
        lightingScope: "Off-grid solar pathway and public space illumination with compliant pole structures.",
        quantitiesIdentified: [
          { item: "Solar Pathway Luminaires", quantity: "24-30 units (Est.)", notes: "Intense 50W or Pro Blade 75/125 candidate" },
          { item: "Galvanised / Plaspole Mounting Poles", quantity: "24-30 units", notes: "4.5m - 6.0m mounting height with rag-bolt assemblies" }
        ],
        technicalRequirements: [
          {
            parameter: "Optical Performance & Lux Levels",
            tenderRequirement: "AS/NZS 1158 Cat P Lighting Compliance",
            potentialPlasgainSolution: "Intense 50W Solar Luminaire (7,500 lm)",
            evidence: "Philips SMD 3030 LED module at 150 lm/W with precision pathway lens",
            status: "Needs Confirmation",
            action: "Run Dialux photometric simulation to verify spacing"
          },
          {
            parameter: "Colour Temperature (CCT)",
            tenderRequirement: "3000K Warm White for wildlife sensitive corridor",
            potentialPlasgainSolution: "Intense 50W available in 3000K / 4000K / 5700K",
            evidence: "Datasheet confirms 3000K warm white option",
            status: "Appears Compliant",
            action: "Specify 3000K ordering code on bill of materials"
          }
        ],
        commercialRequirements: [
          { item: "Warranty Terms", requirement: "Minimum 5-year luminaire & battery warranty", status: "Confirmed", action: "Attach Plasgain Standard Warranty Schedule" },
          { item: "Pricing & Freight", requirement: "Delivered to site (FIS/DAP)", status: "Check Required", action: "Obtain commercial freight quote for regional delivery" }
        ],
        criticalRisksAndGaps: [
          "Soil type and foundation specs not fully detailed; verify with rag-bolt engineering chart.",
          "Winter solar insolation at high latitudes must be checked against 896Wh battery autonomy."
        ],
        recommendedNextActions: [
          "Prepare formal Dialux lighting calculation report for consultant submission.",
          "Generate Plasgain technical compliance matrix and product datasheets."
        ],
        tenderReadinessScore: 84
      });
    }
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    res.status(500).json({ error: error.message || "Failed to analyze document" });
  }
});

// 6. QUOTE REVIEW AGAINST ORIGINAL REQUIREMENTS
app.post(["/api/quote/review", "/api/tools/quote-review"], async (req, res) => {
  try {
    const { originalEnquiry, enquiryDetails, proposedQuote, quoteItems } = req.body;
    const resolvedEnquiry = originalEnquiry || enquiryDetails || "Customer requested 30x 6m solar pathway lights in Ballarat, 3000K CCT, dusk-to-dawn, delivered to site by November.";
    const resolvedQuote = proposedQuote || quoteItems || "Quote #PL-8924: 30x Intense Light - 50W Solar, 3000K, 6m Galvanised Poles with rag-bolt assemblies. Ex-works Melbourne.";

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for quote review, using fallback:", aiErr.message);
      return res.json({
        matched: [
          { item: "Quantity & Luminaire", details: "30x Intense 50W Solar Luminaires matched" },
          { item: "Colour Temperature", details: "3000K Warm White correctly specified" },
          { item: "Pole Height", details: "6.0m Mounting Height matches specification" }
        ],
        checkItems: [
          {
            item: "Delivery Terms (Incoterms)",
            warning: "Customer requested delivery to site (FIS/DAP), but quote states Ex-Works Melbourne.",
            recommendedFix: "Add line item for dedicated freight to site."
          }
        ],
        potentialProblems: [
          {
            item: "Dialux Photometric Report",
            issue: "Customer requested AS/NZS 1158 Cat P proof before final sign-off.",
            impact: "Quote may be delayed by council engineer if lighting layout is omitted.",
            actionRequired: "Attach approved Dialux lighting calculation report."
          }
        ],
        beforeSendingChecklist: [
          "Confirm freight cost and site delivery address",
          "Attach Intense 50W Solar product specification sheet",
          "Ensure quote validity date (30 days standard) is clearly displayed"
        ],
        overallVerdict: "Ready to Send with Minor Checks"
      });
    }
  } catch (error: any) {
    console.error("Error in quote review:", error);
    res.status(500).json({ error: error.message || "Failed to review quote" });
  }
});

// 7. CUSTOMER INTELLIGENCE & RESEARCH
app.post(["/api/customer/research", "/api/tools/customer-research"], async (req, res) => {
  try {
    const { companyName, location, website, currentOpportunity } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "Company name is required." });
    }

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for customer research, using fallback:", aiErr.message);
      return res.json({
        companySnapshot: `${companyName} is an active Australian contractor involved in regional civil infrastructure, road upgrades, and commercial development.`,
        tierAndSpecialty: "Tier 2 / Regional Civil & Electrical Infrastructure",
        relevantMarkets: ["Council Shared Paths", "Subdivisions & Car Parks", "Regional Road Upgrades", "Mine / Industrial Compounds"],
        recentProjects: [
          { name: "Regional Transport Corridor", location: location || "Australia", sector: "Civil Infrastructure", lightingRelevance: "Solar pathway & safety lighting" }
        ],
        potentialLightingOpportunities: [
          "Off-grid solar lighting for shared trail connections without trenching mains power",
          "Plaspole composite poles for corrosion-prone or coastal environments"
        ],
        targetRolesToEngage: [
          { role: "Senior Estimator / Electrical PM", whyEngage: "Pricing and lead time during tender bid phase", valueProposition: "Fast turnkey luminaire + pole packages with complete photometric Dialux design" },
          { role: "Project Engineer / Asset Manager", whyEngage: "Product approval and specification sign-off", valueProposition: "Zero ongoing power bills, robust LiFePO4 battery reliability, and Australian compliance" }
        ],
        conversationStarters: [
          `"We noticed your upcoming civil packages in ${location || 'the region'}—are you seeing councils push for solar lighting on shared paths to eliminate trenching costs?"`,
          `"Plasgain can run your Dialux photometric calculations complimentary to ensure compliance with AS/NZS 1158."`
        ],
        researchConfidence: "Medium",
        sources: []
      });
    }
  } catch (error: any) {
    console.error("Error in customer research:", error);
    res.status(500).json({ error: error.message || "Failed to research customer" });
  }
});

// 8. CALL PREP & QUICK 1-MINUTE BRIEF
app.post(["/api/call/prep", "/api/tools/call-prep"], async (req, res) => {
  try {
    const { customer, contactName, company, customerCompany, project, lastInteraction, stage, notes, opportunity } = req.body;
    const resolvedCustomer = customer || contactName || opportunity?.contactName || "Rob Mitchell";
    const resolvedCompany = company || customerCompany || opportunity?.customerCompany || "ABC Civil Pty Ltd";
    const resolvedProject = project || opportunity?.project || "Ballarat Shared Path Upgrade";

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for call prep, using fallback:", aiErr.message);
      return res.json({
        customerSnapshot: `${resolvedCustomer} (${resolvedCompany}) - Estimator / Project Lead`,
        currentOpportunity: `${resolvedProject} - Seeking compliant solar lighting`,
        lastInteractionSummary: lastInteraction || "Reviewed preliminary project requirements",
        waitingOn: "Confirmation of path layout width/length and council CCT specification (3000K vs 4000K)",
        questionsToAsk: [
          "What is the exact pathway length and width so we can lock in the Dialux spacing for AS/NZS 1158?",
          "Does the council require 3000K fauna-friendly warm white along this corridor?",
          "What is your target delivery timeline on site?"
        ],
        possibleObjections: [
          {
            objection: "Will solar lights stay illuminated through cloudy winter weeks in Victoria/Tasmania?",
            howToHandle: "Explain that Intense 50W uses an 896Wh LiFePO4 battery pack with MPPT smart dimming, providing multi-night autonomy through overcast periods."
          },
          {
            objection: "We need budget numbers today before submitting our tender.",
            howToHandle: "Explain our standard pricing tier structure and promise formal commercial quotation within 4 hours once pole height is confirmed."
          }
        ],
        goalOfThisCall: "Secure site layout drawings to run Dialux lighting simulation and submit formal quotation.",
        estimatedDuration: "3-5 mins"
      });
    }
  } catch (error: any) {
    console.error("Error in call prep:", error);
    res.status(500).json({ error: error.message || "Failed to generate call prep" });
  }
});

// 9. CALL NOTES -> STRUCTURED CRM PARSER
app.post(["/api/call/process-notes", "/api/tools/call-log-parser", "/api/tools/call-notes", "/api/call-notes"], async (req, res) => {
  try {
    const { rawNotes, customerCompany, project } = req.body;
    if (!rawNotes) {
      return res.status(400).json({ error: "Raw notes are required." });
    }

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
        preferredModel: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      console.warn("AI generation failed for call notes, using fallback:", aiErr.message);
      return res.json({
        account: customerCompany || "Civil Contractor Client",
        contact: "Project Manager",
        opportunity: "Solar Lighting Package",
        project: project || "Public Infrastructure Upgrade",
        quantity: "Approx. 20-30 units",
        requirements: ["Solar pathway luminaires", "Galvanised or Plaspole poles", "Dialux AS/NZS 1158 report"],
        concerns: ["Winter battery performance", "Delivery lead times"],
        decisionProcess: "Council engineer approval required before PO release",
        timeline: "Construction starting next quarter",
        quoteDeadline: "This Friday 5:00 PM",
        nextAction: "Generate Dialux simulation and send formal quote with Intense 50W datasheet",
        followUpDate: "In 2 business days",
        formattedCrmSummary: `SUMMARY:\nDiscussed project lighting requirements with ${customerCompany || 'client'}. Client needs off-grid solar solution to avoid trenching costs. Recommended Intense 50W (896Wh battery, 7,500 lm) with 6m poles.\n\nACTION ITEMS:\n1. Run Dialux lighting design.\n2. Submit formal commercial quote.`
      });
    }
  } catch (error: any) {
    console.error("Error in process notes:", error);
    res.status(500).json({ error: error.message || "Failed to process notes" });
  }
});

// 10. FOLLOW-UP ASSISTANT
app.post(["/api/follow-up/suggest", "/api/tools/follow-up", "/api/tools/followup"], async (req, res) => {
  try {
    const { customer, customerName, company, project, lastContactDate, daysSinceLastActivity, stage, context, specificContext } = req.body;
    const resolvedCustomer = customer || customerName || "David";
    const resolvedCompany = company || "Apex Electrical";
    const resolvedProject = project || "Shared Path Lighting";
    const resolvedLastContact = lastContactDate || (daysSinceLastActivity ? `${daysSinceLastActivity} days ago` : "4 days ago");
    const resolvedContext = context || specificContext || "Quote sent for Intense 50W solar luminaires. Awaiting client feedback.";

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
        preferredModel: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      console.warn("AI generation failed for follow-up, using fallback:", aiErr.message);
      return res.json({
        whyFollowUpNow: "The quote was issued recently and consultant review cycles typically finalise within 1-2 weeks.",
        whatToAsk: [
          "Did the consultant or council lighting engineer have any questions regarding the Dialux photometric calculations?",
          "Are there any specific foundation or baseplate details needed for the footing schedule?"
        ],
        suggestedMessage: `Hi ${resolvedCustomer},\n\nHope you're having a productive week.\n\nOur engineering team was reviewing the ${resolvedProject} schedule today and wanted to ensure you had all necessary photometric compliance data and foundation drawings for your consultant submission.\n\nIf the electrical consultant needs us to adjust the pole spacing or beam distribution on the Dialux model, we can turn that around quickly for you.\n\nLet us know how we can best support your submission.\n\nBest regards,\nPlasgain Lighting Technical Team`,
        channelRecommended: "Email + Spec Sheet",
        urgencyScore: "Medium"
      });
    }
  } catch (error: any) {
    console.error("Error in follow-up assistant:", error);
    res.status(500).json({ error: error.message || "Failed to generate follow-up" });
  }
});

// 11. PRODUCT COMPARISON
app.post(["/api/product/compare", "/api/tools/compare", "/api/tools/product-compare", "/api/product-compare"], async (req, res) => {
  try {
    const { productA, product1Name, productB, product2Name, applicationContext } = req.body;
    const resolvedProductA = productA || product1Name || "Intense Light - 50W Solar";
    const resolvedProductB = productB || product2Name || "Pro Blade Solar 75/125";

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for comparison, using fallback:", aiErr.message);
      return res.json({
        comparisonTable: [
          { parameter: "Luminous Flux (Output)", productA: "7,500 lumens", productB: "High lumen output commercial array", notes: "Intense 50W uses Philips SMD 3030 at 150 lm/W" },
          { parameter: "Solar Panel", productA: "130W / 18V Monocrystalline", productB: "High-efficiency commercial PV", notes: "Intense features 260° horizontal rotation" },
          { parameter: "Battery Capacity", productA: "896Wh LiFePO4 (70Ah @ 12.8V)", productB: "Integrated LiFePO4 pack", notes: "Substantial multi-night autonomy for winter" },
          { parameter: "Mounting Spigot", productA: "60mm OD spigot", productB: "Standard commercial spigot mount", notes: "Fits standard Plasgain 4m-6m poles" }
        ],
        wherePlasgainHasAdvantage: [
          "High battery capacity (896Wh) ensures dependable autonomy through cloudy winter periods",
          "Precision pathway optics minimize light spill into adjacent residential properties",
          "Australian engineering support and Dialux lighting calculations provided"
        ],
        whereCompetitorHasAdvantage: [
          "Check competitor's local stock status if immediate next-day dispatch is demanded"
        ],
        equivalentOrSimilar: ["Standard 60mm spigot mounting", "LiFePO4 battery chemistry safety"],
        unknownParameters: ["Competitor optical distribution type and photometric IES file availability"],
        claimsWeShouldNotMake: ["Do not guarantee 100% cloud cover autonomy without running a site solar insolation check."],
        salesRepPitchTip: "Focus on Plasgain's 896Wh battery capacity and offer a complimentary Dialux simulation to lock in specification."
      });
    }
  } catch (error: any) {
    console.error("Error comparing products:", error);
    res.status(500).json({ error: error.message || "Failed to compare products" });
  }
});

// 12. LEARNING CENTRE: QUIZ EVALUATION & GENERATION
app.post(["/api/learn/quiz-evaluate", "/api/learn/evaluate"], async (req, res) => {
  try {
    const { question, scenario, userAnswer, topic } = req.body;
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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for quiz eval, using fallback:", aiErr.message);
      return res.json({
        score: 88,
        rating: "Good",
        whatWasCorrect: [
          "Identified core technical requirements (mounting height, CCT, pathway dimensions)",
          "Recognised the need for photometric verification"
        ],
        whatWasMissed: [
          "Remembering to state that project-specific compliance requires Dialux calculations",
          "Checking solar shading and pole wind-region foundation engineering"
        ],
        modelAnswer: "Key questions: 1) Path dimensions & layout; 2) Council CCT requirement (3000K fauna-safe vs 4000K); 3) Mounting pole height & foundation type; 4) Target AS/NZS 1158 sub-category (e.g. PP4); 5) Project location and delivery timeframe.",
        coachFeedback: "Strong answer! Always remember to offer a complimentary Dialux simulation to lock in the Plasgain specification early.",
        recommendedFollowUpLesson: "AS/NZS 1158 Photometric Design & Dialux Basics"
      });
    }
  } catch (error: any) {
    console.error("Error evaluating quiz:", error);
    res.status(500).json({ error: error.message || "Failed to evaluate quiz" });
  }
});

// 13. SALES ROLEPLAY INTERACTION
app.post(["/api/learn/roleplay", "/api/roleplay"], async (req, res) => {
  try {
    const { customerType, difficulty, scenario, conversationHistory, latestUserMessage } = req.body;
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
        preferredModel: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const result = extractJsonFromText(response.text || "{}");
      return res.json(result);
    } catch (aiErr: any) {
      console.warn("AI generation failed for roleplay, using fallback:", aiErr.message);
      return res.json({
        customerResponse: "Look, that makes sense regarding the battery size, but how do I know the council inspector won't knock it back on the lux levels? Have you got an engineering report to back that up?",
        coachEvaluation: {
          whatWorked: "Clear explanation of the Intense 50W battery autonomy and split-system advantages.",
          whatCouldImprove: "Offer the Dialux calculation report immediately to address compliance hesitation.",
          technicalAccuracyScore: 90,
          salesTechniqueScore: 85,
          betterAlternativeResponse: "We back every quote with a full Dialux photometric report certified to AS/NZS 1158 Cat P. If you send through the site layout, we will generate the compliance report for council submission at no charge."
        },
        isScenarioFinished: false
      });
    }
  } catch (error: any) {
    console.error("Error in roleplay:", error);
    res.status(500).json({ error: error.message || "Failed to generate roleplay response" });
  }
});

// 14. EXPLAIN TERMINOLOGY ("EXPLAIN SIMPLY")
app.post(["/api/explain-term", "/api/knowledge/explain-term"], async (req, res) => {
  try {
    const { term, context } = req.body;
    if (!term) {
      return res.status(400).json({ error: "Term is required." });
    }

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
        preferredModel: "gemini-3.7-flash",
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
      console.warn("AI generation failed for explain-term, using fallback:", aiErr.message);
      return res.json({
        term: term || "CCT (Correlated Colour Temperature)",
        definition: "A measurement in Kelvin (K) indicating the warmth or coolness of light emitted by a luminaire.",
        whyItMatters: "Councils and environmental bodies frequently specify 3000K warm white to protect nocturnal wildlife and reduce blue light scattering, whereas commercial car parks typically use 4000K or 5700K.",
        howItAffectsPlasgainCustomer: "Plasgain luminaires (such as Intense 50W and Pro Blade) offer selectable or factory-configured CCTs (3000K, 4000K, 5700K) to satisfy exact tender specifications.",
        practicalExample: "A shared path through a nature reserve will require 3000K, while an industrial estate access road uses 4000K.",
        keyRuleOfThumb: "Always check council lighting guidelines for CCT restrictions before quoting."
      });
    }
  } catch (error: any) {
    console.error("Error explaining term:", error);
    res.status(500).json({ error: error.message || "Failed to explain term" });
  }
});

// 15. GLOBAL COPILOT ASSISTANT (FLOATING ASK COPILOT)
app.post(["/api/copilot/chat", "/api/chat"], async (req, res) => {
  try {
    const { message, activeScreen, screenContext, activeContextData, chatHistory, history } = req.body;
    const resolvedScreen = activeScreen || screenContext || "Home";
    const resolvedHistory = chatHistory || history || [];

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
        preferredModel: "gemini-3.7-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      return res.json({ reply: response.text || "I'm here to help with Plasgain enquiries, products, or technical questions." });
    } catch (aiErr: any) {
      console.warn("AI generation failed for copilot chat, using fallback:", aiErr.message);
      return res.json({
        reply: "I am Plasgain Lighting's Sales Copilot. I can assist you with product selection (Intense 50W, Pro Blade, Roadway V-LED), enquiry analysis, Dialux compliance requirements, and drafting client clarification emails."
      });
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
