import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

function parseBookingText(bookingText: string) {
  // Format: "Tour Name | 2 people | €180"
  const parts = bookingText.split("|").map((s) => s.trim());
  const tourName = parts[0] ?? "Tenerife Experience";
  const groupSize = parts[1] ?? "";
  const priceStr = parts[2] ?? "€0";
  const priceEur = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
  return { tourName, groupSize, priceEur };
}

export async function POST(req: NextRequest) {
  try {
    const { bookingText } = await req.json();
    if (!bookingText) {
      return NextResponse.json({ error: "Missing bookingText" }, { status: 400 });
    }

    const { tourName, groupSize, priceEur } = parseBookingText(bookingText);
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: tourName,
              description: groupSize || "Tenerife experience via Tenerify.ai",
            },
            unit_amount: Math.round(priceEur * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: { bookingText },
      payment_intent_data: {
        description: `Tenerify booking: ${tourName} — ${groupSize}`,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
