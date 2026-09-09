import { ServerNotification } from "../types/crm";
import { createDocBackend, DocBackend } from "./docStore";

/**
 * Server-Side Shared Notification Repository
 *
 * Backed by Firestore through the Admin SDK when credentials are configured,
 * and by a local JSON file otherwise.
 *
 * The previous file-only implementation carried a note asking for exactly this
 * change: on a serverless host the file lived in /tmp, so notifications were
 * lost on every deployment and were never shared between the instances serving
 * concurrent reps — one rep could mark a notification read and another would
 * still see it unread.
 */

class NotificationStore {
  private backend: DocBackend<ServerNotification> | null = null;

  private getBackend(): DocBackend<ServerNotification> {
    if (!this.backend) {
      this.backend = createDocBackend<ServerNotification>("notifications", "notifications.json");
    }
    return this.backend;
  }

  private sortNewestFirst(list: ServerNotification[]): ServerNotification[] {
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getAll(includeArchived = false): Promise<ServerNotification[]> {
    const all = await this.getBackend().loadAll();
    const list = includeArchived ? all : all.filter((n) => !n.isArchived);
    return this.sortNewestFirst(list);
  }

  public async getById(id: string): Promise<ServerNotification | undefined> {
    const all = await this.getBackend().loadAll();
    return all.find((n) => n.id === id);
  }

  public async create(
    data: Omit<ServerNotification, "id" | "createdAt" | "isRead" | "isArchived"> & {
      isRead?: boolean;
      isArchived?: boolean;
    }
  ): Promise<ServerNotification> {
    const notification: ServerNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: data.isRead ?? false,
      isArchived: data.isArchived ?? false,
      createdAt: new Date().toISOString()
    };

    await this.getBackend().put(notification.id, notification);
    return notification;
  }

  public async markRead(id: string): Promise<ServerNotification | undefined> {
    const item = await this.getById(id);
    if (!item) return undefined;
    const updated = { ...item, isRead: true };
    await this.getBackend().put(id, updated);
    return updated;
  }

  public async markAllRead(): Promise<ServerNotification[]> {
    const all = await this.getBackend().loadAll();
    const unread = all.filter((n) => !n.isRead);
    if (unread.length > 0) {
      await this.getBackend().putMany(
        unread.map((n) => ({ id: n.id, doc: { ...n, isRead: true } }))
      );
    }
    return this.getAll();
  }

  public async archive(id: string): Promise<ServerNotification | undefined> {
    const item = await this.getById(id);
    if (!item) return undefined;
    const updated = { ...item, isArchived: true };
    await this.getBackend().put(id, updated);
    return updated;
  }

  public async resetData(): Promise<void> {
    const all = await this.getBackend().loadAll();
    for (const n of all) {
      await this.getBackend().remove(n.id);
    }
  }
}

export const notificationStore = new NotificationStore();
