"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { SESSION_COOKIE } from "@/lib/session";

const WHATSAPP_NUMBER = "34610434957";

function DatePicker({ onSelect }: { onSelect: (date: string) => void }) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const label = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekend = new Date(today);
  const daysToSat = (6 - today.getDay() + 7) % 7 || 7;
  weekend.setDate(today.getDate() + daysToSat);

  const [showPicker, setShowPicker] = useState(false);
  const minDate = fmt(tomorrow);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSelect(label(today))}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          Today
        </button>
        <button onClick={() => onSelect(label(tomorrow))}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          Tomorrow
        </button>
        <button onClick={() => onSelect(label(weekend))}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          This weekend
        </button>
        <button onClick={() => setShowPicker(true)}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          📅 Pick a date
        </button>
      </div>
      {showPicker && (
        <input
          type="date"
          min={minDate}
          autoFocus
          onChange={(e) => {
            if (e.target.value) {
              const d = new Date(e.target.value);
              onSelect(label(d));
            }
          }}
          className="bg-stone-900 border border-orange-500 text-white rounded-2xl px-4 py-3 text-sm w-full focus:outline-none"
          style={{ colorScheme: "dark" }}
        />
      )}
    </div>
  );
}

function TimePicker({ slots, onSelect }: { slots: string[]; onSelect: (time: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all"
        >
          🕐 {t}
        </button>
      ))}
    </div>
  );
}

function LicensePicker({ onSelect }: { onSelect: (answer: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onSelect("Yes, I have a valid driving license (category B or A)")}
        className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
        ✅ Yes, I have a license
      </button>
      <button onClick={() => onSelect("No driving license")}
        className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-red-900 text-red-400 hover:border-red-500 transition-all">
        ❌ No license
      </button>
    </div>
  );
}

function BookingButtons({ bookingText, whatsappNumber }: { bookingText: string; whatsappNumber: string }) {
  const [loading, setLoading] = useState(false);

  const handlePay = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingText }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Payment unavailable right now. Please book via WhatsApp.");
      }
    } catch {
      alert("Payment unavailable right now. Please book via WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [bookingText]);

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <button
        onClick={handlePay}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-2xl text-sm transition-all"
      >
        {loading ? "Opening payment…" : "💳 Pay & Book →"}
      </button>
      <a
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi! I'd like to book:\n${bookingText}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-stone-500 hover:text-green-400 text-xs transition-colors py-1"
      >
        📲 or book via WhatsApp
      </a>
    </div>
  );
}

type TourMedia = {
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  options?: string[];
  bookingText?: string;
  tourMedia?: TourMedia | null;
  needsDate?: boolean;
  needsLicense?: boolean;
  needsTime?: boolean;
  availableTimeSlots?: string[];
};

type Step = "hero" | "language" | "who" | "category" | "location" | "chat";

const LANGUAGES = [
  { flag: "🇪🇸", label: "Español",    value: "es" },
  { flag: "🇬🇧", label: "English",    value: "en" },
  { flag: "🇩🇪", label: "Deutsch",    value: "de" },
  { flag: "🇷🇺", label: "Русский",    value: "ru" },
  { flag: "🇵🇱", label: "Polski",     value: "pl" },
  { flag: "🇫🇷", label: "Français",   value: "fr" },
  { flag: "🇮🇹", label: "Italiano",   value: "it" },
  { flag: "🇳🇱", label: "Nederlands", value: "nl" },
];

