import type { Locale } from "@/i18n/config";

// What the browser needs to list a page's languages, worked out on the server (./language-links) so i18n's tables stay there.
export type LanguageLinks = {
  // Each served language, English first: its URL segment (/en/… is how the server renders English), path prefix and own name.
  languages: readonly { locale: Locale; segment: string; prefix: string; name: string }[];
  // The public pages each language publishes (English all of them); a section's key also covers the pages under it.
  pages: Partial<Record<Locale, readonly string[]>>;
  sections: readonly string[];
};

const pathOnly = (href: string) => /^[^?#]*/.exec(href)?.[0] || "/";

// The languages this path is published in, as src/i18n/pages.ts reads it; the server sees /en/… and the browser /…, so both match.
export function pageLanguages(pathname: string, { languages, pages, sections }: LanguageLinks) {
  const [, first = "", ...rest] = pathname.split("/");
  const path = languages.some(({ segment }) => segment === first) ? `/${rest.join("/")}` : pathname;
  const page = pathOnly(path);
  const key = (pages[languages[0]?.locale ?? "en"] ?? []).find(
    (key) => page === key || (sections.includes(key) && page.startsWith(`${key}/`)),
  );
  if (!key) return [];
  const tail = path.slice(/^[^?#]*/.exec(path)?.[0].length ?? 0);
  return languages
    .filter(({ locale }) => pages[locale]?.includes(key))
    .map(({ locale, prefix, name }) => ({
      locale,
      name,
      href: prefix ? `${prefix}${page === "/" ? "" : page}${tail}` : path,
    }));
}
