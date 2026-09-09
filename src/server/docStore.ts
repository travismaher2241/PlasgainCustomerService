import fs from "fs";
import path from "path";
import { getAdminFirestore, isCloudPersistenceEnabled } from "./firestoreAdmin";

/**
 * One persistence interface, two backends.
 *
 * Every server store used to read and write a JSON file directly. On a
 * serverless host that file lives in /tmp, which is wiped between deployments
 * and is not shared between the instances that serve concurrent users — so a
 * quote saved by one rep could be invisible to another and then vanish.
 *
 * Rather than teach each store about Firestore, they all talk to this adapter.
 * The Firestore backend is used when credentials are configured; otherwise the
 * file backend keeps local development working exactly as before. Store logic
 * stays single-path either way.
 *
 * Reads always go to the backing store rather than an in-memory cache. Caching
 * would be faster, but two serverless instances holding separate caches diverge
 * the moment either one writes, and a CRM that shows two reps different
 * pipelines is worse than a CRM that pauses briefly on read.
 */
export interface DocBackend<T> {
  loadAll(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  put(id: string, doc: T): Promise<void>;
  putMany(entries: Array<{ id: string; doc: T }>): Promise<void>;
  remove(id: string): Promise<void>;
  /**
   * Read-modify-write as one atomic step.
   *
   * The stores check a version number before overwriting, so that two reps
   * saving the same quote cannot silently discard each other's edit. In a
   * single process a plain read-then-write was enough. Across serverless
   * instances it is not: both can read version 4, both can pass the check, and
   * the second write wins with no conflict reported. `mutate` closes that
   * window — the Firestore backend runs it in a transaction that retries if the
   * document changed underneath.
   *
   * The callback may throw to abort the write.
   */
  mutate(id: string, apply: (current: T | null) => T): Promise<T>;
  /** True when writes are durable; false while falling back to local files. */
  readonly durable: boolean;
}

/**
 * Resolved per call rather than at import. The old stores captured cwd the
 * moment the module loaded, which made the location impossible to change once
 * anything had imported them.
 */
function dataDir(): string {
  return process.env.VERCEL
    ? path.join("/tmp", "server_data")
    : path.resolve(process.cwd(), "server_data");
}

const isTestEnv = (): boolean =>
  process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

/**
 * Under test the "file" is a map in memory, keyed by the file name it would
 * have used. A plain `vitest run` previously mutated the real server_data
 * files, which left the working tree dirty with regenerated ids and let state
 * leak from one test file into the next. Sharing one map per file name keeps
 * the singleton stores behaving as they always did within a run, without
 * touching the disk.
 */
const testStores = new Map<string, Record<string, any>>();

/**
 * Local JSON file storage. Retained for development and for the case where no
 * credentials are configured, so the app degrades to its previous behaviour
 * rather than failing outright.
 */
class FileBackend<T extends { id?: string }> implements DocBackend<T> {
  public readonly durable = false;

  constructor(private readonly fileName: string) {}

  private get filePath(): string {
    return path.join(dataDir(), this.fileName);
  }

  private readFile(): Record<string, T> {
    if (isTestEnv()) {
      if (!testStores.has(this.fileName)) testStores.set(this.fileName, {});
      return { ...(testStores.get(this.fileName) as Record<string, T>) };
    }
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      // Older files stored a bare array; both shapes are readable.
      if (Array.isArray(parsed)) {
        const map: Record<string, T> = {};
        for (const item of parsed) {
          const id = (item as any)?.id;
          if (id) map[String(id)] = item;
        }
        return map;
      }
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn(`[DocStore] Could not read ${this.fileName}:`, err);
      return {};
    }
  }

  private writeFile(map: Record<string, T>): void {
    if (isTestEnv()) {
      testStores.set(this.fileName, map);
      return;
    }
    try {
      const dir = dataDir();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(map, null, 2), "utf-8");
    } catch (err) {
      console.error(`[DocStore] Could not write ${this.fileName}:`, err);
    }
  }

  async loadAll(): Promise<T[]> {
    return Object.values(this.readFile());
  }

  async put(id: string, doc: T): Promise<void> {
    const map = this.readFile();
    map[id] = doc;
    this.writeFile(map);
  }

  async putMany(entries: Array<{ id: string; doc: T }>): Promise<void> {
    const map = this.readFile();
    for (const { id, doc } of entries) map[id] = doc;
    this.writeFile(map);
  }

  async get(id: string): Promise<T | null> {
    return this.readFile()[id] ?? null;
  }

  async remove(id: string): Promise<void> {
    const map = this.readFile();
    delete map[id];
    this.writeFile(map);
  }

  /** Single process, so read-modify-write is already atomic enough here. */
  async mutate(id: string, apply: (current: T | null) => T): Promise<T> {
    const map = this.readFile();
    const next = apply(map[id] ?? null);
    map[id] = next;
    this.writeFile(map);
    return next;
  }
}

/** Firestore storage via the Admin SDK, which bypasses the client rules. */
class FirestoreBackend<T> implements DocBackend<T> {
  public readonly durable = true;

  constructor(private readonly collectionName: string) {}

  private collection() {
    const db = getAdminFirestore();
    if (!db) throw new Error(`Firestore unavailable for collection ${this.collectionName}`);
    return db.collection(this.collectionName);
  }

  async loadAll(): Promise<T[]> {
    const snap = await this.collection().get();
    return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id } as T));
  }

  async put(id: string, doc: T): Promise<void> {
    await this.collection().doc(id).set(stripUndefined(doc as any));
  }

  async putMany(entries: Array<{ id: string; doc: T }>): Promise<void> {
    if (entries.length === 0) return;
    const db = getAdminFirestore();
    if (!db) throw new Error(`Firestore unavailable for collection ${this.collectionName}`);
    // Firestore caps a batch at 500 writes.
    for (let i = 0; i < entries.length; i += 450) {
      const batch = db.batch();
      for (const { id, doc } of entries.slice(i, i + 450)) {
        batch.set(this.collection().doc(id), stripUndefined(doc as any));
      }
      await batch.commit();
    }
  }

  async get(id: string): Promise<T | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    return { ...(snap.data() as T), id: snap.id } as T;
  }

  async remove(id: string): Promise<void> {
    await this.collection().doc(id).delete();
  }

  async mutate(id: string, apply: (current: T | null) => T): Promise<T> {
    const db = getAdminFirestore();
    if (!db) throw new Error(`Firestore unavailable for collection ${this.collectionName}`);
    const ref = db.collection(this.collectionName).doc(id);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? ({ ...(snap.data() as T), id: snap.id } as T) : null;
      // A throw here aborts the transaction, so a failed version check writes nothing.
      const next = apply(current);
      tx.set(ref, stripUndefined(next as any));
      return next;
    });
  }
}

/**
 * Firestore rejects undefined values outright, while the JSON files silently
 * dropped them. Optional fields left unset would otherwise fail every write.
 */
function stripUndefined<T extends Record<string, any>>(doc: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v === undefined) continue;
    if (v && typeof v === "object" && !Array.isArray(v) && v.constructor === Object) {
      out[k] = stripUndefined(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * Picks the backend once per store. Cloud when credentials are configured,
 * local files otherwise.
 */
export function createDocBackend<T extends { id?: string }>(
  collectionName: string,
  fileName: string
): DocBackend<T> {
  if (isCloudPersistenceEnabled()) {
    return new FirestoreBackend<T>(collectionName);
  }
  return new FileBackend<T>(fileName);
}
