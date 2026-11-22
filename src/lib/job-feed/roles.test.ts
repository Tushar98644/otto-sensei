import { describe, expect, it } from "vitest";
import { lookingForOf, roleOptions } from "./looking-for";
import { readTitle } from "./occupations";
import { roleFamily, SKILL_FAMILIES, skillsFamily } from "./roles";
import { SKILL_LABELS } from "./skills";
import type { RoleFamily } from "./types";

describe("the kind of role a title names", () => {
  it.each<[string, RoleFamily | null]>([
    // Software titles that name a team, a product or a company after the role.
    ["Software Engineer, Compliance", "engineering"],
    ["Software Engineer Intern, Legal & Compliance", "engineering"],
    ["Full Stack Developer (Legal Tech)", "engineering"],
    ["Software Developer at Legal & General", "engineering"],
    ["SDE Intern @ LegalZoom", "engineering"],
    ["Backend Engineer - Privacy & Counsel Tools", "engineering"],
    ["Senior Software Engineer, Backend - KYC", "engineering"],
    ["Staff Software Engineer, Tax Accounts", "engineering"],
    ["Software Engineer, Financial Platform", "engineering"],
    ["Senior Software Engineer, Consumer Revenue", "engineering"],
    ["Software Engineer, Support Tools", "engineering"],
    ["Engineering Manager, Tier 2 Support", "engineering"],
    ["Python Finance Developer", "engineering"],
    ["SEO Full Stack Engineer", "engineering"],
    ["Manager, Software Engineering", "engineering"],
    ["Lead Database Administrator", "engineering"],
    // The same words as the role itself still name their kind.
    ["Legal Counsel", "legal"],
    ["Senior Counsel - Employment", "legal"],
    ["Paralegal", "legal"],
    ["Compliance Analyst", "legal"],
    ["Sr. Analyst, Identity & KYC", "legal"],
    ["Head of Legal", "legal"],
    ["Associate, Legal", "legal"],
    ["Senior Accountant", "finance"],
    ["Senior Revenue Accountant", "finance"],
    ["US Tax Compliance - Senior", "finance"],
    ["Accounts Payable Analyst", "finance"],
    ["Technical Support Engineer I", "support"],
    ["Associate Linux Support Engineer", "support"],
    ["Summer Internship - Customer Support Operations & Supportability", "support"],
    ["Customer Success Manager", "support"],
    ["Sales Engineer", "sales"],
    ["Senior Director, Sales Engineering - Majors", "sales"],
    ["Account Executive", "sales"],
    ["Senior Presales and Solution Consultant", "sales"],
    ["Recruiter, GTM - Seoul", "people"],
    ["Recruiting Coordinator", "people"],
    ["Senior Compensation Analyst", "people"],
    ["Data Engineer", "data"],
    ["Machine Learning Engineer", "data"],
    ["Staff Data Analyst, Marketing", "data"],
    ["Senior Business Intelligence Analyst", "data"],
    ["Product Manager, Growth", "product"],
    ["Director, Product", "product"],
    ["Senior Product Designer", "design"],
    ["Director, Design", "design"],
    ["Product Marketing Manager", "marketing"],
    ["Marketing Coordinator", "marketing"],
    ["Executive Assistant, Legal", "operations"],
    ["Chief of Staff, CTO", "operations"],
    ["Technical Program Manager", "operations"],
    // A word that names software elsewhere doesn't make every title software.
    ["Mobile Podiatrist - Burwood", null],
    ["Mobile Associate - Retail Sales, Bilingual", "sales"],
    ["Registered Nurse - ICU", null],
    ["Founder", null],
  ])("%s → %s", (title, family) => {
    expect(roleFamily(title)).toBe(family);
  });

  it("keeps a software title's occupation and kind together", () => {
    expect(readTitle("Software Engineer, Compliance")).toEqual({
      family: "engineering",
      occupation: "15-1252.00",
    });
  });
});

describe("guessing the role from a resume", () => {
  const DEV_SKILLS = ["PostgreSQL", "React", "TypeScript", "Python", "FastAPI", "Redis", "Docker"];

  it("reads a developer's titles as software, whatever their teams are called", () => {
    for (const titles of [
      ["Software Engineer Intern, Compliance", "Research Intern"],
      ["Full Stack Developer at Legal & General"],
      ["Founding Engineer - LegalTech", "Backend Developer Intern"],
    ]) {
      const shown = lookingForOf({ titles, years: 1, skills: DEV_SKILLS }, null);
      expect(shown.family, titles.join(" / ")).toBe("engineering");
      expect(shown.title).not.toBe("");
    }
  });

  it("falls back to a clear lead in the skills when no title names a kind", () => {
    const founder = lookingForOf({ titles: ["Founder"], years: 1, skills: DEV_SKILLS }, null);
    expect(founder).toMatchObject({ title: "", family: "engineering" });
    const untitled = lookingForOf({ titles: [], years: 1, skills: DEV_SKILLS }, null);
    expect(untitled).toMatchObject({ title: "", family: "engineering" });
  });

  it("says Any role rather than guess a kind from mixed or few skills", () => {
    expect(skillsFamily(["Python", "SQL", "Excel"])).toBeNull();
    expect(skillsFamily(["React", "Figma", "TypeScript", "Sketch"])).toBeNull();
    expect(skillsFamily(["React", "TypeScript"])).toBeNull();
    expect(lookingForOf({ titles: [], years: 1, skills: ["Python", "SQL"] }, null)).toMatchObject({
      title: "",
      family: null,
    });
  });

  it("keeps a title with no kind when the skills don't point anywhere", () => {
    const nurse = lookingForOf({ titles: ["Registered Nurse"], years: 4, skills: ["Excel"] }, null);
    expect(nurse).toMatchObject({ title: "Registered Nurse", family: null });
  });

  it("lists each title with the kind its role names", () => {
    expect(
      roleOptions({ titles: ["Software Engineer, Compliance", "Legal Counsel"] }).map((role) => [
        role.title,
        role.family,
      ]),
    ).toEqual([
      ["Software Engineer", "engineering"],
      ["Legal Counsel", "legal"],
    ]);
  });

  it("only names skills the vocabulary knows", () => {
    const listed = Object.values(SKILL_FAMILIES).flat();
    expect(listed.filter((skill) => !SKILL_LABELS.has(skill))).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });
});
