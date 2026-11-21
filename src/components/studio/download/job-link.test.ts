import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume, TailorMeta } from "@/lib/resume/schema";
import { jobLinkFor } from "./job-link";

const JOB_ID = "6f1c1d4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

function copy(tailor: Partial<TailorMeta> | null): Resume {
  const resume = createSampleResume(0);
  if (!tailor) return resume;
  return {
    ...resume,
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Platform Engineer",
      company: "Globex",
      keywords: [],
      createdAt: 0,
      ...tailor,
    },
  };
}

describe("jobLinkFor", () => {
  it("gives a tailored copy's job post, with the feed job's id when it came from Jobs", () => {
    expect(jobLinkFor(copy({ jobUrl: "https://jobs.example.com/1", jobId: JOB_ID }))).toEqual({
      url: "https://jobs.example.com/1",
      jobId: JOB_ID,
      company: "Globex",
      title: "Platform Engineer",
    });
  });

  it("has no feed id for a pasted link, so the Jobs page never tries to log it", () => {
    expect(jobLinkFor(copy({ jobUrl: "jobs.example.com/2" }))).toMatchObject({
      url: "https://jobs.example.com/2",
      jobId: null,
    });
  });

  it("gives nothing without a link, for a link that isn't a web page, or for a resume that isn't a copy", () => {
    expect(jobLinkFor(copy({}))).toBeNull();
    expect(jobLinkFor(copy({ jobUrl: "javascript:alert(1)" }))).toBeNull();
    expect(jobLinkFor(copy(null))).toBeNull();
  });
});
