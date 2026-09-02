import fs from "fs";
import path from "path";
import { ServerNotification } from "../types/crm";

/**
 * Server-Side Shared Notification Repository
 *
 * NOTE FOR PRODUCTION DEPLOYMENT:
 * This implementation provides single-server file-backed persistence. For multi-instance
 * horizontal scaling in production, replace this file storage abstraction with a distributed
 * database (e.g. PostgreSQL, Redis, or Cloud Firestore).
 */

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "server_data") : path.resolve(process.cwd(), "server_data");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");

const SEED_NOTIFICATIONS: ServerNotification[] = [];

class NotificationStore {
  private notifications: ServerNotification[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      this.notifications = [...SEED_NOTIFICATIONS];
      this.isInitialized = true;
      return;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(NOTIFICATIONS_FILE)) {
        const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
        this.notifications = JSON.parse(raw);
      } else {
        this.notifications = [...SEED_NOTIFICATIONS];
        this.save();
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("[NotificationStore] Failed to initialize from disk, using seed data:", err);
      this.notifications = [...SEED_NOTIFICATIONS];
      this.isInitialized = true;
    }
  }

  private save() {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(this.notifications, null, 2), "utf-8");
    } catch (err) {
      console.error("[NotificationStore] Failed to write notifications to disk:", err);
    }
  }

  public getAll(includeArchived = false): ServerNotification[] {
    let list = this.notifications;
    if (!includeArchived) {
      list = list.filter((n) => !n.isArchived);
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getById(id: string): ServerNotification | undefined {
    return this.notifications.find((n) => n.id === id);
  }

  public create(
    data: Omit<ServerNotification, "id" | "createdAt" | "isRead" | "isArchived"> & { isRead?: boolean; isArchived?: boolean }
  ): ServerNotification {
    const now = new Date().toISOString();
    const notification: ServerNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: data.isRead ?? false,
      isArchived: data.isArchived ?? false,
      createdAt: now
    };

    this.notifications.unshift(notification);
    this.save();
    return notification;
  }

  public markRead(id: string): ServerNotification | undefined {
    const item = this.notifications.find((n) => n.id === id);
    if (!item) return undefined;
    item.isRead = true;
    this.save();
    return item;
  }

  public markAllRead(): ServerNotification[] {
    this.notifications.forEach((n) => {
      n.isRead = true;
    });
    this.save();
    return this.getAll();
  }

  public archive(id: string): ServerNotification | undefined {
    const item = this.notifications.find((n) => n.id === id);
    if (!item) return undefined;
    item.isArchived = true;
    this.save();
    return item;
  }

  public resetData(useSeed = true): void {
    this.notifications = useSeed ? [...SEED_NOTIFICATIONS] : [];
    this.save();
  }
}

export const notificationStore = new NotificationStore();
