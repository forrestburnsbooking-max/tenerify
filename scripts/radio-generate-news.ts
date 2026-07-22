/**
 * Radio Tenerify — news segment generator.
 * Fetches latest Tenerife/Canary Islands news, has Claude write a two-host
 * banter script discussing it, saves the script (no audio yet) to
 * data/radio/segments/latest.json.
 *
 * Run: npm run radio:news
 * Next step: npm run radio:voices (needs ELEVENLABS_API_KEY) to turn this into audio.
 */

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getEvents } from "../lib/events";

// Load .env.local so `npm run radio:news` works without exporting vars by hand.
try {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on real env */
}

const NEWS_FEED_URL = "https://euroweeklynews.com/news/spain/canary-islands/feed/";
const OUT_DIR = path.join(process.cwd(), "data", "radio", "segments");
const OUT_FILE = path.join(OUT_DIR, "latest.json");

type NewsItem = { title: string; link: string; pubDate: string; description: string };

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(NEWS_FEED_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Tenerify-Radio/1.0)" },
  });
  const xml = await res.text();
  const items: NewsItem[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of itemBlocks.slice(0, 8)) {
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = decodeEntities(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const pubDate = decodeEntities(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
    const description = decodeEntities(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    if (title) items.push({ title, link, pubDate, description });
  }
  return items;
}

async function getWeather(): Promise<string> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=28.0916&longitude=-16.7291&current=temperature_2m,weathercode,windspeed_10m&timezone=Atlantic%2FCanary"
    );
    const data = await res.json();
    return `${Math.round(data.current.temperature_2m)}°C, weather code ${data.current.weathercode}`;
  } catch {
    return "";
  }
}

async function generateScript(news: NewsItem[]) {
  const client = new Anthropic();
  const newsBlock = news
    .map((n, i) => `${i + 1}. ${n.title} (published ${n.pubDate})\n${n.description}`)
    .join("\n\n");
  const [weather, events] = await Promise.all([getWeather(), getEvents()]);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `You write the news segment for "Radio Tenerify", an English-language internet radio station for tourists, expats and locals on Tenerife. The segment is a short, warm, natural back-and-forth between two hosts — Alex and Mia — chatting about what's happening on the island right now.

Today's date is ${new Date().toISOString().slice(0, 10)}. Current weather in Tenerife South: ${weather || "unavailable"}.

You have THREE kinds of material — blend them, don't just read a news bulletin:
1. News items below (may be old or heavy — accidents, incidents). Only lead with one of these if it's genuinely important; never invent urgency for stale items, and if an item is clearly old (weeks/months back), either skip it or frame it as "a story that made the rounds a while back" rather than implying it just happened.
2. Upcoming events/agenda on the island (fiestas, concerts, romerías) — great for a lighter, warmer segment.
3. Today's weather.

Prioritize making the segment feel current and pleasant to listen to. If the news items are mostly heavy/tragic, do NOT force jokes over them — acknowledge briefly and respectfully, then pivot the bulk of the segment to weather + upcoming events so the overall vibe stays welcoming, not grim. Never fabricate news that isn't in the material below. End with a short, warm sign-off. Keep total length to about 45-70 seconds of spoken audio (roughly 120-180 words total).`,
    messages: [
      {
        role: "user",
        content: `NEWS ITEMS:\n${newsBlock}\n\nUPCOMING EVENTS/AGENDA:\n${events || "(none available)"}\n\nWrite the segment.`,
      },
    ],
    tools: [
      {
        name: "segment",
        description: "The two-host news segment script",
        input_schema: {
          type: "object" as const,
          properties: {
            lines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  speaker: { type: "string", enum: ["Alex", "Mia"] },
                  text: { type: "string" },
                },
                required: ["speaker", "text"],
              },
            },
          },
          required: ["lines"],
        },
      },
    ],
    tool_choice: { type: "tool" as const, name: "segment" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a segment");
  return (toolUse.input as { lines: { speaker: "Alex" | "Mia"; text: string }[] }).lines;
}

async function main() {
  console.log("Fetching Tenerife/Canary Islands news...");
  const news = await fetchNews();
  if (news.length === 0) {
    console.error("No news items found — feed may have changed shape.");
    process.exit(1);
  }
  console.log(`Got ${news.length} items. Asking Claude to write the segment...`);
  const lines = await generateScript(news);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceItems: news.map((n) => ({ title: n.title, link: n.link })),
    lines,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Saved script to ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`Next: npm run radio:voices  (needs ELEVENLABS_API_KEY in .env.local)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
