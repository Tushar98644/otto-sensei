import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { absoluteUrl } from "@/lib/seo/urls";

// The site's own pages. Portfolios (/p/sitemap.xml) and job pages (/jobs/sitemap.xml) have their
// own sitemaps from the database; robots.ts lists all three.
//
// Built once at build time and served from the CDN. Static on purpose: appUrl() resolves at build
// (NEXT_PUBLIC_APP_URL, else Vercel's production domain), Vercel only applies env changes to a
// new deployment anyway, and the static pages bake the same origin into their canonical and OG
// tags, so a request-time sitemap would just disagree with them. Only the legal pages carry a
// lastmod: a build date on every page would change with each deploy and teach crawlers to ignore it.
// Indexable pages only: the studio, sign-in and account pages are noindex, and a noindex address
// in a sitemap is an error in Search Console.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [ROUTES.home, ROUTES.jobs, ROUTES.pricing].map((path) => ({
    url: absoluteUrl(path),
  }));
  const legal = [ROUTES.privacy, ROUTES.terms, ROUTES.refunds].map((path) => ({
    url: absoluteUrl(path),
    lastModified: LEGAL_LAST_UPDATED,
  }));
  return [...pages, ...legal];
}
