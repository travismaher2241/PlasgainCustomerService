// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * The store reads PLASGAIN_KNOWLEDGE_DIR once at construction, so the fixture
 * directory has to exist and the env var has to be set before the module is
 * imported.
 */
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "plasgain-knowledge-"));

fs.writeFileSync(
  path.join(fixtureDir, "column-spec.md"),
  `# Composite Column Specification

## Structural
Composite columns are rated for cyclone Region C with a direct burial embedment
depth of 1200mm in standard ground conditions. The column carries a 50 year
design life and requires no scheduled maintenance coating.

## Optical
Luminaires are supplied at 3000K to satisfy fauna-friendly and dark-sky
requirements, with zero upward waste light at the horizontal.
`,
  "utf-8"
);

fs.writeFileSync(
  path.join(fixtureDir, "tender-boilerplate.txt"),
  `Standard tender response boilerplate covering delivery lead times and the
manufacturing slot booking process for civil contractors working to a fixed
award date.`,
  "utf-8"
);

// Not a supported text format - must be ignored rather than indexed as garbage.
fs.writeFileSync(path.join(fixtureDir, "datasheet.pdf"), "%PDF-1.7 binary junk", "utf-8");

process.env.PLASGAIN_KNOWLEDGE_DIR = fixtureDir;

const { knowledgeStore } = await import("../../server/knowledgeStore");

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

describe("Grounded Knowledge Retrieval (Feature 08)", () => {
  it("indexes supported text documents and ignores everything else", () => {
    const status = knowledgeStore.getStatus();
    const docs = knowledgeStore.getDocuments();

    expect(status.documentCount).toBe(2);
    expect(status.isGrounded).toBe(true);
    expect(status.error).toBeNull();
    expect(docs.map((d) => d.fileName).sort()).toEqual(["column-spec.md", "tender-boilerplate.txt"]);
  });

  it("takes the document title from its leading heading", () => {
    const doc = knowledgeStore.getDocuments().find((d) => d.fileName === "column-spec.md");
    expect(doc!.title).toBe("Composite Column Specification");
  });

  it("splits on headings so a citation can name the section it came from", () => {
    const [top] = knowledgeStore.search("embedment depth direct burial");

    expect(top).toBeDefined();
    expect(top.documentTitle).toBe("Composite Column Specification");
    expect(top.section).toBe("Structural");
    expect(top.text).toContain("1200mm");
  });

  it("ranks the section that actually answers the question first", () => {
    const [top] = knowledgeStore.search("what colour temperature for fauna friendly lighting");

    expect(top.section).toBe("Optical");
    expect(top.text).toContain("3000K");
  });

  it("returns nothing when the question is not covered by any document", () => {
    // Nothing in the fixture mentions anything of the sort, so retrieval must
    // come back empty rather than returning the least-bad passage.
    const results = knowledgeStore.search("underwater marine cathodic protection anodes");
    expect(results).toEqual([]);
  });

  it("returns nothing for an empty or stop-word-only question", () => {
    expect(knowledgeStore.search("")).toEqual([]);
    expect(knowledgeStore.search("what is the")).toEqual([]);
  });

  it("respects the result limit and orders by descending score", () => {
    const results = knowledgeStore.search("column lighting delivery", 2);

    expect(results.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("picks up a document added after startup once reloaded", () => {
    fs.writeFileSync(
      path.join(fixtureDir, "warranty.md"),
      `# Warranty Terms

## Coverage
The structural warranty covers ultraviolet degradation and resin delamination
for the full published term from date of despatch.
`,
      "utf-8"
    );

    expect(knowledgeStore.search("resin delamination warranty")).toEqual([]);

    knowledgeStore.reload();

    expect(knowledgeStore.getStatus().documentCount).toBe(3);
    const [top] = knowledgeStore.search("resin delamination warranty");
    expect(top.documentTitle).toBe("Warranty Terms");
    expect(top.section).toBe("Coverage");
  });
});
