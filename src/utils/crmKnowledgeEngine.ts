import {
  CRMActivity,
  CRMContact,
  CRMKnowledgeCategory,
  CRMKnowledgeItem,
  ContactNotableEvent
} from "../types/crm";

export interface KnowledgeAnalysisResult {
  candidateNotableEvents: ContactNotableEvent[];
  extractedKnowledge: CRMKnowledgeItem[];
}

/**
 * Text similarity helper to prevent duplicate knowledge statements
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function areStatementsSimilar(a: string, b: string): boolean {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Word overlap Jaccard index
  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union >= 0.55;
}

/**
 * Extract candidate Notable Events from activity notes.
 * Strictly grounded in real phrases (role change, moving company, taking responsibility, major milestone).
 */
export function extractCandidateNotableEvents(
  activity: CRMActivity,
  contacts: CRMContact[]
): ContactNotableEvent[] {
  const text = `${activity.description || ""} ${(activity as any).notes || ""}`.trim();
  const content = `${activity.title || ""} ${text} ${activity.outcome || ""}`.trim();
  if (!content || content.length < 15) return [];

  const candidateEvents: ContactNotableEvent[] = [];
  const involvedContactIds = activity.contactIds && activity.contactIds.length > 0
    ? activity.contactIds
    : activity.contactId
    ? [activity.contactId]
    : [];

  const activityContacts = contacts.filter((c) => involvedContactIds.includes(c.id));
  const defaultContact = activityContacts[0];

  // Regex patterns for genuine business events
  const patterns: Array<{ regex: RegExp; titleFormatter: (match: RegExpMatchArray, contactName: string) => string }> = [
    {
      regex: /(?:promoted to|new role as|stepped into|appointed as|transitioned to)\s+([^.,;]+)/i,
      titleFormatter: (m, name) => `${name} appointed/promoted to ${m[1].trim()}`
    },
    {
      regex: /(?:moving to|left for|joining|moved to|switching to)\s+([^.,;]+)/i,
      titleFormatter: (m, name) => `${name} moving or joining ${m[1].trim()}`
    },
    {
      regex: /(?:taking responsibility for|now overseeing|in charge of|heading up|managing)\s+([^.,;]+)/i,
      titleFormatter: (m, name) => `${name} now taking responsibility for ${m[1].trim()}`
    },
    {
      regex: /(?:funding approved for|secured budget for|tender awarded for|awarded contract for)\s+([^.,;]+)/i,
      titleFormatter: (m, name) => `Secured approval / funding for ${m[1].trim()}`
    },
    {
      regex: /(?:confirmed installation before|deadline agreed for|project commencement set for)\s+([^.,;]+)/i,
      titleFormatter: (m, name) => `Milestone date agreed: ${m[1].trim()}`
    }
  ];

  for (const pat of patterns) {
    const match = content.match(pat.regex);
    if (match) {
      const contactName = defaultContact
        ? `${defaultContact.firstName} ${defaultContact.lastName}`.trim()
        : activity.contactName || "Contact";

      const title = pat.titleFormatter(match, contactName);
      candidateEvents.push({
        id: `cne-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        description: match[0],
        eventDate: activity.timestamp.split("T")[0],
        sourceActivityId: activity.id,
        sourceActivityDate: activity.timestamp,
        recordedBy: activity.performedBy,
        isAiGenerated: true,
        status: "candidate",
        contactId: defaultContact?.id || activity.contactId,
        contactName
      });
      break; // One primary notable event per activity to avoid spam
    }
  }

  return candidateEvents;
}

/**
 * Extract discrete CRM Knowledge items from activity notes without fabrication.
 */
export function extractCrmKnowledge(
  activity: CRMActivity,
  contacts?: CRMContact[]
): CRMKnowledgeItem[] {
  const content = `${activity.description || ""} ${(activity as any).notes || ""} ${activity.outcome || ""}`.trim();
  if (!content || content.length < 15) return [];

  const items: CRMKnowledgeItem[] = [];
  const accountId = activity.accountId || "";
  let contactIds = activity.contactIds && activity.contactIds.length > 0
    ? activity.contactIds
    : activity.contactId
    ? [activity.contactId]
    : [];

  if (contactIds.length === 0 && contacts && contacts.length > 0) {
    contactIds = contacts.map((c) => c.id);
  }

  const activityDate = activity.timestamp ? activity.timestamp.split("T")[0] : new Date().toISOString().split("T")[0];

  const rules: Array<{
    category: CRMKnowledgeCategory;
    trigger: RegExp;
    extract: (text: string) => string;
  }> = [
    // 1. Pole preferences
    {
      category: "Product & Pole Preference",
      trigger: /(?:prefers?|requir(?:es?|ing)|specif(?:ies|ying)|standardis(?:es?|ing) on)\s+((?:[a-zA-Z0-9-]+\s+){1,4}(?:poles?|columns?|masts?|footings?|rag\s*bolts?))/i,
      extract: (t) => {
        const m = t.match(/(?:prefers?|requir(?:es?|ing)|specif(?:ies|ying))\s+((?:[a-zA-Z0-9-]+\s+){1,5}(?:poles?|columns?|rag\s*bolts?|footings?))/i);
        return m ? `Prefers ${m[1].trim()}` : "";
      }
    },
    // 2. Technical & Specification
    {
      category: "Technical & Specification",
      trigger: /(?:AS\/NZS\s*1158|category\s+[PV][1-5]|wind\s+region\s+[A-D]|direct\s+burial|rag\s*bolt|lux\s+level|cctv\s+mounting|battery\s+autonomy)/i,
      extract: (t) => {
        const sentences = t.split(/[.!?\n]+/);
        const match = sentences.find((s) => /(?:AS\/NZS\s*1158|category\s+[PV][1-5]|wind\s+region|rag\s*bolt|burial|autonomy|lux)/i.test(s));
        return match ? match.trim() : "";
      }
    },
    // 3. Decision & Criteria / Timing
    {
      category: "Decision Criteria & Timeline",
      trigger: /(?:decision\s+maker|council\s+meeting|funding\s+confirmation|tender\s+release|tender\s+committee|procurement\s+board|board\s+approval|final\s+vendor\s+decision|before\s+(?:the\s+)?(?:football|cricket|winter|summer|eoy|end\s+of\s+year|christmas))/i,
      extract: (t) => {
        const sentences = t.split(/[.!?\n]+/);
        const match = sentences.find((s) => /(?:decision|council|funding|tender|board|committee|before\s+(?:football|cricket|season|christmas|year))/i.test(s));
        return match ? match.trim() : "";
      }
    },
    // 4. Commitments made by Plasgain or customer
    {
      category: "Commitment",
      trigger: /(?:plasgain\s+(?:promised|agreed|committed|to)|we\s+(?:promised|agreed|committed|will)|will\s+send\s+revised|customer\s+(?:will|agreed|committed)|promised\s+to|agreed\s+to\s+provide)/i,
      extract: (t) => {
        const sentences = t.split(/[.!?\n]+/);
        const match = sentences.find((s) => /(?:plasgain|promised|will\s+send\s+revised|customer\s+will|agreed\s+to|committed)/i.test(s));
        return match ? match.trim() : "";
      }
    },
    // 5. Unresolved Questions
    {
      category: "Unresolved Question",
      trigger: /(?:unresolved|still\s+waiting\s+on|needs?\s+clarification|unknown\s+if|pending\s+council|question\s+regarding|(?:customer|client|they)\s+asked|\?)/i,
      extract: (t) => {
        const sentences = t.split(/[.!\n]+/);
        const match = sentences.find((s) => /\?|(?:unresolved|waiting\s+on|clarification|unknown\s+if|pending\s+council|asked)/i.test(s));
        return match ? match.trim() : "";
      }
    }
  ];

  for (const rule of rules) {
    if (rule.trigger.test(content)) {
      const statement = rule.extract(content);
      if (statement && statement.length >= 10) {
        items.push({
          id: `kno-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId,
          accountName: activity.accountName,
          contactIds,
          opportunityId: activity.opportunityId,
          category: rule.category,
          statement,
          sourceActivityId: activity.id,
          sourceActivityDate: activityDate,
          sourceActivityType: activity.type,
          createdAt: new Date().toISOString(),
          lastConfirmedAt: activityDate,
          confirmedBy: activity.performedBy,
          status: "active"
        });
      }
    }
  }

  return items;
}

