import fs from "fs";
import path from "path";

/**
 * Grounded Knowledge Retrieval (Feature 08)
 *
 * Indexes Plasgain's own reference documents - spec sheets, photometric
 * summaries, past tender responses, standards extracts - so the Copilot can
 * quote them and say where each claim came from, instead of generating
 * plausible-sounding technical numbers.
 *
 * That distinction is the whole point of this module. A wrong lumen output,
 * IP rating or clearance figure inside a tender response is a commercial and
 * legal exposure, not a bad user experience. So retrieval here returns
 * passages with their source, and the caller is expected to tell the model to
 * answer only from them.
 *
 * Deliberately dependency-free. Scoring is term-frequency over inverse
 * document frequency, computed in memory - no embedding service, no network
 * call, no API key. That keeps grounding working when the AI key is absent,
 * makes the ranking deterministic, and makes it testable.
 *
 * Ships empty. Documents are the user's own; none are invented here.
 */

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const KNOWLEDGE_DIR = process.env.PLASGAIN_KNOWLEDGE_DIR
  ? path.resolve(process.env.PLASGAIN_KNOWLEDGE_DIR)
  : path.join(DATA_DIR, "knowledge");

/** Plain-text formats only - a binary parsed as text yields garbage passages. */
const SUPPORTED_EXTENSIONS = [".md", ".markdown", ".txt"];

/** Passages shorter than this carry no usable context. */
const MIN_PASSAGE_CHARS = 40;
/** Long sections are split so a citation points at something readable. */
const MAX_PASSAGE_CHARS = 1200;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "is", "are",
  "be", "with", "as", "at", "by", "it", "this", "that", "from", "we", "you",
  "what", "which", "how", "can", "do", "does", "our", "their", "have", "has"
]);

export interface KnowledgePassage {
  id: string;
  documentId: string;
  documentTitle: string;
  /** The heading this passage sits under, used as the clause reference. */
  section?: string;
  text: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  fileName: string;
  passageCount: number;
  sizeBytes: number;
  updatedAt: string;
}

export interface RetrievedPassage extends KnowledgePassage {
  score: number;
}

function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .split(/[^a-z0-9.\-/]+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Compounds are kept whole AND split, so "AS/NZS 1158" still matches
  // exactly while a rep asking about "fauna friendly" lighting still finds a
  // passage written as "fauna-friendly". Without this, the hyphens sales and
  // engineering documents are full of make whole sections unreachable.
  const tokens: string[] = [];
  for (const token of raw) {
    tokens.push(token);
    if (/[-/]/.test(token)) {
      for (const part of token.split(/[-/]+/)) {
        if (part.length > 1 && !STOP_WORDS.has(part)) tokens.push(part);
      }
    }
  }
  return tokens;
}

/**
 * Splits on markdown headings so a citation can name the clause it came from,
 * which is what makes a quoted standard checkable.
 */
