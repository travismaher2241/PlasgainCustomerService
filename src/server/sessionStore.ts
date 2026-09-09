import { createHash } from "crypto";
import { createDocBackend, DocBackend } from "./docStore";

/**
 * Signed-in sessions.
 *
 * These lived in a `Map` in the server module. On a serverless host that is one
 * map per function instance: a token issued by the instance that handled the
 * sign-in was unknown to whichever instance served the next request, and gone
 * entirely after a cold start. Every call came back 401 "Sign in again", so a
 * rep could sign in and still have nothing work — quotes above all, since the
 * REST store is the only place they can be written.
 *
 * They are stored through the same backend as everything else the server owns,
 * so they are shared across instances and survive a deployment.
 *
 * The token is never written down. The document is keyed by its SHA-256, so a
 * reader of the database cannot lift a token and use it as its owner — the same
 * reasoning that keeps PIN hashes rather than PINs in user_profiles.
 */

const COLLECTION = "sessions";

export interface StoredSession {
  id: string;
  userId: string;
  name: string;
  role: string;
  isAdmin: boolean;
  issuedAt: number;
  expiresAt: number;
}

/** What callers hold. The id is an implementation detail of the store. */
export type SessionRecord = Omit<StoredSession, "id">;

const tokenKey = (token: string): string =>
  createHash("sha256").update(token.trim()).digest("hex");

class SessionStore {
  private backend: DocBackend<StoredSession> | null = null;

  private getBackend(): DocBackend<StoredSession> {
    if (!this.backend) {
      this.backend = createDocBackend<StoredSession>(COLLECTION, "sessions.json");
    }
    return this.backend;
  }

  public async create(token: string, session: SessionRecord): Promise<void> {
    const id = tokenKey(token);
    await this.getBackend().put(id, { ...session, id });
  }

  /**
   * The session for a token, or null when there is none or it has expired.
   * An expired session is removed as it is found, so the collection does not
   * accumulate every session ever issued.
   */
  public async get(token: string): Promise<SessionRecord | null> {
    if (!token) return null;
    const id = tokenKey(token);
    const found = await this.getBackend().get(id);
    if (!found) return null;

    if (found.expiresAt < Date.now()) {
      await this.destroy(token);
      return null;
    }

    const { id: _id, ...session } = found;
    return session;
  }

  public async destroy(token: string): Promise<void> {
    if (!token) return;
    await this.getBackend().remove(tokenKey(token));
  }

  /** Every session for a profile, so a PIN change can end them all. */
  public async destroyForUser(userId: string): Promise<number> {
    const all = await this.getBackend().loadAll();
    const theirs = all.filter((s) => s.userId === userId);
    await Promise.all(theirs.map((s) => this.getBackend().remove(s.id)));
    return theirs.length;
  }
}

export const sessionStore = new SessionStore();
