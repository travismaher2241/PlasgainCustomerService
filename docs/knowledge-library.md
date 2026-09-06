# Grounded knowledge library

The Copilot can answer from Plasgain's own reference documents and show where
each claim came from, rather than generating plausible-sounding technical
figures. This describes how to load those documents.

**Nothing ships in here.** The library starts empty on purpose: no product
specification, photometric figure or standards clause in this repository was
written by anyone who could verify it, and a fabricated lumen output or
clearance figure inside a tender response is a commercial and legal exposure.
Everything the Copilot cites has to be a document you put there.

## Where documents go

```
server_data/knowledge/
```

Override with `PLASGAIN_KNOWLEDGE_DIR` if the documents live elsewhere (a
mounted share, a synced folder). The directory is gitignored and is excluded
from the dev server's file serving, so nothing in it is reachable over HTTP.

## Supported formats

`.md`, `.markdown`, `.txt` — plain text only.

PDFs and Word documents are **ignored**, not parsed. Reading a binary as text
produces garbage passages that then get cited as though they were real, which
is worse than not indexing the file at all. To use a PDF spec sheet, export or
paste the relevant text into a `.md` file.

## How to write a document

Give each file a heading structure. Headings become the **clause reference** on
the citation, which is what makes a quoted figure checkable by the person
reading the tender response.

```markdown
# Composite Column Specification

## Structural
Embedment depth, wind region ratings, design life.

## Optical
Colour temperature, distribution, upward waste light.

## Compliance
The AS/NZS clauses this product is certified against.
```

- The first `# Heading` becomes the document title in the citation. Without
  one, the filename is used.
- Each `##` section is retrieved and cited separately, so keep a section to one
  subject.
- Sections longer than ~1200 characters are split on paragraph boundaries, so a
  citation never points at several pages at once.

Good candidates: product spec sheets, photometric summaries, warranty terms,
standards extracts (AS/NZS 1158 and similar), past tender responses, installation
and footing guidance, compliance certificates.

## Picking up changes

The library is indexed at server start. After adding or editing a file:

```
curl -X POST http://localhost:3000/api/knowledge/reload
```

`GET /api/knowledge` reports what is currently indexed — document count,
passage count, and the directory in use.

## What the Copilot does with it

For each question, the most relevant passages are retrieved **before** the model
is called and passed to it as the only permitted source for product
specifications, photometric figures, standards clauses and compliance claims.
Those passages come back to the workspace as the citations shown under the
answer.

When retrieval finds nothing — either because the library is empty or because
no document covers the question — the model is told to say the detail is not
documented rather than fill the gap from general knowledge. An answer with no
citations attached is one you should treat as ungrounded.
