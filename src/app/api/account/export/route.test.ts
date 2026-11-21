import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications, resumes, writings } from "@/db/schema";
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
