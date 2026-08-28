/**
 * Australia/Sydney Timezone-Aware Date & Business Day Utilities
 * 
 * Guarantees that default form dates, task due dates, competitor observation dates,
 * and KPI business day calculations always reflect local Australian calendar dates
 * rather than shifting to UTC yesterday.
 */

export const DEFAULT_AUSTRALIAN_TIMEZONE = "Australia/Sydney";

/**
 * Returns YYYY-MM-DD in the target Australian timezone (default: Australia/Sydney).
 * Automatically handles Daylight Saving Time (AEDT UTC+11 vs AEST UTC+10).
 */
export function getLocalDateInputValue(
  dateInput: Date | string | number = new Date(),
  timezone: string = DEFAULT_AUSTRALIAN_TIMEZONE
): string {
  const dateObj = typeof dateInput === "string" || typeof dateInput === "number"
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(dateObj.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  // en-CA produces ISO YYYY-MM-DD in local target timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(dateObj);
}

/**
 * Adds N calendar days in the target Australian timezone.
 */
export function addDaysLocal(
  days: number,
  baseDateInput: Date | string = new Date(),
  timezone: string = DEFAULT_AUSTRALIAN_TIMEZONE
): string {
  const baseDate = typeof baseDateInput === "string" ? new Date(baseDateInput) : baseDateInput;
  const target = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return getLocalDateInputValue(target, timezone);
}

/**
 * Adds N business days (excluding Saturday and Sunday) in the target Australian timezone.
 */
export function addBusinessDaysLocal(
  businessDays: number,
  startDateInput: Date | string = new Date(),
  timezone: string = DEFAULT_AUSTRALIAN_TIMEZONE
): string {
  const localIso = getLocalDateInputValue(startDateInput, timezone);
  const [year, month, day] = localIso.split("-").map(Number);
  let cur = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  let added = 0;
  while (added < businessDays) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dayOfWeek = cur.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return getLocalDateInputValue(cur, timezone);
}

/**
 * Calculates the number of business days between two local calendar dates.
 * Positive if targetDate is in the future.
 */
export function getBusinessDaysDiff(
  targetDateInput: Date | string,
  fromDateInput: Date | string = new Date(),
  timezone: string = DEFAULT_AUSTRALIAN_TIMEZONE
): number {
  const fromIso = getLocalDateInputValue(fromDateInput, timezone);
  const targetIso = getLocalDateInputValue(targetDateInput, timezone);

  if (fromIso === targetIso) return 0;

  const [fromY, fromM, fromD] = fromIso.split("-").map(Number);
  const [targetY, targetM, targetD] = targetIso.split("-").map(Number);

  const start = new Date(Date.UTC(fromY, fromM - 1, fromD, 12, 0, 0));
  const end = new Date(Date.UTC(targetY, targetM - 1, targetD, 12, 0, 0));

  const isForward = end.getTime() > start.getTime();
  let cur = new Date(start);
  let count = 0;

  if (isForward) {
    while (cur < end) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        count++;
      }
    }
    return count;
  } else {
    while (cur > end) {
      cur.setUTCDate(cur.getUTCDate() - 1);
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        count--;
      }
    }
    return count;
  }
}

/**
 * Returns true if target date is open/pending and due within N business days (e.g. 5 business days).
 * Includes today and upcoming business days <= N.
 */
export function isDueWithinBusinessDays(
  targetDateInput?: Date | string | null,
  businessDaysThreshold: number = 5,
  fromDateInput: Date | string = new Date(),
  timezone: string = DEFAULT_AUSTRALIAN_TIMEZONE
): boolean {
  if (!targetDateInput) return false;
  const diff = getBusinessDaysDiff(targetDateInput, fromDateInput, timezone);
  return diff >= 0 && diff <= businessDaysThreshold;
}
