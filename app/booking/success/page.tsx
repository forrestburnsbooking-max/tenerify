"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const WHATSAPP_NUMBER = "34610434957";

type BookingInfo = {
  tourName: string;
  groupSize: string;
  priceEur: number;
};

function parseBookingText(text: string): BookingInfo {
  const parts = text.split("|").map((s) => s.trim());
  const priceEur = parseFloat((parts[2] ?? "0").replace(/[^0-9.]/g, "")) || 0;
  return {
    tourName: parts[0] ?? "Your experience",
    groupSize: parts[1] ?? "",
    priceEur,
  };
}

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/checkout/session?id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookingText) setBooking(parseBookingText(data.bookingText));
      })
      .catch(() => {});
  }, [sessionId]);

  const waMessage = booking
    ? `Hi! I just paid for: ${booking.tourName}${booking.groupSize ? ` (${booking.groupSize})` : ""}. My booking reference: ${sessionId?.slice(-8).toUpperCase()}`
    : `Hi! I just booked via Tenerify.ai. Reference: ${sessionId?.slice(-8).toUpperCase()}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0d0d] text-white items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="text-6xl">✅</div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Payment confirmed!</h1>
          <p className="text-stone-400 text-sm leading-relaxed">
            Your booking is secured. We&apos;ll be in touch with details shortly.
          </p>
        </div>

        {booking && (
          <div className="bg-stone-900 border border-white/5 rounded-2xl px-5 py-4 text-left space-y-2">
            <p className="font-semibold text-white">{booking.tourName}</p>
            {booking.groupSize && (
              <p className="text-stone-400 text-sm">{booking.groupSize}</p>
            )}
            {booking.priceEur > 0 && (
              <p className="text-orange-400 font-semibold text-lg">
                €{booking.priceEur.toFixed(0)} paid
              </p>
            )}
            {sessionId && (
              <p className="text-stone-600 text-xs">
                Ref: {sessionId.slice(-8).toUpperCase()}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-4 rounded-2xl transition-all w-full"
          >
            <span>📲</span> Send booking details on WhatsApp
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
