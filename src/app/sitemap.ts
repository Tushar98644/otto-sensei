import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { absoluteUrl } from "@/lib/seo/urls";

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
