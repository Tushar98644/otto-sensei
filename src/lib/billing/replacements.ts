import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { trialReplacements } from "@/db/schema";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { BillingError } from "./errors";
import { cancelPaddleSubscription, getPaddleSubscription } from "./paddle";

// A plan bought during the trial is its own subscription; the trial is cancelled once it's paid.

type Replacement = typeof trialReplacements.$inferSelect;

export async function settleReplacement(
  replacedSubscriptionId: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const [pending] = await db
    .select()
    .from(trialReplacements)
    .where(
      and(
        eq(trialReplacements.replacedSubscriptionId, replacedSubscriptionId),
        isNull(trialReplacements.cancelledAt),
      ),
    )
    .limit(1);
  return pending ? cancelReplaced(pending, now) : true;
}

export async function retryPendingReplacements({
  now,
  deadline,
  limit,
}: {
  now: number;
  deadline: number;
  limit: number;
}): Promise<number> {
  const db = await getDb();
  const pending = await db
    .select()
    .from(trialReplacements)
    .where(isNull(trialReplacements.cancelledAt))
    .orderBy(asc(trialReplacements.createdAt))
    .limit(limit);
  let cancelled = 0;
  for (const replacement of pending) {
    if (Date.now() >= deadline) break;
    if (await cancelReplaced(replacement, now)) cancelled += 1;
  }
  return cancelled;
}

async function cancelReplaced(replacement: Replacement, now: number): Promise<boolean> {
  const db = await getDb();
  const fields = {
    userId: replacement.userId,
    subscriptionId: replacement.replacedSubscriptionId,
    replacedBy: replacement.subscriptionId,
    attempt: replacement.attempts + 1,
    // A refused second trial is recorded as replaced by itself.
    reason:
      replacement.subscriptionId === replacement.replacedSubscriptionId
        ? "trial_reused"
        : "replaced",
  };
  const attempted = { attempts: sql`${trialReplacements.attempts} + 1` };
  const row = eq(trialReplacements.replacedSubscriptionId, replacement.replacedSubscriptionId);
  if (!env().PADDLE_API_KEY) {
    log.error("billing.replace_cancel_failed", new Error("PADDLE_API_KEY is not set"), fields);
    return false;
  }
  try {
    const result = await cancelTrial(replacement.replacedSubscriptionId);
    await db
      .update(trialReplacements)
      .set({ ...attempted, cancelledAt: now })
      .where(row);
    log.info("billing.replaced_trial_cancelled", { ...fields, result });
    return true;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    await db.update(trialReplacements).set(attempted).where(row);
    log.error("billing.replace_cancel_failed", error, fields);
    return false;
  }
}

async function cancelTrial(subscriptionId: string): Promise<"cancelled" | "already_ended"> {
  try {
    await cancelPaddleSubscription(subscriptionId, { immediately: true });
    return "cancelled";
  } catch (error) {
    if (!(error instanceof BillingError) || error.code !== "refused") throw error;
    // Paddle refuses to cancel a subscription that has already ended.
    const current = await getPaddleSubscription(subscriptionId);
    if (current.status === "canceled") return "already_ended";
    throw error;
  }
}
