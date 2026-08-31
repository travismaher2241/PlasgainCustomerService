<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Plasgain Lighting Sales Copilot

Internal sales, product knowledge, enquiry analysis, customer research, and learning
assistant for Plasgain Lighting Australia.

View your app in AI Studio: https://ai.studio/apps/947c97ed-2c90-4c58-a444-2d492cdb42cf

## Run locally

**Prerequisites:** Node.js 22.13 or newer (PDF.js requirement)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` and set your Gemini API key (see `.env.example`):
   ```
   GEMINI_API_KEY="your-key-here"
   ```
   The server loads `.env.local` first, then `.env`. Neither overrides a variable
   already present in the environment, so AI Studio's injected secrets win.
3. Run the app:
   ```bash
   npm run dev
   ```

## Verifying the AI is actually working

Without a valid `GEMINI_API_KEY` the app still runs, but **every AI-backed feature
returns HTTP 503 and shows an "AI unavailable" notice**. This is deliberate — see
"Grounding" below.

Two checks:

```bash
curl http://localhost:3000/api/health
```
Reports whether a key is configured (`ai.configured`).

```bash
curl http://localhost:3000/api/health/ai
```
Actually calls the model and reports whether it is reachable. The **Settings →
Copilot Diagnostics** panel in the UI reads this endpoint, so it shows real status
rather than an assumption.

## Grounding: why there are no offline sample results

This app quotes real products to real customers. Earlier versions returned canned
sample analyses whenever the AI call failed — with a 200 status and no indication
anything had gone wrong. That produced confident, wrong output: solar
recommendations for sites where solar had been ruled out, one product's warranty
attached to another, and "To be confirmed" values labelled CONFIRMED.

The rule now:

- If the AI cannot run, the API returns **503** with `degraded: true` and **no
  business content**. Wrong specifications are worse than no specifications.
- The UI renders an explicit "AI unavailable" notice in place of any result.
- Required inputs are validated. Endpoints no longer fall back to demo values
  (a missing contact name is an error, not "Rob Mitchell").

The one exception is the lighting glossary, which is backed by a genuine local
encyclopedia (`src/data/lightingEncyclopedia.ts`) and only *enriches* those real
entries with AI when it is available.

Product recommendations are additionally checked against the real catalogue
before they render. `resolveSingleProduct` (`src/utils/productResolver.ts`) must
match the recommendation to an entry in `src/data/mockData.ts`; anything it
cannot place is reported as unavailable rather than shown. The Product Finder
also displays the resolved catalogue SKU next to the recommendation, so a rep can
see what a quoted string actually corresponds to.

## PDF knowledge uploads

Open **Product Catalogues → Upload Document**. Sign in with your profile PIN
if prompted; **Verify session** also works for the currently selected profile.
Choose a PDF (25 MB / 200 pages maximum), provide its source and revision,
and select **Upload & extract PDF**. The use-from/review-by dates are internal
governance dates, not a claim about the source's publication date.

The server stores the actual PDF, computes its full SHA-256, and extracts every
page with PDF.js in a time- and memory-limited worker. Identical bytes reopen the
existing record instead of creating a duplicate. Failed storage is not reported
as a successful upload. Existing metadata-only library records remain labelled
**Reference only — PDF not imported**; re-upload their originals to ingest them.

### Accuracy and approval

- Compare each page with the rendered original. Text includes horizontal
  `[x=...]` positions to preserve table-column relationships and blank cells;
  these positions are **not engineering measurements**. PDF text order, merged
  headers, symbols and table relationships can still need correction.
- An engineering approver or workspace administrator must verify every page.
  Correct the retained transcription, or exclude a page with a reason. A blank
  or scanned page is flagged, never silently dropped. OCR and diagram
  interpretation are **not automatic**: transcribe relevant content manually
  or leave it excluded/pending. Original extraction is kept beside corrections.
- **Approve for AI knowledge** is enabled after all pages are reviewed. The
  server enforces permissions and completeness; a forged client approval flag
  cannot bypass it. Editing approved text requires a new PDF revision.
- Only effective, unexpired, approved, non-excluded pages enter AI requests.
  **Withdraw from AI** removes an obsolete document from future retrieval while
  retaining its original and review record. Upload/approve the replacement
  separately. Withdrawing a document does not rewrite prior chat answers.
- Retrieval matches question terms against titles and page text, returning up
  to 16 **whole pages** / 90,000 characters. It is not exhaustive search or a
  semantic index: ask specific questions with product codes, utility names and
  source titles. No match does not establish that information is absent from
  the complete library.
- All shared Gemini generation helpers receive the retrieved passages for
  authenticated requests. Ask Plasgain and Copilot additionally check quoted
  excerpts against exact page IDs and run a second AI check of the answer's
  row/column relationships before displaying it. Failed checks withhold the
  answer. Copilot citations open the real PDF page and show supporting quotes.
  Other generation tools receive evidence but do not have that additional
  answer-verification pass.

Neither extraction, human approval nor a second AI check guarantees perfect
accuracy or certifies compliance. Preserve blank cells as **not stated**, flag
conflicting codes/revisions, and verify safety-critical decisions against the
source and an appropriately qualified reviewer. Document text is explicitly
treated as untrusted evidence, never as executable instructions.

### Persistent storage and deployment

Local development saves to `server_data/knowledge/`, outside the client build
and ignored by git. Back up **both the PDFs and JSON review records**. Server
restarts preserve knowledge; restarting does expire the existing in-memory PIN
sessions, so users may need to verify their session again.

This app must be deployed as a **running server**, not as a static site. A
static-only host publishes `dist/` and never executes `dist/server.js`, so every
`/api` request returns that platform's own 404 page instead of JSON — the client
then reports "Upload failed. No successful save was confirmed." for uploads, and
every AI, CRM and document feature fails the same way. Use the `Dockerfile`, or
a host that runs `npm run build` then `npm start`.

For deployed production / Cloud Run, configure one durable backend:

1. `PLASGAIN_KNOWLEDGE_BUCKET`: an existing private Google Cloud Storage bucket.
   The server uses Application Default Credentials. Grant its runtime service
   account the necessary object read/list/create/update access on that bucket.
   Keep public access disabled; the browser downloads through authenticated
   application endpoints, not public bucket URLs. Enable bucket versioning and
   backups according to your retention requirements. No bucket or IAM policy is
   created by this code, and no anonymous Firebase Storage rules are required.
2. `PLASGAIN_KNOWLEDGE_DIR`: an absolute path on a persistent mounted disk for
   a single-server deployment. Do not use an ephemeral container filesystem,
   `public/`, or `dist/`. A stale `.lock` after a hard crash blocks changes rather
   than losing a review; after confirming no process is writing that document,
   an administrator can remove only that document's stale lock.

Production uploads fail clearly if neither backend is configured; existing
built-in knowledge remains available. Cloud write failures never silently fall
back to local temporary storage. GCS generation preconditions and local locks
reject stale concurrent reviews. Development static-file and `/@fs/` access to
the private data directories is denied.

Set private production `PLASGAIN_PIN_TRAVIS`, `PLASGAIN_PIN_SARAH`, and
`PLASGAIN_PIN_ROB` values rather than using the existing development defaults.
The application still uses its existing workspace PIN authentication; this is
not a replacement for enterprise identity management. Never commit credentials,
service-account keys, uploaded documents or their extracted text to GitHub.

For isolated local UI testing, set both `PLASGAIN_DISABLE_CLOUD=1` and
`VITE_PLASGAIN_DISABLE_CLOUD=1`, choose a temporary `PLASGAIN_KNOWLEDGE_DIR`, and
optionally set `PORT`. Vitest always disables live cloud I/O.

## Firestore access (CRM and older reference records)

`firestore.rules` requires an authenticated caller on every collection and denies
anything not explicitly listed. The client and server obtain that identity via
`ensureFirebaseAuth()` before any read or write.

Two deployment steps are required, **in this order**:

1. Enable **Anonymous** sign-in: Firebase Console → Authentication → Sign-in
   method. Without it, sign-in fails with `auth/configuration-not-found` and all
   cloud reads and writes fail closed (writes queue locally).
2. Deploy the rules: `firebase deploy --only firestore:rules`.

Anonymous auth is a floor, not per-user identity — it proves a request came
through Firebase, not who sent it. Rep-level identity and role-gated writes need
a real auth provider.

Tests never touch the live project: `isCloudSyncEnabled()` returns false under
Vitest, and `PLASGAIN_DISABLE_CLOUD=1` turns cloud sync off for local work.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with Vite middleware on :3000 |
| `npm run build` | Production client bundle + bundled server |
| `npm start` | Run the production build |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm test` | Unit, component, and API tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Models

The model ladder lives at the top of `server.ts`:

```ts
const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-2.0-flash"];
```

Failover advances to the next model on `503`, `429`, and on `404 / NOT_FOUND`.
That last case matters: if a model id is retired or unavailable to your key, the
call moves on to the next model instead of failing the whole request.
