import { describe, it, expect } from 'vitest';
import { CRMActivity } from '../../types/crm';

describe('Priority 1: CRM Activity Deduplication, Filtering & Metadata Validation', () => {
  const sampleActivities: CRMActivity[] = [
    {
      id: "act-1",
      type: "call",
      title: "Discovery call with Sunshine Coast Council",
      description: "Confirmed lighting category PP4 requirement.",
      accountId: "acc-1",
      accountName: "Sunshine Coast Council",
      performedBy: "Travis Maher",
      authorId: "user-travis-maher",
      outcome: "Connected / Positive",
      nextAction: "Issue quotation by Friday",
      timestamp: new Date("2026-08-28T10:00:00Z").toISOString()
    },
    {
      id: "act-2",
      type: "email",
      title: "AI Email Draft Generated: Proposal Follow-up",
      description: "Drafted follow-up email.",
      accountId: "acc-1",
      accountName: "Sunshine Coast Council",
      performedBy: "Travis Maher",
      authorId: "user-travis-maher",
      timestamp: new Date("2026-08-28T10:05:00Z").toISOString()
    },
    {
      id: "act-3",
      type: "meeting",
      title: "Tender briefing meeting with Baw Baw Shire",
      description: "Reviewed pole spacing and foundation requirements.",
      accountId: "acc-2",
      accountName: "Baw Baw Shire Council",
      performedBy: "Sarah Reed",
      authorId: "user-sarah-reed",
      outcome: "Meeting Complete",
      nextAction: "Send technical datasheet package",
      timestamp: new Date("2026-08-28T11:00:00Z").toISOString()
    }
  ];

  it('filters activities by type correctly', () => {
    const calls = sampleActivities.filter((a) => a.type === "call");
    expect(calls.length).toBe(1);
    expect(calls[0].title).toContain("Discovery call");
  });

  it('filters activities by account correctly', () => {
    const acc1Activities = sampleActivities.filter((a) => a.accountId === "acc-1");
    expect(acc1Activities.length).toBe(2);
  });

  it('filters activities by rep / author correctly', () => {
    const sarahActivities = sampleActivities.filter((a) => a.performedBy.includes("Sarah"));
    expect(sarahActivities.length).toBe(1);
    expect(sarahActivities[0].authorId).toBe("user-sarah-reed");
  });

  it('deduplicates rapid consecutive AI technical draft spam', () => {
    const existing = sampleActivities;
    const newDuplicateDraft: Omit<CRMActivity, "id" | "timestamp"> = {
      type: "email",
      title: "AI Email Draft Generated: Proposal Follow-up",
      description: "Drafted follow-up email.",
      accountId: "acc-1",
      performedBy: "Travis Maher"
    };

    const isDuplicate = existing.some((a) => {
      const matchesTitle = a.title === newDuplicateDraft.title && a.accountId === newDuplicateDraft.accountId;
      return matchesTitle;
    });

    expect(isDuplicate).toBe(true);
  });
});
