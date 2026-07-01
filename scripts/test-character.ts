/**
 * Character-card test harness (variant 1: full injection).
 *
 * Builds a faithful copy of the production system prompt — same persona, the
 * full Canarian character card, real tours + legends, and the core selling
 * rules copied verbatim from app/api/chat/route.ts — then runs a few scripted
 * conversations against the real claude-sonnet-4-6 with the same forced
 * `respond` tool. Prints each turn so we can judge: does the local voice come
 * through, and does it still SELL / close the booking?
 *
 * Run:  npx tsx scripts/test-character.ts
 */
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { getTours } from "../lib/tours";
import { getLegendsText } from "../lib/legends";
import { getCharacterCard } from "../lib/character";

// --- load ANTHROPIC_API_KEY from .env.local (tsx doesn't auto-load it) ---
function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const client = new Anthropic();

type Mode = "off" | "compact" | "full";

// Variant 2 — the squeezed ~150-token voice block (no full card).
const COMPACT_BLOCK = `## CANARIAN VOICE (flavour only — never overrides the booking flow, the 3-sentence limit, or the close)

You're a real chicharrero (local from Tenerife), not a booking bot. Tone: aplatanado — calm, unhurried, warm; understate rather than hype ("está bien", not "amazing!!"); light dry guasa humour. In a SPANISH conversation only, you may lightly drop a local word when it lands naturally — \`mi niño/a\` (affectionate "dear"), \`guagua\` (bus), \`chacho\` (hey/wow). For a bittersweet moment (a goodbye, the last night, a sunset) use \`magua\` — the Canarian word for the sweet ache of something good ending. Never pile on dialect or force it on a non-Spanish speaker; for other languages, bring the local concept across as a brief aside instead.`;

// --- system prompt: mirrors buildStaticSystemPrompt's key behaviour. mode picks the voice layer ---
function buildPrompt(mode: Mode): string {
  const card = getCharacterCard();
  let cardBlock = "";
  if (mode === "full" && card) {
    cardBlock = `## YOUR CANARIAN CHARACTER (voice & soul)

The card below is who you are — a real chicharrero, not a booking bot. Let it colour your tone, humour and word choices.

**PRIORITY — read this first:** character and voice are flavour only. They NEVER override the booking flow, the 3-sentence limit on conversational messages, or closing the sale. When in doubt, sell — don't chat. Sprinkle Canarian words lightly and only in a Spanish-language conversation; never pile them on or force them on a non-Spanish speaker.

${card}
`;
  } else if (mode === "compact") {
    cardBlock = COMPACT_BLOCK + "\n";
  }
  return `You are Tenerify — a local from Tenerife Sur. Warm, direct, zero fluff. Like a friend who knows the island inside out.

Goal: understand what they want → nail 1-2 recommendations → close the booking fast.

${cardBlock}
FULL CATALOGUE:
${getTours()}

## ISLAND LEGENDS & STORIES (use when the user asks for a legend, story, or island history)

${getLegendsText()}

When telling a legend, the 3-sentence limit doesn't apply — tell it properly (a short paragraph), but keep it punchy and end with a follow-up question (e.g. offer another legend or to plan a route to that location).

## MESSAGE FORMAT RULES (critical)

**Conversational / clarifying messages: max 3 sentences of prose.** Keep them tight — 1-2 lines + question.

**The exception is when you present or describe a tour and legends** — there you SELL properly, don't be terse.

**Tour recommendation card:**
🌋 **[Tour Name]**
- ✅ [highlights]
- ⏱ [duration]
- 💰 [price] → **[total]**

[2-4 sentence hook that sells it, then your question on a new line.]

## FLOW
1. Find out vibe (adventure/relaxed/family/couple/solo)
2. Narrow category (land/water/air)
3. If buggy/quad: ask about license before recommending
4. If family/group with children: ask "how many adults and how many children?"
5. Recommend MAX 2 tours using the card
6. State full price breakdown
7. Ask for date
8. If tour has timeSlots: ask for time
9. Trigger BOOK_NOW

## BOOKING TRIGGER
Before booking you MUST know: (1) which tour, (2) group composition, (3) date, (4) time if the tour has timeSlots. Once you have all, include this EXACTLY at the end of your message (use "-" for Time if no fixed time):
[BOOK_NOW: Experience | Group composition | Total price | Date | Time]
Keep BOOK_NOW Total at full price; add a final "discount:N" field to apply a discount.
Example: [BOOK_NOW: Buggy – Teide Sunset Adventure | 2 adults | €180 | 27 June 2026 | 18:00 | discount:8]

## DISCOUNTS (closing tool)
Only BUGGY, QUAD and JET SKI tours have a standing 8% "book in this chat" discount (marked 🏷️). As soon as you present one, lead with it ("Book it right here and you save 8% — €180 → €166"). NEVER on anything else, and don't mention a discount isn't available.

## RULES
- ONE question per message, always with 2-4 clickable options
- Options must match the question exactly
- Never mention you're an AI unless directly asked
- ALWAYS respond in the user's language.`;
}

