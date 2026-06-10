import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const DATA_DIR = path.join(process.cwd(), "data");

type CsvRow = {
  slug: string;
  name: string;
  category: string;
  net_adult: string;
  net_child: string;
  net_kid: string;
  pvp_adult: string;
  pvp_child: string;
  pvp_kid: string;
};

type Tour = {
  slug: string;
  priceFrom?: number;
  pricing?: { label: string; price: number }[];
  netPricing?: { adult?: number; child?: number; kid?: number };
  pvpPricing?: { adult?: number; child?: number; kid?: number };
  [key: string]: unknown;
};

const csvRaw = fs.readFileSync(path.join(DATA_DIR, "net-prices.csv"), "utf-8");
const rows: CsvRow[] = parse(csvRaw, { columns: true, skip_empty_lines: true });

const toursPath = path.join(DATA_DIR, "tours.json");
const tours: Tour[] = JSON.parse(fs.readFileSync(toursPath, "utf-8"));

const priceMap = new Map(rows.map((r) => [r.slug, r]));

let updated = 0;
let skipped = 0;

for (const tour of tours) {
  const row = priceMap.get(tour.slug);
  if (!row) {
    skipped++;
    continue;
  }

  const num = (v: string) => (v !== "" ? parseFloat(v) : undefined);

  const pvp = {
    adult: num(row.pvp_adult),
    child: num(row.pvp_child),
    kid: num(row.pvp_kid),
  };
  const net = {
    adult: num(row.net_adult),
    child: num(row.net_child),
    kid: num(row.net_kid),
  };

  if (pvp.adult !== undefined) {
    tour.pvpPricing = Object.fromEntries(
      Object.entries(pvp).filter(([, v]) => v !== undefined)
    );
    tour.netPricing = Object.fromEntries(
      Object.entries(net).filter(([, v]) => v !== undefined)
    );
    tour.priceFrom = pvp.adult;
  }

  updated++;
}

fs.writeFileSync(toursPath, JSON.stringify(tours, null, 2));
console.log(`✓ Updated ${updated} tours, skipped ${skipped} (not in tours.json)`);
