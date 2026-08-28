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
