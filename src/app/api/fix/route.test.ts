import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS, PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage, users } from "@/db/schema";
import { fixBullet } from "@/lib/ai/fix";
import { AIError, type FixResult } from "@/lib/ai/types";
import type { ApiErrorBody, FixRequestBody, FixResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { addMonths, AI_TOKENS, consumeUsage, cycleKey, getUsage, monthKey, TRIAL_PERIOD_KEY } from "@/lib/usage";
import { PASS_TTL_MS, PASS_USES } from "@/lib/usage-passes";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/fix", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/fix")>();
  return { ...actual, fixBullet: vi.fn(actual.fixBullet) };
});

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);
const TRIAL_END = Date.UTC(2026, 10, 9, 12);

const BODY: FixRequestBody = {
  bullet: "Responsible for managing the company blog",
  role: { title: "Marketing Manager", company: "Northwind" },
};

const fix = (body: unknown = BODY) => POST(jsonRequest("/api/fix", body));

const answered = (body: FixRequestBody = BODY): FixRequestBody => ({
  ...body,
  answers: [{ question: "Roughly how many people read it?", answer: "40,000 readers a month" }],
});

async function signIn(email = "ada@example.com"): Promise<SessionUser> {
  return signInOnTrial(email, TRIAL_END);
}

async function makePro(user: SessionUser): Promise<SessionUser> {
  const db = await getDb();
  await db.update(users).set({ plan: "pro", trialEndsAt: null }).where(eq(users.id, user.id));
  return { ...user, plan: "pro", trialEndsAt: null };
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/fix", () => {
  it("needs a signed-in user", async () => {
    const res = await fix();
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({ code: "unauthorized", message: "Sign in to let Otto fix this line." });
  });

  it("refuses bodies that aren't JSON", async () => {
    await signIn();
    const res = await POST(jsonRequest("/api/fix", BODY, { contentType: "text/plain" }));
    expect(res.status).toBe(415);
  });

  it("gives Free 3 fixes a month, then says Pro has more without calling the AI", async () => {
    const user = await signInAs("free@example.com");
    for (let used = 1; used <= PLANS.free.limits.fix; used++) {
      const res = await fix();
      expect(res.status).toBe(200);
      expect(((await res.json()) as FixResponse).usage.fix).toEqual({ used, limit: 3 });
    }
    const calls = vi.mocked(fixBullet).mock.calls.length;

    const res = await fix();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String((Date.UTC(2026, 11, 1) - Date.UTC(2026, 10, 7, 12)) / 1000));
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: `You've used this month's 3 line fixes. Pro has ${PLANS.pro.limits.fix} a month.`,
    });
    expect(vi.mocked(fixBullet).mock.calls).toHaveLength(calls);
    expect((await getUsage(user)).fix).toEqual({ used: 3, limit: 3 });

    vi.setSystemTime(Date.UTC(2026, 11, 1, 0, 0, 1));
    expect((await fix()).status).toBe(200);
  });

  it("adds invite extras to Free's 3 fixes", async () => {
    const user = await signInAs("free@example.com");
    const db = await getDb();
    await db.insert(usage).values({ subject: user.id, feature: "fix", period: monthKey(NOW), bonus: 10 });
    for (let i = 0; i < PLANS.free.limits.fix + 10; i++) expect((await fix()).status).toBe(200);
    expect((await fix()).status).toBe(429);
    expect((await getUsage(user)).fix).toEqual({ used: 13, limit: 13 });
  });

  it("returns Otto's demo fix and the allowance after counting it", async () => {
    const user = await signIn();
    const first = await fix();
    expect(first.status).toBe(200);
    const body = (await first.json()) as FixResponse;

    expect(body.ok).toBe(true);
    expect(body.result.suggestion).toMatch(/\w/);
    expect(Array.isArray(body.result.issues)).toBe(true);
    expect(Array.isArray(body.result.questions)).toBe(true);
    expect(typeof body.result.needsAnswers).toBe("boolean");
    expect(body.usage.fix).toEqual({ used: 1, limit: PRO_TRIAL.limits.fix });
    expect(body.demo).toBe(true);

    const second = (await (await fix()).json()) as FixResponse;
    expect(second.usage.fix.used).toBe(2);
    expect((await getUsage(user)).fix.used).toBe(2);
  });

  it("marks the result as real, not demo, when an AI key is set", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    resetEnvForTests();
    await signIn();
    const result: FixResult = {
      issues: [],
      questions: [],
      suggestion: "Grew the company blog to 40,000 monthly readers",
      needsAnswers: false,
    };
    vi.mocked(fixBullet).mockResolvedValueOnce(result);

    const body = (await (await fix()).json()) as FixResponse;
    expect(body.result).toEqual(result);
    expect(body.demo).toBe(false);
  });

  it("rejects an invalid line without spending a fix", async () => {
    const user = await signIn();
    const res = await fix({ ...BODY, bullet: "   " });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
    expect((await getUsage(user)).fix.used).toBe(0);
  });

  it("answers 429 limit_reached once the trial's fixes are used, until the trial ends", async () => {
    const user = await signIn();
    for (let i = 0; i < PRO_TRIAL.limits.fix; i++) await consumeUsage(user, "fix");

    const res = await fix();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String((TRIAL_END - Date.UTC(2026, 10, 7, 12)) / 1000));
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: `You've used this trial's ${PRO_TRIAL.limits.fix} line fixes. Pro has ${PLANS.pro.limits.fix} a month. Your full allowance starts on Nov 9.`,
    });
    expect((await getUsage(user)).fix.used).toBe(PRO_TRIAL.limits.fix);
  });

  it("gives the fix back when the AI call fails", async () => {
    const user = await signIn();

    vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("unavailable", "Claude is down"));
    const down = await fix();
    expect(down.status).toBe(502);
    expect((await errorOf(down)).code).toBe("ai_unavailable");

    vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("refused", "declined"));
    const refused = await fix();
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).code).toBe("ai_refused");

    vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("too_long", "too long"));
    expect((await fix()).status).toBe(400);

    vi.mocked(fixBullet).mockRejectedValueOnce(new Error("bug"));
    const broken = await fix();
    expect(broken.status).toBe(500);
    expect((await errorOf(broken)).message).not.toContain("bug");

    expect((await getUsage(user)).fix.used).toBe(0);
  });

  it("stops giving back runs the model may have billed after a few a day", async () => {
    const user = await signIn();
    const messages: string[] = [];
    for (let i = 0; i < 5; i++) {
      vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("invalid_output", "cut off"));
      const res = await fix();
      expect(res.status).toBe(502);
      messages.push((await errorOf(res)).message);
    }
    expect((await getUsage(user)).fix.used).toBe(2);
    expect(messages[0]).toContain("It won't count against your allowance.");
    expect(messages[4]).not.toContain("won't count");

    vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("refused", "declined"));
    expect((await fix()).status).toBe(422);
    expect((await getUsage(user)).fix.used).toBe(3);

    vi.setSystemTime(NOW + 24 * 60 * 60 * 1000);
    vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("unavailable", "timed out"));
    await fix();
    expect((await getUsage(user)).fix.used).toBe(3);
  });

  it("always gives back failures that never reached the model", async () => {
    const user = await signIn();
    for (let i = 0; i < 5; i++) {
      vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("rate_limited", "provider busy"));
      const res = await fix();
      expect(res.status).toBe(502);
      expect((await errorOf(res)).message).toContain("It won't count against your allowance.");
      vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("too_long", "too long"));
      expect((await fix()).status).toBe(400);
    }
    expect((await getUsage(user)).fix.used).toBe(0);
  });

  it("slows down a burst of calls even on Pro", async () => {
    await makePro(await signIn());
    for (let i = 0; i < 30; i++) expect((await fix()).status).toBe(200);
    const res = await fix();
    expect(res.status).toBe(429);
    expect((await errorOf(res)).code).toBe("rate_limited");
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("tells Pro accounts at their limit what Max gives", async () => {
    const user = await makePro(await signIn());
    const db = await getDb();
    await db
      .insert(usage)
      .values({ subject: user.id, feature: "fix", period: monthKey(NOW), count: PLANS.pro.limits.fix });
    const res = await fix();
    expect(res.status).toBe(429);
    expect((await errorOf(res)).message).toBe(
      `You've used this month's ${PLANS.pro.limits.fix} line fixes. Max has ${PLANS.max.limits.fix} a month.`,
    );
  });

  it("stops yearly Pro at the month's limit, quoting monthly Max, until its month of the year ends", async () => {
    const user = await signInAs();
    const yearStart = Date.UTC(2026, 0, 10, 9, 30);
    const monthStart = Date.UTC(2026, 9, 10, 9, 30);
    const monthEnd = Date.UTC(2026, 10, 10, 9, 30);
    const db = await getDb();
    await db
      .update(users)
      .set({
        plan: "pro",
        planInterval: "year",
        planRenewsAt: addMonths(yearStart, 12),
        planPeriodStartsAt: yearStart,
        planPeriodEndsAt: addMonths(yearStart, 12),
        trialEndsAt: null,
      })
      .where(eq(users.id, user.id));
    await db
      .insert(usage)
      .values({ subject: user.id, feature: "fix", period: cycleKey(monthStart), count: PLANS.pro.limits.fix });
    const res = await fix();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String((monthEnd - Date.UTC(2026, 10, 7, 12)) / 1000));
    expect((await errorOf(res)).message).toBe(
      `You've used this month's ${PLANS.pro.limits.fix} line fixes. Max has ${PLANS.max.limits.fix} a month.`,
    );

    vi.setSystemTime(monthEnd);
    expect((await fix()).status).toBe(200);
  });
});

