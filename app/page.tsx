"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SESSION_COOKIE } from "@/lib/session";

const WHATSAPP_NUMBER = "34610434957";

type Message = {
  role: "user" | "assistant";
  content: string;
  options?: string[];
  bookingText?: string;
};

type Step = "hero" | "who" | "chat";

const WHO_OPTIONS = [
  { label: "👨‍👩‍👧 Family", value: "We are a family with kids" },
  { label: "💑 Couple", value: "We are a couple" },
  { label: "🧑 Solo", value: "I'm traveling solo" },
  { label: "👥 Friends", value: "We are a group of friends" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("hero");
  const [who, setWho] = useState("");
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

  async function handleWho(option: { label: string; value: string }) {
    setWho(option.value);
    setStep("chat");
    await sendToAI(option.value, [], option.value);
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
      if (data.isReturning) setIsReturning(true);
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.message, options: data.options, bookingText: data.bookingText },
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
          <p className="text-stone-600 text-xs">Tenerify.ai · Tenerife, Canary Islands</p>
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
          onClick={() => { setStep("hero"); setMessages([]); setUsedOptions(new Set()); }}
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
        {(step === "who" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="text-xl flex-shrink-0 mt-1">🌋</div>
            <div className="space-y-3 flex-1">
              <div className="bg-stone-900 border border-white/5 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                ¡Buenas! Who&apos;s coming to Tenerife? 🌊
              </div>
              <div className="flex flex-wrap gap-2">
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

              {/* WhatsApp booking button */}
              {msg.role === "assistant" && msg.bookingText && (
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I'd like to book:\n${msg.bookingText}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-3 rounded-2xl text-sm transition-all w-fit"
                >
                  <span>📲</span> Book via WhatsApp
                </a>
              )}

              {/* Quick-reply options */}
              {msg.role === "assistant" && i === lastAssistantIndex && !usedOptions.has(i) && !loading && (
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
