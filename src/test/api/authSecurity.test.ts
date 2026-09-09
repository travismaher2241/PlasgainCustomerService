// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import {
  app,
  readSession,
  requireSession,
  hashPinWithScrypt,
  verifyPinWithScrypt,
  assertProductionSecurityConfig
} from '../../../server';
import { userProfileStore } from '../../../src/server/userProfileStore';
import { createHash } from 'crypto';

describe('Auth Security Hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Task 1 & 2: Removal of X-User-Id Fallback & Bearer Token Enforcement', () => {
    it('rejects GET /api/auth/session with 401 when only client-asserted X-User-Id is provided', async () => {
      const res = await request(app)
        .get('/api/auth/session')
        .set('X-User-Id', 'user-travis-maher');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/verified profile|sign in/i);
      expect(res.body.isAdmin).toBeUndefined();
    });

    it('rejects GET /api/auth/session with 401 when no token or headers are provided', async () => {
      const res = await request(app).get('/api/auth/session');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeTruthy();
    });

    it('rejects GET /api/auth/session with 401 when an invalid bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/session')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
    });

    it('successfully issues bearer token on PIN verification and authenticates GET /api/auth/session', async () => {
      // 1. Verify PIN for preset user Travis Maher (dev default 1234)
      const authRes = await request(app)
        .post('/api/auth/verify-profile')
        .send({ userId: 'user-travis-maher', pin: '1234' });

      expect(authRes.status).toBe(200);
      expect(authRes.body.success).toBe(true);
      expect(authRes.body.token).toBeTruthy();
      expect(authRes.body.profile.isAdmin).toBe(true);

      const token = authRes.body.token;

      // 2. Access protected session with the valid bearer token
      const sessionRes = await request(app)
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${token}`);

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.userId).toBe('user-travis-maher');
      expect(sessionRes.body.name).toBe('Travis Maher');
      expect(sessionRes.body.isAdmin).toBe(true);
    });

    it('readSession returns null when only X-User-Id header is present on request', async () => {
      const mockReq: any = {
        headers: {
          'x-user-id': 'user-travis-maher'
        }
      };
      // Sessions are read from the shared store rather than a per-instance map,
      // so this is async now.
      await expect(readSession(mockReq)).resolves.toBeNull();
    });
  });

  describe('Task 3: Upgraded PIN Hashing with scrypt', () => {
    it('hashes PIN using scrypt with random salt into salt:key format', () => {
      const pin = '4321';
      const hash1 = hashPinWithScrypt(pin);
      const hash2 = hashPinWithScrypt(pin);

      expect(hash1).toContain(':');
      expect(hash2).toContain(':');
      // Due to random salt, two hashes for the same PIN must differ
      expect(hash1).not.toBe(hash2);

      const [salt1, key1] = hash1.split(':');
      expect(salt1.length).toBe(32); // 16 bytes = 32 hex chars
      expect(key1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('verifies correct PIN against scrypt hash and rejects wrong PIN', () => {
      const pin = '5678';
      const hash = hashPinWithScrypt(pin);

      expect(verifyPinWithScrypt('5678', hash)).toBe(true);
      expect(verifyPinWithScrypt('0000', hash)).toBe(false);
      expect(verifyPinWithScrypt('5679', hash)).toBe(false);
      expect(verifyPinWithScrypt('', hash)).toBe(false);
    });

    it('supports backward-compatibility and migration for legacy sha256 hashes', () => {
      const pin = '9999';
      const legacySha256 = createHash('sha256').update(pin).digest('hex');

      // Legacy verification should succeed
      expect(verifyPinWithScrypt(pin, legacySha256)).toBe(true);
      expect(verifyPinWithScrypt('1111', legacySha256)).toBe(false);
    });

    it('stores PIN in userProfileStore as scrypt format and validates correctly', async () => {
      const testUserId = `test-user-${Date.now()}`;
      await userProfileStore.setProfile({
        userId: testUserId,
        name: 'Test Rep',
        role: 'Internal Sales',
        isAdmin: false,
        pinHash: ''
      });

      const setSuccess = await userProfileStore.setPin(testUserId, '7890');
      expect(setSuccess).toBe(true);

      const profile = await userProfileStore.getProfile(testUserId);
      expect(profile).toBeDefined();
      expect(profile?.pinHash).toContain(':'); // scrypt format

      expect(await userProfileStore.verifyPin(testUserId, '7890')).toBe(true);
      expect(await userProfileStore.verifyPin(testUserId, '0000')).toBe(false);

      await userProfileStore.deleteProfile(testUserId);
    });
  });

  describe('The credential is never the caller\'s to supply', () => {
    // The preset PIN hashes are built once when the module loads, so this uses
    // the dev default rather than setting an env var the server will not re-read.
    const signInAsAdmin = async () => {
      const res = await request(app)
        .post('/api/auth/verify-profile')
        .send({ userId: 'user-travis-maher', pin: '1234' });
      return res.body.token as string | undefined;
    };

    it('refuses a sign-in whose PIN hash was supplied by the caller', async () => {
      // The hole: the request carried both the PIN and its hash, and one branch
      // checked them against each other. Anyone could satisfy that for any
      // profile, take an admin session, and have their chosen PIN written to it.
      const pin = 'not-the-real-pin';
      const res = await request(app)
        .post('/api/auth/verify-profile')
        .send({
          userId: 'user-travis-maher',
          pin,
          pinHash: createHash('sha256').update(pin).digest('hex')
        });

      expect(res.status).toBe(401);
      expect(res.body.token).toBeUndefined();

      // And it must not have quietly adopted that PIN as the profile's own.
      expect(await userProfileStore.verifyPin('user-travis-maher', pin)).toBe(false);
    });

    it('refuses to create or overwrite a profile without an admin session', async () => {
      const attempt = (req: request.Test) =>
        req.send({ userId: 'user-travis-maher', name: 'Travis Maher', isAdmin: true, pin: 'seized-9999' });

      const anonymous = await attempt(request(app).post('/api/auth/register-profile'));
      expect(anonymous.status).toBe(401);

      const badToken = await attempt(
        request(app).post('/api/auth/register-profile').set('Authorization', 'Bearer not-a-token')
      );
      expect(badToken.status).toBe(401);

      expect(await userProfileStore.verifyPin('user-travis-maher', 'seized-9999')).toBe(false);
    });

    it('refuses to set a PIN without a session', async () => {
      const res = await request(app)
        .post('/api/auth/set-pin')
        .send({ userId: 'user-travis-maher', pin: 'seized-9999' });

      expect(res.status).toBe(401);
      expect(await userProfileStore.verifyPin('user-travis-maher', 'seized-9999')).toBe(false);
    });

    it('lets a signed-in admin create a profile, and that profile can then sign in', async () => {
      const token = await signInAsAdmin();
      expect(token).toBeTruthy();

      const created = await request(app)
        .post('/api/auth/register-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'user-alan-berryman', name: 'Alan Berryman', pin: 'alan-pin-7731' });

      expect(created.status).toBe(200);
      // The stored hash is never handed back out.
      expect(created.body.profile?.pinHash).toBeUndefined();

      const signIn = await request(app)
        .post('/api/auth/verify-profile')
        .send({ userId: 'user-alan-berryman', pin: 'alan-pin-7731' });

      expect(signIn.status).toBe(200);
      expect(signIn.body.token).toBeTruthy();
      expect(signIn.body.profile.isAdmin).toBe(false);

      await userProfileStore.deleteProfile('user-alan-berryman');
    });

    it('keeps a profile\'s PIN when an admin amends their details', async () => {
      const token = await signInAsAdmin();
      await request(app)
        .post('/api/auth/register-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'user-amend-me', name: 'Before', pin: 'keep-me-5150' });

      // No pin in this call: an empty hash here would lock them out.
      await request(app)
        .post('/api/auth/register-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'user-amend-me', name: 'After', role: 'Estimator' });

      expect(await userProfileStore.verifyPin('user-amend-me', 'keep-me-5150')).toBe(true);
      await userProfileStore.deleteProfile('user-amend-me');
    });
  });

  describe('Task 4: Production Fail-Closed Boot Enforcement', () => {
    it('assertProductionSecurityConfig does not throw in non-production (test/dev) mode', () => {
      delete process.env.PLASGAIN_PIN_TRAVIS;
      delete process.env.PLASGAIN_PIN_SARAH;
      delete process.env.PLASGAIN_PIN_ROB;
      process.env.NODE_ENV = 'test';

      expect(() => assertProductionSecurityConfig()).not.toThrow();
    });

    it('assertProductionSecurityConfig throws in production when PLASGAIN_PIN_* env vars are missing', () => {
      delete process.env.PLASGAIN_PIN_TRAVIS;
      delete process.env.PLASGAIN_PIN_TRAVIS_MAHER;
      delete process.env.PLASGAIN_PIN_SARAH;
      delete process.env.PLASGAIN_PIN_SARAH_REED;
      delete process.env.PLASGAIN_PIN_ROB;
      delete process.env.PLASGAIN_PIN_ROB_MITCHELL;
      process.env.NODE_ENV = 'production';

      expect(() => assertProductionSecurityConfig()).toThrow(/Missing required PIN environment variables in production/i);
    });

    it('assertProductionSecurityConfig passes in production when all required PIN env vars are set', () => {
      process.env.NODE_ENV = 'production';
      process.env.PLASGAIN_PIN_TRAVIS = 'secure-travis-pin-9912';
      process.env.PLASGAIN_PIN_SARAH = 'secure-sarah-pin-8823';
      process.env.PLASGAIN_PIN_ROB = 'secure-rob-pin-7734';

      expect(() => assertProductionSecurityConfig()).not.toThrow();
    });

    it('assertProductionSecurityConfig still requires the live profile PIN on its own', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.PLASGAIN_PIN_TRAVIS;
      delete process.env.PLASGAIN_PIN_TRAVIS_MAHER;
      process.env.PLASGAIN_PIN_SARAH = 'secure-sarah-pin-8823';
      process.env.PLASGAIN_PIN_ROB = 'secure-rob-pin-7734';

      expect(() => assertProductionSecurityConfig()).toThrow(/PLASGAIN_PIN_TRAVIS/);
    });

    it('assertProductionSecurityConfig boots without PINs for the purged demo profiles', () => {
      // Sarah Reed and Rob Mitchell are the legacy demo accounts the app filters
      // out and deletes. Requiring their PINs took the whole API down on boot,
      // which is what stopped quotes being saved against an account at all.
      process.env.NODE_ENV = 'production';
      process.env.PLASGAIN_PIN_TRAVIS = 'secure-travis-pin-9912';
      delete process.env.PLASGAIN_PIN_SARAH;
      delete process.env.PLASGAIN_PIN_SARAH_REED;
      delete process.env.PLASGAIN_PIN_ROB;
      delete process.env.PLASGAIN_PIN_ROB_MITCHELL;

      expect(() => assertProductionSecurityConfig()).not.toThrow();
    });
  });
});
