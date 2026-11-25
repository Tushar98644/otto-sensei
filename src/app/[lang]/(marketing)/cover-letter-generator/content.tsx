import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { PLANS } from "@/config/plans";
import type { Format } from "@/i18n/intl";
import en from "@/i18n/messages/en/product";
import type { Localize } from "@/i18n/pages";
import type { WritingTone } from "@/lib/writing-style/schema";
import { TONE_CHOICES } from "@/lib/writing-style/schema";
import type { FeatureContent } from "../_components/feature-page";
import { joinList, type PriceCopy } from "../_components/price-copy";
import { faqItems, noteList, PLAN_NAMES, type ProductMessages } from "../_components/product-copy";

const TONES = Object.keys(TONE_CHOICES) as WritingTone[];

export function letterContent(
  t: ProductMessages["coverLetters"],
  format: Format,
  href: Localize,
  prices: PriceCopy,
): FeatureContent {
  const values = {
    ...PLAN_NAMES,
    price: prices.planPrice("pro", "month"),
    letters: format.number(PLANS.pro.limits.letter),
    tones: joinList(
      format,
      TONES.map((tone) => t.tones[tone]),
      "or",
    ),
  };
  const pricing = (chunk: string) => <TextLink href={href(ROUTES.pricing)}>{chunk}</TextLink>;
  return {
    intro: t.intro,
    featuresTitle: t.featuresTitle,
    features: noteList(en.coverLetters.features, t.features, values),
    steps: noteList(en.coverLetters.steps, t.steps),
    faq: faqItems(en.coverLetters.faq, t.faq, values, { free: { link: pricing } }),
  };
}
