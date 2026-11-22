import type { MetadataRoute } from "next";
import { ROUTES } from "@/components/site/routes";
import { AI_CRAWLERS } from "@/lib/seo/crawlers";
import { sitemapUrls } from "@/lib/seo/sitemap";

export default function robots(): MetadataRoute.Robots {
  // Studio, sign-in and reminders stay crawlable so search engines can read their noindex tag.
  const disallow = ["/api/", ROUTES.dashboard, ROUTES.account];
  return {
    // A crawler follows only the group that names it, so each group repeats the same rules.
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: [...AI_CRAWLERS], allow: "/", disallow },
    ],
    sitemap: sitemapUrls(),
  };
}
