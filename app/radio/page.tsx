import type { Metadata } from "next";
import RadioPlayer from "@/components/RadioPlayer";
import { getMusicTracks, getLatestSegment, getSpecialEpisodes } from "@/lib/radio";

const title = "Radio Tenerify — AI-generated island radio";
const description = "Tenerife's own AI radio: generated music plus an hourly island news chat, in English.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/radio" },
  openGraph: { title, description, url: "/radio", siteName: "Tenerify.ai", type: "website" },
};

export default function RadioPage() {
  const tracks = getMusicTracks();
  const segment = getLatestSegment();
  const specials = getSpecialEpisodes();

  return (
    <main className="min-h-full flex flex-col items-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">📻 Radio Tenerify</h1>
          <p className="text-white/60 mt-2">
            AI-generated island music, with the odd chat about what's happening on Tenerife right now.
          </p>
        </div>
        <RadioPlayer tracks={tracks} segment={segment} specials={specials} />
      </div>
    </main>
  );
}
