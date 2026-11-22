import {
  and,
  type Column,
  count,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  ne,
  notLike,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Db, Tx } from "@/db/client";
import { trialHistory, trialReminders, trialReplacements, usage, users } from "@/db/schema";

export type ResetMode = "paddle" | "go-live";

// Paddle ids are a prefix and 26 lowercase letters or digits; Dodo's never are.
const PADDLE_CUSTOMER_ID = "^ctm_[a-z0-9]{26}$";
const PADDLE_SUBSCRIPTION_ID = "^sub_[a-z0-9]{26}$";

// TRIAL_PERIOD_KEY (usage.ts is server-only): every trial of an account shares it, so a new one would start used up.
const TRIAL_PERIOD = "trial";
const trialUsage = and(eq(usage.period, TRIAL_PERIOD), gt(usage.count, 0));

const notMock = or(isNull(users.planStatus), notLike(users.planStatus, "mock\\_%"));

const paddleUser = and(
  or(
    sql`${users.billingCustomerId} ~ ${PADDLE_CUSTOMER_ID}`,
    sql`${users.billingSubscriptionId} ~ ${PADDLE_SUBSCRIPTION_ID}`,
  ),
  notMock,
);

// Dodo test and live ids look alike, so going live clears every row with billing state of any kind.
const billedUser = and(
  or(
    isNotNull(users.billingCustomerId),
    isNotNull(users.billingSubscriptionId),
    isNotNull(users.planStatus),
    isNotNull(users.billingEventAt),
  ),
  notMock,
);

const TARGETS: Record<ResetMode, { users: SQL | undefined; replacements: SQL }> = {
  paddle: {
    users: paddleUser,
    replacements: sql`${trialReplacements.replacedSubscriptionId} ~ ${PADDLE_SUBSCRIPTION_ID}`,
  },
  "go-live": { users: billedUser, replacements: sql`true` },
};

export const RESET_USAGE = `Usage: bun scripts/reset-billing.ts (--paddle | --go-live) [--apply]

  --paddle            Dry run: counts the accounts still holding Paddle sandbox ids (ctm_ or sub_
                      plus 26 lowercase letters or digits). Changes nothing. Migration
                      20261120000100_reset_paddle_plans.sql applies the same rule on the Dodo deploy.
  --paddle --apply    Moves those accounts to Free, clears their billing fields and deletes their
                      trial reminders, the Paddle trial replacements and all trial history, and
                      sets every account's trial usage back to zero (invite extras stay).
  --go-live           Dry run: counts every account holding any billing state, Dodo test-mode ids
                      included (test and live ids look alike). Changes nothing.
  --go-live --apply   Moves all of them to Free, clears their billing fields and deletes their trial
                      reminders, every trial replacement and all trial history, and sets every
                      account's trial usage back to zero (invite extras stay).
                      Run it exactly once: after cancelling every Dodo test subscription and right
                      before switching DODO_ENVIRONMENT to live. Never run it after that: it would
                      move paying customers to Free while Dodo keeps charging them.

Accounts on mock plans and plans set by hand (no billing state) are left alone. Only the database
host and counts are printed, never emails.`;

type ResetArgs =
  | { action: "help" }
  | { action: "error"; message: string }
  | { action: "run"; mode: ResetMode; apply: boolean };

const MODE_FLAGS = new Map<string, ResetMode>([
  ["--paddle", "paddle"],
  ["--go-live", "go-live"],
]);

export function parseResetArgs(args: readonly string[]): ResetArgs {
  if (args.includes("--help") || args.includes("-h")) return { action: "help" };
  const unknown = args.filter((arg) => arg !== "--apply" && !MODE_FLAGS.has(arg));
  if (unknown.length > 0) {
    return { action: "error", message: `Unknown option: ${unknown.join(" ")}` };
  }
  const modes = new Set(args.flatMap((arg) => MODE_FLAGS.get(arg) ?? []));
  const [mode] = modes;
  if (!mode) return { action: "error", message: "Choose a mode: --paddle or --go-live." };
  if (modes.size > 1) {
    return { action: "error", message: "Choose one mode: --paddle or --go-live, not both." };
  }
  return { action: "run", mode, apply: args.includes("--apply") };
}

export type BillingResetCounts = {
  users: number;
  paidUsers: number;
  trialReminders: number;
  trialReplacements: number;
  trialHistory: number;
  trialUsage: number;
};

async function tally(tx: Tx, table: PgTable, where: SQL | undefined): Promise<number> {
  const [row] = await tx.select({ total: count() }).from(table).where(where);
  return row?.total ?? 0;
}

export async function resetBilling(
  db: Db,
  { mode, apply, now = Date.now() }: { mode: ResetMode; apply: boolean; now?: number },
): Promise<BillingResetCounts> {
  const target = TARGETS[mode];
  return db.transaction(async (tx) => {
    const ofTargetUser = (column: Column) =>
      inArray(column, tx.select({ id: users.id }).from(users).where(target.users));
    const counts = {
      users: await tally(tx, users, target.users),
      paidUsers: await tally(tx, users, and(target.users, ne(users.plan, "free"))),
      trialReminders: await tally(tx, trialReminders, ofTargetUser(trialReminders.userId)),
      trialReplacements: await tally(tx, trialReplacements, target.replacements),
      trialHistory: await tally(tx, trialHistory, undefined),
      trialUsage: await tally(tx, usage, trialUsage),
    };
    if (!apply) return counts;
    // These go first: once the users are reset, the target rule no longer finds them.
    await tx.delete(trialReminders).where(ofTargetUser(trialReminders.userId));
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
      .where(target.users);
    await tx.delete(trialReplacements).where(target.replacements);
    await tx.update(usage).set({ count: 0 }).where(trialUsage);
    await tx.delete(trialHistory).where(sql`true`);
    return counts;
  });
}
