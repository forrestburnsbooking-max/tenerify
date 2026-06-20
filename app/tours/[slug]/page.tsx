import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllTours,
  getTourBySlug,
  tourImages,
  formatPriceFrom,
  SUBCATEGORY_LABEL,
} from "@/lib/tours";
import TourGallery from "@/components/TourGallery";
import FaqAccordion from "@/components/FaqAccordion";

const BASE_URL = "https://tenerify.ai";
const FALLBACK_IMAGE = "/chat-bg.jpg"; // used when a tour has no photo yet, so Product/OG always have an image

// Absolute image URLs for schema/OG; falls back to a generic image if the tour has none
function tourSchemaImages(tour: { imageUrl?: string; images?: string[] }): string[] {
  const imgs = tourImages(tour as Parameters<typeof tourImages>[0]);
  const list = imgs.length ? imgs : [FALLBACK_IMAGE];
  return list.map((u) => (u.startsWith("http") ? u : `${BASE_URL}${u}`));
}

// Build a clean, single-line meta description (~155 chars, cut on a word boundary)
function metaFromDescription(desc?: string): string {
  if (!desc) return "";
  const clean = desc.replace(/・/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= 155) return clean;
  const cut = clean.slice(0, 155);
  return cut.slice(0, cut.lastIndexOf(" ")).trimEnd() + "…";
}

export function generateStaticParams() {
  return getAllTours().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = getTourBySlug(slug);
  if (!tour) return { title: "Tour not found — Tenerify.ai" };

  const title = `${tour.title} — book online | Tenerify.ai`;
  const description = metaFromDescription(tour.description)
    || `Book ${tour.title} in Tenerife Sur. ${formatPriceFrom(tour)}.`;
  const ogImage = tourSchemaImages(tour)[0];

  return {
    title,
    description,
    alternates: { canonical: `/tours/${slug}` },
    openGraph: {
      title,
      description,
      url: `/tours/${slug}`,
      siteName: "Tenerify.ai",
      images: [{ url: ogImage, alt: tour.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tour = getTourBySlug(slug);
  if (!tour) notFound();

  const images = tourImages(tour);
  const categoryLabel = SUBCATEGORY_LABEL[tour.category] ?? tour.category.toUpperCase();
  const bookHref = `/?book=${encodeURIComponent(tour.title)}`;
  const cleanDesc = tour.description?.replace(/・/g, "\n\n").trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.title,
    description: tour.description?.replace(/・/g, " ") ?? tour.title,
    image: tourSchemaImages(tour),
    brand: { "@type": "Brand", name: "Tenerify.ai" },
    category: categoryLabel,
    offers: {
      "@type": "Offer",
      price: tour.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/tours/${slug}`,
    },
  };

  const faqLd = tour.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: tour.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Tours", item: `${BASE_URL}/tours` },
      { "@type": "ListItem", position: 3, name: tour.title, item: `${BASE_URL}/tours/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-5">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/tours" className="hover:text-white transition-colors">Tours</Link>
          <span>/</span>
          <span className="text-stone-400 truncate">{tour.title}</span>
        </nav>

        <span className="inline-block text-[11px] font-semibold tracking-wide text-orange-400 mb-2">
          {categoryLabel}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">{tour.title}</h1>

        {tour.rating && tour.rating >= 4.0 && (
          <div className="flex items-center gap-1.5 text-sm mb-4">
            <span className="text-amber-400">★</span>
            <span className="font-semibold text-white">{tour.rating.toFixed(1)}</span>
            {tour.reviewCount ? (
              <span className="text-stone-400">· {tour.reviewCount.toLocaleString("en-US")} reviews</span>
            ) : null}
            <span className="text-stone-500">on {tour.reviewSource ?? "Google"}{tour.reviewedName ? ` · ${tour.reviewedName}` : ""}</span>
          </div>
        )}

        <TourGallery images={images} title={tour.title} />

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mt-5">
          <span className="px-3 py-1.5 rounded-full bg-orange-500/15 text-orange-400 text-sm font-semibold">
            {formatPriceFrom(tour)}
          </span>
          {tour.duration && (
            <span className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">⏱ {tour.duration}</span>
          )}
          {tour.minAge != null && (
            <span className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">👤 Min age {tour.minAge}</span>
          )}
          {tour.capacity != null && (
            <span className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">👥 Up to {tour.capacity}</span>
          )}
          {tour.meetingPoint && (
            <span className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">📍 {tour.meetingPoint}</span>
          )}
        </div>

        {/* Description */}
        {cleanDesc && (
          <div className="mt-6 space-y-3 text-stone-300 text-sm leading-relaxed">
            {cleanDesc.split("\n\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>
        )}

        {/* Pricing table */}
        {tour.pricing?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Prices</h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
              {tour.pricing.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-stone-300 text-sm">{p.label}</span>
                  <span className="font-semibold text-white">€{p.price}</span>
                </div>
              ))}
            </div>
            {tour.depositPercent && (
              <p className="text-stone-500 text-xs mt-2">
                💳 Pay a {tour.depositPercent}% deposit online, the rest on arrival.
              </p>
            )}
          </div>
        )}

        {/* Included / Not included */}
        {(tour.included || tour.notIncluded) && (
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {tour.included && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-green-400">✓ Included</h3>
                <p className="text-stone-400 text-sm leading-relaxed whitespace-pre-line">
                  {tour.included.replace(/・/g, "\n")}
                </p>
              </div>
            )}
            {tour.notIncluded && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-stone-500">✕ Not included</h3>
                <p className="text-stone-400 text-sm leading-relaxed whitespace-pre-line">
                  {tour.notIncluded.replace(/・/g, "\n")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Languages */}
        {tour.languages?.length ? (
          <p className="mt-6 text-stone-500 text-sm">
            🗣 Available in: {tour.languages.join(", ")}
          </p>
        ) : null}

        {/* FAQ */}
        {tour.faq?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Frequently asked questions</h2>
            <FaqAccordion items={tour.faq} />
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-white/5">
          <Link href="/tours" className="text-stone-500 hover:text-white text-sm transition-colors">
            ← All experiences
          </Link>
        </div>
      </div>

      {/* Sticky book bar */}
      <div className="sticky bottom-0 border-t border-white/10 bg-[#0d0d0d]/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="leading-tight">
            <div className="text-xs text-stone-500">from</div>
            <div className="font-bold text-lg">€{tour.priceFrom}</div>
          </div>
          <Link
            href={bookHref}
            className="flex-1 max-w-xs text-center bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all"
          >
            Book this experience
          </Link>
        </div>
      </div>
    </div>
  );
}
