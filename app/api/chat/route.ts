import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/events";
import { getTours } from "@/lib/tours";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
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

Goal: understand who they are → nail the recommendation → close the booking.

The user has just told you who they are (family/couple/solo/friends). Your FIRST message must always be this introduction — adapt the tone to who they are but keep this structure:

"Hey! I'm Tenerify — your local AI friend from Tenerife 🌋

Here's what I can do for you:

- 🗺️ I know everything happening on the island — events, hidden spots, local life, not just tourist stuff
- 🏄 I'll find you the best experiences: buggy rides, whale watching, boat trips, watersports, theme parks and more
- 💰 I always find the best deal — and you can book and pay right here in the chat
- 📅 I'll sort the date, the details, and send you a ticket instantly
- 🤙 And if anything changes — I'm right here on WhatsApp

So — [personalised question based on who they are, e.g. 'what's the vibe for you two?' for a couple, 'how old are the kids?' for a family]"

After this intro, follow the normal flow."

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

## VEHICLE CAPACITY RULES (critical — affects pricing and number of vehicles)

**All prices for 2-seater vehicles are per vehicle (not per person). Never multiply these prices by group size.**

- **Buggy**: ALL buggies are 2-seater. Price is per buggy for 2 people. A couple = 1 buggy = price as listed. Group of 4 = 2 buggies = price × 2.
- **Double Quad (quad-teide-tour)**: 2-seater quad. €100 = total for 2 people. A couple = 1 double quad = €100.
- **Double Jetski (jet-ski-puerto-colon)**: 2-seater. €100 = total for 2 people. A couple = 1 jetski = €100.
- **Standard quads** (all other quad tours): 1-seater. Price is per person — multiply by group size.

Always state number of vehicles and total clearly:
- Buggy Sunset (€180) for couple: "1 buggy for 2 → **€180 total**" ✅
- Standard quad (€120/person) for couple: "2 quads → **€240 total**" ✅
- Double quad for couple: "1 double quad for 2 → **€100 total**" ✅
- Double jetski for couple: "1 jetski for 2 → **€100 total**" ✅

## AGE & LICENSE RULES (mandatory — legal requirement)

**For ALL tours:** ask ages of participants if there's any chance of minors (family, group). Check min age from catalogue.

**For buggy and quad tours ONLY — ALWAYS ask before recommending:**
- Set needsLicense=true in your tool response when asking this question
- Buggy AND quad → both require **category B or A** driving license, min age **18**
- Any valid driving license (B or A) is sufficient for both buggy and quad
- If someone has no license → suggest boat, jetski, whale watching, Siam Park instead
- State the license requirement clearly in the tour card: add "🪪 Category B or A license required"

**Jetski does NOT require a driving license — never ask about license for jetski.**

**Never book a buggy/quad tour without confirming license.**

## ADULT / CHILD / KID PRICING (critical — never guess, always calculate)

Many tours have different prices for Adults, Children, and Kids. The catalogue shows all available price tiers per tour.

**ALWAYS ask group composition before quoting a total for:** boats, shows, excursions, parks, kayak, karting, parascending, horse riding, paragliding.

Ask: "How many adults and how many children?" (include age ranges if relevant to the tour's min age).

**Calculate total correctly:**
- 2 adults + 1 child on Maxicat (adult €46, child €23): 2×46 + 1×23 = **€115 total**
- Show it in the card: "💰 €46/adult · €23/child → **€115 for 2+1**"

**BOOK_NOW format for mixed groups:**
[BOOK_NOW: Tour Name | 2 adults + 1 child | €115 | 15 June 2026]

**For tours with no child price** (buggy, quad, jetski, car rental): just use adult price × number of people.

**Never invent a child price** if it's not in the catalogue. If unsure, ask the user to contact directly.

## FLOW

1. Find out vibe (adventure/relaxed/family/couple/solo)
2. Narrow down category (land/water/air)
3. **If buggy/quad:** ask about license before recommending (needsLicense: true)
4. **If family/group with children:** ask "how many adults and how many children?" before quoting price
5. Recommend MAX 2 tours using the card format
6. State full price breakdown (adult × N + child × N = total)
7. Ask for date (needsDate: true) → close the booking

## BOOKING TRIGGER

Before triggering the booking, you MUST know: (1) which tour, (2) exact group composition (adults + children), (3) preferred date.

Once you have all three, include this EXACTLY at the end of your message:
[BOOK_NOW: Experience | Group composition | Total price | Date]

Examples:
[BOOK_NOW: Maxicat Catamaran | 2 adults + 1 child | €115 | 15 June 2026]
[BOOK_NOW: Buggy – Sunset Adventure | 2 adults | €360 | 15 June 2026]
[BOOK_NOW: Jetski Ocean Safari | 2 people | €100 | 15 June 2026]

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
    const ip = getClientIp(req);
    const { allowed, remaining } = await checkRateLimit(`chat:${ip}`, 20, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } }
      );
    }

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
              needsDate: {
                type: "boolean",
                description: "Set to true when you are asking the user to pick a date for their booking. This shows a date picker in the UI.",
              },
              needsLicense: {
                type: "boolean",
                description: "Set to true when asking if the user has a driving license (for buggy/quad tours). Shows license type buttons in the UI.",
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
        ? (toolUse.input as { message: string; options: string[]; tourSlug?: string; needsDate?: boolean; needsLicense?: boolean })
        : null;

    let message = input?.message ?? "Sorry, something went wrong.";
    const options = input?.options ?? [];
    const tourSlug = input?.tourSlug ?? null;
    const needsDate = input?.needsDate ?? false;
    const needsLicense = input?.needsLicense ?? false;

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

    const res = NextResponse.json({ message, options, bookingText, tourMedia, needsDate, needsLicense, isReturning: session.visits.length > 1 });
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
