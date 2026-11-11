import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, aiTokenBudget } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage } from "@/db/schema";
import { noteTokens } from "@/lib/ai/token-meter";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import {
  AI_TOKENS,
  addMonths,
  carryUsageOver,
  cycleKey,
  getUsageState,
  monthKey,
  TRIAL_PERIOD_KEY,
  weekKey,
} from "@/lib/usage";
import { checkAiBudget, recordAiTokens, spendAiTokens } from "./ai-budget";

const NOV = Date.UTC(2026, 10, 15, 12);
const DEC = Date.UTC(2026, 11, 1, 0, 0, 1);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
// A monthly plan's billing period as Creem reports it: Nov 10 to Dec 10, then to Jan 10.
const P_START = Date.UTC(2026, 10, 10, 9, 30);
const P_END = Date.UTC(2026, 11, 10, 9, 30);
const P_NEXT = Date.UTC(2027, 0, 10, 9, 30);
const TRIAL_END = Date.UTC(2026, 10, 17, 12);

let free: SessionUser;
let pro: SessionUser;
let trial: SessionUser;

async function storedTokens(user: SessionUser, period: string): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .select({ count: usage.count })
    .from(usage)
    .where(and(eq(usage.subject, user.id), eq(usage.feature, AI_TOKENS), eq(usage.period, period)))
    .limit(1);
  return row?.count ?? null;
}

