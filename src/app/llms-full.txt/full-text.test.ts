import { describe, expect, it } from "vitest";
import { PLANS, PRICES_USD } from "@/config/plans";
import { TEMPLATE_LIST } from "@/lib/pdf/templates";
import { nodeText } from "@/lib/seo/node-text";
import { ATS_GUIDES, GENERAL_ADVICE, guideHeadline, isIndexed } from "@/lib/seo-pages/ats";
import { COMPETITORS, compareTitle } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { calendarDate, calendarMonth, exampleHeadline } from "@/lib/seo-pages/pages";
import { HOME_FAQ } from "../(marketing)/_components/faq";
import { JOB_MATCH_FAQ } from "../(marketing)/job-match/faq";
import { BILLING_FAQ } from "../(marketing)/pricing/billing-faq";
import { BUILDER_FAQ, INDIA_NOTES } from "../(marketing)/resume-builder/content";
import { COMMON, TEMPLATES_FAQ } from "../(marketing)/resume-templates/content";
import { llmsFullTxt } from "./full-text";

const BASE = "https://www.ottosensei.com";
const text = llmsFullTxt(BASE, { pro: ["month", "year"], max: ["month"] });

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
    for (const item of [...faqs, ...examples]) {
      expect(text).toContain(item.question);
      expect(text).toContain(nodeText(item.answer));
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

  it("carries every comparison: both sides, the other product's strengths and its sources", () => {
    for (const competitor of COMPETITORS) {
      expect(text).toContain(
        competitor.asListed
          ? `As listed in ${calendarMonth(competitor.checked)}.`
          : `Checked on ${calendarDate(competitor.checked)}.`,
      );
      expect(text).toContain(`### ${compareTitle(competitor)}`);
      expect(text).toContain(competitor.summary);
      expect(text).toContain(`Pick ${competitor.name} if ${competitor.pickThem}`);
      for (const row of competitor.rows) {
        expect(text).toContain(row.them.answer);
        if (row.them.detail) expect(text).toContain(row.them.detail);
      }
      for (const strength of competitor.strengths) expect(text).toContain(strength);
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
