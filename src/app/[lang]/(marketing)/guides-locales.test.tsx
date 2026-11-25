import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMessages } from "@/i18n/messages";
import { setRootLang } from "@/i18n/testing";
import { lintBullet, lintResume, lintSummary } from "@/lib/lint/bullets";
import { issueText } from "@/lib/lint/i18n";
import { ATS_IDS } from "@/lib/seo-pages/ats";
import { COMPETITORS } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES, exampleResume } from "@/lib/seo-pages/examples";
import { examplesIn } from "@/lib/seo-pages/locales/examples";
import AtsGuidePage, {
  generateMetadata as guideMetadata,
  generateStaticParams as guideParams,
} from "./ats/[system]/page";
import ComparePage, {
  generateMetadata as compareMetadata,
  generateStaticParams as compareParams,
} from "./compare/[competitor]/page";
import ExamplePage, {
  generateMetadata as exampleMetadata,
  generateStaticParams as exampleParams,
} from "./resume-examples/[role]/page";
import { lineCheckNote } from "./resume-examples/_components/line-check";

vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ prefetch: () => {}, push: () => {} }),
}));

afterEach(() => setRootLang("en"));

const decode = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

type Node = Record<string, unknown>;
const jsonLd = (html: string): Node[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]!) as Node,
  );

const ALL_LANGUAGES = (path: string) => ({
  en: path,
  es: `/es${path}`,
  "pt-BR": `/pt-br${path}`,
  fr: `/fr${path}`,
  de: `/de${path}`,
  "x-default": path,
});

describe("the guides keep every English page prerendered", () => {
  it("lists every slug once for every language, English included", () => {
    expect(exampleParams()).toHaveLength(ROLE_EXAMPLES.length);
    expect(compareParams()).toHaveLength(COMPETITORS.length);
    expect(guideParams()).toHaveLength(ATS_IDS.length);
  });
});

describe("a translated resume example", () => {
  it("names its own address and every language's, with a title and snippet in Spanish", async () => {
    setRootLang("es");
    const params = Promise.resolve({ role: "data-analyst" });
    const meta = await exampleMetadata({ params });
    const [spanish] = (await examplesIn("es")).filter((item) => item.slug === "data-analyst");
    expect(meta.alternates?.canonical).toBe("/es/resume-examples/data-analyst");
    expect(meta.alternates?.languages).toEqual(ALL_LANGUAGES("/resume-examples/data-analyst"));
    expect(meta.description).toBe(spanish!.description);
    expect(String((meta.title as { absolute?: string }).absolute ?? meta.title)).toContain(
      spanish!.role,
    );
    expect(meta.openGraph).toMatchObject({
      locale: "es_LA",
      url: "/es/resume-examples/data-analyst",
    });
  });

  it("draws the resume in Spanish: its headings, dates and lines, with Spanish links around it", async () => {
    setRootLang("es");
    const html = await ExamplePage({ params: Promise.resolve({ role: "software-engineer" }) });
    const page = renderToStaticMarkup(html);
    const words = text(page);
    expect(words).toContain("Experiencia");
    expect(words).toContain("Abr. 2024 – Actualidad");
    expect(words).toContain("Imani Robinson");
    expect(words).not.toContain("Turn duties into results");
    expect(page).toContain('href="/es/resume-examples/backend-developer"');
    expect(page).toContain('href="/studio"');
    const faq = jsonLd(page).find((node) => node["@type"] === "FAQPage");
    expect(faq?.inLanguage).toBe("es");
  });

  it("shows what the Spanish line check says about each weak line", async () => {
    const lint = await loadMessages("es", "lint");
    const [spanish] = (await examplesIn("es")).filter((item) => item.slug === "software-engineer");
    for (const line of spanish!.lines) {
      const issue = lintBullet(line.weak, { kind: "work", lang: "es" })[0];
      expect(issue, line.weak).toBeDefined();
      expect(lineCheckNote(line.weak, "es", lint)).toBe(issueText(issue!, lint, "es"));
    }
    // "Responsable del…" is a duty only to the Spanish pack, and the note says so in Spanish.
    const duty = spanish!.lines[0]!.weak;
    expect(lintBullet(duty, { kind: "work", lang: "es" })[0]?.id).toBe("duty");
    expect(lintBullet(duty)[0]?.id).not.toBe("duty");
    expect(lineCheckNote(duty, "es", lint)).toContain("suena a descripción del puesto");
    setRootLang("es");
    const html = renderToStaticMarkup(
      await ExamplePage({ params: Promise.resolve({ role: "software-engineer" }) }),
    );
    expect(text(html)).toContain(text(lineCheckNote(duty, "es", lint)));
  });

  it("passes the line check of its own language on every line, like the English ones", async () => {
    for (const locale of ["es", "pt-BR", "fr", "de"] as const) {
      const lang = locale === "pt-BR" ? "pt" : locale;
      for (const example of await examplesIn(locale)) {
        const resume = exampleResume(example);
        expect(resume.lang, example.slug).toBe(lang);
        const { byBullet } = lintResume(resume);
        expect(Object.values(byBullet).flat(), `${locale} ${example.slug}`).toEqual([]);
        expect(lintSummary(resume.summary, lang), `${locale} ${example.slug}`).toEqual([]);
        expect(example.description.length, `${locale} ${example.slug}`).toBeLessThanOrEqual(155);
        for (const line of example.lines) {
          expect(lintBullet(line.weak, { kind: "work", lang }).length, line.weak).toBeGreaterThan(
            0,
          );
          expect(lintBullet(line.strong, { kind: "work", lang }), line.strong).toEqual([]);
        }
      }
    }
  });
});

describe("a translated comparison", () => {
  it("is its own canonical and lists every language", async () => {
    setRootLang("de");
    const meta = await compareMetadata({ params: Promise.resolve({ competitor: "rezi" }) });
    expect(meta.alternates?.canonical).toBe("/de/compare/rezi");
    expect(meta.alternates?.languages).toEqual(ALL_LANGUAGES("/compare/rezi"));
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
  });

  it("keeps every price and date, written the German way, and says so in German", async () => {
    setRootLang("de");
    const html = renderToStaticMarkup(
      await ComparePage({ params: Promise.resolve({ competitor: "rezi" }) }),
    );
    const words = text(html);
    expect(words).toMatch(/29\s\$/u);
    expect(words).toContain("geprüft am 22. November 2026");
    expect(words).not.toContain("checked on");
    expect(html).toContain('href="/de/job-match"');
    const article = jsonLd(html).find((node) => node["@type"] === "Article");
    expect(article).toMatchObject({ inLanguage: "de", dateModified: "2026-11-22" });
  });
});

describe("a translated ATS guide", () => {
  it("is its own canonical, lists every language and speaks French in its article", async () => {
    setRootLang("fr");
    const params = Promise.resolve({ system: "workday" });
    const meta = await guideMetadata({ params });
    expect(meta.alternates?.canonical).toBe("/fr/ats/workday");
    expect(meta.alternates?.languages).toEqual(ALL_LANGUAGES("/ats/workday"));
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
    const html = renderToStaticMarkup(await AtsGuidePage({ params }));
    const article = jsonLd(html).find((node) => node["@type"] === "TechArticle");
    expect(article?.inLanguage).toBe("fr");
    expect(html).toContain('action="/fr/job-match"');
    expect(text(html)).not.toContain("What to do:");
  });
});
