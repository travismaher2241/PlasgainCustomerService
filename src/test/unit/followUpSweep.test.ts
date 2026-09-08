import { describe, it, expect, beforeEach } from "vitest";
import {
  runFollowUpSweep,
  FOLLOW_UP_AFTER_MS
} from "../../server/followUpSweep";
import { opportunityStore } from "../../server/opportunityStore";
import { notificationStore } from "../../server/notificationStore";
import { auditLogStore } from "../../server/auditLogStore";

/**
 * The two-day post-submission follow-up rule.
 *
 * These cover the properties that matter operationally: a quote is flagged once
 * and only once, the clock is measured from submission rather than creation,
 * and a quote nobody has submitted is left alone.
 */
describe("Two-day follow-up sweep", () => {
  const creator = { userId: "user-travis-maher", name: "Travis Maher" };
  const NOW = new Date("2026-09-08T09:00:00.000Z");
  const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const submittedQuote = (overrides: Record<string, any> = {}) =>
    opportunityStore.create(
      {
        name: "Cardinia Shared Trail",
        accountId: "acc-cardinia",
        accountName: "Cardinia Shire Council",
        dealValue: 42000,
        quoteNumber: "Q-1042",
        stageId: "stage-submitted",
        stageName: "Submitted",
        submittedAt: threeDaysAgo,
        ...overrides
      } as any,
      creator
    );

  beforeEach(() => {
    opportunityStore.clearForTesting();
    auditLogStore.clearForTesting();
    notificationStore.resetData(false);
  });

  it("moves a quote submitted three days ago to Follow Up Required", () => {
    const quote = submittedQuote();

    const result = runFollowUpSweep({ now: NOW });

    expect(result.triggered).toHaveLength(1);
    expect(result.triggered[0].daysSinceSubmission).toBe(3);
    expect(result.failed).toEqual([]);

    const after = opportunityStore.getById(quote.id)!;
    expect(after.stageId).toBe("stage-followup-required");
    expect(after.stageName).toBe("Follow Up Required");
    expect(after.nextAction).toContain("Q-1042");
    expect(after.nextActionDate).toBe("2026-09-08");
    expect(after.followUpReminderTriggeredAt).toBeTruthy();
  });

  it("raises one notification and one audit record for the flagged quote", () => {
    submittedQuote();

    runFollowUpSweep({ now: NOW });

    const notifications = notificationStore.getAll();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("action_required");
    expect(notifications[0].title).toContain("Cardinia Shared Trail");
    expect(notifications[0].linkTo?.view).toBe("pipeline");

    const audit = auditLogStore.getAll();
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("STAGE_CHANGE");
    expect(audit[0].userName).toBe("System Automation");
    expect(audit[0].changes?.stageName).toEqual({ from: "Submitted", to: "Follow Up Required" });
  });

  it("never flags the same quote twice, however often the sweep runs", () => {
    submittedQuote();

    const first = runFollowUpSweep({ now: NOW });
    const second = runFollowUpSweep({ now: new Date(NOW.getTime() + 60_000) });
    const third = runFollowUpSweep({ now: new Date(NOW.getTime() + 86_400_000) });

    expect(first.triggered).toHaveLength(1);
    expect(second.triggered).toHaveLength(0);
    expect(third.triggered).toHaveLength(0);
    expect(notificationStore.getAll()).toHaveLength(1);
  });

  it("leaves a quote submitted only yesterday alone", () => {
    const quote = submittedQuote({ submittedAt: oneDayAgo });

    const result = runFollowUpSweep({ now: NOW });

    expect(result.triggered).toHaveLength(0);
    expect(opportunityStore.getById(quote.id)!.stageId).toBe("stage-submitted");
    expect(notificationStore.getAll()).toHaveLength(0);
  });

  it("ignores quotes that are not in Submitted", () => {
    submittedQuote({ stageId: "stage-not-submitted", stageName: "Not Submitted" });
    submittedQuote({ stageId: "stage-won", stageName: "Won" });
    submittedQuote({ stageId: "stage-lost", stageName: "Lost" });

    expect(runFollowUpSweep({ now: NOW }).triggered).toHaveLength(0);
  });

  it("ignores archived quotes", () => {
    const quote = submittedQuote();
    opportunityStore.softDelete(quote.id, "Cancelled", creator);

    expect(runFollowUpSweep({ now: NOW }).triggered).toHaveLength(0);
  });

  it("measures from submission, not creation, and falls back to the sent date", () => {
    // Created just now, but the quote went out three days ago.
    const quote = submittedQuote({ submittedAt: undefined, quoteSentDate: threeDaysAgo });

    const result = runFollowUpSweep({ now: NOW });

    expect(result.triggered.map((t) => t.id)).toContain(quote.id);
  });

  it("does not overwrite a next action the rep has already set", () => {
    const quote = submittedQuote({
      nextAction: "Call David about the pole spacing",
      nextActionDate: "2026-09-20"
    });

    runFollowUpSweep({ now: NOW });

    const after = opportunityStore.getById(quote.id)!;
    expect(after.nextAction).toBe("Call David about the pole spacing");
    expect(after.nextActionDate).toBe("2026-09-20");
    expect(after.stageName).toBe("Follow Up Required");
  });

  it("honours a custom window so the rule is configurable rather than hardcoded at the call site", () => {
    submittedQuote({ submittedAt: oneDayAgo });

    const strict = runFollowUpSweep({ now: NOW, afterMs: 12 * 60 * 60 * 1000 });

    expect(strict.triggered).toHaveLength(1);
    expect(FOLLOW_UP_AFTER_MS).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it("flags every eligible quote, not just the first", () => {
    submittedQuote({ quoteNumber: "Q-1" });
    submittedQuote({ quoteNumber: "Q-2" });
    submittedQuote({ quoteNumber: "Q-3" });

    const result = runFollowUpSweep({ now: NOW });

    expect(result.triggered).toHaveLength(3);
    expect(result.evaluated).toBe(3);
    expect(notificationStore.getAll()).toHaveLength(3);
  });
});
