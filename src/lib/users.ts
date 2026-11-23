import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, resumes, usage, users, type UserRow } from "@/db/schema";
import { captureServerEvent } from "@/lib/analytics/server";
import { normalizeEmail } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres errors on a non-uuid instead of finding nothing, and outside ids may be anything.
export function isUserId(value: string): boolean {
  return UUID.test(value);
}

export async function findUserById(id: string): Promise<UserRow | null> {
  if (!isUserId(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export type AuthIdentity = { id: string; email: string };

// `known` is this id's row (or null for none) when the caller has already read it.
export async function ensureUser(
  identity: AuthIdentity,
  now = Date.now(),
  known?: UserRow | null,
): Promise<UserRow> {
  const email = normalizeEmail(identity.email);
  const existing = known === undefined ? await findUserById(identity.id) : known;
  if (existing?.email === email) return existing;
  const db = await getDb();
  const [row] = await db
    .insert(users)
    .values({ id: identity.id, email, plan: "free", createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: users.id, set: { email, updatedAt: now } })
    .returning();
  if (!row) throw new Error("ensureUser: upsert returned no row");
  if (!existing && row.createdAt === now) captureServerEvent(row.id, "signed_up", {});
  return row;
}

// Billing and the auth user aren't touched here: DELETE /api/account handles both, in order.
export async function deleteUserData(userId: string): Promise<void> {
  if (!isUserId(userId)) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(resumes).where(eq(resumes.userId, userId));
    await tx.delete(applications).where(eq(applications.userId, userId));
    await tx.delete(usage).where(eq(usage.subject, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    plan: row.plan,
    planInterval: row.planInterval,
    planRenewsAt: row.planRenewsAt,
    trialEndsAt: row.trialEndsAt,
    planPeriodStartsAt: row.planPeriodStartsAt,
    planPeriodEndsAt: row.planPeriodEndsAt,
  };
}
