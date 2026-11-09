import { and, eq, isNotNull, or } from "drizzle-orm";
import { PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { recordTrialHistory } from "./trial";

// Server-only, development only: billingMode() never returns "mock" in production. Flips the plan
// locally so the upgrade, trial and cancel flows can be clicked through without a payment provider.

export const MOCK_STATUS = {
  active: "mock_active",
  trialing: "mock_trialing",
  cancelled: "mock_cancelled",
} as const;

const DAY_MS = 86_400_000;

export type MockSubscribeOptions = { trial?: boolean; now?: number };

// Also how a plan change (Pro to Max and back) works in mock mode. No renewal date on a paid plan,
// so a weekly plan's allowance counts per ISO week (src/lib/usage.ts). A trial ends PRO_TRIAL.days
// from now and, like Creem's, is only written down once.
export async function mockSubscribe(
  userId: string,
  plan: PaidPlanId = "pro",
  interval: BillingInterval = "month",
  { trial = false, now = Date.now() }: MockSubscribeOptions = {},
): Promise<void> {
  const db = await getDb();
  const trialEndsAt = trial ? now + PRO_TRIAL.days * DAY_MS : null;
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(users)
      .set({
        plan,
        planInterval: interval,
        planStatus: trial ? MOCK_STATUS.trialing : MOCK_STATUS.active,
        planRenewsAt: trialEndsAt,
        trialEndsAt,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning({ email: users.email });
    if (row) await recordTrialHistory(tx, row.email, trial ? "trial" : "paid", now);
  });
}

/** Returns false when the user never subscribed, like the real portal. */
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