/**
 * Deduplicate and merge knowledge items against existing knowledge.
 * If an item is already recorded, updates lastConfirmedAt and does not duplicate.
 */
export function deduplicateOrMergeKnowledge(
  existingKnowledge: CRMKnowledgeItem[],
  newItems: CRMKnowledgeItem[]
): {
  toAdd: CRMKnowledgeItem[];
  toUpdate: Array<{ id: string; lastConfirmedAt: string; sourceActivityId: string; confirmedBy?: string }>;
} {
  const toAdd: CRMKnowledgeItem[] = [];
  const toUpdate: Array<{ id: string; lastConfirmedAt: string; sourceActivityId: string; confirmedBy?: string }> = [];

  for (const item of newItems) {
    // Find matching existing item under same account (or matching contact) and same category
    const existing = existingKnowledge.find(
      (k) =>
        k.status === "active" &&
        k.accountId === item.accountId &&
        k.category === item.category &&
        areStatementsSimilar(k.statement, item.statement)
    );

    if (existing) {
      toUpdate.push({
        id: existing.id,
        lastConfirmedAt: item.lastConfirmedAt,
        sourceActivityId: item.sourceActivityId,
        confirmedBy: item.confirmedBy
      });
    } else {
      toAdd.push(item);
    }
  }

  return { toAdd, toUpdate };
}
