<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Plasgain Lighting Sales Copilot

Internal sales, product knowledge, enquiry analysis, customer research, and learning
assistant for Plasgain Lighting Australia.

View your app in AI Studio: https://ai.studio/apps/947c97ed-2c90-4c58-a444-2d492cdb42cf

## Run locally

**Prerequisites:** Node.js

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

## Firestore access

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
