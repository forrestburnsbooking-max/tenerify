import fs from "fs";
import path from "path";

const EVENTS_FILE = path.join(process.cwd(), "data", "events.json");

export type Event = {
  title: string;
  date: string;
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
    if (!events.length) return "";

    return events
      .map((e) => {
        const when = e.time ? `${e.date} at ${e.time}` : e.date;
        return `- ${e.title} | 📅 ${when} | 📍 ${e.location} | 💶 ${e.price}${e.description ? ` — ${e.description}` : ""}${e.url ? ` | ${e.url}` : ""}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}
