import type { BookingRecord } from "./bookings";

// Booking confirmation email, sent once when a booking transitions to paid.
// Uses Brevo's transactional API. No-op if BREVO_API_KEY is unset or there's
// no customer email — never throws into the payment path.

const SENDER = { name: "Canarian Fun", email: "support@tenerify.ai" };
// Bookings & pickup are handled by the operator's office.
const OFFICE_WHATSAPP = "34624074633";

type Lang = "en" | "ru" | "es";

function pickLang(l: string | null | undefined): Lang {
  return l === "ru" || l === "es" ? l : "en";
}

function bookingRef(id: string): string {
  return id.slice(-8).toUpperCase();
}

type Copy = {
  subject: (tour: string) => string;
  thanks: string;
  confirmed: (tour: string, date: string, group: string) => string;
  refLabel: string;
  dateLabel: string;
  groupLabel: string;
  paidLabel: string;
  meetingFixed: (mp: string) => string;
  meetingPickup: string;
  finalConfirm: string;
  descriptor: string;
  depositNote: (balance: string) => string;
  waPrompt: string;
  waButton: string;
  waText: (ref: string, tour: string) => string;
  footer: string;
};

const COPY: Record<Lang, Copy> = {
  en: {
    subject: (t) => `Booking confirmed — ${t} ✅`,
    thanks: "Thank you for your booking! 🎉",
    confirmed: (t, d, g) =>
      `Your <strong>${t}</strong>${d ? ` on <strong>${d}</strong>` : ""}${g ? `, ${g}` : ""} is confirmed.`,
    refLabel: "Booking reference",
    dateLabel: "Date",
    groupLabel: "Group",
    paidLabel: "Paid",
    meetingFixed: (mp) => `📍 <strong>Meeting point:</strong> ${mp} — please arrive 15–30 minutes early.`,
    meetingPickup:
      "🚐 We'll arrange your pickup point and time based on where you're staying — and confirm it with you before your tour.",
    finalConfirm: "We'll contact you on WhatsApp to confirm the final details before your tour.",
    descriptor: 'This charge appears on your card statement as <strong>CANARIAN FUN</strong>.',
    depositNote: (b) => `This is a deposit — the remaining ${b} is paid on arrival.`,
    waPrompt: "Need to reach us about your booking?",
    waButton: "💬 Message us on WhatsApp",
    waText: (ref, t) => `Hi! Booking ref ${ref} — ${t}. I have a question about my booking.`,
    footer: "Canarian Fun · Tenerife, Spain",
  },
  ru: {
    subject: (t) => `Бронирование подтверждено — ${t} ✅`,
    thanks: "Большое спасибо за бронирование! 🎉",
    confirmed: (t, d, g) =>
      `Ваш <strong>${t}</strong>${d ? ` на <strong>${d}</strong>` : ""}${g ? `, ${g}` : ""} — подтверждён.`,
    refLabel: "Номер брони",
    dateLabel: "Дата",
    groupLabel: "Группа",
    paidLabel: "Оплачено",
    meetingFixed: (mp) => `📍 <strong>Место встречи:</strong> ${mp} — подойдите за 15–30 минут.`,
    meetingPickup:
      "🚐 Мы согласуем точку и время посадки с учётом того, где вы остановились, и подтвердим их до тура.",
    finalConfirm: "Мы свяжемся с вами в WhatsApp для окончательного подтверждения деталей перед туром.",
    descriptor: 'В выписке по карте платёж отображается как <strong>CANARIAN FUN</strong>.',
    depositNote: (b) => `Это предоплата — остаток ${b} оплачивается на месте.`,
    waPrompt: "Хотите связаться с нами по поводу брони?",
    waButton: "💬 Написать в WhatsApp",
    waText: (ref, t) => `Здравствуйте! Бронь ${ref} — ${t}. У меня вопрос по бронированию.`,
    footer: "Canarian Fun · Тенерифе, Испания",
  },
  es: {
    subject: (t) => `Reserva confirmada — ${t} ✅`,
    thanks: "¡Muchas gracias por tu reserva! 🎉",
    confirmed: (t, d, g) =>
      `Tu <strong>${t}</strong>${d ? ` el <strong>${d}</strong>` : ""}${g ? `, ${g}` : ""} está confirmada.`,
    refLabel: "Referencia de reserva",
    dateLabel: "Fecha",
    groupLabel: "Grupo",
    paidLabel: "Pagado",
    meetingFixed: (mp) => `📍 <strong>Punto de encuentro:</strong> ${mp} — llega 15–30 minutos antes.`,
    meetingPickup:
      "🚐 Organizaremos tu punto y hora de recogida según dónde te alojes, y te lo confirmaremos antes de la excursión.",
    finalConfirm: "Te contactaremos por WhatsApp para confirmar los últimos detalles antes de tu excursión.",
    descriptor: 'Este cargo aparece en tu extracto bancario como <strong>CANARIAN FUN</strong>.',
    depositNote: (b) => `Esto es un depósito — el resto ${b} se paga al llegar.`,
    waPrompt: "¿Necesitas contactarnos sobre tu reserva?",
    waButton: "💬 Escríbenos por WhatsApp",
    waText: (ref, t) => `¡Hola! Reserva ${ref} — ${t}. Tengo una pregunta sobre mi reserva.`,
    footer: "Canarian Fun · Tenerife, España",
  },
};

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 0;color:#78716c;font-size:14px">${label}</td><td style="padding:4px 0;text-align:right;font-weight:600;font-size:14px">${value}</td></tr>`;
}

