# Handoff: Plasgain Customer Service App — Context & Direction

Written for whoever (human or AI) picks this project up next. Covers who the user is, what problem this app should actually solve, what's been fixed and why, and what's still to be built.

---

## 1. Who the user is, and what the app needs to do for them

Travis Maher is a **newly hired sales rep at Plasgain Lighting Australia**. His own description of the job, verbatim:

> "I get given a plan, I quote the specified lighting pole and light that is on the plan. I don't do the engineering or planning itself."

Concretely: a developer, council, or utility hands him a civil/electrical services plan (a PDF) that already specifies generic public lighting requirements — pole type, height, lantern wattage, mounting offset, outreach — written by an accredited lighting designer to AS/NZS 1158. His job is to identify which Plasgain product satisfies that spec and hand it off. **Pricing, quoting, and job creation all happen outside this app, in Ostendo (a separate ERP).** He does not do structural engineering, compliance sign-off, or photometric design, and the app should not imply that he does.

He is also explicit about the bigger picture: he wants to become useful fast as a new starter, and **there is currently no CRM in use at Plasgain at all** — a second, arguably more important goal is building a genuinely usable CRM for the whole sales team, not just for himself. Treat the CRM as the durable deliverable and any AI/document features as supporting it, not the other way around.

### The concrete example that anchors everything

Travis showed a real plan excerpt: a subdivision civil lighting schedule specifying things like *"70W LED lantern on 9.0m URD standard pole"* and *"2x70W LED lanterns on 8.5m impact absorbent pole, 10.0m mounting height, 3.0m outreach double bracket."* None of this names a Plasgain product — it's generic utility/AS-1158 terminology. His stated target capability:

> "I want the app to be able to tell me 'what size spigot is on the 11m Rigid Pole' so that I know that the light I quote is going to fit it."

That single sentence defines the two things this app actually needs, which are **separate systems with separate sources of truth** (see §5).

---

## 2. What we found first: the app was full of fabricated data presented as real

Before any feature work, a large amount of session time went into discovering and removing content that the AI treated as "approved Plasgain knowledge" but that nobody had ever verified — some of it provably invented. This was the single biggest trust problem in the app and is now fixed, but it's important context for why certain design decisions below (structured databases with citations, no static knowledge blobs, honest "not found" answers) were made the way they were.

Found and removed, in order of discovery:

1. **`src/data/knowledgeBaseRaw.ts`** (deleted) — a 66,000-character hand-written "APPROVED PLASGAIN KNOWLEDGE BASE" injected into the AI system prompt on *every* request. Contained invented specs (e.g. a `70-76mm` spigot diameter with no source) sitting two lines below an instruction telling the AI never to fabricate spigot diameters.
2. **`DEFAULT_DOCUMENTS` in `src/server/documentGovernanceStore.ts`** (file since deleted entirely) — five invented "Approved" governance documents (e.g. *"Plasgain Pro Blade Solar 125 Datasheet," approved by "Chief Technical Officer"*) that no one ever approved, auto-seeded on every server start and also fed into the AI email composer as citable reference material.
3. **Leaked copies of that fabricated seed data in the live Firestore `controlled_documents` collection** — eight records total, including three that leaked in from a test (`priority2WorkflowFixes.test.ts`) that ran against real cloud data before cloud-sync-disable protections existed. Firestore's own security rule blocks client-side delete on that collection by design (*"carries AS/NZS compliance evidence... deletion is never a client operation"*), so these were removed manually via the Firebase Console, not by code.
4. **An inline "Plasgain Knowledge Base" product list hardcoded into the AI email-composer prompt** (`server.ts`, the `/api/email/draft-clarification` / composer flow) — invented product names like "Taiz 50W/80W," "Vertex Series," "Optima Streetlights" that don't correspond to anything real in this codebase.
5. **A similar hardcoded product list inside the drawing-take-off prompt** (`/api/analyse-drawing`) — specific invented Plasgain product names the AI was told to "match to."

**Current state:** the master AI system prompt now explicitly states *"There is no static knowledge-base text built into this app"* and instructs the model to ground every claim only in retrieved, uploaded-document evidence for the specific request, never in memorized specs. Verified live: asking the deployed logic *"what is the spigot diameter on an 11m rigid pole"* with no real uploaded evidence now correctly returns *"could not verify"* instead of a fabricated number.

