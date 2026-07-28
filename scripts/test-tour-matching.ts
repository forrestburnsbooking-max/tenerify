/**
 * Checks findTourByName() — the checkout fallback that resolves a tour from the
 * free-text name in [BOOK_NOW: ...]. A wrong match puts the wrong photo, meeting
 * point and deposit rule on a real booking, so every exact catalogue title must
 * resolve to itself and shortened names must resolve or fail closed, never to a
 * neighbouring tour.
 */
import { getAllTours, findTourByName } from "../lib/tours";

const tours = getAllTours();
let failures = 0;

console.log(`== exact titles (${tours.length}) ==`);
for (const t of tours) {
  const got = findTourByName(t.title);
  if (got?.slug !== t.slug) {
    failures++;
    console.log(`  FAIL ${t.slug} -> ${got?.slug ?? "null"}`);
  }
}
console.log(failures === 0 ? "  all exact titles OK" : `  ${failures} exact-title failures`);

// Names the way the AI actually writes them into BOOK_NOW: shortened, reordered,
// missing the parenthetical. null = acceptable (fails closed); a different slug
// is a real failure.
const shortened: [string, string | null][] = [
  ["Lady Sunshine private charter", "lady-sunshine-private-charter"],
  ["Lady Sunshine — Private sailing yacht charter (Bavaria 55)", "lady-sunshine-private-charter"],
  ["Lady Sunshine", "lady-sunshine-private-charter"],
  ["Armani private charter", "armani-private-charter"],
  ["Champagne private boat charter", "champagne-premium-charter"],
  ["Champagne shared boat trip", "champagne-shared-trip"],
  ["Jet Ski Safari Las Galletas", "jetski-las-galletas"],
  ["VW Polo Automatic — Car Rental", "vw-polo-automatic-car-rental"],
  ["VW Polo — Car Rental", "vw-polo-car-rental"],
  ["Seat Leon ST Automatic car rental", "seat-leon-st-automatic-car-rental"],
  ["Loro Parque tickets", "loro-parque"],
  ["Teide by night", "teide-by-night"],
];

console.log("\n== shortened / AI-written names ==");
for (const [name, want] of shortened) {
  const got = findTourByName(name)?.slug ?? null;
  const ok = got === want || (want !== null && got === null);
  const note = got === null && want !== null ? " (fails closed — acceptable)" : "";
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${JSON.stringify(name)} -> ${got}${note}`);
}

console.log(`\n${failures === 0 ? "PASS" : `FAIL (${failures})`}`);
process.exit(failures === 0 ? 0 : 1);
