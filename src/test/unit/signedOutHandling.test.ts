import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  apiGet,
  apiPost,
  setSessionToken,
  getSessionToken,
  NotSignedInError,
  ApiError,
  toUserMessage
} from "../../utils/apiClient";

/**
 * What a 401 means to the rep holding the screen.
 *
 * The workspace renders without requiring a sign-in, so someone can work for a
 * while carrying no session — or one the server has forgotten across a
 * deployment — and discover it only when a write is refused. In production that
 * surfaced as "the server is not reachable", which sent people looking for an
 * outage that was not happening while every quote they imported was dropped.
 *
 * A 401 is the one failure the rep can actually fix, so it has to be named.
 */
describe("Signed-out handling", () => {
  const originalFetch = global.fetch;

  const respondWith = (status: number, body: unknown = {}) => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    ) as unknown as typeof fetch;
  };

  beforeEach(() => {
    setSessionToken("a-token-the-server-no-longer-knows");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setSessionToken(null);
  });

  it("raises NotSignedInError for a 401 on a write", async () => {
    respondWith(401, { error: "Sign in again." });
    await expect(apiPost("/api/opportunities", {})).rejects.toBeInstanceOf(NotSignedInError);
  });

  it("raises NotSignedInError for a 401 on a read", async () => {
    respondWith(401, { error: "Sign in again." });
    await expect(apiGet("/api/opportunities")).rejects.toBeInstanceOf(NotSignedInError);
  });

  it("clears the dead token, so the next sign-in starts clean", async () => {
    respondWith(401, { error: "Sign in again." });
    await expect(apiPost("/api/opportunities", {})).rejects.toBeInstanceOf(NotSignedInError);
    expect(getSessionToken()).toBeNull();
  });

  it("tells the rep to sign in rather than blaming the connection", async () => {
    respondWith(401, { error: "Sign in again." });
    const message = await apiPost("/api/opportunities", {}).catch((err) => toUserMessage(err));
    expect(message).toMatch(/sign in with your PIN/i);
    expect(message).not.toMatch(/connection|unreachable|not reachable/i);
  });

  it("leaves other failures alone", async () => {
    // A 500 is the server's problem, not the rep's. It must not clear their
    // session or send them to a PIN screen that will not help.
    respondWith(500, { error: "Internal Server Error" });
    await expect(apiPost("/api/opportunities", {})).rejects.toBeInstanceOf(ApiError);
    expect(getSessionToken()).toBe("a-token-the-server-no-longer-knows");
  });

  it("leaves a validation rejection alone", async () => {
    respondWith(400, { error: "Deal value is required." });
    const err = await apiPost("/api/opportunities", {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(NotSignedInError);
    expect(getSessionToken()).not.toBeNull();
  });
});
