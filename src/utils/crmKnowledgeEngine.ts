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
export interface ParsedSupplyCycle {
  product: string;
  quantity?: number;
  durationMonths: number;
  durationRaw: string;
  orderDate: string; // YYYY-MM-DD
  runOutDate: string; // YYYY-MM-DD
  destination?: string;
  rawText: string;
}

export interface ReplenishmentTimeline {
  product: string;
  quantity?: number;
  durationRaw: string;
  orderDate: string;
  runOutDate: string;
  destination?: string;
  monthsRemaining: number;
  daysRemaining: number;
  isRunOut: boolean;
  statusText: string;
  reorderUrgency: "Normal" | "Approaching" | "Critical" | "Depleted";
}

/**
 * Parse product supply / replenishment cycle mentions from activity notes.
 * Extracts: product name (e.g. PLASSLAB), quantity (e.g. 600), duration (e.g. 3 months),
 * destination (e.g. SA), order date, and projected run-out date.
 */
export function parseSupplyCyclesFromText(text: string, referenceDateStr?: string): ParsedSupplyCycle[] {
  if (!text || text.length < 10) return [];
  const cycles: ParsedSupplyCycle[] = [];

  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const validRefDate = isNaN(refDate.getTime()) ? new Date() : refDate;
  const orderDateStr = validRefDate.toISOString().split("T")[0];

  const computeRunOut = (durationMonths: number) => {
    const runOutDate = new Date(validRefDate);
    const totalDays = Math.round(durationMonths * 30.44);
    runOutDate.setDate(runOutDate.getDate() + totalDays);
    return runOutDate.toISOString().split("T")[0];
  };

  const extractDest = (str: string) => {
    const destMatch = str.match(/(?:sent\s+to|shipped\s+to|destined\s+for|bound\s+for|(?:delivered|going)\s+to|(?:for|in))\s+(?:the\s+)?(SA\b|WA\b|NSW\b|VIC\b|QLD\b|TAS\b|NT\b|ACT\b|South\s+Australia|Western\s+Australia|Queensland|Victoria|New\s+South\s+Wales|Tasmania|Northern\s+Territory|Perth\b|Adelaide\b|Sydney\b|Melbourne\b|Brisbane\b)/i);
    if (destMatch) {
      const d = destMatch[1].trim();
      return d.length <= 3 ? d.toUpperCase() : d;
    }
    return undefined;
  };

  // 1. Duration-first pattern: "purchasing 3 months worth of PLASSLAB" or "ordered 3 months supply of Composite Poles"
  const durationFirstPattern = /(?:order(?:ed|ing)?|purchas(?:ed|ing)?|bought|buying|procuring|delivery\s+of|stock\s+of)\s+(?:around\s+|approx\s+)?(\d+(?:\.\d+)?)\s*(months?|weeks?|days?|years?)\s*(?:worth|supply)?\s*(?:of(?:\s+the)?)?\s*([^.\n;,]+)/i;
  const match1 = text.match(durationFirstPattern);
  if (match1) {
    const durationNum = parseFloat(match1[1]);
    const durationUnit = match1[2].toLowerCase();
    let durationMonths = durationNum;
    if (durationUnit.startsWith("week")) durationMonths = durationNum / 4.33;
    else if (durationUnit.startsWith("day")) durationMonths = durationNum / 30;
    else if (durationUnit.startsWith("year")) durationMonths = durationNum * 12;

    const afterStr = match1[3].trim();
    let product = "Product";
    const knownProductsMatch = text.match(/\b(PLASSLAB|PLAS-SLAB|Composite\s+Poles?|Solar\s+Lighting|Poles?)\b/i);
    if (knownProductsMatch) {
      product = knownProductsMatch[1].toUpperCase() === "PLASSLAB" ? "PLASSLAB" : knownProductsMatch[1];
    } else {
      const firstWord = afterStr.split(/\s+/)[0];
      if (firstWord && firstWord.length > 2) product = firstWord;
    }

    let quantity: number | undefined;
    const qtyMatch = text.match(/(\d{1,6})\s*(?:units?|pieces?|slabs?|poles?)/i);
    if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);

    const destination = extractDest(text);
    const runOutDateStr = computeRunOut(durationMonths);

    cycles.push({
      product,
      quantity,
      durationMonths: Math.round(durationMonths * 10) / 10,
      durationRaw: `${durationNum} ${durationUnit}`,
      orderDate: orderDateStr,
      runOutDate: runOutDateStr,
      destination,
      rawText: match1[0]
    });
  }

  // 2. Product-first pattern: "ordered 600 PLASSLAB lasting 3 months" or "purchased PLASSLAB for 3 months supply"
  const supplyPattern = /(?:order(?:ed|ing)?|purchas(?:ed|ing)?|bought|delivery\s+of|supplied|stock\s+of)\s+([^.\n;]+?)(?:last(?:ing)?\s+(?:them\s+)?(?:around|approx|approximately)?\s*(\d+(?:\.\d+)?)\s*(months?|weeks?|days?|years?)|(?:supply|duration)\s+(?:of|for)\s+(\d+(?:\.\d+)?)\s*(months?|weeks?)|(\d+(?:\.\d+)?)\s*(months?|weeks?)\s*(?:worth|supply))/i;
  const match2 = text.match(supplyPattern);
  if (match2 && cycles.length === 0) {
    const preText = match2[1].trim();

    let quantity: number | undefined;
    const qtyMatch = preText.match(/(?:^|\s)(\d{1,6})(?:\s*units?)?(?:\s+of(?:\s+the)?)?\s+/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }

    let product = "Product";
    const knownProductsMatch = text.match(/\b(PLASSLAB|PLAS-SLAB|Composite\s+Poles?|Solar\s+Lighting|Poles?)\b/i);
    if (knownProductsMatch) {
      product = knownProductsMatch[1].toUpperCase() === "PLASSLAB" ? "PLASSLAB" : knownProductsMatch[1];
    } else if (qtyMatch) {
      const prodAfterQty = preText.slice(qtyMatch.index! + qtyMatch[0].length).split(/[\s,]+/)[0];
      if (prodAfterQty && prodAfterQty.length > 2) {
        product = prodAfterQty;
      }
    }

    let durationNum = 1;
    let durationUnit = "months";
    if (match2[2] && match2[3]) {
      durationNum = parseFloat(match2[2]);
      durationUnit = match2[3].toLowerCase();
    } else if (match2[4] && match2[5]) {
      durationNum = parseFloat(match2[4]);
      durationUnit = match2[5].toLowerCase();
    } else if (match2[6] && match2[7]) {
      durationNum = parseFloat(match2[6]);
      durationUnit = match2[7].toLowerCase();
    }

    let durationMonths = durationNum;
    if (durationUnit.startsWith("week")) {
      durationMonths = durationNum / 4.33;
    } else if (durationUnit.startsWith("day")) {
      durationMonths = durationNum / 30;
    } else if (durationUnit.startsWith("year")) {
      durationMonths = durationNum * 12;
    }

    const destination = extractDest(text);
    const runOutDateStr = computeRunOut(durationMonths);

    cycles.push({
      product,
      quantity,
      durationMonths: Math.round(durationMonths * 10) / 10,
      durationRaw: `${durationNum} ${durationUnit}`,
      orderDate: orderDateStr,
      runOutDate: runOutDateStr,
      destination,
      rawText: match2[0]
    });
  }

  return cycles;
}

