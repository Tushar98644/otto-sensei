import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ENABLED_LOCALES, LANGUAGE_NAMES, localeSegment } from "@/i18n/config";
import { localizedPath, PAGE_KEYS, pageKey, SECTION_KEYS, unprefixedPath } from "@/i18n/pages";
import { hintTarget, LanguageHint } from "./language-hint";
import { LanguageHintLoader } from "./language-hint-loader";
import { languageLinks } from "./language-links";
import { pageLanguages, type LanguageLinks } from "./page-languages";

const LINKS: LanguageLinks = {
  languages: ENABLED_LOCALES.map((locale) => ({
    locale,
    segment: localeSegment(locale),
    prefix: locale === "en" ? "" : `/${localeSegment(locale)}`,
    name: LANGUAGE_NAMES[locale],
  })),
  pages: { en: ["/", "/pricing", "/compare"], es: ["/", "/pricing"], de: ["/pricing"] },
  sections: ["/compare"],
};

describe("the language hint", () => {
  it("offers the page in the browser's first language it's published in, never over English", () => {
    const pricing = pageLanguages("/pricing", LINKS);
    expect(hintTarget(["es-MX", "en"], pricing)).toMatchObject({
      locale: "es",
      href: "/es/pricing",
    });
    expect(hintTarget(["ja", "de-AT"], pricing)).toMatchObject({
      locale: "de",
      href: "/de/pricing",
    });
    expect(hintTarget(["en-GB", "es"], pricing)).toBeNull();
    expect(hintTarget(["fr-FR"], pricing)).toBeNull();
    expect(hintTarget(["es"], pageLanguages("/compare", LINKS))).toBeNull();
  });

  it("reads the same path whether the server sees /en/… or the browser sees /…", () => {
    expect(pageLanguages("/en/pricing", LINKS)).toEqual(pageLanguages("/pricing", LINKS));
    expect(pageLanguages("/", LINKS).map(({ href }) => href)).toEqual(["/", "/es"]);
    expect(pageLanguages("/studio", LINKS)).toEqual([]);
  });

  it("finds the languages src/i18n/pages.ts would, for every public page", async () => {
    const links = await languageLinks();
    expect(links.sections).toEqual(SECTION_KEYS);
    const paths = PAGE_KEYS.flatMap((key) => [key, `${key}/x`, `/en${key}`, `/es${key}`]);
    for (const pathname of [...paths, "", "/studio", "/pt-br/pricing", "/de"]) {
      const path = unprefixedPath(pathname);
      const key = pageKey(path);
      const expected = (key ? ENABLED_LOCALES : [])
        .filter((locale) => key && links.pages[locale]?.includes(key))
        .map((locale) => ({
          locale,
          name: LANGUAGE_NAMES[locale],
          href: localizedPath(locale, path),
        }));
      expect(pageLanguages(pathname, links), pathname).toEqual(expected);
    }
  });

  it("draws nothing on the server, so the page never shifts when it appears", () => {
    const hints = { es: { text: "También en español.", link: "Leer", dismiss: "Cerrar" } };
    expect(renderToStaticMarkup(<LanguageHint hints={hints} links={LINKS} />)).toBe("");
    expect(renderToStaticMarkup(<LanguageHintLoader hints={hints} links={LINKS} />)).toBe("");
  });
});
