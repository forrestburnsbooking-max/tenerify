import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { markBookingPaid } from "@/lib/bookings";

// Server-side source of truth for payment confirmation. Unlike the success
// page, this fires even if the customer closes the tab after paying — so our
// booking journal never misses a paid booking. Configure the endpoint in the
// Canarian Fun Stripe dashboard and put its signing secret in STRIPE_WEBHOOK_SECRET.

export const dynamic = "force-dynamic";

function getCustomField(session: Stripe.Checkout.Session, key: string): string | null {
  return session.custom_fields?.find((f) => f.key === key)?.text?.value ?? null;
}

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = new Stripe(key);
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await markBookingPaid(session.id, {
        customerName: getCustomField(session, "full_name") ?? session.customer_details?.name ?? null,
        customerEmail: session.customer_details?.email ?? null,
        customerPhone: session.customer_details?.phone ?? null,
        customerHotel: getCustomField(session, "hotel"),
      });
    }
  }

  return NextResponse.json({ received: true });
}
