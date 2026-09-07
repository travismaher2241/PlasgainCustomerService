// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DEFAULT_MODEL, FALLBACK_MODELS } from "../../../server";

/**
 * The ladder is what keeps the workspace working when a model id is retired or
 * is not enabled for the key in use, so its shape is worth pinning down.
 */
describe("Gemini model ladder", () => {
  it("defaults to the current Flash generation", () => {
    // No GEMINI_MODEL is set in the test environment.
    expect(DEFAULT_MODEL).toBe("gemini-3.8-flash");
  });

  it("keeps older generations below the default as a fallback path", () => {
    expect(FALLBACK_MODELS.length).toBeGreaterThan(0);
    expect(FALLBACK_MODELS).toContain("gemini-2.5-flash");
  });

  it("never lists the same model twice", () => {
    // A duplicate would waste a retry on an id that has already failed.
    const ladder = [DEFAULT_MODEL, ...FALLBACK_MODELS];
    expect(new Set(ladder).size).toBe(ladder.length);
  });

  it("uses only concrete, pinned model ids", () => {
    // No "latest" aliases: a silent model swap underneath a working workspace
    // is exactly what the ladder exists to make visible and controllable.
    for (const model of [DEFAULT_MODEL, ...FALLBACK_MODELS]) {
      expect(model).toMatch(/^gemini-\d+(?:\.\d+)?-[a-z]+$/);
      expect(model).not.toContain("latest");
    }
  });
});
