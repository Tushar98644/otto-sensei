import { describe, expect, it } from "vitest";
import {
  FeedShapeError,
  parseAshby,
  parseGreenhouse,
  parseHimalayas,
  parseJobicy,
  parseLever,
  parsePersonio,
  parseRecruitee,
  parseRemoteOk,
  parseWorkable,
} from "./parsers";
import {
  ASHBY_BOARD,
  GREENHOUSE_BOARD,
  HIMALAYAS_PAGE,
  JOBICY_PAGE,
  LEVER_POSTINGS,
  PERSONIO_FEED,
  RECRUITEE_OFFERS,
  REMOTE_OK_FEED,
  WORKABLE_ACCOUNT,
} from "./test-fixtures";

describe("parseGreenhouse", () => {
  it("reads each job with its link, place, dates and unescaped text", () => {
    const jobs = parseGreenhouse(GREENHOUSE_BOARD, "Vercel");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      externalId: "6231864004",
      company: "Vercel",
      title: "Senior Software Engineer, Dashboard",
      location: "Remote - Germany",
      remote: true,
      postedAt: Date.parse("2026-10-22T11:22:01-04:00"),
      validThrough: null,
      url: "https://job-boards.greenhouse.io/vercel/jobs/6231864004",
    });
    expect(jobs[0]!.text).toContain("- Build our dashboard in React, Next.js and TypeScript.");
    expect(jobs[0]!.text).not.toMatch(/&lt;|<p>/);
    expect(jobs[1]).toMatchObject({ remote: false, validThrough: Date.parse("2026-12-31") });
  });

  it("refuses an answer that isn't a board", () => {
    expect(() => parseGreenhouse({ error: "nope" }, "Vercel")).toThrow(FeedShapeError);
  });
});

describe("parseLever", () => {
  it("joins the sections and reads commitment and workplace", () => {
    const [job, ...rest] = parseLever(LEVER_POSTINGS, "Spotify");
    expect(rest).toHaveLength(0);
    expect(job).toMatchObject({
      externalId: "2a55d6c9-c564-443a-be3e-a3851db5a93b",
      company: "Spotify",
      title: "Backend Engineer, Platform",
      location: "Stockholm · Hybrid",
      remote: false,
      employmentType: "full_time",
      postedAt: 1792767640768,
    });
    expect(job!.text).toContain("What You'll Do\n- Build services in Java and Scala.");
    expect(job!.text).toContain("base range");
  });

  it("refuses an answer that isn't a list", () => {
    expect(() => parseLever({ ok: false }, "Spotify")).toThrow(FeedShapeError);
  });
});

describe("parseAshby", () => {
  it("reads listed jobs only, with remote and type", () => {
    const jobs = parseAshby(ASHBY_BOARD, "Linear");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      externalId: "d3bc1ced-3ce4-4086-a050-555055dbb1ff",
      company: "Linear",
      location: "Remote · Europe · North America",
      remote: true,
      employmentType: "full_time",
    });
    expect(jobs[0]!.text).toContain("- Work with GraphQL and Node.js.");
  });
});

describe("parseHimalayas", () => {
  it("keeps the application link, the allowed countries and the expiry", () => {
    const page = parseHimalayas(HIMALAYAS_PAGE);
    expect(page.nextCursor).toBe(HIMALAYAS_PAGE.nextCursor);
    expect(page.jobs[0]).toMatchObject({
      externalId: "https://himalayas.app/companies/acme-health/jobs/product-designer",
      company: "Acme Health",
      location: "Remote · United States · Canada",
      remote: true,
      employmentType: "full_time",
      seniority: "mid",
      postedAt: 1794066876_000,
      validThrough: 1799250875_000,
      url: "https://himalayas.app/companies/acme-health/jobs/product-designer?utm_source=api",
    });
    expect(page.jobs[0]!.text).toContain("Design our mobile app in Figma.");
  });

  it("ends paging when there is no cursor", () => {
    expect(parseHimalayas({ jobs: [] }).nextCursor).toBeNull();
  });
});

describe("parseRemoteOk", () => {
  it("skips the legal notice and keeps the Remote OK link", () => {
    const jobs = parseRemoteOk(REMOTE_OK_FEED);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      externalId: "1137701",
      company: "Salvo Software",
      title: "AI Developer",
      location: "Remote · Worldwide",
      remote: true,
      postedAt: 1794009602_000,
      url: "https://remoteok.com/remote-jobs/remote-ai-developer-salvo-software-1137701",
    });
  });
});

