// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pdfFixture } from "../pdfFixture";

const model = vi.hoisted(() => ({ generate: vi.fn(), stream: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent: model.generate, generateContentStream: model.stream }; } }));
import { app } from "../../../server";
import { knowledgeStore } from "../../server/knowledgeStore";
let directory: string;
let token: string;
let sourceId: string;
const verifiedText = "TEST ZX-10 top entry pole. Powercor: Approved. Jemena: not stated; the source cell is blank.";
beforeAll(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "plasgain-grounding-test-"));
  vi.stubEnv("PLASGAIN_KNOWLEDGE_DIR", directory);
  vi.stubEnv("GEMINI_API_KEY", "test-not-a-real-api-key");
  const login = await request(app).post("/api/auth/verify-profile").send({ userId: "user-travis-maher", pin: process.env.PLASGAIN_PIN_TRAVIS || "1234" });
  expect(login.status).toBe(200); token = login.body.token;
  const result = await knowledgeStore.ingest(pdfFixture([[{ x: 10, y: 700, text: verifiedText }]]), {
    title: "TEST ZX-10 approvals", productFamily: "Test poles", documentType: "Specification", version: "1", versionOwner: "Test reviewer", source: "Test fixture", fileName: "fixture.pdf", effectiveDate: "2020-01-01", reviewExpiryDate: "2099-01-01",
  }, "Test uploader");
  sourceId = `${result.document.id}:p1`;
  await knowledgeStore.review(result.document.id, 1, { text: verifiedText, excluded: false, reason: "", revision: 1 }, "Test reviewer");
  await knowledgeStore.approve(result.document.id, 2, "Test reviewer");
});
afterAll(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
beforeEach(() => { model.generate.mockReset(); model.stream.mockReset(); });
const ask = () => request(app).post("/api/knowledge/ask").set("Authorization", `Bearer ${token}`).send({ question: "Is TEST ZX-10 approved by Jemena?" });

describe("Real model-call grounding boundary", () => {
  it("does not serve private runtime directories as public static files", async () => {
    expect((await request(app).get("/tmp/browser-knowledge/document.json")).status).toBe(404);
    expect((await request(app).get("/server_data/knowledge/document.pdf")).status).toBe(404);
  });
  it("sends actual reviewed page text and returns verified page citations", async () => {
    model.generate.mockResolvedValueOnce({ text: JSON.stringify({ answer: "Jemena approval is not stated for TEST ZX-10; the source cell is blank.", foundInKnowledgeBase: true, citations: [{ sourceId, excerpt: "Jemena: not stated; the source cell is blank." }] }) });
    model.generate.mockResolvedValueOnce({ text: '{"supported":true}' });
    const response = await ask();
    expect(response.status).toBe(200);
    expect(model.generate.mock.calls[0][0].config.systemInstruction).toContain(verifiedText);
    expect(model.generate.mock.calls[0][0].config.systemInstruction).toContain("never Approved or Not Approved");
    expect(response.body.citations[0]).toMatchObject({ sourceId, page: 1, pageOrSection: "PDF page 1" });
    expect(response.body.confidence).not.toBe("High");
    expect(model.generate).toHaveBeenCalledTimes(2);
  });
  it("withholds invented excerpts before they reach the UI", async () => {
    model.generate.mockResolvedValueOnce({ text: JSON.stringify({ answer: "Jemena has approved ZX-10", foundInKnowledgeBase: true, citations: [{ sourceId, excerpt: "Jemena has approved ZX-10" }] }) });
    const response = await ask();
    expect(response.body.foundInKnowledgeBase).toBe(false);
    expect(response.body.answer).not.toContain("Jemena has approved");
    expect(response.body.citations).toEqual([]);
    expect(model.generate).toHaveBeenCalledTimes(1);
  });
  it("withholds a wrong conclusion even with a real quote when the second check rejects it", async () => {
    model.generate.mockResolvedValueOnce({ text: JSON.stringify({ answer: "All utilities approved ZX-10", foundInKnowledgeBase: true, citations: [{ sourceId, excerpt: verifiedText }] }) });
    model.generate.mockResolvedValueOnce({ text: '{"supported":false}' });
    const response = await ask();
    expect(response.body.foundInKnowledgeBase).toBe(false);
    expect(response.body.answer).toContain("did not pass");
  });
  it("does not leak private page text into unauthenticated AI calls", async () => {
    model.generate.mockResolvedValueOnce({ text: '{"answer":"No approved information available"}' });
    await request(app).post("/api/knowledge/ask").send({ question: "Is TEST ZX-10 approved by Jemena?" });
    expect(model.generate.mock.calls[0][0].config.systemInstruction).not.toContain(verifiedText);
  });
  it("streams only the checked answer and real page citation to Copilot", async () => {
    model.generate.mockResolvedValueOnce({ text: JSON.stringify({ answer: "Jemena approval is not stated.", foundInKnowledgeBase: true, citations: [{ sourceId, excerpt: "Jemena: not stated; the source cell is blank." }] }) });
    model.generate.mockResolvedValueOnce({ text: '{"supported":true}' });
    const response = await request(app).post("/api/copilot/chat-stream").set("Authorization", `Bearer ${token}`).send({ message: "Is TEST ZX-10 approved by Jemena?" });
    expect(response.status).toBe(200);
    expect(response.text).toContain('"page":1');
    expect(response.text).toContain(sourceId);
    expect(response.text).not.toContain("/docs/");
    expect(model.stream).not.toHaveBeenCalled();
  });
});