/**
 * Calculates stock remaining and reorder urgency relative to a target meeting or call date.
 */
export function calculateReplenishmentTimeline(
  cycle: ParsedSupplyCycle,
  targetDateStr?: string
): ReplenishmentTimeline {
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const validTarget = isNaN(targetDate.getTime()) ? new Date() : targetDate;
  const runOutDate = new Date(cycle.runOutDate);

  const diffDays = Math.round((runOutDate.getTime() - validTarget.getTime()) / (1000 * 60 * 60 * 24));
  const diffMonths = Math.round(diffDays / 30.44);

  let statusText = "";
  let reorderUrgency: ReplenishmentTimeline["reorderUrgency"] = "Normal";

  if (diffDays <= 0) {
    statusText = `Stock is fully depleted (ran out ${cycle.runOutDate}). Immediate re-order required.`;
    reorderUrgency = "Depleted";
  } else if (diffMonths <= 1 || diffDays <= 45) {
    statusText = `Approximately 1 month out from requiring more ${cycle.product} (projected run-out ${cycle.runOutDate}). High priority replenishment window.`;
    reorderUrgency = "Critical";
  } else if (diffMonths <= 2 || diffDays <= 75) {
    statusText = `Approximately 2 months out from requiring more ${cycle.product} (projected run-out ${cycle.runOutDate}). Re-order planning window.`;
    reorderUrgency = "Approaching";
  } else {
    statusText = `Currently has ~${diffMonths} months of ${cycle.product} stock remaining (projected run-out ${cycle.runOutDate}).`;
    reorderUrgency = "Normal";
  }

  return {
    product: cycle.product,
    quantity: cycle.quantity,
    durationRaw: cycle.durationRaw,
    orderDate: cycle.orderDate,
    runOutDate: cycle.runOutDate,
    destination: cycle.destination,
    monthsRemaining: Math.max(0, diffMonths),
    daysRemaining: diffDays,
    isRunOut: diffDays <= 0,
    statusText,
    reorderUrgency
  };
}

