import { and, eq, isNotNull, or } from "drizzle-orm";
import { PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import { addMonths, carryUsageOver, type PeriodAccount } from "@/lib/usage";
import { recordTrialHistory } from "./trial";

export const MOCK_STATUS = {
  active: "mock_active",
  trialing: "mock_trialing",
  cancelled: "mock_cancelled",
} as const;

export type MockSubscribeOptions = { trial?: boolean; now?: number };

export async function mockSubscribe(
  userId: string,
  plan: PaidPlanId = "pro",
  interval: BillingInterval = "month",
  { trial = false, now = Date.now() }: MockSubscribeOptions = {},
): Promise<void> {
  const db = await getDb();
  const trialEndsAt = trial ? now + PRO_TRIAL.days * DAY_MS : null;
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({
        id: users.id,
        plan: users.plan,
        planInterval: users.planInterval,
        planRenewsAt: users.planRenewsAt,
        trialEndsAt: users.trialEndsAt,
        planPeriodStartsAt: users.planPeriodStartsAt,
        planPeriodEndsAt: users.planPeriodEndsAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!before) return;
    const after: PeriodAccount = {
      ...before,
      plan,
      planInterval: interval,
      planRenewsAt: trialEndsAt,
      trialEndsAt,
      ...mockPeriod(before, interval, trialEndsAt, now),
    };
    const [row] = await tx
      .update(users)
      .set({
        plan,
        planInterval: interval,
        planStatus: trial ? MOCK_STATUS.trialing : MOCK_STATUS.active,
        planRenewsAt: trialEndsAt,
        trialEndsAt,
        planPeriodStartsAt: after.planPeriodStartsAt,
        planPeriodEndsAt: after.planPeriodEndsAt,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning({ email: users.email });
    if (!row) return;
    await carryUsageOver(tx, before, after, now);
    await recordTrialHistory(tx, row.email, trial ? "trial" : "paid", now);
  });
}

function mockPeriod(
  before: PeriodAccount,
  interval: BillingInterval,
  trialEndsAt: number | null,
  now: number,
): Pick<PeriodAccount, "planPeriodStartsAt" | "planPeriodEndsAt"> {
  if (trialEndsAt !== null) return { planPeriodStartsAt: now, planPeriodEndsAt: trialEndsAt };
  const running =
    before.plan !== "free" &&
    before.trialEndsAt == null &&
    before.planPeriodStartsAt != null &&
    before.planPeriodEndsAt != null &&
    before.planPeriodEndsAt > now;
  if (running) {
    return { planPeriodStartsAt: before.planPeriodStartsAt, planPeriodEndsAt: before.planPeriodEndsAt };
  }
  return { planPeriodStartsAt: now, planPeriodEndsAt: addMonths(now, interval === "year" ? 12 : 1) };
}

export async function mockCancel(userId: string, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(users)
    .set({
      plan: "free",
      planInterval: null,
      planStatus: MOCK_STATUS.cancelled,
      planRenewsAt: null,
      trialEndsAt: null,
      planPeriodStartsAt: null,
      planPeriodEndsAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(users.id, userId),
        or(isNotNull(users.planStatus), isNotNull(users.billingCustomerId)),
      ),
    )
    .returning({ id: users.id });
  return rows.length > 0;
}
