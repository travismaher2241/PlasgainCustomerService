<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Plasgain Lighting Sales Copilot

Internal sales CRM and customer-relationship assistant for Plasgain Lighting
Australia — accounts, quotes, activities, call and meeting preparation, and
sales correspondence.

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

There is no product, specification or standards source in this app. The
reference-document library that once backed those answers has been removed, so
the Copilot cannot state a specification, rating, standards clause or compliance
claim as fact — it says the detail is not held here and points the rep at the
Plasgain product team. `NO_PRODUCT_SOURCE_INSTRUCTION` in `server.ts` carries
that rule into every AI call, and `src/test/unit/copyVocabulary.test.ts` keeps
spec language from creeping back into anything the app writes.

## Importing accounts from a CSV

Open **Accounts → Import CSV** to load an existing customer list. The columns
the importer reads are:

| Column | Used for |
| --- | --- |
| `Customer Name` | Account name. Required — a row without one is skipped. |
| `Customer Style` | `Account`, `Customer`, `Prospect` or `Council`. Anything else is treated as a prospect. |
| `Address 1`, `Address 2` | Billing address, split into street, suburb, state and postcode. |
| `Contact` | Added as a contact on the account. An email address here becomes the account's general email instead. |
| `Phone` | Account main phone, and the contact's phone. |

Common header spellings (`Company Name`, `Type`, `Address Line 1`) are accepted,
and any column the importer does not recognise is listed in the preview and left
alone.

Nothing is written until **Import** is pressed. The preview shows how many
accounts and contacts will be created and which rows will be skipped: a row is
skipped when its name matches an account already in the CRM, when it shares a
landline with one, or when the same customer appears twice in the file.
**Existing accounts are never overwritten by an import.**

Two things are worth setting before importing:

- **Territory when the address has no state.** Australian states in the address
  map to the sales territory that covers them; rows with no state fall back to
  this, `National` by default.
- **Contact frequency for imported customers.** Imported customers have no call
  history, so this defaults to `As needed` (quarterly) rather than making several
  hundred accounts overdue on day one.

The whole import is recorded as a single audit entry naming the file, not one
entry per row. Files exported from accounting systems are often Windows-1252
rather than UTF-8; both are read correctly, so names like O'Brien survive.

## Where server data is stored (read this before going live)

Accounts and contacts live in Firestore, written by the browser. Everything the
server owns — quotes and deals, uploaded quote PDFs, competitor pricing,
notifications, the audit trail and user profiles — used to be written to JSON
files on local disk.

On a serverless host that is not durable. The files land in `/tmp`, which is
wiped between deployments and is not shared between the instances serving
concurrent users, so a quote one rep saved could be invisible to another and
then disappear on the next deploy.

Those stores now write to Firestore through the Firebase Admin SDK, which
authenticates as the project rather than as a signed-in browser. Two collections
depend on that distinction:

- `audit_logs` — the client rules say `allow create: if false`, because an audit
  trail a client can write is not an audit trail.
- `user_profiles` — these hold PIN hashes. PINs are short, so a readable hash is
  a crackable hash. No client may read this collection at all.

Uploaded PDFs go to a Cloud Storage bucket, because Firestore holds documents
rather than files and caps a document at 1 MB — smaller than most quotes.

**Without credentials the server falls back to local files and keeps working,**
so development needs no setup. That fallback is not durable in production.

### Checking which mode you are in

```bash
curl https://<your-app>/api/health
```

`persistence.durable` is `true` when records survive a deployment. When it is
`false` the response says why, and anything entered will be lost on the next
deploy.

### Configuring durable storage

1. **Firebase Console → Project settings → Service accounts → Generate new
   private key.** This downloads a JSON file. It is a credential: do not commit
   it, and do not paste it anywhere public.
2. **Firebase Console → Storage → Get started**, if it is not already on. Accept
   the default bucket. Keep the default rules; the server reaches the bucket
   with its own credentials, not through them.
3. **Vercel → your project → Settings → Environment Variables.** Add:

   | Name | Value |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT` | the entire contents of the JSON file, pasted as one line |
   | `PLASGAIN_STORAGE_BUCKET` | optional; defaults to `<project-id>.firebasestorage.app` |

4. **Redeploy.** Environment variables are read at boot, so an existing
   deployment will not pick them up.
5. **Confirm** with the `/api/health` call above.

Application Default Credentials are used instead when the platform supplies them
(`GOOGLE_APPLICATION_CREDENTIALS`), so a Google-hosted deployment needs no key.

### Deploying the security rules

The rules changed alongside this. Deploy them or the client keeps its old access:

```bash
firebase deploy --only firestore:rules
```

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
