import type { MetadataRoute } from "next";
import { ROUTES } from "@/components/site/routes";
import { appUrl } from "@/lib/env";

// Static, like ./sitemap.ts and for the same reason: the origin is a build input.
export default function robots(): MetadataRoute.Robots {
  return {
    // API responses and the signed-in pages have nothing worth indexing.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ROUTES.dashboard, ROUTES.account] },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