describe("POST /api/fix answers to Otto's questions", () => {
  const OTHER_LINE: FixRequestBody = { ...BODY, bullet: "Helped with the newsletter" };

  async function usedFixes(user: SessionUser): Promise<number> {
    return (await getUsage(user)).fix.used;
  }

  it("charges the first call and lets the answers ride on it, on Free too", async () => {
    const user = await signInAs("free@example.com");
    const calls = vi.mocked(fixBullet).mock.calls.length;
    const first = (await (await fix()).json()) as FixResponse;
    expect(first.result.questions.length).toBeGreaterThan(0);
    expect(first.usage.fix).toEqual({ used: 1, limit: 3 });

    const follow = await fix(answered());
    expect(follow.status).toBe(200);
    expect(((await follow.json()) as FixResponse).usage.fix).toEqual({ used: 1, limit: 3 });
    expect(await usedFixes(user)).toBe(1);
    expect(vi.mocked(fixBullet).mock.calls).toHaveLength(calls + 2);
  });

  it("charges answers no paid call opened: another line, another role or a first call with no questions", async () => {
    const user = await signIn();
    expect((await fix(answered())).status).toBe(200);
    expect(await usedFixes(user)).toBe(1);

    await fix();
    expect(await usedFixes(user)).toBe(2);
    await fix(answered(OTHER_LINE));
    await fix(answered({ ...BODY, role: { title: "Marketing Manager", company: "Contoso" } }));
    expect(await usedFixes(user)).toBe(4);

    vi.mocked(fixBullet).mockResolvedValueOnce({ issues: [], questions: [], suggestion: "Ran it", needsAnswers: false });
    await fix(OTHER_LINE);
    await fix(answered(OTHER_LINE));
    expect(await usedFixes(user)).toBe(6);
  });

  it("charges answers once the pass has expired", async () => {
    const user = await signIn();
    await fix();
    vi.setSystemTime(NOW + PASS_TTL_MS + 1);
    await fix(answered());
    expect(await usedFixes(user)).toBe(2);
  });

  it("never lets one account's paid line cover another account's answers", async () => {
    const ada = await signIn("ada@example.com");
    await fix();
    const bob = await signIn("bob@example.com");
    expect((await fix(answered())).status).toBe(200);
    expect(await usedFixes(bob)).toBe(1);
    expect(await usedFixes(ada)).toBe(1);
  });

  it("still enforces the limits: a few answers per line, then a unit, and none past the limit", async () => {
    const user = await signInAs("free@example.com");
    await fix();
    await fix(OTHER_LINE);
    await fix({ ...BODY, bullet: "Worked on the podcast" });
    expect(await usedFixes(user)).toBe(3);

    for (let i = 0; i < PASS_USES; i++) expect((await fix(answered())).status).toBe(200);
    expect(await usedFixes(user)).toBe(3);
    const calls = vi.mocked(fixBullet).mock.calls.length;

    const spent = await fix(answered());
    expect(spent.status).toBe(429);
    expect((await errorOf(spent)).code).toBe("limit_reached");
    expect((await fix({ ...BODY, bullet: "Ran the events calendar" })).status).toBe(429);
    expect(vi.mocked(fixBullet).mock.calls).toHaveLength(calls);
    expect((await fix(answered(OTHER_LINE))).status).toBe(200);
  });

  it("still stops answers at the AI budget", async () => {
    const user = await signIn();
    await fix();
    const db = await getDb();
    await db
      .insert(usage)
      .values({ subject: user.id, feature: AI_TOKENS, period: TRIAL_PERIOD_KEY, count: AI_TOKEN_BUDGETS.trial });
    const res = await fix(answered());
    expect(res.status).toBe(429);
    expect((await errorOf(res)).reason).toBe("ai_budget");
  });

  it("gives the answer back to the pass, not the allowance, when its AI call fails", async () => {
    const user = await signIn();
    await fix();
    vi.mocked(fixBullet).mockRejectedValueOnce(new AIError("unavailable", "timed out"));
    const down = await fix(answered());
    expect(down.status).toBe(502);
    expect((await errorOf(down)).message).toContain("It won't count against your allowance.");
    expect(await usedFixes(user)).toBe(1);

    for (let i = 0; i < PASS_USES; i++) expect((await fix(answered())).status).toBe(200);
    expect(await usedFixes(user)).toBe(1);
    await fix(answered());
    expect(await usedFixes(user)).toBe(2);
  });
});
