import type { MetadataRoute } from "next";
import { ROUTES } from "@/components/site/routes";
import { sitemapUrls } from "@/lib/seo/sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    // Studio, sign-in and reminders stay crawlable so search engines can read their noindex tag.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ROUTES.dashboard, ROUTES.account] },
    sitemap: sitemapUrls(),
  };
}
