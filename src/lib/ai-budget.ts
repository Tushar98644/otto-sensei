import { and, eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { aiTokenBudget, isPaidPlan, type UsagePeriod } from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { usage } from "@/db/schema";
import { metered } from "@/lib/ai/token-meter";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import { AI_TOKENS, monthKey, publicPeriod, resolvePeriod } from "@/lib/usage";

export type BudgetCheck = { allowed: boolean; period: UsagePeriod };

export async function checkAiBudget(user: SessionUser, now = Date.now()): Promise<BudgetCheck> {
  const db = await getDb();
  const period = await resolvePeriod(db, user, now, { quiet: true });
  const budget = aiTokenBudget(user.plan, period.kind);
  if (budget === null) return { allowed: true, period: publicPeriod(period) };
  const [row] = await db
    .select({ count: usage.count })
    .from(usage)
    .where(
      and(eq(usage.subject, user.id), eq(usage.feature, AI_TOKENS), eq(usage.period, period.key)),
    )
    .limit(1);
  return { allowed: (row?.count ?? 0) < budget, period: publicPeriod(period) };
}

// `now` is when the call started, so a call ending just after a reset is charged where it began.
export async function recordAiTokens(
  user: SessionUser,
  tokens: number,
  now = Date.now(),
): Promise<void> {
  if (tokens <= 0 || !isPaidPlan(user.plan)) return;
  const db = await getDb();
  const period = await resolvePeriod(db, user, now, { quiet: true });
  if (period.kind !== "week") return addTokens(db, user.id, period.key, tokens);
  await db.transaction(async (tx) => {
    await addTokens(tx, user.id, period.key, tokens);
    await addTokens(tx, user.id, monthKey(now), tokens);
  });
}

async function addTokens(db: Db, userId: string, key: string, tokens: number): Promise<void> {
  await db
    .insert(usage)
    .values({ subject: userId, feature: AI_TOKENS, period: key, count: tokens })
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: { count: sql`${usage.count} + ${tokens}` },
    });
}

export function spendAiTokens<T>(
  user: SessionUser,
  now: number,
  work: () => Promise<T>,
): Promise<T> {
  return metered(work, async (tokens) => {
    if (tokens === 0) return;
    const record = async () => {
      try {
        await recordAiTokens(user, tokens, now);
      } catch (error) {
        log.error("ai_budget.record_failed", error, { userId: user.id, tokens });
      }
    };
    // The budget is soft, so the write waits until the answer is out; outside a request it runs now.
    try {
      after(record);
    } catch {
      await record();
    }
  });
}
