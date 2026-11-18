import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { seoPages } from "@/lib/seo-pages/pages";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { absoluteUrl } from "@/lib/seo/urls";

// Home, pricing and the job match tool change with each deploy, so they carry no date.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [ROUTES.home, ROUTES.pricing, SEO_PATHS.jobMatch].map((path) => ({
    url: absoluteUrl(path),
  }));
  const guides = seoPages().map(({ path, lastModified }) => ({
    url: absoluteUrl(path),
    lastModified,
  }));
  const legal = [ROUTES.privacy, ROUTES.terms, ROUTES.refunds, ROUTES.acceptableUse].map(
    (path) => ({
      url: absoluteUrl(path),
      lastModified: LEGAL_LAST_UPDATED,
    }),
  );
  return [...pages, ...guides, ...legal];
}
