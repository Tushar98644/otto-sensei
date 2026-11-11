import { revalidatePath, revalidateTag } from "next/cache";
import { log } from "@/lib/log";
import { portfolioPath } from "./types";

export function portfolioTag(slug: string): string {
  return `portfolio:${slug}`;
}

export function refreshPortfolioPages(slugs: readonly (string | null | undefined)[]): void {
  for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
    try {
      revalidateTag(portfolioTag(slug), { expire: 0 });
      revalidatePath(portfolioPath(slug));
    } catch (error) {
      log.warn("portfolio.revalidate_failed", {}, error);
    }
  }
}