**Implication for whoever builds the next feature:** don't reintroduce a static "knowledge base" text blob under any name. Any product fact the AI states must trace to either (a) real uploaded document evidence retrieved for that specific question, or (b) a structured, human-confirmed record (see §5). If evidence isn't found, the honest answer is "not found," not a best guess.

---

## 3. Document upload pipeline: bugs found and fixed

Separately from the fabrication issue, the actual PDF upload feature had real bugs, found by reproducing failures end-to-end against the live dev server:

- **Document-type mismatch bug**: the auto-classifier (`src/utils/documentClassifier.ts`) could infer `"Engineering Drawing"` from a filename, but the server's accepted-type list and the upload form's dropdown didn't include it — so any drawing-named file (containing "drawing," "schematic," "elevation," or the unbounded substring "cad") failed upload with `400 Select a valid document type`, with no visible reason in the UI. **Fixed**: a single `DOCUMENT_TYPES` constant now lives in `documentClassifier.ts` and is imported everywhere (server route, form dropdown, `ControlledDocument` type), so the three can't drift apart again. Also tightened `cad` to `\bcad\b` so it stops matching "cascade," "decade," etc.
- **PDF extraction worker memory ceiling too low**: 256 MB, so a 20 MB PDF could crash the worker with a bare `JS heap out of memory` message. **Fixed**: raised to 1024 MB (overridable via `PLASGAIN_PDF_WORKER_HEAP_MB`), and the crash now surfaces as *"This PDF needs more memory than the extractor allows — it is likely scan-heavy or image-heavy. Split it into smaller documents."*

Both fixes were verified against the file that had failed (`11m_Rigid_Pole.pdf` and a real 1.5 MB spec PDF), on a fresh server instance, before being accepted.

**Note:** since this work, another agent (working concurrently in this same repo — see §8) has substantially changed the ingestion pipeline again (auto-approval on upload; see §7). The extraction-worker and document-type fixes above are still in place as far as could be confirmed, but re-verify before assuming anything about the current upload flow's exact behaviour without reading the live code.

---

## 4. Deployment reality check

The user's Vercel deployment (`plasgain-customer-service.vercel.app`) currently **has no backend running at all**. It's `framework: null` with no `vercel.json` and no `api/` directory, so Vercel publishes only the static `dist/` build; every `/api/*` call gets Vercel's own plain-text 404. This explains historical "Upload failed. No successful save was confirmed" errors — that's the client's fallback text for *"the response wasn't JSON,"* which is exactly what a platform 404 page looks like.

A `Dockerfile` and `.dockerignore` were added at the project root (multi-stage build, non-root user, binds `PORT`, expects `PLASGAIN_KNOWLEDGE_BUCKET` or `PLASGAIN_KNOWLEDGE_DIR` at runtime) and the production build (`npm run build` → `node dist/server.js`) was verified working end-to-end locally, including a real PDF upload against it. **This has not been deployed anywhere yet** — that's a manual step for the user (Render or Cloud Run were discussed; Render is simpler since it doesn't require a GCS bucket). Whoever picks this up should confirm with the user whether a real deployment now exists before assuming the Vercel site works.

---

## 5. The actual feature gap: two databases, not one AI system

This was the key realization from a long back-and-forth, and it's the most important section for planning what to build next. **Neither of these is built yet.**

### Database A — Plasgain's own product specs (objective facts, sourced from Plasgain's own drawings/datasheets)

This is what answers *"what size spigot is on the 11m Rigid Pole."* The fact genuinely exists in a Plasgain drawing (confirmed: the user tested `11m_Rigid_Pole.pdf` with Gemini and it found the spigot detail). But **plain text extraction of that same drawing was tested and demonstrably fails** — pdf.js reads a PDF by physical position, and on a dimensioned drawing the number and the label it refers to are connected by a leader line, not proximity in the text stream. Concretely: extracting the drawing's "SPIGOT DETAIL" label pulled in numbers (`23`, `3`) from unrelated callouts elsewhere on the sheet — plausible-looking, wrong.

