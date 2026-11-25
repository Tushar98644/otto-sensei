import { BRAND } from "@/config/brand";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";
import { isPublished } from "@/i18n/publish";
import { getLocale } from "@/i18n/server";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import {
  type AtsGuide,
  ATS_GUIDES,
  type GuideWords,
  guideDescription,
  isIndexed,
  readsFiles,
} from "@/lib/seo-pages/ats";
import { COMPETITORS, type Competitor } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES, type RoleExample } from "@/lib/seo-pages/examples";
import {
  COMPARE_INDEX_PAGE,
  EXAMPLES_YEAR,
  RELATED,
  RESUME_EXAMPLES_PAGE,
  RESUME_TEMPLATES_PAGE,
  ATS_INDEX_PAGE,
  fitTitle,
  type RelatedLink,
  type SeoPage,
} from "@/lib/seo-pages/pages";
import { atsPath, comparePath, examplePath } from "@/lib/seo-pages/paths";
import { SEO_LIMITS } from "@/lib/seo/limits";
import { PLAN_NAMES, freeFormats, relatedLinks, type ProductMessages } from "./product-copy";

// The guide pages' words in a page's language; English matches src/lib/seo-pages/pages.ts word for word (seo-copy.test.ts).
export type SeoMessages = Messages["seo"];
export type CompareMessages = Messages["compare"];
export type AtsPageMessages = Messages["ats"];
export type ExamplesMessages = Messages["resumeExamples"];
export type TemplatesMessages = Messages["resumeTemplates"];

type Meta = Omit<SeoPage, "lastModified">;

export function compareTitleIn(t: CompareMessages, competitor: Pick<Competitor, "name">): string {
  return fmt(t.title, { brand: BRAND.name, name: competitor.name });
}

export function compareIndexMeta(t: CompareMessages, format: Format): Meta {
  const values = { brand: BRAND.name, count: format.number(COMPETITORS.length) };
  return {
    path: COMPARE_INDEX_PAGE.path,
    title: fmt(t.meta.index.title, values),
    absoluteTitle: true,
    description: fmt(t.meta.index.description, values),
  };
}

export function compareMeta(t: CompareMessages, competitor: Competitor): Meta {
  const values = { name: competitor.name, compare: compareTitleIn(t, competitor) };
  return {
    path: comparePath(competitor.slug),
    title: fmt(t.meta.page.title, values),
    absoluteTitle: true,
    description: fmt(t.meta.page.description, values),
  };
}

export function atsIndexMeta(t: AtsPageMessages, format: Format): Meta {
  return {
    path: ATS_INDEX_PAGE.path,
    title: t.meta.index.title,
    description: fmt(t.meta.index.description, { count: format.number(ATS_GUIDES.length) }),
  };
}

export function atsGuideMeta(guide: AtsGuide, words: GuideWords): Meta {
  const { reads, does } = words.t.meta;
  return {
    path: atsPath(guide.id),
    ...fitTitle(fmt(readsFiles(guide) ? reads : does, { name: guide.name })),
    description: guideDescription(guide, words),
    noindex: !isIndexed(guide),
  };
}

export function examplesIndexMeta(t: ExamplesMessages, format: Format): Meta {
  const values = { count: format.number(ROLE_EXAMPLES.length), year: EXAMPLES_YEAR };
  return {
    path: RESUME_EXAMPLES_PAGE.path,
    title: fmt(t.meta.index.title, values),
    description: fmt(t.meta.index.description, values),
  };
}

export function exampleHeadlineIn(t: ExamplesMessages, example: Pick<RoleExample, "role">): string {
  return fmt(t.headline, { role: example.role });
}

export function exampleMeta(t: ExamplesMessages, example: RoleExample): Meta {
  const values = { headline: exampleHeadlineIn(t, example), year: EXAMPLES_YEAR };
  const long = fmt(t.meta.long, values);
  return {
    path: examplePath(example.slug),
    ...fitTitle(long.length <= SEO_LIMITS.title ? long : fmt(t.meta.short, values)),
    description: example.description,
  };
}

export function templatesMeta(t: TemplatesMessages, format: Format): Meta {
  const values = {
    count: format.number(TEMPLATE_IDS.length),
    free: format.number(FREE_TEMPLATES.length),
    freeFormats: freeFormats(format),
    proCount: format.number(TEMPLATE_IDS.length - FREE_TEMPLATES.length),
    pro: PLANS.pro.name,
  };
  return {
    path: RESUME_TEMPLATES_PAGE.path,
    title: fmt(t.meta.title, values),
    description: fmt(t.meta.description, values),
  };
}

type OwnRelated = keyof SeoMessages["related"];
export type SeoRelatedKey = OwnRelated | keyof ProductMessages["related"];

const isOwn = (key: SeoRelatedKey): key is OwnRelated => key === "builder" || key === "pricing";

// RELATED in this language, without pages this language doesn't publish.
export async function seoRelated(
  product: ProductMessages,
  seo: SeoMessages,
  format: Format,
  href: Localize,
  keys: readonly SeoRelatedKey[],
): Promise<RelatedLink[]> {
  const locale = await getLocale();
  const shown = await Promise.all(keys.map((key) => isPublished(locale, RELATED[key].href)));
  return keys
    .filter((_, index) => shown[index])
    .map((key) =>
      isOwn(key)
        ? {
            href: href(RELATED[key].href),
            title: seo.related[key].title,
            text: fmt(seo.related[key].text, PLAN_NAMES),
          }
        : relatedLinks(product.related, format, href, [key])[0]!,
    );
}
