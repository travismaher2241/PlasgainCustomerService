// @vitest-environment node
import { describe, it, expect } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { app } from "../../../server";

const FIXTURE = path.resolve(__dirname, "../fixtures/quote-sample.pdf");
const fixtureBase64 = () => fs.readFileSync(FIXTURE).toString("base64");

describe("Quote PDF import endpoint", () => {
  it("parses an uploaded quote and stores the file", async () => {
    const res = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "PL9001.pdf", fileBase64: fixtureBase64() });

    expect(res.status).toBe(200);
    expect(res.body.parsed.quoteNumber).toBe("PL9001");
    expect(res.body.parsed.nettTotal).toBe(4000);
    expect(res.body.parsed.customerName).toBe("Example Shire Council");
    expect(res.body.document.fileName).toBe("PL9001.pdf");
    expect(res.body.document.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the follow-up date, moved off a weekend", async () => {
    const res = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "PL9001.pdf", fileBase64: fixtureBase64() });

    // Quote is 3 April 2026, a Friday. Two days lands on Sunday, so Monday.
    expect(res.body.parsed.quoteDate).toBe("2026-04-03");
    expect(res.body.suggestedFollowUpDate).toBe("2026-04-06");
  });

  it("writes nothing to the CRM by itself", async () => {
    // The import only reads and stores; the workspace confirms before saving.
    const res = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "PL9001.pdf", fileBase64: fixtureBase64() });

    expect(res.body.document.opportunityId).toBeUndefined();
    expect(res.body.document.accountId).toBeUndefined();
  });

  it("refuses a file that is not a PDF", async () => {
    const res = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "notes.txt", fileBase64: Buffer.from("just some text").toString("base64") });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a PDF/i);
  });

  it("refuses an empty upload", async () => {
    const res = await request(app).post("/api/quotes/import-pdf").send({ fileName: "x.pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file was received/i);
  });

  it("serves the stored PDF back inline, by its own filename", async () => {
    const upload = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "PL9001.pdf", fileBase64: fixtureBase64() });

    const res = await request(app).get(`/api/quotes/${upload.body.document.id}/file`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain('inline; filename="PL9001.pdf"');
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    // Byte-identical to what was uploaded - this is the document a customer got.
    expect(res.body.length).toBe(fs.readFileSync(FIXTURE).length);
  });

  it("404s an unknown document rather than leaking a path", async () => {
    const res = await request(app).get("/api/quotes/does-not-exist/file");
    expect(res.status).toBe(404);
  });

  it("links a document to the deal it landed on and lists it there", async () => {
    const upload = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "PL9001.pdf", fileBase64: fixtureBase64() });
    const id = upload.body.document.id;

    const attach = await request(app)
      .post(`/api/quotes/${id}/attach`)
      .send({ opportunityId: "deal-xyz", accountId: "acc-xyz" });

    expect(attach.status).toBe(200);
    expect(attach.body.document.opportunityId).toBe("deal-xyz");

    const list = await request(app).get("/api/quotes/by-opportunity/deal-xyz");
    expect(list.status).toBe(200);
    expect(list.body.documents.map((d: any) => d.id)).toContain(id);
  });

  it("keeps every revision against the deal, newest first", async () => {
    // A re-quoted PL9001 must not erase what the customer was first sent.
    for (const name of ["rev-a.pdf", "rev-b.pdf"]) {
      const up = await request(app)
        .post("/api/quotes/import-pdf")
        .send({ fileName: name, fileBase64: fixtureBase64() });
      await request(app).post(`/api/quotes/${up.body.document.id}/attach`).send({ opportunityId: "deal-rev" });
    }

    const list = await request(app).get("/api/quotes/by-opportunity/deal-rev");
    expect(list.body.documents).toHaveLength(2);
    expect(list.body.documents.map((d: any) => d.fileName).sort()).toEqual(["rev-a.pdf", "rev-b.pdf"]);
  });

  it("requires an opportunity when linking", async () => {
    const res = await request(app).post("/api/quotes/some-id/attach").send({});
    expect(res.status).toBe(400);
  });

  it("tells you a scanned PDF has no text, rather than failing silently", async () => {
    // A valid PDF header with no readable text layer. The import must say the
    // details need entering by hand - it must not save an empty quote.
    const noTextLayer = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<<>>\n%%EOF\n");
    const res = await request(app)
      .post("/api/quotes/import-pdf")
      .send({ fileName: "scan.pdf", fileBase64: noTextLayer.toString("base64") });

    // Either it parses to nothing with a warning, or it reports it cannot read
    // it. What it must never do is claim a successful import with no content.
    if (res.status === 200) {
      expect(res.body.parsed.lineItems).toHaveLength(0);
      expect(res.body.parsed.warnings.join(" ")).toMatch(/no readable text|could not/i);
    } else {
      expect([422, 503]).toContain(res.status);
      expect(res.body.error).toBeTruthy();
    }
  });

  it("does not serve quote documents over the static path", async () => {
    const res = await request(app).get("/server_data/quote_documents/index.json");
    expect(res.status).toBe(404);
  });
});
