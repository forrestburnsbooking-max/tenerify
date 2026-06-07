"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const WHATSAPP_NUMBER = "34610434957";

type BookingInfo = {
  tourName: string;
  groupSize: string;
  bookingDate: string;
  amountTotal: number;
};

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [booking, setBooking] = useState<BookingInfo | null>(null);
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
        });
      })
      .catch(() => {});
  }, [sessionId]);

  const waMessage = `Hi! I just paid for${booking ? `: ${booking.tourName}` : " a Tenerife experience"}. My booking reference: ${ref}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0d0d] text-white items-center justify-center px-6">
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
              </p>
            )}
            <p className="text-stone-600 text-xs font-mono">Ref: {ref}</p>
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

          {/* Secondary — WhatsApp */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-4 rounded-2xl transition-all w-full"
          >
            <span>📲</span> Contact us on WhatsApp
          </a>

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
