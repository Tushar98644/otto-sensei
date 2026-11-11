import { describe, expect, it } from "vitest";
import { PutResumeSchema, TailorRequestSchema } from "@/lib/api/types";
import { createSampleResume } from "./sample";
import {
  COVER_LETTER_CHARS,
  DEFAULT_TEMPLATE,
  DESIGN_ACCENTS,
  DESIGN_DENSITIES,
  DESIGN_FONTS,
  EXTRA_KINDS,
  EXTRA_KIND_LABELS,
  MAX_EXTRA_ITEMS,
  SECTION_KEYS,
  TEMPLATE_IDS,
  emptyResume,
  extrasOf,
  isSectionHidden,
  newBullet,
  newExperience,
  newExtraItem,
  newExtraSection,
  sectionTitleOf,
  type ExtraSection,
  type Resume,
} from "./schema";
import { ResumeSchema, TemplateIdSchema } from "@/lib/resume/validation";

// A resume saved before formats existed: everything but `template`.
function savedBeforeFormats(): Partial<Resume> {
  const old: Partial<Resume> = emptyResume(0);
  delete old.template;
  return old;
}

describe("Resume template", () => {
  it("parses resumes saved before formats existed as Classic", () => {
    const old = savedBeforeFormats();
    expect(old).not.toHaveProperty("template");
    expect(ResumeSchema.parse(old).template).toBe("classic");
    expect(DEFAULT_TEMPLATE).toBe("classic");
  });

  it("keeps every known format", () => {
    for (const id of TEMPLATE_IDS) {
      expect(ResumeSchema.parse({ ...savedBeforeFormats(), template: id }).template).toBe(id);
    }
  });

  it("falls back to Classic for an unknown or broken value instead of rejecting the resume", () => {
    for (const template of ["retro", "", null, 42]) {
      const parsed = ResumeSchema.safeParse({ ...savedBeforeFormats(), template });
      expect(parsed.success, String(template)).toBe(true);
      expect(parsed.data?.template).toBe("classic");
    }
  });

  it("starts new and sample resumes on Classic", () => {
    expect(emptyResume(0).template).toBe("classic");
    expect(createSampleResume(0).template).toBe("classic");
  });

  it("round-trips through the cloud backup and tailor request schemas", () => {
    const resume: Resume = { ...createSampleResume(0), template: "developer" };
    expect(PutResumeSchema.parse(JSON.parse(JSON.stringify(resume)))).toEqual(resume);
    const job = { text: "We are hiring a product marketer. ".repeat(4), title: "", company: "" };
    expect(TailorRequestSchema.parse({ resume, job }).resume.template).toBe("developer");
  });

  it("lists the ids the enum accepts", () => {
    expect(TemplateIdSchema.options).toEqual([...TEMPLATE_IDS]);
  });
});

describe("Tailored copy cover letter", () => {
  const tailored = (coverLetter?: string): Resume => ({
    ...createSampleResume(0),
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Senior Product Marketing Manager",
      company: "Acme Analytics",
      keywords: ["HubSpot"],
      createdAt: 0,
      ...(coverLetter === undefined ? {} : { coverLetter }),
    },
  });

  it("parses copies saved before letters existed and keeps a letter through the cloud backup", () => {
    expect(
      PutResumeSchema.parse(JSON.parse(JSON.stringify(tailored()))).tailor?.coverLetter,
    ).toBeUndefined();
    const withLetter = tailored(
      "Dear Acme Analytics team,\n\nI led the launch.\n\nBest regards,\nJordan",
    );
    expect(PutResumeSchema.parse(JSON.parse(JSON.stringify(withLetter)))).toEqual(withLetter);
  });

  it("caps the letter so a PUT can't store an unbounded blob", () => {
    expect(PutResumeSchema.safeParse(tailored("x".repeat(COVER_LETTER_CHARS + 1))).success).toBe(
      false,
    );
  });
});

