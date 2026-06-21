// Per-tour "what to bring / how to dress" instructions shown to the customer
// after booking (ticket + confirmation page).
//
// Resolution order in getPrepInstructions():
//   1. a per-tour override (tour.prep in tours.json) — for one-off cases
//   2. the tour's subcategory default (BY_CATEGORY) — the usual source
//   3. the top-level group default (BY_GROUP) — safety net for new categories

export type PrepInstructions = {
  bring: string[];
  dress?: string;
  notes?: string;
};

// A per-tour override only needs to set the fields it wants to change.
export type PrepOverride = Partial<PrepInstructions>;

type PrepInput = { category?: string; group?: string; prep?: PrepOverride };

const BY_CATEGORY: Record<string, PrepInstructions> = {
  "water-activities": {
    bring: ["Swimsuit (put it on before you arrive)", "Towel", "Reef-safe sunscreen", "A change of dry clothes"],
    dress: "Light, comfortable clothes over your swimsuit. Flip-flops or water shoes.",
    notes: "All equipment is provided. If you have a cold or ear/sinus issues, tell the instructor — don't dive when congested.",
  },
  jetski: {
    bring: ["Swimsuit (wear it under your clothes)", "Towel", "Reef-safe sunscreen", "Sunglasses with a strap"],
    dress: "Clothes you don't mind getting wet — quick-dry shorts and top are ideal.",
    notes: "No licence needed — an instructor guides you. Check the minimum age for your specific tour.",
  },
  "whale-watching": {
    bring: ["Sunscreen", "Sunglasses", "Hat or cap", "A light jacket", "Camera", "Water"],
    dress: "Comfortable layers — it's breezier out at sea than on shore.",
    notes: "Prone to seasickness? Take a remedy about 30 minutes before departure.",
  },
  "boat-rental": {
    bring: ["Swimsuit and towel", "Reef-safe sunscreen", "Hat and sunglasses", "Water and some snacks"],
    dress: "Light beach clothes. Soft-soled or non-marking shoes for the deck.",
    notes: "Bring a light jacket — it's cooler and windier once you're out on the water.",
  },
  fishing: {
    bring: ["Sunscreen", "Hat and sunglasses", "A light jacket", "Water and snacks"],
    dress: "Comfortable clothes and non-slip closed shoes.",
    notes: "All fishing gear is provided. Take a seasickness remedy beforehand if you're prone to it.",
  },
  "buggy-quad": {
    bring: ["Closed shoes or trainers", "Sunglasses", "A buff or scarf for dust", "Sunscreen", "Water"],
    dress: "Clothes you don't mind getting dusty. Long sleeves and trousers help.",
    notes: "The driver needs a valid driving licence, carried on the day. Passengers don't need one.",
  },
  "bus-tours": {
    bring: ["Comfortable walking shoes", "Sunscreen and hat", "Water", "A warm layer"],
    dress: "Comfortable clothes for a full day out.",
    notes: "If the route goes up to Teide or the mountains it's much colder and windier than the coast — bring a jacket.",
  },
  parks: {
    bring: ["Swimsuit and towel (for water parks)", "Sunscreen", "A change of clothes", "Water"],
    dress: "Comfortable clothes, with swimwear underneath for water parks.",
    notes: "Lockers are usually available to rent on site for your valuables.",
  },
  air: {
    bring: ["Closed shoes (trainers)", "Sunglasses", "A light jacket", "Camera (optional)"],
    dress: "Comfortable, layered clothing — it's cooler in the air. Avoid loose skirts or scarves.",
    notes: "For paragliding, closed shoes are required. Tell the team in advance about any health concerns.",
  },
  "car-rental": {
    bring: [
      "Your driving licence (held at least 1 year)",
      "Passport or ID card",
      "A credit card in the main driver's name",
      "Your booking voucher",
    ],
    notes: "A credit card (not debit) in the main driver's name is required for the security deposit. Minimum age and licence conditions apply.",
  },
  shows: {
    bring: ["Your booking reference or ticket", "A light jacket for later in the evening"],
    dress: "Smart-casual. There's no strict dress code, but most guests dress up a little.",
    notes: "Arrive about 15–20 minutes early to get seated comfortably.",
  },
};

const BY_GROUP: Record<string, PrepInstructions> = {
  water: {
    bring: ["Swimsuit and towel", "Reef-safe sunscreen", "Hat and sunglasses", "A light jacket"],
    dress: "Light clothes you don't mind getting splashed.",
    notes: "Take a seasickness remedy beforehand if you're prone to it.",
  },
  land: {
    bring: ["Closed, comfortable shoes", "Sunglasses and sunscreen", "Water", "A warm layer for higher ground"],
    dress: "Comfortable clothes suited to being outdoors.",
  },
  air: BY_CATEGORY.air,
  shows: BY_CATEGORY.shows,
  rental: BY_CATEGORY["car-rental"],
};

const FALLBACK: PrepInstructions = {
  bring: ["Comfortable clothes", "Sunscreen", "Water"],
};

export function getPrepInstructions(tour: PrepInput): PrepInstructions {
  const base =
    (tour.category && BY_CATEGORY[tour.category]) ||
    (tour.group && BY_GROUP[tour.group]) ||
    FALLBACK;

  if (!tour.prep) return base;

  // Per-tour override replaces only the fields it provides.
  return {
    bring: tour.prep.bring ?? base.bring,
    dress: tour.prep.dress ?? base.dress,
    notes: tour.prep.notes ?? base.notes,
  };
}
