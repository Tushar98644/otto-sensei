import { describe, expect, it } from "vitest";
import { emptyResume, newBullet, type Resume, type ResumeSource } from "@/lib/resume/schema";
import {
  filterCounts,
  libraryView,
  matchesQuery,
  recentResumes,
  sortResumes,
  tailoredCounts,
  tailoredJob,
} from "./library";

function resume(
  title: string,
  updatedAt: number,
  source: ResumeSource = "import",
  extra: Partial<Resume> = {},
): Resume {
  return { ...emptyResume(updatedAt), title, source, ...extra };
}

function tailored(title: string, baseId: string, jobTitle: string, company: string): Resume {
  return resume(title, 10, "tailored", {
    tailor: { baseResumeId: baseId, jobTitle, company, keywords: [], createdAt: 10 },
  });
}

const designer = resume("Design roles", 300, "import", {
  basics: { name: "José Álvarez", headline: "", email: "", phone: "", location: "", links: [] },
  experience: [
    {
      id: "j1",
      company: "Northwind Bank",
      title: "Designer",
      location: "",
      startDate: "",
      endDate: "",
      bullets: [newBullet("Shipped the app")],
    },
  ],
});
const sample = resume("Sample resume", 100, "sample");
const scratch = resume("", 200, "scratch");
const copy = tailored("PM at Stripe", designer.id, "Senior PM", "Stripe");
const all = [copy, scratch, sample, designer];

describe("filterCounts", () => {
  it("counts every resume once under All and once under its source", () => {
    expect(filterCounts(all)).toEqual({ all: 4, import: 1, tailored: 1, sample: 1, scratch: 1 });
    expect(filterCounts([])).toEqual({ all: 0, import: 0, tailored: 0, sample: 0, scratch: 0 });
  });
});

describe("matchesQuery", () => {
  it("finds a resume by its title, its person's name or a company on it", () => {
    expect(matchesQuery(designer, "design roles")).toBe(true);
    expect(matchesQuery(designer, "alvarez")).toBe(true);
    expect(matchesQuery(designer, "NORTHWIND")).toBe(true);
    expect(matchesQuery(designer, "stripe")).toBe(false);
  });

  it("finds a tailored copy by the job it was made for, words in any order", () => {
    expect(matchesQuery(copy, "stripe senior")).toBe(true);
    expect(matchesQuery(copy, "stripe junior")).toBe(false);
  });

  it("ignores case, accents and extra spaces, and matches everything when empty", () => {
    expect(matchesQuery(designer, "  JOSÉ   álvarez ")).toBe(true);
    expect(matchesQuery(sample, "")).toBe(true);
    expect(matchesQuery(sample, "   ")).toBe(true);
  });
});

describe("sortResumes", () => {
  it("puts the most recently edited first", () => {
    expect(sortResumes(all, "edited").map((r) => r.updatedAt)).toEqual([300, 200, 100, 10]);
  });

  it("sorts by the name shown, with numbers in number order and untitled ones by person", () => {
    const named = [resume("Resume 10", 1), resume("resume 9", 2), resume("Alpha", 3)];
    expect(sortResumes(named, "name").map((r) => r.title)).toEqual(["Alpha", "resume 9", "Resume 10"]);
    expect(sortResumes([scratch, sample], "name").map((r) => r.title)).toEqual(["Sample resume", ""]);
  });

  it("keeps the incoming order for ties and never changes its input", () => {
    const a = resume("Same", 5);
    const b = resume("Same", 5);
    const input = [a, b];
    expect(sortResumes(input, "name")).toEqual([a, b]);
    expect(sortResumes(input, "edited")).toEqual([a, b]);
    expect(input).toEqual([a, b]);
  });
});

describe("libraryView", () => {
  it("filters by source and search together, then sorts", () => {
    expect(libraryView(all, { query: "", filter: "all", sort: "edited" })).toHaveLength(4);
    expect(libraryView(all, { query: "", filter: "tailored", sort: "edited" })).toEqual([copy]);
    expect(libraryView(all, { query: "northwind", filter: "import", sort: "name" })).toEqual([designer]);
    expect(libraryView(all, { query: "northwind", filter: "sample", sort: "name" })).toEqual([]);
  });
});

describe("recentResumes", () => {
  it("takes the newest edits", () => {
    expect(recentResumes(all, 2)).toEqual([designer, scratch]);
  });
});

describe("tailoredCounts and tailoredJob", () => {
  it("counts copies per base resume, ignoring a copy that points at itself", () => {
    const second = tailored("Lead at Acme", designer.id, "Lead", "Acme");
    const self = { ...tailored("Odd", "x", "", ""), id: "x" };
    const counts = tailoredCounts([...all, second, self]);
    expect(counts.get(designer.id)).toBe(2);
    expect(counts.has("x")).toBe(false);
  });

  it("names the job a copy was made for", () => {
    expect(tailoredJob(copy)).toBe("Senior PM · Stripe");
    expect(tailoredJob(tailored("x", "b", "  ", "Acme"))).toBe("Acme");
    expect(tailoredJob(tailored("x", "b", "", ""))).toBeNull();
    expect(tailoredJob(sample)).toBeNull();
  });
});
