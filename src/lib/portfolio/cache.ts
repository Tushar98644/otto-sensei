import { revalidatePath, revalidateTag } from "next/cache";
import { log } from "@/lib/log";
import { portfolioPath } from "./types";

// Every write drops the cached copies (ISR and tagged data, page.ts) for the addresses it touched.

export function portfolioTag(slug: string): string {
  return `portfolio:${slug}`;
}

// Page, metadata and OG image at once, so an unpublished page stops showing on the next request.
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
