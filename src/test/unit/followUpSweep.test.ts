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

  const submittedQuote = async (overrides: Record<string, any> = {}) =>
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

  beforeEach(async () => {
    await opportunityStore.clearForTesting();
    await auditLogStore.clearForTesting();
    await notificationStore.resetData();
  });

  it("moves a quote submitted three days ago to Follow Up Required", async () => {
    const quote = await submittedQuote();

    const result = await runFollowUpSweep({ now: NOW });

    expect(result.triggered).toHaveLength(1);
    expect(result.triggered[0].daysSinceSubmission).toBe(3);
    expect(result.failed).toEqual([]);

    const after = await opportunityStore.getById(quote.id)!;
    expect(after.stageId).toBe("stage-followup-required");
    expect(after.stageName).toBe("Follow Up Required");
    expect(after.nextAction).toContain("Q-1042");
    expect(after.nextActionDate).toBe("2026-09-08");
    expect(after.followUpReminderTriggeredAt).toBeTruthy();
  });

  it("raises one notification and one audit record for the flagged quote", async () => {
    await submittedQuote();

    await runFollowUpSweep({ now: NOW });

    const notifications = await notificationStore.getAll();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("action_required");
    expect(notifications[0].title).toContain("Cardinia Shared Trail");
    expect(notifications[0].linkTo?.view).toBe("pipeline");

    const audit = await auditLogStore.getAll();
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("STAGE_CHANGE");
    expect(audit[0].userName).toBe("System Automation");
    expect(audit[0].changes?.stageName).toEqual({ from: "Submitted", to: "Follow Up Required" });
  });

  it("never flags the same quote twice, however often the sweep runs", async () => {
    await submittedQuote();

    const first = await runFollowUpSweep({ now: NOW });
    const second = await runFollowUpSweep({ now: new Date(NOW.getTime() + 60_000) });
    const third = await runFollowUpSweep({ now: new Date(NOW.getTime() + 86_400_000) });

    expect(first.triggered).toHaveLength(1);
    expect(second.triggered).toHaveLength(0);
    expect(third.triggered).toHaveLength(0);
    expect(await notificationStore.getAll()).toHaveLength(1);
  });

  it("leaves a quote submitted only yesterday alone", async () => {
    const quote = await submittedQuote({ submittedAt: oneDayAgo });

    const result = await runFollowUpSweep({ now: NOW });

    expect(result.triggered).toHaveLength(0);
    expect((await opportunityStore.getById(quote.id))!.stageId).toBe("stage-submitted");
    expect(await notificationStore.getAll()).toHaveLength(0);
  });

  it("ignores quotes that are not in Submitted", async () => {
    await submittedQuote({ stageId: "stage-not-submitted", stageName: "Not Submitted" });
    await submittedQuote({ stageId: "stage-won", stageName: "Won" });
    await submittedQuote({ stageId: "stage-lost", stageName: "Lost" });

    expect((await runFollowUpSweep({ now: NOW })).triggered).toHaveLength(0);
  });

  it("ignores archived quotes", async () => {
    const quote = await submittedQuote();
    await opportunityStore.softDelete(quote.id, "Cancelled", creator);

    expect((await runFollowUpSweep({ now: NOW })).triggered).toHaveLength(0);
  });

  it("measures from submission, not creation, and falls back to the sent date", async () => {
    // Created just now, but the quote went out three days ago.
    const quote = await submittedQuote({ submittedAt: undefined, quoteSentDate: threeDaysAgo });

    const result = await runFollowUpSweep({ now: NOW });

    expect(result.triggered.map((t) => t.id)).toContain(quote.id);
  });

  it("does not overwrite a next action the rep has already set", async () => {
    const quote = await submittedQuote({
      nextAction: "Call David about the pole spacing",
      nextActionDate: "2026-09-20"
    });

    await runFollowUpSweep({ now: NOW });

    const after = await opportunityStore.getById(quote.id)!;
    expect(after.nextAction).toBe("Call David about the pole spacing");
    expect(after.nextActionDate).toBe("2026-09-20");
    expect(after.stageName).toBe("Follow Up Required");
  });

  it("honours a custom window so the rule is configurable rather than hardcoded at the call site", async () => {
    await submittedQuote({ submittedAt: oneDayAgo });

    const strict = await runFollowUpSweep({ now: NOW, afterMs: 12 * 60 * 60 * 1000 });

    expect(strict.triggered).toHaveLength(1);
    expect(FOLLOW_UP_AFTER_MS).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it("flags every eligible quote, not just the first", async () => {
    await submittedQuote({ quoteNumber: "Q-1" });
    await submittedQuote({ quoteNumber: "Q-2" });
    await submittedQuote({ quoteNumber: "Q-3" });

    const result = await runFollowUpSweep({ now: NOW });

    expect(result.triggered).toHaveLength(3);
    expect(result.evaluated).toBe(3);
    expect(await notificationStore.getAll()).toHaveLength(3);
  });
});
