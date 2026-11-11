import type { MetadataRoute } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { log } from "@/lib/log";
import { absoluteUrl } from "./urls";

// The sitemap protocol's cap per file. Past it, the newest entries win.
export const SITEMAP_MAX_URLS = 50_000;

export function sitemapUrls(base?: string): string[] {
  return ["/sitemap.xml", "/p/sitemap.xml"].map((path) => absoluteUrl(path, base));
}

// A build without a database (CI) gets an empty list; after that a failed rebuild throws, so the
// last good sitemap keeps being served.
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
