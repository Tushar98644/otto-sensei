import { describe, expect, it } from "vitest";
import { lintResume } from "@/lib/lint/bullets";
import type { LintIssueId } from "@/lib/lint/types";
import { createSampleResume } from "./sample";
import { ResumeSchema, type Resume } from "./schema";

function allIds(resume: Resume): string[] {
  return [
    resume.id,
    ...resume.basics.links.map((link) => link.id),
    ...resume.experience.flatMap((job) => [job.id, ...job.bullets.map((b) => b.id)]),
    ...resume.education.flatMap((school) => [school.id, ...school.bullets.map((b) => b.id)]),
    ...resume.projects.flatMap((project) => [project.id, ...project.bullets.map((b) => b.id)]),
    ...resume.skills.map((group) => group.id),
    ...resume.certifications.map((cert) => cert.id),
  ];
}

describe("createSampleResume", () => {
  it("is a valid resume marked as a sample", () => {
    const resume = createSampleResume(1_700_000_000_000);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.source).toBe("sample");
    expect(resume.tailor).toBeNull();
    expect(resume.createdAt).toBe(1_700_000_000_000);
    expect(resume.updatedAt).toBe(1_700_000_000_000);
  });

  it("uses unique ids inside one resume and fresh ids on every call", () => {
    const first = allIds(createSampleResume());
    const second = allIds(createSampleResume());
    expect(new Set(first).size).toBe(first.length);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });

  it("gives the lint both weak lines to flag and strong lines to leave alone", () => {
    const lint = lintResume(createSampleResume());
    const found = new Set<LintIssueId>(
      Object.values(lint.byBullet).flatMap((issues) => issues.map((issue) => issue.id)),
    );
    for (const id of ["first-person", "stock-phrase", "no-number", "weak-start"] as const) {
      expect(found).toContain(id);
    }
    const clean = Object.values(lint.byBullet).filter((issues) => issues.length === 0).length;
    expect(clean).toBeGreaterThanOrEqual(4);
    expect(lint.totals.withIssues).toBeGreaterThanOrEqual(4);
  });
});
