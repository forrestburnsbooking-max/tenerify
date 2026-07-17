import { NextRequest, NextResponse } from "next/server";
import { getHotelBySlug } from "@/lib/hotels";

// Lightweight lookup so the client can brand the header and pre-fill the guest's
// location (the hotel's area) without shipping the full house FAQ to the browser.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const hotel = getHotelBySlug(slug);
  if (!hotel) return NextResponse.json({ hotel: null });
  return NextResponse.json({ hotel: { slug: hotel.slug, name: hotel.name, area: hotel.area } });
}
