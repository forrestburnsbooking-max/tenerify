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
import ToursCatalog, { type CatalogGroup } from "@/components/ToursCatalog";

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

export default function ToursIndexPage() {
  const tours = getAllTours();

  const bySub = new Map<string, Tour[]>();
  for (const t of tours) {
    if (!bySub.has(t.category)) bySub.set(t.category, []);
    bySub.get(t.category)!.push(t);
  }

  const groups: CatalogGroup[] = GROUP_ORDER.map((g) => ({
    id: g,
    label: GROUP_LABEL[g],
    emoji: GROUP_EMOJI[g],
    subs: GROUP_SUBCATEGORIES[g]
      .filter((s) => bySub.has(s))
      .map((s) => ({
        id: s,
        label: SUBCATEGORY_LABEL[s],
        emoji: SUBCATEGORY_EMOJI[s],
        tours: bySub.get(s)!.map((t) => ({
          slug: t.slug,
          title: t.title,
          duration: t.duration,
          rating: t.rating,
          reviewCount: t.reviewCount,
          img: tourImages(t)[0],
          priceLabel: formatPriceFrom(t),
        })),
      })),
  })).filter((g) => g.subs.length > 0);

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

        <ToursCatalog groups={groups} />

        <div className="mt-4 pt-6 border-t border-white/5">
          <Link href="/" className="text-stone-500 hover:text-white text-sm transition-colors">
            ← Back to Tenerify.ai
          </Link>
        </div>
      </div>
    </div>
  );
}
