import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";
import { isPublished } from "@/i18n/publish";
import { rich, type RichTags } from "@/i18n/rich";
import { getLocale } from "@/i18n/server";
import type { MessageValue } from "@/i18n/types";
import { trialOffered } from "@/lib/billing/intervals";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { ATS_GUIDES } from "@/lib/seo-pages/ats";
import { COMPETITORS } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { fitTitle, RELATED, type RelatedLink, type SeoPage } from "@/lib/seo-pages/pages";
import type { FaqItem } from "./faq-list";
import type { Note } from "./note-rows";
import { joinList, type PriceCopy } from "./price-copy";

export type ProductMessages = Messages["product"];
export type ProductPage = "builder" | "coverLetters" | "tracker" | "interviewPrep" | "portfolio";
export type RelatedKey = keyof ProductMessages["related"];

type Values = Record<string, MessageValue>;
type NoteMessage = { readonly title: string; readonly text: string };
type FaqMessage = { readonly question: string; readonly answer: string };

// Plan names read the same in every language.
export const PLAN_NAMES = { free: PLANS.free.name, pro: PLANS.pro.name, max: PLANS.max.name };

const fill = (text: string, values?: Values) => (values ? fmt(text, values) : text);

export function freeFormats(format: Format): string {
  return joinList(
    format,
    FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name),
    "and",
  );
}

// One note per message, in the English file's order so a translation can't reorder the list.
export function noteList<K extends string>(
  english: Readonly<Record<K, NoteMessage>>,
  t: Readonly<Record<K, NoteMessage>>,
  values?: Values,
  tags?: Partial<Record<K, RichTags>>,
): Note[] {
  return (Object.keys(english) as K[]).map((key) => ({
    title: fill(t[key].title, values),
    text: rich(t[key].text, tags?.[key], values),
  }));
}

export function faqItems<K extends string>(
  english: Readonly<Record<K, FaqMessage>>,
  t: Readonly<Record<K, FaqMessage>>,
  values?: Values,
  tags?: Partial<Record<K, RichTags>>,
): FaqItem[] {
  return (Object.keys(english) as K[]).map((key) => ({
    question: fill(t[key].question, values),
    answer: rich(t[key].answer, tags?.[key], values),
  }));
}

// A plan sentence, closed with the trial offer while there is one.
export function withTrial(
  t: ProductMessages["common"],
  prices: PriceCopy,
  sentence: string,
): string {
  const close = trialOffered()
    ? fmt(t.trialFor, { headline: prices.trialHeadline(), price: prices.trialPrice() })
    : prices.cancelAnytime;
  return `${sentence} ${close}`;
}

// A product page's title and description; English matches its entry in src/lib/seo-pages/pages.ts.
export function productMeta(
  t: ProductMessages,
  format: Format,
  page: ProductPage,
): Pick<SeoPage, "title" | "absoluteTitle" | "description"> {
  const values = { pro: PLAN_NAMES.pro, designs: format.number(PORTFOLIO_TEMPLATE_IDS.length) };
  const { title, description }: { title: string; description: string } = t[page].meta;
  return { ...fitTitle(fill(title, values)), description: fill(description, values) };
}

export function relatedLinks(
  t: ProductMessages["related"],
  format: Format,
  href: Localize,
  keys: readonly RelatedKey[],
): RelatedLink[] {
  const values: Partial<Record<RelatedKey, Values>> = {
    examples: { count: format.number(ROLE_EXAMPLES.length) },
    templates: { count: format.number(TEMPLATE_IDS.length), free: freeFormats(format) },
    ats: { count: format.number(ATS_GUIDES.length) },
    compare: {
      names: joinList(
        format,
        COMPETITORS.map((competitor) => competitor.name),
        "and",
      ),
    },
    portfolio: { count: format.number(PORTFOLIO_TEMPLATE_IDS.length) },
  };
  return keys.map((key) => ({
    href: href(RELATED[key].href),
    title: t[key].title,
    text: fill(t[key].text, values[key]),
  }));
}

// Only pages published in this request's language, so a translated page never sends people to an English-only one.
export async function publishedRelated(keys: readonly RelatedKey[]): Promise<RelatedKey[]> {
  const locale = await getLocale();
  const shown = await Promise.all(keys.map((key) => isPublished(locale, RELATED[key].href)));
  return keys.filter((_, index) => shown[index]);
}
