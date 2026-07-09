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
