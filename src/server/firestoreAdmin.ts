import { cert, getApps, initializeApp, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * firebase-admin bundles its own copy of @google-cloud/storage, so importing
 * Bucket from the top-level package yields a structurally different type.
 * Deriving it from getStorage keeps the two in step.
 */
type AdminBucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

/**
 * Server-side Firebase access.
 *
 * The browser reaches Firestore with anonymous auth, which the security rules
 * treat as "some caller came through Firebase" — enough for ordinary CRM
 * records, not enough for the server's own data. Two collections cannot live
 * under that rule at all:
 *
 *   - audit_logs, where the rules already say `allow create: if false` because
 *     an audit trail a client can write is not an audit trail.
 *   - user_profiles, which hold PIN hashes. PINs are short, so a readable hash
 *     is a crackable hash.
 *
 * The Admin SDK authenticates as the project itself and bypasses the rules, so
 * the server can hold both while clients still cannot touch them.
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT (the JSON key, as a single
 * environment variable) or from Application Default Credentials where the
 * hosting platform supplies them. When neither is present the server keeps
 * using local files, so a developer without credentials still gets a working
 * app — see fileBackend in docStore.ts.
 */

const PROJECT_ID = "plasgain-customer-service";

/** Vitest must never reach the live project. */
function isTestEnvironment(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

let cachedApp: App | null = null;
let initialisationAttempted = false;
let initialisationError: string | null = null;

function readServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || raw.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      initialisationError =
        "FIREBASE_SERVICE_ACCOUNT is set but is missing project_id, private_key or client_email.";
      return null;
    }
    // Vercel's environment editor stores newlines escaped; the PEM parser needs them real.
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    initialisationError = "FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON.";
    return null;
  }
}

function initialise(): App | null {
  if (initialisationAttempted) return cachedApp;
  initialisationAttempted = true;

  if (isTestEnvironment()) return null;

  try {
    const existing = getApps();
    if (existing.length > 0) {
      cachedApp = existing[0];
      return cachedApp;
    }

    const serviceAccount = readServiceAccount();
    if (serviceAccount) {
      cachedApp = initializeApp({
        credential: cert(serviceAccount as any),
        projectId: serviceAccount.project_id,
        storageBucket: process.env.PLASGAIN_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`
      });
      return cachedApp;
    }

    // Application Default Credentials, where the platform provides them.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
      cachedApp = initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID,
        storageBucket: process.env.PLASGAIN_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`
      });
      return cachedApp;
    }

    if (!initialisationError) {
      initialisationError =
        "No FIREBASE_SERVICE_ACCOUNT or Application Default Credentials found.";
    }
    return null;
  } catch (err: any) {
    initialisationError = err?.message || String(err);
    console.error("[Firestore Admin] Initialisation failed:", initialisationError);
    return null;
  }
}

/**
 * Whether server data is durably stored. False means the stores fall back to
 * local files, which on a serverless host are wiped between deployments.
 */
export function isCloudPersistenceEnabled(): boolean {
  return initialise() !== null;
}

/** Why cloud persistence is off, for the health endpoint to report honestly. */
export function cloudPersistenceStatus(): { enabled: boolean; reason?: string } {
  const enabled = isCloudPersistenceEnabled();
  if (enabled) return { enabled: true };
  return {
    enabled: false,
    reason: isTestEnvironment()
      ? "Disabled under test."
      : initialisationError || "Not configured."
  };
}

export function getAdminFirestore(): Firestore | null {
  const app = initialise();
  if (!app) return null;
  return getFirestore(app);
}

/**
 * The bucket holding quote PDFs, or null when there is not a usable one.
 *
 * `getStorage(app).bucket()` hands back a handle without checking anything, so
 * a project where Storage was never switched on — or one whose bucket uses the
 * older naming — looked configured right up until the first upload failed with
 * "The specified bucket does not exist". That 500'd the whole quote import,
 * which is worse than the non-durable storage it replaced.
 *
 * So the bucket is verified once and the result cached. Firebase projects
 * created from late 2024 use <project>.firebasestorage.app; older ones use
 * <project>.appspot.com. Both are tried before giving up, because guessing
 * wrong is indistinguishable to the caller from Storage being off.
 */
let bucketProbe: { checked: boolean; bucket: AdminBucket | null } = { checked: false, bucket: null };

async function probeBucket(): Promise<AdminBucket | null> {
  const app = initialise();
  if (!app) return null;

  const configured = process.env.PLASGAIN_STORAGE_BUCKET?.trim();
  const projectId = (app.options as any)?.projectId || PROJECT_ID;
  const candidates = configured
    ? [configured]
    : [`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`];

  for (const name of candidates) {
    try {
      const bucket = getStorage(app).bucket(name);
      const [exists] = await bucket.exists();
      if (exists) {
        if (candidates.length > 1 && name !== candidates[0]) {
          console.warn(`[Firestore Admin] Using storage bucket ${name}. Set PLASGAIN_STORAGE_BUCKET to skip this probe.`);
        }
        return bucket;
      }
    } catch (err: any) {
      console.error(`[Firestore Admin] Could not reach storage bucket ${name}:`, err?.message || err);
    }
  }

  console.error(
    `[Firestore Admin] No usable storage bucket (tried ${candidates.join(", ")}). ` +
      "Quote PDFs will be held non-durably. Enable Firebase Storage, or set PLASGAIN_STORAGE_BUCKET."
  );
  return null;
}

export async function getAdminBucket(): Promise<AdminBucket | null> {
  if (bucketProbe.checked) return bucketProbe.bucket;
  const bucket = await probeBucket();
  bucketProbe = { checked: true, bucket };
  return bucket;
}

/** Test seam. */
export function resetAdminForTesting() {
  cachedApp = null;
  initialisationAttempted = false;
  initialisationError = null;
  bucketProbe = { checked: false, bucket: null };
}
