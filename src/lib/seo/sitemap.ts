import type { MetadataRoute } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { JOB_SITEMAP_PARTS } from "@/lib/job-feed/sitemap";
import { log } from "@/lib/log";
import { absoluteUrl } from "./urls";

// Server-only. Shared by the sitemaps read from the database (/p/sitemap.xml, /jobs/sitemap/*.xml).

// The sitemap protocol's cap per file. Past it, the newest entries win.
export const SITEMAP_MAX_URLS = 50_000;

/** Every sitemap the site serves, for robots.txt: the site's pages, portfolios, then the jobs. */
export function sitemapUrls(base?: string): string[] {
  return [
    "/sitemap.xml",
    "/p/sitemap.xml",
    ...Array.from({ length: JOB_SITEMAP_PARTS }, (_, part) => `/jobs/sitemap/${part}.xml`),
  ].map((path) => absoluteUrl(path, base));
}

/**
 * The entries `load` reads. A build without a database (CI) still finishes, with an empty list
 * until the next rebuild. After that a failed rebuild throws, so the last good sitemap keeps being
 * served instead of an empty one.
 */
export async function sitemapFromDb(
  name: string,
  load: () => Promise<MetadataRoute.Sitemap>,
): Promise<MetadataRoute.Sitemap> {
  try {
    return await load();
  } catch (error) {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    log.warn("sitemap.built_without_db", { name }, error);
    return [];
  }
}
