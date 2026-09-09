import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { createDocBackend } from "../../server/docStore";
import { cloudPersistenceStatus, isCloudPersistenceEnabled } from "../../server/firestoreAdmin";

/**
 * The persistence layer that replaced the raw JSON files.
 *
 * The bug being guarded against: every server store wrote to a file that, on a
 * serverless host, lived in /tmp. That directory is wiped between deployments
 * and is not shared between the instances serving concurrent users, so a quote
 * one rep saved could be invisible to another and then disappear entirely.
 *
 * These cover the adapter's own contract. Firestore itself is not exercised —
 * tests must never reach the live project — so the file backend stands in, and
 * the pieces that only matter in the cloud (transactions, the bucket) are
 * verified by their shared interface rather than by hitting the network.
 */
describe("Persistence backend", () => {
  let workingDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    workingDir = fs.mkdtempSync(path.join(os.tmpdir(), "plasgain-docstore-"));
    process.chdir(workingDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(workingDir, { recursive: true, force: true });
  });

  interface Row {
    id: string;
    name: string;
    version?: number;
    optional?: string;
  }

  it("round-trips a document", async () => {
    const backend = createDocBackend<Row>("test_rows", "test_rows.json");
    await backend.put("r1", { id: "r1", name: "Cardinia Shire" });

    expect(await backend.get("r1")).toMatchObject({ id: "r1", name: "Cardinia Shire" });
    expect(await backend.loadAll()).toHaveLength(1);
  });

  it("returns null rather than throwing for a document that is not there", async () => {
    const backend = createDocBackend<Row>("test_rows", "test_rows.json");
    expect(await backend.get("missing")).toBeNull();
  });

  it("removes a document", async () => {
    const backend = createDocBackend<Row>("test_rows", "test_rows.json");
    await backend.put("r1", { id: "r1", name: "One" });
    await backend.remove("r1");
    expect(await backend.get("r1")).toBeNull();
    expect(await backend.loadAll()).toHaveLength(0);
  });

  it("writes many documents in one call", async () => {
    const backend = createDocBackend<Row>("test_rows", "test_rows.json");
    await backend.putMany([
      { id: "a", doc: { id: "a", name: "A" } },
      { id: "b", doc: { id: "b", name: "B" } }
    ]);
    expect(await backend.loadAll()).toHaveLength(2);
  });

  it("reads an older file that stored a bare array", async () => {
    // The stores used to serialise arrays. Those files must still load, or an
    // existing local workspace would silently appear empty after upgrading.
    //
    // The file backend deliberately stays in memory under test, so the env
    // flags are lifted for this one case to exercise the real disk path — the
    // only way to cover the format migration at all.
    const dir = path.join(workingDir, "server_data");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "legacy_rows.json"),
      JSON.stringify([{ id: "old-1", name: "Legacy" }]),
      "utf-8"
    );

    const savedVitest = process.env.VITEST;
    const savedNodeEnv = process.env.NODE_ENV;
    delete process.env.VITEST;
    process.env.NODE_ENV = "development";
    try {
      const backend = createDocBackend<Row>("legacy_rows", "legacy_rows.json");
      const all = await backend.loadAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({ id: "old-1", name: "Legacy" });
    } finally {
      if (savedVitest === undefined) delete process.env.VITEST;
      else process.env.VITEST = savedVitest;
      if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNodeEnv;
    }
  });

  describe("mutate", () => {
    it("applies a change to the current value", async () => {
      const backend = createDocBackend<Row>("test_rows", "test_rows.json");
      await backend.put("r1", { id: "r1", name: "One", version: 1 });

      const updated = await backend.mutate("r1", (current) => {
        expect(current).toMatchObject({ id: "r1", version: 1 });
        return { ...(current as Row), version: 2 };
      });

      expect(updated.version).toBe(2);
      expect((await backend.get("r1"))!.version).toBe(2);
    });

    it("passes null when the document does not exist yet", async () => {
      const backend = createDocBackend<Row>("test_rows", "test_rows.json");
      const created = await backend.mutate("new", (current) => {
        expect(current).toBeNull();
        return { id: "new", name: "Created" };
      });
      expect(created.name).toBe("Created");
    });

    it("writes nothing when the callback throws", async () => {
      // This is what makes the version check safe: a conflict aborts the whole
      // read-modify-write rather than leaving a partial update behind.
      const backend = createDocBackend<Row>("test_rows", "test_rows.json");
      await backend.put("r1", { id: "r1", name: "Original", version: 1 });

      await expect(
        backend.mutate("r1", () => {
          throw new Error("version conflict");
        })
      ).rejects.toThrow("version conflict");

      expect(await backend.get("r1")).toMatchObject({ name: "Original", version: 1 });
    });
  });

  describe("durability reporting", () => {
    it("reports the file backend as not durable", async () => {
      const backend = createDocBackend<Row>("test_rows", "test_rows.json");
      // Under test there are no credentials, so the file backend is selected —
      // and it must say so rather than claiming data is safe.
      expect(backend.durable).toBe(false);
    });

    it("never reaches the live project under test", () => {
      expect(isCloudPersistenceEnabled()).toBe(false);
      expect(cloudPersistenceStatus()).toMatchObject({
        enabled: false,
        reason: "Disabled under test."
      });
    });
  });
});
