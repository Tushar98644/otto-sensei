import { describe, expect, it } from "vitest";
import {
  FeedShapeError,
  parseAshby,
  parseGreenhouse,
  parseHimalayas,
  parseLever,
  parseRemoteOk,
} from "./parsers";
import {
  ASHBY_BOARD,
  GREENHOUSE_BOARD,
  HIMALAYAS_PAGE,
  LEVER_POSTINGS,
  REMOTE_OK_FEED,
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
