// Episode scripts for the "How I built Tenerify" reel series.
//
// Each episode is authored here as ordered narration LINES (Russian voiceover +
// on-screen caption) tagged by ACT. The build script (scripts/build-episode.ts)
// turns a line's `vo` into TTS audio, measures its real duration, and lays the
// captions + act visuals onto a timeline — so the video length follows the
// narration automatically. Nothing here needs manual timing.

export type Act = "hook" | "sprint" | "payoff" | "cta";

export type EpisodeLine = {
  act: Act;
  /** Text spoken by the TTS voiceover. */
  vo: string;
  /** Short on-screen caption (subtitle). Kept punchier than the VO. */
  caption: string;
};

export type EpisodeScript = {
  no: number;
  total: number;
  /** Internal title, not shown on screen. */
  title: string;
  /** Human date label shown in the terminal act, e.g. "7 июня 2026". */
  dateLabel: string;
  /** Git window the "sprint" act visualises (inclusive local day bounds). Used
   *  only in the default "day" sprint mode. */
  gitSince: string;
  gitUntil: string;
  /** Keywords → the commit subjects to highlight in the git-log scroll. */
  highlightKeywords: string[];
  /** "day" (default) = all commits of one day + ticking clock. "curated" =
   *  hand-picked commits (by subject substring) across dates. */
  sprintMode?: "day" | "curated";
  /** Curated mode: commit subject substrings to pull from the full history. */
  sprintCommits?: string[];
  /** HUD label under the commit counter (defaults to "КОММИТОВ ЗА ДЕНЬ"). */
  sprintLabel?: string;
  /** If set, the hook act shows this mocked (wrong) AI chat message. */
  hookChat?: string;
  /** If set, the hook act plays this real clip full-screen (path under public/). */
  hookVideo?: string;
  lines: EpisodeLine[];
};

// Titles of all 10 planned episodes — used to tease the NEXT episode on the
// outro card even before that episode is fully authored in EPISODES below.
export const SERIES_TITLES: Record<number, string> = {
  1: "Платформа за один день",
  2: "Мой AI начал раздавать деньги",
  3: "Ад ценообразования",
  4: "Охота за настоящими фото",
  5: "Скидка как оружие",
  6: "Врать нельзя, доверять",
  7: "8 языков за вечер",
  8: "Чтобы меня советовал даже ChatGPT",
  9: "Уже не только туры",
  10: "Инструмент, что снимает рилсы про себя",
};

// English series titles (outro teaser for the EN edition).
export const SERIES_TITLES_EN: Record<number, string> = {
  1: "A platform in one day",
  2: "My AI started giving away money",
  3: "Pricing hell",
  4: "Hunting real photos",
  5: "The discount weapon",
  6: "Trust, verified",
  7: "8 languages in one evening",
  8: "So even ChatGPT recommends me",
  9: "Beyond the tours",
  10: "The tool that films itself",
};

