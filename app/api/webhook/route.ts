import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

async function sendWhatsApp(message: string): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!phone || !apiKey) return;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
  await fetch(url);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const tourName = session.metadata?.tourName ?? "Unknown tour";
    const groupSize = session.metadata?.groupSize ?? "";
    const bookingDate = session.metadata?.bookingDate ?? "";
    const meetingPoint = session.metadata?.meetingPoint ?? "";
    const amountTotal = session.amount_total ? `€${(session.amount_total / 100).toFixed(0)}` : "";
    const customerName = session.customer_details?.name ?? "";
    const customerEmail = session.customer_details?.email ?? "";
    const customerPhone = session.customer_details?.phone ?? "";
    const ref = session.id.slice(-8).toUpperCase();

    const lines = [
      "💳 New booking on Tenerify!",
      "",
      `🏷 ${tourName}`,
      bookingDate ? `📅 ${bookingDate}` : "",
      groupSize ? `👥 ${groupSize}` : "",
      amountTotal ? `💰 ${amountTotal} paid` : "",
      meetingPoint ? `📍 ${meetingPoint}` : "",
      "",
      customerName ? `👤 ${customerName}` : "",
      customerEmail ? `✉️ ${customerEmail}` : "",
      customerPhone ? `📞 ${customerPhone}` : "",
      "",
      `🔖 Ref: ${ref}`,
    ].filter(Boolean);

    await sendWhatsApp(lines.join("\n"));
  }

  return NextResponse.json({ received: true });
}
