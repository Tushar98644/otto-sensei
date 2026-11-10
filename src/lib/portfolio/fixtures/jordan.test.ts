import { describe, expect, it } from "vitest";
import { PORTFOLIO_TEMPLATE_IDS } from "../types";
import { contentChecklist, contentUsesFor, TEMPLATE_USES } from "../content-uses";
import { isThinPage, SAMPLE_NAME } from "../preview-source";
import { jordanContent, jordanContentView, jordanV2Resume } from "./jordan";

// The sample page every design preview can show: it has to fill every part of every design, with
// words only, exactly as a real page can (no photo, screenshots, logos or video).

describe("Jordan's sample page", () => {
  const view = jordanContentView();

  it.each(Object.keys(TEMPLATE_USES))("fills every part the %s design draws", (id) => {
    const missing = contentChecklist(view, contentUsesFor(id)).filter((item) => !item.done);
    expect(missing.map((item) => `${item.field}: ${item.note}`)).toEqual([]);
  });

  it("covers every design there is", () => {
    expect(Object.keys(TEMPLATE_USES).sort()).toEqual([...PORTFOLIO_TEMPLATE_IDS].sort());
  });

  it("has enough of everything to judge a design by", () => {
    expect(view.projects.length).toBeGreaterThanOrEqual(6);
    expect(view.projects.length).toBeLessThanOrEqual(8);
    for (const project of view.projects) {
      expect(project.category, project.name).not.toBe("");
      expect(project.line, project.name).not.toBe("");
      expect(project.description, project.name).not.toBe("");
      expect(project.tech.length, project.name).toBeGreaterThan(0);
    }
    // Reel draws some on a laptop and some on a pair of phones.
    expect(new Set(view.projects.map((project) => project.device))).toEqual(
      new Set(["laptop", "phone", "auto"]),
    );
    expect(view.projects.filter((project) => project.details.length > 0).length).toBeGreaterThan(1);
    expect(view.experience.length).toBeGreaterThanOrEqual(4);
    expect(view.experience.length).toBeLessThanOrEqual(5);
    for (const job of view.experience) {
      expect(job.summary, job.company).not.toBe("");
      expect(job.highlight, job.company).not.toBe("");
    }
    expect(view.about.length).toBeGreaterThanOrEqual(3);
    expect(view.education.length).toBeGreaterThan(0);
    expect(view.education[0]?.lines.length).toBeGreaterThan(0);
    expect(view.skills.length).toBeGreaterThanOrEqual(4);
    expect(view.writing.length).toBeGreaterThanOrEqual(5);
    expect(view.talks.length).toBeGreaterThanOrEqual(3);
    expect(view.testimonials.length).toBeGreaterThanOrEqual(3);
    expect(view.interests.length).toBeGreaterThanOrEqual(4);
    expect(view.shelf.some((item) => item.kind === "album")).toBe(true);
    expect(view.shelf.some((item) => item.kind === "book")).toBe(true);
    expect(view.milestones.length).toBeGreaterThanOrEqual(5);
    expect(view.socials.length).toBeGreaterThanOrEqual(4);
    expect(view.now?.items.length).toBe(4);
    expect(isThinPage(view)).toBe(false);
  });

  it("holds no pictures, links to none and draws none", () => {
    const text = JSON.stringify([jordanContent(), view]);
    expect(text).not.toMatch(/\.(?:webp|png|jpe?g|gif|avif|svg|mp4|webm)\b/i);
    expect(text).not.toMatch(/"(?:photo|photos|images|video|logo|avatarUrl)"/);
  });

  it("is clearly one made-up person, with the switch's name for them", () => {
    expect(jordanV2Resume().basics.name).toBe(SAMPLE_NAME);
    const text = JSON.stringify([jordanV2Resume(), jordanContent()]);
    expect(text).not.toMatch(/india|₹|\blakh|\bcrore|\bRs\.?\s?\d/i);
    // Company sites use the reserved .example domain, so no real business is named as an employer.
    for (const job of Object.values(jordanContent().jobs)) {
      expect(job.website).toMatch(/\.example$/);
    }
  });
});