const UI_STRINGS: Record<string, {
  whoQuestion: string;
  categoryQuestion: string;
  locationQuestion: string;
  nextButton: string;
  whoLabels: { family: string; couple: string; solo: string; friends: string };
  catLabels: { water: string; buggy: string; tours: string; parks: string; shows: string; adventure: string };
}> = {
  es: {
    whoQuestion: "¡Buenas! ¿Quién viene a Tenerife? 🌊",
    categoryQuestion: "¿Qué te apetece? Elige lo que te interese 👇",
    locationQuestion: "¿En qué zona te alojas? 📍",
    nextButton: "Siguiente →",
    whoLabels: { family: "👨‍👩‍👧 Familia", couple: "💑 Pareja", solo: "🧑 Solo", friends: "👥 Amigos" },
    catLabels: { water: "Agua y Barcos", buggy: "Buggy y Quad", tours: "Tours", parks: "Parques", shows: "Shows y Cenas", adventure: "Aventura" },
  },
  en: {
    whoQuestion: "¡Buenas! Who's coming to Tenerife? 🌊",
    categoryQuestion: "What are you looking for? Pick all that interest you 👇",
    locationQuestion: "Which area are you staying in? 📍",
    nextButton: "Next →",
    whoLabels: { family: "👨‍👩‍👧 Family", couple: "💑 Couple", solo: "🧑 Solo", friends: "👥 Friends" },
    catLabels: { water: "Water & Boats", buggy: "Buggy & Quad", tours: "Island Tours", parks: "Theme Parks", shows: "Shows & Dinners", adventure: "Adventure" },
  },
  de: {
    whoQuestion: "Hallo! Wer kommt nach Teneriffa? 🌊",
    categoryQuestion: "Was sucht ihr? Wählt alles aus 👇",
    locationQuestion: "In welcher Gegend übernachtet ihr? 📍",
    nextButton: "Weiter →",
    whoLabels: { family: "👨‍👩‍👧 Familie", couple: "💑 Paar", solo: "🧑 Alleine", friends: "👥 Freunde" },
    catLabels: { water: "Wasser & Boote", buggy: "Buggy & Quad", tours: "Insel-Touren", parks: "Freizeitparks", shows: "Shows & Dinner", adventure: "Abenteuer" },
  },
  ru: {
    whoQuestion: "Привет! Кто едет на Тенерифе? 🌊",
    categoryQuestion: "Что вас интересует? Выбери всё нужное 👇",
    locationQuestion: "В каком районе вы остановились? 📍",
    nextButton: "Далее →",
    whoLabels: { family: "👨‍👩‍👧 Семья", couple: "💑 Пара", solo: "🧑 Один", friends: "👥 Друзья" },
    catLabels: { water: "Вода и лодки", buggy: "Багги и квад", tours: "Экскурсии", parks: "Парки", shows: "Шоу и ужины", adventure: "Приключения" },
  },
  pl: {
    whoQuestion: "Hej! Kto jedzie na Teneryfę? 🌊",
    categoryQuestion: "Czego szukasz? Wybierz wszystko 👇",
    locationQuestion: "W której okolicy mieszkasz? 📍",
    nextButton: "Dalej →",
    whoLabels: { family: "👨‍👩‍👧 Rodzina", couple: "💑 Para", solo: "🧑 Solo", friends: "👥 Znajomi" },
    catLabels: { water: "Woda i łodzie", buggy: "Buggy i Quad", tours: "Wycieczki", parks: "Parki rozrywki", shows: "Pokazy i kolacje", adventure: "Przygoda" },
  },
  fr: {
    whoQuestion: "Salut! Qui vient à Tenerife? 🌊",
    categoryQuestion: "Qu'est-ce qui vous intéresse? Choisissez tout 👇",
    locationQuestion: "Dans quelle zone logez-vous? 📍",
    nextButton: "Suivant →",
    whoLabels: { family: "👨‍👩‍👧 Famille", couple: "💑 Couple", solo: "🧑 Seul(e)", friends: "👥 Amis" },
    catLabels: { water: "Eau & Bateaux", buggy: "Buggy & Quad", tours: "Tours de l'île", parks: "Parcs", shows: "Shows & Dîners", adventure: "Aventure" },
  },
  it: {
    whoQuestion: "Ciao! Chi viene a Tenerife? 🌊",
    categoryQuestion: "Cosa cercate? Selezionate tutto 👇",
    locationQuestion: "In quale zona alloggiate? 📍",
    nextButton: "Avanti →",
    whoLabels: { family: "👨‍👩‍👧 Famiglia", couple: "💑 Coppia", solo: "🧑 Solo", friends: "👥 Amici" },
    catLabels: { water: "Acqua e Barche", buggy: "Buggy & Quad", tours: "Tour dell'isola", parks: "Parchi tematici", shows: "Show e Cene", adventure: "Avventura" },
  },
  nl: {
    whoQuestion: "Hallo! Wie komt naar Tenerife? 🌊",
    categoryQuestion: "Wat zoeken jullie? Kies alles wat jullie interesseert 👇",
    locationQuestion: "In welk gebied verblijven jullie? 📍",
    nextButton: "Volgende →",
    whoLabels: { family: "👨‍👩‍👧 Familie", couple: "💑 Stel", solo: "🧑 Solo", friends: "👥 Vrienden" },
    catLabels: { water: "Water & Boten", buggy: "Buggy & Quad", tours: "Eilandtours", parks: "Pretparken", shows: "Shows & Diners", adventure: "Avontuur" },
  },
};

