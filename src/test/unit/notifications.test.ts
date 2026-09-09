import { describe, it, expect } from "vitest";
import { notificationStore } from "../../server/notificationStore";

describe("Notification Store Unit Tests", () => {
  it("initializes empty and creates a new notification", async () => {
    const all = await notificationStore.getAll();
    expect(Array.isArray(all)).toBe(true);

    const created = await notificationStore.create({
      title: "Test Alert",
      message: "This is an automated test alert",
      type: "action_required",
      linkTo: {
        view: "pipeline",
        id: "crm-opp-1"
      }
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe("Test Alert");
    expect(created.isRead).toBe(false);
    expect(created.isArchived).toBe(false);

    const refetched = await notificationStore.getById(created.id);
    expect(refetched?.id).toBe(created.id);
  });

  it("marks a notification as read and archives it without deleting", async () => {
    const created = await notificationStore.create({
      title: "Mark Read Test",
      message: "Testing read state",
      type: "info"
    });

    const marked = await notificationStore.markRead(created.id);
    expect(marked?.isRead).toBe(true);

    const archived = await notificationStore.archive(created.id);
    expect(archived?.isArchived).toBe(true);

    const refetched = await notificationStore.getById(created.id);
    expect(refetched?.isRead).toBe(true);
    expect(refetched?.isArchived).toBe(true);
  });

  it("marks all notifications as read", async () => {
    const allRead = await notificationStore.markAllRead();
    const unread = allRead.filter((n) => !n.isRead);
    expect(unread.length).toBe(0);
  });
});
