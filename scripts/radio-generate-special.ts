/**
 * Radio Tenerify — special-topic segment generator.
 * Unlike radio-generate-news.ts (hourly, auto), this is for one-off "program"
 * segments on a specific topic — Alex and Mia debate/discuss it properly,
 * multiple exchanges, actual opinions, not a news bulletin.
 *
 * Run: npx tsx scripts/radio-generate-special.ts "<slug>" "<topic + facts>"
 * Then: npx tsx scripts/radio-generate-voices.ts --special <slug>
 */

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

try {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on real env */
}

const [, , slug, topic] = process.argv;

if (!slug || !topic) {
  console.error('Usage: npx tsx scripts/radio-generate-special.ts "<slug>" "<topic + facts>"');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), "data", "radio", "segments", "special");
const OUT_FILE = path.join(OUT_DIR, `${slug}.json`);

async function main() {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You write special-topic segments for "Radio Tenerify", an English-language internet radio station for tourists, expats and locals on Tenerife. Unlike the quick news bulletin, a special segment is a proper mini-discussion — Alex and Mia actually dig into the topic: background, why it matters to people living on/visiting the island, different angles, maybe a light disagreement or back-and-forth, and a closing take. Natural, warm, opinionated but fair — like two hosts who actually care about the island. Use ONLY the facts given below — never invent statistics, dates or figures that aren't provided. If asked about something the facts don't cover, have the hosts acknowledge the uncertainty rather than making it up. Aim for about 2-3 minutes of spoken audio (350-500 words total).`,
    messages: [
      {
        role: "user",
        content: `Topic and facts to use:\n\n${topic}\n\nWrite the segment.`,
      },
    ],
    tools: [
      {
        name: "segment",
        description: "The two-host special segment script",
        input_schema: {
          type: "object" as const,
          properties: {
            title: { type: "string", description: "Short episode title" },
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
          required: ["title", "lines"],
        },
      },
    ],
    tool_choice: { type: "tool" as const, name: "segment" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a segment");
  const result = toolUse.input as { title: string; lines: { speaker: "Alex" | "Mia"; text: string }[] };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = { slug, generatedAt: new Date().toISOString(), title: result.title, lines: result.lines };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Saved "${result.title}" to ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`Next: npx tsx scripts/radio-generate-voices.ts --special ${slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
