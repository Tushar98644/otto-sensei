import { createHash } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Feature } from "@/config/plans";
import { getDb } from "@/db/client";
import { usagePasses } from "@/db/schema";
import { MINUTE_MS } from "@/lib/time";

export const PASS_USES = 3;
export const PASS_TTL_MS = 30 * MINUTE_MS;

type PassKey = { userId: string; feature: Feature; subject: string };

export function passSubject(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("base64url");
}

// A new charged call on the same subject starts a fresh pass rather than adding uses.
export async function openPass({ userId, feature, subject }: PassKey, now: number): Promise<void> {
  const db = await getDb();
  const expiresAt = now + PASS_TTL_MS;
  await db
    .insert(usagePasses)
    .values({ userId, feature, subject, usesLeft: PASS_USES, expiresAt })
    .onConflictDoUpdate({
      target: [usagePasses.userId, usagePasses.feature, usagePasses.subject],
      set: { usesLeft: PASS_USES, expiresAt },
    });
  await db
    .delete(usagePasses)
    .where(and(eq(usagePasses.userId, userId), lt(usagePasses.expiresAt, now)));
}

// Takes one use only below the expiry and above zero, so two calls can't share the last one.
export async function takePass(
  { userId, feature, subject }: PassKey,
  now: number,
): Promise<boolean> {
  const db = await getDb();
  const taken = await db
    .update(usagePasses)
    .set({ usesLeft: sql`${usagePasses.usesLeft} - 1` })
    .where(
      and(
        eq(usagePasses.userId, userId),
        eq(usagePasses.feature, feature),
        eq(usagePasses.subject, subject),
        gt(usagePasses.expiresAt, now),
        gt(usagePasses.usesLeft, 0),
      ),
    )
    .returning({ usesLeft: usagePasses.usesLeft });
  return taken.length > 0;
}

export async function returnPass({ userId, feature, subject }: PassKey): Promise<void> {
  const db = await getDb();
  await db
    .update(usagePasses)
    .set({ usesLeft: sql`least(${usagePasses.usesLeft} + 1, ${PASS_USES})` })
    .where(
      and(
        eq(usagePasses.userId, userId),
        eq(usagePasses.feature, feature),
        eq(usagePasses.subject, subject),
      ),
    );
}
