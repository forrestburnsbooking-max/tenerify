import fs from "fs";
import path from "path";

const EVENTS_FILE = path.join(process.cwd(), "data", "events.json");

export type Event = {
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  location: string;
  description: string;
  price: string;
  url?: string;
};

// The island's cultural centers — the /events page filters by these.
export const EVENT_AREAS = [
  "Tenerife South",
  "La Laguna",
  "Santa Cruz",
  "Puerto de la Cruz",
  "La Orotava",
] as const;

export type EventArea = (typeof EVENT_AREAS)[number];

const AREA_TOWNS: Record<EventArea, string[]> = {
  "Tenerife South": [
    "Los Cristianos", "Las Américas", "Costa Adeje", "Adeje", "Arona",
    "Los Gigantes", "Santiago del Teide", "El Médano", "Granadilla",
    "Vilaflor", "Las Galletas", "Costa del Silencio", "Candelaria", "Güímar",
  ],
  "La Laguna": ["La Laguna", "Tacoronte", "Tegueste"],
  "Santa Cruz": ["Santa Cruz de Tenerife", "Santa Cruz"],
  "Puerto de la Cruz": ["Puerto de la Cruz"],
  "La Orotava": ["La Orotava", "Los Realejos", "Icod de los Vinos", "Garachico"],
};

// "Santa Cruz de Tenerife" must not match plain "Santa Cruz" first, so longer
// names win. Unmatched towns return null — the page shows them under All only.
export function getEventArea(location: string): EventArea | null {
  let best: { area: EventArea; len: number } | null = null;
  for (const area of EVENT_AREAS) {
    for (const town of AREA_TOWNS[area]) {
      if (location.includes(town) && (!best || town.length > best.len)) {
        best = { area, len: town.length };
      }
    }
  }
  return best?.area ?? null;
}

// Structured upcoming events for the /events page (same past-event guard).
export function getUpcomingEvents(): Event[] {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return [];
    const events: Event[] = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));
    const today = new Date().toISOString().slice(0, 10);
    return events
      .filter((e) => (e.endDate ?? e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function getEvents(): Promise<string> {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return "";
    const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
    const events: Event[] = JSON.parse(raw);

    // Never surface finished events, however stale the data file is —
    // recommending last month's fiesta as current destroys trust.
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = events.filter((e) => (e.endDate ?? e.date) >= today);
    if (!upcoming.length) return "";

    return upcoming
      .map((e) => {
        const span = e.endDate ? `${e.date} to ${e.endDate}` : e.date;
        const when = e.time ? `${span} at ${e.time}` : span;
        return `- ${e.title} | 📅 ${when} | 📍 ${e.location} | 💶 ${e.price}${e.description ? ` — ${e.description}` : ""}${e.url ? ` | ${e.url}` : ""}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}
