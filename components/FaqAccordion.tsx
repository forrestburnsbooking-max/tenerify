"use client";

import { useState } from "react";

type FaqItem = { question: string; answer: string };

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!items?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
          >
            <span className="font-medium text-white text-sm">{item.question}</span>
            <span className={`text-orange-400 transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-stone-400 text-sm leading-relaxed">{item.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}
