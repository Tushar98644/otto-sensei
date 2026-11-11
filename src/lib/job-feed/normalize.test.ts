import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume, newExperience } from "@/lib/resume/schema";
import {
  boilerplateLines,
  contentHash,
  dedupeKey,
  groupKey,
  isFillerTitle,
  normalizeJob,
  searchWords,
} from "./normalize";
import { parseGreenhouse, parseHimalayas } from "./parsers";
import { matchProfileOf, yearsOfExperience } from "./profile";
import { BOARD_SEEDS } from "./seeds";
import { GREENHOUSE_BOARD, HIMALAYAS_PAGE } from "./test-fixtures";

const NOW = Date.UTC(2026, 10, 8, 12);

describe("normalizeJob", () => {
  it("works out skills, level, kind, years and the rule lines at ingest", () => {
    const [raw] = parseGreenhouse(GREENHOUSE_BOARD, "Vercel");
    const job = normalizeJob(raw!, NOW);
    expect(job).toMatchObject({
      seniority: "senior",
      family: "engineering",
      minYears: 5,
      remote: true,
      postedAt: Date.parse("2026-10-22T11:22:01-04:00"),
    });
    expect(job.keywords).toEqual(["React", "Next.js", "TypeScript", "Node.js", "Go", "AWS"]);
    expect(job.rulesText).toBe("This role is remote, open to candidates in Germany.");
    expect(job.searchText).toContain("senior software engineer dashboard vercel remote germany");
  });

  it("takes a feed's level when the title has none, and never a future date", () => {
    const [raw] = parseHimalayas(HIMALAYAS_PAGE).jobs;
    const job = normalizeJob({ ...raw!, postedAt: NOW + 60_000 }, NOW);
    expect(job.seniority).toBe("mid");
    expect(job.family).toBe("design");
    expect(job.postedAt).toBe(NOW);
  });

  it("leaves a board's shared lines out of each job's skills", () => {
    const shared = "Everyone here uses AI to support research, analysis and prototyping in Python.";
    const texts = [
      "Build APIs in Go.",
      "Sell to enterprises with Salesforce.",
      "Design in Figma.",
      "Run Kubernetes.",
    ].map((own) => `${own}\n${shared}`);
    const boilerplate = boilerplateLines(texts);
    expect([...boilerplate]).toEqual([shared.toLowerCase()]);
    const [raw] = parseGreenhouse(GREENHOUSE_BOARD, "Vercel");
    const job = normalizeJob({ ...raw!, title: "Engineer", text: texts[0]! }, NOW, boilerplate);
    expect(job.keywords).toEqual(["Go"]);
    expect(job.description).toBe("");
    const kept = normalizeJob(
      { ...raw!, title: "Engineer", text: texts[0]! },
      NOW,
      boilerplate,
      500,
    );
    expect(kept.description).toContain("prototyping");
    expect(boilerplateLines(texts.slice(0, 3)).size).toBe(0);
  });

  it("keys one opening the same way across sources", () => {
    expect(dedupeKey("Acme, Inc.", "Sr. Product Designer", "Remote - United States")).toBe(
      dedupeKey("acme", "Senior Product Designer", "United States · Remote"),
    );
    expect(dedupeKey("Acme", "Product Designer", "Berlin")).not.toBe(
      dedupeKey("Acme", "Product Designer", "London"),
    );
  });

  it("gives location copies of one opening one group key, and different openings their own", () => {
    const post = (place: string, pay: string) =>
      [
        "About the role",
        "You'll own our largest accounts and grow them with Salesforce and Gong.",
        `This role is based in ${place}.`,
        `The base salary range for ${place} is ${pay}.`,
        "You have 5+ years of SaaS sales experience.",
      ].join("\n");
    const uk = groupKey(
      "Acme Inc",
      "Account Executive - Remote UK",
      "Remote, United Kingdom",
      post("London", "£90,000 - £110,000"),
    );
    const canada = groupKey(
      "Acme",
      "Account Executive (Canada)",
      "Toronto, Canada",
      post("Toronto", "CA$120,000 - CA$140,000"),
    );
    expect(uk).toBe(canada);
    const other = groupKey(
      "Acme",
      "Account Executive",
      "London",
      "Sell our analytics add-on to new logos with HubSpot.",
    );
    expect(other).not.toBe(uk);
    expect(groupKey("Other Co", "Account Executive", "London", post("London", "£90,000"))).not.toBe(
      uk,
    );
  });

  it("flags posts for no particular opening", () => {
    for (const title of [
      "General Application",
      "Account Executive, Enterprise — Future Opportunities",
      "Join our Talent Community",
      "Open Application - Engineering",
      "Expression of Interest: Sales",
      "Don’t see the right role? Apply here",
    ]) {
      expect(isFillerTitle(title)).toBe(true);
    }
    for (const title of [
      "Senior Backend Engineer",
      "Talent Acquisition Partner",
      "Head of Future Products",
    ]) {
      expect(isFillerTitle(title)).toBe(false);
    }
    const [raw] = parseGreenhouse(GREENHOUSE_BOARD, "Vercel");
    expect(normalizeJob({ ...raw!, title: "General Application" }, NOW).evergreen).toBe(true);
    expect(normalizeJob(raw!, NOW).evergreen).toBe(false);
  });

  it("hashes only what normalizing reads", () => {
    const [raw] = parseGreenhouse(GREENHOUSE_BOARD, "Vercel");
    expect(contentHash(raw!)).toBe(contentHash({ ...raw! }));
    expect(contentHash(raw!)).not.toBe(contentHash({ ...raw!, title: "Other" }));
  });

  it("folds accents and punctuation for search", () => {
    expect(searchWords("Café-Bar / Zürich (Node.js)")).toBe("cafe bar zurich node js");
  });
});

describe("matchProfileOf", () => {
  it("sends skills, titles and years, never the resume's words", () => {
    const resume = createSampleResume(NOW);
    const profile = matchProfileOf(resume, NOW);
    expect(profile.titles[0]).toBe("Product Marketing Manager");
    expect(profile.years).toBeGreaterThan(9);
    const sent = JSON.stringify(profile);
    expect(sent).not.toContain(resume.basics.name);
    expect(sent).not.toContain(resume.basics.email);
  });

  it("counts overlapping jobs once and ignores dates it can't read", () => {
    const resume = emptyResume();
    resume.experience = [
      { ...newExperience(), startDate: "Jan 2020", endDate: "Dec 2021" },
      { ...newExperience(), startDate: "Jan 2021", endDate: "Dec 2022" },
      { ...newExperience(), startDate: "someday", endDate: "" },
    ];
    expect(yearsOfExperience(resume, NOW)).toBe(3);
    expect(yearsOfExperience(emptyResume(), NOW)).toBeNull();
  });
});

describe("BOARD_SEEDS", () => {
  it("has a few hundred boards, each once, with names and safe tokens", () => {
    expect(BOARD_SEEDS.length).toBeGreaterThanOrEqual(500);
    const keys = BOARD_SEEDS.map((seed) => `${seed.ats}:${seed.token.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const seed of BOARD_SEEDS) {
      expect(seed.company.trim()).not.toBe("");
      expect(seed.token).toMatch(/^[a-z0-9][a-z0-9._-]{0,99}$/i);
      if (seed.ats === "recruitee" || seed.ats === "personio")
        expect(seed.token).toMatch(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);
    }
  });
});
