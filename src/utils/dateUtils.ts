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

/* ---------------------------------------------------------------------------
   Display formatting.

   Stored dates are ISO (YYYY-MM-DD) because that is what date inputs and
   sorting need. They must never reach the screen in that form: the audit found
   raw ISO dates on the calendar, the meeting card, both preparation plans, the
   quotes table, the task list and the account header, alongside three other
   formats elsewhere. Everything user-facing goes through the helpers below.
--------------------------------------------------------------------------- */

/** Parses "YYYY-MM-DD" as a local calendar date, not a UTC instant. */
function parseCalendarDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const parts = String(value).split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (y && m && d) {
      const date = new Date(y, m - 1, d);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** "8 Sep 2026". The default for anything a salesperson reads. */
export function formatAuDate(value?: string | Date | null, fallback = ""): string {
  const date = parseCalendarDate(value);
  if (!date) return fallback || (typeof value === "string" ? value : "");
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

/** "Tuesday 8 September 2026". For page headers only. */
export function formatAuDateLong(value?: string | Date | null, fallback = ""): string {
  const date = parseCalendarDate(value);
  if (!date) return fallback || (typeof value === "string" ? value : "");
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

/** "Tue 8 Sep". For dense rows where the year is implied. */
export function formatAuDateShort(value?: string | Date | null, fallback = ""): string {
  const date = parseCalendarDate(value);
  if (!date) return fallback || (typeof value === "string" ? value : "");
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);
}

/**
 * "9:30am". One time format across the app — the scheduler previously offered
 * "09:30 AM" while the calendar card and preparation plan rendered "09:30".
 * Accepts both, plus 24-hour values.
 */
export function formatAuTime(value?: string | null, fallback = ""): string {
  if (!value) return fallback;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!match) return raw;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (isNaN(hours) || isNaN(minutes)) return raw;
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${displayHour}${suffix}`
    : `${displayHour}:${String(minutes).padStart(2, "0")}${suffix}`;
}

/** "8 Sep 2026 at 9:30am", or just the date when no time is held. */
export function formatAuDateTime(dateValue?: string | Date | null, timeValue?: string | null): string {
  const datePart = formatAuDate(dateValue);
  const timePart = formatAuTime(timeValue || undefined);
  if (!datePart) return timePart;
  return timePart ? `${datePart} at ${timePart}` : datePart;
}
