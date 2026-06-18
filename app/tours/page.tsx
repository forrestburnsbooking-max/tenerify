import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllTours,
  tourImages,
  formatPriceFrom,
  GROUP_ORDER,
  GROUP_LABEL,
  GROUP_EMOJI,
  GROUP_SUBCATEGORIES,
  SUBCATEGORY_LABEL,
  SUBCATEGORY_EMOJI,
  type Tour,
} from "@/lib/tours";

const title = "All Tenerife experiences & tours — book online | Tenerify.ai";
const description =
  "Browse and book the best tours, boat trips, jet skis, buggy rides, theme parks, shows and excursions in Tenerife Sur. Locally curated, AI-powered, secure online booking.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tours" },
  openGraph: {
    title,
    description,
    url: "/tours",
    siteName: "Tenerify.ai",
    type: "website",
  },
};

function TourCard({ tour }: { tour: Tour }) {
  const img = tourImages(tour)[0];
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 hover:border-orange-500/50 transition-all"
    >
      <div className="aspect-[16/10] bg-stone-900 overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={tour.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-stone-700">🌴</div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{tour.title}</h3>
        {tour.rating && tour.rating >= 4.0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-400">★</span>
            <span className="font-semibold text-white">{tour.rating.toFixed(1)}</span>
            {tour.reviewCount ? (
              <span className="text-stone-500">({tour.reviewCount.toLocaleString("en-US")})</span>
            ) : null}
          </div>
        )}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <span className="text-orange-400 font-semibold text-sm">{formatPriceFrom(tour)}</span>
          {tour.duration && (
            <span className="text-stone-200 text-[11px] bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
              ⏱ {tour.duration}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ToursIndexPage() {
  const tours = getAllTours();

  const bySub = new Map<string, Tour[]>();
  for (const t of tours) {
    if (!bySub.has(t.category)) bySub.set(t.category, []);
    bySub.get(t.category)!.push(t);
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-5">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-stone-400">Tours</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">Tenerife experiences</h1>
        <p className="text-stone-400 text-sm mb-8 max-w-xl">
          {tours.length} hand-picked tours, boat trips, theme parks and adventures in Tenerife Sur.
          Pick one, or{" "}
          <Link href="/" className="text-orange-400 hover:underline">chat with our AI guide</Link>{" "}
          to get a personal recommendation.
        </p>

        {GROUP_ORDER.map((group) => {
          const subs = GROUP_SUBCATEGORIES[group].filter((s) => bySub.has(s));
          if (!subs.length) return null;
          return (
            <section key={group} className="mb-12">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>{GROUP_EMOJI[group]}</span> {GROUP_LABEL[group]}
              </h2>
              {subs.map((sub) => (
                <div key={sub} className="mb-8">
                  <h3 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
                    <span>{SUBCATEGORY_EMOJI[sub]}</span> {SUBCATEGORY_LABEL[sub]}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {bySub.get(sub)!.map((t) => (
                      <TourCard key={t.slug} tour={t} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}

        <div className="mt-4 pt-6 border-t border-white/5">
          <Link href="/" className="text-stone-500 hover:text-white text-sm transition-colors">
            ← Back to Tenerify.ai
          </Link>
        </div>
      </div>
    </div>
  );
}
