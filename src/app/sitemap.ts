import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, PRIVACY_LAST_UPDATED, ROUTES } from "@/components/site/routes";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/pages";
import { publishedLocales } from "@/i18n/publish";
import { seoPages } from "@/lib/seo-pages/pages";
import { PRODUCT_PAGES_UPDATED, SEO_PATHS } from "@/lib/seo-pages/paths";
import { absoluteUrl } from "@/lib/seo/urls";

type Page = { path: string; lastModified: string };

function englishPages(): Page[] {
  const pages = [ROUTES.home, ROUTES.pricing, SEO_PATHS.jobMatch].map((path) => ({
    path,
    lastModified: PRODUCT_PAGES_UPDATED,
  }));
  const guides = seoPages().map(({ path, lastModified }) => ({ path, lastModified }));
  const legal = [ROUTES.privacy, ROUTES.terms, ROUTES.refunds, ROUTES.acceptableUse].map(
    (path) => ({
      path,
      lastModified: path === ROUTES.privacy ? PRIVACY_LAST_UPDATED : LEGAL_LAST_UPDATED,
    }),
  );
  return [...pages, ...guides, ...legal];
}

// Every language a page is published in lists all of them, English as x-default, as its hreflang tags do.
function alternates(path: string, locales: readonly Locale[]) {
  if (locales.length < 2) return {};
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = absoluteUrl(localizedPath(locale, path));
  languages["x-default"] = absoluteUrl(path);
  return { alternates: { languages } };
}

// English pages first, as before; then each page in every other language it is published in.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await Promise.all(
    englishPages().map(async (page) => ({ ...page, locales: await publishedLocales(page.path) })),
  );
  const entry = (page: (typeof pages)[number], locale: Locale) => ({
    url: absoluteUrl(localizedPath(locale, page.path)),
    lastModified: page.lastModified,
    ...alternates(page.path, page.locales),
  });
  const english = pages.map((page) => entry(page, DEFAULT_LOCALE));
  const translated = pages.flatMap((page) =>
    page.locales.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => entry(page, locale)),
  );
  return [...english, ...translated];
}
