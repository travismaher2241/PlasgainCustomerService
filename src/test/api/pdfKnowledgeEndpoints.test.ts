// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { knowledgeRouter } from "../../server/knowledgeRoutes";
import { knowledgeStore } from "../../server/knowledgeStore";
import { pdfFixture } from "../pdfFixture";

let directory: string;
const app = express();
app.use(express.json());
app.use("/api/knowledge/documents", knowledgeRouter(req => {
  const token = req.headers.authorization;
  return token === "Bearer admin-test" || token === "Bearer sales-test" ? {
    name: "Verified test user", role: "Internal Sales", userId: "test", isAdmin: token === "Bearer admin-test", issuedAt: Date.now(), expiresAt: Date.now()+10000,
  } : null;
}));
const metadata = { title: "Endpoint test", productFamily: "Public lighting", documentType: "Specification", version: "1", versionOwner: "Reviewer", source: "Test", fileName: "test.pdf", effectiveDate: "2020-01-01", reviewExpiryDate: "2099-01-01", approvalStatus: "Approved", approvedBy: "Forged identity", id: "overwrite" };
const upload = (token = "admin-test", data = pdfFixture(), details = metadata) => request(app).post("/api/knowledge/documents/upload").set("Authorization", `Bearer ${token}`).set("Content-Type", "application/pdf").set("X-Document-Metadata", encodeURIComponent(JSON.stringify(details))).send(data);
beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), "plasgain-pdf-api-")); vi.stubEnv("PLASGAIN_KNOWLEDGE_DIR", directory); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe("Actual PDF upload API", () => {
  it("requires a session for uploading, listing, viewing and downloading", async () => {
    expect((await upload("invalid")).status).toBe(401);
    expect((await request(app).get("/api/knowledge/documents")).status).toBe(401);
    const response = await upload();
    expect(response.status).toBe(201);
    const id = response.body.document.id;
    expect((await request(app).get(`/api/knowledge/documents/${id}`)).status).toBe(401);
    expect((await request(app).get(`/api/knowledge/documents/${id}/file`)).status).toBe(401);
  });
  it("stores real bytes, reports server facts, and ignores forged status/checksum/identity", async () => {
    const result = await upload("sales-test");
    expect(result.status).toBe(201);
    const doc = result.body.document;
    expect(doc).toMatchObject({ approvalStatus: "Approved", pageCount: 2, uploader: "Verified test user (Internal Sales)" });
    expect(doc.id).toMatch(/^pdf-[a-f0-9]{64}$/);
    const download = await request(app).get(doc.fileUrl).set("Authorization", "Bearer sales-test");
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    expect(download.headers["cache-control"]).toContain("no-store");
    expect(download.body).toEqual(pdfFixture());
    expect((await upload()).body.duplicate).toBe(true);
    expect(await knowledgeStore.list()).toHaveLength(1);
  });
  it("lets any signed-in user correct page text, but only an admin can retire a document", async () => {
    const doc = (await upload()).body.document;
    const prefix = `/api/knowledge/documents/${doc.id}`;
    const review = { revision: 1, text: "Verified text of test pole code ZX-10", excluded: false, reason: "", confirmed: true };
    // Correcting extracted text isn't gated by role — this is a small sales team with
    // no dedicated engineering/compliance titles to check against.
    expect((await request(app).post(`${prefix}/pages/1/review`).set("Authorization", "Bearer sales-test").send(review)).status).toBe(200);
    // Withdrawing a document from AI use is the one consequential action, so that stays admin-gated.
    expect((await request(app).post(`${prefix}/retire`).set("Authorization", "Bearer sales-test").send({ revision: 2 })).status).toBe(403);
    expect((await request(app).post(`${prefix}/retire`).set("Authorization", "Bearer admin-test").send({ revision: 2 })).body.approvalStatus).toBe("Superseded");
  });
  it("rejects unsupported bytes, invalid dates, missing details and oversized files without registering a record", async () => {
    expect((await upload("admin-test", Buffer.from("fake pdf"))).status).toBe(422);
    expect((await upload("admin-test", pdfFixture(), { ...metadata, effectiveDate: "2026-02-30" })).status).toBe(400);
    expect((await request(app).post("/api/knowledge/documents/upload").set("Authorization", "Bearer admin-test").send({ title: "metadata only" })).status).toBe(415);
    expect((await upload("admin-test", Buffer.alloc(25*1024*1024+1))).status).toBe(413);
    expect(await knowledgeStore.list()).toEqual([]);
  });
});
