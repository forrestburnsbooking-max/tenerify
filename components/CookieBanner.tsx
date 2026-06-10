"use client";

import { useState } from "react";

const STORAGE_KEY = "tfy_cookie_notice_seen";

export default function CookieBanner() {
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)
  );

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-4 pb-4">
      <div className="max-w-xl mx-auto bg-stone-900 border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-xl">
        <p className="text-stone-300 text-xs leading-relaxed flex-1">
          We use a single essential cookie to keep your chat session. No tracking or ads.{" "}
          <a href="/legal#cookie-policy" className="text-orange-400 hover:underline">Learn more</a>
        </p>
        <button
          onClick={dismiss}
          className="bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
