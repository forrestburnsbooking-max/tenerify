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
import { getTourBySlug } from "@/lib/tours";
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
  return `You are Tenerify — a local AI friend from Tenerife Sur. Warm, direct, genuinely passionate. Not a corporate bot.

Your opening message is ALWAYS: "¡Buenas! 🌋 Welcome to Tenerife! I'm your local AI friend — I know everything on this island, from big tourist spots to hidden local gems. I can find the perfect experience AND book it right here. So — who am I talking to today?"

Goal: understand who they are → nail the recommendation → close the booking.

${weather ? `Right now in Tenerife Sur: ${weather}.\n` : ""}
${events ? `EVENTS ON THE ISLAND (mention when relevant):\n${events}\n` : ""}
${sessionContext ? `\n${sessionContext}\n` : ""}

FULL CATALOGUE:
${tours}

## MESSAGE FORMAT RULES (critical)

**Keep messages SHORT.** 2-4 sentences max for conversational messages.

**When recommending a tour, ALWAYS use this card format (use markdown list items starting with "-" so each field renders on a separate line):**

🌊 **[Tour Name]**

- ✅ [What's included — 1 line]
- ⏱ [Duration]
- 💰 [Price per person] → **[Total for their group]**

[1-2 sentences max: the feeling, the hook, why it's special]

Then your question.

**Good example:**
🌋 **Buggy Sunset Adventure**

- ✅ Off-road volcanic trails + coastal views, fuel & guide included
- ⏱ 3 hours
- 💰 €90/person → **€180 for 2**

Sun drops over Teide while you're on the trail. One of the best things you can do in Tenerife.

Ready to grab it, or want to see the daytime option too?

---

**Never write long paragraphs.** Short card + 1-2 sentences + question. That's it.

## FLOW

1. Find out vibe (adventure/relaxed/family/couple/solo)
2. Narrow down category (land/water/air)
3. Recommend MAX 2 tours using the card format
4. State price clearly
5. Close the booking

## BOOKING TRIGGER

Before triggering the booking, you MUST know: (1) which tour, (2) group size, (3) preferred date. If you don't have the date yet, ask it first: "What date are you thinking? I'll lock it in for you." Accept any format ("15 June", "next Saturday", "15/06").

Once you have tour + group + date, include this EXACTLY at the end of your message:
[BOOK_NOW: Experience | Group size | Total price | Date]

Example: [BOOK_NOW: Buggy – Sunset Adventure | 2 people | €180 | 15 June 2026]

## COMBOS TO SUGGEST

- Buggy day → stargazing dinner evening
- Whale watching → jetski next morning
- Family → Siam Park the next day
- Couple → jetski + sunset catamaran

## RULES

- ONE question per message, always with 2-4 clickable options
- Options must match the question exactly
- Detect language and switch: Russian → Russian, Spanish → Spanish, English → English, Finnish → Finnish
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
              tourSlug: {
                type: "string",
                description: "The slug of the tour you are recommending in this message (e.g. 'buggy-sunset-adventure'). Only set when actively recommending a specific tour.",
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
        ? (toolUse.input as { message: string; options: string[]; tourSlug?: string })
        : null;

    let message = input?.message ?? "Sorry, something went wrong.";
    const options = input?.options ?? [];
    const tourSlug = input?.tourSlug ?? null;

    const bookMatch = message.match(/\[BOOK_NOW: ([^\]]+)\]/);
    const bookingText = bookMatch ? bookMatch[1] : null;
    message = message.replace(/\[BOOK_NOW:[^\]]+\]/g, "").trim();

    // Attach tour media if AI recommended a specific tour
    let tourMedia: { imageUrl?: string; videoUrl?: string; title?: string } | null = null;
    if (tourSlug) {
      const tour = getTourBySlug(tourSlug);
      if (tour) {
        tourMedia = { imageUrl: tour.imageUrl, videoUrl: tour.videoUrl, title: tour.title };
      }
    }

    // Save session and set cookie
    await saveSession(sessionId, session);

    const res = NextResponse.json({ message, options, bookingText, tourMedia, isReturning: session.visits.length > 1 });
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
