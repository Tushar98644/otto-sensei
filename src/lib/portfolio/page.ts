import { unstable_cache } from "next/cache";
import { portfolioTag } from "./cache";
import { findPublicPortfolio, type PublicPortfolioResult } from "./records";
import { normalizeSlug } from "./slug";

// Server-only. What /p/<slug> and its Open Graph image read: one database lookup per address,
// cached until a write drops it (refreshPortfolioPages) or an hour passes, which also picks up a
// plan change for the credit line.

export const PORTFOLIO_REVALIDATE_SECONDS = 3600;

export function loadPublicPortfolio(slug: string): Promise<PublicPortfolioResult> {
  // Only canonical addresses are cached; "Maya-Chen" would otherwise fill a cache entry per spelling.
  if (normalizeSlug(slug) !== slug) return Promise.resolve({ status: "missing" });
  return unstable_cache(() => findPublicPortfolio(slug), ["portfolio-page", slug], {
    tags: [portfolioTag(slug)],
    revalidate: PORTFOLIO_REVALIDATE_SECONDS,
  })();
}