function buildHtml(b: BookingRecord): { subject: string; html: string } {
  const c = COPY[pickLang(b.language)];
  const ref = bookingRef(b.id);
  const isPickup = (b.meetingPoint || "").toLowerCase().includes("hotel pickup");
  const meeting = b.meetingPoint ? (isPickup ? c.meetingPickup : c.meetingFixed(b.meetingPoint)) : "";
  const balance = b.depositPercent ? `€${Math.max(0, b.priceEur - b.chargedEur).toFixed(0)}` : "";
  const waHref = `https://wa.me/${OFFICE_WHATSAPP}?text=${encodeURIComponent(c.waText(ref, b.tourName))}`;
  const dateCell = [b.bookingDate, b.bookingTime].filter(Boolean).join(" · ");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px">${c.thanks}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${c.confirmed(b.tourName, b.bookingDate, b.groupSize)}</p>

      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;margin:0 0 20px">
        ${row(c.refLabel, `<span style="font-family:monospace">${ref}</span>`)}
        ${dateCell ? row(c.dateLabel, dateCell) : ""}
        ${b.groupSize ? row(c.groupLabel, b.groupSize) : ""}
        ${row(c.paidLabel, `€${b.chargedEur.toFixed(0)}`)}
      </table>

      ${meeting ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">${meeting}</p>` : ""}
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5">${c.finalConfirm}</p>

      <p style="margin:0 0 8px;font-size:14px;color:#78716c">${c.waPrompt}</p>
      <a href="${waHref}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px">${c.waButton}</a>

      <p style="margin:20px 0 0;font-size:12px;color:#a8a29e">${c.descriptor}${balance ? ` ${c.depositNote(balance)}` : ""}</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#a8a29e;margin:16px 0 0">${c.footer}</p>
  </div></body></html>`;

  return { subject: c.subject(b.tourName), html };
}

export async function sendBookingConfirmation(b: BookingRecord): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key || !b.customerEmail) return;
  const { subject, html } = buildHtml(b);
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: b.customerEmail, name: b.customerName || undefined }],
        subject,
        htmlContent: html,
      }),
    });
  } catch {
    // Never let email failure affect the payment flow
  }
}