// English edition. VO rules: brand is spelled «Tenerifai» (forces the
// verify/amplify rhyme), complete falling sentences, no dash-fragments.
export const EPISODES_EN: Record<number, EpisodeScript> = {
  0: {
    no: 0,
    total: 10,
    title: "Trailer",
    dateLabel: "summer 2026",
    gitSince: "2026-06-07T00:00",
    gitUntil: "2026-07-09T23:59",
    sprintMode: "curated",
    sprintLabel: "221 COMMITS IN A MONTH",
    sprintCommits: [
      "Initial commit",
      "Add Stripe Checkout",
      "Swedish, Ukrainian, Chinese",
      "Culture agenda",
    ],
    highlightKeywords: ["Initial commit", "Stripe", "language", "events"],
    hookVideo: "reels/face/IMG_6700.MOV",
    lines: [
      {
        act: "hook",
        vo: "Welcome! I recently moved to Tenerife and, looking for a new challenge, took a job selling excursions.",
        caption: "Selling excursions in Tenerife",
      },
      {
        act: "sprint",
        vo: "On the side, I got hooked on vibe-coding. It felt boring at first. Turns out it's one hell of a drug.",
        caption: "Vibe-coding: one hell of a drug",
      },
      {
        act: "sprint",
        vo: "I built Tenerifai to sell excursions without leaving my couch.",
        caption: "Tenerify: selling from the couch",
      },
      {
        act: "payoff",
        vo: "And it ended up becoming a full-blown AI guide to Tenerife.",
        caption: "A full-blown AI guide",
      },
      {
        act: "cta",
        vo: "That's what my AI series is about. It's made entirely with AI, and the script is the project's real commit history. Follow me so you don't miss it!",
        caption: "AI series · Trailer",
      },
    ],
  },

  1: {
    no: 1,
    total: 10,
    title: "A platform in one day",
    dateLabel: "June 7, 2026",
    gitSince: "2026-06-07T00:00",
    gitUntil: "2026-06-07T23:59",
    highlightKeywords: ["Initial commit", "Stripe Checkout", "ticket generation", "photos to tours", "Tighten AI response"],
    hookVideo: "reels/face/IMG_6700.MOV",
    lines: [
      { act: "hook", vo: "I took a job selling excursions in Tenerife. Then a bot replaced me. My own bot.", caption: "A bot replaced me" },
      { act: "hook", vo: "On June seventh I opened an empty folder and decided to automate myself.", caption: "June 7: an empty folder" },
      { act: "sprint", vo: "In one day I made sixteen commits. By the evening the bot was selling on its own: picking tours, showing photos, taking card payments.", caption: "16 commits — the bot sells itself" },
      { act: "sprint", vo: "Where do the excursions come from? From my own job. These are the exact tours I sell at the stand. I know every operator personally.", caption: "Tours from my day job" },
      { act: "payoff", vo: "That's how Tenerifai was born. No ads, no subscriptions. A real business that earns on a real service.", caption: "A real business + AI" },
      { act: "cta", vo: "That was part one of my vibe-coding series. Next, I'll show you how my bot almost gave all my money away to tourists. Follow me so you don't miss it!", caption: "How I built Tenerify.ai · 1 / 10" },
    ],
  },

  2: {
    no: 2,
    total: 10,
    title: "My AI started giving away money",
    dateLabel: "June 2026",
    gitSince: "2026-06-12T00:00",
    gitUntil: "2026-06-22T23:59",
    sprintMode: "curated",
    sprintLabel: "HOW I SAVED THE BOT FROM ITSELF",
    sprintCommits: ["Stop AI from redirecting cash-only customers", "Stop AI from inventing free child tickets", "Make the bot close, not browse", "Add bot discount capability"],
    highlightKeywords: ["Stop AI", "Make the bot close", "bot discount capability"],
    hookChat: "Sure! Kids go completely free 🎁 Shall I book?",
    lines: [
      { act: "hook", vo: "My artificial intelligence, Tenerifai, once decided to give tourists free tickets.", caption: "The AI gave away free tickets" },
      { act: "sprint", vo: "First, it invented free children's tickets that don't even exist.", caption: "Invented free tickets" },
      { act: "sprint", vo: "Then it started sending paying customers to book somewhere else.", caption: "Sent clients to competitors" },
      { act: "sprint", vo: "I literally had to teach it to sell, and not to go broke.", caption: "Teaching the bot to sell" },
      { act: "payoff", vo: "Now it offers a discount and closes the deal on its own. Politely and to the point.", caption: "It offers a discount and closes" },
      { act: "cta", vo: "That was part two. Next up is pricing hell. Follow me so you don't miss the next episode of my vibe-coding series!", caption: "How I built Tenerify.ai · 2 / 10" },
    ],
  },

  3: {
    no: 3,
    total: 10,
    title: "Pricing hell",
    dateLabel: "June 2026",
    gitSince: "2026-06-08T00:00",
    gitUntil: "2026-06-17T23:59",
    sprintMode: "curated",
    sprintLabel: "PRICING HELL",
    sprintCommits: ["Fix buggy pricing: all buggies are per vehicle", "resident discount prices instead of tourist PVP", "Make net-prices.csv the single source", "Add margin check to sync-prices"],
    highlightKeywords: ["buggy pricing", "resident discount", "single source", "margin check"],
    hookChat: "🎢 Siam Park — just €22! Shall I book? 🔥",
    lines: [
      { act: "hook", vo: "One day I realized a simple thing. I was selling tours for less than I bought them.", caption: "Selling below cost" },
      { act: "sprint", vo: "A buggy is priced per vehicle, not per person. My bot thought the opposite.", caption: "Per vehicle ≠ per person" },
      { act: "sprint", vo: "For the parks, the bot showed resident prices. Every sale to a tourist put me in the red.", caption: "Resident prices to tourists" },
      { act: "sprint", vo: "I put all the prices into one file and taught the bot to check the margin.", caption: "One price file + margin check" },
      { act: "payoff", vo: "Now Tenerifai double-checks every price by itself. Mistakes get caught before the sale, not after.", caption: "Caught before the sale" },
      { act: "cta", vo: "That was part three. Next, I'll show you how I hunted down real photos of every boat. Follow me so you don't miss the next episode of my vibe-coding series!", caption: "How I built Tenerify.ai · 3 / 10" },
    ],
  },
};

