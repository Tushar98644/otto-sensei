import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localizedPath } from "@/i18n/pages";
import { setRootLang } from "@/i18n/testing";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import RootLayout, { generateStaticParams as rootParams } from "../layout";
import CompareLayout from "./compare/layout";
import { generateStaticParams as competitorParams } from "./compare/[competitor]/page";
import MarketingLayout from "./layout";
import PricingPage, { generateMetadata as pricingMetadata } from "./pricing/page";

vi.mock("next/font/google", () => {
  const font = () => () => ({ className: "face", variable: "", style: { fontFamily: "serif" } });
  return { Inter: font(), EB_Garamond: font() };
});
vi.mock("@/lib/job-feed/live-counts", () => ({ loadJobCounts: async () => JOB_COUNTS_FALLBACK }));
vi.mock("@/lib/analytics/analytics", () => ({ Analytics: () => null }));
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  usePathname: () => "/es/pricing",
  useRouter: () => ({ prefetch: () => {}, push: () => {} }),
}));

afterEach(() => setRootLang("en"));

// Renders a page the way Next nests it: root layout, marketing layout, page.
async function render(segment: string, page: () => Promise<ReactNode>): Promise<string> {
  setRootLang(segment);
  const marketing = await MarketingLayout({ children: await page() });
  const root = await RootLayout({
    children: marketing,
    params: Promise.resolve({ lang: segment }),
  } as LayoutProps<"/[lang]">);
  const stream = await renderToReadableStream(root);
  await stream.allReady;
  return new Response(stream).text();
}

describe("a translated page", () => {
  it("prerenders every language", () => {
    expect(rootParams()).toEqual(["en", "es", "pt-br", "fr", "de"].map((lang) => ({ lang })));
  });

  it("serves /es/pricing in Spanish, in a Spanish document, linking its own language", async () => {
    const html = await render("es", PricingPage);
    expect(html).toMatch(/^<!DOCTYPE html><html lang="es">/);
    expect(html).toContain("Gratis para lo básico.");
    expect(html).toContain("Preguntas sobre facturación");
    expect(html).not.toContain("Billing questions");
    expect(html).toContain('href="/es/privacy"');
    expect(html).toContain('href="/studio"');
    expect(html).not.toContain('href="/es/studio"');
    // The footer's language picker: the same page in each language.
    for (const href of ["/pricing", "/pt-br/pricing", "/fr/pricing", "/de/pricing"]) {
      expect(html).toContain(`href="${href}"`);
    }
    // The browser-language hint loads on English pages only.
    expect(html).not.toContain("Esta página también está en español");
  });

  it("names its own address and every language's in its head", async () => {
    setRootLang("es");
    const meta = await pricingMetadata();
    expect(meta.alternates?.canonical).toBe("/es/pricing");
    expect(meta.alternates?.languages).toMatchObject({
      en: "/pricing",
      de: localizedPath("de", "/pricing"),
      "x-default": "/pricing",
    });
  });
});

describe("a guide section (P5)", () => {
  it("lists every comparison for every language, and its layout lets each published one through", async () => {
    // Every language lists every comparison; the layout would turn an unpublished one into a 404.
    expect(competitorParams().map(({ competitor }) => competitor)).toContain("rezi");
    for (const segment of ["en", "es", "pt-br", "fr", "de"]) {
      setRootLang(segment);
      expect(await CompareLayout({ children: "ok" }), segment).toBe("ok");
    }
  });
});
