import { describe, expect, it } from "vitest";
import {
  ashbyPosting,
  greenhousePosting,
  leverPosting,
  personioPosting,
  recruiteePosting,
  workablePosting,
} from "./boards";
import { PERSONIO_FEED, RECRUITEE_OFFERS, WORKABLE_ACCOUNT } from "@/lib/job-feed/test-fixtures";
import { JobReadError } from "./errors";
import { ASHBY_BOARD, ASHBY_JOB_ID, GREENHOUSE_JOB, LEVER_POSTING } from "./test-fixtures";

const LINK = new URL("https://example.com/job");

function reasonOf(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof JobReadError ? error.reason : "other";
  }
}

describe("greenhousePosting", () => {
  it("normalizes a Greenhouse job", () => {
    const posting = greenhousePosting(GREENHOUSE_JOB, "gitlab", LINK);
    expect(posting).toMatchObject({
      url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      source: "greenhouse",
      title: "AI Transformation Owner, CRO",
      company: "GitLab",
      location: "Remote, United States",
      firstPostedAt: Date.parse("2026-07-22T13:38:40-04:00"),
      updatedAt: Date.parse("2026-11-06T15:25:07-05:00"),
      closesAt: null,
    });
    // The content arrives HTML-escaped; it must come out as plain text.
    expect(posting.text).not.toMatch(/&lt;|&amp;|<p>/);
    expect(posting.text).toContain("What you’ll do\n\n- Own the plan for bringing AI");
    expect(posting.text).toContain("Salary range: $120,000–$180,000 & equity.");
  });

  it("names the company from the board when Greenhouse doesn't", () => {
    const job = { ...GREENHOUSE_JOB, company_name: null };
    expect(greenhousePosting(job, "acme-labs", LINK).company).toBe("Acme Labs");
  });

  it("refuses an unexpected shape and a post with too little text", () => {
    expect(reasonOf(() => greenhousePosting({ error: "nope" }, "gitlab", LINK))).toBe(
      "unreachable",
    );
    expect(
      reasonOf(() =>
        greenhousePosting({ ...GREENHOUSE_JOB, content: "&lt;p&gt;Hi&lt;/p&gt;" }, "gitlab", LINK),
      ),
    ).toBe("no_text");
  });
});

describe("leverPosting", () => {
  it("joins the description, each list and the closing notes", () => {
    const posting = leverPosting(LEVER_POSTING, "spotify", LINK);
    expect(posting).toMatchObject({
      url: "https://jobs.lever.co/spotify/2a55d6c9-c564-443a-be3e-a3851db5a93b",
      source: "lever",
      title: "Account Executive - Commercial, Spotify Technology",
      company: "Spotify",
      location: "New York, NY · Hybrid",
      firstPostedAt: 1792767640768,
      updatedAt: null,
    });
    expect(posting.text).toContain(
      "What You'll Do\n- Identify and pursue new business opportunities",
    );
    expect(posting.text).toContain(
      "Who You Are\n- You have 4+ years of experience in a quota-carrying sales role.\n- You love",
    );
    expect(posting.text).toMatch(
      /plus equity\. The benefits include health insurance and 23 paid days off\.$/,
    );
  });
});

describe("ashbyPosting", () => {
  it("picks the job by id from the whole board", () => {
    const posting = ashbyPosting(ASHBY_BOARD, "linear", ASHBY_JOB_ID, LINK);
    expect(posting).toMatchObject({
      url: `https://jobs.ashbyhq.com/linear/${ASHBY_JOB_ID}`,
      source: "ashby",
      title: "Senior / Staff Fullstack Engineer",
      company: "Linear",
      location: "Remote · Europe",
      firstPostedAt: Date.parse("2021-04-27T20:13:45.158+00:00"),
    });
    expect(posting.text).toContain("- Build product features end to end, across the stack.");
  });

  it("says not found when the board no longer lists the job", () => {
    expect(
      reasonOf(() =>
        ashbyPosting(ASHBY_BOARD, "linear", "00000000-0000-4000-8000-000000000000", LINK),
      ),
    ).toBe("not_found");
    expect(reasonOf(() => ashbyPosting({ jobs: "nope" }, "linear", ASHBY_JOB_ID, LINK))).toBe(
      "unreachable",
    );
  });
});

describe("workablePosting", () => {
  it("picks the job by shortcode and names the company from the account", () => {
    const posting = workablePosting(WORKABLE_ACCOUNT, "blueground", "df694d45ca", LINK);
    expect(posting).toMatchObject({
      url: "https://apply.workable.com/blueground/j/DF694D45CA/",
      source: "workable",
      title: "Operations Lead - New York City",
      company: "Blueground",
      location: "New York, United States",
      firstPostedAt: Date.parse("2026-09-23"),
    });
    expect(posting.text).toContain("You have 3+ years of experience in property operations.");
    expect(reasonOf(() => workablePosting(WORKABLE_ACCOUNT, "blueground", "ZZZZZZ", LINK))).toBe(
      "not_found",
    );
  });
});

describe("recruiteePosting", () => {
  it("reads one offer with the company's own name", () => {
    const posting = recruiteePosting({ offer: RECRUITEE_OFFERS.offers[0] }, "bunq", LINK);
    expect(posting).toMatchObject({
      url: "https://bunq.recruitee.com/o/security-lead",
      source: "recruitee",
      title: "Security Lead",
      company: "bunq",
    });
    expect(posting.text).toContain("You know AWS and Kubernetes.");
    expect(reasonOf(() => recruiteePosting({ offers: [] }, "bunq", LINK))).toBe("unreachable");
  });
});

describe("personioPosting", () => {
  it("finds the position in the account's feed", () => {
    const posting = personioPosting(PERSONIO_FEED, "1komma5grad.jobs.personio.de", "2762189", LINK);
    expect(posting).toMatchObject({
      url: "https://1komma5grad.jobs.personio.de/job/2762189?language=en",
      source: "personio",
      title: "(Senior) Category Manager IT & Software (m/f/d)",
      company: "1KOMMA5° Technology GmbH",
    });
    expect(
      reasonOf(() => personioPosting(PERSONIO_FEED, "1komma5grad.jobs.personio.de", "1", LINK)),
    ).toBe("not_found");
  });
});
