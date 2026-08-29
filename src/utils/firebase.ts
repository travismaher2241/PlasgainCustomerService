import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from "firebase/firestore";

export const firebaseConfig = {
  projectId: "plasgain-customer-service",
  appId: "1:528668867780:web:573c57b0e343da2e751d91",
  storageBucket: "plasgain-customer-service.firebasestorage.app",
  apiKey: "AIzaSyD2fj1s9Lw8OnK7idj0CgxQF2QTdkBhtQ4",
  authDomain: "plasgain-customer-service.firebaseapp.com",
  messagingSenderId: "528668867780"
};

// Initialize Firebase safely for both browser and test environments
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Resolved lazily. Calling getAuth() at module scope races the registration of
// the auth component and throws "Component auth has not been registered yet",
// which takes the whole bundle down before React mounts.
let authInstance: ReturnType<typeof getAuth> | null = null;
function getAuthInstance() {
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

/**
 * Whether this process may talk to the live Firestore project.
 *
 * Off under test. The suite was writing fixtures straight into the production
 * collection with no cleanup, which is why the controlled document library
 * accumulated 78 copies each of three test documents — records a rep then had to
 * scroll past. Set PLASGAIN_DISABLE_CLOUD=1 to work offline locally too.
 */
export function isCloudSyncEnabled(): boolean {
  try {
    if (typeof process !== "undefined" && process.env) {
      if (process.env.VITEST || process.env.NODE_ENV === "test") return false;
      if (process.env.PLASGAIN_DISABLE_CLOUD === "1") return false;
    }
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.MODE === "test") return false;
  } catch {
    // Environment inspection failed; fall through to enabled.
  }
  return true;
}

/**
 * Establishes a Firebase identity before any Firestore traffic.
 *
 * The security rules previously allowed `read, write: if true`, which left every
 * CRM collection open to anyone holding the (publicly shipped) web config. The
 * rules now require `request.auth != null`, so every reader and writer — browser
 * and server alike — must sign in first.
 *
 * Anonymous auth is the floor, not the goal: it proves a caller came through
 * Firebase rather than curl, but it does not distinguish one rep from another.
 * Per-user identity still needs a real provider decision.
 */
let authReadyPromise: Promise<void> | null = null;

export function ensureFirebaseAuth(): Promise<void> {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise<void>((resolve) => {
    let auth: ReturnType<typeof getAuth>;
    try {
      auth = getAuthInstance();
    } catch (err) {
      console.warn("[Firebase] Auth unavailable; cloud sync disabled:", err);
      resolve();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve();
      }
    });

    signInAnonymously(auth).catch((err) => {
      // Offline or anonymous auth disabled in the console. Reads and writes will
      // fail closed and queue, which is the correct outcome for a locked store.
      console.warn("[Firebase] Anonymous sign-in failed; cloud sync unavailable:", err);
      unsubscribe();
      resolve();
    });
  });

  return authReadyPromise;
}

function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
        clean[k] = sanitizeForFirestore(v);
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

// Sync & Queue Metadata
const QUEUE_STORAGE_KEY = "plasgain_offline_write_queue";
const LAST_SYNC_STORAGE_KEY = "plasgain_last_cloud_sync_time";

export interface QueuedWriteOperation {
  id: string;
  type: "save" | "delete" | "batch";
  collectionName: string;
  docId?: string;
  data?: any;
  timestamp: string;
}

export function getQueuedWrites(): QueuedWriteOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getQueuedWritesCount(): number {
  return getQueuedWrites().length;
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function recordSuccessfulSync(): void {
  try {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, now);
  } catch {
    // ignore
  }
}

export function queueWriteOperation(op: Omit<QueuedWriteOperation, "id" | "timestamp">) {
  try {
    const current = getQueuedWrites();
    const newOp: QueuedWriteOperation = {
      ...op,
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    current.push(newOp);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("[Firebase Queue] Error queuing offline write:", err);
  }
}

/**
 * Checks real Firestore connectivity with a lightweight ping.
 */
export async function checkCloudHealth(): Promise<{ online: boolean; latencyMs?: number; error?: string }> {
  if (!isCloudSyncEnabled()) return { online: false, error: "Cloud sync disabled in this environment" };
  const start = Date.now();
  try {
    await ensureFirebaseAuth();
    // Attempt to load settings/health ping doc with timeout
    const probePromise = getDoc(doc(db, "system_health", "ping"));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore connection timed out after 3500ms")), 3500)
    );
    await Promise.race([probePromise, timeoutPromise]);
    const latencyMs = Date.now() - start;
    recordSuccessfulSync();
    return { online: true, latencyMs };
  } catch (err: any) {
    return { online: false, error: err?.message || "Firestore unreachable" };
  }
}

