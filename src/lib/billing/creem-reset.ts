import { and, count, isNotNull, isNull, ne, notLike, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { trialReplacements, users } from "@/db/schema";

// Paddle ids are a prefix and 26 lowercase letters or digits; Creem's never are.
const PADDLE_CUSTOMER_ID = "^ctm_[a-z0-9]{26}$";
const PADDLE_SUBSCRIPTION_ID = "^sub_[a-z0-9]{26}$";

const notMock = or(isNull(users.planStatus), notLike(users.planStatus, "mock\\_%"));

const creemUser = and(
  or(
    and(isNotNull(users.billingCustomerId), sql`${users.billingCustomerId} !~ ${PADDLE_CUSTOMER_ID}`),
    and(
      isNotNull(users.billingSubscriptionId),
      sql`${users.billingSubscriptionId} !~ ${PADDLE_SUBSCRIPTION_ID}`,
    ),
  ),
  notMock,
);

// Sandbox and live ids look alike, so going live clears every row with billing state of any kind.
const billedUser = and(
  or(
    isNotNull(users.billingCustomerId),
    isNotNull(users.billingSubscriptionId),
    isNotNull(users.planStatus),
    isNotNull(users.billingEventAt),
  ),
  notMock,
);

const creemReplacement = sql`${trialReplacements.replacedSubscriptionId} !~ ${PADDLE_SUBSCRIPTION_ID}`;
const anyReplacement = sql`true`;

export const RESET_USAGE = `Usage: bun scripts/reset-creem-plans.ts [--go-live] [--apply]

  (no flags)          Dry run: counts the accounts still holding Creem ids. Changes nothing.
  --apply             Moves those accounts to Free, clears their billing fields and deletes the
                      Creem trial replacements. Run once when the Paddle sandbox build first deploys.
  --go-live           Dry run: counts every account holding any billing state, Paddle sandbox ids
                      included (sandbox and live ids look alike). Changes nothing.
  --go-live --apply   Moves all of them to Free, clears their billing fields and deletes every trial
                      replacement. Run right before switching PADDLE_* to live, after cancelling
                      the sandbox subscriptions. Never run it once production is on live: it would
                      move paying customers to Free while Paddle keeps charging them.

Accounts on mock plans are left alone. Only counts are printed, never emails.`;

type ResetArgs = { apply: boolean; goLive: boolean; unknown: string[] };

export function parseResetArgs(args: readonly string[]): ResetArgs {
  return {
    apply: args.includes("--apply"),
    goLive: args.includes("--go-live"),
    unknown: args.filter((arg) => arg !== "--apply" && arg !== "--go-live"),
  };
}

export type CreemResetCounts = { users: number; paidUsers: number; trialReplacements: number };

export async function resetCreemPlans(
  db: Db,
  { apply, goLive = false, now = Date.now() }: { apply: boolean; goLive?: boolean; now?: number },
): Promise<CreemResetCounts> {
  const target = goLive ? billedUser : creemUser;
  const replacement = goLive ? anyReplacement : creemReplacement;
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ total: count() }).from(users).where(target);
    const [paid] = await tx
      .select({ total: count() })
      .from(users)
      .where(and(target, ne(users.plan, "free")));
    const [replacements] = await tx
      .select({ total: count() })
      .from(trialReplacements)
      .where(replacement);
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
      .where(target);
    await tx.delete(trialReplacements).where(replacement);
    return counts;
  });
}
