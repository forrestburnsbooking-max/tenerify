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
          className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          Today
        </button>
        <button onClick={() => onSelect(label(tomorrow))}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          Tomorrow
        </button>
        <button onClick={() => onSelect(label(weekend))}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
          This weekend
        </button>
        <button onClick={() => setShowPicker(true)}
          className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
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
          className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all"
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
        className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
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

type Step = "hero" | "who" | "category" | "location" | "chat";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedOptions, setUsedOptions] = useState<Set<number>>(new Set());
  const [isReturning, setIsReturning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for existing session cookie to show "welcome back"
    setIsReturning(document.cookie.includes(SESSION_COOKIE));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, step]);

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
    await sendToAI(firstMessage, [], who);
  }

  async function handleOption(option: string, messageIndex: number) {
    setUsedOptions((prev) => new Set(prev).add(messageIndex));
    await sendToAI(option, messages);
  }

  async function sendToAI(userText: string, history: Message[] = [], whoValue?: string) {
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
      <div className="flex flex-col min-h-screen bg-[#0d0d0d] text-white">
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-8 py-24">
          <div className="text-6xl">🌋</div>
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-3">
              <span className="text-white">Tenerify</span>
              <span className="text-orange-400">.ai</span>
            </h1>
            <p className="text-stone-400 text-lg max-w-xs mx-auto leading-relaxed">
              {isReturning
                ? <>Welcome back. 🌊<br />Ready for your next adventure?</>
                : <>Your local AI friend in Tenerife.<br />Discover & book in 60 seconds.</>}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 mt-4">
            <button
              onClick={() => setStep("who")}
              className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 shadow-lg shadow-orange-900/40"
            >
              Find my perfect experience →
            </button>
            <p className="text-stone-600 text-xs">Volcano · Ocean · Boats · Tenerife</p>
          </div>
        </div>
        <div className="border-t border-white/5 px-6 py-4 flex justify-center">
          <p className="text-stone-600 text-xs">Tenerify.ai · Tenerife, Canary Islands · <a href="/legal" className="hover:text-stone-400 transition-colors">Legal & Privacy</a></p>
        </div>
      </div>
    );
  }

  const lastAssistantIndex = messages.reduce(
    (last, msg, i) => (msg.role === "assistant" ? i : last),
    -1
  );

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] text-white">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <button
          onClick={() => { setStep("hero"); setMessages([]); setUsedOptions(new Set()); setSelectedCategories([]); setWho(""); setLocation(""); }}
          className="text-2xl hover:scale-110 transition-transform"
        >
          🌋
        </button>
        <div>
          <h1 className="font-bold text-base leading-none">
            Tenerify<span className="text-orange-400">.ai</span>
          </h1>
          <p className="text-stone-500 text-xs mt-0.5">Tenerife · Your local AI friend</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Who selection */}
        {(step === "who" || step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="space-y-3 flex-1">
              <div className="bg-stone-900 border border-white/5 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                ¡Buenas! Who&apos;s coming to Tenerife? 🌊
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WHO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => step === "who" && handleWho(opt)}
                    disabled={step !== "who"}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      step === "who"
                        ? "bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                        : who === opt.value
                        ? "bg-orange-500/20 border-orange-500 text-orange-300"
                        : "bg-stone-900/50 border-stone-800 text-stone-600 cursor-default"
                    }`}
                  >
                    {opt.label}
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
              <div className="bg-stone-900 border border-white/5 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                What are you looking for? Pick all that interest you 👇
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
                            : "bg-stone-900/50 border-stone-800 text-stone-600 cursor-default"
                          : isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-300"
                            : "bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                      }`}
                    >
                      {cat.emoji} {cat.label}
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
                  Next →
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
              <div className="bg-stone-900 border border-white/5 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                Which area are you staying in? 📍
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
                            : "bg-stone-900/50 border-stone-800 text-stone-600 cursor-default"
                          : "bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
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
                    : "bg-stone-900 border border-white/5 text-white rounded-tl-none prose prose-invert prose-sm"
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
                        className="px-4 py-2 rounded-full text-sm font-medium border bg-stone-900 border-stone-700 text-white hover:border-orange-500 hover:text-orange-400 transition-all cursor-pointer"
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
            <div className="bg-stone-900 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3">
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

      {/* Text input fallback */}
      {step === "chat" && !loading && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <div className="max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Or type your own question..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  const val = e.currentTarget.value.trim();
                  e.currentTarget.value = "";
                  sendToAI(val, messages);
                }
              }}
              className="w-full bg-transparent border-0 text-stone-500 placeholder-stone-700 text-xs py-2 focus:outline-none focus:text-white transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
