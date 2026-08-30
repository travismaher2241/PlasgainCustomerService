import { describe, it, expect, beforeEach } from 'vitest';
import {
  getQueuedWrites,
  getQueuedWritesCount,
  queueWriteOperation,
  saveDocToCloud,
  recordSuccessfulSync,
  getLastSyncTime,
  clearCollectionFromCloud
} from '../../utils/firebase';
import { analyzeEnquiryDeterministic } from '../../utils/rulesEngine';

describe('Priority 0: Cloud Sync, Offline Queue & Deterministic Rules Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records and retrieves successful cloud sync timestamp', () => {
    expect(getLastSyncTime()).toBeNull();
    recordSuccessfulSync();
    const timestamp = getLastSyncTime();
    expect(timestamp).not.toBeNull();
    expect(new Date(timestamp!).getTime()).toBeGreaterThan(0);
  });

  it('queues offline document writes when offline in localStorage', () => {
    expect(getQueuedWritesCount()).toBe(0);

    const testDoc = { id: "acc-offline-1", name: "Regional Road Authority" };
    queueWriteOperation({
      type: "save",
      collectionName: "crm_accounts",
      docId: "acc-offline-1",
      data: testDoc
    });

    expect(getQueuedWritesCount()).toBe(1);
    const queue = getQueuedWrites();
    expect(queue.length).toBe(1);
    expect(queue[0].collectionName).toBe("crm_accounts");
    expect(queue[0].docId).toBe("acc-offline-1");
  });

  it('runs deterministic rules engine offline with zero network latency', () => {
    const rawEnquiry = "Looking for 50W solar lighting for a 2km shared path in regional Victoria. Need 5 nights battery autonomy and warm 3000K CCT.";
    const result = analyzeEnquiryDeterministic(rawEnquiry, {
      projectName: "Drouin Shared Trail",
      company: "Baw Baw Shire Council",
      location: "VIC"
    });

    expect(result).toBeDefined();
    expect(result.opportunitySummary.project.value).toBe("Drouin Shared Trail");
    expect(result.productRecommendations.recommendedStartingPoint.productCode).toBe("50W-INTENSE");
    expect(result.questionsBeforeWeQuote.length).toBeGreaterThanOrEqual(3);
    expect(result.readiness.score).toBeGreaterThan(0);
  });

  it('matches polymeric cable cover (AS 4702) deterministically on civil trench enquiry', () => {
    const rawEnquiry = "Require 500m of heavy duty orange polymeric cable protection cover 150mm wide complying with AS 4702 for underground HV trenching.";
    const result = analyzeEnquiryDeterministic(rawEnquiry, {
      projectName: "Substation Feeder Trench",
      company: "Powercor Infrastructure"
    });

    expect(result.opportunitySummary.application.value).toContain("Civil Mechanical Protection");
    expect(result.productRecommendations.recommendedStartingPoint.productCode).toBe("CC-POLY-150-50 / PCC-300-6MM");
  });
});
