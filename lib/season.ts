// Booking lead time and the high-season window.
//
// The lead time is a single rule all year: an activity must start at least
// MIN_LEAD_HOURS from the moment of booking. It used to be seasonal (12h in
// high season, 3h otherwise); the operators close their lists a day ahead, so
// the flat 24h matches how they actually work.
//
// The season window stays — it's still useful context for the assistant (a
// busy island reads differently from a quiet one) — but it no longer changes
// the lead time. Endpoints are inclusive, format "MM-DD", and the window must
// not wrap across New Year (the MM-DD compare below assumes from <= to).

const HIGH_SEASON = { from: "06-15", to: "09-15" };
const TZ = "Atlantic/Canary";

export const MIN_LEAD_HOURS = 24;

function tenerifeMonthDay(date: Date): string {
  // "MM-DD" in Tenerife local time, so the season flips at Canary midnight.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${m}-${d}`;
}

export function isHighSeason(date: Date = new Date()): boolean {
  const md = tenerifeMonthDay(date);
  return md >= HIGH_SEASON.from && md <= HIGH_SEASON.to;
}

export function minLeadHours(): number {
  return MIN_LEAD_HOURS;
}

// Human-readable window for prompts/copy, e.g. "15 June – 15 September".
export function highSeasonLabel(): string {
  const fmt = (mmdd: string) => {
    const [m, d] = mmdd.split("-").map(Number);
    const date = new Date(Date.UTC(2000, m - 1, d));
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
    }).format(date);
  };
  return `${fmt(HIGH_SEASON.from)} – ${fmt(HIGH_SEASON.to)}`;
}
