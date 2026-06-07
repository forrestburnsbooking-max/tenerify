/**
 * Scraper for Tenerife cultural events.
 * Run daily via: npx tsx scripts/scrape-events.ts
 * Or set up a cron: 0 6 * * * cd /path/to/tenerify && npx tsx scripts/scrape-events.ts
 *
 * Sources:
 * - tenerifecultura.com — official Cabildo cultural calendar
 * - tenerifejoven.es   — youth & music events
 */

import fs from "fs";
import path from "path";

type Event = {
  title: string;
  date: string;
  location: string;
  description: string;
  price: string;
  url?: string;
};

async function scrapetenerifecultura(): Promise<Event[]> {
  try {
    const res = await fetch("https://www.tenerifecultura.com/agenda", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Tenerify/1.0)" },
    });
    const html = await res.text();

    const events: Event[] = [];

    // Extract event blocks — site uses <article> tags with class "evento"
    const articleRegex = /<article[^>]*class="[^"]*evento[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const titleRegex = /<h\d[^>]*>([\s\S]*?)<\/h\d>/i;
    const dateRegex = /<time[^>]*datetime="([^"]*)"[^>]*>/i;
    const locationRegex = /class="[^"]*lugar[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
    const linkRegex = /href="(https?:\/\/[^"]*tenerifecultura[^"]*)"/i;
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    let match;
    while ((match = articleRegex.exec(html)) !== null) {
      const block = match[1];
      const title = stripTags((titleRegex.exec(block) || [])[1] || "");
      const date = ((dateRegex.exec(block) || [])[1] || "").slice(0, 10);
      const location = stripTags((locationRegex.exec(block) || [])[1] || "");
      const url = (linkRegex.exec(block) || [])[1] || "";

      if (title && date) {
        events.push({ title, date, location, description: "", price: "See website", url });
      }
    }

    return events;
  } catch (e) {
    console.error("tenerifecultura scrape failed:", e);
    return [];
  }
}

async function main() {
  console.log("Scraping Tenerife cultural events...");

  const events = await scrapetenerifecultura();

  // Sort by date, keep next 60 days
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + 60);

  const filtered = events
    .filter((e) => {
      const d = new Date(e.date);
      return d >= today && d <= cutoff;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 50);

  const outputPath = path.join(process.cwd(), "data", "events.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2));

  console.log(`Saved ${filtered.length} events to data/events.json`);
}

main();
