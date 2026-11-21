import { describe, expect, it } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import {
  isJobLink,
  isPostText,
  jobDraft,
  jobLinkParam,
  postProblem,
  privacyNote,
  resumeProblem,
} from "./inputs";
import type { LinkRead } from "./job-link";

const POST = "We're hiring a product designer. ".repeat(4);
const posting = {
  url: "https://boards.greenhouse.io/acme/jobs/123",
  source: "greenhouse" as const,
  title: "Product Designer",
  company: "Acme",
  location: "Remote",
  firstPostedAt: null,
  updatedAt: null,
  closesAt: null,
};
const read: Extract<LinkRead, { ok: true }> = {
  ok: true,
  link: posting.url,
  posting,
  text: POST,
  system: { name: "Greenhouse", href: "/ats/greenhouse" },
};

describe("resumeProblem", () => {
  it("asks for pasted text that looks like a whole resume", () => {
    const idle = { status: "idle" } as const;
    expect(resumeProblem("paste", "  ", idle)).toBe("Paste your resume first.");
    expect(resumeProblem("paste", "Jane Doe", idle)).toMatch(/bit short/);
    expect(resumeProblem("paste", "x".repeat(TEXT_LIMITS.resumeChars + 1), idle)).toMatch(
      /longer than a resume/,
    );
    expect(resumeProblem("paste", "x".repeat(200), idle)).toBeNull();
  });

  it("waits for an upload to be read", () => {
    const file = new File(["x"], "cv.pdf");
    expect(resumeProblem("upload", "", { status: "idle" })).toMatch(/Choose your resume file/);
    expect(resumeProblem("upload", "", { status: "reading", file })).toMatch(/Wait a moment/);
    expect(resumeProblem("upload", "", { status: "read", file, text: "x", words: 1 })).toBeNull();
  });
});

describe("postProblem", () => {
  it("asks for the whole post, within the limit", () => {
    expect(postProblem("")).toBe("Paste the job post first.");
    expect(postProblem("Product Designer")).toMatch(/not just the title/);
    expect(postProblem("x".repeat(TEXT_LIMITS.jobPostChars + 1))).toMatch(/Cut the company intro/);
    expect(postProblem(POST)).toBeNull();
  });
});

describe("telling links from posts", () => {
  it("takes a whole address as a link", () => {
    expect(isJobLink("https://jobs.lever.co/acme/1234")).toBe(true);
    expect(isJobLink("  www.acme.com/careers/42  ")).toBe(true);
    expect(isJobLink("acme.com/careers")).toBe(false);
    expect(isJobLink(`https://acme.com/jobs/42\n\n${POST}`)).toBe(false);
    expect(isJobLink(`https://acme.com/${"a".repeat(2048)}`)).toBe(false);
  });

  it("takes long text with spaces as a post", () => {
    expect(isPostText(POST)).toBe(true);
    expect(isPostText("https://acme.com/jobs/42")).toBe(false);
    expect(isPostText("Product designer at Acme")).toBe(false);
  });
});

describe("jobLinkParam", () => {
  it("reads a web link from ?job=, with or without https", () => {
    const link = "https://acme.wd5.myworkdayjobs.com/en-US/careers/job/42";
    expect(jobLinkParam(link)).toBe(link);
    expect(jobLinkParam(" jobs.lever.co/acme/abc ")).toBe("https://jobs.lever.co/acme/abc");
  });

  it("drops anything that isn't a web link, so it never fills the post box", () => {
    expect(jobLinkParam(null)).toBeNull();
    expect(jobLinkParam("")).toBeNull();
    expect(jobLinkParam("javascript:alert(1)")).toBeNull();
    expect(jobLinkParam(POST)).toBeNull();
    expect(jobLinkParam("localhost")).toBeNull();
  });
});

describe("privacyNote", () => {
  it("promises text stays in the browser only when nothing goes to the server", () => {
    expect(privacyNote("paste", "paste")).toMatch(/never leaves it/);
    expect(privacyNote("upload", "paste")).not.toMatch(/never leaves/);
    expect(privacyNote("paste", "link")).not.toMatch(/never leaves/);
  });
});

describe("jobDraft", () => {
  it("hands Tailor the posting read from the link", () => {
    expect(jobDraft(POST, read)).toEqual({
      title: "Product Designer",
      company: "Acme",
      text: POST,
      link: posting.url,
      posting,
      paste: false,
    });
  });

  it("hands Tailor pasted text when there is no read, or the text was changed after it", () => {
    const pasted = { title: "", company: "", text: POST, paste: true };
    expect(jobDraft(POST, null)).toEqual(pasted);
    expect(jobDraft(`${POST} Edited.`, read)).toEqual({ ...pasted, text: `${POST} Edited.` });
  });
});
