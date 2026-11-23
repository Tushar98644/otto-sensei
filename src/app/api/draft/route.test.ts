import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS, PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage } from "@/db/schema";
import { draftResume } from "@/lib/ai/draft";
import type { ApiErrorBody, DraftRequestBody, DraftResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { AI_TOKENS, getUsage, monthKey, TRIAL_PERIOD_KEY } from "@/lib/usage";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/draft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/draft")>();
  return { ...actual, draftResume: vi.fn(actual.draftResume) };
});

const BODY: DraftRequestBody = {
  targetRole: "Data Analyst",
  jobs: [
    {
      company: "Contoso",
      title: "Intern",
      startDate: "Jun 2025",
      endDate: "Aug 2025",
      notes: ["built 3 dashboards"],
    },
  ],
};

beforeEach(async () => {
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => resetEnvForTests());

describe("POST /api/draft", () => {
  it("is part of Pro: signed out or on Free it answers 402 upgrade_required", async () => {
    for (const signIn of [async () => null, () => signInAs("free@example.com")]) {
      await signIn();
      const res = await POST(jsonRequest("/api/draft", BODY));
      expect(res.status).toBe(402);
      expect(((await res.json()) as ApiErrorBody).error).toEqual({
        code: "upgrade_required",
        message: "Build with Otto comes with Pro. Try Pro for 7 days.",
      });
    }
  });

  it("drafts on the trial", async () => {
    await signInOnTrial("maya@example.com");
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DraftResponse;
    expect(body.usedAI).toBe(false);
    expect(body.resume.experience[0]?.bullets[0]?.text).toBe("Built 3 dashboards");
  });

  it("asks for at least one thing the person did", async () => {
    const res = await POST(
      jsonRequest("/api/draft", { ...BODY, jobs: [{ ...BODY.jobs[0], notes: [" "] }] }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("bad_request");
  });

  it("refuses requests that aren't JSON", async () => {
    const res = await POST(jsonRequest("/api/draft", BODY, { contentType: "text/plain" }));
    expect(res.status).toBe(415);
  });

  it("spends the trial's drafts, and says when the full allowance starts", async () => {
    const trialEnd = Date.UTC(2099, 0, 15, 12);
    const maya = await signInOnTrial("maya@example.com", trialEnd);
    vi.mocked(draftResume).mockImplementation(async (body, now) => {
      const { draftResume: real } =
        await vi.importActual<typeof import("@/lib/ai/draft")>("@/lib/ai/draft");
      return { ...(await real(body, now)), usedAI: true };
    });
    for (let i = 0; i < PRO_TRIAL.limits.draft; i++) {
      expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    }
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(429);
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "limit_reached",
      message: `You've used this trial's 3 Build with Otto drafts. Pro has ${PLANS.pro.limits.draft} a month. Your full allowance starts on Jan 15.`,
    });
    expect((await getUsage(maya)).draft).toEqual({ used: 3, limit: 3 });
    vi.mocked(draftResume).mockReset();
  });

  it("gives the draft back when the AI didn't write it", async () => {
    const maya = await signInOnTrial("maya@example.com");
    expect((await POST(jsonRequest("/api/draft", BODY))).status).toBe(200);
    expect((await getUsage(maya)).draft.used).toBe(0);
  });
});

describe("POST /api/draft guards and failures", () => {
  const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);
  const TRIAL_END = Date.UTC(2099, 0, 15, 12);
  const CROSS_SITE: Record<string, string>[] = [{ "sec-fetch-site": "cross-site" }, { origin: "https://evil.example" }];

  const drafts = () => vi.mocked(draftResume).mock.calls.length;
  const draftsUsed = async (user: SessionUser) => (await getUsage(user, NOW)).draft.used;

  async function wroteByAI(summary: string): Promise<void> {
    const { draftResume: real } = await vi.importActual<typeof import("@/lib/ai/draft")>("@/lib/ai/draft");
    vi.mocked(draftResume).mockImplementationOnce(async (body, now) => {
      const { resume } = await real(body, now);
      return { resume: { ...resume, summary }, usedAI: true };
    });
  }

  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("refuses a request sent from another website before reading or counting anything", async () => {
    const maya = await signInOnTrial("maya@example.com", TRIAL_END);
    const before = drafts();
    for (const headers of CROSS_SITE) {
      const req = jsonRequest("/api/draft", BODY);
      for (const [name, value] of Object.entries(headers)) req.headers.set(name, value);
      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(((await res.json()) as ApiErrorBody).error.code).toBe("forbidden");
    }
    expect(drafts()).toBe(before);
    expect(await draftsUsed(maya)).toBe(0);
  });

  it("says what's wrong with the request before checking the plan", async () => {
    const broken = await POST(
      new Request("http://localhost/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{\"targetRole\":",
      }),
    );
    expect(broken.status).toBe(400);
    expect(((await broken.json()) as ApiErrorBody).error).toEqual({
      code: "bad_request",
      message: "Request body must be JSON.",
    });

    await signInAs("free@example.com");
    const empty = await POST(jsonRequest("/api/draft", { ...BODY, jobs: [{ ...BODY.jobs[0], notes: ["", "  "] }] }));
    expect(empty.status).toBe(400);
    expect(((await empty.json()) as ApiErrorBody).error).toEqual({
      code: "bad_request",
      message: "jobs.0.notes: Add at least one thing you did.",
    });
  });

  it("answers 500 without the cause and gives the draft back when drafting breaks", async () => {
    const maya = await signInOnTrial("maya@example.com", TRIAL_END);
    vi.mocked(draftResume).mockRejectedValueOnce(new Error("connection reset by peer"));
    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(500);
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "server_error",
      message: "Otto couldn't write the draft. Please try again.",
    });
    expect(await draftsUsed(maya)).toBe(0);
  });

  it("stops at the AI budget before drafting or counting", async () => {
    const maya = await signInOnTrial("maya@example.com", TRIAL_END);
    await (await getDb())
      .insert(usage)
      .values({ subject: maya.id, feature: AI_TOKENS, period: TRIAL_PERIOD_KEY, count: AI_TOKEN_BUDGETS.trial });
    const before = drafts();

    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "limit_reached",
      message: "You've used this trial's AI budget. Your full allowance starts on Jan 15.",
      reason: "ai_budget",
    });
    expect(drafts()).toBe(before);
    expect(await draftsUsed(maya)).toBe(0);
  });

  it("keeps one of Pro's drafts counted and returns what Otto wrote", async () => {
    const pro = await setPlan(await signInAs("pro@example.com"), "pro");
    await wroteByAI("Data analyst who builds dashboards.");

    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DraftResponse;
    expect(body.usedAI).toBe(true);
    expect(body.resume.summary).toBe("Data analyst who builds dashboards.");
    expect(body.resume.experience[0]).toMatchObject({ company: "Contoso", title: "Intern" });
    expect((await getUsage(pro, NOW)).draft).toEqual({ used: 1, limit: PLANS.pro.limits.draft });
  });

  it("tells Pro at its monthly limit what Max gives, and when to retry", async () => {
    const pro = await setPlan(await signInAs("pro@example.com"), "pro");
    await (await getDb())
      .insert(usage)
      .values({ subject: pro.id, feature: "draft", period: monthKey(NOW), count: PLANS.pro.limits.draft });
    const before = drafts();

    const res = await POST(jsonRequest("/api/draft", BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String(Math.ceil((Date.UTC(2026, 11, 1) - NOW) / 1000)));
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "limit_reached",
      message: `You've used this month's ${PLANS.pro.limits.draft} Build with Otto drafts. Max has ${PLANS.max.limits.draft} a month.`,
    });
    expect(drafts()).toBe(before);
  });
});
