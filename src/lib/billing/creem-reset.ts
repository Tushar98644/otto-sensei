import { and, count, isNotNull, isNull, ne, notLike, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { trialReplacements, users } from "@/db/schema";

// Paddle ids are a prefix and 26 lowercase letters or digits; Creem's never are.
const PADDLE_CUSTOMER_ID = "^ctm_[a-z0-9]{26}$";
const PADDLE_SUBSCRIPTION_ID = "^sub_[a-z0-9]{26}$";

const creemUser = and(
  or(
    and(isNotNull(users.billingCustomerId), sql`${users.billingCustomerId} !~ ${PADDLE_CUSTOMER_ID}`),
    and(
      isNotNull(users.billingSubscriptionId),
      sql`${users.billingSubscriptionId} !~ ${PADDLE_SUBSCRIPTION_ID}`,
    ),
  ),
  or(isNull(users.planStatus), notLike(users.planStatus, "mock\\_%")),
);

const creemReplacement = sql`${trialReplacements.replacedSubscriptionId} !~ ${PADDLE_SUBSCRIPTION_ID}`;

export type CreemResetCounts = { users: number; paidUsers: number; trialReplacements: number };

export async function resetCreemPlans(
  db: Db,
  { apply, now = Date.now() }: { apply: boolean; now?: number },
): Promise<CreemResetCounts> {
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ total: count() }).from(users).where(creemUser);
    const [paid] = await tx
      .select({ total: count() })
      .from(users)
      .where(and(creemUser, ne(users.plan, "free")));
    const [replacements] = await tx
      .select({ total: count() })
      .from(trialReplacements)
      .where(creemReplacement);
    const counts = {
      users: found?.total ?? 0,
      paidUsers: paid?.total ?? 0,
      trialReplacements: replacements?.total ?? 0,
    };
    if (!apply) return counts;
    await tx
      .update(users)
      .set({
        plan: "free",
        planInterval: null,
        planRenewsAt: null,
        trialEndsAt: null,
        planPeriodStartsAt: null,
        planPeriodEndsAt: null,
        planStatus: null,
        billingSubscriptionId: null,
        billingCustomerId: null,
        billingEventAt: null,
        updatedAt: now,
      })
      .where(creemUser);
    await tx.delete(trialReplacements).where(creemReplacement);
    return counts;
  });
}
