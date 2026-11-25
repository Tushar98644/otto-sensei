import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { DEFAULT_LOCALE, openGraphLocale, type Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/pages";

export type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  noindex?: boolean;
  // The page's language and every language it is published in (src/i18n/publish.ts); English alone when left out.
  locale?: Locale;
  locales?: readonly Locale[];
  // The share image's alt text in the page's language.
  imageAlt?: string;
};

// The root layout's title template appends this to every page title that isn't absolute.
export const TITLE_SUFFIX = ` · ${BRAND.name}`;

export function fullTitle({
  title,
  absoluteTitle = false,
}: Pick<PageMetadataOptions, "title" | "absoluteTitle">): string {
  return absoluteTitle ? title : `${title}${TITLE_SUFFIX}`;
}

// A root-level image route (src/app/opengraph-image.tsx) gets no hash suffix in its path.
const OG_IMAGE = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: `${BRAND.name}: ${BRAND.tagline}`,
};

// Each published language's address, and English for everyone else (x-default); nothing for a page in one language.
function languageAlternates(path: string, locales: readonly Locale[]) {
  if (locales.length < 2) return {};
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = localizedPath(locale, path);
  languages["x-default"] = path;
  return { languages };
}

// Next merges metadata one level deep, so openGraph here replaces the root's, image included.
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  noindex = false,
  locale = DEFAULT_LOCALE,
  locales = [locale],
  imageAlt = OG_IMAGE.alt,
}: PageMetadataOptions): Metadata {
  const shareTitle = fullTitle({ title, absoluteTitle });
  const url = localizedPath(locale, path);
  const others = locales.filter((other) => other !== locale).map(openGraphLocale);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, ...languageAlternates(path, locales) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      locale: openGraphLocale(locale),
      ...(others.length ? { alternateLocale: others } : {}),
      url,
      title: shareTitle,
      description,
      images: [{ ...OG_IMAGE, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [{ url: OG_IMAGE.url, alt: imageAlt }],
    },
  };
}
