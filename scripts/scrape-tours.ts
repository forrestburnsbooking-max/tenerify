/**
 * Full catalog crawler for excursionstenerife.es
 * Discovers all tours from sitemap, scrapes rich data from each page.
 * Run: npx tsx scripts/scrape-tours.ts
 * Cron: 0 7 * * 1 (weekly on Monday)
 */

import fs from "fs";
import path from "path";

export type PricingOption = {
  label: string;
  price: number;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type Tour = {
  slug: string;
  title: string;
  category: string;
  duration?: string;
  languages?: string[];
  minAge?: number;
  pricing: PricingOption[];
  priceFrom: number;
  description: string;
  included?: string;
  notIncluded?: string;
  meetingPoint?: string;
  faq: FaqItem[];
  imageUrl?: string;
  videoUrl?: string;
  url: string;
};

const BASE = "https://www.excursionstenerife.es";
const DELAY_MS = 900;
const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };

// Category detection from slug + title keywords
const CATEGORY_RULES: [RegExp, string][] = [
  [/buggy/, "buggy"],
  [/quad/, "quad"],
  [/jet.?ski|jetski/, "jetski"],
  [/catamaran|yacht|boat|sail|fishing|charter|submarine|rib|flipper|vessel|catamaran/, "boat"],
  [/loro.?parque|siam.?park|jungle.?park|aqualand|camel.?park|2parks|twin.?ticket/, "park"],
  [/helicopter|helidream/, "adventure"],
  [/paraglid|parasc|airsoft|karting|kayak|sup|stand.?up|paddle|diving|banana|fly.?fish|booster|watersport/, "adventure"],
  [/bike|cycling/, "adventure"],
  [/flamenco|medieval|scandal|dinner.?show|music.?hall|history|evolution/, "show"],
  [/car.?rental|rental|scooter|tuk.?tuk/, "rental"],
  [/la.?gomera|gran.?canaria|la.?palma|teide|masca|gomera|santa.?cruz|laguna|anaga|puerto.?cruz|garachico|icod/, "excursion"],
  [/spa|aqua.?club|termal/, "wellness"],
  [/horse|hipico|equestrian/, "adventure"],
  [/party|pool.?party/, "show"],
];

function detectCategory(slug: string, title: string): string {
  const text = `${slug} ${title}`.toLowerCase();
  for (const [pattern, cat] of CATEGORY_RULES) {
    if (pattern.test(text)) return cat;
  }
  return "other";
}

function strip(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Extractors ---

function extractTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return strip(h1[1]).replace(/・/g, " — ");
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return title[1].replace(/\s*[-|].*$/, "").trim();
  return "";
}

function extractDescription(html: string): string {
  // All richtext blocks — first narrative one (not the info/spec block)
  const blocks = [...html.matchAll(/class="[^"]*w-richtext[^"]*"[^>]*>([\s\S]{50,3000}?)<\/div>/gi)];
  for (const b of blocks) {
    const text = strip(b[1]).replace(/[￣‾]+/g, " | ").replace(/\s{2,}/g, " ").trim();
    // Skip blocks that look like spec sheets (mostly "Duration - X | Included: Y")
    if (text.length > 80 && !/^Duration\s*-/.test(text)) return text.slice(0, 500);
  }
  const meta = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  if (meta) return meta[1];
  return "";
}

