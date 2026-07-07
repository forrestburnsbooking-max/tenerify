"use client";

import { useState } from "react";
import Link from "next/link";

// Fully serializable catalogue structure prepared by the server page —
// this component must not import lib/tours (it reads the filesystem).
export type CatalogTour = {
  slug: string;
  title: string;
  duration?: string;
  rating?: number;
  reviewCount?: number;
  img?: string;
  priceLabel: string;
};

export type CatalogSub = { id: string; label: string; emoji: string; tours: CatalogTour[] };
export type CatalogGroup = { id: string; label: string; emoji: string; subs: CatalogSub[] };

function TourCard({ tour }: { tour: CatalogTour }) {
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 hover:border-orange-500/50 transition-all"
    >
      <div className="aspect-[16/10] bg-stone-900 overflow-hidden">
        {tour.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tour.img}
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
          <span className="text-orange-400 font-semibold text-sm">{tour.priceLabel}</span>
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

const chipClass = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
    active
      ? "bg-orange-500/20 border-orange-500 text-orange-300"
      : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400"
  }`;

export default function ToursCatalog({ groups }: { groups: CatalogGroup[] }) {
  const [activeGroup, setActiveGroup] = useState<string>("all");

  const visible = groups.filter((g) => activeGroup === "all" || g.id === activeGroup);

  return (
    <>
      {/* Group filter chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setActiveGroup("all")} className={chipClass(activeGroup === "all")}>
          ✨ All
        </button>
        {groups.map((g) => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)} className={chipClass(activeGroup === g.id)}>
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {visible.map((group) => (
        <section key={group.id} className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>{group.emoji}</span> {group.label}
          </h2>
          {group.subs.map((sub) => (
            <div key={sub.id} className="mb-8">
              <h3 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
                <span>{sub.emoji}</span> {sub.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sub.tours.map((t) => (
                  <TourCard key={t.slug} tour={t} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
