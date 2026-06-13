"use client";

import { useState } from "react";

export default function TourGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="w-full aspect-[16/10] rounded-3xl bg-stone-900 flex items-center justify-center text-stone-600 text-5xl">
        🌴
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full aspect-[16/10] rounded-3xl overflow-hidden bg-stone-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === active ? "border-orange-500" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