function splitIntoPassages(raw: string, documentId: string, documentTitle: string): KnowledgePassage[] {
  const lines = raw.split(/\r?\n/);
  const passages: KnowledgePassage[] = [];

  let currentSection: string | undefined;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (text.length < MIN_PASSAGE_CHARS) return;

    // Oversized sections are chunked on paragraph boundaries so no citation
    // points at several pages of text.
    const chunks: string[] = [];
    if (text.length <= MAX_PASSAGE_CHARS) {
      chunks.push(text);
    } else {
      let acc = "";
      for (const para of text.split(/\n{2,}/)) {
        if (acc && (acc.length + para.length) > MAX_PASSAGE_CHARS) {
          chunks.push(acc.trim());
          acc = para;
        } else {
          acc = acc ? `${acc}\n\n${para}` : para;
        }
      }
      if (acc.trim()) chunks.push(acc.trim());
    }

    for (const chunk of chunks) {
      if (chunk.length < MIN_PASSAGE_CHARS) continue;
      passages.push({
        id: `${documentId}#${passages.length}`,
        documentId,
        documentTitle,
        section: currentSection,
        text: chunk
      });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      currentSection = heading[1].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return passages;
}

class KnowledgeStore {
  private documents: KnowledgeDocument[] = [];
  private passages: KnowledgePassage[] = [];
  /** token -> number of passages containing it, for inverse document frequency. */
  private documentFrequency = new Map<string, number>();
  private passageTokens: string[][] = [];
  private loadError: string | null = null;
  private isLoaded = false;

  constructor() {
    this.load();
  }

  /** Re-reads the directory. Called on demand so dropping in a file takes effect. */
  public reload(): void {
    this.isLoaded = false;
    this.load();
  }

  private load(): void {
    if (this.isLoaded) return;
    this.documents = [];
    this.passages = [];
    this.documentFrequency = new Map();
    this.passageTokens = [];
    this.loadError = null;

    try {
      if (!fs.existsSync(KNOWLEDGE_DIR)) {
        this.isLoaded = true;
        return;
      }

      const entries = fs
        .readdirSync(KNOWLEDGE_DIR, { withFileTypes: true })
        .filter((e) => e.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(e.name).toLowerCase()));

      for (const entry of entries) {
        const filePath = path.join(KNOWLEDGE_DIR, entry.name);
        const raw = fs.readFileSync(filePath, "utf-8");
        const stat = fs.statSync(filePath);
        const documentId = entry.name.replace(/\.[^.]+$/, "");

        // A leading H1 is the document's own name; otherwise fall back to the
        // filename so a citation always has something to display.
        const h1 = raw.match(/^#\s+(.+)$/m);
        const title = (h1 ? h1[1] : documentId.replace(/[-_]+/g, " ")).trim();

        const docPassages = splitIntoPassages(raw, documentId, title);
        this.passages.push(...docPassages);
        this.documents.push({
          id: documentId,
          title,
          fileName: entry.name,
          passageCount: docPassages.length,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString()
        });
      }

      for (const passage of this.passages) {
        const tokens = tokenize(`${passage.section || ""} ${passage.text}`);
        this.passageTokens.push(tokens);
        for (const token of new Set(tokens)) {
          this.documentFrequency.set(token, (this.documentFrequency.get(token) || 0) + 1);
        }
      }

      this.isLoaded = true;
    } catch (err: any) {
      // A broken knowledge directory must not take the workspace down; the
      // Copilot simply reports that it has nothing to cite.
      console.error("[KnowledgeStore] Failed to index knowledge directory:", err);
      this.loadError = err?.message || "Unknown error reading knowledge directory";
      this.isLoaded = true;
    }
  }

  public getDirectory(): string {
    return KNOWLEDGE_DIR;
  }

  public getDocuments(): KnowledgeDocument[] {
    return [...this.documents].sort((a, b) => a.title.localeCompare(b.title));
  }

  public getStatus(): {
    documentCount: number;
    passageCount: number;
    directory: string;
    isGrounded: boolean;
    error: string | null;
  } {
    return {
      documentCount: this.documents.length,
      passageCount: this.passages.length,
      directory: KNOWLEDGE_DIR,
      isGrounded: this.passages.length > 0,
      error: this.loadError
    };
  }

  /**
   * Returns the passages most likely to answer the query, best first.
   * An empty array means nothing relevant was found - the caller must treat
   * that as "cannot ground this answer", never as "answer from memory".
   */
  public search(query: string, limit = 4): RetrievedPassage[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.passages.length === 0) return [];

    const totalPassages = this.passages.length;
    const scored: RetrievedPassage[] = [];

    for (let i = 0; i < this.passages.length; i++) {
      const tokens = this.passageTokens[i];
      if (tokens.length === 0) continue;

      const counts = new Map<string, number>();
      for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);

      let score = 0;
      for (const qt of new Set(queryTokens)) {
        const tf = counts.get(qt);
        if (!tf) continue;
        const df = this.documentFrequency.get(qt) || 1;
        // Log-scaled term frequency, damped by how common the term is, so a
        // word appearing in every passage cannot dominate the ranking.
        score += (1 + Math.log(tf)) * Math.log(1 + totalPassages / df);
      }

      if (score > 0) {
        scored.push({ ...this.passages[i], score: Number(score.toFixed(4)) });
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const knowledgeStore = new KnowledgeStore();
