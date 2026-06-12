import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/events";
import { getTours } from "@/lib/tours";
import { getRoutesText } from "@/lib/routes";
import { getLegendsText } from "@/lib/legends";
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

function getCurrentDateTime(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Atlantic/Canary",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Atlantic/Canary",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `${date}, ${time}`;
}

function detectLanguage(messages: { role: string; content: string }[], acceptLanguage?: string): string {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  if (/[а-яА-ЯёЁ]/.test(userText)) return "ru";
  if (/[ñáéíóúü]/i.test(userText)) return "es";

  // Fall back to browser language if no typed language detected
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0].split("-")[0].toLowerCase();
    if (["ru", "es", "fi", "de", "fr", "it", "nl", "pl"].includes(primary)) return primary;
  }
  return "en";
}

const LANGUAGE_NAMES: Record<string, string> = {
  ru: "Russian", es: "Spanish", fi: "Finnish", de: "German",
  fr: "French", it: "Italian", nl: "Dutch", pl: "Polish", en: "English",
};

function buildStaticSystemPrompt(tours: string, routes: string, legends: string): string {
  return `You are Tenerify — a local from Tenerife Sur. Warm, direct, zero fluff. Like a friend who knows the island inside out.

Goal: understand what they want → nail 1-2 recommendations → close the booking fast.

**FIRST MESSAGE** — the user has already seen your intro and capability list on screen before this conversation started. Do NOT repeat it or introduce yourself again, and do NOT ask another clarifying question about who they are or how long they're staying — that's already covered by their selections. Go straight into a warm, specific reaction based on who they are, where they're staying, and what they're interested in (all given in their first message), then dive directly into 1-2 tour recommendations from FLOW step 5 onward (asking about kids/license/group size first only if genuinely needed for pricing).

FULL CATALOGUE:
${tours}

## SELF-DRIVE ROUTES (use when the user wants to plan their own route or rent a car)

${routes}

When recommending a route, give the title, rough duration/distance, and 2-3 highlight stops — don't dump the entire entry verbatim.

## ISLAND LEGENDS & STORIES (use when the user asks for a legend, story, or island history)

${legends}

When telling a legend, the 3-sentence limit doesn't apply — tell it properly (a short paragraph), but keep it punchy and end with a follow-up question (e.g. offer another legend or to plan a route to that location).

## MESSAGE FORMAT RULES (critical)

**Every message: max 3 sentences of prose.** No exceptions. If you're about to write a paragraph — cut it in half.

**Conversational messages:** 1-2 lines + question. That's it.

**Tour recommendation — use this card (markdown list so each line renders separately):**

🌋 **[Tour Name]**
- ✅ [what's included — pull the most appealing highlights from the catalogue's Includes/description, ~12-15 words]
- ⏱ [duration]
- 💰 [price breakdown] → **[total]**

[ONE sentence hook drawing on the description — what makes this special. Then your question on a new line.]

**Example:**
🌋 **Buggy Sunset Adventure**
- ✅ Off-road trails + coastal views, fuel, helmet & guide all included
- ⏱ 3h
- 💰 €180 for 2

Golden-hour views over the Atlantic from the trail — best sunset on the island. Want to grab it?

---

**Rules:**
- Max 2 tour cards per message
- **Always set tourSlug to the tour your message is about** — not just when showing the card, but in every follow-up about that tour too (asking for date/time/license/group size, confirming details, BOOK_NOW). This keeps its photo/video attached throughout the booking flow, which helps sell it. If showing 2 cards, set it to the one you most recommend. Only omit it for messages that aren't about a specific tour (legends, general chat, multi-tour overviews).
- Use the catalogue's Includes and description fields — they're there to help you sell, don't ignore them
- Never describe what Tenerify can do — just do it
- No "Great choice!", "Perfect!", "Absolutely!" — cut all filler words
- Question always goes at the end, never in the middle

## LOCATION-AWARE RECOMMENDATIONS (important — don't send people the wrong way)

The user has told us where they're staying. For water/boat tours, departure port matters.

**Departs from Los Cristianos port:** Ragnarok Viking, Royal Delfin, Masca Express (actually Los Gigantes — far from everyone), Neptuno, Peter Pan, Arriro, Cool Sailing, Kosamui, Sonador, Submarine Safari, Freebird, Monte Cristo, White Paradise, most fishing boats.

**Departs from Puerto Colón (Costa Adeje):** Jet Ski, Parascending, Fly Fish, Banana boat, Booster Pack, Watersports Pack, Armani Yacht, Flipper Uno, Blue Ocean, Maxicat, Abrazo, Five Star, Champagne boat, Vulcano, Shogun, LEAH, Diamant (Opera 60), Lady Sunshine, Moonday, Atlanca.

**Location rules:**
- Guest in **Costa Adeje** → prefer Puerto Colón departures. Avoid Los Cristianos boats — it's 20-25 min taxi away.
- Guest in **Los Cristianos** → prefer Los Cristianos port departures. Avoid Puerto Colón boats.
- Guest in **Las Americas** → 5-10 min from both; can recommend either. Mention which port when relevant.
- **Buggies, quads, excursions, parks, shows** → hotel pickup or central — location doesn't affect recommendation.
- Always check the tour's meetingPoint in the catalogue to confirm departure location before recommending.

## VEHICLE CAPACITY RULES (critical — affects pricing and number of vehicles)

**All prices for 2-seater vehicles are per vehicle (not per person). Never multiply these prices by group size.**

- **Buggy**: ALL buggies are 2-seater. Price is per buggy for 2 people. A couple = 1 buggy = price as listed. Group of 4 = 2 buggies = price × 2.
- **Double Quad (quad-teide-tour)**: 2-seater quad. €100 = total for 2 people. A couple = 1 double quad = €100.
- **Double Jetski (jet-ski-puerto-colon)**: 2-seater. €100 = total for 2 people. A couple = 1 jetski = €100.
- **Standard quads** (all other quad tours): 1-seater. Price is per person — multiply by group size.
- **Combo packs (watersport-pack-puerto-colon, booster-pack-puerto-colon)**: Price is PER PERSON. A couple = 2 × price. Do NOT apply the 2-seater vehicle rule to these packs even though they include a jet ski.

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
7. Ask for date (needsDate: true)
8. **If tour has timeSlots:** ask for time (needsTime: true, availableTimeSlots: [...])
9. **Before booking, collect contact details:** ask for full name, phone number (with country code), email address, and hotel name or address (for pickup/delivery)
10. Trigger BOOK_NOW with all collected info

## TIME SLOTS

Many tours have fixed departure times. When recommending a tour that has timeSlots in the catalogue, follow this flow:

1. Ask for date first (needsDate: true)
2. Once date is confirmed → ask for time (needsTime: true, availableTimeSlots: [...from catalogue...])
3. Once time is confirmed → trigger BOOK_NOW

**When setting needsTime=true:** always populate availableTimeSlots with the exact times from the tour's timeSlots field in the catalogue.

**If the tour has no timeSlots** (parks, rentals, adventure activities): skip the time step — go straight to BOOK_NOW after date.

**For shows:** the time is fixed (only one slot), so just confirm it rather than asking: "The show starts at 21:00 — shall I book for [date]?"

## MINIMUM BOOKING LEAD TIME

A booking must be made at least 3 hours before the activity starts — there isn't enough time for the operator to confirm otherwise.

- When the user wants to book for **today**, only offer/accept time slots that are at least 3 hours from the current time shown above.
- If the user picks "today" but every remaining slot (or the activity itself, for tours without fixed times) is less than 3 hours away, tell them today is too tight to confirm and offer tomorrow instead.
- If the user explicitly asks for a time/date less than 3 hours away, politely explain the 3-hour rule and suggest the next valid option — do not trigger BOOK_NOW.

## BOOKING TRIGGER

Before triggering the booking, you MUST know: (1) which tour, (2) exact group composition (adults + children), (3) preferred date, (4) departure time if the tour has timeSlots, (5) full name, (6) phone number, (7) email address, (8) hotel name or address.

Once you have ALL of the above, include this EXACTLY at the end of your message, always with all 9 fields. If the tour has no fixed time, use "-" as a placeholder for the Time field:
[BOOK_NOW: Experience | Group composition | Total price | Date | Time | Full Name | Phone | Email | Hotel/Address]

Examples:
[BOOK_NOW: Maxicat Catamaran | 2 adults + 1 child | €115 | 15 June 2026 | 10:00 | John Smith | +44 7700 900123 | john@example.com | Hotel Bahia del Duque]
[BOOK_NOW: Buggy – Sunset Adventure | 2 adults | €360 | 15 June 2026 | 18:00 | John Smith | +44 7700 900123 | john@example.com | Hotel Bahia del Duque]
[BOOK_NOW: Jetski Ocean Safari | 2 people | €100 | 15 June 2026 | 11:00 | John Smith | +44 7700 900123 | john@example.com | Hotel Bahia del Duque]
[BOOK_NOW: Siam Park | 2 adults + 1 child | €59 | 15 June 2026 | - | John Smith | +44 7700 900123 | john@example.com | Hotel Bahia del Duque]

## CAR & VEHICLE RENTALS — DEPOSIT POLICY

For tours marked with "💳 X% deposit online, rest paid on pickup" (Aliscar car rentals), the price shown in the catalogue and in [BOOK_NOW: ...] is the FULL rental price — the customer only pays that deposit percentage online via Stripe, and the remaining balance in cash/card on pickup. Before triggering BOOK_NOW for one of these, clearly tell the customer something like: "You'll pay €X (X%) now to secure the booking, and the remaining €Y in person when you pick up the car." Use the [BOOK_NOW: ...] total price as the FULL price as usual — the checkout system handles charging only the deposit.

## PAYMENT — CARD ONLY, NEVER SEND CUSTOMERS ELSEWHERE

All bookings are paid online by card via secure checkout (Stripe) — we do not accept or handle cash, and we do not work with walk-up/cash bookings.

**If a customer says they only have cash, don't have a card, or ask to pay in person/on arrival:** do NOT tell them to go book directly with the operator, at the port, or in person — that sends the booking (and the customer) away from us entirely. Instead, politely explain that booking and payment is online by card, and offer to help them find a cash machine/exchange nearby or proceed once they have a card. For tours with the deposit policy below, mention that only the deposit is paid online and the rest can be cash on pickup — that's the one case where cash is fine.

## COMBOS TO SUGGEST

- Buggy day → stargazing dinner evening
- Whale watching → jetski next morning
- Family → Siam Park the next day
- Couple → jetski + sunset catamaran

## RULES

- ONE question per message, always with 2-4 clickable options
- Options must match the question exactly
- Never mention you're an AI unless directly asked`;
}

