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
    return NextResponse.json({ bookingText: session.metadata?.bookingText ?? null });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