const WHO_OPTIONS = [
  { label: "👨‍👩‍👧 Family", value: "We are a family with kids" },
  { label: "💑 Couple", value: "We are a couple" },
  { label: "🧑 Solo", value: "I'm traveling solo" },
  { label: "👥 Friends", value: "We are a group of friends" },
];

const CATEGORIES = [
  { id: "water",     emoji: "🌊", label: "Water & Boats" },
  { id: "buggy",     emoji: "🏍️", label: "Buggy & Quad" },
  { id: "tours",     emoji: "🗺️", label: "Island Tours" },
  { id: "parks",     emoji: "🎡", label: "Theme Parks" },
  { id: "shows",     emoji: "🎭", label: "Shows & Dinners" },
  { id: "adventure", emoji: "🪂", label: "Adventure" },
];

const LOCATIONS = [
  { label: "🏖️ Los Cristianos", value: "Los Cristianos" },
  { label: "🎡 Las Americas", value: "Las Americas" },
  { label: "⛱️ Costa Adeje", value: "Costa Adeje" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("hero");
  const [who, setWho] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedOptions, setUsedOptions] = useState<Set<number>>(new Set());
  const [isReturning, setIsReturning] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const t = UI_STRINGS[selectedLanguage] ?? UI_STRINGS["en"];
  const whoLabelMap: Record<string, string> = {
    "We are a family with kids": t.whoLabels.family,
    "We are a couple": t.whoLabels.couple,
    "I'm traveling solo": t.whoLabels.solo,
    "We are a group of friends": t.whoLabels.friends,
  };
  const catLabelMap: Record<string, string> = {
    water: t.catLabels.water, buggy: t.catLabels.buggy, tours: t.catLabels.tours,
    parks: t.catLabels.parks, shows: t.catLabels.shows, adventure: t.catLabels.adventure,
  };

  useEffect(() => {
    // Check for existing session cookie to show "welcome back"
    setIsReturning(document.cookie.includes(SESSION_COOKIE));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, step]);

  function handleLanguageSelect(lang: string) {
    setSelectedLanguage(lang);
    setStep("who");
  }

  function handleWho(option: { label: string; value: string }) {
    setWho(option.value);
    setStep("category");
  }

  function toggleCategory(id: string) {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function handleCategoryConfirm() {
    setStep("location");
  }

  async function handleLocationSelect(loc: string) {
    setLocation(loc);
    setStep("chat");
    const catLabels = selectedCategories.length > 0
      ? CATEGORIES.filter(c => selectedCategories.includes(c.id)).map(c => c.emoji + " " + c.label).join(", ")
      : "anything";
    const firstMessage = `${who}. Staying in: ${loc}. Interested in: ${catLabels}`;
    await sendToAI(firstMessage, [], who, selectedLanguage);
  }

  async function handleOption(option: string, messageIndex: number) {
    setUsedOptions((prev) => new Set(prev).add(messageIndex));
    await sendToAI(option, messages);
  }

  async function sendToAI(userText: string, history: Message[] = [], whoValue?: string, langValue?: string) {
    const userMessage: Message = { role: "user", content: userText };
    const newMessages = [...history, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          who: whoValue ?? who,
          language: langValue ?? selectedLanguage,
        }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "You're sending messages a bit too fast. Give it a second and try again.", options: ["Try again"] },
        ]);
        return;
      }
      if (data.isReturning) setIsReturning(true);
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.message, options: data.options, bookingText: data.bookingText, tourMedia: data.tourMedia, needsDate: data.needsDate, needsLicense: data.needsLicense, needsTime: data.needsTime, availableTimeSlots: data.availableTimeSlots },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Something went wrong. Try again.", options: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (step === "hero") {
    return (
      <div className="flex flex-col min-h-screen text-white relative overflow-hidden bg-[#0d0d0d]">
        {/* Video background — drop mp4 files into /public/videos/ */}
        <video
          key="hero-video"
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setVideoReady(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-70" : "opacity-0"}`}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay — dark at bottom for text */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-end flex-1 px-6 text-center pb-16 pt-12">
          <div className="flex flex-col items-center gap-6 max-w-sm w-full">
            <div>
              <h1 className="text-6xl font-extrabold tracking-tight mb-2 leading-none">
                <span className="text-white">Tenerify</span>
                <span className="text-orange-400">.ai</span>
              </h1>
              <p className="text-white/70 text-sm font-medium tracking-widest uppercase mt-3">
                {isReturning ? "Welcome back 👋" : "Tenerife Sur · AI concierge"}
              </p>
            </div>

            <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
              {isReturning
                ? "Ready for your next adventure?"
                : "Boats, buggies, shows & more — find and book in under 60 seconds."}
            </p>

            <button
              onClick={() => setStep("language")}
              className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-[1.02] shadow-xl shadow-orange-900/50 tracking-wide"
            >
              Find my experience →
            </button>

            <p className="text-white/25 text-xs">
              Tenerify.ai · <a href="/legal" className="hover:text-white/50 transition-colors">Legal & Privacy</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lastAssistantIndex = messages.reduce(
    (last, msg, i) => (msg.role === "assistant" ? i : last),
    -1
  );

  return (
    <div className="flex flex-col h-screen text-white" style={{ background: "linear-gradient(160deg, #071829 0%, #0a1020 40%, #110c1a 100%)" }}>
      <header className="flex items-center gap-3 px-5 border-b border-white/8" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)", paddingBottom: "16px" }}>
        <button
          onClick={() => { setStep("hero"); setMessages([]); setUsedOptions(new Set()); setSelectedCategories([]); setWho(""); setLocation(""); setSelectedLanguage(""); }}
          className="text-2xl hover:scale-110 transition-transform flex-shrink-0"
        >
          🌋
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-base leading-none tracking-tight">
            Tenerify<span className="text-orange-400">.ai</span>
          </h1>
          <p className="text-stone-500 text-xs mt-0.5 font-medium">Tenerife Sur · AI concierge</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Language selection */}
        {(step === "language" || step === "who" || step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                ¿Qué idioma hablas?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => step === "language" && handleLanguageSelect(lang.value)}
                    disabled={step !== "language"}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-2 ${
                      step === "language"
                        ? "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                        : selectedLanguage === lang.value
                        ? "bg-orange-500/20 border-orange-500 text-orange-300"
                        : "bg-white/5 border-white/10 text-white/40 cursor-default"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Who selection */}
        {(step === "who" || step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                {t.whoQuestion}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WHO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => step === "who" && handleWho(opt)}
                    disabled={step !== "who"}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      step === "who"
                        ? "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                        : who === opt.value
                        ? "bg-orange-500/20 border-orange-500 text-orange-300"
                        : "bg-white/5 border-white/10 text-white/40 cursor-default"
                    }`}
                  >
                    {whoLabelMap[opt.value] ?? opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category selection */}
        {(step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                {t.categoryQuestion}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  const isLocked = step === "location" || step === "chat";
                  return (
                    <button
                      key={cat.id}
                      onClick={() => !isLocked && toggleCategory(cat.id)}
                      disabled={isLocked}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all text-left ${
                        isLocked
                          ? isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-300 cursor-default"
                            : "bg-white/5 border-white/10 text-white/40 cursor-default"
                          : isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-300"
                            : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                      }`}
                    >
                      {cat.emoji} {catLabelMap[cat.id] ?? cat.label}
                    </button>
                  );
                })}
              </div>
              {step === "category" && (
                <button
                  onClick={handleCategoryConfirm}
                  disabled={selectedCategories.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-2xl text-sm transition-all"
                >
                  {t.nextButton}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Location selection */}
        {(step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                {t.locationQuestion}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => {
                  const isSelected = location === loc.value;
                  const isLocked = step === "chat";
                  return (
                    <button
                      key={loc.value}
                      onClick={() => !isLocked && handleLocationSelect(loc.value)}
                      disabled={isLocked}
                      className={`px-3 py-2.5 rounded-2xl text-sm font-medium border transition-all text-center ${
                        isLocked
                          ? isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-300 cursor-default"
                            : "bg-white/5 border-white/10 text-white/40 cursor-default"
                          : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-xl mx-auto w-full ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            )}
            <div className="flex flex-col gap-3 max-w-[85%]">
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-orange-500 text-white rounded-tr-none"
                    : "bg-white/6 border border-white/12 text-white rounded-tl-none prose prose-invert prose-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>

              {/* Tour media card */}
              {msg.role === "assistant" && msg.tourMedia && (
                <div className="rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
                  {msg.tourMedia.videoUrl ? (
                    <iframe
                      src={msg.tourMedia.videoUrl}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : msg.tourMedia.imageUrl ? (
                    <img
                      src={msg.tourMedia.imageUrl}
                      alt={msg.tourMedia.title ?? ""}
                      className="w-full aspect-video object-cover"
                    />
                  ) : null}
                </div>
              )}

              {/* Booking buttons */}
              {msg.role === "assistant" && msg.bookingText && (
                <BookingButtons bookingText={msg.bookingText} whatsappNumber={WHATSAPP_NUMBER} />
              )}

              {/* Date picker or quick-reply options */}
              {msg.role === "assistant" && i === lastAssistantIndex && !usedOptions.has(i) && !loading && (
                msg.needsDate ? (
                  <DatePicker onSelect={(date) => {
                    setUsedOptions((prev) => new Set(prev).add(i));
                    sendToAI(date, messages);
                  }} />
                ) : msg.needsTime && msg.availableTimeSlots && msg.availableTimeSlots.length > 0 ? (
                  <TimePicker slots={msg.availableTimeSlots} onSelect={(time) => {
                    setUsedOptions((prev) => new Set(prev).add(i));
                    sendToAI(time, messages);
                  }} />
                ) : msg.needsLicense ? (
                  <LicensePicker onSelect={(answer) => {
                    setUsedOptions((prev) => new Set(prev).add(i));
                    sendToAI(answer, messages);
                  }} />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(msg.options && msg.options.length > 0
                      ? msg.options
                      : ["Tell me more 🌴", "Something else", "How do I book?"]
                    ).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOption(opt, i)}
                        className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="bg-white/6 border border-white/12 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Text input */}
      {step === "chat" && !loading && (
        <div className="px-4 pb-5 pt-3 border-t border-white/8">
          <div className="max-w-xl mx-auto flex gap-2 items-center">
            <input
              type="text"
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  const val = e.currentTarget.value.trim();
                  e.currentTarget.value = "";
                  sendToAI(val, messages);
                }
              }}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 focus:border-orange-500 text-white placeholder-white/40 text-sm px-4 py-3 rounded-2xl focus:outline-none transition-colors"
            />
            <button
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                if (input?.value.trim()) {
                  const val = input.value.trim();
                  input.value = "";
                  sendToAI(val, messages);
                }
              }}
              className="bg-orange-500 hover:bg-orange-400 text-white p-3 rounded-2xl transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.908 6.258H10a.75.75 0 0 1 0 1.5H4.188l-1.909 6.258a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.208-8.293.75.75 0 0 0 0-1.076A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
