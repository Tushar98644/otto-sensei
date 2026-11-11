import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { absoluteUrl } from "@/lib/seo/urls";

// Portfolios have their own sitemap (/p/sitemap.xml). Static on purpose: appUrl() resolves at
// build, and the static pages bake the same origin into their canonical and OG tags.
// Only legal pages carry a lastmod: a build date on every page would teach crawlers to ignore it.
// Indexable pages only: a noindex address in a sitemap is a Search Console error.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [ROUTES.home, ROUTES.pricing].map((path) => ({
    url: absoluteUrl(path),
  }));
  const legal = [ROUTES.privacy, ROUTES.terms, ROUTES.refunds, ROUTES.acceptableUse].map(
    (path) => ({
      url: absoluteUrl(path),
      lastModified: LEGAL_LAST_UPDATED,
    }),
  );
  return [...pages, ...legal];
}
