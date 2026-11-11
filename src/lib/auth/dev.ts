import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { authUsers, devLoginCodes, devSessions } from "@/db/local-schema";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { log, maskEmail } from "@/lib/log";
import { ensureUser, toSessionUser } from "@/lib/users";
import { DEV_SESSION_COOKIE, devAuthActive } from "./dev-mode";
import { LOGIN_CODE_DIGITS } from "./policy";
import type { SessionUser } from "./types";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEV_SECRET = "otto-dev-only-session-secret-not-for-production";

export type DevCodeFailure = "invalid_code" | "too_many_attempts";

export class DevCodeError extends Error {
  readonly reason: DevCodeFailure;

  constructor(reason: DevCodeFailure) {
    super(reason === "too_many_attempts" ? "Too many wrong tries. Ask for a new code." : "That code didn't work or has expired. Check it or ask for a new one.");
    this.name = "DevCodeError";
    this.reason = reason;
  }
}

function assertDevelopment(): void {
  if (!devAuthActive()) throw new Error("Dev sign-in is only available in development");
}

function secret(): string {
  return env().AUTH_SECRET ?? DEV_SECRET;
}

function hmac(value: string): Buffer {
  return createHmac("sha256", secret()).update(value).digest();
}

function sameMac(expected: Buffer, actual: Buffer): boolean {
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function cookieAttributes() {
  return { httpOnly: true, sameSite: "lax", secure: false, path: "/" } as const;
}

export async function requestDevCode(email: string, now = Date.now()): Promise<string> {
  assertDevelopment();
  const code = String(randomInt(0, 10 ** LOGIN_CODE_DIGITS)).padStart(LOGIN_CODE_DIGITS, "0");
  const row = { email, codeHash: hmac(`${code}:${email}`).toString("hex"), expiresAt: now + CODE_TTL_MS, attempts: 0 };
  const db = await getDb();
  await db
    .insert(devLoginCodes)
    .values(row)
    .onConflictDoUpdate({ target: devLoginCodes.email, set: { codeHash: row.codeHash, expiresAt: row.expiresAt, attempts: 0 } });
  log.info("auth.dev_code_issued", { to: maskEmail(email) });
  return code;
}

export async function verifyDevCode(email: string, code: string, now = Date.now()): Promise<SessionUser> {
  assertDevelopment();
  const db = await getDb();
  // Each guess claims an attempt in the same statement that checks the lock and expiry.
  const [claimed] = await db
    .update(devLoginCodes)
    .set({ attempts: sql`${devLoginCodes.attempts} + 1` })
    .where(and(eq(devLoginCodes.email, email), lt(devLoginCodes.attempts, MAX_ATTEMPTS), gt(devLoginCodes.expiresAt, now)))
    .returning({ codeHash: devLoginCodes.codeHash, attempts: devLoginCodes.attempts });
  if (!claimed) throw new DevCodeError("invalid_code");
  if (!sameMac(Buffer.from(claimed.codeHash, "hex"), hmac(`${code}:${email}`))) {
    throw new DevCodeError(claimed.attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid_code");
  }
  const used = await db.delete(devLoginCodes).where(eq(devLoginCodes.email, email)).returning({ email: devLoginCodes.email });
  if (used.length === 0) throw new DevCodeError("invalid_code");

  const user = toSessionUser(await ensureUser({ id: await identityFor(email), email }, now));
  const sessionId = crypto.randomUUID();
  await db.insert(devSessions).values({ id: sessionId, userId: user.id, createdAt: now, expiresAt: now + SESSION_TTL_MS });
  (await cookies()).set(DEV_SESSION_COOKIE, `${sessionId}.${hmac(sessionId).toString("base64url")}`, {
    ...cookieAttributes(),
    maxAge: SESSION_TTL_MS / 1000,
  });
  return user;
}

async function identityFor(email: string): Promise<string> {
  const db = await getDb();
  const [existing] = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.insert(authUsers).values({ id, email });
  return id;
}

function sessionIdFrom(cookie: string | undefined): string | null {
  if (!cookie || cookie.length > 200) return null;
  const [id, signature, ...rest] = cookie.split(".");
  if (!id || !signature || rest.length > 0) return null;
  return sameMac(Buffer.from(signature, "base64url"), hmac(id)) ? id : null;
}

export async function getDevUser(now = Date.now()): Promise<SessionUser | null> {
  if (!devAuthActive()) return null;
  const sessionId = sessionIdFrom((await cookies()).get(DEV_SESSION_COOKIE)?.value);
  if (!sessionId) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      planInterval: users.planInterval,
      planRenewsAt: users.planRenewsAt,
      trialEndsAt: users.trialEndsAt,
      planPeriodStartsAt: users.planPeriodStartsAt,
      planPeriodEndsAt: users.planPeriodEndsAt,
    })
    .from(devSessions)
    .innerJoin(users, eq(users.id, devSessions.userId))
    .where(and(eq(devSessions.id, sessionId), gt(devSessions.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

export async function clearDevSession(): Promise<void> {
  if (!devAuthActive()) return;
  const jar = await cookies();
  const sessionId = sessionIdFrom(jar.get(DEV_SESSION_COOKIE)?.value);
  if (sessionId) {
    const db = await getDb();
    await db.delete(devSessions).where(eq(devSessions.id, sessionId));
  }
  if (jar.get(DEV_SESSION_COOKIE)) jar.delete({ name: DEV_SESSION_COOKIE, ...cookieAttributes() });
}

export async function deleteDevIdentity(userId: string): Promise<void> {
  assertDevelopment();
  const db = await getDb();
  await db.delete(devSessions).where(eq(devSessions.userId, userId));
  await db.delete(authUsers).where(eq(authUsers.id, userId));
}
