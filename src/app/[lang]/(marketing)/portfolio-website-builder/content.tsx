import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import en from "@/i18n/messages/en/product";
import { PORTFOLIO_LIMITS, PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import type { FeatureContent } from "../_components/feature-page";
import type { PriceCopy } from "../_components/price-copy";
import { faqItems, noteList, PLAN_NAMES, type ProductMessages } from "../_components/product-copy";

export function portfolioContent(
  t: ProductMessages["portfolio"],
  format: Format,
  prices: PriceCopy,
): FeatureContent {
  const designs = format.number(PORTFOLIO_TEMPLATE_IDS.length);
  const values = {
    ...PLAN_NAMES,
    price: prices.planPrice("pro", "month"),
    designs,
    redirectDays: format.number(PORTFOLIO_LIMITS.redirectDays),
  };
  return {
    intro: fmt(t.intro, { designs }),
    featuresTitle: t.featuresTitle,
    features: noteList(en.portfolio.features, t.features, values),
    steps: noteList(en.portfolio.steps, t.steps),
    faq: faqItems(en.portfolio.faq, t.faq, values),
  };
}
