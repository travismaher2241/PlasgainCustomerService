import { randomBytes } from "crypto";
import { opportunityStore, StoredOpportunity } from "./opportunityStore";
import { notificationStore } from "./notificationStore";
import { auditLogStore } from "./auditLogStore";

/**
 * Two-day post-submission follow-up.
 *
 * A quote sitting in "Submitted" for two days needs chasing. This used to run
 * as a `setInterval` inside a React effect, which meant it only fired while a
 * rep had the tab open: a quote submitted on Thursday afternoon was not flagged
 * until someone opened the app again, and every open tab ran the same sweep
 * against the same records. It ran here instead so the rule holds overnight, at
 * the weekend, and exactly once per quote regardless of who is looking.
 *
 * `followUpReminderTriggeredAt` is the idempotency guard: it is stamped when a
 * quote is flagged and checked before flagging, so re-running the sweep — on a
 * schedule, by hand, or from a second server instance — never double-flags a
 * quote or raises a second notification for it.
 */

/** How long a quote may sit in Submitted before it needs chasing. */
export const FOLLOW_UP_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

const SUBMITTED_STAGE_ID = "stage-submitted";
const FOLLOW_UP_STAGE_ID = "stage-followup-required";
const FOLLOW_UP_STAGE_NAME = "Follow Up Required";

export interface FollowUpTrigger {
  id: string;
  name: string;
  accountName?: string;
  quoteNumber?: string;
  daysSinceSubmission: number;
}

export interface FollowUpSweepResult {
  evaluated: number;
  triggered: FollowUpTrigger[];
  /** Quotes the sweep could not update, with the reason. Never fatal. */
  failed: Array<{ id: string; reason: string }>;
}

/** The moment a quote was put in front of the customer. */
function submissionTime(quote: StoredOpportunity): number {
  const raw = quote.submittedAt || quote.quoteSentDate || quote.quoteIssuedDate || quote.createdAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function isAwaitingFollowUp(quote: StoredOpportunity, now: number, afterMs: number): boolean {
  if (quote.isArchived) return false;
  if (quote.followUpReminderTriggeredAt) return false;

  const inSubmitted =
    quote.stageId === SUBMITTED_STAGE_ID ||
    (!quote.stageId && quote.stageName === "Submitted");
  if (!inSubmitted) return false;

  const submitted = submissionTime(quote);
  if (submitted <= 0) return false;

  return now - submitted >= afterMs;
}

/**
 * Flags every quote that has gone two days without follow-up.
 *
 * Safe to call repeatedly. `now` and `afterMs` are injectable so the rule can be
 * tested without waiting two days or mutating the clock.
 */
export async function runFollowUpSweep(
  options: { now?: Date; afterMs?: number } = {}
): Promise<FollowUpSweepResult> {
  const nowDate = options.now || new Date();
  const now = nowDate.getTime();
  const afterMs = options.afterMs ?? FOLLOW_UP_AFTER_MS;
  const todayStr = nowDate.toISOString().split("T")[0];

  const quotes = await opportunityStore.getAll();
  const triggered: FollowUpTrigger[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const quote of quotes) {
    if (!isAwaitingFollowUp(quote, now, afterMs)) continue;

    const daysSinceSubmission = Math.floor((now - submissionTime(quote)) / (24 * 60 * 60 * 1000));
    const label = quote.quoteNumber || quote.name;

    try {
      const { updated, previous } = await opportunityStore.update(quote.id, {
        stageId: FOLLOW_UP_STAGE_ID,
        stageName: FOLLOW_UP_STAGE_NAME,
        nextAction: quote.nextAction || `Follow up on submitted quote ${label}`,
        nextActionDate: quote.nextActionDate || todayStr,
        followUpReminderTriggeredAt: nowDate.toISOString()
      });

      await notificationStore.create({
        title: `Follow up required: ${updated.name}`,
        message: `Quote${quote.quoteNumber ? ` ${quote.quoteNumber}` : ""} for ${
          updated.accountName || "the customer"
        } was submitted ${daysSinceSubmission} days ago and has had no follow-up.`,
        type: "action_required",
        priority: "high",
        entityType: "deal",
        entityId: updated.id,
        linkTo: { view: "pipeline", id: updated.id }
      });

      await auditLogStore.append({
        id: `audit-${Date.now()}-${randomBytes(4).toString("hex")}`,
        timestamp: nowDate.toISOString(),
        userId: "system-automation",
        userName: "System Automation",
        userRole: "Automation",
        action: "STAGE_CHANGE",
        entityType: "Deal",
        entityId: updated.id,
        entityName: updated.name,
        details: `Automatic follow-up: quote "${updated.name}" moved from ${
          previous.stageName || "Submitted"
        } to ${FOLLOW_UP_STAGE_NAME} after ${daysSinceSubmission} days without follow-up.`,
        changes: {
          stageName: { from: previous.stageName, to: updated.stageName },
          nextActionDate: { from: previous.nextActionDate, to: updated.nextActionDate }
        },
        metadata: { rule: "two-day-post-submission-follow-up", daysSinceSubmission }
      });

      triggered.push({
        id: updated.id,
        name: updated.name,
        accountName: updated.accountName,
        quoteNumber: updated.quoteNumber,
        daysSinceSubmission
      });
    } catch (err: any) {
      // One quote failing must not stop the rest being flagged.
      failed.push({ id: quote.id, reason: err?.message || "Unknown error" });
    }
  }

  return { evaluated: quotes.length, triggered, failed };
}

/** How often the in-process sweep runs while the server is up. */
export const FOLLOW_UP_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

let sweepTimer: NodeJS.Timeout | null = null;

/**
 * Runs the sweep on an interval for as long as the server process is alive.
 *
 * This is the modest version of a scheduler: it needs no infrastructure the
 * workspace does not already have, and it satisfies the actual requirement —
 * the rule fires with no browser open. A quote is flagged at most once either
 * way, so a second server instance running its own timer is harmless.
 */
export function startFollowUpSweepSchedule(
  intervalMs: number = FOLLOW_UP_SWEEP_INTERVAL_MS
): () => void {
  stopFollowUpSweepSchedule();

  const tick = async () => {
    try {
      const result = await runFollowUpSweep();
      if (result.triggered.length > 0) {
        console.log(
          `[FollowUpSweep] Flagged ${result.triggered.length} quote(s) for follow-up: ${result.triggered
            .map((t) => t.quoteNumber || t.name)
            .join(", ")}`
        );
      }
      if (result.failed.length > 0) {
        console.warn(`[FollowUpSweep] ${result.failed.length} quote(s) could not be flagged.`);
      }
    } catch (err) {
      // A failed sweep must never take the server down; the next tick retries.
      console.error("[FollowUpSweep] Sweep failed:", err);
    }
  };

  // The tick is async now that the store is. Errors inside it are caught
  // within tick itself, so an unhandled rejection cannot reach the process.
  void tick();
  sweepTimer = setInterval(() => void tick(), intervalMs);
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();

  return stopFollowUpSweepSchedule;
}

export function stopFollowUpSweepSchedule(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
