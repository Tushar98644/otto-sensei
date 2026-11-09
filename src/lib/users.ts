import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  resumes,
  resumeTombstones,
  usage,
  users,
  type UserRow,
} from "@/db/schema";
import { captureServerEvent } from "@/lib/analytics/server";
import { normalizeEmail } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";

// Server-only. Account rows and everything stored under them. Supabase Auth owns sign-in; our
// users row (same id) holds the plan and billing ids.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ids from outside (webhook metadata, tests) may be anything; Postgres would reject a non-uuid
// with an error instead of simply finding nothing.
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

/**
 * Our row for a Supabase Auth user, created free on their first signed-in request and given their
 * new address if it changed. The common case is one primary-key read. Safe when two first
 * requests race: the upsert keeps one row and both callers read it back.
 */
export async function ensureUser(identity: AuthIdentity, now = Date.now()): Promise<UserRow> {
  const email = normalizeEmail(identity.email);
  const existing = await findUserById(identity.id);
  if (existing?.email === email) return existing;
  const db = await getDb();
  const [row] = await db
    .insert(users)
    .values({ id: identity.id, email, plan: "free", createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: users.id, set: { email, updatedAt: now } })
    .returning();
  if (!row) throw new Error("ensureUser: upsert returned no row");
  // Only the request whose insert made the row counts; a racing first request reads it back.
  if (!existing && row.createdAt === now) captureServerEvent(row.id, "signed_up", {});
  return row;
}

/**
 * Deletes everything stored for the account in one transaction: cloud resumes and their
 * tombstones, logged job applications, usage counters, then the user row. A no-op for an unknown
 * id. Billing and the Supabase Auth user are not touched here: DELETE /api/account cancels any
 * live subscription first and deletes the auth user after.
 */
export async function deleteUserData(userId: string): Promise<void> {
  if (!isUserId(userId)) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(resumes).where(eq(resumes.userId, userId));
    await tx.delete(resumeTombstones).where(eq(resumeTombstones.userId, userId));
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
  };
}