// A resume saved before hiding, extra sections, renamed headings and look settings existed.
function savedBeforeExtras(): Partial<Resume> {
  const old: Partial<Resume> = createSampleResume(0);
  delete old.extras;
  return old;
}

const viaCloud = (resume: unknown) => PutResumeSchema.safeParse(JSON.parse(JSON.stringify(resume)));

function awards(): ExtraSection {
  const section = newExtraSection("awards");
  return {
    ...section,
    items: [
      {
        ...newExtraItem(),
        title: "Marketer of the Year",
        subtitle: "B2B Marketing Awards",
        date: "2023",
        detail: "Chosen from 140 nominees.",
        bullets: [newBullet("Led the campaign that won it.")],
      },
    ],
  };
}

describe("Fields added after launch", () => {
  it("parses resumes saved before them, with no extras and nothing hidden or renamed", () => {
    const old = savedBeforeExtras();
    expect(old).not.toHaveProperty("extras");
    const parsed = ResumeSchema.parse(old);
    expect(parsed.extras).toEqual([]);
    expect(parsed).not.toHaveProperty("sectionTitles");
    expect(parsed).not.toHaveProperty("hiddenSections");
    expect(parsed).not.toHaveProperty("design");
    expect(parsed.experience[0]).not.toHaveProperty("hidden");
    expect(parsed.experience[0]?.bullets[0]).not.toHaveProperty("hidden");
  });

  it("starts new and sample resumes with no extra sections", () => {
    expect(emptyResume(0).extras).toEqual([]);
    expect(createSampleResume(0).extras).toEqual([]);
  });

  it("reads copies from the browser that never got the new fields", () => {
    const local = savedBeforeExtras() as Resume;
    expect(extrasOf(local)).toEqual([]);
    expect(sectionTitleOf(local, "experience")).toBe("Experience");
    expect(isSectionHidden(local, "projects")).toBe(false);
  });

  it("round-trips every new field through the cloud backup", () => {
    const base = createSampleResume(0);
    const resume: Resume = {
      ...base,
      experience: base.experience.map((job, i) =>
        i === 0
          ? { ...job, bullets: job.bullets.map((b, j) => (j === 1 ? { ...b, hidden: true } : b)) }
          : { ...job, hidden: i === 2 },
      ),
      education: base.education.map((e) => ({ ...e, hidden: true })),
      projects: base.projects.map((p) => ({ ...p, hidden: false })),
      skills: base.skills.map((g) => ({ ...g, hidden: true })),
      certifications: base.certifications.map((c) => ({ ...c, hidden: true })),
      extras: [awards(), { ...newExtraSection("custom"), hidden: true }],
      sectionTitles: { experience: "Work history", skills: "Toolkit" },
      hiddenSections: ["projects", "certifications"],
      design: { accent: "forest", font: "serif", density: "compact" },
    };
    const parsed = viaCloud(resume);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(resume);
    const job = { text: "We are hiring a product marketer. ".repeat(4), title: "", company: "" };
    expect(TailorRequestSchema.parse({ resume, job }).resume).toEqual(resume);
  });

  it("treats a broken hidden flag as visible instead of rejecting the resume", () => {
    const resume = { ...emptyResume(0), experience: [{ ...newExperience(), hidden: "yes" }] };
    const parsed = viaCloud(resume);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.experience[0]?.hidden).toBeUndefined();
  });
});

