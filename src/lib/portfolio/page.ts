import { unstable_cache } from "next/cache";
import { portfolioTag } from "./cache";
import { findPublicPortfolio, type PublicPortfolioResult } from "./records";
import { normalizeSlug } from "./slug";

export const PORTFOLIO_REVALIDATE_SECONDS = 3600;

export function loadPublicPortfolio(slug: string): Promise<PublicPortfolioResult> {
  // Only canonical addresses are cached, or each spelling ("Maya-Chen") would fill an entry.
  if (normalizeSlug(slug) !== slug) return Promise.resolve({ status: "missing" });
  return unstable_cache(() => findPublicPortfolio(slug), ["portfolio-page", slug], {
    tags: [portfolioTag(slug)],
    revalidate: PORTFOLIO_REVALIDATE_SECONDS,
  })();
}
