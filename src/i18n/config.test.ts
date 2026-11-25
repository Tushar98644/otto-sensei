import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  intlLocale,
  isEnabledLocale,
  isLocale,
  LOCALES,
  localeFromSegment,
  localeSegment,
  matchLocale,
  openGraphLocale,
} from "./config";

describe("locales", () => {
  it("serves every language, English by default; each page is published per language", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(ENABLED_LOCALES).toEqual(["en", "es", "pt-BR", "fr", "de"]);
    expect(LOCALES).toEqual(["en", "es", "pt-BR", "fr", "de"]);
    expect(LOCALES.filter(isEnabledLocale)).toEqual(LOCALES);
  });

  it("knows its own codes and nothing else", () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
    for (const value of ["EN", "pt-br", "pt", "es-MX", "", undefined, null, 3]) {
      expect(isLocale(value), String(value)).toBe(false);
    }
  });

  it("puts each locale under a lowercase URL prefix and reads it back", () => {
    expect(LOCALES.map(localeSegment)).toEqual(["en", "es", "pt-br", "fr", "de"]);
    for (const locale of LOCALES) expect(localeFromSegment(localeSegment(locale))).toBe(locale);
    for (const segment of ["pt-BR", "EN", "pricing", "", undefined]) {
      expect(localeFromSegment(segment), String(segment)).toBeNull();
    }
  });

  it("formats English as en-US, as the site always has", () => {
    expect(intlLocale("en")).toBe("en-US");
    expect(intlLocale("es")).toBe("es-419");
    expect(openGraphLocale("en")).toBe("en_US");
    expect(openGraphLocale("pt-BR")).toBe("pt_BR");
    for (const locale of LOCALES) {
      expect(Intl.getCanonicalLocales(intlLocale(locale))).toEqual([intlLocale(locale)]);
    }
  });

  it("matches any BCP-47 tag to the closest locale we have", () => {
    expect(matchLocale("en")).toBe("en");
    expect(matchLocale("en-GB")).toBe("en");
    expect(matchLocale("es-MX")).toBe("es");
    expect(matchLocale("es_419")).toBe("es");
    expect(matchLocale("pt-BR")).toBe("pt-BR");
    expect(matchLocale("pt-br")).toBe("pt-BR");
    expect(matchLocale("pt-PT")).toBe("pt-BR");
    expect(matchLocale("fr-CA")).toBe("fr");
    expect(matchLocale(" de-AT ")).toBe("de");
    for (const tag of ["zh-CN", "", "not a tag!", null, undefined]) {
      expect(matchLocale(tag), String(tag)).toBeNull();
    }
  });
});
