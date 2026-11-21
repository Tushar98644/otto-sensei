import { revalidateTag } from "next/cache";
import { log } from "@/lib/log";
import { portfolioSlugsOf } from "./records";

export function portfolioTag(slug: string): string {
  return `portfolio:${slug}`;
}

// The page and its image render through loadPublicPortfolio, so both entries carry this tag.
export function refreshPortfolioPages(slugs: readonly (string | null | undefined)[]): void {
  for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
    try {
      revalidateTag(portfolioTag(slug), { expire: 0 });
    } catch (error) {
      log.warn("portfolio.revalidate_failed", {}, error);
    }
  }
}

// The public page links the owner's share of its resume, so a change to their links redraws it.
export async function refreshOwnerPortfolio(userId: string): Promise<void> {
  try {
    refreshPortfolioPages(await portfolioSlugsOf(userId));
  } catch (error) {
    log.warn("portfolio.revalidate_failed", {}, error);
  }
}
