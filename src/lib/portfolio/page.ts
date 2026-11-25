import { unstable_cache } from "next/cache";
import { cache } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localeOfLang } from "@/lib/i18n/languages";
import { portfolioTag } from "./cache";
import { findPublicPortfolio, type PublicPortfolioResult } from "./records";
import { normalizeSlug } from "./slug";

export const PORTFOLIO_REVALIDATE_SECONDS = 3600;

// The viewport, metadata and page of one render share a lookup: unstable_cache doesn't merge concurrent misses.
export const loadPublicPortfolio = cache((slug: string): Promise<PublicPortfolioResult> => {
  // Only canonical addresses are cached, or each spelling ("Maya-Chen") would fill an entry.
  if (normalizeSlug(slug) !== slug) return Promise.resolve({ status: "missing" });
  return unstable_cache(() => findPublicPortfolio(slug), ["portfolio-page", slug], {
    tags: [portfolioTag(slug)],
    revalidate: PORTFOLIO_REVALIDATE_SECONDS,
  })();
});

// Otto's own words on a public page follow the owner's resume language; a missing page, or one with none set, reads in English.
export function portfolioLocale(result: PublicPortfolioResult): Locale {
  return result.status === "ok" && result.portfolio.lang
    ? localeOfLang(result.portfolio.lang)
    : DEFAULT_LOCALE;
}
