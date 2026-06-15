import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getCommission } from "@/lib/net-prices";
import { getTourBySlug } from "@/lib/tours";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
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
    const tourSlug = session.metadata?.tourSlug ?? "";
    const groupSize = session.metadata?.groupSize ?? "";
    const bookingDate = session.metadata?.bookingDate ?? "";
    const bookingTime = session.metadata?.bookingTime ?? "";
    const meetingPoint = session.metadata?.meetingPoint ?? "";
    const pvpTotal = session.amount_total ? session.amount_total / 100 : 0;
    const amountTotal = pvpTotal > 0 ? `€${pvpTotal.toFixed(0)}` : "";
    const depositPercent = session.metadata?.depositPercent ?? "";
    const totalPriceEur = session.metadata?.totalPriceEur ?? "";
    const discountPercent = session.metadata?.discountPercent ?? "";
    const originalPriceEur = session.metadata?.originalPriceEur ?? "";
    const discountLine = discountPercent
      ? `🎟 ${discountPercent}% discount applied${originalPriceEur ? ` (was €${originalPriceEur})` : ""}`
      : "";
    const balanceDue = depositPercent && totalPriceEur
      ? `€${(parseFloat(totalPriceEur) - pvpTotal).toFixed(0)} due on pickup`
      : "";
    const getCustomField = (key: string) =>
      session.custom_fields?.find((f) => f.key === key)?.text?.value ?? "";
    const customerName = getCustomField("full_name") || session.customer_details?.name || "";
    const customerEmail = session.customer_details?.email ?? "";
    const customerPhone = session.customer_details?.phone ?? "";
    const customerHotel = getCustomField("hotel");
    const ref = session.id.slice(-8).toUpperCase();

    const commission = tourSlug ? getCommission(tourSlug, pvpTotal) : null;
    const commissionLine = commission
      ? `📈 Your commission: €${commission.commission.toFixed(0)} (${commission.percent}%)`
      : "";

    const supplierPhone = tourSlug ? getTourBySlug(tourSlug)?.bookingPhone : null;

    const lines = [
      "💳 New booking on Tenerify!",
      "",
      `🏷 ${tourName}`,
      bookingDate ? `📅 ${bookingDate}${bookingTime ? ` at ${bookingTime}` : ""}` : "",
      groupSize ? `👥 ${groupSize}` : "",
      amountTotal ? `💰 ${amountTotal} paid${depositPercent ? ` (${depositPercent}% deposit)` : ""}` : "",
      discountLine,
      balanceDue ? `💶 ${balanceDue}` : "",
      commissionLine,
      meetingPoint ? `📍 ${meetingPoint}` : "",
      "",
      customerName ? `👤 ${customerName}` : "",
      customerEmail ? `✉️ ${customerEmail}` : "",
      customerPhone ? `📞 Client: ${customerPhone}` : "",
      customerHotel ? `🏨 ${customerHotel}` : "",
      supplierPhone ? `📞 Call supplier to confirm: ${supplierPhone}` : "",
      "",
      `🔖 Ref: ${ref}`,
    ].filter(Boolean);

    await sendTelegram(lines.join("\n"));
  }

  return NextResponse.json({ received: true });
}
