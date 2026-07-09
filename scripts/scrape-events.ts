/**
 * Scraper for Tenerife events → data/events.json
 * Run: npm run scrape-events
 *
 * Sources:
 * - webtenerife.com/agenda — official Turismo de Tenerife calendar (island-wide)
 * - arona.org/Agenda?area=Cultura — Arona town hall cultural agenda (Tenerife South)
 * (The original source, tenerifecultura.com, no longer exists.)
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

const ENTITIES: Record<string, string> = {
  oacute: "ó", aacute: "á", eacute: "é", iacute: "í", uacute: "ú", ntilde: "ñ",
  Oacute: "Ó", Aacute: "Á", Eacute: "É", Iacute: "Í", Uacute: "Ú", Ntilde: "Ñ",
  uuml: "ü", ordf: "ª", ordm: "º", deg: "°", amp: "&", quot: '"', apos: "'",
  ndash: "–", mdash: "—", hellip: "…", nbsp: " ", laquo: "«", raquo: "»",
};

const stripTags = (s: string) =>
  s.replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (full, name: string) => {
      if (name.startsWith("#")) {
        const code = name[1] === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : full;
      }
      return ENTITIES[name] ?? full;
    })
    .replace(/\s+/g, " ").trim();

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

const MONTH_ABBR: Record<string, string> = {
  ENE: "01", FEB: "02", MAR: "03", ABR: "04", MAY: "05", JUN: "06",
  JUL: "07", AGO: "08", SEP: "09", SEPT: "09", OCT: "10", NOV: "11", DIC: "12",
};

// Listing shows only day + month — pick the year that puts the date in the
// future-ish window (a date >30 days in the past must be next year's).
function inferYear(month: string, day: string): string {
  const now = new Date();
  const candidate = new Date(`${now.getFullYear()}-${month}-${day}T12:00:00`);
  if (candidate.getTime() < now.getTime() - 30 * 86400_000) {
    return String(now.getFullYear() + 1);
  }
  return String(now.getFullYear());
}

async function fetchAronaDescription(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: UA });
    const html = await res.text();
    const m = /Descripcion del evento:\s*([\s\S]{40,}?)<\//.exec(html);
    return m ? stripTags(m[1]).slice(0, 300) : "";
  } catch {
    return "";
  }
}

async function scrapeArona(): Promise<Event[]> {
  const res = await fetch("https://www.arona.org/Agenda?area=Cultura", { headers: UA });
  const html = await res.text();

  const events: Event[] = [];
  const blocks = html.split('<div class="agenda-evento">').slice(1);
  for (const block of blocks) {
    const day = (/<div class="agenda-evento-dia">(\d{1,2})<\/div>/.exec(block) || [])[1];
    const monthAbbr = (/<div class="agenda-evento-mes">(\w+)\.?<\/div>/.exec(block) || [])[1];
    const link = /<div class="agenda-evento-title">\s*<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!day || !monthAbbr || !link) continue;

    const month = MONTH_ABBR[monthAbbr.toUpperCase().replace(".", "")];
    if (!month) continue;

    const title = stripTags(link[2]);
    const url = link[1];
    events.push({
      title,
      date: `${inferYear(month, day.padStart(2, "0"))}-${month}-${day.padStart(2, "0")}`,
      location: "",
      description: "",
      price: "See website",
      url,
    });
  }

  for (const e of events) {
    if (!e.url) continue;
    e.description = await fetchAronaDescription(e.url);
    e.location = guessLocation(`${e.title} ${e.description}`);
    if (e.location === "Tenerife") e.location = "Arona";
    await new Promise((r) => setTimeout(r, 300));
  }

  return events;
}

// Same happening can appear in both calendars — keep the first (webtenerife
// wins: its entries carry better island-wide context).
function dedupe(events: Event[]): Event[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.date}|${e.title.toLowerCase().replace(/[^a-zá-ú0-9]+/gi, " ").trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  console.log("Scraping Tenerife events (webtenerife.com + arona.org)...");

  const [webtenerife, arona] = await Promise.all([scrapeWebtenerife(), scrapeArona()]);
  const events = dedupe([...webtenerife, ...arona]);

  // Keep events that haven't ended yet, within the next 90 days
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);

  const filtered = events
    .filter((e) => (e.endDate ?? e.date) >= today && e.date <= cutoff)
    // A postponed/cancelled event surfacing as current is worse than a gap
    .filter((e) => !/APLAZADO|CANCELADO|SUSPENDIDO|POSPUESTO/i.test(e.title))
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
