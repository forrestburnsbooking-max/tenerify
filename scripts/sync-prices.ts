import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const DATA_DIR = path.join(process.cwd(), "data");

type CsvRow = {
  slug: string;
  label: string;
  supplierId: string;
  pvp: string;
  net: string;
};

type PricingItem = { label: string; price: number; net?: number };

type Tour = {
  slug: string;
  pricing: PricingItem[];
  supplierId?: string;
  [key: string]: unknown;
};

const csvRaw = fs.readFileSync(path.join(DATA_DIR, "net-prices.csv"), "utf-8");
const rows: CsvRow[] = parse(csvRaw, { columns: true, skip_empty_lines: true });

const toursPath = path.join(DATA_DIR, "tours.json");
const tours: Tour[] = JSON.parse(fs.readFileSync(toursPath, "utf-8"));

const rowMap = new Map(rows.map((r) => [`${r.slug}::${r.label}`, r]));

let updated = 0;
let skipped = 0;

for (const tour of tours) {
  let touched = false;

  for (const item of tour.pricing) {
    const row = rowMap.get(`${tour.slug}::${item.label}`);
    if (!row) {
      skipped++;
      continue;
    }
    if (row.pvp !== "") {
      item.price = parseFloat(row.pvp);
      touched = true;
    }
    if (row.net !== "") {
      item.net = parseFloat(row.net);
      touched = true;
    }
    if (row.supplierId) {
      tour.supplierId = row.supplierId;
      touched = true;
    }
  }

  // priceFrom = lowest non-zero tier price — the true "from €X" (ignores free baby tiers)
  const positive = tour.pricing.map((p) => p.price).filter((p) => p > 0);
  if (positive.length) tour.priceFrom = Math.min(...positive);

  if (touched) updated++;
}

fs.writeFileSync(toursPath, JSON.stringify(tours, null, 2) + "\n");
console.log(`✓ Updated ${updated} tours, ${skipped} pricing items not found in CSV`);

// Margin check — surface likely typos (net at/above price, or a very thin margin)
const warnings: string[] = [];
for (const tour of tours) {
  for (const item of tour.pricing) {
    if (item.net == null || item.price <= 0) continue;
    const margin = item.price - item.net;
    if (item.net > item.price) {
      warnings.push(`  🔴 ${tour.slug} / ${item.label}: net €${item.net} > price €${item.price} — selling BELOW cost!`);
    } else if (margin < item.price * 0.15) {
      warnings.push(`  ⚠️  ${tour.slug} / ${item.label}: thin margin €${margin.toFixed(2)} (price €${item.price}, net €${item.net})`);
    }
  }
}
if (warnings.length) {
  console.log(`\n⚠️  Margin check — ${warnings.length} tier(s) to review (confirm these are intentional):`);
  console.log(warnings.join("\n"));
} else {
  console.log("✓ Margin check: all tiers have a healthy margin");
}
