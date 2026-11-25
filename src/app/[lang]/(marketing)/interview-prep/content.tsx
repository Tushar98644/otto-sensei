import { PLANS } from "@/config/plans";
import type { Format } from "@/i18n/intl";
import en from "@/i18n/messages/en/product";
import { PREP_LEVELS, ROLE_FOCUSES } from "@/lib/insights/prep-focus";
import type { FeatureContent } from "../_components/feature-page";
import type { PriceCopy } from "../_components/price-copy";
import { faqItems, noteList, PLAN_NAMES, type ProductMessages } from "../_components/product-copy";

export function prepContent(
  t: ProductMessages["interviewPrep"],
  format: Format,
  prices: PriceCopy,
): FeatureContent {
  const values = {
    ...PLAN_NAMES,
    price: prices.planPrice("pro", "month"),
    letters: format.number(PLANS.pro.limits.letter),
    maxLetters: format.number(PLANS.max.limits.letter),
    roles: format.number(ROLE_FOCUSES.length),
    firstLevel: t.levels[PREP_LEVELS[0]],
    lastLevel: t.levels[PREP_LEVELS.at(-1) ?? PREP_LEVELS[0]],
  };
  return {
    intro: t.intro,
    featuresTitle: t.featuresTitle,
    features: noteList(en.interviewPrep.features, t.features, values),
    steps: noteList(en.interviewPrep.steps, t.steps, values),
    faq: faqItems(en.interviewPrep.faq, t.faq, values),
  };
}
