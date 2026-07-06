import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurants, getRestaurantBySlug } from "@/lib/restaurants";

const BASE_URL = "https://tenerify.ai";
const FALLBACK_IMAGE = "/chat-bg.jpg";

export function generateStaticParams() {
  return getRestaurants().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurantBySlug(slug);
  if (!restaurant) return { title: "Restaurant not found — Tenerify.ai" };

  const title = `${restaurant.name} — ${restaurant.area} | Tenerify.ai`;
  const description =
    restaurant.description?.slice(0, 155) ||
    `${restaurant.cuisine} restaurant in ${restaurant.area}, Tenerife Sur.`;
  const ogImage = restaurant.imageUrl
    ? restaurant.imageUrl.startsWith("http")
      ? restaurant.imageUrl
      : `${BASE_URL}${restaurant.imageUrl}`
    : `${BASE_URL}${FALLBACK_IMAGE}`;

  return {
    title,
    description,
    alternates: { canonical: `/restaurants/${slug}` },
    openGraph: {
      title,
      description,
      url: `/restaurants/${slug}`,
      siteName: "Tenerify.ai",
      images: [{ url: ogImage, alt: restaurant.name }],
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

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description,
    image: restaurant.imageUrl
      ? restaurant.imageUrl.startsWith("http")
        ? restaurant.imageUrl
        : `${BASE_URL}${restaurant.imageUrl}`
      : undefined,
    servesCuisine: restaurant.cuisine,
    priceRange: restaurant.priceRange,
    address: restaurant.area,
    url: `${BASE_URL}/restaurants/${slug}`,
    ...(restaurant.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: restaurant.rating,
            reviewCount: restaurant.reviewCount ?? 1,
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Restaurants", item: `${BASE_URL}/restaurants` },
      { "@type": "ListItem", position: 3, name: restaurant.name, item: `${BASE_URL}/restaurants/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-5">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/restaurants" className="hover:text-white transition-colors">Restaurants</Link>
          <span>/</span>
          <span className="text-stone-400 truncate">{restaurant.name}</span>
        </nav>

        <span className="inline-block text-[11px] font-semibold tracking-wide text-orange-400 mb-2">
          {restaurant.cuisine} · {restaurant.area}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">{restaurant.name}</h1>

        {restaurant.rating && (
          <div className="flex items-center gap-1.5 text-sm mb-4">
            <span className="text-amber-400">★</span>
            <span className="font-semibold text-white">{restaurant.rating.toFixed(1)}</span>
            {restaurant.reviewCount ? (
              <span className="text-stone-400">· {restaurant.reviewCount.toLocaleString("en-US")} reviews</span>
            ) : null}
            <span className="text-stone-500">on {restaurant.reviewSource ?? "Google"}</span>
          </div>
        )}

        <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-stone-900 border border-white/10">
          {restaurant.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-stone-700">🍽️</div>
          )}
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mt-5">
          <span className="px-3 py-1.5 rounded-full bg-orange-500/15 text-orange-400 text-sm font-semibold">
            {restaurant.priceRange}
          </span>
          {restaurant.bookingAdvised && (
            <span className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">📞 Booking advised</span>
          )}
          {restaurant.goodFor?.map((g) => (
            <span key={g} className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm capitalize">{g}</span>
          ))}
          {restaurant.meetingPoint && (
            <span className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">📍 {restaurant.meetingPoint}</span>
          )}
        </div>

        {/* Description */}
        {restaurant.description && (
          <div className="mt-6 space-y-3 text-stone-300 text-sm leading-relaxed">
            <p>{restaurant.description}</p>
          </div>
        )}

        {/* Must try */}
        {restaurant.mustTry?.length ? (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Must try</h2>
            <ul className="flex flex-wrap gap-2">
              {restaurant.mustTry.map((dish) => (
                <li key={dish} className="px-3 py-1.5 rounded-full bg-white/8 text-stone-300 text-sm">{dish}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          {restaurant.mapsUrl && (
            <a
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-sm font-semibold transition-colors"
            >
              🗺️ Open in Maps
            </a>
          )}
          {restaurant.menuUrl && (
            <a
              href={restaurant.menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-sm font-semibold transition-colors"
            >
              📋 Photos & menu
            </a>
          )}
        </div>

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-white/5">
          <Link href="/restaurants" className="text-stone-500 hover:text-white text-sm transition-colors">
            ← All restaurants
          </Link>
        </div>
      </div>
    </div>
  );
}
