// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";

// The knowledge directory has to be set before server.ts pulls the store in.
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "plasgain-knowledge-api-"));
fs.writeFileSync(
  path.join(fixtureDir, "footing-guidance.md"),
  `# Footing and Embedment Guidance

## Direct Burial
Embedment depth is measured from finished surface level and must account for
the wind region the column is installed in.
`,
  "utf-8"
);
process.env.PLASGAIN_KNOWLEDGE_DIR = fixtureDir;

const { app } = await import("../../../server");

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

describe("Knowledge library endpoints (Feature 08)", () => {
  it("reports what the Copilot can currently cite", async () => {
    const res = await request(app).get("/api/knowledge");

    expect(res.status).toBe(200);
    expect(res.body.documentCount).toBe(1);
    expect(res.body.isGrounded).toBe(true);
    expect(res.body.directory).toBe(fixtureDir);
    expect(res.body.documents[0]).toMatchObject({
      title: "Footing and Embedment Guidance",
      fileName: "footing-guidance.md"
    });
  });

  it("picks up a document added after startup when reloaded", async () => {
    fs.writeFileSync(
      path.join(fixtureDir, "lead-times.txt"),
      `Manufacturing slot booking and despatch lead times for project quantities,
measured in working days from order confirmation.`,
      "utf-8"
    );

    const res = await request(app).post("/api/knowledge/reload");

    expect(res.status).toBe(200);
    expect(res.body.documentCount).toBe(2);
    expect(res.body.documents.map((d: any) => d.fileName).sort()).toEqual([
      "footing-guidance.md",
      "lead-times.txt"
    ]);
  });

  it("does not serve the knowledge directory over HTTP", async () => {
    // These are internal reference documents; the retrieval layer is the only
    // thing that should be able to read them.
    const res = await request(app).get("/server_data/knowledge/footing-guidance.md");
    expect(res.status).toBe(404);
  });
});
