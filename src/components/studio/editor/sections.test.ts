import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECTION_ORDER,
  ResumeSchema,
  emptyResume,
  isSectionHidden,
  newExperience,
  newSkillGroup,
  sectionTitleOf,
  type SectionKey,
} from "@/lib/resume/schema";
import {
  cleanSectionTitle,
  includeSection,
  isBulletSection,
  moveSection,
  sectionCount,
  sectionDisplayOrder,
  setSectionHidden,
  setSectionTitle,
} from "./sections";

describe("sectionDisplayOrder", () => {
  it("keeps the saved order and appends missing sections", () => {
    expect(sectionDisplayOrder(["skills", "experience"])).toEqual([
      "skills",
      "experience",
      "summary",
      "projects",
      "education",
      "certifications",
    ]);
  });

  it("drops duplicates and keys that aren't sections", () => {
    const corrupted = ["experience", "experience", "hobbies"] as unknown as SectionKey[];
    expect(sectionDisplayOrder(corrupted)).toEqual([
      "experience",
      ...DEFAULT_SECTION_ORDER.filter((k) => k !== "experience"),
    ]);
  });
});

describe("moveSection", () => {
  it("moves a section and saves the full order", () => {
    const resume = { ...emptyResume(0), sectionOrder: ["experience", "summary"] as SectionKey[] };
    expect(moveSection(resume, "summary", -1).sectionOrder).toEqual([
      "summary",
      "experience",
      "projects",
      "education",
      "skills",
      "certifications",
    ]);
  });

  it("returns the same resume when the move goes past either end", () => {
    const resume = emptyResume(0);
    expect(moveSection(resume, "summary", -1)).toBe(resume);
    expect(moveSection(resume, "certifications", 1)).toBe(resume);
  });
});

describe("includeSection", () => {
  it("adds an edited section that the order left out, and nothing otherwise", () => {
    const resume = { ...emptyResume(0), sectionOrder: ["experience"] as SectionKey[] };
    expect(includeSection(resume, "skills").sectionOrder).toEqual(["experience", "skills"]);
    expect(includeSection(resume, "experience")).toBe(resume);
  });
});

describe("sectionCount", () => {
  it("says what is in each section", () => {
    const resume = {
      ...emptyResume(0),
      experience: [newExperience()],
      skills: [
        { ...newSkillGroup(), items: ["React", "SQL"] },
        { ...newSkillGroup("Tools"), items: ["Figma"] },
      ],
    };
    expect(sectionCount(resume, "experience")).toBe("1 job");
    expect(sectionCount(resume, "skills")).toBe("3 skills");
    expect(sectionCount(resume, "projects")).toBe("None yet");
    expect(sectionCount(resume, "summary")).toBeNull();
  });

  it("knows which sections hold lines", () => {
    expect(
      ["experience", "projects", "education"].every((k) => isBulletSection(k as SectionKey)),
    ).toBe(true);
    expect(isBulletSection("skills")).toBe(false);
  });
});

describe("sectionCount with hidden items", () => {
  it("says how many entries or skills are hidden", () => {
    const resume = {
      ...emptyResume(0),
      experience: [newExperience(), { ...newExperience(), hidden: true }],
      skills: [
        { ...newSkillGroup(), items: ["React", "SQL"] },
        { ...newSkillGroup("Tools"), items: ["Figma"], hidden: true },
      ],
    };
    expect(sectionCount(resume, "experience")).toBe("2 jobs · 1 hidden");
    expect(sectionCount(resume, "skills")).toBe("3 skills · 1 hidden");
  });
});

describe("setSectionTitle", () => {
  const resume = emptyResume(0);

  it("stores the person's own heading, tidied onto one line", () => {
    const next = setSectionTitle(resume, "experience", "  Work \n history ");
    expect(next.sectionTitles).toEqual({ experience: "Work history" });
    expect(sectionTitleOf(next, "experience")).toBe("Work history");
    expect(ResumeSchema.safeParse(next).success).toBe(true);
  });

  it("goes back to the standard name when cleared or typed back", () => {
    const named = setSectionTitle(resume, "experience", "Work history");
    const withSkills = setSectionTitle(named, "skills", "Toolbox");
    expect(setSectionTitle(withSkills, "experience", " ").sectionTitles).toEqual({
      experience: undefined,
      skills: "Toolbox",
    });
    expect(setSectionTitle(named, "experience", "Experience").sectionTitles).toBeUndefined();
    expect(sectionTitleOf(setSectionTitle(named, "experience", ""), "experience")).toBe(
      "Experience",
    );
  });

  it("returns the same resume when nothing changed", () => {
    expect(setSectionTitle(resume, "projects", "Projects")).toBe(resume);
    expect(setSectionTitle(resume, "projects", "")).toBe(resume);
    const named = setSectionTitle(resume, "projects", "Side projects");
    expect(setSectionTitle(named, "projects", " Side projects ")).toBe(named);
  });

  it("caps the title like the schema", () => {
    expect(cleanSectionTitle("x".repeat(80))).toHaveLength(60);
    const next = setSectionTitle(resume, "summary", "word ".repeat(30));
    expect(ResumeSchema.safeParse(next).success).toBe(true);
  });
});

describe("setSectionHidden", () => {
  it("hides and shows a section, dropping the list once it's empty", () => {
    const resume = emptyResume(0);
    const hidden = setSectionHidden(resume, "projects", true);
    expect(isSectionHidden(hidden, "projects")).toBe(true);
    expect(setSectionHidden(hidden, "projects", true)).toBe(hidden);

    const both = setSectionHidden(hidden, "skills", true);
    expect(both.hiddenSections).toEqual(["projects", "skills"]);
    expect(setSectionHidden(both, "projects", false).hiddenSections).toEqual(["skills"]);
    expect(setSectionHidden(hidden, "projects", false).hiddenSections).toBeUndefined();
    expect(setSectionHidden(resume, "summary", false)).toBe(resume);
    expect(ResumeSchema.safeParse(both).success).toBe(true);
  });
});
