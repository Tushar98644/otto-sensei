import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, inArray, lte, max, min } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { extensionTokens, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";
import { DAY_MS } from "@/lib/time";
import { toSessionUser } from "@/lib/users";
import { EXTENSION_LIMITS, EXTENSION_TOKEN_PREFIX, type ExtensionConnection } from "./types";

const LIFETIME_MS = EXTENSION_LIMITS.tokenDays * DAY_MS;
const MAX_TOKEN_CHARS = 128;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export type IssuedToken = { token: string; expiresAt: number };

// Under the account lock, so two connects at once can't pass the per-account cap.
export async function issueExtensionToken(
  userId: string,
  now = Date.now(),
): Promise<IssuedToken | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const rows = await tx
      .select({ id: extensionTokens.id })
      .from(extensionTokens)
      .where(eq(extensionTokens.userId, userId))
      .orderBy(desc(extensionTokens.createdAt), desc(extensionTokens.id));
    const oldest = rows.slice(EXTENSION_LIMITS.tokensPerUser - 1).map((row) => row.id);
    if (oldest.length > 0) {
      await tx
        .delete(extensionTokens)
        .where(and(eq(extensionTokens.userId, userId), inArray(extensionTokens.id, oldest)));
    }
    const token = `${EXTENSION_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
    const expiresAt = now + LIFETIME_MS;
    await tx.insert(extensionTokens).values({
      id: randomUUID(),
      userId,
      tokenHash: hashToken(token),
      createdAt: now,
      lastUsedAt: now,
      expiresAt,
    });
    return { token, expiresAt };
  });
}

export type TokenAuth = { tokenId: string; user: SessionUser };

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1] ?? "";
  return token.startsWith(EXTENSION_TOKEN_PREFIX) && token.length <= MAX_TOKEN_CHARS ? token : null;
}

// Sliding expiry: a browser that keeps using Otto stays connected; one left alone for 90 days doesn't.
export async function verifyExtensionToken(
  token: string,
  now = Date.now(),
): Promise<TokenAuth | null> {
  const db = await getDb();
  const [row] = await db
    .select({ token: extensionTokens, user: users })
    .from(extensionTokens)
    .innerJoin(users, eq(users.id, extensionTokens.userId))
    .where(
      and(eq(extensionTokens.tokenHash, hashToken(token)), eq(extensionTokens.scope, "extension")),
    )
    .limit(1);
  if (!row || row.token.expiresAt <= now) return null;
  if (now - row.token.lastUsedAt >= EXTENSION_LIMITS.slideAfterMs) {
    await db
      .update(extensionTokens)
      .set({ lastUsedAt: now, expiresAt: now + LIFETIME_MS })
      .where(eq(extensionTokens.id, row.token.id));
  }
  return { tokenId: row.token.id, user: toSessionUser(row.user) };
}

export async function revokeExtensionToken(userId: string, tokenId: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(extensionTokens)
    .where(and(eq(extensionTokens.userId, userId), eq(extensionTokens.id, tokenId)));
}

export async function revokeExtensionTokens(userId: string): Promise<number> {
  const db = await getDb();
  const gone = await db
    .delete(extensionTokens)
    .where(eq(extensionTokens.userId, userId))
    .returning({ id: extensionTokens.id });
  return gone.length;
}

export async function extensionConnection(
  userId: string,
  now = Date.now(),
): Promise<ExtensionConnection | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      connectedAt: min(extensionTokens.createdAt),
      lastUsedAt: max(extensionTokens.lastUsedAt),
      browsers: count(),
    })
    .from(extensionTokens)
    .where(and(eq(extensionTokens.userId, userId), gt(extensionTokens.expiresAt, now)));
  if (!row || row.browsers === 0 || row.connectedAt === null || row.lastUsedAt === null)
    return null;
  return {
    connectedAt: Number(row.connectedAt),
    lastUsedAt: Number(row.lastUsedAt),
    browsers: row.browsers,
  };
}

export async function deleteExpiredExtensionTokens(now: number, batch: number): Promise<number> {
  const db = await getDb();
  const expired = db
    .select({ id: extensionTokens.id })
    .from(extensionTokens)
    .where(lte(extensionTokens.expiresAt, now))
    .limit(batch);
  const gone = await db
    .delete(extensionTokens)
    .where(inArray(extensionTokens.id, expired))
    .returning({ id: extensionTokens.id });
  return gone.length;
}