export const EPISODES: Record<number, EpisodeScript> = {
  // Трейлер: личная история основателя, его собственными словами.
  0: {
    no: 0,
    total: 10,
    title: "Трейлер",
    dateLabel: "лето 2026",
    gitSince: "2026-06-07T00:00",
    gitUntil: "2026-07-09T23:59",
    sprintMode: "curated",
    sprintLabel: "221 КОММИТ ЗА МЕСЯЦ",
    sprintCommits: [
      "Initial commit",
      "Add Stripe Checkout",
      "Swedish, Ukrainian, Chinese",
      "Culture agenda",
    ],
    highlightKeywords: ["Initial commit", "Stripe", "language", "events"],
    // Реальное видео: он за стойкой продажи экскурсий на набережной.
    hookVideo: "reels/face/IMG_6700.MOV",
    lines: [
      {
        act: "hook",
        vo: "Добро пожаловать. Недавно я переехал на Тэнэрифэ и в поисках новых челленджей устроился продавцом экскурсий.",
        caption: "Продавец экскурсий на Тенерифе",
      },
      {
        act: "sprint",
        vo: "Параллельно я подсел на вайб-кодинг. Сначала было скучновато. Но оказалось, это нихеровый наркотик.",
        caption: "Вайбкодинг — нихеровый наркотик",
      },
      {
        act: "sprint",
        vo: "Я создал приложение Тенерифай, чтобы продавать экскурсии не вставая с дивана.",
        caption: "Продавать не вставая с дивана",
      },
      {
        act: "payoff",
        vo: "А закончилось всё полноценным эйайгидом по Тэнэрифэ.",
        caption: "Полноценный AI-гид по Тенерифе",
      },
      {
        act: "cta",
        vo: "Именно об этом мой эйайсериал. Он полностью сделан с помощью ИИ, а сценарием стала настоящая история коммитов проекта. Подписывайся, чтобы не пропустить!",
        caption: "Сериал про вайбкодинг · Трейлер",
      },
    ],
  },

  1: {
    no: 1,
    total: 10,
    title: "Платформа за один день",
    dateLabel: "7 июня 2026",
    gitSince: "2026-06-07T00:00",
    gitUntil: "2026-06-07T23:59",
    highlightKeywords: [
      "Initial commit",
      "Stripe Checkout",
      "ticket generation",
      "photos to tours",
      "Tighten AI response",
    ],
    // Легенда: он реально продаёт экскурсии на набережной — и автоматизировал сам себя.
    hookVideo: "reels/face/IMG_6700.MOV",
    lines: [
      {
        act: "hook",
        vo: "Я устроился продавцом экскурсий на Тэнэрифэ. А потом меня заменил бот. Мой собственный.",
        caption: "Меня заменил мой же бот",
      },
      {
        act: "hook",
        vo: "Седьмого июня я открыл пустую папку и решил заавтоматизировать сам себя.",
        caption: "7 июня: пустая папка",
      },
      {
        act: "sprint",
        vo: "За день я сделал шестнадцать коммитов. К вечеру бот уже продавал сам: подбирал туры, показывал фото, принимал оплату картой.",
        caption: "16 коммитов — бот продаёт сам",
      },
      {
        act: "sprint",
        vo: "Откуда экскурсии? С моей же работы. Это те самые туры, что я продаю на стойке. Я знаю каждого оператора лично.",
        caption: "Экскурсии — с моей работы",
      },
      {
        act: "payoff",
        vo: "Так родился Тенерифай. Без рекламы и без подписок. Реальный бизнес, который зарабатывает на реальной услуге.",
        caption: "Реальный бизнес + AI",
      },
      {
        act: "cta",
        vo: "Это была часть первая сериала про вайб-кодинг. В следующей расскажу, как мой бот чуть не раздал туристам все деньги. Подписывайся, чтобы не пропустить.",
        caption: "Как я собрал Tenerify.ai · 1 / 10",
      },
    ],
  },

  2: {
    no: 2,
    total: 10,
    title: "Мой AI начал раздавать деньги",
    dateLabel: "июнь 2026",
    gitSince: "2026-06-12T00:00",
    gitUntil: "2026-06-22T23:59",
    sprintMode: "curated",
    sprintLabel: "КАК Я СПАСАЛ БОТА ОТ САМОГО СЕБЯ",
    sprintCommits: [
      "Stop AI from redirecting cash-only customers",
      "Stop AI from inventing free child tickets",
      "Make the bot close, not browse",
      "Add bot discount capability",
    ],
    highlightKeywords: [
      "Stop AI",
      "Make the bot close",
      "bot discount capability",
    ],
    hookChat: "Конечно! Детям — совершенно бесплатно 🎁 Бронирую?",
    lines: [
      {
        act: "hook",
        vo: "Мой искусственный интеллект по имени Тенерифай однажды решил раздавать туристам билеты бесплатно.",
        caption: "AI раздавал бесплатные билеты",
      },
      {
        act: "sprint",
        vo: "Сначала он выдумывал детям билеты, которых не существует.",
        caption: "Выдумывал бесплатные билеты",
      },
      {
        act: "sprint",
        vo: "Потом отправлял платящих клиентов бронировать на другие сайты.",
        caption: "Сливал клиентов конкурентам",
      },
      {
        act: "sprint",
        vo: "Пришлось буквально учить его продавать, а не разоряться.",
        caption: "Учу бота продавать",
      },
      {
        act: "payoff",
        vo: "Теперь он сам предлагает скидку и закрывает сделку — вежливо и по делу.",
        caption: "Сам предлагает скидку и закрывает",
      },
      {
        act: "cta",
        vo: "Это была часть вторая. Дальше расскажу про ад ценообразования. Подписывайся, чтобы не пропустить следующую серию моего сериала про вайб-кодинг.",
        caption: "Как я собрал Tenerify.ai · 2 / 10",
      },
    ],
  },

  3: {
    no: 3,
    total: 10,
    title: "Ад ценообразования",
    dateLabel: "июнь 2026",
    gitSince: "2026-06-08T00:00",
    gitUntil: "2026-06-17T23:59",
    sprintMode: "curated",
    sprintLabel: "АД ЦЕНООБРАЗОВАНИЯ",
    sprintCommits: [
      "Fix buggy pricing: all buggies are per vehicle",
      "resident discount prices instead of tourist PVP",
      "Make net-prices.csv the single source",
      "Add margin check to sync-prices",
    ],
    highlightKeywords: ["buggy pricing", "resident discount", "single source", "margin check"],
    hookChat: "🎢 Сиам Парк — всего 22€! Бронирую? 🔥",
    lines: [
      {
        act: "hook",
        vo: "Однажды я понял простую вещь. Я продаю туры дешевле, чем покупаю их сам.",
        caption: "Продавал дешевле закупки",
      },
      {
        act: "sprint",
        vo: "Аренда багги стоит за машину, а не за человека. Мой бот считал наоборот.",
        caption: "За машину ≠ за человека",
      },
      {
        act: "sprint",
        vo: "Паркам бот показывал цены для местных. Каждая продажа туристу уходила мне в минус.",
        caption: "Цены для местных — туристам",
      },
      {
        act: "sprint",
        vo: "Я собрал все цены в один файл и научил бота проверять наценку.",
        caption: "Один файл цен + проверка наценки",
      },
      {
        act: "payoff",
        vo: "Теперь Тенерифай сверяет каждую цену сам. Ошибка ловится до продажи, а не после.",
        caption: "Ошибка ловится до продажи",
      },
      {
        act: "cta",
        vo: "Это была часть третья. Дальше расскажу, как я добывал настоящие фото лодок. Подписывайся, чтобы не пропустить следующую серию сериала про вайб-кодинг.",
        caption: "Как я собрал Tenerify.ai · 3 / 10",
      },
    ],
  },
};
