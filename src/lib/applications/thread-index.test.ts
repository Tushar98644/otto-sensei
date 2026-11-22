import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Application } from "./schema";

vi.mock("./schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./schema")>();
  return { ...actual, normalizeJobUrl: vi.fn(actual.normalizeJobUrl) };
});

const { normalizeJobUrl } = await import("./schema");
const { applicationForCopy, applicationForJob, applicationForWriting, copyForJob } =
  await import("./thread");

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

function copy(id: string, jobUrl: string, updatedAt: number): Resume {
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
      jobUrl,
    },
  };
}

const link = (n: number) => `https://boards.example.com/acme/${n}`;

beforeEach(() => {
  vi.mocked(normalizeJobUrl).mockClear();
});

describe("looking up a job's application in a long list", () => {
  it("reads each application's link once, however many jobs it labels", () => {
    const applications = Array.from({ length: 200 }, (_, i) => app(`a${i}`, { jobUrl: link(i) }));
    const jobs = Array.from({ length: 20 }, (_, i) => ({ id: `job-${i}`, url: link(i * 3) }));
    const first = jobs.map((job) => applicationForJob(applications, job)?.id);
    expect(first).toEqual(jobs.map((_, i) => `a${i * 3}`));
    expect(vi.mocked(normalizeJobUrl).mock.calls.length).toBe(applications.length + jobs.length);
    jobs.forEach((job) => applicationForJob(applications, job));
    expect(vi.mocked(normalizeJobUrl).mock.calls.length).toBe(
      applications.length + 2 * jobs.length,
    );
  });

  it("still picks the newest, and the earlier of two applied at the same time", () => {
    const url = link(7);
    const list = [
      app("old", { jobUrl: url, appliedAt: 1 }),
      app("first", { jobUrl: url, appliedAt: 5 }),
      app("tie", { jobUrl: url, appliedAt: 5 }),
      app("by-id", { jobId: "job-7", appliedAt: 0 }),
    ];
    expect(applicationForJob(list, { id: "other", url })?.id).toBe("first");
    expect(applicationForJob(list, { id: "job-7", url })?.id).toBe("by-id");
    expect(applicationForWriting(list, { applicationId: null, jobUrl: url })?.id).toBe("first");
    expect(applicationForWriting(list, { applicationId: "tie", jobUrl: "" })?.id).toBe("tie");
    const tailored = copy("copy-1", url, 1);
    expect(applicationForCopy(list, tailored)?.id).toBe("first");
    expect(applicationForCopy([...list, app("sent", { resumeId: "copy-1" })], tailored)?.id).toBe(
      "sent",
    );
  });

  it("finds the newest tailored copy for a job, from a list read once", () => {
    const resumes = [
      copy("older", link(1), 1),
      copy("newer", link(1), 9),
      copy("other", link(2), 5),
    ];
    expect(copyForJob(resumes, { id: "job-1", url: link(1) })?.id).toBe("newer");
    expect(copyForJob(resumes, { id: "job-2", url: link(2) })?.id).toBe("other");
    expect(copyForJob(resumes, { id: "job-3", url: link(3) })).toBeNull();
    expect(vi.mocked(normalizeJobUrl).mock.calls.length).toBe(resumes.length + 3);
  });
});
