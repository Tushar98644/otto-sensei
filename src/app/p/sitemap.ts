import type { MetadataRoute } from "next";
import { indexablePortfolios } from "@/lib/portfolio/records";
import { portfolioPath } from "@/lib/portfolio/types";
import { SITEMAP_MAX_URLS, sitemapFromDb } from "@/lib/seo/sitemap";
import { absoluteUrl } from "@/lib/seo/urls";

export const revalidate = 3600;

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapFromDb("portfolios", async () =>
    (await indexablePortfolios(SITEMAP_MAX_URLS)).map(({ slug, updatedAt }) => ({
      url: absoluteUrl(portfolioPath(slug)),
      lastModified: new Date(updatedAt),
    })),
  );
}
