import { CRMOpportunity, CRMActivity, Account } from "../types/crm";

/**
 * Win / Loss Pattern Learning (Feature 04)
 *
 * Reads closed deals and reports what actually separates a win from a loss at
 * Plasgain - segment, deal size, how fast the first follow-up went out, whether
 * anyone visited site.
 *
 * Two rules govern everything below, because the failure mode of this kind of
 * feature is confident nonsense from four data points:
 *
 * 1. No finding is emitted unless both sides of the comparison clear
 *    MIN_GROUP_SIZE. A split that reads "100% vs 0%" off one deal each is worse
 *    than saying nothing, because a rep will believe it.
 * 2. Findings state their own sample size, and the summary says plainly how
 *    much history it is working from. The reader decides how much weight to
 *    give it; the code does not decide for them by hiding the denominator.
 *
 * There is deliberately no learned model and no score out of a hundred. The
 * output is a list of plain comparative statements a salesperson can argue
 * with, which is the only form of this that earns trust.
 */

/** Both sides of a comparison need at least this many closed deals to be reported. */
export const MIN_GROUP_SIZE = 5;

/** Below this many closed deals in total, no comparative findings are attempted. */
export const MIN_TOTAL_CLOSED = 12;

/** A difference smaller than this in percentage points is treated as noise. */
export const MIN_MEANINGFUL_GAP = 10;

export type WinLossOutcome = "won" | "lost";

export interface ClosedDealFact {
  dealId: string;
  name: string;
  accountName: string;
  outcome: WinLossOutcome;
  dealValue: number;
  segment: "Council" | "Contractor" | "Other";
  /** Days between the quote going out and the first recorded follow-up. */
  daysToFirstFollowUp?: number;
  hadSiteVisit: boolean;
  lostReason?: string;
}

export interface WinLossFinding {
  id: string;
  /** Plain sentence a rep can read on its own. */
  headline: string;
  /** The comparison behind the headline, so the claim can be checked. */
  detail: string;
  groupA: { label: string; wins: number; total: number; winRatePercent: number };
  groupB: { label: string; wins: number; total: number; winRatePercent: number };
  gapPercentagePoints: number;
  /** How much to trust it, driven purely by sample size. */
  confidence: "Indicative" | "Reasonable";
}

export interface LossReasonTally {
  reason: string;
  count: number;
  sharePercent: number;
}

export interface WinLossPatternSummary {
  closedDealCount: number;
  wonCount: number;
  lostCount: number;
  overallWinRatePercent: number;
  /** Empty until there is enough history; never padded with speculation. */
  findings: WinLossFinding[];
  lossReasons: LossReasonTally[];
  /** What the reader should understand about the state of the data. */
  dataNote: string;
  hasEnoughHistory: boolean;
}

const COUNCIL_PATTERN = /(?:council|shire|city\s+of|municipality|regional|government)/i;
const CONTRACTOR_PATTERN =
  /(?:contract|civil|construction|downer|lendlease|fulton|cpb|electrical|builder|infrastructure)/i;

function isWonDeal(deal: CRMOpportunity): boolean {
  return (
    deal.stageId === "stage-won" ||
    /\bwon\b/i.test(deal.stageName || "") ||
    deal.quoteStatus === "Accepted" ||
    deal.quoteStatus === "PO Received"
  );
}

function isLostDeal(deal: CRMOpportunity): boolean {
  return (
    deal.stageId === "stage-lost" ||
    /\blost\b/i.test(deal.stageName || "") ||
    deal.quoteStatus === "Declined"
  );
}

