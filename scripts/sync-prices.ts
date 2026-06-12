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
    if (row.net !== "") {
      item.net = parseFloat(row.net);
      touched = true;
    }
    if (row.supplierId) {
      tour.supplierId = row.supplierId;
      touched = true;
    }
  }

  if (touched) updated++;
}

fs.writeFileSync(toursPath, JSON.stringify(tours, null, 2) + "\n");
console.log(`✓ Updated ${updated} tours, ${skipped} pricing items not found in CSV`);
