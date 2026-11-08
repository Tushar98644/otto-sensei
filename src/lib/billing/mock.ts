import { and, eq, isNotNull, or } from "drizzle-orm";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

// Server-only, development only: billingMode() never returns "mock" in production. Flips the plan
// locally so the upgrade and cancel flows can be clicked through without a payment provider.

export const MOCK_STATUS = { active: "mock_active", cancelled: "mock_cancelled" } as const;

// Also how a plan change (Pro to Max and back) works in mock mode. No renewal date, so a weekly
// plan's allowance counts per ISO week (src/lib/usage.ts).
export async function mockSubscribe(
  userId: string,
  plan: PaidPlanId = "pro",
  interval: BillingInterval = "month",
  now = Date.now(),
): Promise<void> {
  const db = await getDb();
  await db
    .update(users)
    .set({ plan, planInterval: interval, planStatus: MOCK_STATUS.active, planRenewsAt: null, updatedAt: now })
    .where(eq(users.id, userId));
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
