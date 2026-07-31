// Booking lead time.
//
// Currently 3h all year round — operators confirm fast enough that the old 12h
// high-season window was costing more bookings than it saved. Raise
// HIGH_SEASON_LEAD_HOURS again to bring the seasonal rule back; the season
// window itself is HIGH_SEASON below — endpoints are inclusive, format "MM-DD".
// The window must not wrap across New Year (the simple MM-DD compare below
// assumes from <= to within the same year).

const HIGH_SEASON = { from: "06-15", to: "09-15" };
const TZ = "Atlantic/Canary";

export const HIGH_SEASON_LEAD_HOURS = 3;
export const OFF_SEASON_LEAD_HOURS = 3;

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

export function minLeadHours(date: Date = new Date()): number {
  return isHighSeason(date) ? HIGH_SEASON_LEAD_HOURS : OFF_SEASON_LEAD_HOURS;
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
