import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(id);
    const meta = session.metadata ?? {};
    return NextResponse.json({
      bookingText: meta.bookingText ?? null,
      tourName: meta.tourName ?? null,
      groupSize: meta.groupSize ?? null,
      bookingDate: meta.bookingDate ?? null,
      bookingTime: meta.bookingTime ?? null,
      meetingPoint: meta.meetingPoint ?? null,
      tourSlug: meta.tourSlug ?? null,
      customerEmail: session.customer_details?.email ?? null,
      customerName: session.customer_details?.name ?? null,
      customerPhone: session.customer_details?.phone ?? null,
      amountTotal: session.amount_total ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
