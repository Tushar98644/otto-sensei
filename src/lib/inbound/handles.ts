import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { inboundHandles, resumes, users, userSettings } from "@/db/schema";
import type { PlanId } from "@/config/plans";
import { ADDRESS, hasAddress } from "./address-columns";
import {
  HANDLE_HOLD_MS,
  HANDLE_ROUTES_MS,
  handleProblem,
  handleVariants,
  suggestHandle,
  type HandleProblem,
} from "./handle";

export type HandleCheck = { available: boolean; problem: HandleProblem | "taken" | null };

type HandleRow = typeof inboundHandles.$inferSelect;

// Free once nobody holds it: never used, or retired more than 90 days ago. Its owner can always take it back.
function heldFrom(row: HandleRow | undefined, userId: string, now: number): boolean {
  if (!row || row.userId === userId) return false;
  return row.retiredAt === null || row.retiredAt > now - HANDLE_HOLD_MS;
}

export async function checkHandle(
  userId: string,
  handle: string,
  now = Date.now(),
): Promise<HandleCheck> {
  const problem = handleProblem(handle);
  if (problem) return { available: false, problem };
  const db = await getDb();
  const [row] = await db
    .select()
    .from(inboundHandles)
    .where(eq(inboundHandles.handle, handle))
    .limit(1);
  return heldFrom(row, userId, now)
    ? { available: false, problem: "taken" }
    : { available: true, problem: null };
}

export type ClaimResult = "ok" | "no_user" | "taken" | HandleProblem;

// Under the account lock: the old handle keeps taking mail for 14 days, and the new one is the account's.
export async function claimHandle(
  userId: string,
  handle: string,
  now = Date.now(),
): Promise<ClaimResult> {
  const problem = handleProblem(handle);
  if (problem) return problem;
  const db = await getDb();
  return db.transaction(async (tx): Promise<ClaimResult> => {
    if (!(await lockUser(tx, userId))) return "no_user";
    const [row] = await tx
      .select()
      .from(inboundHandles)
      .where(eq(inboundHandles.handle, handle))
      .limit(1);
    if (heldFrom(row, userId, now)) return "taken";
    if (row?.userId === userId && row.retiredAt === null) return "ok";
    await tx
      .update(inboundHandles)
      .set({ retiredAt: now, routesUntil: now + HANDLE_ROUTES_MS })
      .where(and(eq(inboundHandles.userId, userId), isNull(inboundHandles.retiredAt)));
    if (row) await tx.delete(inboundHandles).where(eq(inboundHandles.handle, handle));
    await tx.insert(inboundHandles).values({ handle, userId, createdAt: now });
    // A new address starts its setup again; the Gmail addresses already confirmed stay.
    const fresh = {
      trackingConfirmCode: null,
      trackingConfirmUrl: null,
      trackingConfirmSource: null,
      trackingConfirmAt: null,
      trackingConfirmedAt: null,
      trackingTestAt: null,
      trackingLastEmailAt: null,
    };
    await tx
      .insert(userSettings)
      .values({ userId, trackingAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...fresh, trackingAt: sql`coalesce(${userSettings.trackingAt}, ${now}::bigint)` },
      });
    return "ok";
  });
}

// Turning off stops the address at once; the handle stays held for 90 days.
export async function retireHandle(userId: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  await db
    .update(inboundHandles)
    .set({ retiredAt: now, routesUntil: now })
    .where(and(eq(inboundHandles.userId, userId), isNull(inboundHandles.retiredAt)));
}

export async function currentHandle(userId: string, executor?: Tx): Promise<string | null> {
  const db = executor ?? (await getDb());
  const [row] = await db
    .select({ handle: inboundHandles.handle })
    .from(inboundHandles)
    .where(and(eq(inboundHandles.userId, userId), isNull(inboundHandles.retiredAt)))
    .limit(1);
  return row?.handle ?? null;
}

export type Recipient = {
  userId: string;
  plan: PlanId;
  email: string;
  sources: string[];
  confirmedAt: number | null;
};

// The account a handle belongs to, while it still takes mail.
export async function recipientOf(handle: string, now = Date.now()): Promise<Recipient | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      userId: users.id,
      plan: users.plan,
      email: users.email,
      sources: ADDRESS.sources,
      confirmedAt: ADDRESS.confirmedAt,
    })
    .from(inboundHandles)
    .innerJoin(users, eq(users.id, inboundHandles.userId))
    .innerJoin(userSettings, hasAddress(inboundHandles.userId))
    .where(
      and(
        eq(inboundHandles.handle, handle),
        or(isNull(inboundHandles.retiredAt), sql`${inboundHandles.routesUntil} > ${now}`),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function handlesOf(userId: string) {
  const db = await getDb();
  return db
    .select({
      handle: inboundHandles.handle,
      createdAt: inboundHandles.createdAt,
      retiredAt: inboundHandles.retiredAt,
    })
    .from(inboundHandles)
    .where(eq(inboundHandles.userId, userId))
    .orderBy(desc(inboundHandles.createdAt));
}

// A first handle to offer: the name on the newest resume, else the email's local part, else a variant that's free.
export async function suggestFor(userId: string, email: string, now = Date.now()): Promise<string> {
  const db = await getDb();
  const [resume] = await db
    .select({ name: sql<string>`coalesce(${resumes.data}->'basics'->>'name', '')` })
    .from(resumes)
    .where(
      and(eq(resumes.userId, userId), sql`coalesce(${resumes.data}->>'source', '') <> 'sample'`),
    )
    .orderBy(desc(resumes.updatedAt))
    .limit(1);
  const [previous] = await db
    .select({ handle: inboundHandles.handle })
    .from(inboundHandles)
    .where(eq(inboundHandles.userId, userId))
    .orderBy(desc(inboundHandles.createdAt))
    .limit(1);
  const first = previous?.handle ?? suggestHandle(resume?.name ?? "", email);
  if (!first) return "";
  for (const candidate of [first, ...handleVariants(first, new Date(now).getUTCFullYear())]) {
    if ((await checkHandle(userId, candidate, now)).available) return candidate;
  }
  return "";
}

// The daily cleanup: a deleted account's handles start their hold, and held handles past 90 days are freed.
export async function releaseHandles(now: number, batch: number): Promise<number> {
  const db = await getDb();
  await db
    .update(inboundHandles)
    .set({ retiredAt: now, routesUntil: now })
    .where(and(isNull(inboundHandles.userId), isNull(inboundHandles.retiredAt)));
  const stale = db
    .select({ handle: inboundHandles.handle })
    .from(inboundHandles)
    .where(
      and(isNotNull(inboundHandles.retiredAt), lt(inboundHandles.retiredAt, now - HANDLE_HOLD_MS)),
    )
    .limit(batch);
  const gone = await db
    .delete(inboundHandles)
    .where(sql`${inboundHandles.handle} in ${stale}`)
    .returning({ handle: inboundHandles.handle });
  return gone.length;
}
