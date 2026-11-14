import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage } from "@/db/schema";
import type { ApiErrorBody, FixRequestBody, FixResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { AI_TOKENS, getUsage, getUsageState, monthKey, TRIAL_PERIOD_KEY } from "@/lib/usage";
import { POST as fixRoute } from "./fix/route";
import { claimAiRead } from "./import/ai-reads";
import { takeAccountUnit } from "./metered-free";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/moderation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/moderation")>()),
  checkContent: async () => ({ allowed: true, categories: [] }),
}));

const NOW = Date.UTC(2026, 10, 7, 12);
const DEC_1 = Date.UTC(2026, 11, 1);
const TRIAL_END = Date.UTC(2026, 10, 10, 12);
const BODY: FixRequestBody = {
  bullet: "Responsible for managing the company blog",
  role: { title: "Marketing Manager", company: "Northwind" },
};
const ANSWER = JSON.stringify({
  issues: ["Says what you were given, not what you did"],
  questions: [],
  suggestion: "Ran the company blog",
});

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

function openRouterReplies(body: Record<string, unknown>) {
  fetchMock.mockResolvedValueOnce(Response.json(body));
}

function completion(usageReport: Record<string, number>, choice: Record<string, unknown> = {}) {
  return {
    choices: [{ finish_reason: "stop", message: { content: ANSWER }, ...choice }],
    usage: usageReport,
  };
}

const fix = () => fixRoute(jsonRequest("/api/fix", BODY));

async function storedTokens(user: SessionUser, period: string): Promise<number | null> {
  const [row] = await (
    await getDb()
  )
    .select({ count: usage.count })
    .from(usage)
    .where(and(eq(usage.subject, user.id), eq(usage.feature, AI_TOKENS), eq(usage.period, period)))
    .limit(1);
  return row?.count ?? null;
}

async function useTokens(user: SessionUser, period: string, count: number) {
  await (
    await getDb()
  )
    .insert(usage)
    .values({ subject: user.id, feature: AI_TOKENS, period, count });
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

function withAIKey() {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  resetEnvForTests();
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("recording", () => {
  it("adds the tokens OpenRouter billed for each call to the account's month", async () => {
    withAIKey();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    openRouterReplies(
      completion({ prompt_tokens: 1_200, completion_tokens: 300, total_tokens: 1_500 }),
    );
    openRouterReplies(completion({ prompt_tokens: 1_000, completion_tokens: 250 }));

    expect((await fix()).status).toBe(200);
    const second = (await (await fix()).json()) as FixResponse;
    expect(second.demo).toBe(false);
    expect(await storedTokens(user, monthKey(NOW))).toBe(2_750);
    expect((await getUsageState(user)).aiBudget).toEqual({
      used: 2_750,
      limit: AI_TOKEN_BUDGETS.pro,
    });
  });

  it("counts a failed call that was still billed", async () => {
    withAIKey();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    openRouterReplies(
      completion({ prompt_tokens: 900, completion_tokens: 4_000 }, { finish_reason: "length" }),
    );

    expect((await fix()).status).toBe(502);
    expect(await storedTokens(user, monthKey(NOW))).toBe(4_900);
  });

  it("records nothing in demo mode, with no AI key", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    const body = (await (await fix()).json()) as FixResponse;
    expect(body.demo).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await storedTokens(user, monthKey(NOW))).toBeNull();
  });
});

describe("refusing at the budget", () => {
  it("answers 429 limit_reached with the reset day, without taking a fix or calling the AI", async () => {
    withAIKey();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useTokens(user, monthKey(NOW), AI_TOKEN_BUDGETS.pro);

    const res = await fix();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String((DEC_1 - NOW) / 1000));
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: "You've used this month's AI budget. It resets on Dec 1.",
      reason: "ai_budget",
    });
    expect((await getUsage(user)).fix.used).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still turns away a bad request first, and the burst limit before both", async () => {
    withAIKey();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useTokens(user, monthKey(NOW), AI_TOKEN_BUDGETS.pro);
    const bad = () => fixRoute(jsonRequest("/api/fix", { bullet: 42 }));
    expect((await bad()).status).toBe(400);
    expect((await errorOf(await fix())).reason).toBe("ai_budget");
    for (let i = 0; i < 30; i++) await fix();
    expect((await errorOf(await bad())).code).toBe("rate_limited");
    expect((await errorOf(await fix())).code).toBe("rate_limited");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a call that starts just under the budget finish over it", async () => {
    withAIKey();
    const user = await setPlan(await signInAs("max@example.com"), "max");
    await useTokens(user, monthKey(NOW), AI_TOKEN_BUDGETS.max - 1);
    openRouterReplies(completion({ total_tokens: 2_000 }));

    expect((await fix()).status).toBe(200);
    expect(await storedTokens(user, monthKey(NOW))).toBe(AI_TOKEN_BUDGETS.max + 1_999);
    expect((await fix()).status).toBe(429);
  });

  it("tells the trial when its full allowance starts", async () => {
    const user = await setPlan(await signInAs("trial@example.com"), "trial", TRIAL_END);
    await useTokens(user, TRIAL_PERIOD_KEY, AI_TOKEN_BUDGETS.trial);

    const res = await fix();
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: "You've used this trial's AI budget. Your full allowance starts on Nov 10.",
      reason: "ai_budget",
    });
  });

  it("gives Free no AI budget: its line fixes are capped by count alone", async () => {
    const user = await signInAs("free@example.com");
    expect((await fix()).status).toBe(200);
    expect((await getUsageState(user)).aiBudget).toBeNull();
  });

  it("refuses drafts and GitHub drafts the same way, without taking a unit", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useTokens(user, monthKey(NOW), AI_TOKEN_BUDGETS.pro);

    for (const feature of ["draft", "github"] as const) {
      const unit = await takeAccountUnit(user, feature, NOW);
      if (!(unit instanceof Response)) throw new Error("expected a refusal");
      expect(unit.status).toBe(429);
      expect((await errorOf(unit)).reason).toBe("ai_budget");
      expect((await getUsage(user))[feature].used).toBe(0);
    }
  });

  it("sends uploads to the basic reader instead, without taking an AI read", async () => {
    withAIKey();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    expect(await claimAiRead(user, NOW)).toMatchObject({ useAI: true });
    await useTokens(user, monthKey(NOW), AI_TOKEN_BUDGETS.pro);

    expect(await claimAiRead(user, NOW)).toMatchObject({ useAI: false, limited: true });
    expect((await getUsage(user)).import.used).toBe(1);
  });
});
