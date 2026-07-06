import type { Metadata } from "next";
import Link from "next/link";
import {
  getRestaurants,
  getAreaGroup,
  AREA_GROUP_ORDER,
  type Restaurant,
} from "@/lib/restaurants";

const title = "Best restaurants in Tenerife Sur, by area | Tenerify.ai";
const description =
  "Hand-picked restaurants in Tenerife Sur — Los Cristianos, Las Americas, Costa Adeje, Los Gigantes and more — sorted by area so you can find something good near you.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/restaurants" },
  openGraph: {
    title,
    description,
    url: "/restaurants",
    siteName: "Tenerify.ai",
    type: "website",
  },
};

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 hover:border-orange-500/50 transition-all"
    >
      <div className="aspect-[16/10] bg-stone-900 overflow-hidden">
        {restaurant.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-stone-700">🍽️</div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{restaurant.name}</h3>
        <p className="text-stone-500 text-xs">{restaurant.cuisine} · {restaurant.area}</p>
        {restaurant.rating && restaurant.rating >= 4.0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-400">★</span>
            <span className="font-semibold text-white">{restaurant.rating.toFixed(1)}</span>
            {restaurant.reviewCount ? (
              <span className="text-stone-500">({restaurant.reviewCount.toLocaleString("en-US")})</span>
            ) : null}
          </div>
        )}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <span className="text-orange-400 font-semibold text-sm">{restaurant.priceRange}</span>
          {restaurant.bookingAdvised && (
            <span className="text-stone-200 text-[11px] bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
              📞 book ahead
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function RestaurantsIndexPage() {
  const restaurants = getRestaurants();

  const byArea = new Map<string, Restaurant[]>();
  for (const r of restaurants) {
    const group = getAreaGroup(r.area);
    if (!byArea.has(group)) byArea.set(group, []);
    byArea.get(group)!.push(r);
  }

  const orderedGroups = [
    ...AREA_GROUP_ORDER.filter((g) => byArea.has(g)),
    ...[...byArea.keys()].filter((g) => !(AREA_GROUP_ORDER as readonly string[]).includes(g)),
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-5">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-stone-400">Restaurants</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">Where to eat in Tenerife Sur</h1>
        <p className="text-stone-400 text-sm mb-8 max-w-xl">
          {restaurants.length} hand-picked restaurants, sorted by area so you can find something good near you.
          Or{" "}
          <Link href="/" className="text-orange-400 hover:underline">chat with our AI guide</Link>{" "}
          for a personal recommendation.
        </p>

        {orderedGroups.map((group) => (
          <section key={group} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{group}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {byArea.get(group)!.map((r) => (
                <RestaurantCard key={r.slug} restaurant={r} />
              ))}
            </div>
          </section>
        ))}

        <div className="mt-4 pt-6 border-t border-white/5">
          <Link href="/" className="text-stone-500 hover:text-white text-sm transition-colors">
            ← Back to Tenerify.ai
          </Link>
        </div>
      </div>
    </div>
  );
}
