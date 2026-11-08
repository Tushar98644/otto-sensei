import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorBody, JobResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb } from "@/lib/auth/test-helpers";
import { GREENHOUSE_JOB } from "@/lib/jobs/test-fixtures";
import { fakeNet } from "@/lib/jobs/test-network";
import { JOB_READ_LIMITS } from "./limits";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock(
  "@/lib/jobs/transport",
  async () => (await import("@/lib/jobs/test-network")).transportMock,
);

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const LINK = "https://job-boards.greenhouse.io/gitlab/jobs/8638232002";
const API = "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8638232002?questions=true";

const readLink = (url: unknown, ip?: string) => POST(jsonRequest("/api/job", { url }, { ip }));

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  fakeNet.reset();
  fakeNet.resolve("boards-api.greenhouse.io", "93.184.216.34");
  fakeNet.json(API, GREENHOUSE_JOB);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/job", () => {
  it("returns the posting for a job link", async () => {
    const res = await readLink(LINK);
    expect(res.status).toBe(200);
    const body = (await res.json()) as JobResponse;
    expect(body.ok).toBe(true);
    expect(body.posting).toMatchObject({
      url: LINK,
      source: "greenhouse",
      title: "AI Transformation Owner, CRO",
      company: "GitLab",
      location: "Remote, United States",
      firstPostedAt: Date.parse("2026-07-22T13:38:40-04:00"),
      updatedAt: Date.parse("2026-11-06T15:25:07-05:00"),
      closesAt: null,
    });
    expect(body.posting.text.length).toBeGreaterThan(300);
  });

  it("logs the host and outcome, never the path, query or text", async () => {
    const info = vi.mocked(console.info);
    await readLink(`${LINK}?gh_src=private-referral-code`);
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain("job-boards.greenhouse.io");
    expect(logged).not.toMatch(/8638232002|private-referral-code|GitLab is/);
  });

  it.each([["not a link"], ["ftp://example.com/job"], [""]])("answers 400 for %j", async (url) => {
    const res = await readLink(url);
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toMatchObject({ code: "bad_request" });
  });

  it("answers 400 for a missing or overlong url", async () => {
    expect((await POST(jsonRequest("/api/job", {}))).status).toBe(400);
    expect((await readLink(`https://example.com/${"a".repeat(2048)}`)).status).toBe(400);
  });

  it("asks for pasted text when the site needs a login", async () => {
    const res = await readLink("https://www.linkedin.com/jobs/view/4012345678");
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({
      code: "parse_failed",
      message: "LinkedIn needs a login, so Otto can't read it. Paste the job text instead.",
    });
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("refuses private addresses without connecting", async () => {
    for (const url of [
      "https://169.254.169.254/latest/meta-data/",
      "https://127.0.0.1/",
      "https://[::1]/",
    ]) {
      const res = await readLink(url);
      expect(res.status).toBe(422);
      expect((await errorOf(res)).message).toBe(
        "Otto can only read public job pages. Paste the job text instead.",
      );
    }
    fakeNet.resolve("jobs.example.com", "93.184.216.34");
    fakeNet.resolve("internal.example.net", "10.1.2.3");
    fakeNet.redirect("https://jobs.example.com/job", "https://internal.example.net/");
    expect((await readLink("https://jobs.example.com/job")).status).toBe(422);
    expect(fakeNet.urls()).toEqual(["https://jobs.example.com/job"]);
  });

  it("answers 422 with a plain reason when the page has no post", async () => {
    fakeNet.resolve("jobs.example.com", "93.184.216.34");
    fakeNet.html("https://jobs.example.com/app", '<html><body><div id="root"></div></body></html>');
    const res = await readLink("https://jobs.example.com/app");
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({
      code: "parse_failed",
      message: "Otto couldn't find the job post on that page. Paste the job text instead.",
    });
  });

  it("refuses requests from other websites and non-JSON bodies", async () => {
    const crossSite = new Request("http://localhost/api/job", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
      body: JSON.stringify({ url: LINK }),
    });
    expect((await POST(crossSite)).status).toBe(403);
    expect(
      (await POST(jsonRequest("/api/job", { url: LINK }, { contentType: "text/plain" }))).status,
    ).toBe(415);
    expect(fakeNet.requests).toHaveLength(0);
  });

  it(`allows ${JOB_READ_LIMITS.perDevicePerHour} reads an hour per device`, async () => {
    for (let i = 0; i < JOB_READ_LIMITS.perDevicePerHour; i++) {
      expect((await readLink(LINK)).status).toBe(200);
    }
    const res = await readLink(LINK);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBe(60 * 60);
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message:
        "You've read a lot of job links this hour. Try again in 60 minutes, or paste the job text instead.",
    });
  });

  it(`allows ${JOB_READ_LIMITS.perIpPerHour} reads an hour per network`, async () => {
    for (let i = 0; i < JOB_READ_LIMITS.perIpPerHour; i++) {
      cookieJar.clear();
      expect((await readLink(LINK, "198.51.100.20")).status).toBe(200);
    }
    cookieJar.clear();
    expect((await readLink(LINK, "198.51.100.20")).status).toBe(429);
    expect((await readLink(LINK, "198.51.100.21")).status).toBe(200);
  });

  it("doesn't count links it refuses before reading", async () => {
    for (let i = 0; i < JOB_READ_LIMITS.perDevicePerHour + 5; i++) {
      expect((await readLink("https://www.linkedin.com/jobs/view/1")).status).toBe(422);
    }
    expect((await readLink(LINK)).status).toBe(200);
  });
});
