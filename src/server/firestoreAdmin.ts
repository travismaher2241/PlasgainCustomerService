import { cert, getApps, initializeApp, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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

export function getAdminBucket() {
  const app = initialise();
  if (!app) return null;
  try {
    return getStorage(app).bucket();
  } catch (err: any) {
    console.error("[Firestore Admin] Storage bucket unavailable:", err?.message || err);
    return null;
  }
}

/** Test seam. */
export function resetAdminForTesting() {
  cachedApp = null;
  initialisationAttempted = false;
  initialisationError = null;
}
