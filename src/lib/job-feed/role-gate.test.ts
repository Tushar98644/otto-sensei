import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { lookingForOf } from "./looking-for";
import { rebuildMatchIndex } from "./match-index";
import { readTitle } from "./occupations";
import type { RawJob } from "./parsers";
import { rankJobs } from "./rank";
import { gateAllows, roleGate } from "./role-gate";
import { refreshSkillWeights, saveJobs, syncBoards } from "./store";
import { DEFAULT_FILTERS, NO_CHOICE } from "./types";

const allowed = (gate: ReturnType<typeof roleGate>, title: string) =>
  gateAllows(gate, readTitle(title));

describe("the role gate", () => {
  const software = roleGate({ occupation: "15-1252.00", family: "engineering" });

  it.each([
    "Software Engineer",
    "Backend Engineer",
    "Frontend Developer",
    "Full Stack Developer",
    "iOS Engineer",
    "DevOps Engineer",
    "Site Reliability Engineer",
    "SDET",
    "QA Engineer",
    "Data Engineer",
    "Machine Learning Engineer",
    "Security Engineer",
    "Engineering Manager",
    "Platform Engineering",
    "Python Finance Developer",
  ])("lets a software engineer see %s", (title) => {
    expect(allowed(software, title)).toBe(true);
  });

  it.each([
    "Technical Support Engineer I",
    "Associate Linux Support Engineer",
    "Summer Internship - Customer Support Operations",
    "Customer Support Specialist",
    "Sales Engineer",
    "Solutions Engineer",
    "SEO Specialist",
    "Marketing Manager",
    "Financial Analyst",
    "Accountant",
    "Legal Counsel",
    "Data Analyst",
    "Product Manager",
    "UX Designer",
    "Mechanical Engineer",
    "Registered Nurse",
  ])("never shows a software engineer %s", (title) => {
    expect(allowed(software, title)).toBe(false);
  });

  it("keeps each role to its own kinds of work", () => {
    const nurse = roleGate({ occupation: "29-1141.00", family: null });
    expect(allowed(nurse, "ICU Registered Nurse")).toBe(true);
    expect(allowed(nurse, "Family Nurse Practitioner")).toBe(true);
    expect(allowed(nurse, "Medical Assistant")).toBe(false);
    const accountant = roleGate({ occupation: "13-2011.00", family: "finance" });
    expect(allowed(accountant, "Senior Accountant")).toBe(true);
    expect(allowed(accountant, "Payroll Specialist")).toBe(true);
    expect(allowed(accountant, "Python Finance Developer")).toBe(false);
    const lawyer = roleGate({ occupation: "23-1011.00", family: "legal" });
    expect(allowed(lawyer, "Paralegal")).toBe(true);
    expect(allowed(lawyer, "Compliance Analyst")).toBe(true);
    expect(allowed(lawyer, "Software Engineer")).toBe(false);
  });

  it("reads a role named only by its kind, and lets skills decide for Any role", () => {
    const engineering = roleGate({ occupation: null, family: "engineering" });
    expect(allowed(engineering, "Software Engineer")).toBe(true);
    expect(allowed(engineering, "Technical Support Engineer")).toBe(false);
    expect(roleGate({ occupation: null, family: null })).toBeNull();
    expect(gateAllows(null, readTitle("Anything at all"))).toBe(true);
  });
});

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 23, 6);
const SKILLS = "TypeScript, React, Python, FastAPI, PostgreSQL, Redis, Docker and Linux.";

function raw(id: string, title: string): RawJob {
  return {
    externalId: id,
    company: `Company ${id}`,
    title,
    location: "Berlin, Germany",
    remote: false,
    employmentType: "full_time",
    postedAt: NOW - DAY,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: `You'll work with ${SKILLS}`,
  };
}

describe("matches for a developer", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("shows only software jobs at entry level, however many skills the others share", async () => {
    const db = await getDb();
    await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
    const titles = [
      "Software Engineer",
      "Junior Backend Engineer",
      "SEO Full Stack Engineer",
      "Associate Linux Support Engineer",
      "Python Finance Developer",
      "Summer Internship - Customer Support Operations",
      "Technical Support Engineer I",
      "Software Engineering Intern",
      "Sales Engineer",
    ];
    await saveJobs(
      db,
      { source: "greenhouse", board: "acme" },
      titles.map((title, i) => raw(String(i), title)),
      NOW,
      { snapshot: true },
    );
    await refreshSkillWeights(db, NOW);
    await rebuildMatchIndex(db, NOW);
    const user = await createUser("dev@example.com");
    const profile = {
      skills: [
        "TypeScript",
        "React",
        "Python",
        "FastAPI",
        "PostgreSQL",
        "Redis",
        "Docker",
        "Linux",
      ],
      titles: ["Full Stack Developer"],
      years: 1,
    };
    // Entry level, remote or on-site in EMEA, as the owner's Jobs tab read on 2026-11-22.
    const lookingFor = lookingForOf(profile, null, {
      ...NO_CHOICE,
      level: "junior",
      place: "g:emea",
    });
    expect(lookingFor).toMatchObject({ title: "Full Stack Developer", family: "engineering" });
    const result = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile,
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      lookingFor,
      deviceTimeZone: "",
      now: NOW,
    });
    expect(result.jobs.map((job) => job.title).sort()).toEqual([
      "Junior Backend Engineer",
      "Python Finance Developer",
      "SEO Full Stack Engineer",
      "Software Engineer",
    ]);
    expect(result.matching).toBe(4);
    const student = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile,
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      lookingFor: { ...lookingFor, level: "intern" },
      deviceTimeZone: "",
      now: NOW,
    });
    expect(student.jobs.map((job) => job.title)).toContain("Software Engineering Intern");
  });
});