/**
 * Flushes all pending writes queued while offline.
 */
export async function flushOfflineQueue(): Promise<{ success: boolean; processedCount: number }> {
  if (!isCloudSyncEnabled()) return { success: false, processedCount: 0 };
  const queue = getQueuedWrites();
  if (queue.length === 0) return { success: true, processedCount: 0 };

  await ensureFirebaseAuth();

  const remaining: QueuedWriteOperation[] = [];
  let processed = 0;

  for (const op of queue) {
    try {
      if (op.type === "save" && op.docId && op.data) {
        const docRef = doc(db, op.collectionName, op.docId);
        const sanitized = sanitizeForFirestore({ ...op.data, updatedAt: new Date().toISOString() });
        await setDoc(docRef, sanitized, { merge: true });
        processed++;
      } else if (op.type === "delete" && op.docId) {
        const docRef = doc(db, op.collectionName, op.docId);
        await deleteDoc(docRef);
        processed++;
      } else if (op.type === "batch" && Array.isArray(op.data)) {
        await Promise.all(
          op.data.map((item: any) => {
            const docRef = doc(db, op.collectionName, item.id);
            const sanitized = sanitizeForFirestore({ ...item, updatedAt: new Date().toISOString() });
            return setDoc(docRef, sanitized, { merge: true });
          })
        );
        processed++;
      }
    } catch (err) {
      console.warn(`[Firebase Queue] Failed to process queued op ${op.id}:`, err);
      remaining.push(op);
    }
  }

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }

  if (remaining.length === 0) {
    recordSuccessfulSync();
  }

  return { success: remaining.length === 0, processedCount: processed };
}

/**
 * Saves a single document by ID in a Firestore collection.
 */
export async function saveDocToCloud<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<boolean> {
  if (!isCloudSyncEnabled()) return false;
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, docId);
    const sanitized = sanitizeForFirestore({ ...data, updatedAt: new Date().toISOString() });
    await setDoc(docRef, sanitized, { merge: true });
    recordSuccessfulSync();
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error saving to ${collectionName}/${docId}. Queuing offline write:`, err);
    queueWriteOperation({ type: "save", collectionName, docId, data });
    return false;
  }
}

/**
 * Loads a single document by ID from a Firestore collection.
 */
export async function loadDocFromCloud<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  if (!isCloudSyncEnabled()) return null;
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      recordSuccessfulSync();
      return snap.data() as T;
    }
    return null;
  } catch (err) {
    console.warn(`[Firebase] Error loading ${collectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Loads all documents in a collection from Cloud Firestore.
 */
export async function loadCollectionFromCloud<T extends { id: string }>(
  collectionName: string
): Promise<T[]> {
  if (!isCloudSyncEnabled()) return [];
  try {
    await ensureFirebaseAuth();
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    const items: T[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data(), id: d.id } as T);
    });
    recordSuccessfulSync();
    return items;
  } catch (err) {
    console.warn(`[Firebase] Error loading collection ${collectionName}:`, err);
    return [];
  }
}

/**
 * Syncs an array of items to Cloud Firestore (creates or updates).
 */
export async function syncBatchToCloud<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<boolean> {
  if (!isCloudSyncEnabled()) return false;
  try {
    await ensureFirebaseAuth();
    await Promise.all(
      items.map((item) => {
        const docRef = doc(db, collectionName, item.id);
        const sanitized = sanitizeForFirestore({ ...item, updatedAt: new Date().toISOString() });
        return setDoc(docRef, sanitized, { merge: true });
      })
    );
    recordSuccessfulSync();
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error batch syncing to ${collectionName}. Queuing offline batch:`, err);
    queueWriteOperation({ type: "batch", collectionName, data: items });
    return false;
  }
}

/**
 * Deletes a document from a Firestore collection.
 */
export async function deleteDocFromCloud(
  collectionName: string,
  docId: string
): Promise<boolean> {
  if (!isCloudSyncEnabled()) return false;
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    recordSuccessfulSync();
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error deleting from ${collectionName}/${docId}. Queuing offline delete:`, err);
    queueWriteOperation({ type: "delete", collectionName, docId });
    return false;
  }
}

/**
 * Deletes all documents in a Firestore collection.
 */
export async function clearCollectionFromCloud(
  collectionName: string
): Promise<boolean> {
  if (!isCloudSyncEnabled()) return false;
  try {
    await ensureFirebaseAuth();
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    recordSuccessfulSync();
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error clearing collection ${collectionName}:`, err);
    return false;
  }
}
