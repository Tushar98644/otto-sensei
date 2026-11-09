import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db/client";
import { trialHistory, users } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";

// Server-only. One Pro trial per person. Creem doesn't track this itself, so every trial start and
// every payment is written to trial_history under a hash of the email, which outlives the account:
// deleting it and signing up again with the same address doesn't bring the trial back.

export type TrialHistoryKind = "trial" | "paid";

export function emailFingerprint(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

/** Notes that this person has trialed or paid. The first kind seen stays. */
export async function recordTrialHistory(
  db: Db | Tx,
  email: string,
  kind: TrialHistoryKind,
  now = Date.now(),
): Promise<void> {
  await db
    .insert(trialHistory)
    .values({ emailHash: emailFingerprint(email), kind, createdAt: now })
    .onConflictDoNothing();
}

/**
 * Whether the trial is still open to this account: on Free, never billed (no subscription or
 * provider status on the row, mock ones included) and no trial or payment under its email.
 */
export async function isTrialEligible(user: Pick<SessionUser, "id" | "email" | "plan">): Promise<boolean> {
  if (user.plan !== "free") return false;
  const db = await getDb();
  const [row] = await db
    .select({
      planStatus: users.planStatus,
      billingSubscriptionId: users.billingSubscriptionId,
      billingCustomerId: users.billingCustomerId,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) return false;
  if (row.planStatus !== null || row.billingSubscriptionId !== null || row.billingCustomerId !== null) {
    return false;
  }
  const [seen] = await db
    .select({ kind: trialHistory.kind })
    .from(trialHistory)
    .where(eq(trialHistory.emailHash, emailFingerprint(user.email)))
    .limit(1);
  return !seen;
}
