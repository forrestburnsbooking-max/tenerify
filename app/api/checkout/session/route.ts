import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { markBookingPaid } from "@/lib/bookings";
import { getTourBySlug } from "@/lib/tours";
import { getPrepInstructions } from "@/lib/prep";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(id);
    const meta = session.metadata ?? {};
    const getCustomField = (key: string) =>
      session.custom_fields?.find((f) => f.key === key)?.text?.value ?? null;

    const customerName = getCustomField("full_name") ?? session.customer_details?.name ?? null;
    const customerEmail = session.customer_details?.email ?? null;
    const customerPhone = getCustomField("whatsapp") ?? session.customer_details?.phone ?? null;
    const customerHotel = getCustomField("hotel");

    // Confirm the booking in our own store once Stripe says it's paid. Idempotent.
    if (session.payment_status === "paid") {
      await markBookingPaid(session.id, { customerName, customerEmail, customerPhone, customerHotel });
    }

    const tour = meta.tourSlug ? getTourBySlug(meta.tourSlug) : null;

    return NextResponse.json({
      bookingText: meta.bookingText ?? null,
      tourName: meta.tourName ?? null,
      groupSize: meta.groupSize ?? null,
      bookingDate: meta.bookingDate ?? null,
      bookingTime: meta.bookingTime ?? null,
      meetingPoint: meta.meetingPoint ?? null,
      tourSlug: meta.tourSlug ?? null,
      prep: tour ? getPrepInstructions(tour) : null,
      customerEmail,
      customerName,
      customerPhone,
      customerHotel,
      amountTotal: session.amount_total ?? null,
      depositPercent: meta.depositPercent ?? null,
      totalPriceEur: meta.totalPriceEur ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