beforeEach(async () => {
  await resetDb();
  free = await createUser("free@example.com");
  pro = {
    ...(await createUser("pro@example.com")),
    plan: "pro",
    planInterval: "month",
    planRenewsAt: P_END,
    planPeriodStartsAt: P_START,
    planPeriodEndsAt: P_END,
  };
  trial = {
    ...(await createUser("trial@example.com")),
    plan: "pro",
    planInterval: "month",
    planRenewsAt: TRIAL_END,
    trialEndsAt: TRIAL_END,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("aiTokenBudget", () => {
  it("is 5M on Pro, 10M on Max, half a million for the whole trial, and none on Free", () => {
    expect(AI_TOKEN_BUDGETS).toEqual({ pro: 5_000_000, max: 10_000_000, trial: 500_000 });
    expect(aiTokenBudget("pro", "month")).toBe(5_000_000);
    expect(aiTokenBudget("max", "month")).toBe(10_000_000);
    expect(aiTokenBudget("pro", "trial")).toBe(500_000);
    expect(aiTokenBudget("max", "week")).toBe(2_500_000);
    expect(aiTokenBudget("free", "month")).toBeNull();
  });
});

describe("recordAiTokens", () => {
  it("adds billed tokens to the billing month's row", async () => {
    await recordAiTokens(pro, 1_500, NOV);
    await recordAiTokens(pro, 2_250, NOV);
    expect(await storedTokens(pro, cycleKey(P_START))).toBe(3_750);
    expect((await getUsageState(pro, NOV)).aiBudget).toEqual({ used: 3_750, limit: 5_000_000 });
  });

  it("keeps the trial on its own fixed row", async () => {
    await recordAiTokens(trial, 9_000, NOV);
    expect(await storedTokens(trial, TRIAL_PERIOD_KEY)).toBe(9_000);
    expect((await getUsageState(trial, NOV)).aiBudget).toEqual({ used: 9_000, limit: 500_000 });
  });

  it("leaves Free untouched, and ignores nothing billed", async () => {
    await recordAiTokens(free, 1_000, NOV);
    await recordAiTokens(pro, 0, NOV);
    const db = await getDb();
    expect(await db.select().from(usage).where(eq(usage.feature, AI_TOKENS))).toEqual([]);
    expect((await getUsageState(free, NOV)).aiBudget).toBeNull();
    expect(await checkAiBudget(free, NOV)).toMatchObject({ allowed: true });
  });

  it("puts a weekly plan's tokens on its week, with a quarter budget, and on the calendar month", async () => {
    const renewsAt = NOV + 2 * 24 * HOUR;
    const weekly: SessionUser = { ...pro, planInterval: "week", planRenewsAt: renewsAt };
    await recordAiTokens(weekly, 4_000, NOV);
    expect(await storedTokens(weekly, weekKey(renewsAt))).toBe(4_000);
    expect(await storedTokens(weekly, monthKey(NOV))).toBe(4_000);
    expect((await getUsageState(weekly, NOV)).aiBudget).toEqual({ used: 4_000, limit: 1_250_000 });
  });
});

describe("checkAiBudget", () => {
  it("allows calls under the budget and refuses once it's reached, never reporting over 100%", async () => {
    await recordAiTokens(pro, AI_TOKEN_BUDGETS.pro - 1, NOV);
    expect(await checkAiBudget(pro, NOV)).toEqual({
      allowed: true,
      period: { kind: "month", resetsAt: P_END, renews: true },
    });
    // The call that started just under may end well over.
    await recordAiTokens(pro, 12_000, NOV);
    expect((await checkAiBudget(pro, NOV)).allowed).toBe(false);
    expect((await getUsageState(pro, NOV)).aiBudget).toEqual({ used: 5_000_000, limit: 5_000_000 });
  });

  it("starts over at the period boundary, not on the 1st", async () => {
    await recordAiTokens(pro, AI_TOKEN_BUDGETS.pro, NOV);
    expect((await checkAiBudget(pro, DEC)).allowed).toBe(false);
    expect((await checkAiBudget(pro, P_END - MINUTE)).allowed).toBe(false);
    const renewed = {
      ...pro,
      planPeriodStartsAt: P_END,
      planPeriodEndsAt: P_NEXT,
      planRenewsAt: P_NEXT,
    };
    expect((await checkAiBudget(renewed, P_END + MINUTE)).allowed).toBe(true);
    expect((await getUsageState(renewed, P_END + MINUTE)).aiBudget).toEqual({
      used: 0,
      limit: 5_000_000,
    });
  });

  it("gives the trial half a million for the whole trial, then Pro's full budget", async () => {
    await recordAiTokens(trial, AI_TOKEN_BUDGETS.trial, NOV);
    expect(await checkAiBudget(trial, NOV)).toEqual({
      allowed: false,
      period: { kind: "trial", resetsAt: TRIAL_END },
    });
    // Neither a month turning nor a moved end date opens a second one.
    expect((await checkAiBudget({ ...trial, trialEndsAt: TRIAL_END + HOUR }, DEC)).allowed).toBe(
      false,
    );
    const paid = { ...trial, trialEndsAt: null, planRenewsAt: addMonths(TRIAL_END, 1) };
    expect((await checkAiBudget(paid, TRIAL_END + MINUTE)).allowed).toBe(true);
  });

  it("carries the count over when Pro becomes Max partway through the month", async () => {
    await recordAiTokens(pro, 4_000_000, NOV);
    const max: SessionUser = {
      ...pro,
      plan: "max",
      planPeriodStartsAt: NOV - HOUR,
      planPeriodEndsAt: addMonths(NOV - HOUR, 1),
      planRenewsAt: addMonths(NOV - HOUR, 1),
    };
    await carryUsageOver(await getDb(), pro, max, NOV);
    expect((await getUsageState(max, NOV)).aiBudget).toEqual({
      used: 4_000_000,
      limit: 10_000_000,
    });
  });
});

describe("spendAiTokens", () => {
  it("charges what the work was billed, also when it fails", async () => {
    const result = await spendAiTokens(pro, NOV, async () => {
      noteTokens(1_200);
      noteTokens(800);
      return "done";
    });
    expect(result).toBe("done");
    expect(await storedTokens(pro, cycleKey(P_START))).toBe(2_000);

    const failing = spendAiTokens(pro, NOV, async () => {
      noteTokens(3_000);
      throw new Error("cut off");
    });
    await expect(failing).rejects.toThrow("cut off");
    expect(await storedTokens(pro, cycleKey(P_START))).toBe(5_000);
  });

  it("records nothing when no AI call reported tokens, as in demo mode", async () => {
    await expect(spendAiTokens(pro, NOV, async () => "demo")).resolves.toBe("demo");
    expect(await storedTokens(pro, cycleKey(P_START))).toBeNull();
  });

  it("logs a charge it couldn't save instead of failing the request", async () => {
    const error = vi.spyOn(log, "error").mockImplementation(() => {});
    const gone: SessionUser = { ...pro, id: crypto.randomUUID() };
    const result = spendAiTokens(gone, NOV, async () => {
      noteTokens(100);
      return "kept";
    });
    await expect(result).resolves.toBe("kept");
    expect(error).toHaveBeenCalledWith("ai_budget.record_failed", expect.anything(), {
      userId: gone.id,
      tokens: 100,
    });
  });
});
