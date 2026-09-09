import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Guards the app's own voice against product, specification and standards jargon.
 *
 * The reference-document library that once backed those claims has been removed,
 * so the app has no source of truth for a spec figure, rating or standards clause.
 * Anything it authors using that vocabulary is therefore unbacked by construction —
 * which is the exact failure this codebase was built to prevent (see README,
 * "Grounding"). A wrong lumen output or compliance claim inside a tender email is a
 * commercial and legal exposure, not a copy problem.
 *
 * The rule this test enforces:
 *
 *   The app may READ jargon. It must not AUTHOR it.
 *
 * Councils write tenders saying "AS/NZS 1158.3.1 Category P4, 6m mounting height",
 * and the parsers must keep handling that text. What is banned is Plasgain's own
 * side of the conversation: UI copy, email templates, battlecards, generated next
 * actions, and the instructions given to the AI.
 *
 * If this test fails, do not add the offending file to the allowlist. Rewrite the
 * copy in commercial terms — what the rep should do, ask, or send — or route the
 * question to the Plasgain product team.
 */
describe('Copy vocabulary guard', () => {
  const root = process.cwd();

  /**
   * Files the app authors from. Scanned in full.
   */
  const AUTHORED_SOURCES = [
    'server.ts',
    'src/utils/ostendoExporter.ts',
    'src/utils/competitorIntelligence.ts',
    'src/utils/crmIntelligence.ts',
    'src/utils/crmCallPreparation.ts',
    'src/utils/crmMeetingPreparation.ts',
    'src/utils/crmKnowledgeEngine.ts',
    'src/components/AIEmailComposerModal.tsx',
    'src/components/CustomerFollowUpModal.tsx',
    'src/components/GlobalCopilot.tsx',
    'src/components/crm/CRMAccountsView.tsx',
    'src/components/crm/CRMTasksActivitiesView.tsx',
    'src/components/crm/CRMLeadsView.tsx',
    'src/components/crm/CRMCompetitorPricingView.tsx',
    'src/components/crm/CRMDealDetailsWorkspace.tsx',
    'src/components/crm/CRMCallPrepModal.tsx',
    'src/components/crm/CRMMeetingPrepModal.tsx',
    'src/types/crm.ts'
  ];

  /**
   * Spec, standards and product-measurement vocabulary the app must never write.
   */
  const BANNED = [
    /photometric/i,
    /photometry/i,
    /\bdialux\b/i,
    /AS\/NZS/i,
    /\bcategory\s+[PV][1-5]\b/i,
    /\bIK\d{2}\b/,
    /\bIP\d{2}\b/,
    /\bCCT\b/,
    /\bMPPT\b/,
    /\blumens?\b/i,
    /\bluminous\b/i,
    /\befficacy\b/i,
    /\bwattages?\b/i,
    /\bspec sheets?\b/i,
    /\bdata ?sheets?\b/i,
    /compliance (statement|declaration|submittal)/i,
    /\bthermal creep\b/i,
    /\bflexural\b/i,
    /\bspigot\b/i,
    /\bbattery autonomy\b/i,
    /\bmounting height\b/i
  ];

  /**
   * The one deliberate exception: the guardrail text itself.
   *
   * server.ts carries the anti-fabrication rules and the sales-scope rule, and
   * both must NAME this vocabulary in order to forbid it ("never invent wattage,
   * lumens, CCT..."). Stripping the nouns there would remove the fence, not the
   * problem — and with the document library gone, those instructions are the only
   * rail left against invented specifications.
   *
   * Rather than allowlisting lines, the exemption is bounded to the two constants
   * that hold the guardrail, plus any line sitting inside a prohibition. Copy
   * anywhere else in the file is still scanned.
   */
  const guardrailRanges = (lines: string[]): Array<[number, number]> => {
    const ranges: Array<[number, number]> = [];

    const masterStart = lines.findIndex((l) => l.includes('const MASTER_PLASGAIN_SYSTEM_INSTRUCTION = `'));
    if (masterStart !== -1) {
      const masterEnd = lines.findIndex((l, i) => i > masterStart && l.trim() === '`;');
      ranges.push([masterStart, masterEnd === -1 ? masterStart : masterEnd]);
    }

    const noSourceDecl = lines.findIndex((l) => l.includes('const NO_PRODUCT_SOURCE_INSTRUCTION'));
    if (noSourceDecl !== -1) {
      // include the block comment that explains it
      let start = noSourceDecl;
      for (let i = noSourceDecl - 1; i >= 0 && i > noSourceDecl - 20; i--) {
        if (lines[i].trim().startsWith('/**')) { start = i; break; }
      }
      const end = lines.findIndex((l, i) => i >= noSourceDecl && l.trim().endsWith('";'));
      ranges.push([start, end === -1 ? noSourceDecl : end]);
    }

    return ranges;
  };

  /** A prompt line that names the vocabulary in order to forbid it. */
  const PROHIBITION = /\bNEVER\b|\bnever\b|\bDo NOT\b|\bDo not\b|\bdo not\b|\bcannot\b|\bmust not\b|\bNo separate\b/;

  const isExempt = (file: string, lines: string[], index: number, ranges: Array<[number, number]>): boolean => {
    if (file !== 'server.ts') return false;
    if (ranges.some(([a, b]) => index >= a && index <= b)) return true;
    const window = lines.slice(Math.max(0, index - 2), index + 1).join(' ');
    return PROHIBITION.test(window);
  };

  for (const relPath of AUTHORED_SOURCES) {
    it(`${relPath} contains no product or standards jargon`, () => {
      const abs = path.resolve(root, relPath);
      expect(fs.existsSync(abs), `${relPath} is listed in the guard but does not exist`).toBe(true);

      const lines = fs.readFileSync(abs, 'utf-8').split(/\r?\n/);
      const ranges = relPath === 'server.ts' ? guardrailRanges(lines) : [];
      const offences: string[] = [];

      lines.forEach((line, i) => {
        if (isExempt(relPath, lines, i, ranges)) return;
        for (const pattern of BANNED) {
          if (pattern.test(line)) {
            offences.push(`${relPath}:${i + 1}  ${line.trim().slice(0, 120)}`);
            break;
          }
        }
      });

      expect(
        offences,
        `Product/standards jargon found in app-authored copy:\n\n${offences.join('\n')}\n\n` +
          'The app has no source of truth for specifications. Rewrite this in commercial ' +
          'terms, or route the question to the Plasgain product team.'
      ).toEqual([]);
    });
  }

  it('the reference-document library stays deleted', () => {
    // Its removal is why the rule above exists. If it ever comes back, the
    // grounding story changes and this guard needs revisiting deliberately
    // rather than by quietly re-adding files.
    expect(fs.existsSync(path.resolve(root, 'src/server/knowledgeStore.ts'))).toBe(false);
    expect(fs.readFileSync(path.resolve(root, 'server.ts'), 'utf-8')).not.toContain('/api/knowledge');
  });

  it('the AI is told it has no product source and must stay in sales scope', () => {
    const server = fs.readFileSync(path.resolve(root, 'server.ts'), 'utf-8');
    expect(server).toContain('NO_PRODUCT_SOURCE_INSTRUCTION');
    expect(server).toContain('SCOPE - SALES, NOT ENGINEERING');
    // Every AI call that writes prose for a rep inherits the master instruction,
    // rather than leaving each prompt to police itself. The two calls without one
    // are the health probe and the quote-PDF extractor, neither of which authors
    // copy. If a new prompt is added without binding to MASTER, this fails.
    const systemInstructions = server.match(/systemInstruction:/g) || [];
    const masterUses = server.match(/MASTER_PLASGAIN_SYSTEM_INSTRUCTION/g) || [];
    expect(systemInstructions.length).toBeGreaterThanOrEqual(13);
    // one definition plus one use per systemInstruction
    expect(masterUses.length).toBe(systemInstructions.length + 1);
  });
});
