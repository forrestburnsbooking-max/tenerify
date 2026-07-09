"use client";

import { useState } from "react";
import Link from "next/link";

// Serializable event prepared by the server page — no lib/events import here
// (it reads the filesystem).
export type EventItem = {
  title: string;
  date: string;
  endDate?: string;
  location: string;
  area: string | null;
  description: string;
  url?: string;
};

const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function DateBadge({ event }: { event: EventItem }) {
  const start = new Date(event.date + "T12:00:00");
  const end = event.endDate ? new Date(event.endDate + "T12:00:00") : null;
  return (
    <div className="flex-shrink-0 w-20 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-center py-3 px-2">
      <div className="text-orange-400 text-[11px] font-bold tracking-wider">
        {MONTH_SHORT[start.getMonth()]}
      </div>
      <div className="text-white text-2xl font-extrabold leading-tight">
        {start.getDate()}
        {end ? <span className="text-stone-400 text-base font-semibold">–{end.getDate()}</span> : null}
      </div>
    </div>
  );
}

const chipClass = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
    active
      ? "bg-orange-500/20 border-orange-500 text-orange-300"
      : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400"
  }`;

export default function EventsList({ events, areas }: { events: EventItem[]; areas: string[] }) {
  const [activeArea, setActiveArea] = useState<string>("all");

  // Only offer chips for areas that actually have events right now
  const usedAreas = areas.filter((a) => events.some((e) => e.area === a));
  const visible = activeArea === "all" ? events : events.filter((e) => e.area === activeArea);

  return (
    <>
      {usedAreas.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setActiveArea("all")} className={chipClass(activeArea === "all")}>
            ✨ All
          </button>
          {usedAreas.map((a) => (
            <button key={a} onClick={() => setActiveArea(a)} className={chipClass(activeArea === a)}>
              📍 {a}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Nothing listed in this area right now —{" "}
          <Link href="/" className="text-orange-400 hover:underline">ask our AI guide</Link>{" "}
          what&apos;s happening on the island.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((e) => (
            <div
              key={`${e.date}-${e.title}`}
              className="flex gap-4 items-start rounded-2xl bg-white/[0.03] border border-white/8 p-4"
            >
              <DateBadge event={e} />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold leading-snug">{e.title}</h2>
                <p className="text-stone-500 text-xs mt-0.5">
                  📍 {e.location}{e.area && e.area !== e.location ? ` · ${e.area}` : ""}
                </p>
                {e.description && (
                  <p className="text-stone-400 text-sm leading-relaxed mt-2 line-clamp-3">{e.description}</p>
                )}
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-orange-400 hover:underline text-sm font-medium"
                  >
                    Details →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
