import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getTourBySlug } from "@/lib/tours";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { logBookingCreated } from "@/lib/bookings";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import fs from "fs";
import path from "path";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

function parseBookingText(bookingText: string) {
  // Format: "Tour Name | 2 people | €180 | 15 June 2026 | 10:00 | discount:5"
  // Time is "-" when the tour has no fixed time slot. discount:N is optional.
  const raw = bookingText.split("|").map((s) => s.trim());
  // Pull out the optional discount field wherever it sits
  let discountPercent = 0;
  const parts: string[] = [];
  for (const p of raw) {
    const m = p.match(/discount\s*:\s*(\d+)/i);
    if (m) discountPercent = parseInt(m[1], 10) || 0;
    else parts.push(p);
  }
  const tourName = parts[0] ?? "Tenerife Experience";
  const groupSize = parts[1] ?? "";
  const priceStr = parts[2] ?? "€0";
  const bookingDate = parts[3] ?? "";
  const bookingTime = parts[4] && parts[4] !== "-" ? parts[4] : "";
  const priceEur = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
  return { tourName, groupSize, priceEur, bookingDate, bookingTime, discountPercent };
}

function findTourSlugByName(tourName: string): string | null {
  try {
    const toursFile = path.join(process.cwd(), "data", "tours.json");
    const tours = JSON.parse(fs.readFileSync(toursFile, "utf-8"));
    const normalized = tourName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const found = tours.find((t: { slug: string; title: string }) => {
      const titleNorm = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      return titleNorm.includes(normalized) || normalized.includes(titleNorm.slice(0, 10));
    });
    return found?.slug ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = await checkRateLimit(`checkout:${ip}`, 5, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { bookingText, tourSlug: clientTourSlug } = await req.json();
    if (!bookingText) {
      return NextResponse.json({ error: "Missing bookingText" }, { status: 400 });
    }

    const { tourName, groupSize, priceEur, bookingDate, bookingTime, discountPercent } = parseBookingText(bookingText);
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Look up meeting point from tour data
    const slug = clientTourSlug ?? findTourSlugByName(tourName);
    const tour = slug ? getTourBySlug(slug) : null;
    const meetingPoint = tour?.meetingPoint ?? "";

    // Stripe needs a publicly reachable absolute image URL; tour.imageUrl is
    // stored as a site-relative path, so prefix it with the base URL.
    const productImage = tour?.imageUrl
      ? (tour.imageUrl.startsWith("http") ? tour.imageUrl : `${baseUrl}${tour.imageUrl}`)
      : null;

    // Discount guardrails: only buggy/quad and jet ski tours, cap 9%,
    // and only when we could verify the tour. Fail closed if the tour is unknown.
    const discountable = !!tour && (tour.category === "buggy-quad" || tour.category === "jetski");
    const effectiveDiscount = discountable ? Math.min(Math.max(discountPercent, 0), 9) : 0;
    const discountedPrice = Math.round(priceEur * (1 - effectiveDiscount / 100) * 100) / 100;
    const discountNote = effectiveDiscount > 0 ? `${effectiveDiscount}% discount applied (was €${priceEur})` : "";

    // Some tours (e.g. car rentals) only take a deposit online, balance paid on pickup
    const depositPercent = tour?.depositPercent;
    const chargeEur = depositPercent ? Math.round(discountedPrice * depositPercent) / 100 : discountedPrice;
    const depositNote = depositPercent
      ? `Deposit (${depositPercent}% of €${discountedPrice}) — remaining ${100 - depositPercent}% paid on pickup`
      : "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: tourName,
              images: productImage ? [productImage] : undefined,
              description: [
                groupSize,
                bookingDate,
                bookingTime ? `Time: ${bookingTime}` : "",
                meetingPoint ? `Pickup: ${meetingPoint}` : "",
                discountNote,
                depositNote,
              ].filter(Boolean).join(" · ") || "Tenerife experience via Tenerify.ai",
            },
            unit_amount: Math.round(chargeEur * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      customer_creation: "always",
      custom_text: {
        submit: {
          message:
            "We'll message you on WhatsApp to confirm your pickup point and time — please double-check your WhatsApp number is correct (with country code).",
        },
      },
      custom_fields: [
        {
          key: "full_name",
          label: { type: "custom", custom: "Full name" },
          type: "text",
        },
        {
          key: "whatsapp",
          label: { type: "custom", custom: "WhatsApp number (with country code, e.g. +34...)" },
          type: "text",
          text: { minimum_length: 6, maximum_length: 20 },
        },
        {
          key: "hotel",
          label: { type: "custom", custom: "Hotel name & room (or address)" },
          type: "text",
        },
      ],
      metadata: {
        // Tags this session as ours. The Stripe account is shared with Canarian
        // Fun's villa rentals, and our webhook fires for every payment on the
        // account — this lets it ignore everything that isn't a Tenerify booking.
        source: "tenerify",
        bookingText,
        tourName,
        groupSize,
        bookingDate,
        bookingTime,
        meetingPoint,
        tourSlug: slug ?? "",
        depositPercent: depositPercent ? String(depositPercent) : "",
        totalPriceEur: String(discountedPrice),
        originalPriceEur: String(priceEur),
        discountPercent: effectiveDiscount ? String(effectiveDiscount) : "",
      },
      payment_intent_data: {
        description: [
          `Tenerify: ${tourName}`,
          groupSize,
          bookingDate,
          bookingTime ? `at ${bookingTime}` : "",
          meetingPoint ? `📍 ${meetingPoint}` : "",
          discountNote,
          depositNote,
        ].filter(Boolean).join(" · "),
        metadata: {
          source: "tenerify",
          tourName,
          groupSize,
          bookingDate,
          bookingTime,
        },
      },
    });

    // Record the booking in our own store — independent of whose Stripe this is.
    // Best-effort: never blocks or fails checkout.
    const sid = req.cookies.get(SESSION_COOKIE)?.value;
    const userSession = sid ? await getSession(sid) : null;
    await logBookingCreated({
      id: session.id,
      tourName,
      tourSlug: slug ?? "",
      groupSize,
      priceEur,
      chargedEur: chargeEur,
      discountPercent: effectiveDiscount,
      depositPercent: depositPercent ?? null,
      bookingDate,
      bookingTime,
      meetingPoint,
      who: userSession?.who ?? null,
      language: userSession?.language ?? null,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
