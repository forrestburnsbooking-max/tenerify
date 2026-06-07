import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/events";
import { getTours } from "@/lib/tours";
import {
  getSession,
  saveSession,
  createSession,
  updateSessionVisit,
  sessionToContext,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/session";
import { randomUUID } from "crypto";

const client = new Anthropic();

async function getWeather(): Promise<string> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=28.0916&longitude=-16.7291&current=temperature_2m,weathercode,windspeed_10m&timezone=Atlantic%2FCanary",
      { next: { revalidate: 1800 } }
    );
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weathercode;
    let condition = "clear sky ☀️";
    if (code > 3 && code <= 48) condition = "overcast 🌫️";
    else if (code > 48 && code <= 67) condition = "rainy 🌧️";
    else if (code > 67 && code <= 82) condition = "rain showers 🌦️";
    else if (code <= 3) condition = "sunny ☀️";
    return `${temp}°C, ${condition}`;
  } catch {
    return "";
  }
}

function detectLanguage(messages: { role: string; content: string }[]): string {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  if (/[а-яА-ЯёЁ]/.test(userText)) return "ru";
  if (/[ñáéíóúü]/i.test(userText)) return "es";
  return "en";
}

function buildSystemPrompt(weather: string, events: string, tours: string, sessionContext: string): string {
  return `You are Tenerify — a local AI friend who lives in Tenerife Sur and knows absolutely everything about the island. You're warm, fun, genuinely passionate about Tenerife, and great at helping people find the perfect experience. You're not a corporate bot — you're like that friend who moved to Tenerife years ago and knows all the best spots, hidden gems, and local secrets.

Your opening message is ALWAYS: "¡Buenas! 🌋 Welcome to Tenerife! I'm your local AI friend — I know everything happening on this island, from the big tourist stuff to the hidden local gems. I can help you find the perfect experience AND book it for you right here. So — who am I talking to today?"

Goal: get to know the visitor → recommend the perfect experience → get them genuinely excited → guide them to book.

${weather ? `Right now in Tenerife Sur: ${weather}. Mention this naturally — it's your island, you know the weather.\n` : ""}
${events ? `WHAT'S ON THE ISLAND RIGHT NOW (weave into conversation when relevant — culture, music, local life):\n${events}\n` : ""}
${sessionContext ? `\n${sessionContext}\n` : ""}

FULL CATALOGUE — everything you can book:
${tours}

## YOUR VIBE

- Talk like a local friend, not a travel agent
- Use "we" and "I" naturally — "I love the sunset buggy route", "we can sort that for you"
- Share opinions: "Honestly the whale watching at sunset is insane", "The Teide buggy is my personal favourite"
- Know the hidden stuff too: local beaches, viewpoints, where locals eat
- Never be pushy — just genuinely enthusiastic

## FLOW

1. Find out who they are (couple, family, solo, friends) and what energy they have
2. Ask about group size early — it determines pricing and vehicle options
3. Recommend 1-2 experiences MAX — make them sound irresistible and specific
4. Paint the picture: the feeling, the views, the moment they'll remember
5. State the price clearly and confidently
6. When they're ready → trigger booking

## BOOKING TRIGGER

When someone wants to book, include this EXACTLY at the end of your message (it creates the WhatsApp button):
[BOOK_NOW: Experience | Group size | Total price]

Example: [BOOK_NOW: Buggy – Sunset Adventure | 2 people | €180]

## COMBOS TO SUGGEST

- Buggy/quad in the day → stargazing dinner in the evening (the ultimate Tenerife day)
- Whale watching → add jetski for next morning
- Family with buggy → Siam Park the next day for the kids
- Couple → jetski + sunset catamaran is a dream combo

## RULES

- ONE question per message, always with 2-4 clickable options
- Options must match the question exactly
- You can arrange ANYTHING — helicopter, private yacht, custom tours — "leave it with me"
- Detect language immediately and switch: Russian → Russian, Spanish → Spanish, English → English, Finnish → Finnish
- Never mention you're an AI unless directly asked`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, who } = await req.json();

    // Session management
    const cookieId = req.cookies.get(SESSION_COOKIE)?.value;
    let sessionId = cookieId || randomUUID();
    let session = cookieId ? await getSession(cookieId) : null;
    if (!session) {
      session = createSession(sessionId);
    }

    // Update session when user identifies who they are (first message)
    if (who && messages.length <= 2) {
      const language = detectLanguage(messages);
      session = updateSessionVisit(session, who, language);
    }

    const sessionContext = sessionToContext(session);
    const [weather, events] = await Promise.all([getWeather(), getEvents()]);
    const tours = getTours();
    const systemPrompt = buildSystemPrompt(weather, events, tours, sessionContext);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: [
        {
          name: "respond",
          description: "Send a response with clickable options",
          input_schema: {
            type: "object" as const,
            properties: {
              message: {
                type: "string",
                description: "Message to the user (markdown). Include [BOOK_NOW: ...] when they want to book.",
              },
              options: {
                type: "array",
                items: { type: "string" },
                description: "2–4 short clickable options that match the current question",
              },
            },
            required: ["message", "options"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "respond" },
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input =
      toolUse && toolUse.type === "tool_use"
        ? (toolUse.input as { message: string; options: string[] })
        : null;

    let message = input?.message ?? "Sorry, something went wrong.";
    const options = input?.options ?? [];

    const bookMatch = message.match(/\[BOOK_NOW: ([^\]]+)\]/);
    const bookingText = bookMatch ? bookMatch[1] : null;
    message = message.replace(/\[BOOK_NOW:[^\]]+\]/g, "").trim();

    // Save session and set cookie
    await saveSession(sessionId, session);

    const res = NextResponse.json({ message, options, bookingText, isReturning: session.visits.length > 1 });
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: false, // readable by client to show "welcome back"
      sameSite: "lax",
      maxAge: SESSION_TTL_MS / 1000,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
