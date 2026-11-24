import { randomBytes } from "node:crypto";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_APPLICATIONS_PER_USER } from "@/config/plans";
import { getDb } from "@/db/client";
import {
  applications,
  feedback,
  portfolios,
  resumes,
  savedJobs,
  shares,
  userSettings,
  writings,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { rateLimit } from "@/lib/rate-limit";
import type { Resume } from "@/lib/resume/schema";
import { GET } from "./route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const currentUser = vi.mocked(getCurrentUser);
const limiter = vi.mocked(rateLimit);
const AT = Date.UTC(2026, 10, 3, 9);

let sequence = 0;

async function person(name: string): Promise<SessionUser> {
  sequence += 1;
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email: `${name}${sequence}@example.com`,
    plan: "pro",
    planInterval: "month",
    planRenewsAt: null,
  };
  await insertUserRow({ id: user.id, email: user.email, plan: "pro", createdAt: 1, updatedAt: 1 });
  const db = await getDb();
  await db.insert(resumes).values([
    {
      userId: user.id,
      id: `${name}-1`,
      data: { id: `${name}-1`, title: `${name} resume` } as unknown as Resume,
      createdAt: AT,
      updatedAt: AT,
    },
    {
      userId: user.id,
      id: `${name}-2`,
      data: { id: `${name}-2`, title: `${name} resume` } as unknown as Resume,
      createdAt: AT + 1,
      updatedAt: AT + 1,
    },
  ]);
  await db.insert(writings).values([
    {
      id: crypto.randomUUID(),
      userId: user.id,
      kind: "letter",
      company: `${name} Corp`,
      role: "Designer",
      body: `Dear ${name} Corp, hire me.`,
      createdAt: AT,
      updatedAt: AT,
    },
    {
      id: crypto.randomUUID(),
      userId: user.id,
      kind: "outreach",
      company: "Sample Co",
      body: "A sample message that isn't theirs.",
      demo: true,
      createdAt: AT,
      updatedAt: AT,
    },
  ]);
  await db.insert(applications).values({
    id: crypto.randomUUID(),
    userId: user.id,
    company: `=${name} Labs`,
    role: "Engineer, platform",
    appliedAt: AT,
    statusChangedAt: AT,
    notes: 'Said "call me"',
    createdAt: AT,
    updatedAt: AT,
  });
  return user;
}

function request(headers: Record<string, string> = {}) {
  return new Request("https://otto.example/api/account/export", { headers });
}

