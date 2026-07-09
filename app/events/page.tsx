import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingEvents, getEventArea, EVENT_AREAS } from "@/lib/events";
import EventsList, { type EventItem } from "@/components/EventsList";

// Data comes from data/events.json, refreshed by the scraper at deploy time —
// render per-request so the past-event guard uses the real current date.
export const dynamic = "force-dynamic";

const title = "What's on in Tenerife — fiestas, concerts & festivals | Tenerify.ai";
const description =
  "Upcoming events in Tenerife by area — Tenerife South, La Laguna, Santa Cruz, Puerto de la Cruz and La Orotava: local fiestas, romerías, concerts and festivals.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/events" },
  openGraph: {
    title,
    description,
    url: "/events",
    siteName: "Tenerify.ai",
    type: "website",
  },
};

export default function EventsPage() {
  const events: EventItem[] = getUpcomingEvents().map((e) => ({
    title: e.title,
    date: e.date,
    endDate: e.endDate,
    location: e.location,
    area: getEventArea(e.location),
    description: e.description,
    url: e.url,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: e.title,
        startDate: e.date,
        ...(e.endDate ? { endDate: e.endDate } : {}),
        location: { "@type": "Place", name: e.location, address: "Tenerife, Spain" },
        ...(e.url ? { url: e.url } : {}),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-5">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-stone-400">Events</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">What&apos;s on in Tenerife</h1>
        <p className="text-stone-400 text-sm mb-8 max-w-xl">
          Fiestas, concerts and festivals over the coming weeks, from the island&apos;s official calendars.
          Planning around one of these?{" "}
          <Link href="/" className="text-orange-400 hover:underline">Ask our AI guide</Link>{" "}
          how to fit it into your trip.
        </p>

        <EventsList events={events} areas={[...EVENT_AREAS]} />

        <div className="mt-10 pt-6 border-t border-white/5">
          <Link href="/" className="text-stone-500 hover:text-white text-sm transition-colors">
            ← Back to Tenerify.ai
          </Link>
        </div>
      </div>
    </div>
  );
}
