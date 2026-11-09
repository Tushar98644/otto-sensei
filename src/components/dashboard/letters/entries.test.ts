import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import {
  defaultResume,
  filterEntries,
  jobLine,
  kindCounts,
  letterEntries,
  letterResume,
  sourceTitle,
  studioTarget,
} from "./entries";

function resume(id: string, updatedAt: number, patch: Partial<Resume> = {}): Resume {
  return { ...emptyResume(1_000), id, title: `Resume ${id}`, updatedAt, ...patch };
}

function copy(id: string, letter: string, createdAt: number): Resume {
  return resume(id, createdAt, {
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Data Analyst",
      company: "Fabrikam",
      keywords: [],
      createdAt,
      coverLetter: letter,
      jobUrl: "https://jobs.example.com/7",
    },
  });
}

function writing(id: string, patch: Partial<Writing>): Writing {
  return {
    id,
    kind: "letter",
    resumeId: "base",
    resumeTitle: "Resume base",
    company: "Northwind",
    role: "Product Designer",
    jobUrl: "",
    question: "",
    text: "Dear Northwind team,",
    warnings: [],
    demo: false,
    createdAt: 5_000,
    updatedAt: 5_000,
    ...patch,
  };
}

describe("the letters list", () => {
  it("shows saved letters, saved answers and letters kept on tailored copies, newest first", () => {
    const entries = letterEntries(
      [
        writing("w1", { createdAt: 3_000 }),
        writing("w2", { kind: "answer", question: "Why us?", text: "Because.", createdAt: 9_000 }),
      ],
      [resume("base", 1_000), copy("c1", "Dear Fabrikam team,", 6_000)],
    );
    expect(entries.map((entry) => [entry.key, entry.kind])).toEqual([
      ["writing:w2", "answer"],
      ["copy:c1", "letter"],
      ["writing:w1", "letter"],
    ]);
    expect(entries[1]).toMatchObject({
      company: "Fabrikam",
      role: "Data Analyst",
      jobUrl: "https://jobs.example.com/7",
      writingId: null,
      copyId: "c1",
      resumeTitle: "Resume c1",
    });
  });

  it("lists a letter that is both saved and on its copy once, linked to both", () => {
    const entries = letterEntries(
      [writing("w1", { text: "Dear Fabrikam team,\n\nHello." })],
      [copy("c1", "  Dear Fabrikam team,\n\nHello.  ", 6_000), copy("c2", "", 7_000)],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ writingId: "w1", copyId: "c1", company: "Northwind" });
  });

  it("never links an answer to a copy, and counts and filters by kind", () => {
    const entries = letterEntries(
      [writing("w1", { kind: "answer", question: "Why us?", text: "Dear Fabrikam team," })],
      [copy("c1", "Dear Fabrikam team,", 6_000)],
    );
    expect(entries.map((entry) => entry.copyId)).toEqual(["c1", null]);
    expect(kindCounts(entries)).toEqual({ all: 2, letter: 1, answer: 1 });
    expect(filterEntries(entries, "answer").map((entry) => entry.key)).toEqual(["writing:w1"]);
    expect(filterEntries(entries, "all")).toHaveLength(2);
  });

  it("names the job with whatever is known", () => {
    expect(jobLine({ role: "Product Designer", company: "Northwind" })).toBe(
      "Product Designer at Northwind",
    );
    expect(jobLine({ role: "", company: "Northwind" })).toBe("Northwind");
    expect(jobLine({ role: " ", company: "" })).toBe("");
  });
});

describe("letter resumes and studio links", () => {
  const resumes = [resume("base", 1_000), resume("newer", 8_000), copy("c1", "Hi", 9_000)];

  it("prints with the copy, then the resume it came from, then the newest base resume", () => {
    expect(letterResume({ copyId: "c1", resumeId: "base" }, resumes).id).toBe("c1");
    expect(letterResume({ copyId: null, resumeId: "base" }, resumes).id).toBe("base");
    expect(letterResume({ copyId: "gone", resumeId: "gone" }, resumes).id).toBe("newer");
    expect(letterResume({ copyId: null, resumeId: null }, []).basics.name).toBe("");
  });

  it("opens the copy's download step, else the source resume's tailor step, else nothing", () => {
    expect(studioTarget({ copyId: "c1", resumeId: "base" }, resumes)).toEqual({ id: "c1", step: "download" });
    expect(studioTarget({ copyId: null, resumeId: "base" }, resumes)).toEqual({ id: "base", step: "tailor" });
    expect(studioTarget({ copyId: null, resumeId: "deleted" }, resumes)).toBeNull();
  });

  it("names the source resume by its title now, else the one it had when written", () => {
    expect(sourceTitle({ resumeId: "base", resumeTitle: "Old name" }, resumes)).toBe("Resume base");
    expect(sourceTitle({ resumeId: "elsewhere", resumeTitle: " Old name " }, resumes)).toBe("Old name");
    expect(sourceTitle({ resumeId: null, resumeTitle: "" }, resumes)).toBe("");
  });

  it("starts a new letter from the resume edited last", () => {
    expect(defaultResume(resumes)?.id).toBe("c1");
    expect(defaultResume([])).toBeNull();
  });
});