beforeEach(async () => {
  currentUser.mockReset();
  currentUser.mockResolvedValue(null);
  limiter.mockReset();
  limiter.mockResolvedValue({ allowed: true, remaining: 4, retryAfterMs: 0 });
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/account/export", () => {
  it("asks for sign-in first", async () => {
    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(limiter).not.toHaveBeenCalled();
  });

  it("zips only the signed-in account's resumes, writing and applications", async () => {
    const ada = await person("ada");
    await person("grace");
    currentUser.mockResolvedValue(ada);
    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="otto-sensei-data-\d{4}-\d{2}-\d{2}\.zip"$/,
    );
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual([
      "README.txt",
      "applications.csv",
      "applications.json",
      "cover-letters/",
      "cover-letters/2026-11-03-ada-corp.txt",
      "resumes/",
      "resumes/ada-resume-2.json",
      "resumes/ada-resume.json",
    ]);
    const everything = (
      await Promise.all(names.map((name) => zip.file(name)?.async("string") ?? ""))
    ).join("\n");
    expect(everything).toContain("Dear ada Corp, hire me.");
    expect(everything).not.toMatch(/grace/i);
    expect(everything).not.toContain("A sample message");
    const csv = await zip.file("applications.csv")?.async("string");
    expect(csv).toContain(`'=ada Labs,"Engineer, platform",Applied,2026-11-03`);
    expect(csv).toContain('"Said ""call me"""');
  });

  it("adds the settings, portfolio, share links, saved jobs and feedback when there are any", async () => {
    const ada = await person("ada");
    const db = await getDb();
    await db.insert(userSettings).values({
      userId: ada.id,
      country: "PT",
      timeZone: "Europe/Lisbon",
      workUpdatedAt: AT,
      writingSignOff: "Cheers, Ada",
      writingUpdatedAt: AT,
      applyAnswers: { v: 1, noticePeriod: "2 weeks" },
      applyAnswersAt: AT,
      updatedAt: AT,
    });
    await db.insert(portfolios).values({
      id: crypto.randomUUID(),
      userId: ada.id,
      resumeId: "ada-1",
      slug: "ada-lovelace",
      snapshot: { id: "ada-1" } as unknown as Resume,
      content: { v: 1, pitch: "I make engines think." },
      createdAt: AT,
      updatedAt: AT,
    });
    await db.insert(shares).values({
      id: crypto.randomUUID(),
      userId: ada.id,
      resumeId: "ada-1",
      slug: "AbCdEfGhIjKl",
      snapshot: { id: "ada-1" } as unknown as Resume,
      views: 3,
      createdAt: AT,
      updatedAt: AT,
    });
    // A saved job that has since closed: the export reads what the save kept of it.
    await db.insert(savedJobs).values({
      userId: ada.id,
      jobId: crypto.randomUUID(),
      savedAt: AT,
      job: {
        source: "greenhouse",
        company: "Analytical Engines",
        title: "Engineer",
        location: "",
        remote: false,
        employmentType: null,
        seniority: "mid",
        postedAt: 1,
        url: "https://jobs.example/1",
        keywords: [],
      },
    });
    await db.insert(feedback).values({
      id: crypto.randomUUID(),
      userId: ada.id,
      kind: "idea",
      message: "A dark mode, please.",
      createdAt: AT,
    });
    currentUser.mockResolvedValue(ada);
    const zip = await JSZip.loadAsync(await (await GET(request())).arrayBuffer());
    const json = async (name: string) =>
      JSON.parse((await zip.file(name)?.async("string")) ?? "null");

    expect(await json("settings.json")).toMatchObject({
      country: "PT",
      timeZone: "Europe/Lisbon",
      writingSignOff: "Cheers, Ada",
      followUpDays: 7,
    });
    expect(await json("settings.json")).not.toHaveProperty("userId");
    expect(await json("settings.json")).not.toHaveProperty("applyAnswers");
    expect(await json("apply-answers.json")).toEqual({
      answers: { v: 1, noticePeriod: "2 weeks" },
      updatedAt: AT,
    });
    expect(await json("portfolio.json")).toMatchObject({
      address: "ada-lovelace",
      content: { pitch: "I make engines think." },
    });
    expect(await json("portfolio.json")).not.toHaveProperty("snapshot");
    expect(await json("share-links.json")).toEqual([
      expect.objectContaining({ address: "AbCdEfGhIjKl", views: 3, revokedAt: null }),
    ]);
    expect(await json("saved-jobs.json")).toEqual([
      {
        title: "Engineer",
        company: "Analytical Engines",
        location: "",
        url: "https://jobs.example/1",
        savedAt: AT,
      },
    ]);
    expect(await json("feedback.json")).toEqual([
      { kind: "idea", message: "A dark mode, please.", pagePath: null, createdAt: AT },
    ]);
    const readme = (await zip.file("README.txt")?.async("string")) ?? "";
    for (const name of [
      "settings.json",
      "portfolio.json",
      "share-links.json",
      "saved-jobs.json",
      "feedback.json",
    ]) {
      expect(readme).toContain(name);
    }
  });

  it("streams every application up to Max's number, past Vercel's 4.5 MB limit on whole responses", async () => {
    const ada = await person("ada");
    currentUser.mockResolvedValue(ada);
    const noise = (bytes: number) => randomBytes(bytes).toString("base64url").slice(0, bytes);
    const db = await getDb();
    const rows = Array.from({ length: MAX_APPLICATIONS_PER_USER - 1 }, (_, i) => ({
      id: crypto.randomUUID(),
      userId: ada.id,
      company: noise(200),
      role: noise(200),
      resumeTitle: noise(200),
      jobUrl: `https://jobs.example.com/${noise(1_000)}`,
      notes: noise(500),
      appliedAt: AT - i,
      statusChangedAt: AT,
      createdAt: AT,
      updatedAt: AT,
    }));
    for (let i = 0; i < rows.length; i += 250) {
      await db.insert(applications).values(rows.slice(i, i + 250));
    }

    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(ReadableStream);
    expect(res.headers.get("content-length")).toBeNull();
    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(4_500_000);
    const zip = await JSZip.loadAsync(bytes);
    const tracked = JSON.parse((await zip.file("applications.json")?.async("string")) ?? "[]");
    expect(tracked).toHaveLength(MAX_APPLICATIONS_PER_USER);
  });

  it("refuses a request from another website", async () => {
    currentUser.mockResolvedValue(await person("ada"));
    const res = await GET(request({ "sec-fetch-site": "cross-site" }));

    expect(res.status).toBe(403);
    expect(currentUser).not.toHaveBeenCalled();
  });

  it("allows a few downloads an hour", async () => {
    const ada = await person("ada");
    currentUser.mockResolvedValue(ada);
    limiter.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 600_000 });
    const res = await GET(request());

    expect(res.status).toBe(429);
    expect(limiter).toHaveBeenCalledWith(`export:user:${ada.id}`, 5, 60 * 60 * 1000);
  });
});
