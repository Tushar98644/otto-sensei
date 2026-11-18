import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import type { Application } from "@/lib/applications/schema";
import {
  defaultResume,
  entryApplication,
  filterEntries,
  jobLine,
  kindCounts,
  kindsTally,
  letterEntries,
  letterResume,
  sourceTitle,
  studioTarget,
  withChange,
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
    applicationId: null,
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
    expect(kindCounts(entries)).toEqual({ all: 2, letter: 1, answer: 1, outreach: 0 });
    expect(filterEntries(entries, "answer").map((entry) => entry.key)).toEqual(["writing:w1"]);
    expect(filterEntries(entries, "all")).toHaveLength(2);
  });

  it("lists outreach messages with their subject and note, never linked to a copy", () => {
    const outreach = { subject: "Designer at Northwind", note: "Hi [first name], hello.", jobId: null };
    const entries = letterEntries(
      [
        writing("w1", { kind: "outreach", text: "Dear Fabrikam team,", outreach, createdAt: 8_000 }),
        writing("w2", { createdAt: 7_000 }),
        writing("w3", { kind: "outreach", text: "Hi there,", outreach, createdAt: 2_000 }),
      ],
      [copy("c1", "Dear Fabrikam team,", 6_000)],
    );
    expect(entries.map((entry) => [entry.key, entry.kind, entry.copyId])).toEqual([
      ["writing:w1", "outreach", null],
      ["writing:w2", "letter", null],
      ["copy:c1", "letter", "c1"],
      ["writing:w3", "outreach", null],
    ]);
    expect(entries[0]?.outreach).toEqual(outreach);
    expect(entries[1]).not.toHaveProperty("outreach");
    const counts = kindCounts(entries);
    expect(counts).toEqual({ all: 4, letter: 2, answer: 0, outreach: 2 });
    expect(filterEntries(entries, "outreach").map((entry) => entry.key)).toEqual([
      "writing:w1",
      "writing:w3",
    ]);
    expect(kindsTally(counts)).toBe("2 letters and 2 outreach messages");
    expect(kindsTally({ all: 3, letter: 1, answer: 1, outreach: 1 })).toBe(
      "1 letter, 1 answer and 1 outreach message",
    );
    expect(kindsTally({ all: 1, letter: 0, answer: 1, outreach: 0 })).toBe("1 answer");
  });

  it("shows an edit to a message before the server has it, and leaves a letter's parts alone", () => {
    const message = writing("w1", {
      kind: "outreach",
      text: "Hi [first name],",
      outreach: { subject: "Hello", note: "A note", jobId: "job-1" },
    });
    expect(withChange(message, { subject: "Hello again", note: "" })).toMatchObject({
      text: "Hi [first name],",
      outreach: { subject: "Hello again", note: "", jobId: "job-1" },
    });
    expect(withChange(message, { text: "Hi Sam," }).outreach?.subject).toBe("Hello");
    const letter = writing("w2", {});
    expect(withChange(letter, { text: "Dear team," })).toEqual({ ...letter, text: "Dear team," });
  });

  it("names the job with whatever is known", () => {
    expect(jobLine({ role: "Product Designer", company: "Northwind" })).toBe(
      "Product Designer at Northwind",
    );
    expect(jobLine({ role: "", company: "Northwind" })).toBe("Northwind");
    expect(jobLine({ role: " ", company: "" })).toBe("");
  });
});

describe("the application each letter belongs to", () => {
  function app(id: string, patch: Partial<Application> = {}): Application {
    return {
      id,
      resumeId: null,
      resumeTitle: "",
      company: "Fabrikam",
      role: "Data Analyst",
      jobUrl: "",
      appliedAt: 1,
      status: "applied",
      stageReached: "applied",
      statusChangedAt: 1,
      notes: "",
      followUpAt: null,
      jobId: null,
      hasPrep: false,
      interviewAt: null,
      createdAt: 1,
      updatedAt: 1,
      ...patch,
    };
  }

  it("follows the server's link, then the copy it was sent with, then the job link", () => {
    const tailored = copy("c1", "Dear Fabrikam,", 1);
    const [onCopy] = letterEntries([], [tailored]);
    const sent = app("sent", { resumeId: "c1" });
    const byLink = app("link", { jobUrl: "https://jobs.example.com/7" });
    expect(entryApplication(onCopy!, [sent, byLink], [tailored])?.id).toBe("sent");
    const [saved] = letterEntries([writing("w1", { jobUrl: "jobs.example.com/7" })], []);
    expect(entryApplication(saved!, [sent, byLink], [])?.id).toBe("link");
    const [linked] = letterEntries([writing("w2", { applicationId: "sent" })], []);
    expect(entryApplication(linked!, [sent, byLink], [])?.id).toBe("sent");
    const [loose] = letterEntries([writing("w3", {})], []);
    expect(entryApplication(loose!, [sent, byLink], [])).toBeNull();
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
