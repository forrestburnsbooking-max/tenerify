"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import QRCode from "qrcode";
import type { PrepInstructions } from "@/lib/prep";
import { COMPANY } from "@/lib/company";
import { useTwemoji } from "@/lib/useTwemoji";

type TicketData = {
  tourName: string;
  groupSize: string;
  bookingDate: string;
  bookingTime: string;
  meetingPoint: string;
  customerName: string;
  customerEmail: string;
  amountTotal: number;
  prep: PrepInstructions | null;
  sessionId: string;
  ref: string;
};

function TicketContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const rootRef = useTwemoji<HTMLDivElement>();

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }

    fetch(`/api/checkout/session?id=${sessionId}`)
      .then((r) => r.json())
      .then(async (data) => {
        const ref = sessionId.slice(-8).toUpperCase();
        const ticketData: TicketData = {
          tourName: data.tourName ?? "Tenerife Experience",
          groupSize: data.groupSize ?? "",
          bookingDate: data.bookingDate ?? "",
          bookingTime: data.bookingTime ?? "",
          meetingPoint: data.meetingPoint ?? "",
          customerName: data.customerName ?? "",
          customerEmail: data.customerEmail ?? "",
          amountTotal: data.amountTotal ?? 0,
          prep: data.prep ?? null,
          sessionId,
          ref,
        };
        setTicket(ticketData);

        // Generate QR code pointing to verification URL
        const verifyUrl = `${window.location.origin}/booking/verify?ref=${ref}&id=${sessionId}`;
        const qr = await QRCode.toDataURL(verifyUrl, { width: 160, margin: 1, color: { dark: "#000", light: "#fff" } });
        setQrDataUrl(qr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Loading ticket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500">Ticket not found.</p>
      </div>
    );
  }

  const priceFormatted = ticket.amountTotal
    ? `€${(ticket.amountTotal / 100).toFixed(0)}`
    : "";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .ticket { box-shadow: none !important; }
        }
      `}</style>

      {/* Print / Download button */}
      <div className="no-print flex justify-center pt-6 pb-2">
        <button
          onClick={() => window.print()}
          className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-all"
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* Ticket */}
      <div ref={rootRef} className="flex justify-center px-4 pb-10 pt-4 bg-gray-100 min-h-screen">
        <div
          className="ticket bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-sm"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {/* Header */}
          <div className="bg-[#0d0d0d] px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-white font-bold text-xl">
                Tenerify<span className="text-orange-400">.ai</span>
              </div>
              <div className="text-stone-400 text-xs mt-0.5">Your Tenerife Experience</div>
            </div>
            <div className="text-4xl">🌋</div>
          </div>

          {/* Tour info */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{ticket.tourName}</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              {ticket.bookingDate && (
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span className="font-medium text-gray-900">
                    {ticket.bookingDate}{ticket.bookingTime ? ` · ${ticket.bookingTime}` : ""}
                  </span>
                </div>
              )}
              {ticket.groupSize && (
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>{ticket.groupSize}</span>
                </div>
              )}
              {ticket.meetingPoint && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">📍</span>
                  <span>{ticket.meetingPoint}</span>
                </div>
              )}
              {priceFormatted && (
                <div className="flex items-center gap-2">
                  <span>💰</span>
                  <span className="font-semibold text-orange-500 text-base">{priceFormatted} paid</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer */}
          {(ticket.customerName || ticket.customerEmail) && (
            <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-600">
              {ticket.customerName && (
                <div className="font-semibold text-gray-900">{ticket.customerName}</div>
              )}
              {ticket.customerEmail && (
                <div className="text-gray-400 text-xs mt-0.5">{ticket.customerEmail}</div>
              )}
            </div>
          )}

          {/* What to bring / how to dress */}
          {ticket.prep && (
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                🎒 Before you go
              </h3>
              {ticket.prep.bring.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">What to bring</div>
                  <ul className="space-y-1">
                    {ticket.prep.bring.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ticket.prep.dress && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">👕 How to dress</div>
                  <p className="text-sm text-gray-700">{ticket.prep.dress}</p>
                </div>
              )}
              {ticket.prep.notes && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-sm text-gray-700">
                  ⚠️ {ticket.prep.notes}
                </div>
              )}
            </div>
          )}

          {/* QR + ref */}
          <div className="px-6 py-5 flex items-center gap-4">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR code" className="w-24 h-24 rounded-lg border border-gray-100" />
            )}
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Booking ref</div>
              <div className="font-mono font-bold text-gray-900 text-xl">{ticket.ref}</div>
              <div className="text-xs text-gray-400 mt-1">Scan QR to verify</div>
            </div>
          </div>

          {/* Operator legal details — required on a tourist-operator ticket */}
          <div className="bg-gray-50 px-6 py-4 text-center text-[10px] leading-relaxed text-gray-400 space-y-0.5">
            <div className="font-semibold text-gray-500">
              {COMPANY.tradeName} — operated by {COMPANY.legalName}
            </div>
            <div>NIF {COMPANY.nif} · {COMPANY.address}</div>
            <div>{COMPANY.bookingEmail} · WhatsApp {COMPANY.bookingPhone} · tenerify.ai</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    }>
      <TicketContent />
    </Suspense>
  );
}