describe("parseWorkable", () => {
  it("links each job on the account's own page and reads place, type and level", () => {
    const jobs = parseWorkable(WORKABLE_ACCOUNT, "Blueground", "blueground");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      externalId: "DF694D45CA",
      company: "Blueground",
      title: "Operations Lead - New York City",
      location: "New York, United States",
      remote: false,
      employmentType: "full_time",
      postedAt: Date.parse("2026-09-23"),
      url: "https://apply.workable.com/blueground/j/DF694D45CA/",
      seniority: "junior",
    });
    expect(jobs[0]!.text).toContain("- Track turnover in Excel and Salesforce.");
    // Hidden places stay hidden; telecommuting is remote.
    expect(jobs[1]).toMatchObject({
      location: "Remote · Athens, Attica, Greece",
      remote: true,
      employmentType: "part_time",
    });
  });

  it("refuses an answer that isn't an account", () => {
    expect(() => parseWorkable({ error: "not-found" }, "Blueground", "blueground")).toThrow(
      FeedShapeError,
    );
  });
});

describe("parseRecruitee", () => {
  it("reads published offers with their requirements, linked on recruitee.com", () => {
    const jobs = parseRecruitee(RECRUITEE_OFFERS, "bunq", "bunq");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      externalId: "2819200",
      company: "bunq",
      title: "Security Lead",
      location: "Hybrid · Amsterdam, Noord-Holland, Netherlands",
      remote: false,
      employmentType: "full_time",
      postedAt: Date.parse("2026-11-06T17:01:19Z"),
      validThrough: null,
      url: "https://bunq.recruitee.com/o/security-lead",
      seniority: null,
    });
    expect(jobs[0]!.text).toContain("You have 8+ years of experience in security engineering.");
    expect(jobs[1]).toMatchObject({
      remote: true,
      employmentType: "contract",
      seniority: "junior",
      validThrough: Date.parse("2026-12-31T23:59:00Z"),
    });
  });
});

describe("parsePersonio", () => {
  it("reads each position, its offices and its described sections", () => {
    const jobs = parsePersonio(PERSONIO_FEED, "1KOMMA5°", "1komma5grad.jobs.personio.de");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      externalId: "2762189",
      company: "1KOMMA5°",
      title: "(Senior) Category Manager IT & Software (m/f/d)",
      location: "Remote · Berlin · Hamburg",
      remote: true,
      employmentType: "full_time",
      postedAt: Date.parse("2026-08-21T09:21:49+00:00"),
      url: "https://1komma5grad.jobs.personio.de/job/2762189?language=en",
      seniority: null,
    });
    expect(jobs[0]!.text).toContain("Your mission\n- Negotiate software contracts with SAP");
    expect(jobs[0]!.text).toContain("Run tenders & supplier reviews.");
    expect(jobs[0]!.text).toContain("Your profile\nYou have 5+ years of experience");
    expect(jobs[1]).toMatchObject({
      title: "(Junior) SEO & AI Marketing Manager (m/w/d)",
      location: "Berlin",
      employmentType: "internship",
      seniority: "junior",
      text: "",
    });
  });

  it("refuses an answer that isn't a Personio feed", () => {
    expect(() => parsePersonio("<html></html>", "Acme", "acme.jobs.personio.de")).toThrow(
      FeedShapeError,
    );
  });
});

describe("parseJobicy", () => {
  it("links each job to its Jobicy page and reads its region, type and level", () => {
    const page = parseJobicy(JOBICY_PAGE);
    // hasMore false: no next page, whatever the cursor says.
    expect(page.nextCursor).toBeNull();
    expect(page.jobs).toHaveLength(2);
    expect(page.jobs[0]).toMatchObject({
      externalId: "160713",
      company: "Clipboard",
      title: "Onboarding Documents Associate",
      location: "Remote · APAC",
      remote: true,
      employmentType: "full_time",
      postedAt: Date.parse("2026-11-09T19:40:24+00:00"),
      url: "https://jobicy.com/jobs/160713-onboarding-documents-associate",
      seniority: null,
    });
    expect(page.jobs[0]!.text).toContain("- Answer questions in Zendesk.");
    expect(page.jobs[1]).toMatchObject({ location: "Remote", seniority: "senior" });
  });

  it("follows the cursor while there is more", () => {
    expect(parseJobicy({ ...JOBICY_PAGE, hasMore: true }).nextCursor).toBe(JOBICY_PAGE.nextCursor);
    expect(() => parseJobicy({ error: "nope" })).toThrow(FeedShapeError);
  });
});
