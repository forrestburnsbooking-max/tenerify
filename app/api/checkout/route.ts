import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getTourBySlug } from "@/lib/tours";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import fs from "fs";
import path from "path";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

function parseBookingText(bookingText: string) {
  // Format: "Tour Name | 2 people | €180 | 15 June 2026 | 10:00 | Full Name | Phone | Email | Hotel/Address"
  // Time is "-" when the tour has no fixed time slot.
  const parts = bookingText.split("|").map((s) => s.trim());
  const tourName = parts[0] ?? "Tenerife Experience";
  const groupSize = parts[1] ?? "";
  const priceStr = parts[2] ?? "€0";
  const bookingDate = parts[3] ?? "";
  const bookingTime = parts[4] && parts[4] !== "-" ? parts[4] : "";
  const customerName = parts[5] ?? "";
  const customerPhone = parts[6] ?? "";
  const customerEmail = parts[7] ?? "";
  const customerHotel = parts[8] ?? "";
  const priceEur = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
  return { tourName, groupSize, priceEur, bookingDate, bookingTime, customerName, customerPhone, customerEmail, customerHotel };
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

    const { tourName, groupSize, priceEur, bookingDate, bookingTime, customerName, customerPhone, customerEmail, customerHotel } = parseBookingText(bookingText);
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Look up meeting point from tour data
    const slug = clientTourSlug ?? findTourSlugByName(tourName);
    const tour = slug ? getTourBySlug(slug) : null;
    const meetingPoint = tour?.meetingPoint ?? "";

    // Some tours (e.g. car rentals) only take a deposit online, balance paid on pickup
    const depositPercent = tour?.depositPercent;
    const chargeEur = depositPercent ? Math.round(priceEur * depositPercent) / 100 : priceEur;
    const depositNote = depositPercent
      ? `Deposit (${depositPercent}% of €${priceEur}) — remaining ${100 - depositPercent}% paid on pickup`
      : "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: tourName,
              description: [
                groupSize,
                bookingDate,
                bookingTime ? `Time: ${bookingTime}` : "",
                meetingPoint ? `Pickup: ${meetingPoint}` : "",
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
      phone_number_collection: { enabled: true },
      metadata: {
        bookingText,
        tourName,
        groupSize,
        bookingDate,
        bookingTime,
        meetingPoint,
        tourSlug: slug ?? "",
        depositPercent: depositPercent ? String(depositPercent) : "",
        totalPriceEur: String(priceEur),
        customerNameChat: customerName,
        customerPhoneChat: customerPhone,
        customerHotel,
      },
      payment_intent_data: {
        description: [
          `Tenerify: ${tourName}`,
          groupSize,
          bookingDate,
          bookingTime ? `at ${bookingTime}` : "",
          meetingPoint ? `📍 ${meetingPoint}` : "",
          depositNote,
        ].filter(Boolean).join(" · "),
        metadata: {
          tourName,
          groupSize,
          bookingDate,
          bookingTime,
          customerName,
          customerPhone,
          customerEmail,
          customerHotel,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
