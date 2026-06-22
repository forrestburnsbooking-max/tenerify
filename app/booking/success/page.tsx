"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { PrepInstructions } from "@/lib/prep";
import { useTwemoji } from "@/lib/useTwemoji";

const WHATSAPP_NUMBER = "34610434957";

type BookingInfo = {
  tourName: string;
  groupSize: string;
  bookingDate: string;
  amountTotal: number;
  customerPhone: string;
  customerName: string;
  depositPercent: string;
  totalPriceEur: string;
  prep: PrepInstructions | null;
};

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const rootRef = useTwemoji<HTMLDivElement>();
  const ref = sessionId.slice(-8).toUpperCase();

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/checkout/session?id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setBooking({
          tourName: data.tourName ?? "Your experience",
          groupSize: data.groupSize ?? "",
          bookingDate: data.bookingDate ?? "",
          amountTotal: data.amountTotal ?? 0,
          customerPhone: data.customerPhone ?? "",
          customerName: data.customerName ?? "",
          depositPercent: data.depositPercent ?? "",
          totalPriceEur: data.totalPriceEur ?? "",
          prep: data.prep ?? null,
        });
      })
      .catch(() => {});
  }, [sessionId]);

  const waMessage = `Hi! I just paid for${booking ? `: ${booking.tourName}` : " a Tenerife experience"}. My booking reference: ${ref}`;

  return (
    <div ref={rootRef} className="flex flex-col min-h-screen bg-[#0d0d0d] text-white items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="text-6xl">✅</div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Payment confirmed!</h1>
          <p className="text-stone-400 text-sm leading-relaxed">
            Your spot is secured. Download your ticket below.
          </p>
        </div>

        {booking && (
          <div className="bg-stone-900 border border-white/5 rounded-2xl px-5 py-4 text-left space-y-2">
            <p className="font-semibold text-white">{booking.tourName}</p>
            {booking.bookingDate && (
              <p className="text-stone-400 text-sm">📅 {booking.bookingDate}</p>
            )}
            {booking.groupSize && (
              <p className="text-stone-400 text-sm">👥 {booking.groupSize}</p>
            )}
            {booking.amountTotal > 0 && (
              <p className="text-orange-400 font-semibold text-lg">
                €{(booking.amountTotal / 100).toFixed(0)} paid
                {booking.depositPercent && ` (${booking.depositPercent}% deposit)`}
              </p>
            )}
            {booking.depositPercent && booking.totalPriceEur && (
              <p className="text-stone-400 text-sm">
                💶 €{(parseFloat(booking.totalPriceEur) - booking.amountTotal / 100).toFixed(0)} due on pickup
              </p>
            )}
            <p className="text-stone-600 text-xs font-mono">Ref: {ref}</p>
            <p className="text-stone-600 text-xs mt-2">This charge appears as “CANARIAN FUN” on your card statement.</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Primary — ticket */}
          <a
            href={`/booking/ticket?session_id=${sessionId}`}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-4 rounded-2xl transition-all w-full"
          >
            🎫 Get Your Ticket
          </a>

          {/* Customer → operator WhatsApp */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-4 rounded-2xl transition-all w-full"
          >
            <span>📲</span> Questions? Chat with us
          </a>

          {/* Operator → customer WhatsApp (only shows if phone known) */}
          {booking?.customerPhone && (
            <a
              href={`https://wa.me/${booking.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Hi${booking.customerName ? ` ${booking.customerName}` : ""}! This is Tenerify.ai. Just confirming your booking: ${booking.tourName}${booking.bookingDate ? ` on ${booking.bookingDate}` : ""}. Ref: ${ref}. Any questions — we're here! 🌋`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-green-700 text-green-400 hover:bg-green-900/30 font-medium px-6 py-3 rounded-2xl transition-all w-full text-sm"
            >
              📩 Send confirmation to client
            </a>
          )}

          <a
            href="/"
            className="flex items-center justify-center text-stone-500 hover:text-white text-sm transition-colors py-2"
          >
            ← Back to Tenerify.ai
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-[#0d0d0d] items-center justify-center">
        <div className="text-stone-500 text-sm">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