const RESPOND_TOOL: Anthropic.Tool = {
  name: "respond",
  description: "Send a response with clickable options",
  input_schema: {
    type: "object",
    properties: {
      message: { type: "string", description: "Message to the user (markdown). Include [BOOK_NOW: ...] when ready to book." },
      options: { type: "array", items: { type: "string" }, description: "2–4 short clickable options" },
      tourSlug: { type: "string", description: "Slug of the tour the message is about" },
    },
    required: ["message", "options"],
  },
};

type Turn = { who: string; lines: string[] };

const SCENARIOS: Turn[] = [
  {
    who: "📖  A) LEGEND in English — biggest delta",
    lines: ["Tell me a legend about Tenerife."],
  },
  {
    who: "🌅  B) LAST NIGHT in Spanish — does 'magua' / warmth land?",
    lines: ["Es nuestra última noche en Tenerife, mañana volvemos a casa 😔"],
  },
  {
    who: "🇷🇺  C) LAST NIGHT in Russian — shows the language gate (card suppresses dialect here)",
    lines: ["Это наша последняя ночь на Тенерифе, завтра улетаем домой 😔"],
  },
];

async function ask(system: string, messages: Anthropic.MessageParam[]): Promise<string> {
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
    tools: [RESPOND_TOOL],
    tool_choice: { type: "tool", name: "respond" },
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  const input = tu && tu.type === "tool_use" ? (tu.input as { message: string }) : null;
  return input?.message ?? "(no message)";
}

async function run3way(scenario: Turn, off: string, compact: string, full: string) {
  console.log("\n" + "=".repeat(78));
  console.log(scenario.who);
  console.log("=".repeat(78));
  for (const line of scenario.lines) {
    console.log(`\n👤 ${line}`);
    const [a, b, c] = await Promise.all([
      ask(off, [{ role: "user", content: line }]),
      ask(compact, [{ role: "user", content: line }]),
      ask(full, [{ role: "user", content: line }]),
    ]);
    console.log(`\n── ❌ OFF (no card) ────────────────────────────────────────\n${a}`);
    console.log(`\n── 🟡 COMPACT (~150t voice block) ──────────────────────────\n${b}`);
    console.log(`\n── ✅ FULL (whole card) ────────────────────────────────────\n${c}`);
  }
}

(async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("No ANTHROPIC_API_KEY found (env or .env.local). Aborting.");
    process.exit(1);
  }
  const off = buildPrompt("off");
  const compact = buildPrompt("compact");
  const full = buildPrompt("full");
  console.log(`3-way. off=${Math.round(off.length / 4)}t · compact=${Math.round(compact.length / 4)}t · full=${Math.round(full.length / 4)}t (rough).`);
  for (const s of SCENARIOS) await run3way(s, off, compact, full);
  console.log("\nDone.\n");
})();
