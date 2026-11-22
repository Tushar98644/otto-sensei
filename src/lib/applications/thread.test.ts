import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import type { Application } from "./schema";
import {
  applicationForCopy,
  applicationForJob,
  applicationForWriting,
  applicationHref,
  copyForApplication,
  copyForJob,
  copyJobId,
  copyLetter,
  sameJobUrl,
  writingsByApplication,
  writingsForApplication,
} from "./thread";

const JOB_ID = "6f9619ff-8b86-4d01-b42d-00c04fc964ff";

function app(id: string, overrides: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: null,
    resumeTitle: "",
    company: "Acme",
    role: "Engineer",
    jobUrl: "",
    appliedAt: 1_000,
    status: "applied",
    stageReached: "applied",
    statusChangedAt: 1_000,
    notes: "",
    followUpAt: null,
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    interviewTime: null,
    interviewZone: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

function copy(id: string, tailor: Partial<NonNullable<Resume["tailor"]>> = {}, updatedAt = 1): Resume {
  return {
    ...emptyResume(),
    id,
    updatedAt,
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Engineer",
      company: "Acme",
      keywords: [],
      createdAt: 1,
      ...tailor,
    },
  };
}

function writing(id: string, overrides: Partial<Writing> = {}): Writing {
  return {
    id,
    kind: "letter",
    resumeId: "base",
    resumeTitle: "",
    company: "Acme",
    role: "Engineer",
    jobUrl: "",
    question: "",
    text: "Dear Acme,",
    warnings: [],
    demo: false,
    applicationId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("one job, one thread", () => {
  it("compares job links once normalized, never matching empty or broken ones", () => {
    expect(sameJobUrl("jobs.lever.co/acme/1", "https://jobs.lever.co/acme/1")).toBe(true);
    expect(sameJobUrl("https://jobs.lever.co/acme/1", "https://jobs.lever.co/acme/2")).toBe(false);
    expect(sameJobUrl("", "")).toBe(false);
    expect(sameJobUrl("not a link", "not a link")).toBe(false);
    expect(sameJobUrl(undefined, null)).toBe(false);
  });

  it("finds an opening's application by its id before its link, newest first", () => {
    const job = { id: JOB_ID, url: "https://jobs.lever.co/acme/1" };
    const byLink = app("by-link", { jobUrl: "https://jobs.lever.co/acme/1", appliedAt: 9_000 });
    const byId = app("by-id", { jobId: JOB_ID, jobUrl: "https://acme.example.com/apply" });
    expect(applicationForJob([byLink, byId], job)?.id).toBe("by-id");
    expect(applicationForJob([byLink], job)?.id).toBe("by-link");
    const older = app("older", { jobId: JOB_ID, appliedAt: 500 });
    expect(applicationForJob([older, byId], job)?.id).toBe("by-id");
    expect(applicationForJob([app("other")], job)).toBeNull();
  });

  it("finds a copy's application by the copy, then its opening, then its link", () => {
    const tailored = copy("copy-1", { jobId: JOB_ID, jobUrl: "https://jobs.lever.co/acme/1" });
    expect(applicationForCopy([app("sent", { resumeId: "copy-1" })], tailored)?.id).toBe("sent");
    expect(applicationForCopy([app("job", { jobId: JOB_ID })], tailored)?.id).toBe("job");
    expect(
      applicationForCopy([app("link", { jobUrl: "jobs.lever.co/acme/1" })], tailored)?.id,
    ).toBe("link");
    expect(applicationForCopy([app("none")], tailored)).toBeNull();
    const base = { ...emptyResume(), id: "base" };
    expect(applicationForCopy([app("sent", { resumeId: "base" })], base)).toBeNull();
  });

  it("finds the copy for an opening and the copy an application went out with", () => {
    const byLink = copy("by-link", { jobUrl: "https://jobs.lever.co/acme/1" }, 9);
    const byId = copy("by-id", { jobId: JOB_ID }, 1);
    const job = { id: JOB_ID, url: "https://jobs.lever.co/acme/1" };
    expect(copyForJob([byLink, byId], job)?.id).toBe("by-id");
    expect(copyForJob([byLink], job)?.id).toBe("by-link");
    expect(copyForJob([{ ...emptyResume(), id: "base" }], job)).toBeNull();
    expect(copyForApplication([byId], { resumeId: "by-id" })?.id).toBe("by-id");
    expect(copyForApplication([{ ...emptyResume(), id: "base" }], { resumeId: "base" })).toBeNull();
    expect(copyForApplication([byId], { resumeId: null })).toBeNull();
  });

  it("puts letters with their application by id, else by link", () => {
    const target = app("a1", { jobUrl: "https://acme.example.com/jobs/7" });
    const other = app("a2", { jobUrl: "https://acme.example.com/jobs/8" });
    const linked = writing("w1", { applicationId: "a1", createdAt: 1 });
    const byLink = writing("w2", { jobUrl: "acme.example.com/jobs/7", createdAt: 3 });
    const elsewhere = writing("w3", { applicationId: "a2", jobUrl: "acme.example.com/jobs/7" });
    const loose = writing("w4");
    expect(
      writingsForApplication([linked, byLink, elsewhere, loose], target).map((item) => item.id),
    ).toEqual(["w2", "w1"]);
    expect(applicationForWriting([target, other], elsewhere)?.id).toBe("a2");
    expect(applicationForWriting([target, other], byLink)?.id).toBe("a1");
    expect(applicationForWriting([target, other], loose)).toBeNull();
    expect(applicationForWriting([target], writing("w5", { applicationId: "gone" }))).toBeNull();
  });

  it("groups every letter under its application in one pass", () => {
    const first = app("a1", { jobUrl: "https://acme.example.com/jobs/7", appliedAt: 1 });
    const again = app("a2", { jobUrl: "acme.example.com/jobs/7", appliedAt: 9 });
    const grouped = writingsByApplication(
      [first, again],
      [
        writing("w1", { applicationId: "a1" }),
        writing("w2", { jobUrl: "https://acme.example.com/jobs/7" }),
        writing("w3", { applicationId: "gone" }),
        writing("w4"),
      ],
    );
    expect(grouped.get("a1")?.map((item) => item.id)).toEqual(["w1"]);
    expect(grouped.get("a2")?.map((item) => item.id)).toEqual(["w2"]);
    expect([...grouped.keys()].sort()).toEqual(["a1", "a2"]);
  });

  it("reads a copy's letter and opening by shape, and links to the hub", () => {
    expect(copyLetter(copy("c", { coverLetter: "  Dear Acme,  " }))).toBe("Dear Acme,");
    expect(copyLetter(copy("c"))).toBe("");
    expect(copyLetter(null)).toBe("");
    expect(copyJobId(copy("c", { jobId: JOB_ID }))).toBe(JOB_ID);
    expect(copyJobId(copy("c"))).toBeNull();
    expect(applicationHref("a b")).toBe("/dashboard/applications/a%20b");
  });
});
