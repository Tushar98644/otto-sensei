import { describe, expect, it } from "vitest";
import { PLANS, PRICES_USD } from "@/config/plans";
import { TEMPLATE_LIST } from "@/lib/pdf/templates";
import { nodeText } from "@/lib/seo/node-text";
import { ATS_GUIDES, GENERAL_ADVICE, guideHeadline, isIndexed } from "@/lib/seo-pages/ats";
import { COMPETITORS, compareTitle, ottoReasons } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { calendarDate, calendarMonth, exampleHeadline } from "@/lib/seo-pages/pages";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { HOME_FAQ } from "../[lang]/(marketing)/_components/faq";
import { LETTERS } from "../[lang]/(marketing)/cover-letter-generator/content";
import { INTERVIEW_PREP } from "../[lang]/(marketing)/interview-prep/content";
import { TRACKER } from "../[lang]/(marketing)/job-application-tracker/content";
import { JOB_MATCH_FAQ } from "../[lang]/(marketing)/job-match/faq";
import { PORTFOLIO } from "../[lang]/(marketing)/portfolio-website-builder/content";
import { BILLING_FAQ } from "../[lang]/(marketing)/pricing/billing-faq";
import { BUILDER_FAQ, INDIA_NOTES } from "../[lang]/(marketing)/resume-builder/content";
import { COMMON, TEMPLATES_FAQ } from "../[lang]/(marketing)/resume-templates/content";
import { llmsFullTxt } from "./full-text";

const BASE = "https://www.ottosensei.com";
const text = llmsFullTxt(BASE, { pro: ["month", "year"], max: ["month"] });
const TOOLS = [LETTERS, TRACKER, INTERVIEW_PREP, PORTFOLIO];

describe("llms-full.txt", () => {
  it("opens with a title and the same product summary as llms.txt", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("# Otto Sensei: full text");
    expect(lines[2]).toMatch(/^> Otto Sensei is a web app for job seekers\./);
    expect(text).toContain("What it doesn't do:");
  });

  it("quotes every FAQ the site shows, word for word", () => {
    const examples = ROLE_EXAMPLES.flatMap((example) => example.faq);
    const faqs = [...HOME_FAQ, ...BILLING_FAQ, ...JOB_MATCH_FAQ, ...TEMPLATES_FAQ, ...BUILDER_FAQ];
    const tools = TOOLS.flatMap((tool) => tool.faq);
    for (const item of [...faqs, ...examples, ...tools]) {
      expect(text).toContain(item.question);
      expect(text).toContain(nodeText(item.answer));
    }
  });

  it("carries each tool page: its page link, intro, features and steps", () => {
    for (const [path, tool] of [
      [SEO_PATHS.coverLetterGenerator, LETTERS],
      [SEO_PATHS.applicationTracker, TRACKER],
      [SEO_PATHS.interviewPrep, INTERVIEW_PREP],
      [SEO_PATHS.portfolioBuilder, PORTFOLIO],
    ] as const) {
      expect(text).toContain(`Page: ${BASE}${path}\n`);
      expect(text).toContain(tool.intro);
      for (const note of [...tool.features, ...tool.steps]) {
        expect(text).toContain(`- ${note.title}: ${nodeText(note.text)}`);
      }
    }
  });

  it("prices only what's on sale, from the plan config", () => {
    expect(text).toContain(`$${PRICES_USD.pro.month} a month`);
    expect(text).toContain(`$${PRICES_USD.pro.year} once a year`);
    expect(text).toContain(`$${PRICES_USD.max.month} a month`);
    expect(text).not.toContain(`$${PRICES_USD.max.year} once a year`);
    const onlyPro = llmsFullTxt(BASE, { pro: ["month"], max: [] });
    expect(onlyPro).not.toContain(`### ${PLANS.max.name}\n`);
  });

  it("makes no job count claim that could go stale", () => {
    expect(text).not.toMatch(/\d[\d,]*\+ open jobs/);
  });

  it("describes every format and what they share", () => {
    for (const info of TEMPLATE_LIST) {
      expect(text).toContain(info.description);
      expect(text).toContain(info.bestFor);
    }
    for (const point of COMMON) expect(text).toContain(point.text);
  });

  it("carries every indexed guide in full, with each note's tip and source, and no thin guide", () => {
    for (const tip of GENERAL_ADVICE) expect(text).toContain(tip.text);
    for (const guide of ATS_GUIDES) {
      const page = `${BASE}/ats/${guide.id}`;
      if (!isIndexed(guide)) {
        expect(text).not.toContain(page);
        continue;
      }
      expect(text).toContain(`### ${guideHeadline(guide)}`);
      expect(text).toContain(`Page: ${page}\n`);
      expect(text).toContain(guide.what);
      for (const note of guide.notes) {
        expect(text).toContain(note.fact);
        expect(text).toContain(`What to do: ${note.todo}`);
        expect(text).toContain(note.source.url);
      }
    }
  });

  it("carries every comparison: why Otto, both sides of the table and the sources", () => {
    for (const competitor of COMPETITORS) {
      expect(text).toContain(
        competitor.asListed
          ? `As listed in ${calendarMonth(competitor.checked)}.`
          : `Checked on ${calendarDate(competitor.checked)}.`,
      );
      expect(text).toContain(`### ${compareTitle(competitor)}`);
      expect(text).not.toContain(`Pick ${competitor.name} if`);
      for (const note of ottoReasons(competitor)) expect(text).toContain(note.text);
      for (const row of competitor.rows) {
        expect(text).toContain(row.them.answer);
        if (row.them.detail) expect(text).toContain(row.them.detail);
      }
      for (const source of competitor.sources) expect(text).toContain(source.url);
    }
  });

  it("carries the resume builder and every example: lines, skills, tips and mistakes", () => {
    for (const note of INDIA_NOTES) expect(text).toContain(note.title);
    for (const example of ROLE_EXAMPLES) {
      expect(text).toContain(`### ${exampleHeadline(example)}`);
      expect(text).toContain(`Page: ${BASE}/resume-examples/${example.slug}\n`);
      for (const line of example.lines) expect(text).toContain(`After: ${line.strong}`);
      for (const note of [...example.tips, ...example.mistakes]) expect(text).toContain(note.text);
    }
  });

  it("links only to the site's own origin for its pages", () => {
    const pages = [...text.matchAll(/^Page: (\S+)$/gm)].map((match) => match[1]);
    expect(pages.length).toBeGreaterThan(10);
    for (const page of pages) expect(page?.startsWith(BASE)).toBe(true);
  });
});
