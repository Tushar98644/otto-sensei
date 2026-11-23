import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db/client";
import { billingLog, users } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/policy";
import type { AccountBilling, SessionUser } from "@/lib/auth/types";
import { trialKey } from "./log";

export type TrialHistoryKind = "trial" | "paid";

export function emailFingerprint(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export async function recordTrialHistory(
  db: Db | Tx,
  email: string,
  kind: TrialHistoryKind,
  now = Date.now(),
): Promise<void> {
  await db
    .insert(billingLog)
    .values({ kind: "trial", key: emailFingerprint(email), ref: kind, at: now })
    .onConflictDoNothing();
}

// known: the row's billing fields as the session read them in this request, so the row isn't read again.
export async function isTrialEligible(
  user: Pick<SessionUser, "id" | "email" | "plan">,
  conn?: Db | Tx,
  known?: AccountBilling,
): Promise<boolean> {
  if (user.plan !== "free") return false;
  const db = conn ?? (await getDb());
  const [row] = known
    ? [known]
    : await db
        .select({
          planStatus: users.planStatus,
          billingSubscriptionId: users.billingSubscriptionId,
          billingCustomerId: users.billingCustomerId,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
  if (!row) return false;
  if (
    row.planStatus !== null ||
    row.billingSubscriptionId !== null ||
    row.billingCustomerId !== null
  ) {
    return false;
  }
  const [seen] = await db
    .select({ kind: billingLog.ref })
    .from(billingLog)
    .where(trialKey(emailFingerprint(user.email)))
    .limit(1);
  return !seen;
}
