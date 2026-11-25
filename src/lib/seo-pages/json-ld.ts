import { BRAND } from "@/config/brand";
import type { TemplateInfo } from "@/lib/pdf/templates";
import {
  inLanguage,
  type JsonLdData,
  publisherJsonLd,
  shareImageUrl,
  softwareId,
  websiteId,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";
import { type AtsGuide, guideHeadline, guideSources } from "./ats";
import { type Competitor, compareTitle } from "./compare";

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(
  crumbs: readonly Crumb[],
  base: string,
  language?: string,
): JsonLdData {
  return inLanguage(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path, base),
      })),
    },
    language,
  );
}

type ArticleInfo = {
  type: "TechArticle" | "Article";
  path: string;
  headline: string;
  description: string;
  dateModified: string;
  about: readonly JsonLdData[];
  citations: readonly { label: string; url: string }[];
};

function articleJsonLd(article: ArticleInfo, base: string): JsonLdData {
  const url = absoluteUrl(article.path, base);
  const publisher = publisherJsonLd(base);
  return {
    "@context": "https://schema.org",
    "@type": article.type,
    "@id": `${url}#article`,
    headline: article.headline,
    description: article.description,
    url,
    mainEntityOfPage: url,
    dateModified: article.dateModified,
    inLanguage: "en",
    image: shareImageUrl(base),
    author: publisher,
    publisher,
    isPartOf: { "@id": websiteId(base) },
    about: article.about,
    citation: article.citations.map((source) => ({
      "@type": "CreativeWork",
      name: source.label,
      url: source.url,
    })),
  };
}

export function atsGuideJsonLd(
  guide: AtsGuide,
  page: { path: string; description: string; lastModified: string },
  base: string,
): JsonLdData {
  return articleJsonLd(
    {
      type: "TechArticle",
      path: page.path,
      headline: guideHeadline(guide),
      description: page.description,
      dateModified: page.lastModified,
      about: [{ "@type": "SoftwareApplication", name: guide.name }],
      citations: guideSources(guide),
    },
    base,
  );
}

export function compareJsonLd(
  competitor: Competitor,
  page: { path: string; description: string; lastModified: string },
  base: string,
): JsonLdData {
  return articleJsonLd(
    {
      type: "Article",
      path: page.path,
      headline: compareTitle(competitor),
      description: page.description,
      dateModified: page.lastModified,
      about: [
        { "@type": "WebApplication", "@id": softwareId(base), name: BRAND.name },
        { "@type": "SoftwareApplication", name: competitor.name, url: competitor.site },
      ],
      citations: competitor.sources,
    },
    base,
  );
}

export function templateListJsonLd(
  formats: readonly { info: TemplateInfo; free: boolean }[],
  path: string,
  base: string,
): JsonLdData {
  const page = absoluteUrl(path, base);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${page}#formats`,
    name: "Resume formats",
    numberOfItems: formats.length,
    itemListElement: formats.map(({ info, free }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        "@id": `${page}#${info.id}`,
        name: info.name,
        url: `${page}#${info.id}`,
        description: `${info.bestFor} ${info.description}`,
        isAccessibleForFree: free,
      },
    })),
  };
}

export function pageListJsonLd(
  name: string,
  path: string,
  items: readonly { name: string; path: string }[],
  base: string,
): JsonLdData {
  const page = absoluteUrl(path, base);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${page}#list`,
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path, base),
    })),
  };
}
