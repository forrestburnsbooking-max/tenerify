"use client";

import { useState, useRef, useEffect, useCallback, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { SESSION_COOKIE } from "@/lib/session";
import { useTwemoji } from "@/lib/useTwemoji";

// Single newlines become real line breaks (react-markdown collapses them otherwise),
// so a question on its own line no longer glues onto the text above it.
const MD_PLUGINS = [remarkBreaks];

const MD_COMPONENTS = {
  // Paragraphs and lists need their own vertical spacing — Tailwind's reset strips the
  // default margins, so without this the body, the bullet list and the closing question
  // all run together (e.g. the question gluing right under a list).
  p: (props: ComponentProps<"p">) => <p {...props} className="mb-3 last:mb-0" />,
  ul: (props: ComponentProps<"ul">) => <ul {...props} className="mb-3 last:mb-0 space-y-1" />,
  ol: (props: ComponentProps<"ol">) => <ol {...props} className="mb-3 last:mb-0 space-y-1" />,
  // Render every markdown link as an external link that opens in a new tab
  // (Google Maps, menus, etc. should never navigate away from the chat).
  a: (props: ComponentProps<"a">) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline hover:text-orange-300" />
  ),
};

function DatePicker({ onSelect, noSameDay = false }: { onSelect: (date: string) => void; noSameDay?: boolean }) {
  const today = new Date();
  // Format a Date as YYYY-MM-DD using LOCAL components (toISOString would shift
  // by the UTC offset and could move the min date a day in either direction).
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const label = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  // Parse a YYYY-MM-DD string as a local date (avoids the UTC off-by-one).
  const parseLocal = (v: string) => {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekend = new Date(today);
  const daysToSat = (6 - today.getDay() + 7) % 7 || 7;
  weekend.setDate(today.getDate() + daysToSat);

  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState("");
  const minDate = fmt(tomorrow);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-2">
        {!noSameDay && (
          <button onClick={() => onSelect(label(today))}
            className="px-4 py-2 rounded-full text-sm font-medium border bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 transition-all">
            Today
          </button>
        )}
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
        <div className="flex gap-2">
          {/* Controlled input — picking a date only stages it; nothing is sent
              until the user taps OK. This stops the native picker from
              auto-submitting before the user has chosen. */}
          <input
            type="date"
            min={minDate}
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="flex-1 bg-stone-900 border border-orange-500 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none"
            style={{ colorScheme: "dark" }}
          />
          <button
            onClick={() => picked && onSelect(label(parseLocal(picked)))}
            disabled={!picked}
            className="px-5 py-3 rounded-2xl text-sm font-semibold border border-orange-500 bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
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

function BookingButtons({ bookingText }: { bookingText: string }) {
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
        alert("Payment unavailable right now. Please try again in a moment.");
      }
    } catch {
      alert("Payment unavailable right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [bookingText]);

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <button
        onClick={handlePay}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-2xl text-sm transition-all"
      >
        {loading ? "Opening payment…" : "💳 Pay & Book →"}
      </button>
    </div>
  );
}

type TourMedia = {
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  title?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  hidden?: boolean; // sent to the AI as context but not rendered (e.g. the onboarding summary)
  options?: string[];
  bookingText?: string;
  tourMedia?: TourMedia | null;
  tourMediaList?: TourMedia[];
  needsDate?: boolean;
  needsLicense?: boolean;
  needsText?: boolean;
  needsTime?: boolean;
  availableTimeSlots?: string[];
  noSameDay?: boolean;
};

type Step = "hero" | "language" | "menu" | "bookMode" | "who" | "category" | "location" | "chat";

const LANGUAGES = [
  { flag: "🇪🇸", label: "Español",    value: "es" },
  { flag: "🇬🇧", label: "English",    value: "en" },
  { flag: "🇩🇪", label: "Deutsch",    value: "de" },
  { flag: "🇷🇺", label: "Русский",    value: "ru" },
  { flag: "🇵🇱", label: "Polski",     value: "pl" },
  { flag: "🇫🇷", label: "Français",   value: "fr" },
  { flag: "🇮🇹", label: "Italiano",   value: "it" },
  { flag: "🇳🇱", label: "Nederlands", value: "nl" },
  { flag: "🇸🇪", label: "Svenska",    value: "sv" },
  { flag: "🇺🇦", label: "Українська", value: "uk" },
  { flag: "🇨🇳", label: "中文",        value: "zh" },
  { flag: "🇸🇦", label: "العربية",     value: "ar" },
];

const UI_STRINGS: Record<string, {
  intro: string;
  whoQuestion: string;
  categoryQuestion: string;
  locationQuestion: string;
  otherLabel: string;
  otherPlaceholder: string;
  nextButton: string;
  whoLabels: { family: string; couple: string; solo: string; friends: string };
  catLabels: { water: string; land: string; air: string; shows: string; rental: string };
  catSubs: { water: string; land: string; air: string; shows: string; rental: string };
  menuLabels: { book: string; route: string; restaurant: string; culture: string; ask: string };
}> = {
  es: {
    intro: "¡Hola! Soy Tenerify 🌋 — tu amigo local de IA en Tenerife. Conozco lo que hay en internet *y* lo que solo saben los locales.\n\n**Esto es lo que puedo hacer:**\n- 🚤 Encontrar y reservar las mejores actividades de la isla\n- 🗺️ Planificar tu ruta perfecta\n- 🍽️ Recomendarte un restaurante\n- 🌴 Contarte la cultura y las leyendas de la isla\n\n¿Qué te apetece hoy?",
    whoQuestion: "¡Buenas! ¿Quién viene a Tenerife? 🌊",
    categoryQuestion: "¿Qué te apetece? Elige lo que te interese 👇",
    locationQuestion: "¿En qué zona te alojas? 📍",
    otherLabel: "📍 Otra zona",
    otherPlaceholder: "Escribe tu zona...",
    nextButton: "Siguiente →",
    whoLabels: { family: "👨‍👩‍👧 Familia", couple: "💑 Pareja", solo: "🧑 Solo", friends: "👥 Amigos" },
    catLabels: { water: "Agua", land: "Tierra", air: "Aire", shows: "Espectáculos", rental: "Alquiler de coches" },
    catSubs: { water: "Ballenas · Moto acuática · Pesca · Barcos", land: "Buggy y quad · Parques · Tours en bus", air: "Helicóptero · Parapente", shows: "Flamenco · Cenas show", rental: "Coches · Furgonetas · Cabrio" },
    menuLabels: { book: "🚤 Reservar actividades", route: "🗺️ Planificar una ruta", restaurant: "🍽️ Recomendar restaurante", culture: "🌴 Cultura y leyendas", ask: "💬 Pregúntame lo que quieras" },
  },
  en: {
    intro: "Hey! I'm Tenerify 🌋 — your local AI friend from Tenerife. I know what's online *and* what only locals know.\n\n**Here's what I can do:**\n- 🚤 Find & book the best activities on the island\n- 🗺️ Plan your perfect route\n- 🍽️ Recommend a restaurant\n- 🌴 Tell you about the island's culture & legends\n\nWhat would you like today?",
    whoQuestion: "¡Buenas! Who's coming to Tenerife? 🌊",
    categoryQuestion: "What are you looking for? Pick all that interest you 👇",
    locationQuestion: "Which area are you staying in? 📍",
    otherLabel: "📍 Other",
    otherPlaceholder: "Type your area...",
    nextButton: "Next →",
    whoLabels: { family: "👨‍👩‍👧 Family", couple: "💑 Couple", solo: "🧑 Solo", friends: "👥 Friends" },
    catLabels: { water: "Water", land: "Land", air: "Air", shows: "Evening shows", rental: "Car rental" },
    catSubs: { water: "Whale watching · Jet ski · Fishing · Boat trips", land: "Buggy & quads · Theme parks · Bus tours", air: "Helicopter · Paragliding", shows: "Flamenco · Dinner shows", rental: "Cars · Vans · Cabrio" },
    menuLabels: { book: "🚤 Find & book activities", route: "🗺️ Plan a route", restaurant: "🍽️ Recommend a restaurant", culture: "🌴 Culture & legends", ask: "💬 Just ask me anything" },
  },
  de: {
    intro: "Hey! Ich bin Tenerify 🌋 — dein lokaler KI-Freund aus Teneriffa. Ich kenne, was online steht *und* was nur Einheimische wissen.\n\n**Das kann ich für euch tun:**\n- 🚤 Die besten Aktivitäten der Insel finden & buchen\n- 🗺️ Eure perfekte Route planen\n- 🍽️ Ein Restaurant empfehlen\n- 🌴 Dir von Kultur und Legenden der Insel erzählen\n\nWorauf habt ihr heute Lust?",
    whoQuestion: "Hallo! Wer kommt nach Teneriffa? 🌊",
    categoryQuestion: "Was sucht ihr? Wählt alles aus 👇",
    locationQuestion: "In welcher Gegend übernachtet ihr? 📍",
    otherLabel: "📍 Andere",
    otherPlaceholder: "Gib deine Gegend ein...",
    nextButton: "Weiter →",
    whoLabels: { family: "👨‍👩‍👧 Familie", couple: "💑 Paar", solo: "🧑 Alleine", friends: "👥 Freunde" },
    catLabels: { water: "Wasser", land: "Land", air: "Luft", shows: "Abendshows", rental: "Mietwagen" },
    catSubs: { water: "Walbeobachtung · Jetski · Angeln · Bootstouren", land: "Buggy & Quad · Freizeitparks · Bustouren", air: "Hubschrauber · Gleitschirm", shows: "Flamenco · Dinnershows", rental: "Autos · Vans · Cabrio" },
    menuLabels: { book: "🚤 Aktivitäten finden & buchen", route: "🗺️ Route planen", restaurant: "🍽️ Restaurant empfehlen", culture: "🌴 Kultur & Legenden", ask: "💬 Frag mich einfach" },
  },
  ru: {
    intro: "Привет! Я Tenerify 🌋 — твой местный AI-друг с Тенерифе. Знаю и то, что есть в интернете, и то, о чём знают только местные.\n\n**Что я умею:**\n- 🚤 Найти и забронировать лучшие активности на острове\n- 🗺️ Спланировать идеальный маршрут\n- 🍽️ Порекомендовать ресторан\n- 🌴 Рассказать о культуре и легендах острова\n\nЧто бы ты хотел сегодня?",
    whoQuestion: "Привет! Кто едет на Тенерифе? 🌊",
    categoryQuestion: "Что вас интересует? Выбери всё нужное 👇",
    locationQuestion: "В каком районе вы остановились? 📍",
    otherLabel: "📍 Другое",
    otherPlaceholder: "Укажите свой район...",
    nextButton: "Далее →",
    whoLabels: { family: "👨‍👩‍👧 Семья", couple: "💑 Пара", solo: "🧑 Один", friends: "👥 Друзья" },
    catLabels: { water: "Вода", land: "Суша", air: "Воздух", shows: "Вечерние шоу", rental: "Аренда авто" },
    catSubs: { water: "Киты и дельфины · Гидроцикл · Рыбалка · Лодки", land: "Багги и квадро · Парки · Автобусные туры", air: "Вертолёт · Параплан", shows: "Фламенко · Шоу с ужином", rental: "Авто · Минивэны · Кабрио" },
    menuLabels: { book: "🚤 Найти и забронировать развлечение", route: "🗺️ Спланировать маршрут", restaurant: "🍽️ Порекомендовать ресторан", culture: "🌴 Культура и легенды", ask: "💬 Просто задать вопрос" },
  },
  pl: {
    intro: "Hej! Jestem Tenerify 🌋 — twój lokalny przyjaciel AI z Teneryfy. Znam to, co jest w internecie *i* to, co wiedzą tylko miejscowi.\n\n**Oto co mogę zrobić:**\n- 🚤 Znaleźć i zarezerwować najlepsze atrakcje na wyspie\n- 🗺️ Zaplanować idealną trasę\n- 🍽️ Polecić restaurację\n- 🌴 Opowiedzieć o kulturze i legendach wyspy\n\nNa co masz dziś ochotę?",
    whoQuestion: "Hej! Kto jedzie na Teneryfę? 🌊",
    categoryQuestion: "Czego szukasz? Wybierz wszystko 👇",
    locationQuestion: "W której okolicy mieszkasz? 📍",
    otherLabel: "📍 Inne",
    otherPlaceholder: "Wpisz swoją okolicę...",
    nextButton: "Dalej →",
    whoLabels: { family: "👨‍👩‍👧 Rodzina", couple: "💑 Para", solo: "🧑 Solo", friends: "👥 Znajomi" },
    catLabels: { water: "Woda", land: "Ląd", air: "Powietrze", shows: "Wieczorne pokazy", rental: "Wynajem aut" },
    catSubs: { water: "Wieloryby · Skuter wodny · Wędkarstwo · Łodzie", land: "Buggy i quady · Parki · Wycieczki autobusowe", air: "Helikopter · Paralotnia", shows: "Flamenco · Kolacje z pokazem", rental: "Samochody · Vany · Kabriolet" },
    menuLabels: { book: "🚤 Znajdź i zarezerwuj", route: "🗺️ Zaplanuj trasę", restaurant: "🍽️ Poleć restaurację", culture: "🌴 Kultura i legendy", ask: "💬 Po prostu zapytaj" },
  },
  fr: {
    intro: "Salut! Je suis Tenerify 🌋 — ton ami local IA de Tenerife. Je connais ce qui est en ligne *et* ce que seuls les locaux savent.\n\n**Voici ce que je peux faire:**\n- 🚤 Trouver et réserver les meilleures activités de l'île\n- 🗺️ Planifier ton itinéraire parfait\n- 🍽️ Te recommander un restaurant\n- 🌴 Te parler de la culture et des légendes de l'île\n\nQu'est-ce qui te ferait plaisir aujourd'hui?",
    whoQuestion: "Salut! Qui vient à Tenerife? 🌊",
    categoryQuestion: "Qu'est-ce qui vous intéresse? Choisissez tout 👇",
    locationQuestion: "Dans quelle zone logez-vous? 📍",
    otherLabel: "📍 Autre",
    otherPlaceholder: "Indiquez votre zone...",
    nextButton: "Suivant →",
    whoLabels: { family: "👨‍👩‍👧 Famille", couple: "💑 Couple", solo: "🧑 Seul(e)", friends: "👥 Amis" },
    catLabels: { water: "Eau", land: "Terre", air: "Air", shows: "Spectacles", rental: "Location de voiture" },
    catSubs: { water: "Baleines · Jet ski · Pêche · Bateaux", land: "Buggy & quad · Parcs · Excursions en bus", air: "Hélicoptère · Parapente", shows: "Flamenco · Dîners-spectacles", rental: "Voitures · Vans · Cabriolet" },
    menuLabels: { book: "🚤 Trouver et réserver", route: "🗺️ Planifier un itinéraire", restaurant: "🍽️ Recommander un restaurant", culture: "🌴 Culture & légendes", ask: "💬 Pose-moi ta question" },
  },
  it: {
    intro: "Ciao! Sono Tenerify 🌋 — il tuo amico AI locale di Tenerife. Conosco ciò che c'è online *e* ciò che sanno solo i locali.\n\n**Ecco cosa posso fare:**\n- 🚤 Trovare e prenotare le migliori attività dell'isola\n- 🗺️ Pianificare il tuo itinerario perfetto\n- 🍽️ Consigliarti un ristorante\n- 🌴 Raccontarti la cultura e le leggende dell'isola\n\nCosa ti va di fare oggi?",
    whoQuestion: "Ciao! Chi viene a Tenerife? 🌊",
    categoryQuestion: "Cosa cercate? Selezionate tutto 👇",
    locationQuestion: "In quale zona alloggiate? 📍",
    otherLabel: "📍 Altro",
    otherPlaceholder: "Indica la tua zona...",
    nextButton: "Avanti →",
    whoLabels: { family: "👨‍👩‍👧 Famiglia", couple: "💑 Coppia", solo: "🧑 Solo", friends: "👥 Amici" },
    catLabels: { water: "Acqua", land: "Terra", air: "Aria", shows: "Spettacoli serali", rental: "Noleggio auto" },
    catSubs: { water: "Balene · Moto d'acqua · Pesca · Barche", land: "Buggy e quad · Parchi · Tour in bus", air: "Elicottero · Parapendio", shows: "Flamenco · Cene-spettacolo", rental: "Auto · Furgoni · Cabrio" },
    menuLabels: { book: "🚤 Trova e prenota", route: "🗺️ Pianifica un itinerario", restaurant: "🍽️ Consiglia un ristorante", culture: "🌴 Cultura e leggende", ask: "💬 Chiedimi quello che vuoi" },
  },
  nl: {
    intro: "Hallo! Ik ben Tenerify 🌋 — je lokale AI-vriend van Tenerife. Ik ken wat online staat *én* wat alleen locals weten.\n\n**Dit kan ik voor je doen:**\n- 🚤 De beste activiteiten op het eiland vinden & boeken\n- 🗺️ Jouw perfecte route plannen\n- 🍽️ Een restaurant aanbevelen\n- 🌴 Je vertellen over de cultuur en legendes van het eiland\n\nWaar heb je vandaag zin in?",
    whoQuestion: "Hallo! Wie komt naar Tenerife? 🌊",
    categoryQuestion: "Wat zoeken jullie? Kies alles wat jullie interesseert 👇",
    locationQuestion: "In welk gebied verblijven jullie? 📍",
    otherLabel: "📍 Anders",
    otherPlaceholder: "Voer je gebied in...",
    nextButton: "Volgende →",
    whoLabels: { family: "👨‍👩‍👧 Familie", couple: "💑 Stel", solo: "🧑 Solo", friends: "👥 Vrienden" },
    catLabels: { water: "Water", land: "Land", air: "Lucht", shows: "Avondshows", rental: "Autoverhuur" },
    catSubs: { water: "Walvissen · Jetski · Vissen · Boottochten", land: "Buggy & quad · Pretparken · Bustours", air: "Helikopter · Paragliding", shows: "Flamenco · Dinershows", rental: "Auto's · Bussen · Cabrio" },
    menuLabels: { book: "🚤 Activiteiten vinden & boeken", route: "🗺️ Route plannen", restaurant: "🍽️ Restaurant aanbevelen", culture: "🌴 Cultuur & legendes", ask: "💬 Vraag me alles" },
  },
  sv: {
    intro: "Hej! Jag är Tenerify 🌋 — din lokala AI-vän från Teneriffa. Jag vet vad som finns online *och* vad bara lokalbor känner till.\n\n**Det här kan jag göra:**\n- 🚤 Hitta & boka de bästa aktiviteterna på ön\n- 🗺️ Planera din perfekta rutt\n- 🍽️ Rekommendera en restaurang\n- 🌴 Berätta om öns kultur och legender\n\nVad är du sugen på idag?",
    whoQuestion: "Hej! Vilka kommer till Teneriffa? 🌊",
    categoryQuestion: "Vad letar du efter? Välj allt som intresserar dig 👇",
    locationQuestion: "Vilket område bor du i? 📍",
    otherLabel: "📍 Annat",
    otherPlaceholder: "Skriv ditt område...",
    nextButton: "Nästa →",
    whoLabels: { family: "👨‍👩‍👧 Familj", couple: "💑 Par", solo: "🧑 Ensam", friends: "👥 Vänner" },
    catLabels: { water: "Vatten", land: "Land", air: "Luft", shows: "Kvällsshower", rental: "Hyrbil" },
    catSubs: { water: "Valskådning · Vattenskoter · Fiske · Båtturer", land: "Buggy & fyrhjuling · Temaparker · Bussturer", air: "Helikopter · Skärmflygning", shows: "Flamenco · Middagsshower", rental: "Bilar · Skåpbilar · Cabriolet" },
    menuLabels: { book: "🚤 Hitta & boka aktiviteter", route: "🗺️ Planera en rutt", restaurant: "🍽️ Rekommendera en restaurang", culture: "🌴 Kultur & legender", ask: "💬 Fråga mig vad som helst" },
  },
  uk: {
    intro: "Привіт! Я Tenerify 🌋 — твій місцевий AI-друг з Тенерифе. Знаю і те, що є в інтернеті, і те, що знають лише місцеві.\n\n**Що я вмію:**\n- 🚤 Знайти та забронювати найкращі активності на острові\n- 🗺️ Спланувати ідеальний маршрут\n- 🍽️ Порекомендувати ресторан\n- 🌴 Розповісти про культуру та легенди острова\n\nЧого б ти хотів сьогодні?",
    whoQuestion: "Привіт! Хто їде на Тенерифе? 🌊",
    categoryQuestion: "Що вас цікавить? Обери все потрібне 👇",
    locationQuestion: "У якому районі ви зупинилися? 📍",
    otherLabel: "📍 Інше",
    otherPlaceholder: "Вкажіть свій район...",
    nextButton: "Далі →",
    whoLabels: { family: "👨‍👩‍👧 Сім'я", couple: "💑 Пара", solo: "🧑 Один", friends: "👥 Друзі" },
    catLabels: { water: "Вода", land: "Суша", air: "Повітря", shows: "Вечірні шоу", rental: "Оренда авто" },
    catSubs: { water: "Кити та дельфіни · Гідроцикл · Риболовля · Човни", land: "Баггі та квадро · Парки · Автобусні тури", air: "Вертоліт · Параплан", shows: "Фламенко · Шоу з вечерею", rental: "Авто · Мінівени · Кабріо" },
    menuLabels: { book: "🚤 Знайти та забронювати", route: "🗺️ Спланувати маршрут", restaurant: "🍽️ Порекомендувати ресторан", culture: "🌴 Культура і легенди", ask: "💬 Просто поставити запитання" },
  },
  zh: {
    intro: "你好！我是 Tenerify 🌋 — 你在特内里费的本地 AI 朋友。我既了解网上的信息，也知道只有当地人才懂的玩法。\n\n**我能帮你做这些：**\n- 🚤 寻找并预订岛上最棒的活动\n- 🗺️ 规划你的完美路线\n- 🍽️ 推荐一家餐厅\n- 🌴 给你讲讲岛上的文化与传说\n\n今天想做点什么呢？",
    whoQuestion: "你好！谁要来特内里费？🌊",
    categoryQuestion: "你在找什么？选择所有感兴趣的 👇",
    locationQuestion: "你住在哪个区域？📍",
    otherLabel: "📍 其他",
    otherPlaceholder: "输入你所在的区域...",
    nextButton: "下一步 →",
    whoLabels: { family: "👨‍👩‍👧 家庭", couple: "💑 情侣", solo: "🧑 一个人", friends: "👥 朋友" },
    catLabels: { water: "水上", land: "陆地", air: "空中", shows: "晚间表演", rental: "租车" },
    catSubs: { water: "观鲸 · 水上摩托 · 海钓 · 游船", land: "沙滩车和四轮车 · 主题公园 · 巴士游", air: "直升机 · 滑翔伞", shows: "弗拉门戈 · 晚宴秀", rental: "轿车 · 商务车 · 敞篷车" },
    menuLabels: { book: "🚤 查找并预订活动", route: "🗺️ 规划路线", restaurant: "🍽️ 推荐餐厅", culture: "🌴 文化与传说", ask: "💬 随便问我" },
  },
  ar: {
    intro: "مرحباً! أنا Tenerify 🌋 — صديقك المحلي بالذكاء الاصطناعي في تينيريفي. أعرف ما هو على الإنترنت *وما* يعرفه السكان المحليون فقط.\n\n**إليك ما يمكنني فعله:**\n- 🚤 إيجاد وحجز أفضل الأنشطة في الجزيرة\n- 🗺️ تخطيط مسارك المثالي\n- 🍽️ ترشيح مطعم لك\n- 🌴 أن أحدثك عن ثقافة الجزيرة وأساطيرها\n\nماذا تريد اليوم؟",
    whoQuestion: "مرحباً! من القادم إلى تينيريفي؟ 🌊",
    categoryQuestion: "عمّ تبحث؟ اختر كل ما يهمّك 👇",
    locationQuestion: "في أي منطقة تقيم؟ 📍",
    otherLabel: "📍 أخرى",
    otherPlaceholder: "اكتب منطقتك...",
    nextButton: "التالي →",
    whoLabels: { family: "👨‍👩‍👧 عائلة", couple: "💑 ثنائي", solo: "🧑 بمفردي", friends: "👥 أصدقاء" },
    catLabels: { water: "بحر", land: "برّ", air: "جو", shows: "عروض مسائية", rental: "تأجير سيارات" },
    catSubs: { water: "مشاهدة الحيتان · جت سكي · صيد · رحلات بحرية", land: "باغي وكواد · مدن ملاهٍ · جولات بالحافلة", air: "هليكوبتر · طيران شراعي", shows: "فلامنكو · عشاء مع عرض", rental: "سيارات · فانات · مكشوفة" },
    menuLabels: { book: "🚤 ابحث واحجز الأنشطة", route: "🗺️ خطّط مساراً", restaurant: "🍽️ رشّح مطعماً", culture: "🌴 الثقافة والأساطير", ask: "💬 اسألني أي شيء" },
  },
};

const MENU_OPTIONS: { id: "book" | "route" | "restaurant" | "culture" | "ask" }[] = [
  { id: "book" },
  { id: "route" },
  { id: "restaurant" },
  { id: "culture" },
  { id: "ask" },
];

const MENU_MESSAGES: Record<"route" | "restaurant" | "culture", string> = {
  route: "I'd like to plan a self-drive route around Tenerife. Suggest one and tell me about it.",
  restaurant: "Recommend a good restaurant in Tenerife.",
  culture: "Tell me about this island — its culture, people, food and traditions, and its legends and stories. What makes Tenerife special? Start me off with something, then offer to go deeper.",
};

// "Find & book" fork: hand-pick with the AI vs. browse the catalogue yourself.
// Kept outside TRANSLATIONS so unlisted languages fall back to English.
const BOOK_MODE_TEXTS: Record<string, { question: string; assist: string; catalog: string }> = {
  en: { question: "How would you like to choose?", assist: "🎯 Pick for me — a couple of quick questions", catalog: "📖 I'll browse the catalogue myself" },
  ru: { question: "Как удобнее выбрать?", assist: "🎯 Подбери за меня — пара быстрых вопросов", catalog: "📖 Сам посмотрю каталог" },
  es: { question: "¿Cómo prefieres elegir?", assist: "🎯 Elige por mí — un par de preguntas rápidas", catalog: "📖 Prefiero ver el catálogo" },
  de: { question: "Wie möchtet ihr auswählen?", assist: "🎯 Wähl für mich — ein paar schnelle Fragen", catalog: "📖 Ich schaue selbst in den Katalog" },
  fr: { question: "Comment préfères-tu choisir ?", assist: "🎯 Choisis pour moi — quelques questions rapides", catalog: "📖 Je regarde le catalogue moi-même" },
  it: { question: "Come preferisci scegliere?", assist: "🎯 Scegli per me — un paio di domande veloci", catalog: "📖 Guardo io il catalogo" },
  nl: { question: "Hoe wil je kiezen?", assist: "🎯 Kies voor mij — een paar snelle vragen", catalog: "📖 Ik bekijk zelf de catalogus" },
  pl: { question: "Jak wolisz wybrać?", assist: "🎯 Wybierz za mnie — kilka szybkich pytań", catalog: "📖 Sam przejrzę katalog" },
  uk: { question: "Як зручніше обрати?", assist: "🎯 Підбери за мене — пара швидких питань", catalog: "📖 Сам подивлюся каталог" },
};

const WHO_OPTIONS = [
  { label: "👨‍👩‍👧 Family", value: "We are a family with kids" },
  { label: "💑 Couple", value: "We are a couple" },
  { label: "🧑 Solo", value: "I'm traveling solo" },
  { label: "👥 Friends", value: "We are a group of friends" },
];

const CATEGORIES = [
  { id: "water",  emoji: "🌊", label: "Water" },
  { id: "land",   emoji: "🏝️", label: "Land" },
  { id: "air",    emoji: "✈️", label: "Air" },
  { id: "shows",  emoji: "🎭", label: "Evening shows" },
  { id: "rental", emoji: "🚗", label: "Car rental" },
];

const LOCATIONS = [
  { label: "🏖️ Los Cristianos", value: "Los Cristianos" },
  { label: "🎡 Las Americas", value: "Las Americas" },
  { label: "⛱️ Costa Adeje", value: "Costa Adeje" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("hero");
  const [menuChoice, setMenuChoice] = useState<string | null>(null);
  const [bookModeChoice, setBookModeChoice] = useState<"assist" | "catalog" | null>(null);
  const [who, setWho] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedOptions, setUsedOptions] = useState<Set<number>>(new Set());
  const [isReturning, setIsReturning] = useState(false);
  const [savedTranscript, setSavedTranscript] = useState<{ messages: Message[]; who: string; language: string } | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rootRef = useTwemoji<HTMLDivElement>();
  const sendingRef = useRef(false);

  const t = UI_STRINGS[selectedLanguage] ?? UI_STRINGS["en"];
  const whoLabelMap: Record<string, string> = {
    "We are a family with kids": t.whoLabels.family,
    "We are a couple": t.whoLabels.couple,
    "I'm traveling solo": t.whoLabels.solo,
    "We are a group of friends": t.whoLabels.friends,
  };
  const catLabelMap: Record<string, string> = {
    water: t.catLabels.water, land: t.catLabels.land, air: t.catLabels.air,
    shows: t.catLabels.shows, rental: t.catLabels.rental,
  };
  const catSubMap: Record<string, string> = {
    water: t.catSubs.water, land: t.catSubs.land, air: t.catSubs.air,
    shows: t.catSubs.shows, rental: t.catSubs.rental,
  };

  useEffect(() => {
    // Check for existing session cookie to show "welcome back"
    setIsReturning(document.cookie.includes(SESSION_COOKIE));

    // Deep link from a tour page: /?book=<Tour Title> jumps straight into chat.
    // Restore language and who from the server-side session first, so a guest
    // who chatted in Russian and detoured through the catalogue isn't answered
    // in English on return.
    const bookParam = new URLSearchParams(window.location.search).get("book");
    if (bookParam) {
      setStep("chat");
      // sessionStorage covers the same-tab catalogue detour (set on language/who
      // selection); the server-side transcript covers a return in a fresh tab.
      const storedLang = sessionStorage.getItem("tfy_lang") ?? "";
      const storedWho = sessionStorage.getItem("tfy_who") ?? "";
      const start = (lang: string, whoValue: string) => {
        if (lang) setSelectedLanguage(lang);
        setWho(whoValue);
        sendToAI(`I'd like to book: ${bookParam}`, [], whoValue, lang);
      };
      if (storedLang || storedWho) {
        start(storedLang, storedWho || "Booking from tour page");
      } else {
        fetch("/api/session/transcript")
          .then((r) => r.json())
          .catch(() => ({}))
          .then((d) => {
            const lang = typeof d?.language === "string" && d.language ? d.language : "";
            const whoValue =
              typeof d?.who === "string" && d.who && d.who !== "Open chat"
                ? d.who
                : "Booking from tour page";
            start(lang, whoValue);
          });
      }
      return;
    }

    // Offer to resume a previous conversation (saved server-side by tfy_sid)
    fetch("/api/session/transcript")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages) && d.messages.length > 0) {
          setSavedTranscript({ messages: d.messages, who: d.who ?? "", language: d.language ?? "" });
          setIsReturning(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistTranscript(msgs: Message[], whoValue: string, langValue: string) {
    fetch("/api/session/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, who: whoValue, language: langValue }),
    }).catch(() => {});
  }

  function continueChat() {
    if (!savedTranscript) return;
    setMessages(savedTranscript.messages);
    setWho(savedTranscript.who);
    setSelectedLanguage(savedTranscript.language);
    setStep("chat");
  }

  function startFresh() {
    setSavedTranscript(null);
    fetch("/api/session/transcript", { method: "DELETE" }).catch(() => {});
    setStep("language");
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, step]);

  function handleLanguageSelect(lang: string) {
    setSelectedLanguage(lang);
    sessionStorage.setItem("tfy_lang", lang);
    setStep("menu");
  }

  async function handleMenuOption(id: "book" | "route" | "restaurant" | "culture" | "ask") {
    setMenuChoice(id);
    if (id === "book") {
      setStep("bookMode");
      return;
    }
    if (id === "ask") {
      // Open the chat with an empty input so the user can type their own question
      setStep("chat");
      setWho("Open chat");
      return;
    }
    setStep("chat");
    const whoValue = `Exploring: ${id}`;
    setWho(whoValue);
    await sendToAI(MENU_MESSAGES[id], [], whoValue, selectedLanguage, true);
  }

  function handleLanguageChange(lang: string) {
    if (step === "language") {
      handleLanguageSelect(lang);
    } else {
      setSelectedLanguage(lang);
      sessionStorage.setItem("tfy_lang", lang);
    }
  }

  function handleWho(option: { label: string; value: string }) {
    setWho(option.value);
    sessionStorage.setItem("tfy_who", option.value);
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
    await sendToAI(firstMessage, [], who, selectedLanguage, true);
  }

  async function handleOption(option: string, messageIndex: number) {
    setUsedOptions((prev) => new Set(prev).add(messageIndex));
    await sendToAI(option, messages);
  }

  async function sendToAI(userText: string, history: Message[] = [], whoValue?: string, langValue?: string, hidden = false) {
    if (sendingRef.current) return;
    sendingRef.current = true;

    const userMessage: Message = { role: "user", content: userText, hidden };
    const newMessages = [...history, userMessage];
    setMessages(newMessages);
    setLoading(true);

    const effectiveWho = whoValue ?? who;
    const effectiveLang = langValue ?? selectedLanguage;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          who: effectiveWho,
          language: effectiveLang,
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
      const finalMessages: Message[] = [
        ...newMessages,
        { role: "assistant", content: data.message, options: data.options, bookingText: data.bookingText, tourMedia: data.tourMedia, tourMediaList: data.tourMediaList, needsDate: data.needsDate, needsLicense: data.needsLicense, needsText: data.needsText, needsTime: data.needsTime, availableTimeSlots: data.availableTimeSlots, noSameDay: data.noSameDay },
      ];
      setMessages(finalMessages);
      persistTranscript(finalMessages, effectiveWho, effectiveLang);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Something went wrong. Try again.", options: [] },
      ]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
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
                {isReturning ? "Welcome back 👋" : "Your local AI friend"}
              </p>
            </div>

            <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
              {isReturning
                ? "Ready for your next adventure?"
                : "Boats, buggies, shows & more — find and book in under 60 seconds."}
            </p>

            {savedTranscript ? (
              <div className="w-full flex flex-col items-center gap-3">
                <button
                  onClick={continueChat}
                  className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-[1.02] shadow-xl shadow-orange-900/50 tracking-wide"
                >
                  Continue chat →
                </button>
                <button
                  onClick={startFresh}
                  className="text-white/80 hover:text-white text-sm font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
                >
                  Start new chat
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep("language")}
                className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-[1.02] shadow-xl shadow-orange-900/50 tracking-wide"
              >
                Find my experience →
              </button>
            )}

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
    <div ref={rootRef} className="flex flex-col h-screen text-white relative overflow-hidden bg-[#0d0d0d]">
      {/* Background photo */}
      <img
        src="/chat-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#0d0d0d]/45" />

      <header className="relative flex items-center gap-3 px-5 border-b border-white/8" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)", paddingBottom: "16px" }}>
        <button
          onClick={() => { if (messages.some((m) => !m.hidden)) setSavedTranscript({ messages, who, language: selectedLanguage }); setStep("hero"); setMessages([]); setUsedOptions(new Set()); setSelectedCategories([]); setWho(""); setLocation(""); setSelectedLanguage(""); setMenuChoice(null); setBookModeChoice(null); setShowCustomLocation(false); setCustomLocation(""); }}
          className="w-8 h-8 hover:scale-110 transition-transform flex-shrink-0"
        >
          <img src="/logo-mark.svg" alt="" className="w-full h-full" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-base leading-none tracking-tight">
            Tenerify<span className="text-orange-400">.ai</span>
          </h1>
          <p className="text-white/80 text-xs mt-0.5 font-medium">Your local AI friend</p>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Language selection */}
        {(step === "language" || step === "menu" || step === "who" || step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                ¿Qué idioma hablas?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                      selectedLanguage === lang.value
                        ? "bg-orange-500/20 border-orange-500 text-orange-300"
                        : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400"
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

        {/* Intro message + menu options */}
        {(step === "menu" || step === "who" || step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={MD_PLUGINS} components={MD_COMPONENTS}>{t.intro}</ReactMarkdown>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MENU_OPTIONS.map((opt) => {
                  const isSelected = menuChoice === opt.id;
                  const isLocked = step !== "menu";
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !isLocked && handleMenuOption(opt.id)}
                      disabled={isLocked}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all text-left ${
                        isLocked
                          ? isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-300 cursor-default"
                            : "bg-white/5 border-white/10 text-white/40 cursor-default"
                          : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                      }`}
                    >
                      {t.menuLabels[opt.id]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Book-mode fork: AI-assisted pick vs. browse the catalogue */}
        {menuChoice === "book" && (step === "bookMode" || step === "who" || step === "category" || step === "location" || step === "chat") && (() => {
          const bm = BOOK_MODE_TEXTS[selectedLanguage] ?? BOOK_MODE_TEXTS.en;
          const isLocked = step !== "bookMode";
          return (
            <div className="flex gap-3 max-w-xl mx-auto w-full">
              <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
                <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
              </div>
              <div className="space-y-3 flex-1">
                <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                  {bm.question}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { if (!isLocked) { setBookModeChoice("assist"); setStep("who"); } }}
                    disabled={isLocked}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all text-left ${
                      isLocked
                        ? bookModeChoice === "assist"
                          ? "bg-orange-500/20 border-orange-500 text-orange-300 cursor-default"
                          : "bg-white/5 border-white/10 text-white/40 cursor-default"
                        : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                    }`}
                  >
                    {bm.assist}
                  </button>
                  <a
                    href="/tours"
                    onClick={(e) => { if (isLocked) e.preventDefault(); else setBookModeChoice("catalog"); }}
                    aria-disabled={isLocked}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all text-left ${
                      isLocked
                        ? "bg-white/5 border-white/10 text-white/40 cursor-default pointer-events-none"
                        : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                    }`}
                  >
                    {bm.catalog}
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Who selection */}
        {menuChoice === "book" && (step === "who" || step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
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
        {menuChoice === "book" && (step === "category" || step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                {t.categoryQuestion}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  const isLocked = step === "location" || step === "chat";
                  return (
                    <button
                      key={cat.id}
                      onClick={() => !isLocked && toggleCategory(cat.id)}
                      disabled={isLocked}
                      className={`px-4 py-2.5 rounded-2xl border transition-all text-left ${
                        isLocked
                          ? isSelected
                            ? "bg-orange-500/20 border-orange-500 cursor-default"
                            : "bg-white/5 border-white/10 opacity-40 cursor-default"
                          : isSelected
                            ? "bg-orange-500/20 border-orange-500"
                            : "bg-white/8 border-white/15 hover:border-orange-500 cursor-pointer"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${isSelected ? "text-orange-300" : "text-white"}`}>
                        {cat.emoji} {catLabelMap[cat.id] ?? cat.label}
                      </div>
                      {catSubMap[cat.id] && (
                        <div className={`text-xs mt-0.5 ${isSelected ? "text-orange-200/90" : "text-white/75"}`}>
                          {catSubMap[cat.id]}
                        </div>
                      )}
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
        {menuChoice === "book" && (step === "location" || step === "chat") && (
          <div className="flex gap-3 max-w-xl mx-auto w-full">
            <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="bg-white/6 border border-white/12 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                {t.locationQuestion}
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                {(() => {
                  const isLocked = step === "chat";
                  const isSelected = showCustomLocation || (isLocked && location !== "" && !LOCATIONS.some(l => l.value === location));
                  return (
                    <button
                      onClick={() => !isLocked && setShowCustomLocation(true)}
                      disabled={isLocked}
                      className={`px-3 py-2.5 rounded-2xl text-sm font-medium border transition-all text-center ${
                        isLocked
                          ? isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-300 cursor-default"
                            : "bg-white/5 border-white/10 text-white/40 cursor-default"
                          : "bg-white/8 border-white/15 text-white hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                      }`}
                    >
                      {t.otherLabel}
                    </button>
                  );
                })()}
              </div>
              {showCustomLocation && step !== "chat" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder={t.otherPlaceholder}
                    className="flex-1 px-3 py-2.5 rounded-2xl text-sm bg-white/8 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => customLocation.trim() && handleLocationSelect(customLocation.trim())}
                    disabled={!customLocation.trim()}
                    className="px-4 py-2.5 rounded-2xl text-sm font-medium border border-orange-500 bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-all disabled:opacity-40"
                  >
                    {t.nextButton}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => msg.hidden ? null : (
          <div key={i} className={`msg-in flex gap-3 max-w-xl mx-auto w-full ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
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
                  <ReactMarkdown remarkPlugins={MD_PLUGINS} components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>

              {/* Tour media — one big card for a single tour, a photo collage for several */}
              {msg.role === "assistant" && (() => {
                const media = msg.tourMediaList?.length ? msg.tourMediaList : msg.tourMedia ? [msg.tourMedia] : [];
                if (media.length === 0) return null;

                if (media.length === 1) {
                  const m = media[0];
                  return (
                    <div className="rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
                      {m.videoUrl ? (
                        <iframe
                          src={m.videoUrl}
                          className="w-full aspect-video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : m.images?.length ? (
                        <div className="relative">
                          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {m.images.map((src, i) => (
                              <img
                                key={src}
                                src={src}
                                alt={`${m.title ?? ""} ${i + 1}`}
                                className="w-full flex-none snap-center aspect-video object-cover"
                              />
                            ))}
                          </div>
                          {m.images.length > 1 && (
                            <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                              1/{m.images.length} · swipe
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                // 2+ tours → photo collage of thumbnails, one per named tour
                return (
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {media.map((m, i) => {
                      const src = m.imageUrl || m.images?.[0];
                      if (!src) return null;
                      return (
                        <div key={(m.title ?? "") + i} className="relative rounded-xl overflow-hidden border border-white/10">
                          <img src={src} alt={m.title ?? ""} className="w-full aspect-video object-cover" />
                          {m.title && (
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent text-white text-[11px] font-medium leading-tight px-2 pt-4 pb-1.5 line-clamp-2">
                              {m.title}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Booking buttons */}
              {msg.role === "assistant" && msg.bookingText && (
                <BookingButtons bookingText={msg.bookingText} />
              )}

              {/* Date picker or quick-reply options */}
              {msg.role === "assistant" && i === lastAssistantIndex && !usedOptions.has(i) && !loading && (
                msg.needsDate ? (
                  <DatePicker noSameDay={msg.noSameDay} onSelect={(date) => {
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
                ) : msg.needsText ? (
                  // Free-text answer (e.g. ages of 2+ children) — no buttons, just the composer.
                  null
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
          <div className="msg-in flex gap-3 max-w-xl mx-auto w-full">
            <div className="flex-shrink-0 mt-1 w-7 h-7 rounded-full overflow-hidden">
              <img src="/logo-mark.svg" alt="" className="w-full h-full p-1" />
            </div>
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
      {step === "chat" && (
        <div className="relative px-4 pb-5 pt-3 border-t border-white/8">
          <div className="max-w-xl mx-auto flex gap-2 items-center">
            <input
              type="text"
              disabled={loading}
              placeholder={loading ? "Tenerify is typing…" : "Type a message..."}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  const val = e.currentTarget.value.trim();
                  e.currentTarget.value = "";
                  sendToAI(val, messages);
                }
              }}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 focus:border-orange-500 text-white placeholder-white/40 text-sm px-4 py-3 rounded-2xl focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              disabled={loading}
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                if (input?.value.trim()) {
                  const val = input.value.trim();
                  input.value = "";
                  sendToAI(val, messages);
                }
              }}
              className="bg-orange-500 hover:bg-orange-400 text-white p-3 rounded-2xl transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-orange-500"
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