**Design agreed with the user:**
- Send Gemini the PDF **directly as multimodal input** (inline `application/pdf` data) — no page-rasterization step needed, Gemini reads the visual layout natively. This is almost certainly what the user's own successful test did.
- Ask for a **specific, named field list** (spigot diameter, pole height, base plate diameter, outreach length — whatever actually drives a fit-check), not an open-ended "describe this drawing." Request `responseMimeType: "application/json"` with a defined schema, matching the pattern already used throughout `server.ts` (see `extractJsonFromText`, and the honesty-first structured-response style in `answerFromUploadedKnowledge`).
- For each field, also ask Gemini to say **where on the drawing it found the value** (which detail view, which callout) and to say "not stated" rather than guess — same honesty rule as everywhere else in this codebase.
- **A human confirms once per product**, not once per question — a fast glance using the "where I found it" note, not a full document read. Wrong once here means quoting an incompatible pole, so this one confirmation is worth keeping; but it must not become a burden the user has to clear before the tool is usable (this was pushback the user gave explicitly — see §6 rationale).
- Store confirmed values in their own small structured collection, separate from the general document-upload pipeline entirely (`/api/knowledge/documents` is the wrong place for this — it's a different, lower-rigor feature). A Firestore collection alongside the existing `knowledge_documents`/`controlled_documents` pattern fits what's already there: `{ productId, attribute, value, unit, sourceDocumentId, sourcePage, confirmedBy, confirmedAt }`.
- Lookup for "what size spigot is on X" should hit this table **first**, directly and instantly, cited to the source drawing — not go through general AI document retrieval.
- Bounded scope: Plasgain has a finite product range. This is a one-time job per product (maybe a few dozen), not an ongoing document-reading habit. Start with whatever products/attributes the user actually gets asked about, not an exhaustive catalogue.

**Not yet built**: the extraction endpoint, the confirmation UI, the structured store, and the lookup-first answer path. The user was in the process of testing the Gemini-direct-PDF-input approach manually (outside this app) when this conversation ended; that validation should be treated as done, but the actual pipeline is not.

### Database B — the BDM's plan-matching knowledge (tribal, not written down anywhere)

This is a *completely different* knowledge source. When the user asked "does a plan's '2x70W lanterns on 8.5m impact absorbent pole, 3.0m outreach double bracket' need a VESI-standard bracket or ours," the answer isn't in any PDF — it lives only in the current BDM's head. His own framing:

> "No, this is what I am building here! The current BDM has it in his head. That's useless to someone starting, and as we grow here there will be more new starters that need help."

This is a **key-person-risk / onboarding problem**, not a document problem. No PDF extraction, however good, can conjure it.

**Design agreed with the user:**
- A structured "spec pattern → product recommendation" reference: **trigger** (pole type — URD standard / impact absorbent, height, lantern wattage, mounting height, outreach length, single/double bracket, servicing distributor if relevant since AusNet/Powercor/CitiPower/United Energy/Jemena areas differ) → **match** (which pole, which bracket — VESI or proprietary, which lantern) → **why/caveat** (the thing that makes it more than a lookup table, e.g. "VESI bracket only where AusNet is the distributor").
- **Populate it on demand, not via a big upfront interview.** Every time a real plan crosses the user's desk that he can't match himself yet, he asks the BDM, records the answer as an entry. This grows the table exactly around what actually comes up in real work — which is also exactly what a future new starter will hit.
- AI's legitimate, narrow role here: parse a photographed/pasted plan excerpt into the structured search fields (pole type, height, wattage, outreach) to save retyping, then hand off to a **deterministic lookup** against the curated table. The AI never answers the matching question itself — that only comes from what the BDM actually said.
- This is a feature that belongs **inside the CRM being built** (§1), not a bolt-on AI tool. Likely the highest-leverage single thing to build first, since it's the one the user needs personally, immediately, and it's exactly what a future hire will also need on day one.

**Not yet built at all** — this is a from-scratch feature. No schema, no UI, no capture workflow exists yet. This is genuinely the more valuable of the two databases relative to the user's stated priorities, and probably deserves to be built before Database A if forced to choose.

---

## 6. The engineering/compliance cleanup (what was removed, and why)

After the two-database reframe above, the user gave a blunt assessment of the *existing* app relative to his actual job:

> "The wind ratings etc dont matter to me... I dont do the engineering or planning itself."
> "I think the entire app is an over reach at the moment."
> "get rid of all the over the top engineering stuff that I dont need as discussed"

This triggered a large, plan-mode-driven cleanup (commit `68ce459`, pushed to `origin/main`). The guiding principle applied throughout: **remove or trim content that exists purely for structural/compliance engineering rigor (wind loading, foundation design, AS/NZS sign-off authority levels) with no bearing on matching a plan spec to a product; keep and lightly reframe anything actually adjacent to the real workflow (reading a plan, matching a product, handing off) even if it currently carries engineering-flavoured language.**

**Removed entirely:**
- The legacy `documentGovernanceStore.ts` system and its four `/api/controlled-documents` routes — confirmed dead from the UI's write-path perspective, and its own code comment said its purpose was publishing "AS/NZS compliance evidence that goes to councils." `ControlledDocument`'s type definition was preserved (relocated into `src/types/knowledge.ts`) since the real, live `KnowledgeDocument` type structurally depends on it.
- Five of ToolsHub's six tabs — Cable Cover, Pole Spacing, Foundations, Solar Sizing, Spec Review calculators. These did real wind-loading/footing-depth/AS-1158-spacing engineering math, and (worth flagging on its own) had hardcoded margin/cost-price data sitting in client-side code. Only **Take-off** remains — it's the one tool that actually matches the job (plan in, matched product out, export to Ostendo). `ToolsHub.tsx` went from ~1730 lines to a ~15-line wrapper around `PlanTakeoffWorkspace`.
- Engineering-titled approval roles ("structural engineer," "compliance manager," "engineering director," etc.) gating document review/approve/retire — these don't correspond to anyone on a small sales team, so gating against them meant the actions were effectively unusable by anyone. Correcting extracted page text is now open to any signed-in user; withdrawing a document from AI use stays gated on `session.isAdmin`.
- The Pre-Quote Readiness Gate's wind-region and lighting-category **hard blockers** — found while tracing where Take-off's extracted data went. It required an AS/NZS 1170.2 wind region to be confirmed before any "firm quote" could even proceed through that modal. Removed from `src/utils/quoteReadinessValidator.ts`; the modal's copy was also de-jargoned ("Verify engineering constraints" → "Verify commercial readiness").

**Trimmed (kept the feature, dropped the framing):** the master AI system prompt (`MASTER_PLASGAIN_SYSTEM_INSTRUCTION` in `server.ts`) lost its Conflict Register, Document Authority Levels, and Australian Standards/Dialux-caveat sections. Individually trimmed: `/api/analyse-drawing` (no longer models the AI as "a civil & electrical estimator and lighting engineer," now plainly "match the pole/light on the plan to a product"), `/api/product-finder` (dropped the `windRegion` input and `complianceStandard` response field, plus the client-side "Wind Region (AS 1170.2)" input in `ProductFinder.tsx`, relabelled to "Site Conditions"), `/api/ask-plasgain`, `/api/document/analyze` (Tender/RFQ Analyser — status enum changed from compliance verdicts like *"Appears Compliant"* to product-matching language like *"Product Match Found"*), `/api/product/compare`, the Learning Centre quiz/roleplay content, `/api/email/refine-draft`, and the `/api/enquiry/analyze-stream` progress narration (renamed `"standards_check"` → `"cross_checking"`). `NewEnquiryWorkspace.tsx` lost its "Engineering Distinction Notice" banner (which told the rep their product match needed formal Dialux sign-off) and its default draft-email text stopped asserting "our engineering team recommends" / "formal point-by-point Dialux simulation" to real customers. `AIEmailComposerModal.tsx`'s three canned outbound templates had the same kind of unverifiable compliance claims removed (AS/NZS 1158 Category P compliance claims, "engineering superintendent," DIALux photometric calculations) — sending those to a real prospect with no actual engineering behind them was a real risk, not just tone.

**Explicitly left alone** (per the user's implicit priorities and to bound the change): `types.ts`/`mockData.ts` minor references (a `"Photometric Reports"` document type, a `"Pole & Structural Foundation"` category); the Learning Centre, Tender/RFQ Analyser, and Product Compare features *themselves* (trimmed, not removed — plausibly still useful); the document auto-approval-on-upload behaviour (see §7 — a separate, already-flagged issue, deliberately not touched in this pass).

**Verification performed:** `tsc --noEmit` showed zero *new* errors (93 remain, all traced individually to pre-existing CRM-module drift from concurrent work — see §8 — not from this change). Full test suite: 337/337 passing after fixing 7 tests that asserted the old behaviour and removing one that tested a document state (metadata-only, no attached PDF) that can no longer occur now the legacy store is gone. Live-server checks on an isolated instance confirmed: removed routes 404, a non-admin sales rep can now successfully correct a document (previously 403), and a real Gemini call for a product-finder query returns a clean response with zero Dialux/AS-1158/wind-region language anywhere in it.

This work is **committed and pushed**: `origin/main` at `68ce459`.

---

## 7. A known issue, deliberately left as-is (needs a decision)

Separately from everything above, the document ingestion pipeline in `src/server/knowledgeStore.ts` currently **auto-approves every upload instantly** — no human ever reviews a page before the AI can cite it, and the record is stamped `reviewedBy: "${uploader} (AI Ingested)"` while the retrieval system prompt still labels it *"reviewed source text"* to the AI. This was flagged mid-session as a real regression risk (it would let a drawing's garbled extracted-dimension text reach the AI as "verified" with zero human check, the same failure mode as the fabricated-knowledge-base problem in §2), but the user's later pushback (*"the point of using AI is so I don't have to read every document"*) led to a more nuanced conclusion:

- For **prose documents** (specs, brochures, catalogues), auto-approval is actually fine to leave as-is — the existing citation-verification mechanism (`answerFromUploadedKnowledge` in `server.ts`, a second AI call that independently checks a claim against the exact retrieved passage before allowing it through) already does real, automatic, per-answer checking. Requiring manual pre-review on top of that would just reintroduce the "read everything yourself" burden the user explicitly rejected. The one thing worth fixing here is honesty of labelling: stop calling AI-extracted, unconfirmed text "reviewed."
- For **drawings**, this is a different, structural problem (see §5, Database A) — text extraction of a dimensioned drawing can't be citation-verified into meaning, because the citation would just point at more scrambled text. The fix isn't more review, it's not routing drawings through this text-based pipeline for factual claims at all.

**Nothing here was changed.** This is flagged for whoever continues the work to make a call on, not a bug to silently "fix" by reintroducing a mandatory review gate.

---

## 8. Important operating context

- **Another agent has been working concurrently in this exact repository** throughout this whole engagement (visible in `git log` as a separate stream of commits — e.g. `4431e89`, `5ec4024`, `aa5e815`, and others with different authorship style). It rewrote large parts of `DocumentLibrary.tsx`, `knowledgeStore.ts`, and `pdfExtraction.ts` at various points, including adding a Vercel-serverless in-process extraction fallback and the auto-approval change in §7. **Check git log and diff against what this document describes before assuming any given file still looks the way it's described here** — things may have moved again since this was written.
- **There are two separate, non-identical `KnowledgeDocument` interfaces in this codebase**: the real one in `src/types/knowledge.ts` (used by the actual document-upload pipeline) and a leaner, pre-existing one in `src/types.ts` (used by `AppContext.tsx`'s client-only sample-data fallback). This is a genuine, pre-existing duplication — not something introduced in this session — and it caused a couple of type-cast issues that had to be routed around (`as unknown as`) rather than fixed at the root, since unifying them is a bigger, riskier job than was in scope. Worth untangling properly at some point.
- **~93 pre-existing TypeScript errors** exist in the CRM module (`CRMAccountsView.tsx`, `CRMTodayWorkspace.tsx`, and siblings), unrelated to anything in this document — from the other concurrent agent's CRM rebuild work. Each was individually traced and confirmed unrelated before this session's changes were accepted; don't assume they're new or related to this handoff.
- **Firebase/Firestore is genuinely live**, not mocked — `plasgain-customer-service` project, real API key shipped in the client bundle (normal for Firebase; security is enforced via Firestore rules, not key secrecy). `controlled_documents` has `allow delete: if false` as a deliberate safeguard (compliance records shouldn't vanish); anything that needs removing from that collection specifically needs the Firebase Console, not code.
- **Default local dev PINs** (for reference, not secret — see `server.ts`): Travis `1234`, Sarah Reed `2468`, Rob Mitchell `9900`. Override via `PLASGAIN_PIN_*` env vars in any real deployment.
