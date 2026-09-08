import fs from "fs";
import path from "path";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

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

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const PROFILES_FILE = path.join(DATA_DIR, "user_profiles.json");

class UserProfileStore {
  private profiles: Map<string, StoredUserProfile> = new Map();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, "utf-8");
        const list: StoredUserProfile[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((p) => {
            if (p && p.userId) this.profiles.set(p.userId, p);
          });
        }
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("[UserProfileStore] Failed to initialize from disk:", err);
      this.isInitialized = true;
    }
  }

  private save() {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.profiles.values());
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("[UserProfileStore] Failed to write profiles to disk:", err);
    }
  }

  public getProfile(userId: string): StoredUserProfile | undefined {
    this.init();
    return this.profiles.get(userId);
  }

  public getAllProfiles(): StoredUserProfile[] {
    this.init();
    return Array.from(this.profiles.values());
  }

  public setProfile(profile: Omit<StoredUserProfile, "updatedAt">): StoredUserProfile {
    this.init();
    const stored: StoredUserProfile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    this.profiles.set(profile.userId, stored);
    this.save();
    return stored;
  }

  public setPin(userId: string, rawPin: string): boolean {
    this.init();
    const existing = this.profiles.get(userId);
    if (!existing) return false;
    existing.pinHash = hashPinWithScrypt(rawPin.trim());
    existing.updatedAt = new Date().toISOString();
    this.profiles.set(userId, existing);
    this.save();
    return true;
  }

  public deleteProfile(userId: string): boolean {
    this.init();
    const removed = this.profiles.delete(userId);
    if (removed) {
      this.save();
    }
    return removed;
  }

  public verifyPin(userId: string, rawPin: string): boolean {
    this.init();
    const profile = this.profiles.get(userId);
    if (!profile || !profile.pinHash) return false;
    const matches = verifyPinWithScrypt(rawPin.trim(), profile.pinHash);
    if (matches && !profile.pinHash.includes(":")) {
      // Automatically migrate legacy sha256 to scrypt upon successful verification
      profile.pinHash = hashPinWithScrypt(rawPin.trim());
      this.save();
    }
    return matches;
  }
}

export const userProfileStore = new UserProfileStore();
