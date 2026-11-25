import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { applicationLimit, FREE_TEMPLATES, PLANS } from "@/config/plans";
import type { Format } from "@/i18n/intl";
import en from "@/i18n/messages/en/product";
import type { Localize } from "@/i18n/pages";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { RELATED } from "@/lib/seo-pages/pages";
import { SEO_PATHS, examplePath } from "@/lib/seo-pages/paths";
import type { FaqItem } from "../_components/faq-list";
import type { Note } from "../_components/note-rows";
import type { PriceCopy } from "../_components/price-copy";
import {
  faqItems,
  freeFormats,
  noteList,
  PLAN_NAMES,
  type ProductMessages,
} from "../_components/product-copy";

// The words the resume builder page shares with llms-full.txt.
export type BuilderContent = {
  steps: readonly Note[];
  audiences: readonly Note[];
  india: readonly Note[];
  faq: readonly FaqItem[];
};

export function builderContent(
  t: ProductMessages["builder"],
  format: Format,
  href: Localize,
  prices: PriceCopy,
): BuilderContent {
  const values = {
    ...PLAN_NAMES,
    price: prices.planPrice("pro", "month"),
    fixes: format.number(PLANS.free.limits.fix),
    freeFormats: freeFormats(format),
    proFormats: format.number(TEMPLATE_IDS.length - FREE_TEMPLATES.length),
    tracked: format.number(applicationLimit("pro")),
  };
  const linkTo = (path: string) => ({
    link: (chunk: string) => <TextLink href={href(path)}>{chunk}</TextLink>,
  });
  return {
    steps: noteList(en.builder.steps, t.steps, values, {
      start: linkTo(SEO_PATHS.resumeExamples),
      match: linkTo(SEO_PATHS.jobMatch),
    }),
    audiences: noteList(en.builder.audiences, t.audiences, values, {
      freshers: linkTo(examplePath("fresher")),
    }),
    india: noteList(en.builder.india, t.india, values),
    faq: faqItems(en.builder.faq, t.faq, values, {
      ats: linkTo(RELATED.ats.href),
      word: linkTo(ROUTES.pricing),
    }),
  };
}
