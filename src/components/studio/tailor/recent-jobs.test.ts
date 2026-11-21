import { describe, expect, it } from "vitest";
import type { SavedJob } from "@/lib/job-feed/types";
import type { TailorMeta } from "@/lib/resume/schema";
import { jobChipLabel, recentJobs, savedJobQueued } from "./recent-jobs";

const DAY = 86_400_000;

function tailored(over: Partial<TailorMeta> = {}): TailorMeta {
  return {
    baseResumeId: "11111111-1111-4111-8111-111111111111",
    jobTitle: "Product Designer",
    company: "Canva",
    keywords: [],
    createdAt: 10 * DAY,
    jobText: "We need a product designer who knows Figma.",
    jobUrl: "https://jobs.lever.co/canva/123",
    ...over,
  };
}

function saved(over: Partial<SavedJob> = {}): SavedJob {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    source: "greenhouse",
    company: "GitLab",
    title: "Backend Engineer",
    location: "Remote",
    remote: true,
    employmentType: null,
    seniority: "mid",
    postedAt: 5 * DAY,
    url: "https://job-boards.greenhouse.io/gitlab/jobs/1",
    keywords: [],
    closed: false,
    savedAt: 12 * DAY,
    ...over,
  };
}

describe("recentJobs", () => {
  it("puts the newest first, saved and tailored together", () => {
    const jobs = recentJobs([tailored()], [saved()]);
    expect(jobs.map((job) => job.label)).toEqual([
      "Backend Engineer · GitLab",
      "Product Designer · Canva",
    ]);
    expect(jobs.map((job) => job.kind)).toEqual(["saved", "tailored"]);
  });

  it("shows a job once, by its link or its name", () => {
    const sameLink = saved({ url: "https://jobs.lever.co/canva/123", title: "Designer" });
    const sameName = tailored({ jobUrl: "", createdAt: 2 * DAY });
    expect(recentJobs([tailored(), sameName], [sameLink])).toHaveLength(1);
  });

  it("skips closed saved jobs and copies with no post or link, and stops at the limit", () => {
    expect(recentJobs([], [saved({ closed: true })])).toEqual([]);
    expect(recentJobs([tailored({ jobText: undefined, jobUrl: undefined })], [])).toEqual([]);
    const many = Array.from({ length: 8 }, (_, index) =>
      tailored({
        jobTitle: `Role ${index}`,
        jobUrl: `https://acme.com/jobs/${index}`,
        createdAt: index * DAY,
      }),
    );
    expect(recentJobs(many, [])).toHaveLength(5);
    expect(recentJobs(many, [], 2).map((job) => job.label)).toEqual([
      "Role 7 · Canva",
      "Role 6 · Canva",
    ]);
  });

  it("reads the link again for a copy that kept only its link", () => {
    const [job] = recentJobs([tailored({ jobText: "" })], []);
    expect(job?.kind === "tailored" && job.job.readLink).toBe(true);
    const [kept] = recentJobs([tailored()], []);
    expect(kept?.kind === "tailored" && kept.job.readLink).toBe(false);
  });
});

describe("savedJobQueued", () => {
  it("hands over the saved post's text, else a live read of its link", () => {
    const job = saved();
    expect(savedJobQueued(job, { text: "The post.", posting: null })).toMatchObject({
      link: job.url,
      text: "The post.",
      readLink: true,
      jobId: job.id,
    });
    expect(savedJobQueued(saved({ source: "remoteok" }), null)).toMatchObject({
      text: "",
      readLink: false,
    });
  });
});

describe("jobChipLabel", () => {
  it("names the job, or says it has no name", () => {
    expect(jobChipLabel(" Designer ", "")).toBe("Designer");
    expect(jobChipLabel("", "")).toBe("Untitled job");
  });
});
