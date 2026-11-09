import { revalidatePath, revalidateTag } from "next/cache";
import { log } from "@/lib/log";
import { portfolioPath } from "./types";

// Server-only. Published pages are cached (ISR plus a tagged data cache, src/lib/portfolio/page.ts);
// every write drops the copies for the addresses it touched.

export function portfolioTag(slug: string): string {
  return `portfolio:${slug}`;
}

/**
 * Drops the cached page, metadata and Open Graph image for these addresses at once, so an
 * unpublished page stops showing on the next request instead of after a stale one.
 */
export function refreshPortfolioPages(slugs: readonly (string | null | undefined)[]): void {
  for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
    try {
      revalidateTag(portfolioTag(slug), { expire: 0 });
      revalidatePath(portfolioPath(slug));
    } catch (error) {
      // Outside a Next request (scripts, tests) there is no cache to drop.
      log.warn("portfolio.revalidate_failed", {}, error);
    }
  }
}
