import { describe, expect, it } from "vitest";
import { FOOTER_GROUPS, FOOTER_NAV } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { PRICES_USD, PRO_PRICE_COMPARISON } from "@/config/plans";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import {
  ATS_GUIDES,
  ATS_IDS,
  GENERAL_ADVICE,
  INDEXED_ATS_GUIDES,
  MIN_INDEXED_NOTES,
  TOPIC_ORDER,
  atsGuide,
  guideHeadline,
  guideSources,
  isAtsId,
  isIndexed,
  readsFiles,
  topTip,
} from "./ats";
import {
  COMPETITORS,
  COMPETITORS_CHECKED,
  type CompareCell,
  REZI_PRO_USD,
  bothHaveFreePlans,
  choices,
  competitorBySlug,
  ottoReasons,
} from "./compare";
import { breadcrumbJsonLd } from "./json-ld";
import { llmsTxt } from "./llms";
import { RELATED, atsGuidePage, comparePage, seoPages } from "./pages";
import { SEO_PAGES_UPDATED, SEO_PATHS } from "./paths";

const BASE = "https://www.ottosensei.com";
const LOCAL_ONLY =
  /₹|\blakh|\bcrore|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|pune|kolkata|diwali/i;
const PROMISES =
  /you will (?:pass|get)|beat the ats|ats[- ]proof|100% ats|guaranteed? (?:an? )?(?:interview|job|pass)/i;
const DISPARAGING = /\b(?:worse|terrible|scam|overpriced|rip-?off|useless|bad)\b/i;

const cellText = (cell: CompareCell | undefined) => `${cell?.answer ?? ""} ${cell?.detail ?? ""}`;

function allCompareText(): string {
  return COMPETITORS.flatMap((c) => [
    c.summary,
    c.pickThem,
    c.pickOtto,
    ...c.strengths,
    ...c.rows.flatMap((row) => [row.label, cellText(row.otto), cellText(row.them)]),
    ...c.differences.flatMap((note) => [note.title, note.text]),
    ...c.extras.flatMap((note) => [note.title, note.text]),
  ]).join("\n");
}

