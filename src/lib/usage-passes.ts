import { createHash } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Feature } from "@/config/plans";
import { getDb } from "@/db/client";
import { meteredCalls } from "@/db/schema";
import { MINUTE_MS } from "@/lib/time";

export const PASS_USES = 3;
export const PASS_TTL_MS = 30 * MINUTE_MS;

type PassKey = { userId: string; feature: Feature; subject: string };

export function passSubject(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("base64url");
}

// A pass shares metered_calls with replayable results, keyed by its feature and subject.
function passKey(feature: Feature, subject: string): string {
  return `${feature}:${subject}`;
}

function ofPass({ userId, feature, subject }: PassKey) {
  return and(
    eq(meteredCalls.userId, userId),
    eq(meteredCalls.kind, "pass"),
    eq(meteredCalls.key, passKey(feature, subject)),
  );
}

// A new charged call on the same subject starts a fresh pass rather than adding uses.
export async function openPass({ userId, feature, subject }: PassKey, now: number): Promise<void> {
  const db = await getDb();
  const expiresAt = now + PASS_TTL_MS;
  await db
    .insert(meteredCalls)
    .values({
      userId,
      kind: "pass",
      key: passKey(feature, subject),
      usesLeft: PASS_USES,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [meteredCalls.userId, meteredCalls.kind, meteredCalls.key],
      set: { usesLeft: PASS_USES, expiresAt },
    });
  await db
    .delete(meteredCalls)
    .where(
      and(
        eq(meteredCalls.userId, userId),
        eq(meteredCalls.kind, "pass"),
        lt(meteredCalls.expiresAt, now),
      ),
    );
}

// Takes one use only below the expiry and above zero, so two calls can't share the last one.
export async function takePass(pass: PassKey, now: number): Promise<boolean> {
  const db = await getDb();
  const taken = await db
    .update(meteredCalls)
    .set({ usesLeft: sql`${meteredCalls.usesLeft} - 1` })
    .where(and(ofPass(pass), gt(meteredCalls.expiresAt, now), gt(meteredCalls.usesLeft, 0)))
    .returning({ usesLeft: meteredCalls.usesLeft });
  return taken.length > 0;
}

export async function returnPass(pass: PassKey): Promise<void> {
  const db = await getDb();
  await db
    .update(meteredCalls)
    .set({ usesLeft: sql`least(${meteredCalls.usesLeft} + 1, ${PASS_USES})` })
    .where(ofPass(pass));
}
