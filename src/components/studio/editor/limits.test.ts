import { describe, expect, it } from "vitest";
import {
  emptyResume,
  newBullet,
  newCertification,
  newEducation,
  newExperience,
  newExtraItem,
  newExtraSection,
  newId,
  newProject,
  newSkillGroup,
  type Resume,
} from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { BULLET_LIMITS, CHAR_LIMITS, LIST_LIMITS, UNCAPPED_TEXT } from "./limits";

const times = <T>(count: number, make: () => T): T[] => Array.from({ length: count }, make);
const fits = (resume: Resume) => ResumeSchema.safeParse(resume).success;
const base = emptyResume(0);

type Case = [name: string, limit: number, build: (count: number) => Resume];

const cases: Case[] = [
  [
    "links",
    LIST_LIMITS.links,
    (n) => ({
      ...base,
      basics: {
        ...base.basics,
        links: times(n, () => ({ id: newId(), label: "Site", url: "example.com" })),
      },
    }),
  ],
  ["jobs", LIST_LIMITS.experience, (n) => ({ ...base, experience: times(n, newExperience) })],
  ["schools", LIST_LIMITS.education, (n) => ({ ...base, education: times(n, newEducation) })],
  ["projects", LIST_LIMITS.projects, (n) => ({ ...base, projects: times(n, newProject) })],
  [
    "skill groups",
    LIST_LIMITS.skillGroups,
    (n) => ({ ...base, skills: times(n, () => newSkillGroup()) }),
  ],
  [
    "skills in a group",
    LIST_LIMITS.skillsPerGroup,
    (n) => ({ ...base, skills: [{ ...newSkillGroup(), items: times(n, newId) }] }),
  ],
  [
    "certifications",
    LIST_LIMITS.certifications,
    (n) => ({ ...base, certifications: times(n, newCertification) }),
  ],
  [
    "lines in a job",
    BULLET_LIMITS.experience,
    (n) => ({
      ...base,
      experience: [{ ...newExperience(), bullets: times(n, () => newBullet("x")) }],
    }),
  ],
  [
    "lines in a school",
    BULLET_LIMITS.education,
    (n) => ({
      ...base,
      education: [{ ...newEducation(), bullets: times(n, () => newBullet("x")) }],
    }),
  ],
  [
    "lines in a project",
    BULLET_LIMITS.projects,
    (n) => ({ ...base, projects: [{ ...newProject(), bullets: times(n, () => newBullet("x")) }] }),
  ],
  [
    "extra sections",
    LIST_LIMITS.extraSections,
    (n) => ({ ...base, extras: times(n, () => newExtraSection("custom")) }),
  ],
  [
    "items in an extra section",
    LIST_LIMITS.extraItems,
    (n) => ({ ...base, extras: [{ ...newExtraSection("awards"), items: times(n, newExtraItem) }] }),
  ],
  [
    "lines in an extra item",
    BULLET_LIMITS.extras,
    (n) => ({
      ...base,
      extras: [
        {
          ...newExtraSection("volunteering"),
          items: [{ ...newExtraItem(), bullets: times(n, () => newBullet("x")) }],
        },
      ],
    }),
  ],
];

describe("editor limits", () => {
  it.each(cases)("%s: the schema takes exactly %i", (_name, limit, build) => {
    expect(fits(build(limit))).toBe(true);
    expect(fits(build(limit + 1))).toBe(false);
  });

  it("reads every text cap from the schema", () => {
    for (const value of Object.values(CHAR_LIMITS)) expect(value).toBeLessThan(UNCAPPED_TEXT);
    expect(fits({ ...base, summary: "x".repeat(CHAR_LIMITS.summary) })).toBe(true);
    expect(fits({ ...base, summary: "x".repeat(CHAR_LIMITS.summary + 1) })).toBe(false);
    const line = (text: string) => ({
      ...base,
      experience: [{ ...newExperience(), bullets: [newBullet(text)] }],
    });
    expect(fits(line("x".repeat(CHAR_LIMITS.bullet)))).toBe(true);
    expect(fits(line("x".repeat(CHAR_LIMITS.bullet + 1)))).toBe(false);
  });
});
