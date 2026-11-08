import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { appUrl } from "@/lib/env";

// Built once at build time and served from the CDN. Static on purpose: appUrl() resolves at build
// (NEXT_PUBLIC_APP_URL, else Vercel's production domain), Vercel only applies env changes to a
// new deployment anyway, and the static pages bake the same origin into their canonical and OG
// tags, so a request-time sitemap would just disagree with them. Only the legal pages carry a
// lastmod: a build date on every page would change with each deploy and teach crawlers to ignore it.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const pages = [ROUTES.home, ROUTES.studio, ROUTES.pricing].map((path) => ({
    url: `${base}${path}`,
  }));
  const legal = [ROUTES.privacy, ROUTES.terms, ROUTES.refunds].map((path) => ({
    url: `${base}${path}`,
    lastModified: LEGAL_LAST_UPDATED,
  }));
  return [...pages, ...legal];
}
