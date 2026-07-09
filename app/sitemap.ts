import type { MetadataRoute } from "next";
import { getAllTours } from "@/lib/tours";
import { getRestaurants } from "@/lib/restaurants";

export default function sitemap(): MetadataRoute.Sitemap {
  const tours = getAllTours();
  const tourEntries: MetadataRoute.Sitemap = tours.map((t) => ({
    url: `https://tenerify.ai/tours/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const restaurantEntries: MetadataRoute.Sitemap = getRestaurants().map((r) => ({
    url: `https://tenerify.ai/restaurants/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: "https://tenerify.ai/",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://tenerify.ai/tours",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...tourEntries,
    {
      url: "https://tenerify.ai/restaurants",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://tenerify.ai/events",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    ...restaurantEntries,
    {
      url: "https://tenerify.ai/legal",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