describe("ATS guides", () => {
  it("has one guide per hiring system Otto has notes on, in the same order", () => {
    expect(ATS_IDS).toEqual(Object.keys(HIRING_SYSTEMS));
    expect(ATS_GUIDES.map((guide) => guide.id)).toEqual(ATS_IDS);
    expect(isAtsId("greenhouse")).toBe(true);
    expect(isAtsId("toString")).toBe(false);
    expect(isAtsId("linkedin")).toBe(false);
  });

  it("shows every sourced note exactly once, grouped by topic in a fixed order", () => {
    for (const guide of ATS_GUIDES) {
      const shown = guide.sections.flatMap((section) => section.notes);
      expect(new Set(shown)).toEqual(new Set(HIRING_SYSTEMS[guide.id].notes));
      expect(shown).toHaveLength(HIRING_SYSTEMS[guide.id].notes.length);
      const order = guide.sections.map((section) => TOPIC_ORDER.indexOf(section.topic));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it("introduces each system in plain sentences, with how to spot its links", () => {
    for (const guide of ATS_GUIDES) {
      expect(guide.what, guide.name).toMatch(new RegExp(`^${guide.name.split(" ")[0]}`));
      expect(guide.what.endsWith("."), guide.name).toBe(true);
      expect(guide.spot, guide.name).toMatch(/\b[a-z0-9-]+\.(?:com|net|co|io)\b|_jid=/);
    }
  });

  it("lists each source once, with the topics it backs", () => {
    const sources = guideSources(atsGuide("greenhouse"));
    expect(sources.map((source) => source.url)).toEqual([
      ...new Set(HIRING_SYSTEMS.greenhouse.notes.map((note) => note.source.url)),
    ]);
    for (const guide of ATS_GUIDES) {
      for (const source of guideSources(guide)) {
        expect(new URL(source.url).protocol).toBe("https:");
        expect(source.topics.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives each source on a page its own label, by topic when two share a name", () => {
    for (const guide of ATS_GUIDES) {
      const labels = guideSources(guide).map((source) => source.label);
      expect(new Set(labels).size, guide.name).toBe(labels.length);
    }
    expect(guideSources(atsGuide("workday")).map((source) => source.label)).toEqual([
      "Workday docs on how it reads your file",
      "Workday docs on screening questions",
      "Workday HiredScore release notes",
    ]);
    expect(guideSources(atsGuide("taleo")).map((source) => source.label)).toEqual([
      "Oracle Taleo docs on how recruiters search it and how it reads your file",
      "Oracle Taleo docs on screening questions",
      "Oracle Taleo docs on screening questions (2)",
    ]);
    expect(guideSources(atsGuide("lever"))).toEqual([
      { ...HIRING_SYSTEMS.lever.notes[0]?.source, topics: ["ai"] },
    ]);
    expect(guideSources(atsGuide("workday")).map((source) => Boolean(source.byTopic))).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("leads each index card with a tip that changes the resume, and reads on its own", () => {
    expect(topTip(atsGuide("workday"))).toBe("Check every field it fills in before you submit.");
    expect(topTip(atsGuide("greenhouse"))).toBe(
      "Use one column under 2.5 MB, with contact details in the main text.",
    );
    expect(HIRING_SYSTEMS.recruitee.notes[0]?.todo).toMatch(/^Answer these /);
    expect(topTip(atsGuide("recruitee"))).toBe(
      "Answer screening questions truthfully, and the same way every time.",
    );
    expect(topTip(atsGuide("bamboohr"))).toBe(HIRING_SYSTEMS.bamboohr.notes[0]?.todo);
    for (const guide of ATS_GUIDES) {
      expect(topTip(guide), guide.name).not.toBe("");
      expect(topTip(guide), guide.name).not.toMatch(/\b(?:these|those)\b/i);
    }
  });

  it("knows which guides have no sourced notes on file reading", () => {
    expect(readsFiles(atsGuide("greenhouse"))).toBe(true);
    expect(readsFiles(atsGuide("lever"))).toBe(false);
  });

  it("promises how a system reads your resume only when a note covers it", () => {
    for (const guide of ATS_GUIDES) {
      const page = atsGuidePage(guide);
      const reads = /reads your resume/;
      expect(reads.test(guideHeadline(guide)), guide.name).toBe(readsFiles(guide));
      expect(reads.test(page.title), guide.name).toBe(readsFiles(guide));
    }
    expect(guideHeadline(atsGuide("workday"))).toBe("How Workday reads your resume");
    expect(guideHeadline(atsGuide("ashby"))).toBe("What Ashby does with your application");
  });

  it("keeps guides with a single sourced note out of search", () => {
    for (const guide of ATS_GUIDES) {
      const indexed = guide.notes.length >= MIN_INDEXED_NOTES;
      expect(isIndexed(guide), guide.name).toBe(indexed);
      expect(Boolean(atsGuidePage(guide).noindex), guide.name).toBe(!indexed);
    }
    expect(isIndexed(atsGuide("lever"))).toBe(false);
    expect(isIndexed(atsGuide("greenhouse"))).toBe(true);
  });

  it("keeps the general advice general: no promises", () => {
    for (const tip of GENERAL_ADVICE) {
      expect(`${tip.title} ${tip.text}`).not.toMatch(PROMISES);
      expect(tip.text.endsWith(".")).toBe(true);
    }
  });
});

describe("comparisons", () => {
  it("has unique slugs and finds each by its slug only", () => {
    const slugs = COMPETITORS.map((competitor) => competitor.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(competitorBySlug(slug)?.slug).toBe(slug);
    expect(competitorBySlug("teal")).toBeUndefined();
  });

  it("cites only the competitor's own https pages, checked on one stated day", () => {
    expect(COMPETITORS_CHECKED).toBe("2026-11-18");
    for (const competitor of COMPETITORS) {
      const home = new URL(competitor.site).hostname.replace(/^www\./, "");
      expect(competitor.sources.length).toBeGreaterThan(0);
      for (const source of competitor.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(url.hostname.replace(/^www\./, "")).toBe(home);
      }
    }
  });

  it("says what each competitor does well, and stays neutral", () => {
    for (const competitor of COMPETITORS) {
      expect(competitor.strengths.length, competitor.name).toBeGreaterThanOrEqual(3);
      expect(competitor.differences.length, competitor.name).toBeGreaterThan(0);
    }
    expect(allCompareText()).not.toMatch(DISPARAGING);
    expect(allCompareText()).not.toMatch(PROMISES);
  });

  it("writes each pick as the end of “Pick <name> if”, Otto first", () => {
    for (const competitor of COMPETITORS) {
      const [otto, them] = choices(competitor);
      expect(otto).toEqual({ name: BRAND.shortName, clause: competitor.pickOtto });
      expect(them).toEqual({ name: competitor.name, clause: competitor.pickThem });
      for (const clause of [competitor.pickOtto, competitor.pickThem]) {
        expect(clause, competitor.name).toMatch(/^you[ ']/);
        expect(clause.endsWith("."), competitor.name).toBe(true);
      }
      expect(bothHaveFreePlans(competitor), competitor.name).toBe(true);
    }
  });

  it("opens every cell with a short answer the detail doesn't repeat", () => {
    for (const competitor of COMPETITORS) {
      for (const row of competitor.rows) {
        for (const cell of [row.otto, row.them]) {
          const words = cell.answer.split(/\s+/).length;
          expect(words, `${competitor.name} ${row.label}: ${cell.answer}`).toBeGreaterThanOrEqual(2);
          expect(words, `${competitor.name} ${row.label}: ${cell.answer}`).toBeLessThanOrEqual(4);
          expect(cell.detail?.startsWith(cell.answer), cell.answer).not.toBe(true);
        }
      }
    }
  });

  it("gives Otto about four reasons per comparison, differences first", () => {
    for (const competitor of COMPETITORS) {
      const reasons = ottoReasons(competitor);
      expect(reasons.length, competitor.name).toBeGreaterThanOrEqual(3);
      expect(reasons.length, competitor.name).toBeLessThanOrEqual(4);
      expect(reasons.slice(0, competitor.differences.length)).toEqual(competitor.differences);
    }
  });

  it("keeps Otto-only facts apart from claims about the other product", () => {
    for (const competitor of COMPETITORS) {
      for (const note of competitor.extras) {
        expect(`${note.title} ${note.text}`, competitor.name).not.toContain(competitor.name);
      }
      const titles = [...competitor.differences, ...competitor.extras].map((note) => note.title);
      expect(new Set(titles).size, competitor.name).toBe(titles.length);
    }
  });

  it("cites the Jobscan tutorial for its match-rate method and limits its ATS detection", () => {
    const jobscan = competitorBySlug("jobscan")!;
    expect(jobscan.sources.map((source) => source.url)).toContain(
      "https://www.jobscan.co/jobscan-tutorial",
    );
    expect(cellText(jobscan.rows.find((row) => row.label === "Score")?.them)).toContain(
      "only when the post asks for an advanced degree",
    );
    expect(cellText(jobscan.rows.find((row) => row.label === "Hiring systems")?.them)).toContain(
      "when it recognizes",
    );
  });

  it("titles each comparison without repeating the brand", () => {
    for (const competitor of COMPETITORS) {
      const page = comparePage(competitor);
      expect(page.title).toBe(`${BRAND.name} vs ${competitor.name}`);
      expect(page.absoluteTitle).toBe(true);
    }
  });

  it("writes Otto's prices from the plan config and Rezi's from the same check as pricing", () => {
    expect(REZI_PRO_USD).toBe(PRO_PRICE_COMPARISON.priceUsd);
    const paid = competitorBySlug("jobscan")?.rows.find((row) => row.label === "Paid plans");
    expect(paid?.otto.answer).toBe(`Pro: $${PRICES_USD.pro.month} a month`);
    expect(paid?.otto.detail).toContain(`$${PRICES_USD.max.month} a month`);
  });
});

describe("public SEO pages", () => {
  const pages = seoPages();

  it("lists every indexed guide and comparison once, under its own section", () => {
    const paths = pages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain(SEO_PATHS.resumeTemplates);
    expect(paths.filter((path) => path.startsWith(`${SEO_PATHS.ats}/`))).toEqual(
      INDEXED_ATS_GUIDES.map((guide) => `${SEO_PATHS.ats}/${guide.id}`),
    );
    expect(paths).not.toContain(`${SEO_PATHS.ats}/lever`);
    expect(pages.some((page) => page.noindex)).toBe(false);
    expect(paths.filter((path) => path.startsWith(`${SEO_PATHS.compare}/`))).toHaveLength(
      COMPETITORS.length,
    );
  });

  it("gives every page a short title and a search-sized description", () => {
    for (const page of pages) {
      const title = page.absoluteTitle ? page.title : `${page.title} · ${BRAND.name}`;
      expect(title.length, page.title).toBeLessThanOrEqual(70);
      expect(title.split(BRAND.name).length - 1, page.title).toBeLessThanOrEqual(1);
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(80);
      expect(page.description.length, page.path).toBeLessThanOrEqual(260);
      expect([SEO_PAGES_UPDATED, COMPETITORS_CHECKED]).toContain(page.lastModified);
    }
  });

  it("uses global copy only", () => {
    const copy = [
      ...pages.flatMap((page) => [page.title, page.description]),
      ...Object.values(RELATED).map((link) => link.text),
      allCompareText(),
      ...ATS_GUIDES.flatMap((guide) => [guide.what, guide.spot]),
      llmsTxt(BASE),
    ].join("\n");
    expect(copy).not.toMatch(LOCAL_ONLY);
  });

  it("links the guides from the site footer, grouped as product, guides and legal", () => {
    expect(FOOTER_GROUPS.map((group) => group.title)).toEqual(["Product", "Guides", "Legal"]);
    const guides = FOOTER_GROUPS.find((group) => group.title === "Guides")?.links ?? [];
    expect(guides.map((link) => link.href)).toEqual([
      SEO_PATHS.resumeTemplates,
      SEO_PATHS.ats,
      SEO_PATHS.compare,
    ]);
    expect(FOOTER_NAV).toEqual(FOOTER_GROUPS.flatMap((group) => group.links));
  });

  it("titles the templates page with what it shows: how many formats are free", () => {
    const templates = pages.find((page) => page.path === SEO_PATHS.resumeTemplates)!;
    expect(templates.title).toBe("Resume templates: 2 free, all one column of real text");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers each step from 1 with its absolute URL", () => {
    expect(
      breadcrumbJsonLd(
        [
          { name: "Home", path: "/" },
          { name: "ATS guides", path: "/ats" },
        ],
        BASE,
      ),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "ATS guides", item: `${BASE}/ats` },
      ],
    });
  });
});

describe("llms.txt", () => {
  const text = llmsTxt(BASE);
  const links = [...text.matchAll(/\]\((https?:[^)]+)\)/g)].map((match) => match[1]);

  it("follows the llms.txt shape: a title, a quoted summary, then sections of links", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe(`# ${BRAND.name}`);
    expect(lines[2]).toMatch(/^> /);
    expect(text).toMatch(/^## Main pages$/m);
    expect(text).toMatch(/^## Optional$/m);
    expect(text.indexOf("## Optional")).toBeGreaterThan(text.indexOf("## Comparisons"));
  });

  it("links every indexed guide and comparison, on the site's own origin", () => {
    for (const page of seoPages()) expect(links).toContain(`${BASE}${page.path}`);
    expect(links).toContain(BASE);
    expect(links).toContain(`${BASE}/pricing`);
    for (const link of links) expect(link?.startsWith(BASE)).toBe(true);
  });

  it("says plainly what Otto won't do", () => {
    expect(text).toMatch(/No made-up score/);
    expect(text).toMatch(/doesn't charge to download a PDF/);
    expect(text).toMatch(/doesn't apply to jobs/);
  });
});
