import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { applicationLimit } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import en from "@/i18n/messages/en/product";
import type { Localize } from "@/i18n/pages";
import {
  AFTER_INTERVIEW_BUSINESS_DAYS,
  FOLLOW_UP_DAYS,
  SNOOZE_DAYS,
} from "@/lib/applications/follow-up";
import { MIN_FOR_RATE } from "@/lib/applications/stats";
import type { FeatureContent } from "../_components/feature-page";
import type { PriceCopy } from "../_components/price-copy";
import { faqItems, noteList, PLAN_NAMES, type ProductMessages } from "../_components/product-copy";

// The plan limits the page and its plan note quote.
export function trackerLimits(t: ProductMessages["tracker"], format: Format) {
  return {
    ...PLAN_NAMES,
    freeApplications: format.plural(t.applications, applicationLimit("free")),
    proApplications: format.number(applicationLimit("pro")),
    maxApplications: format.number(applicationLimit("max")),
  };
}

export function trackerContent(
  t: ProductMessages["tracker"],
  format: Format,
  href: Localize,
  prices: PriceCopy,
): FeatureContent {
  const values = {
    ...trackerLimits(t, format),
    price: prices.planPrice("pro", "month"),
    followUp: format.number(FOLLOW_UP_DAYS.default),
    snooze: format.number(SNOOZE_DAYS),
    afterInterview: format.number(AFTER_INTERVIEW_BUSINESS_DAYS),
    minForRate: format.number(MIN_FOR_RATE),
  };
  const privacy = (chunk: string) => <TextLink href={href(ROUTES.privacy)}>{chunk}</TextLink>;
  return {
    intro: fmt(t.intro, { pro: PLAN_NAMES.pro }),
    featuresTitle: t.featuresTitle,
    features: noteList(en.tracker.features, t.features, values),
    steps: noteList(en.tracker.steps, t.steps, values),
    faq: faqItems(en.tracker.faq, t.faq, values, { privacy: { link: privacy } }),
  };
}
