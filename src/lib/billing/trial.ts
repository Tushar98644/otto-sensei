import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db/client";
import { trialHistory, users } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";

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
    .insert(trialHistory)
    .values({ emailHash: emailFingerprint(email), kind, createdAt: now })
    .onConflictDoNothing();
}

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
