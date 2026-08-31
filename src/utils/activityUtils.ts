import { CRMActivity } from "../types/crm";

/**
 * Normalises and sorts activity records chronologically.
 * Default is newest-first (descending timestamp).
 */
export function sortActivitiesChronological(
  activities: CRMActivity[],
  order: "newest" | "oldest" = "newest"
): CRMActivity[] {
  return [...activities].sort((a, b) => {
    const timeA = parseActivityTimestamp(a);
    const timeB = parseActivityTimestamp(b);

    if (timeA === timeB) {
      // Deterministic tiebreaker by ID
      return order === "newest"
        ? (b.id || "").localeCompare(a.id || "")
        : (a.id || "").localeCompare(b.id || "");
    }

    return order === "newest" ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Extracts a numeric epoch millisecond timestamp from various activity timestamp formats
 * (ISO strings, date strings, Firestore timestamps, or numbers).
 */
export function parseActivityTimestamp(activity: Partial<CRMActivity> | any): number {
  if (!activity) return 0;

  const raw = activity.timestamp || activity.createdAt || activity.date;

  if (!raw) return 0;

  if (typeof raw === "number") return raw;

  if (typeof raw === "object" && raw !== null) {
    if (typeof raw.toMillis === "function") return raw.toMillis();
    if (typeof raw.seconds === "number") return raw.seconds * 1000;
    if (raw instanceof Date) return raw.getTime();
  }

  const parsed = new Date(raw).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatActivityTimestamp(rawTimestamp?: string | number | any): string {
  if (!rawTimestamp) return "Recent";
  const ms = typeof rawTimestamp === "number" ? rawTimestamp : parseActivityTimestamp({ timestamp: rawTimestamp });
  if (!ms) return "Recent";
  const d = new Date(ms);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

/**
 * Hides repeated system-generated actions that occurred within the same
 * ten-minute window. The underlying audit records remain intact.
 */
export function collapseDuplicateActivities(activities: CRMActivity[]): CRMActivity[] {
  const seen = new Map<string, number>();
  return sortActivitiesChronological(activities).filter((activity) => {
    const key = `${activity.accountId || "none"}|${activity.type}|${activity.title.trim().toLowerCase()}`;
    const timestamp = parseActivityTimestamp(activity);
    const previous = seen.get(key);
    seen.set(key, timestamp);
    return previous === undefined || Math.abs(previous - timestamp) >= 10 * 60 * 1000;
  });
}

