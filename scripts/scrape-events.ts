/**
 * Scraper for Tenerife events → data/events.json
 * Run: npm run scrape-events
 *
 * Source: webtenerife.com/agenda — the official Turismo de Tenerife calendar.
 * (The previous source, tenerifecultura.com, no longer exists.)
 */

import fs from "fs";
import path from "path";

type Event = {
  title: string;
  date: string;
  endDate?: string;
  location: string;
  description: string;
  price: string;
  url?: string;
};

const UA = { "User-Agent": "Mozilla/5.0 (compatible; Tenerify/1.0)" };

const MONTHS: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

// Towns a tourist would recognize — matched against title+lead to fill `location`.
const TOWNS = [
  "Santa Cruz de Tenerife", "Santa Cruz", "La Laguna", "Puerto de la Cruz",
  "Los Cristianos", "Las Américas", "Costa Adeje", "Adeje", "Arona",
  "Los Gigantes", "Santiago del Teide", "El Médano", "Granadilla", "Candelaria",
  "La Orotava", "Garachico", "Icod de los Vinos", "Güímar", "Vilaflor", "Tacoronte",
];

const stripTags = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&oacute;/g, "ó").replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é").replace(/&iacute;/g, "í").replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();

function parseSpanishDate(d: string, m: string, y: string): string {
  const month = MONTHS[m.toLowerCase()];
  return month ? `${y}-${month}-${d.padStart(2, "0")}` : "";
}

function guessLocation(text: string): string {
  for (const town of TOWNS) if (text.includes(town)) return town;
  return "Tenerife";
}

async function fetchLead(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: UA });
    const html = await res.text();
    const m =
      /<h1[^>]*>[\s\S]*?<\/h1>[\s\S]{0,2000}?<p>([\s\S]{60,}?)<\/p>/.exec(html) ||
      /<p>([\s\S]{80,}?)<\/p>/.exec(html);
    return m ? stripTags(m[1]).slice(0, 300) : "";
  } catch {
    return "";
  }
}

async function scrapeWebtenerife(): Promise<Event[]> {
  const res = await fetch("https://www.webtenerife.com/agenda/", { headers: UA });
  const html = await res.text();

  const events: Event[] = [];
  const cardRegex = /<a class="card__link" href=([^>\s]+)>([\s\S]*?)<\/a>/g;
  const dateRegex = /<div class="event-date">\s*(?:-\s*)?(\d{1,2}) ([a-zá-ú]+) (\d{4})<\/div>/gi;
  const titleRegex = /<h3 class="card__title heading">([\s\S]*?)<\/h3>/;

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const [, href, block] = match;
    const title = stripTags((titleRegex.exec(block) || [])[1] || "");
    const dates = [...block.matchAll(dateRegex)].map(([, d, m, y]) => parseSpanishDate(d, m, y)).filter(Boolean);
    if (!title || !dates.length) continue;

    events.push({
      title,
      date: dates[0],
      endDate: dates[1] && dates[1] !== dates[0] ? dates[1] : undefined,
      location: "",
      description: "",
      price: "See website",
      url: href.replace(/^"|"$/g, ""),
    });
  }

  // Enrich with the lead paragraph from each event page (also drives location)
  for (const e of events) {
    if (!e.url) continue;
    const lead = await fetchLead(e.url);
    e.description = lead;
    e.location = guessLocation(`${e.title} ${lead}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  return events;
}

async function main() {
  console.log("Scraping Tenerife events (webtenerife.com/agenda)...");

  const events = await scrapeWebtenerife();

  // Keep events that haven't ended yet, within the next 90 days
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);

  const filtered = events
    .filter((e) => (e.endDate ?? e.date) >= today && e.date <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 50);

  if (!filtered.length) {
    console.error("No events scraped — keeping the existing data/events.json untouched.");
    process.exit(1);
  }

  const outputPath = path.join(process.cwd(), "data", "events.json");
  fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2) + "\n");
  console.log(`Saved ${filtered.length} events to data/events.json`);
  for (const e of filtered) console.log(`  ${e.date}${e.endDate ? "→" + e.endDate : ""} | ${e.location} | ${e.title}`);
}

main();