function extractPricing(html: string): { pricing: PricingOption[]; priceFrom: number } {
  const pricing: PricingOption[] = [];

  // Main price from info-pay-txt-span: "180 €" or "from 60 €"
  const mainSpan = html.match(/info-pay-txt-span[^>]*>\s*(?:from\s+)?(\d+(?:[.,]\d+)?)\s*€/i);

  // Detailed options: "Adult - 60 €", "2 seat buggy - 180€", "Children (4-14) - 30 €"
  const optionPattern = /([A-Za-z][^<\n]{2,50}?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*€/g;
  const richBlock = html.match(/class="[^"]*w-richtext[^"]*"[^>]*>([\s\S]{0,3000}?)<\/div>/i);
  const searchArea = richBlock ? richBlock[1] : html;

  let m;
  const seen = new Set<string>();
  while ((m = optionPattern.exec(searchArea)) !== null) {
    const label = strip(m[1]).replace(/^[•·\-\s]+/, "").trim();
    const price = parseFloat(m[2].replace(",", "."));
    if (label.length > 1 && label.length < 60 && price > 0 && price < 5000 && !seen.has(label)) {
      seen.add(label);
      pricing.push({ label, price });
    }
  }

  // Determine priceFrom
  let priceFrom = 0;
  if (pricing.length > 0) {
    priceFrom = Math.min(...pricing.map((p) => p.price));
  } else if (mainSpan) {
    priceFrom = parseFloat(mainSpan[1].replace(",", "."));
  }

  // If no structured options found, create one from main price
  if (pricing.length === 0 && priceFrom > 0) {
    pricing.push({ label: "Per person", price: priceFrom });
  }

  return { pricing, priceFrom };
}

function extractDuration(html: string): string | undefined {
  const m = html.match(/(\d+(?:[.,]\d+)?)\s*(?:hr|hour|hora|h)\b/i);
  if (m) return `${m[1]}h`;
  const m2 = html.match(/(\d+)\s*(?:day|día|days)/i);
  if (m2) return `${m2[1]} day${parseInt(m2[1]) > 1 ? "s" : ""}`;
  return undefined;
}

function extractLanguages(html: string): string[] {
  const langBlock = html.match(/class="[^"]*info[^"]*"[^>]*>([^<]{20,200}?(?:English|Español|Deutsch|Русский|Français)[^<]{0,200})<\/[^>]+>/i);
  if (langBlock) {
    return langBlock[1]
      .split(/[,，\s]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && /^[A-Za-zÀ-ÿА-я]+$/.test(l));
  }
  return [];
}

function extractMinAge(html: string): number | undefined {
  // "minimum age: 18", "must be 18 years", "People under 18"
  const m =
    html.match(/(?:minimum\s+age|min(?:imum)?\s*age)[^>]*?:?\s*(\d+)/i) ||
    html.match(/must\s+be\s+(\d+)\s+years/i) ||
    html.match(/under\s+(\d+)\s+years?\s+(?:of\s+age\s+)?(?:are\s+)?(?:prohibited|not\s+allowed)/i) ||
    html.match(/age\s+(?:limit|restriction)[^>]*?:?\s*(\d+)/i) ||
    html.match(/(?:must\s+hold|required)\s+(?:a\s+)?driver'?s?\s+licen[cs]e.*?(\d+)\s+years/i);
  if (m) return parseInt(m[1]);
  return undefined;
}

function extractIncluded(html: string): string | undefined {
  // "Included: </strong></p><p>Fuel, guide, ..." — value is in next <p> after the label
  const m = html.match(/[Ii]ncluded[:\s]*<\/strong><\/p><p>([\s\S]*?)<\/p>/);
  if (m) {
    const text = strip(m[1]).trim();
    if (text.length > 3 && !text.startsWith("￣")) return text.slice(0, 300);
  }
  // Fallback: same line "Included: value"
  const m2 = html.match(/[Ii]ncluded:\s*([^<￣\n]{5,200})/);
  if (m2) return strip(m2[1]).trim().slice(0, 300);
  return undefined;
}

function extractNotIncluded(html: string): string | undefined {
  const m = html.match(/not\s+included[^:]*:?\s*<\/[^>]+>([\s\S]{10,400}?)(?:<h\d|<\/section)/i);
  if (m) {
    const text = strip(m[1]).replace(/^[:\s]+/, "");
    if (text.length > 5) return text.slice(0, 300);
  }
  return undefined;
}

function extractMeetingPoint(html: string): string | undefined {
  // Text node "Starts from our base, located in the industrial estate of Las Chafiras"
  const m =
    html.match(/>([^<]*(?:[Ss]tarts?\s+from|[Mm]eeting\s+point\s*:)[^<]{5,150})</) ||
    html.match(/>([^<]*[Dd]eparture\s+(?:point|from)[^<]{5,100})</);
  if (m) return strip(m[1]).slice(0, 150);
  return undefined;
}

function extractFaq(html: string): FaqItem[] {
  const faqs: FaqItem[] = [];
  // Site uses class="faq_component..." divs containing Q+A as plain text
  const blocks = [...html.matchAll(/class="faq_component[^"]*"[^>]*>([\s\S]{10,1000}?)<\/div>\s*<\/div>/gi)];
  for (const b of blocks.slice(0, 8)) {
    const text = strip(b[1]);
    if (text.length < 10) continue;
    // Split on question mark — everything before "?" is the question
    const qEnd = text.indexOf("?");
    if (qEnd > 5 && qEnd < 200) {
      const question = text.slice(0, qEnd + 1).trim();
      const answer = text.slice(qEnd + 1).trim();
      if (question && answer) faqs.push({ question, answer: answer.slice(0, 400) });
    }
  }
  return faqs;
}

function extractImageUrl(html: string): string | undefined {
  // Hero image: first .webp or .jpg from the tour content CDN folder, excluding responsive variants
  const TOUR_CDN = "664b7dd803941967e876905a";
  const imgs = [...html.matchAll(
    new RegExp(`https://cdn\\.prod\\.website-files\\.com/${TOUR_CDN}/([^"'\\s]{10,200}\\.(?:webp|jpg|jpeg))`, "g")
  )];
  for (const m of imgs) {
    const url = m[0];
    // Skip responsive variants (-p-500, -p-800, -p-1080, -p-1600)
    if (/-p-\d+\./.test(url)) continue;
    return url;
  }
  return undefined;
}

function extractVideoUrl(html: string): string | undefined {
  // YouTube embed
  const yt = html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = html.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return undefined;
}

// --- Sitemap discovery ---

async function discoverSlugs(): Promise<string[]> {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: HEADERS });
  const xml = await res.text();
  const matches = [...xml.matchAll(/excursionstenerife\.es\/tours\/([^<\s]+)/g)];
  return matches.map((m) => m[1]).filter(Boolean);
}

// --- Per-tour scraper ---

async function scrapeTour(slug: string): Promise<Tour | null> {
  const url = `${BASE}/tours/${slug}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  ✗ ${slug} → HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();

    const title = extractTitle(html);
    if (!title) {
      console.warn(`  ✗ ${slug} → no title`);
      return null;
    }

    const { pricing, priceFrom } = extractPricing(html);
    const category = detectCategory(slug, title);
    const description = extractDescription(html);
    const duration = extractDuration(html);
    const languages = extractLanguages(html);
    const minAge = extractMinAge(html);
    const included = extractIncluded(html);
    const notIncluded = extractNotIncluded(html);
    const meetingPoint = extractMeetingPoint(html);
    const faq = extractFaq(html);
    const imageUrl = extractImageUrl(html);
    const videoUrl = extractVideoUrl(html);

    return {
      slug,
      title,
      category,
      duration,
      languages: languages.length ? languages : undefined,
      minAge,
      pricing,
      priceFrom,
      description,
      included,
      notIncluded,
      meetingPoint,
      faq,
      imageUrl,
      videoUrl,
      url,
    };
  } catch (e) {
    console.warn(`  ✗ ${slug} → error:`, e);
    return null;
  }
}

// --- Main ---

async function main() {
  console.log("Discovering tours from sitemap...");
  const slugs = await discoverSlugs();
  console.log(`Found ${slugs.length} tours\n`);

  const tours: Tour[] = [];
  let failed = 0;

  for (const slug of slugs) {
    process.stdout.write(`  ${slug}...`);
    const tour = await scrapeTour(slug);
    if (tour) {
      tours.push(tour);
      const priceStr = tour.priceFrom ? `from €${tour.priceFrom}` : "no price";
      console.log(` ✓  [${tour.category}] ${tour.title.slice(0, 50)} — ${priceStr}`);
    } else {
      failed++;
    }
    await sleep(DELAY_MS);
  }

  // Sort by category then title
  tours.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  const outputPath = path.join(process.cwd(), "data", "tours.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(tours, null, 2));

  console.log(`\n✅ Saved ${tours.length} tours (${failed} failed) → data/tours.json`);

  // Print category summary
  const cats: Record<string, number> = {};
  for (const t of tours) cats[t.category] = (cats[t.category] ?? 0) + 1;
  console.log("\nBy category:");
  for (const [cat, count] of Object.entries(cats).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch(console.error);