function daysBetween(startDate: string, endDate: string): number | undefined {
  const a = new Date(startDate);
  const b = new Date(endDate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return undefined;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function resolveSegment(
  deal: CRMOpportunity,
  account?: Account
): ClosedDealFact["segment"] {
  if (account?.customerSegment === "Local Government / Council") return "Council";
  if (account?.customerSegment === "Civil Contractor") return "Contractor";
  if (account?.accountType === "Council") return "Council";

  const name = `${deal.accountName || ""} ${account?.name || ""}`;
  if (COUNCIL_PATTERN.test(name)) return "Council";
  if (CONTRACTOR_PATTERN.test(name)) return "Contractor";
  return "Other";
}

/**
 * Turns raw records into one row per closed deal. Everything downstream reads
 * these facts rather than the CRM shapes, so the comparisons stay readable.
 */
export function buildClosedDealFacts(
  deals: CRMOpportunity[],
  activities: CRMActivity[] = [],
  accounts: Account[] = []
): ClosedDealFact[] {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const facts: ClosedDealFact[] = [];

  for (const deal of deals) {
    const won = isWonDeal(deal);
    const lost = isLostDeal(deal);
    if (!won && !lost) continue;

    const dealActivities = activities.filter((a) => a.opportunityId === deal.id);

    let daysToFirstFollowUp: number | undefined;
    if (deal.quoteSentDate) {
      const after = dealActivities
        .map((a) => a.timestamp)
        .filter((t): t is string => Boolean(t))
        .map((t) => t.split("T")[0])
        .filter((d) => d >= deal.quoteSentDate!)
        .sort();
      if (after.length > 0) {
        daysToFirstFollowUp = daysBetween(deal.quoteSentDate, after[0]);
      }
    }

    facts.push({
      dealId: deal.id,
      name: deal.name,
      accountName: deal.accountName,
      outcome: won ? "won" : "lost",
      dealValue: deal.dealValue || 0,
      segment: resolveSegment(deal, accountById.get(deal.accountId)),
      daysToFirstFollowUp,
      hadSiteVisit: dealActivities.some((a) => a.type === "site_visit"),
      lostReason: lost ? deal.lostReason : undefined
    });
  }

  return facts;
}

function rate(group: ClosedDealFact[]): { wins: number; total: number; winRatePercent: number } {
  const wins = group.filter((f) => f.outcome === "won").length;
  const total = group.length;
  return {
    wins,
    total,
    winRatePercent: total === 0 ? 0 : Math.round((wins / total) * 100)
  };
}

/**
 * Builds one finding from a split, or returns null when the split cannot
 * support a claim. Returning null is the common case early on and is correct.
 */
function compare(
  id: string,
  labelA: string,
  groupA: ClosedDealFact[],
  labelB: string,
  groupB: ClosedDealFact[],
  phrase: (better: string, worse: string, gap: number) => string
): WinLossFinding | null {
  if (groupA.length < MIN_GROUP_SIZE || groupB.length < MIN_GROUP_SIZE) return null;

  const a = rate(groupA);
  const b = rate(groupB);
  const gap = Math.abs(a.winRatePercent - b.winRatePercent);
  if (gap < MIN_MEANINGFUL_GAP) return null;

  const aIsBetter = a.winRatePercent >= b.winRatePercent;
  const betterLabel = aIsBetter ? labelA : labelB;
  const worseLabel = aIsBetter ? labelB : labelA;

  return {
    id,
    headline: phrase(betterLabel, worseLabel, gap),
    detail:
      `${labelA}: ${a.wins} of ${a.total} won (${a.winRatePercent}%). ` +
      `${labelB}: ${b.wins} of ${b.total} won (${b.winRatePercent}%).`,
    groupA: { label: labelA, ...a },
    groupB: { label: labelB, ...b },
    gapPercentagePoints: gap,
    confidence: Math.min(groupA.length, groupB.length) >= MIN_GROUP_SIZE * 3 ? "Reasonable" : "Indicative"
  };
}

function medianValue(facts: ClosedDealFact[]): number {
  const values = facts.map((f) => f.dealValue).sort((x, y) => x - y);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}

export function computeWinLossPatterns(
  deals: CRMOpportunity[],
  activities: CRMActivity[] = [],
  accounts: Account[] = []
): WinLossPatternSummary {
  const facts = buildClosedDealFacts(deals, activities, accounts);
  const wonCount = facts.filter((f) => f.outcome === "won").length;
  const lostCount = facts.length - wonCount;
  const overall = facts.length === 0 ? 0 : Math.round((wonCount / facts.length) * 100);

  // Loss reasons are a straight tally, not a comparison, so they are safe to
  // report from the first record - there is no denominator to mislead with.
  const reasonCounts = new Map<string, number>();
  for (const f of facts) {
    if (f.outcome !== "lost") continue;
    const reason = f.lostReason || "Not recorded";
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  }
  const lossReasons: LossReasonTally[] = [...reasonCounts.entries()]
    .map(([reason, count]) => ({
      reason,
      count,
      sharePercent: lostCount === 0 ? 0 : Math.round((count / lostCount) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  if (facts.length < MIN_TOTAL_CLOSED) {
    return {
      closedDealCount: facts.length,
      wonCount,
      lostCount,
      overallWinRatePercent: overall,
      findings: [],
      lossReasons,
      dataNote:
        `${facts.length} closed ${facts.length === 1 ? "quote" : "quotes"} on record. ` +
        `Patterns are held back until there are at least ${MIN_TOTAL_CLOSED}, because a ` +
        `comparison drawn from fewer would read as fact while being mostly chance.`,
      hasEnoughHistory: false
    };
  }

  const findings: WinLossFinding[] = [];

  const councilDeals = facts.filter((f) => f.segment === "Council");
  const contractorDeals = facts.filter((f) => f.segment === "Contractor");
  const segmentFinding = compare(
    "segment",
    "Councils",
    councilDeals,
    "Civil contractors",
    contractorDeals,
    (better, worse, gap) =>
      `${better} close ${gap} percentage points more often than ${worse.toLowerCase()}.`
  );
  if (segmentFinding) findings.push(segmentFinding);

  // Split on the median so both sides stay populated rather than fixing a
  // dollar threshold that may put every deal on one side.
  const median = medianValue(facts);
  if (median > 0) {
    const larger = facts.filter((f) => f.dealValue > median);
    const smaller = facts.filter((f) => f.dealValue <= median);
    const valueFinding = compare(
      "deal-size",
      `Quotes above $${Math.round(median).toLocaleString()}`,
      larger,
      `Quotes at or below $${Math.round(median).toLocaleString()}`,
      smaller,
      (better, worse, gap) =>
        `${better} win ${gap} percentage points more often than ${worse.toLowerCase()}.`
    );
    if (valueFinding) findings.push(valueFinding);
  }

  const timed = facts.filter((f) => typeof f.daysToFirstFollowUp === "number");
  const fast = timed.filter((f) => (f.daysToFirstFollowUp as number) <= 3);
  const slow = timed.filter((f) => (f.daysToFirstFollowUp as number) > 3);
  const speedFinding = compare(
    "follow-up-speed",
    "Followed up within 3 days",
    fast,
    "Followed up after 3 days",
    slow,
    (better, worse, gap) =>
      better === "Followed up within 3 days"
        ? `Quotes followed up within three days close ${gap} percentage points more often.`
        : `Quotes followed up after three days close ${gap} percentage points more often, which is worth a look - it is the opposite of what you would expect.`
  );
  if (speedFinding) findings.push(speedFinding);

  const visited = facts.filter((f) => f.hadSiteVisit);
  const notVisited = facts.filter((f) => !f.hadSiteVisit);
  const visitFinding = compare(
    "site-visit",
    "Site visit logged",
    visited,
    "No site visit logged",
    notVisited,
    (better, worse, gap) =>
      better === "Site visit logged"
        ? `Quotes with a site visit on record close ${gap} percentage points more often.`
        : `Quotes without a site visit close ${gap} percentage points more often on this history.`
  );
  if (visitFinding) findings.push(visitFinding);

  findings.sort((a, b) => b.gapPercentagePoints - a.gapPercentagePoints);

  return {
    closedDealCount: facts.length,
    wonCount,
    lostCount,
    overallWinRatePercent: overall,
    findings,
    lossReasons,
    dataNote:
      findings.length > 0
        ? `Drawn from ${facts.length} closed quotes. Each comparison needs at least ` +
          `${MIN_GROUP_SIZE} on both sides and a gap of ${MIN_MEANINGFUL_GAP} points before it appears here.`
        : `${facts.length} closed quotes on record, but no split yet has ${MIN_GROUP_SIZE} ` +
          `quotes on both sides with a gap wide enough to be worth reporting.`,
    hasEnoughHistory: true
  };
}
