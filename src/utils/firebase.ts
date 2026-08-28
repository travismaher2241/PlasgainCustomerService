import { initializeApp, getApps, getApp } from "firebase/app";
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

/**
 * Saves a single document by ID in a Firestore collection.
 */
export async function saveDocToCloud<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, docId);
    const sanitized = sanitizeForFirestore({ ...data, updatedAt: new Date().toISOString() });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error saving to ${collectionName}/${docId}:`, err);
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
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
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
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    const items: T[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data(), id: d.id } as T);
    });
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
  try {
    await Promise.all(
      items.map((item) => {
        const docRef = doc(db, collectionName, item.id);
        const sanitized = sanitizeForFirestore({ ...item, updatedAt: new Date().toISOString() });
        return setDoc(docRef, sanitized, { merge: true });
      })
    );
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error batch syncing to ${collectionName}:`, err);
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
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error deleting from ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Deletes all documents in a Firestore collection.
 */
export async function clearCollectionFromCloud(
  collectionName: string
): Promise<boolean> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    return true;
  } catch (err) {
    console.warn(`[Firebase] Error clearing collection ${collectionName}:`, err);
    return false;
  }
}
