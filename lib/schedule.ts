import { WEEKDAYS, type Weekday } from "./tours";

/**
 * Weekday of an ISO "YYYY-MM-DD" date, or null if the string isn't one.
 *
 * Built from the numbers via Date.UTC rather than `new Date(iso)`: the string
 * form is parsed as UTC midnight and then read back in the runtime's zone, so
 * on a server west of UTC it reports the previous day. Vercel runs in UTC and
 * the island sits at UTC+1, which is exactly the gap that would let a valid
 * Monday be rejected as a Sunday.
 */
export function weekdayOfIso(iso: string): Weekday | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject dates JS would silently roll over (2026-02-31 → 3 March).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  // getUTCDay() is 0 = Sunday; WEEKDAYS starts at Monday.
  return WEEKDAYS[(date.getUTCDay() + 6) % 7];
}

/** The human-readable date the AI writes ("17 August 2026"), if it can be read. */
const EN_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export function isoOfEnglishDate(text: string): string | null {
  const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const monthIndex = EN_MONTHS.indexOf(m[2].toLowerCase());
  if (monthIndex < 0) return null;
  const iso = `${m[3]}-${String(monthIndex + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return weekdayOfIso(iso) ? iso : null;
}

function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * The next `count` dates the tour actually departs, as ISO strings.
 *
 * Starts from tomorrow, not today: a same-day departure is usually already
 * inside the booking lead time, and offering it as the fix would just move the
 * customer from one refusal to another.
 */
export function nextAllowedDates(days: Weekday[], count = 3, from = new Date()): string[] {
  if (!days.length) return [];
  const allowed = new Set(days);
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const out: string[] = [];
  // 14 days covers any weekly schedule; the guard just stops a runaway loop.
  for (let i = 1; i <= 21 && out.length < count; i++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = WEEKDAYS[(cursor.getUTCDay() + 6) % 7];
    if (allowed.has(weekday)) out.push(toIso(cursor));
  }
  return out;
}
