import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createDocBackend, DocBackend } from "./docStore";

export function hashPinWithScrypt(pin: string, salt: Buffer = randomBytes(16)): string {
  const derivedKey = scryptSync(pin.trim(), salt, 32);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export function verifyPinWithScrypt(pin: string, storedHash: string): boolean {
  if (!pin || !storedHash) return false;
  try {
    if (storedHash.includes(":")) {
      const [saltHex, keyHex] = storedHash.split(":");
      if (!saltHex || !keyHex) return false;
      const salt = Buffer.from(saltHex, "hex");
      const expectedKey = Buffer.from(keyHex, "hex");
      if (salt.length === 0 || expectedKey.length === 0) return false;
      const derivedKey = scryptSync(pin.trim(), salt, expectedKey.length);
      if (expectedKey.length !== derivedKey.length) return false;
      return timingSafeEqual(expectedKey, derivedKey);
    }
    // Backward compatibility for legacy unsalted SHA-256 hashes
    const legacyExpected = Buffer.from(storedHash, "hex");
    const legacySupplied = createHash("sha256").update(pin.trim()).digest();
    if (legacyExpected.length === legacySupplied.length && timingSafeEqual(legacyExpected, legacySupplied)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface StoredUserProfile {
  userId: string;
  name: string;
  role: string;
  location?: string;
  email?: string;
  phone?: string;
  isAdmin: boolean;
  pinHash: string; // scrypt (saltHex:derivedKeyHex) or legacy SHA-256 hex digest
  updatedAt: string;
}

/**
 * User profiles, including PIN hashes.
 *
 * Backed by Firestore through the Admin SDK. This collection is deliberately
 * NOT readable by clients: the security rules deny it outright, and only the
 * server holds credentials that bypass them. PINs are short, so a readable
 * hash is a crackable hash — storing these under the ordinary "any signed-in
 * caller" rule the CRM records use would be a real downgrade.
 *
 * Documents are keyed by userId, which is also the document id.
 */
const COLLECTION = "user_profiles";

class UserProfileStore {
  private backend: DocBackend<StoredUserProfile & { id?: string }> | null = null;

  private getBackend(): DocBackend<StoredUserProfile & { id?: string }> {
    if (!this.backend) {
      this.backend = createDocBackend<StoredUserProfile & { id?: string }>(COLLECTION, "user_profiles.json");
    }
    return this.backend;
  }

  public async getProfile(userId: string): Promise<StoredUserProfile | undefined> {
    const all = await this.getBackend().loadAll();
    return all.find((p) => p.userId === userId);
  }

  public async getAllProfiles(): Promise<StoredUserProfile[]> {
    return this.getBackend().loadAll();
  }

  public async setProfile(profile: Omit<StoredUserProfile, "updatedAt">): Promise<StoredUserProfile> {
    const stored: StoredUserProfile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    await this.getBackend().put(profile.userId, { ...stored, id: profile.userId });
    return stored;
  }

  public async setPin(userId: string, rawPin: string): Promise<boolean> {
    const existing = await this.getProfile(userId);
    if (!existing) return false;
    const updated: StoredUserProfile = {
      ...existing,
      pinHash: hashPinWithScrypt(rawPin.trim()),
      updatedAt: new Date().toISOString()
    };
    await this.getBackend().put(userId, { ...updated, id: userId });
    return true;
  }

  public async deleteProfile(userId: string): Promise<boolean> {
    const existing = await this.getProfile(userId);
    if (!existing) return false;
    await this.getBackend().remove(userId);
    return true;
  }

  public async verifyPin(userId: string, rawPin: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile || !profile.pinHash) return false;
    const matches = verifyPinWithScrypt(rawPin.trim(), profile.pinHash);
    if (matches && !profile.pinHash.includes(":")) {
      // Upgrade a legacy unsalted SHA-256 hash to scrypt on successful sign-in.
      await this.getBackend().put(userId, {
        ...profile,
        id: userId,
        pinHash: hashPinWithScrypt(rawPin.trim()),
        updatedAt: new Date().toISOString()
      });
    }
    return matches;
  }
}

export const userProfileStore = new UserProfileStore();
