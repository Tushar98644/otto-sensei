import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TITLE_SUFFIX } from "@/components/site/page-metadata";
import { BRAND } from "@/config/brand";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import { TEMPLATE_LIST } from "@/lib/pdf/templates";
import { SEO_LIMITS } from "@/lib/seo/limits";
import { ATS_IDS } from "@/lib/seo-pages/ats";
import { COMPETITORS } from "@/lib/seo-pages/compare";
import { Faq } from "./_components/faq";
import { WebsiteJsonLd } from "./_components/website-json-ld";
import { metadata as acceptableUseMetadata } from "./acceptable-use/page";
import AtsGuidePage, { generateMetadata as guideMetadata } from "./ats/[system]/page";
import { metadata as atsMetadata } from "./ats/page";
import ComparePage, { generateMetadata as compareMetadata } from "./compare/[competitor]/page";
import { metadata as compareIndexMetadata } from "./compare/page";
import JobMatchPage, { metadata as jobMatchMetadata } from "./job-match/page";
import { metadata as homeMetadata } from "./page";
import PricingPage, { generateMetadata as pricingMetadata } from "./pricing/page";
import { metadata as privacyMetadata } from "./privacy/page";
import { metadata as refundsMetadata } from "./refunds/page";
import ResumeTemplatesPage, { metadata as templatesMetadata } from "./resume-templates/page";
import { metadata as termsMetadata } from "./terms/page";

vi.mock("next/font/google", () => {
  const font = () => () => ({ className: "face", variable: "", style: { fontFamily: "serif" } });
  return { Inter: font(), EB_Garamond: font() };
});

vi.mock("@/lib/job-feed/live-counts", () => ({
  loadJobCounts: async () => JOB_COUNTS_FALLBACK,
}));

vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ prefetch: () => {}, push: () => {} }),
}));

type Node = Record<string, unknown>;

const decode = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const words = (html: string) =>
  decode(html.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

// Every JSON-LD node on the page, graphs opened up.
function nodesOf(html: string): Node[] {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return scripts.flatMap((match) => {
    const data = JSON.parse(match[1]!) as Node;
    return (data["@graph"] as Node[] | undefined) ?? [data];
  });
}

const ofType = (html: string, type: string) =>
  nodesOf(html).filter((node) => node["@type"] === type);

// The questions and answers in the page's FAQ lists, as a reader sees them.
function visibleFaq(html: string): { question: string; answer: string }[] {
  return [...html.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)].map((match) => {
    const [, summary = "", answer = ""] = /<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*)/.exec(
      match[1]!,
    )!;
    return { question: words(summary), answer: words(answer) };
  });
}

function markedFaq(html: string): { question: string; answer: string }[] {
  const [faq] = ofType(html, "FAQPage");
  return ((faq?.mainEntity as Node[] | undefined) ?? []).map((entry) => ({
    question: String(entry.name),
    answer: String((entry.acceptedAnswer as Node).text),
  }));
}

const pricingHtml = async () => renderToStaticMarkup(await PricingPage());
const guideHtml = async (system: string) =>
  renderToStaticMarkup(await AtsGuidePage({ params: Promise.resolve({ system }) }));
const compareHtml = async (competitor: string) =>
  renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ competitor }) }));

describe("FAQ markup", () => {
  it.each([
    [
      "home",
      async () =>
        renderToStaticMarkup(
          <>
            <WebsiteJsonLd />
            <Faq />
          </>,
        ),
    ],
    ["pricing", pricingHtml],
    ["job match", async () => renderToStaticMarkup(<JobMatchPage />)],
    ["resume templates", async () => renderToStaticMarkup(<ResumeTemplatesPage />)],
  ])("on %s quotes exactly the questions and answers the page shows", async (_, render) => {
    const html = await render();
    const shown = visibleFaq(html);
    expect(shown.length).toBeGreaterThan(2);
    expect(markedFaq(html)).toEqual(shown);
  });

  it("stays off pages that show no questions and answers", async () => {
    for (const html of [await guideHtml("workday"), await compareHtml("jobscan")]) {
      expect(visibleFaq(html)).toEqual([]);
      expect(ofType(html, "FAQPage")).toEqual([]);
    }
  });
});

