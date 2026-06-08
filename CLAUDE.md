# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run scrape-events  # run the event scraper (scripts/scrape-events.ts via tsx)
```

No test suite — verify changes manually in the browser.

## Required Environment Variables

```
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_BASE_URL        # e.g. https://tenerify.ai (used in Stripe redirect URLs)
KV_REST_API_URL             # Upstash Redis
KV_REST_API_TOKEN           # Upstash Redis
```

Without Redis vars, the app runs fine locally — sessions fall back to in-memory (`devStore` in `lib/session.ts`) and rate limiting is disabled (always allows).

## Architecture

**Tenerify.ai** is an AI booking concierge for Tenerife Sur experiences. Users pick who they are (family/couple/solo/friends), then chat with an AI that recommends tours and collects all booking info before handing off to Stripe or WhatsApp.

### Request flow

1. User selects `who` on the hero screen → goes to chat step
2. Frontend (`app/page.tsx`) sends `POST /api/chat` with `messages[]` + `who`
3. Chat route builds a system prompt from: live weather (open-meteo), `data/events.json`, full tour catalogue (`data/tours.json`), and session context
4. Claude is forced to always call the `respond` tool (`tool_choice: { type: "tool", name: "respond" }`) — it never returns free-form text
5. The `respond` tool output carries: `message`, `options`, optional flags (`needsDate`, `needsTime`, `needsLicense`, `availableTimeSlots`, `tourSlug`)
6. When Claude is ready to book it embeds `[BOOK_NOW: Tour Name | group | €price | date | time]` in the message — the route strips this out and returns it as `bookingText`
7. Frontend shows the appropriate UI widget based on flags (DatePicker / TimePicker / LicensePicker), booking buttons when `bookingText` is present
8. "Pay" button calls `POST /api/checkout` → creates a Stripe session → redirects to Stripe
9. After payment, Stripe redirects to `/booking/success?session_id=...` → fetches `/api/checkout/session` to display booking details

### Data

- `data/tours.json` — main catalogue. Each tour has: `slug`, `title`, `category`, `pricing[]`, `priceFrom`, `minAge?`, `duration?`, `timeSlots?`, `imageUrl?`, `videoUrl?`, `meetingPoint?`, `faq[]`
- `data/events.json` — current island events, injected into the system prompt. Updated via `npm run scrape-events`
- `lib/tours.ts` formats `tours.json` into a text block for the system prompt and exposes `getTourBySlug()`
- `lib/events.ts` formats `events.json` into a text block

### Session (server-side)

`lib/session.ts` — Redis via Upstash, key prefix `tenerify:session:`, 7-day TTL, cookie `tfy_sid`. Tracks: `who`, `language`, visit history, `likedTopics`. `sessionToContext()` injects a returning-visitor hint into the system prompt when there are 2+ visits.

### Rate limiting

`lib/ratelimit.ts` — Redis fixed-window. Chat: 20 req/min per IP. Checkout: 5 req/min per IP. Silently allows all requests when Redis is unavailable.

### lib/profile.ts

Older client-side localStorage profile — superseded by the server-side session. Not wired up in the current UI; can be ignored.

## Key behaviours to preserve

- Claude must always respond via the `respond` tool — never remove `tool_choice`
- Language is auto-detected from message content (Cyrillic → `ru`, Spanish chars → `es`) then falls back to `Accept-Language` header
- Tour media (image/video) is attached to the AI message only when `tourSlug` is set in the tool response
- Booking reference shown on the success page is the last 8 chars of the Stripe session ID uppercased
