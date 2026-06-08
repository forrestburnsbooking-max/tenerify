import fs from "fs";
import path from "path";

let cache: Record<string, number> | null = null;

export function getNetPrices(): Record<string, number> {
  if (cache) return cache;

  try {
    const filePath = path.join(process.cwd(), "data", "net-prices.csv");
    const csv = fs.readFileSync(filePath, "utf-8");
    const lines = csv.trim().split("\n").slice(1); // skip header
    const prices: Record<string, number> = {};

    for (const line of lines) {
      const [slug, , netStr] = line.split(",");
      const net = parseFloat(netStr ?? "");
      if (slug && !isNaN(net) && net > 0) {
        prices[slug.trim()] = net;
      }
    }

    cache = prices;
    return prices;
  } catch {
    return {};
  }
}

export function getCommission(slug: string, pvpTotal: number): { net: number; commission: number; percent: number } | null {
  const prices = getNetPrices();
  const netPerVehicle = prices[slug];
  if (!netPerVehicle) return null;

  // pvpTotal is the full amount charged. Use same ratio to estimate net total.
  // For simplicity: net = netPerVehicle, commission = pvpTotal - net
  const commission = pvpTotal - netPerVehicle;
  const percent = Math.round((commission / pvpTotal) * 100);
  return { net: netPerVehicle, commission, percent };
}
