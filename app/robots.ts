import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/booking/"],
    },
    sitemap: "https://tenerify.ai/sitemap.xml",
  };
}