/**
 * Extract candidate Notable Events from activity notes.
 * Strictly grounded in real phrases (role change, moving company, taking responsibility, major milestone, introductions, personal context).
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
    },
    {
      regex: /(?:met\s+([A-Za-z]+)\s+for\s+the\s+first\s+time|first\s+meeting\s+with\s+([A-Za-z]+))/i,
      titleFormatter: (m, name) => `First meeting with ${m[1] || m[2] || name}`
    }
  ];

  for (const pat of patterns) {
    const match = content.match(pat.regex);
    if (match) {
      // If the pattern captured a specific person's name (e.g. Gordon)
      let targetContact = defaultContact;
      if (match[1] || match[2]) {
        const capturedName = (match[1] || match[2]).toLowerCase();
        const matched = contacts.find((c) => c.firstName?.toLowerCase() === capturedName || c.lastName?.toLowerCase() === capturedName);
        if (matched) targetContact = matched;
      }

      const contactName = targetContact
        ? `${targetContact.firstName} ${targetContact.lastName}`.trim()
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
        contactId: targetContact?.id || activity.contactId,
        contactName
      });
      break;
    }
  }

  // Check for cross-contact mentions / personal updates across all known contacts (e.g. Zia in Perth with a water leak)
  for (const c of contacts) {
    if (!c.firstName || c.firstName.length < 2) continue;
    const nameRegex = new RegExp(`\\b${c.firstName}\\b`, "i");
    if (nameRegex.test(content)) {
      const sentences = content.split(/[.!?\n]+/);
      const contactSentence = sentences.find((s) => nameRegex.test(s));
      if (contactSentence) {
        // Detect personal / travel / property / urgency contexts
        if (/(?:water\s*leak|leak|property|perth|interstate|emergency|repairs?|hospital|leave|holiday|away|sick|personal|rush)/i.test(contactSentence)) {
          let title = `Personal update: ${c.firstName}`;
          if (/water\s*leak/i.test(contactSentence) && /perth/i.test(contactSentence)) {
            title = `Property water leak in Perth`;
          } else if (/water\s*leak/i.test(contactSentence)) {
            title = `Urgent property water leak`;
          } else if (/perth/i.test(contactSentence)) {
            title = `Travelled to Perth for property repairs`;
          }

          const alreadyAdded = candidateEvents.some((ce) => ce.contactId === c.id);
          if (!alreadyAdded) {
            candidateEvents.push({
              id: `cne-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title,
              description: contactSentence.trim(),
              eventDate: activity.timestamp.split("T")[0],
              sourceActivityId: activity.id,
              sourceActivityDate: activity.timestamp,
              recordedBy: activity.performedBy,
              isAiGenerated: true,
              status: "candidate",
              contactId: c.id,
              contactName: `${c.firstName} ${c.lastName}`.trim()
            });
          }
        }
      }
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
    },
    // 6. Product Supply & Replenishment Cycle
    {
      category: "Supply & Replenishment Cycle",
      trigger: /(?:order(?:ed|ing)?|purchas(?:ed|ing)?|bought|buying|procuring|delivery|supplied|stock).*(?:\d+\s*(?:months?|weeks?|days?|years?)|supply\s+cycle|replenish)/i,
      extract: (t) => {
        const cycles = parseSupplyCyclesFromText(t, activityDate);
        if (cycles.length > 0) {
          const c = cycles[0];
          const destText = c.destination ? `, mostly sent to ${c.destination}` : "";
          const runOutDateObj = new Date(c.runOutDate);
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const runOutStr = `${monthNames[runOutDateObj.getMonth()]} ${runOutDateObj.getFullYear()}`;
          return `Ordered ${c.quantity ? `${c.quantity} units of ` : ""}${c.product} (~${c.durationRaw} supply${destText}). Estimated run-out / replenishment date: early ${runOutStr}.`;
        }
        return "";
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
