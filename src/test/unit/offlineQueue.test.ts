import { describe, it, expect, beforeEach } from 'vitest';
import {
  getQueuedWrites,
  getQueuedWritesCount,
  queueWriteOperation,
  recordSuccessfulSync,
  getLastSyncTime
} from '../../utils/firebase';

describe('Priority 0: Cloud Sync & Offline Queue', () => {
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
});
