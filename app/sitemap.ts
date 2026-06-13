import type { MetadataRoute } from "next";
import { getAllTours } from "@/lib/tours";

export default function sitemap(): MetadataRoute.Sitemap {
  const tours = getAllTours();
  const tourEntries: MetadataRoute.Sitemap = tours.map((t) => ({
    url: `https://tenerify.ai/tours/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
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
      url: "https://tenerify.ai/legal",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