describe("Extra sections", () => {
  it("labels every kind and builds sections that pass validation", () => {
    for (const kind of EXTRA_KINDS) {
      expect(EXTRA_KIND_LABELS[kind]).toBeTruthy();
      const section = newExtraSection(kind);
      expect(section.kind).toBe(kind);
      expect(section.items).toHaveLength(1);
      expect(section.title.trim()).not.toBe("");
      expect(viaCloud({ ...emptyResume(0), extras: [section] }).success, kind).toBe(true);
    }
    expect(newExtraSection("languages").title).toBe("Languages");
    expect(newExtraSection("custom").title).toBe("Additional information");
    expect(newExtraSection("awards").id).not.toBe(newExtraSection("awards").id);
  });

  it("keeps a kind this build doesn't know as a custom section with its content", () => {
    const section = { ...awards(), kind: "references", title: "References" };
    const parsed = ResumeSchema.parse({ ...emptyResume(0), extras: [section] });
    expect(parsed.extras?.[0]).toEqual({ ...section, kind: "custom" });
  });

  it("still rejects content past the caps so a PUT can't store an unbounded blob", () => {
    const tooMany = {
      ...awards(),
      items: Array.from({ length: MAX_EXTRA_ITEMS + 1 }, newExtraItem),
    };
    expect(viaCloud({ ...emptyResume(0), extras: [tooMany] }).success).toBe(false);
    const longDetail = awards();
    longDetail.items[0]!.detail = "x".repeat(501);
    expect(viaCloud({ ...emptyResume(0), extras: [longDetail] }).success).toBe(false);
    expect(
      viaCloud({ ...emptyResume(0), extras: [{ ...awards(), title: "x".repeat(101) }] }).success,
    ).toBe(false);
  });
});

describe("Section titles and hidden sections", () => {
  it("uses the person's heading, or the standard label when it's blank or missing", () => {
    const resume: Resume = {
      ...emptyResume(0),
      sectionTitles: { experience: "  Work history ", skills: "   " },
    };
    expect(sectionTitleOf(resume, "experience")).toBe("Work history");
    expect(sectionTitleOf(resume, "skills")).toBe("Skills");
    expect(sectionTitleOf(resume, "summary")).toBe("Summary");
  });

  it("drops a bad heading or unknown key and keeps the rest", () => {
    const parsed = ResumeSchema.parse({
      ...emptyResume(0),
      sectionTitles: {
        experience: "Work history",
        skills: "x".repeat(61),
        languages: "Languages",
        summary: 4,
      },
    });
    expect(parsed.sectionTitles).toEqual({ experience: "Work history" });
    expect(
      ResumeSchema.parse({ ...emptyResume(0), sectionTitles: "Work history" }).sectionTitles,
    ).toBeUndefined();
  });

  it("keeps the known hidden sections of a bad list instead of showing them all", () => {
    const parse = (hiddenSections: unknown) =>
      ResumeSchema.parse({ ...emptyResume(0), hiddenSections }).hiddenSections;
    expect(parse(["projects"])).toEqual(["projects"]);
    expect(parse(["projects", "hobbies", 7])).toEqual(["projects"]);
    expect(parse([...SECTION_KEYS, "skills"])).toEqual([...SECTION_KEYS]);
    expect(parse("projects")).toBeUndefined();
    const resume: Resume = { ...emptyResume(0), hiddenSections: ["projects"] };
    expect(isSectionHidden(resume, "projects")).toBe(true);
    expect(isSectionHidden(resume, "skills")).toBe(false);
  });
});

describe("Resume design", () => {
  it("keeps every known setting", () => {
    for (const accent of DESIGN_ACCENTS) {
      for (const font of DESIGN_FONTS) {
        for (const density of DESIGN_DENSITIES) {
          const design = { accent, font, density };
          expect(ResumeSchema.parse({ ...emptyResume(0), design }).design).toEqual(design);
        }
      }
    }
  });

  it("falls back to the format's own look for an unknown or broken setting, keeping the rest", () => {
    const parse = (design: unknown) => viaCloud({ ...emptyResume(0), design });
    const mixed = parse({ accent: "neon", font: "serif", density: null });
    expect(mixed.success).toBe(true);
    expect(mixed.data?.design).toEqual({ font: "serif" });
    for (const design of ["forest", 3, null]) {
      const parsed = parse(design);
      expect(parsed.success, String(design)).toBe(true);
      expect(parsed.data?.design).toBeUndefined();
    }
  });
});
