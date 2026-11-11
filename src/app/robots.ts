import type { MetadataRoute } from "next";
import { ROUTES } from "@/components/site/routes";
import { sitemapUrls } from "@/lib/seo/sitemap";

// Static, like ./sitemap.ts and for the same reason: the origin is a build input.
export default function robots(): MetadataRoute.Robots {
  return {
    // API responses and the signed-in pages have nothing worth indexing. Other private pages
    // (studio, sign-in, reminders) stay crawlable so search engines can read their noindex tag.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ROUTES.dashboard, ROUTES.account] },
    sitemap: sitemapUrls(),
  };
}