function buildDynamicContext(weather: string, events: string, sessionContext: string, language: string): string {
  const langName = LANGUAGE_NAMES[language] ?? "English";
  return `Current date & time in Tenerife (Atlantic/Canary): ${getCurrentDateTime()}

${weather ? `Right now in Tenerife Sur: ${weather}.\n` : ""}
${events ? `EVENTS ON THE ISLAND (mention when relevant):\n${events}\n` : ""}
${sessionContext ? `\n${sessionContext}\n` : ""}
**ALWAYS respond in ${langName}.** The user explicitly chose this language. The first message may be in English (system context) — ignore that, respond in ${langName} regardless.`;
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

    const { messages, who, language: explicitLanguage } = await req.json();

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 40 ||
      messages.some(
        (m) => typeof m?.content !== "string" || m.content.length > 4000
      )
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Session management
    const cookieId = req.cookies.get(SESSION_COOKIE)?.value;
    let sessionId = cookieId || randomUUID();
    let session = cookieId ? await getSession(cookieId) : null;
    if (!session) {
      session = createSession(sessionId);
    }

    const acceptLanguage = req.headers.get("accept-language") ?? "";
    const language = explicitLanguage || detectLanguage(messages, acceptLanguage);

    // Update session when user identifies who they are (first message)
    if (who && messages.length <= 2) {
      session = updateSessionVisit(session, who, language);
    }

    const sessionContext = sessionToContext(session);
    const [weather, events] = await Promise.all([getWeather(), getEvents()]);
    const tours = getTours();
    const routes = getRoutesText();
    const legends = getLegendsText();
    const staticSystemPrompt = buildStaticSystemPrompt(tours, routes, legends);
    const dynamicContext = buildDynamicContext(weather, events, sessionContext, language);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        { type: "text", text: staticSystemPrompt, cache_control: { type: "ephemeral" } },
        { type: "text", text: dynamicContext },
      ],
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
                description: "The slug of the tour your message is about (e.g. 'buggy-sunset-adventure') — set this any time the message references a specific tour: showing its card, asking for date/time/license/group size for it, confirming details, or triggering BOOK_NOW. This attaches the tour's photo/video to your message, which helps sell it. Leave unset only for messages that aren't about a specific tour (legends, general chat, multi-tour overviews).",
              },
              needsDate: {
                type: "boolean",
                description: "Set to true when you are asking the user to pick a date for their booking. This shows a date picker in the UI.",
              },
              needsLicense: {
                type: "boolean",
                description: "Set to true when asking if the user has a driving license (for buggy/quad tours). Shows license type buttons in the UI.",
              },
              needsTime: {
                type: "boolean",
                description: "Set to true when asking the user to pick a departure time. Only set this AFTER needsDate has been answered. The UI will show the available time slots for their chosen tour.",
              },
              availableTimeSlots: {
                type: "array",
                items: { type: "string" },
                description: "List of available departure times (e.g. ['10:00', '13:00', '16:00']) for the tour. Set this together with needsTime=true. Get these from the tour's timeSlots in the catalogue.",
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
        ? (toolUse.input as { message: string; options: string[]; tourSlug?: string; needsDate?: boolean; needsLicense?: boolean; needsTime?: boolean; availableTimeSlots?: string[] })
        : null;

    let message = input?.message ?? "Sorry, something went wrong.";
    const options = input?.options ?? [];
    const tourSlug = input?.tourSlug ?? null;
    const needsDate = input?.needsDate ?? false;
    const needsLicense = input?.needsLicense ?? false;
    const needsTime = input?.needsTime ?? false;
    const availableTimeSlots = input?.availableTimeSlots ?? [];

    const bookMatch = message.match(/\[BOOK_NOW: ([^\]]+)\]/);
    const bookingText = bookMatch ? bookMatch[1] : null;
    message = message.replace(/\[BOOK_NOW:[^\]]+\]/g, "").trim();

    // Attach tour media if AI recommended a specific tour
    let tourMedia: { imageUrl?: string; images?: string[]; videoUrl?: string; title?: string } | null = null;
    if (tourSlug) {
      const tour = getTourBySlug(tourSlug);
      if (tour) {
        tourMedia = {
          imageUrl: tour.imageUrl,
          images: tour.images?.length ? tour.images : tour.imageUrl ? [tour.imageUrl] : undefined,
          videoUrl: tour.videoUrl,
          title: tour.title,
        };
      }
    }

    // Save session and set cookie
    await saveSession(sessionId, session);

    const res = NextResponse.json({ message, options, bookingText, tourMedia, needsDate, needsLicense, needsTime, availableTimeSlots, isReturning: session.visits.length > 1 });
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
