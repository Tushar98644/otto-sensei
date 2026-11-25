import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata, type PageMetadataOptions } from "@/components/site/page-metadata";
import { BRAND } from "@/config/brand";
import { ENABLED_LOCALES, isEnabledLocale, type Locale } from "./config";
import { loadMessages, translationsFor } from "./messages";
import {
  localizer,
  PAGE_KEYS,
  pageKey,
  pageNamespaces,
  type Localize,
  type PageKey,
} from "./pages";
import { getLocale } from "./server";

// The public pages a locale serves: every one in English, else those whose namespaces are all translated.
export async function publishedPages(locale: Locale): Promise<ReadonlySet<PageKey>> {
  if (!isEnabledLocale(locale)) return new Set();
  if (locale === "en") return new Set(PAGE_KEYS);
  const translated = await translationsFor(locale);
  return new Set(
    PAGE_KEYS.filter((key) => pageNamespaces(key).every((namespace) => namespace in translated)),
  );
}

export async function isPublished(locale: Locale, path: string): Promise<boolean> {
  const key = pageKey(path);
  return key !== null && (await publishedPages(locale)).has(key);
}

// The locales a page is published in, English first; none for a path that isn't a public page.
export async function publishedLocales(path: string): Promise<Locale[]> {
  const found = await Promise.all(
    ENABLED_LOCALES.map(async (locale) => ((await isPublished(locale, path)) ? locale : null)),
  );
  return found.filter((locale): locale is Locale => locale !== null);
}

// Each locale's published pages, for the language picker and hint in the browser.
export async function publishedByLocale(): Promise<Partial<Record<Locale, readonly PageKey[]>>> {
  const entries = await Promise.all(
    ENABLED_LOCALES.map(async (locale) => [locale, [...(await publishedPages(locale))]] as const),
  );
  return Object.fromEntries(entries);
}

export async function getLocalize(): Promise<Localize> {
  const locale = await getLocale();
  return localizer(locale, await publishedPages(locale));
}

// A page not published in this request's locale is a 404 there. Call it from the page or a layout: nested
// generateStaticParams must still list every page, since one that returns nothing for a locale prerenders none at all.
export async function requirePublished(path: string): Promise<void> {
  if (!(await isPublished(await getLocale(), path))) notFound();
}

// pageMetadata in this request's locale, with the languages the page is published in.
export async function localizedMetadata(
  options: Omit<PageMetadataOptions, "locale" | "locales">,
): Promise<Metadata> {
  const locale = await getLocale();
  const { brand } = await loadMessages(locale, "common");
  return pageMetadata({
    ...options,
    locale,
    locales: await publishedLocales(options.path),
    imageAlt: `${BRAND.name}: ${brand.tagline}`,
  });
}
