import { afterEach, describe, expect, it } from "vitest";
import { localizedPath, localizer, pageKey, unprefixedPath } from "./pages";
import {
  isPublished,
  localizedMetadata,
  publishedLocales,
  publishedPages,
  requirePublished,
} from "./publish";
import { setRootLang } from "./testing";

afterEach(() => setRootLang("en"));

const ALL = ["en", "es", "pt-BR", "fr", "de"];

describe("public pages", () => {
  it("finds the page a path belongs to, and nothing for the app or unknown paths", () => {
    expect(pageKey("/")).toBe("/");
    expect(pageKey("/pricing?x=1#faq")).toBe("/pricing");
    expect(pageKey("/#how")).toBe("/");
    expect(pageKey("/compare/rezi")).toBe("/compare");
    expect(pageKey("/login/trial")).toBe("/login");
    for (const path of ["/studio", "/dashboard/jobs", "/pricing/x", "/privacyx", "/account"]) {
      expect(pageKey(path), path).toBeNull();
    }
  });

  it("puts a path under its language's prefix and takes it off again", () => {
    expect(localizedPath("en", "/pricing")).toBe("/pricing");
    expect(localizedPath("es", "/")).toBe("/es");
    expect(localizedPath("pt-BR", "/#how")).toBe("/pt-br#how");
    expect(localizedPath("de", "/job-match?job=x")).toBe("/de/job-match?job=x");
    expect(unprefixedPath("/es/pricing")).toBe("/pricing");
    expect(unprefixedPath("/en/pricing")).toBe("/pricing");
    expect(unprefixedPath("/fr")).toBe("/");
    expect(unprefixedPath("/pricing")).toBe("/pricing");
  });
});

describe("the publishing gate", () => {
  it("publishes every public page in English", async () => {
    expect(await isPublished("en", "/compare/rezi")).toBe(true);
    expect(await isPublished("en", "/login/trial")).toBe(true);
  });

  it("keeps the guides English-only until their namespaces are translated", async () => {
    for (const locale of ["es", "pt-BR", "fr", "de"] as const) {
      for (const path of ["/compare/rezi", "/compare", "/ats/workday", "/resume-examples"]) {
        expect(await isPublished(locale, path), `${locale} ${path}`).toBe(false);
      }
      expect(await isPublished(locale, "/resume-templates")).toBe(false);
      expect(await isPublished(locale, "/pricing")).toBe(true);
    }
    expect(await publishedLocales("/compare/rezi")).toEqual(["en"]);
    expect(await publishedLocales("/pricing")).toEqual(ALL);
    expect(await publishedLocales("/login")).toEqual(ALL);
    expect(await publishedLocales("/login/trial")).toEqual(ALL);
    expect(await publishedLocales("/studio")).toEqual([]);
  });

  it("answers an unpublished page with a 404 in that language only", async () => {
    setRootLang("es");
    await expect(requirePublished("/compare/rezi")).rejects.toThrow();
    await expect(requirePublished("/pricing")).resolves.toBeUndefined();
    setRootLang("en");
    await expect(requirePublished("/compare/rezi")).resolves.toBeUndefined();
  });

  it("links a translated page to its own language where it can, and plainly everywhere else", async () => {
    const href = localizer("es", await publishedPages("es"));
    expect(href("/pricing")).toBe("/es/pricing");
    expect(href("/")).toBe("/es");
    expect(href("/#how")).toBe("/es#how");
    expect(href("/compare")).toBe("/compare");
    expect(href("/login")).toBe("/es/login");
    expect(href("/studio")).toBe("/studio");
    expect(href("/dashboard/jobs")).toBe("/dashboard/jobs");
    expect(href("https://example.com/x")).toBe("https://example.com/x");
    const english = localizer("en", await publishedPages("en"));
    expect(english("/pricing")).toBe("/pricing");
  });
});

describe("page metadata per language", () => {
  const options = { title: "Pricing", description: "Plans.", path: "/pricing" };

  it("is its own canonical, and lists every language it's in with English as x-default", async () => {
    setRootLang("es");
    const meta = await localizedMetadata(options);
    expect(meta.alternates?.canonical).toBe("/es/pricing");
    expect(meta.alternates?.languages).toEqual({
      en: "/pricing",
      es: "/es/pricing",
      "pt-BR": "/pt-br/pricing",
      fr: "/fr/pricing",
      de: "/de/pricing",
      "x-default": "/pricing",
    });
    expect(meta.openGraph).toMatchObject({
      locale: "es_LA",
      alternateLocale: ["en_US", "pt_BR", "fr_FR", "de_DE"],
      url: "/es/pricing",
    });
  });

  it("keeps English canonical where it was, and adds the other languages", async () => {
    const meta = await localizedMetadata(options);
    expect(meta.alternates?.canonical).toBe("/pricing");
    expect(meta.alternates?.languages).toMatchObject({
      es: "/es/pricing",
      "x-default": "/pricing",
    });
    expect(meta.openGraph).toMatchObject({ locale: "en_US", url: "/pricing" });
  });

  it("lists no other language for a page that's only in English", async () => {
    const meta = await localizedMetadata({ ...options, path: "/compare" });
    expect(meta.alternates).toEqual({ canonical: "/compare" });
    expect(meta.openGraph).not.toHaveProperty("alternateLocale");
  });
});
