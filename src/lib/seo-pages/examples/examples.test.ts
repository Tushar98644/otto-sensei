import { describe, expect, it } from "vitest";
import { classifyTitle } from "@/lib/job-feed/occupations";
import { lintBullet, lintResume, lintSummary } from "@/lib/lint/bullets";
import { readPost } from "@/lib/match-check/post";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { ROLE_EXAMPLES, exampleBySlug, exampleResume, relatedExamples } from ".";

const PROMISES =
  /you will (?:pass|get)|beat the ats|ats[- ]proof|100% ats|guaranteed? (?:an? )?(?:interview|job|pass)/i;
// Reserved or unassigned ranges, so no real person's number is printed.
const MADE_UP_PHONES = [/^\+1 \d{3} 555 01\d\d$/, /^\+44 7700 900\d{3}$/, /^\+91 50000 \d{5}$/];

function copyOf(example: (typeof ROLE_EXAMPLES)[number]): string[] {
  return [
    example.intro,
    example.person,
    example.card,
    ...example.tips.flatMap((note) => [note.title, note.text]),
    ...example.mistakes.flatMap((note) => [note.title, note.text]),
    ...example.faq.flatMap((item) => [item.question, item.answer]),
  ];
}

describe("resume examples", () => {
  it("finds each example by a unique slug, and links each to three others", () => {
    const slugs = ROLE_EXAMPLES.map((example) => example.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.length).toBeGreaterThanOrEqual(12);
    for (const example of ROLE_EXAMPLES) {
      expect(exampleBySlug(example.slug)).toBe(example);
      const related = relatedExamples(example);
      expect(
        related.map((other) => other.slug),
        example.slug,
      ).toEqual(example.related);
      expect(related).toHaveLength(3);
      expect(example.related).not.toContain(example.slug);
    }
    expect(exampleBySlug("nurse")).toBeUndefined();
  });

  it("builds a complete resume the studio can open, with fresh ids every time", () => {
    for (const example of ROLE_EXAMPLES) {
      const resume = exampleResume(example, 1_000);
      expect(ResumeSchema.safeParse(resume).success, example.slug).toBe(true);
      expect(resume.source).toBe("scratch");
      expect(TEMPLATE_IDS).toContain(resume.template);
      expect(resume.basics.name, example.slug).not.toBe("");
      expect(resume.summary, example.slug).not.toBe("");
      expect(resume.experience.length + resume.projects.length, example.slug).toBeGreaterThan(1);
      expect(resume.skills.length, example.slug).toBeGreaterThan(0);
      expect(exampleResume(example).id).not.toBe(resume.id);
    }
  });

  it("uses made-up contact details only", () => {
    for (const example of ROLE_EXAMPLES) {
      const { email, phone, links } = example.resume.basics;
      expect(email, example.slug).toMatch(/@example\.com$/);
      expect(
        MADE_UP_PHONES.some((pattern) => pattern.test(phone)),
        phone,
      ).toBe(true);
      for (const link of links ?? []) expect(link.url, example.slug).toMatch(/\.example\.com/);
      for (const project of example.resume.projects ?? []) {
        expect(project.link ?? "", example.slug).toMatch(/^$|\.example\.com/);
      }
    }
  });

  it("passes Otto's own line check on every line of every example", () => {
    for (const example of ROLE_EXAMPLES) {
      const resume = exampleResume(example);
      const { totals, byBullet } = lintResume(resume);
      const flagged = Object.values(byBullet).flat();
      expect(flagged, example.slug).toEqual([]);
      expect(totals.withIssues, example.slug).toBe(0);
      expect(lintSummary(resume.summary), example.slug).toEqual([]);
    }
  });

  it("shows weak lines the line check flags, each answered by a line it passes", () => {
    for (const example of ROLE_EXAMPLES) {
      expect(example.lines, example.slug).toHaveLength(3);
      for (const line of example.lines) {
        expect(lintBullet(line.weak).length, line.weak).toBeGreaterThan(0);
        expect(lintBullet(line.strong), line.strong).toEqual([]);
      }
    }
  });

  it("lists only skills Otto's match check reads in job posts", () => {
    for (const example of ROLE_EXAMPLES) {
      expect(example.skills.length, example.slug).toBeGreaterThanOrEqual(2);
      for (const group of example.skills) {
        const read = readPost(`Requirements:\n- Experience with ${group.items.join(", ")}.`);
        const labels = read.terms.map((term) => term.label);
        for (const skill of group.items)
          expect(labels, `${example.slug}: ${skill}`).toContain(skill);
      }
    }
  });

  it("names job titles Otto's matching files with the example's own occupation", () => {
    for (const example of ROLE_EXAMPLES) {
      expect(example.titles.length, example.slug).toBeGreaterThanOrEqual(3);
      for (const title of example.titles) {
        expect(classifyTitle(title)?.code, `${example.slug}: ${title}`).toBe(example.occupation);
      }
    }
  });

  it("writes each page on its own: no copy shared between examples, and no promises", () => {
    const seen = new Map<string, string>();
    for (const example of ROLE_EXAMPLES) {
      expect(example.tips, example.slug).toHaveLength(3);
      expect(example.mistakes, example.slug).toHaveLength(3);
      expect(example.faq.length, example.slug).toBeGreaterThanOrEqual(3);
      for (const text of copyOf(example)) {
        expect(text, example.slug).not.toMatch(PROMISES);
        expect(text, example.slug).not.toContain("!");
        if (text.length < 40) continue;
        expect(seen.get(text), text).toBeUndefined();
        seen.set(text, example.slug);
      }
    }
  });
});
