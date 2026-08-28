import { CRMNotification } from "../types/crm";

/**
 * Normalises a raw notification record into canonical CRMNotification format
 * guaranteeing a single boolean `isRead` source of truth.
 */
export function normalizeNotification(n: any): CRMNotification {
  if (!n) {
    return {
      id: `notif-${Date.now()}`,
      title: "System Notification",
      message: "",
      type: "info",
      isRead: false,
      isArchived: false,
      createdAt: new Date().toISOString()
    };
  }

  const isRead = Boolean(
    n.isRead === true ||
    n.read === true ||
    n.status === "read" ||
    n.readAt
  );

  const isArchived = Boolean(
    n.isArchived === true ||
    n.archived === true ||
    n.status === "archived"
  );

  return {
    ...n,
    id: n.id || `notif-${Date.now()}`,
    title: n.title || "Notification",
    message: n.message || "",
    type: n.type || "info",
    isRead,
    isArchived,
    readAt: n.readAt || (isRead ? (n.updatedAt || n.createdAt || new Date().toISOString()) : undefined),
    createdAt: n.createdAt || n.timestamp || new Date().toISOString()
  };
}

/**
 * Derives the exact unread count from a collection of notifications.
 */
export function getUnreadNotificationsCount(notifications: CRMNotification[]): number {
  return (notifications || []).reduce((acc, raw) => {
    const norm = normalizeNotification(raw);
    return !norm.isRead && !norm.isArchived ? acc + 1 : acc;
  }, 0);
}