describe("page JSON-LD", () => {
  it("home names the site, its publisher with a logo, and the app with its offers", async () => {
    const html = renderToStaticMarkup(<WebsiteJsonLd />);
    const [organization] = ofType(html, "Organization");
    expect(organization).toMatchObject({ name: BRAND.name, logo: { "@type": "ImageObject" } });
    const [app] = ofType(html, "WebApplication");
    expect(app).toMatchObject({ applicationCategory: "BusinessApplication" });
    const [pricingApp] = ofType(await pricingHtml(), "WebApplication");
    expect(app?.offers).toEqual(pricingApp?.offers);
  });

  it("job match is a free web app described by the words under its heading", () => {
    const html = renderToStaticMarkup(<JobMatchPage />);
    const [app] = ofType(html, "WebApplication");
    expect(app).toMatchObject({
      isAccessibleForFree: true,
      url: expect.stringMatching(/\/job-match$/),
    });
    expect(words(html)).toContain(String(app?.description));
  });

  it.each(ATS_IDS)("the %s guide is a tech article headlined like its h1", async (system) => {
    const html = await guideHtml(system);
    const [article] = ofType(html, "TechArticle");
    const h1 = words(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)![1]!);
    expect(article?.headline).toBe(h1);
    for (const source of article?.citation as { url: string }[]) {
      expect(html).toContain(`href="${source.url.replace(/&/g, "&amp;")}"`);
    }
    expect(ofType(html, "BreadcrumbList")).toHaveLength(1);
  });

  it.each(COMPETITORS.map((c) => c.slug))(
    "the %s comparison is an article headlined like its h1",
    async (slug) => {
      const html = await compareHtml(slug);
      const [article] = ofType(html, "Article");
      const h1 = words(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)![1]!);
      expect(article?.headline).toBe(h1);
      expect(html.toLowerCase()).toContain(`datetime="${String(article?.dateModified)}"`);
      expect(ofType(html, "BreadcrumbList")).toHaveLength(1);
    },
  );

  it("the templates page lists the formats it shows, in order", () => {
    const html = renderToStaticMarkup(<ResumeTemplatesPage />);
    const [list] = ofType(html, "ItemList");
    const names = (list?.itemListElement as { item: { name: string; url: string } }[]).map(
      (entry) => entry.item,
    );
    expect(names.map((item) => item.name)).toEqual(TEMPLATE_LIST.map((info) => info.name));
    for (const info of TEMPLATE_LIST) expect(html).toContain(`id="${info.id}"`);
  });
});

function resolvedTitle(meta: Metadata): string {
  const { title } = meta;
  if (typeof title === "string") return `${title}${TITLE_SUFFIX}`;
  if (title && typeof title === "object" && "absolute" in title) return title.absolute;
  throw new Error("Every public page sets its own title");
}

async function publicMetadata(): Promise<[string, Metadata][]> {
  return [
    ["/", homeMetadata],
    ["/pricing", pricingMetadata()],
    ["/job-match", jobMatchMetadata],
    ["/resume-templates", templatesMetadata],
    ["/ats", atsMetadata],
    ...(await Promise.all(
      ATS_IDS.map(async (system): Promise<[string, Metadata]> => [
        `/ats/${system}`,
        await guideMetadata({ params: Promise.resolve({ system }) }),
      ]),
    )),
    ["/compare", compareIndexMetadata],
    ...(await Promise.all(
      COMPETITORS.map(async ({ slug }): Promise<[string, Metadata]> => [
        `/compare/${slug}`,
        await compareMetadata({ params: Promise.resolve({ competitor: slug }) }),
      ]),
    )),
    ["/privacy", privacyMetadata],
    ["/terms", termsMetadata],
    ["/refunds", refundsMetadata],
    ["/acceptable-use", acceptableUseMetadata],
  ];
}

describe("public page metadata", () => {
  it("gives every public page a title and description that fit a search result", async () => {
    const { min, max } = SEO_LIMITS.description;
    for (const [path, meta] of await publicMetadata()) {
      const title = resolvedTitle(meta);
      const description = String(meta.description);
      expect(title.length, `${path}: ${title}`).toBeLessThanOrEqual(SEO_LIMITS.title);
      expect(title.length, `${path}: ${title}`).toBeGreaterThanOrEqual(40);
      expect(description.length, `${path}: ${description}`).toBeGreaterThanOrEqual(min);
      expect(description.length, `${path}: ${description}`).toBeLessThanOrEqual(max);
    }
  });

  it("never repeats a title or description across pages", async () => {
    const all = await publicMetadata();
    const titles = all.map(([, meta]) => resolvedTitle(meta));
    const descriptions = all.map(([, meta]) => String(meta.description));
    expect(new Set(titles).size).toBe(all.length);
    expect(new Set(descriptions).size).toBe(all.length);
  });

  it("shares the same title, text and image on Open Graph and Twitter, at the canonical URL", async () => {
    for (const [path, meta] of await publicMetadata()) {
      const title = resolvedTitle(meta);
      expect(meta.alternates?.canonical, path).toBe(path);
      expect(meta.openGraph, path).toMatchObject({
        url: path,
        title,
        description: meta.description,
        images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
      });
      expect(meta.twitter, path).toMatchObject({
        card: "summary_large_image",
        title,
        description: meta.description,
      });
    }
  });
});
