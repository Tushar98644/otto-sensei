import { describe, expect, it } from "vitest";
import { lintResume } from "@/lib/lint/bullets";
import { reviewResume } from "@/lib/lint/review";
import { setBulletText } from "@/lib/resume/ops";
import {
  emptyResume,
  newBullet,
  newExperience,
  newExtraItem,
  newExtraSection,
  type Resume,
} from "@/lib/resume/schema";
import {
  bulletIssues,
  extraNeedsWork,
  lintOf,
  NO_ISSUES,
  resumeLintOf,
  sectionNeedsWork,
} from "./lint-cache";

function sample(): { resume: Resume; weak: string; strong: string; other: string } {
  const weak = newBullet("Responsible for managing the company website");
  const strong = newBullet("Cut checkout errors 38% by rewriting the payment retry logic");
  const other = newBullet("Worked on various things");
  const job = { ...newExperience(), bullets: [weak, strong, other] };
  return {
    resume: { ...emptyResume(0), experience: [job] },
    weak: weak.id,
    strong: strong.id,
    other: other.id,
  };
}

describe("lintOf", () => {
  it("matches lintResume and runs once per resume version", () => {
    const { resume, weak, strong } = sample();
    const lint = lintOf(resume);
    expect(lintOf(resume)).toBe(lint);
    expect(lint.totals).toEqual(lintResume(resume).totals);
    expect(bulletIssues(resume, weak).map((issue) => issue.id)).toEqual(
      lintResume(resume).byBullet[weak]?.map((issue) => issue.id),
    );
    expect(bulletIssues(resume, strong)).toBe(NO_ISSUES);
    expect(bulletIssues(resume, "missing")).toBe(NO_ISSUES);
  });

  it("keeps the identity of lines whose issues didn't change", () => {
    const { resume, weak, other } = sample();
    const before = lintOf(resume);
    const typed = setBulletText(resume, other, "Worked on various things, mostly");
    const after = lintOf(typed);
    expect(after).not.toBe(before);
    expect(after.byBullet.get(weak)).toBe(before.byBullet.get(weak));
    expect(after.totals).toBe(before.totals);

    const fixed = setBulletText(typed, weak, "Rebuilt the company website, cutting load time 60%");
    const afterFix = lintOf(fixed);
    expect(afterFix.byBullet.get(weak)).toBe(NO_ISSUES);
    expect(afterFix.totals.withIssues).toBe(before.totals.withIssues - 1);
  });

  it("hands a review the lint it already has, so the review doesn't lint again", () => {
    const { resume } = sample();
    const lint = resumeLintOf(resume);
    expect(resumeLintOf(resume)).toBe(lint);
    expect(lint).toEqual(lintResume(resume));
    expect(lintOf(resume).totals).toEqual(lint.totals);
    expect(reviewResume(resume, lint)).toEqual(reviewResume(resume));
  });

  it("counts the lines that need work in one section", () => {
    const { resume } = sample();
    expect(sectionNeedsWork(resume, "experience")).toBe(2);
    expect(sectionNeedsWork(resume, "projects")).toBe(0);
  });

  it("leaves hidden lines, entries and sections out of the counts", () => {
    const { resume, weak, other } = sample();
    const [job] = resume.experience;
    if (!job) throw new Error("sample has a job");
    const hiddenLine = {
      ...resume,
      experience: [
        { ...job, bullets: job.bullets.map((b) => (b.id === weak ? { ...b, hidden: true } : b)) },
      ],
    };
    expect(sectionNeedsWork(hiddenLine, "experience")).toBe(1);
    expect(lintOf(hiddenLine).byBullet.has(weak)).toBe(false);
    expect(lintOf(hiddenLine).byBullet.has(other)).toBe(true);

    const hiddenJob = { ...resume, experience: [{ ...job, hidden: true }] };
    expect(sectionNeedsWork(hiddenJob, "experience")).toBe(0);
    expect(lintOf(hiddenJob).totals.bullets).toBe(0);

    const hiddenSection = { ...resume, hiddenSections: ["experience" as const] };
    expect(sectionNeedsWork(hiddenSection, "experience")).toBe(0);
  });

  it("counts the lines that need work in one extra section", () => {
    const weak = newBullet("Helped with various things");
    const role = { ...newExtraItem(), title: "Mentor", bullets: [weak] };
    const section = { ...newExtraSection("volunteering"), items: [role] };
    const resume: Resume = { ...emptyResume(0), extras: [section] };
    expect(extraNeedsWork(resume, section.id)).toBe(1);
    expect(extraNeedsWork(resume, "missing")).toBe(0);
    const hidden: Resume = { ...resume, extras: [{ ...section, hidden: true }] };
    expect(extraNeedsWork(hidden, section.id)).toBe(0);
  });
});
