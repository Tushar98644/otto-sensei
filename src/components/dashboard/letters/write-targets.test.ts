import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/lib/applications/schema";
import type { SavedJob } from "@/lib/job-feed/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { firstTarget, postLine, readTargetPost, writeTargets } from "./write-targets";

const api = vi.hoisted(() => ({ jobPost: vi.fn(), readJob: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api }));

const POST = "We are hiring a product marketer to own launches, pricing and the story sales tells customers.";

function application(id: string, patch: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: null,
    resumeTitle: "",
    company: `Company ${id}`,
    role: "Designer",
    jobUrl: "",
    appliedAt: 1_000,
    status: "applied",
    stageReached: "applied",
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    statusChangedAt: 1_000,
    notes: "",
    followUpAt: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...patch,
  };
}

function copy(id: string, company: string, createdAt: number, extra: Record<string, unknown> = {}): Resume {
  return {
    ...emptyResume(1),
    id,
    title: `Designer at ${company || "?"}`,
    source: "tailored",
    tailor: { baseResumeId: "base", jobTitle: "Designer", company, keywords: [], createdAt, ...extra },
  };
}

function savedJob(id: string, savedAt: number, patch: Partial<SavedJob> = {}): SavedJob {
  return {
    id,
    source: "greenhouse",
    company: "Globex",
    title: "Marketer",
    location: "Remote",
    remote: true,
    employmentType: null,
    seniority: "mid",
    postedAt: 1,
    url: `https://jobs.example.com/${id}`,
    keywords: [],
    closed: false,
    savedAt,
    ...patch,
  };
}

describe("jobs a letter can be for", () => {
  it("lists open applications, saved jobs and unsent copies, newest first", () => {
    const targets = writeTargets(
      [application("a", { appliedAt: 5_000, status: "interview", company: "Initech" })],
      [savedJob("j-new", 9_000), savedJob("j-old", 100)],
      [{ ...emptyResume(1), id: "base" }, copy("c", "Umbrella", 7_000), copy("nameless", "", 8_000)],
    );
    expect(targets.map((target) => [target.value, target.label])).toEqual([
      ["job:j-new", "Globex, Marketer (saved job)"],
      ["copy:c", "Umbrella, Designer (tailored copy)"],
      ["application:a", "Initech, Designer (Interviewing)"],
      ["job:j-old", "Globex, Marketer (saved job)"],
    ]);
  });

  it("picks the newest application or copy first, never a saved job that may still be loading", () => {
    const targets = writeTargets([application("a")], [savedJob("j", 9_000)], []);
    expect(firstTarget(targets)?.value).toBe("application:a");
    expect(firstTarget(writeTargets([], [savedJob("j", 1)], []))).toBeNull();
  });

  it("leaves out closed applications, jobs already applied to or tailored for, and copies already sent", () => {
    const targets = writeTargets(
      [
        application("a", { jobId: "j-applied", resumeId: "c-sent" }),
        application("b", { jobUrl: "https://jobs.example.com/j-linked" }),
        application("gone", { status: "rejected" }),
        application("quiet", { status: "no_reply" }),
      ],
      [
        savedJob("j-applied", 9_000),
        savedJob("j-linked", 9_000),
        savedJob("j-closed", 9_000, { closed: true }),
        savedJob("j-tailored", 9_000),
      ],
      [copy("c-sent", "Acme", 5_000), copy("c-open", "Hooli", 4_000, { jobId: "j-tailored" })],
    );
    expect(targets.map((target) => target.value).sort()).toEqual([
      "application:a",
      "application:b",
      "copy:c-open",
    ]);
  });

  it("reads the post from what is already known, best source first", () => {
    const sent = copy("c-sent", "Acme", 5_000, { jobText: POST, jobUrl: "https://acme.example.com/1" });
    const [withText, fromFeed, fromLink, none] = [
      writeTargets([application("a", { resumeId: "c-sent", jobId: "j" })], [], [sent])[0],
      writeTargets([application("b", { jobId: "j-2" })], [], [])[0],
      writeTargets([application("c", { jobUrl: "https://jobs.example.com/3" })], [], [])[0],
      writeTargets([application("d")], [], [])[0],
    ];
    expect(withText?.post).toEqual({ kind: "saved", text: POST });
    expect(withText).toMatchObject({ resumeId: "c-sent", resumeNote: "sent", applicationId: "a" });
    expect(fromFeed?.post).toEqual({ kind: "feed", id: "j-2" });
    expect(fromLink?.post).toEqual({ kind: "link", url: "https://jobs.example.com/3" });
    expect(none?.post).toEqual({ kind: "paste" });
    expect(postLine({ kind: "paste" })).toContain("Paste its link or text");
  });

  it("writes an unsent copy's letter from the copy itself", () => {
    const [target] = writeTargets(
      [],
      [],
      [copy("c", "Umbrella", 7_000, { jobUrl: "https://u.example.com/2", jobId: "8f1b" })],
    );
    expect(target).toMatchObject({
      resumeId: "c",
      resumeNote: "tailored",
      applicationId: null,
      jobId: "8f1b",
      title: "Designer",
      company: "Umbrella",
      post: { kind: "feed", id: "8f1b" },
    });
  });
});

describe("reading a picked job's post", () => {
  beforeEach(() => {
    api.jobPost.mockReset();
    api.readJob.mockReset();
  });

  it("uses a saved post as it is and reads the others", async () => {
    api.jobPost.mockResolvedValue({ text: `  ${POST}  ` });
    api.readJob.mockResolvedValue({ posting: { text: POST } });
    await expect(readTargetPost({ kind: "saved", text: POST })).resolves.toBe(POST);
    await expect(readTargetPost({ kind: "feed", id: "j" })).resolves.toBe(POST);
    await expect(readTargetPost({ kind: "link", url: "https://jobs.example.com/1" })).resolves.toBe(POST);
    expect(api.jobPost).toHaveBeenCalledWith("j");
    expect(api.readJob).toHaveBeenCalledWith({ url: "https://jobs.example.com/1" });
  });

  it("comes back empty for a post too short to write from, and passes read failures on", async () => {
    api.jobPost.mockResolvedValue({ text: "Designer" });
    api.readJob.mockRejectedValue(new Error("blocked"));
    await expect(readTargetPost({ kind: "feed", id: "j" })).resolves.toBe("");
    await expect(readTargetPost({ kind: "paste" })).resolves.toBe("");
    await expect(readTargetPost({ kind: "link", url: "https://jobs.example.com/1" })).rejects.toThrow("blocked");
  });
});
