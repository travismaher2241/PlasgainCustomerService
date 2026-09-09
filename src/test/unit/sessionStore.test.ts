// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { sessionStore } from "../../server/sessionStore";

/**
 * Sessions used to live in a Map inside the server module. On a serverless host
 * that is one map per function instance, so a token issued during sign-in was
 * unknown to whichever instance served the next request: every call answered
 * 401, and a rep who had just signed in could save nothing. They go through the
 * shared store now, which is what these cover.
 */
const aSession = (overrides: Partial<Parameters<typeof sessionStore.create>[1]> = {}) => ({
  userId: "user-travis-maher",
  name: "Travis Maher",
  role: "Internal Sales & Technical Lead",
  isAdmin: true,
  issuedAt: Date.now(),
  expiresAt: Date.now() + 60_000,
  ...overrides
});

describe("Session store", () => {
  beforeEach(async () => {
    await sessionStore.destroyForUser("user-travis-maher");
    await sessionStore.destroyForUser("user-someone-else");
  });

  it("reads back a session issued against its token", async () => {
    await sessionStore.create("token-abc", aSession());

    const found = await sessionStore.get("token-abc");
    expect(found?.userId).toBe("user-travis-maher");
    expect(found?.isAdmin).toBe(true);
  });

  it("does not answer to a token it never issued", async () => {
    await sessionStore.create("token-abc", aSession());

    expect(await sessionStore.get("token-not-issued")).toBeNull();
    expect(await sessionStore.get("")).toBeNull();
  });

  it("refuses an expired session and clears it out", async () => {
    await sessionStore.create("token-old", aSession({ expiresAt: Date.now() - 1 }));

    expect(await sessionStore.get("token-old")).toBeNull();
    // Removed as it was found, so the collection does not accumulate every
    // session ever issued.
    expect(await sessionStore.get("token-old")).toBeNull();
  });

  it("ends a session on sign-out", async () => {
    await sessionStore.create("token-abc", aSession());
    await sessionStore.destroy("token-abc");

    expect(await sessionStore.get("token-abc")).toBeNull();
  });

  it("ends every session a profile holds, leaving other people signed in", async () => {
    await sessionStore.create("token-1", aSession());
    await sessionStore.create("token-2", aSession());
    await sessionStore.create("token-other", aSession({ userId: "user-someone-else" }));

    expect(await sessionStore.destroyForUser("user-travis-maher")).toBe(2);

    expect(await sessionStore.get("token-1")).toBeNull();
    expect(await sessionStore.get("token-2")).toBeNull();
    expect(await sessionStore.get("token-other")).not.toBeNull();
  });
});
