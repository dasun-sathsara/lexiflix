import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep crawlers on the public marketing surface; the signed-in app,
      // auth flows, and API/artifact endpoints are not useful to index.
      disallow: [
        "/api/",
        "/auth",
        "/dashboard",
        "/decks",
        "/packs",
        "/pack/",
        "/study/",
        "/settings",
        "/admin",
        "/onboarding",
        "/generation",
        "/browse",
        "/curated",
        "/media",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
