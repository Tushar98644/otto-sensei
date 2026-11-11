import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { trialReplacements } from "@/db/schema";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { cancelCreemSubscription } from "./creem";
import { BillingError } from "./errors";

// Server-only. Ending a Pro trial early for another plan. Creem won't change a trialing
// subscription's product, so the new plan is a checkout of its own (createCheckoutUrl), and once
// it's active the webhook writes the trial down here (applySubscriptionState) and cancels it at
// once: nothing was charged on it, so there is nothing to refund. Until that cancel succeeds both
// are live and the trial would turn into paid Pro when it ends, so a failed cancel is retried by
// the next webhook for the new plan (answered 500 so Creem redelivers it) and by the daily cleanup.

type Replacement = typeof trialReplacements.$inferSelect;

/**
 * Cancels the trial `replacedSubscriptionId` if it's written down and not cancelled yet. True when
 * there's nothing left to do (cancelled now, earlier, or never written down); false when it's
 * still live, so the caller can ask for a retry. Logs every attempt.
 */
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

/** The daily retry: trials still to cancel, oldest first. Returns how many were cancelled. */
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
  };
  const attempted = { attempts: sql`${trialReplacements.attempts} + 1` };
  const row = eq(trialReplacements.replacedSubscriptionId, replacement.replacedSubscriptionId);
  if (!env().CREEM_API_KEY) {
    log.error("billing.replace_cancel_failed", new Error("CREEM_API_KEY is not set"), fields);
    return false;
  }
  try {
    // A cancel that went through on an earlier try is refused now and resolves to "already_ended".
    const result = await cancelCreemSubscription(replacement.replacedSubscriptionId);
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
