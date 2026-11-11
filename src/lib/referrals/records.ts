import { randomInt } from "node:crypto";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { referralCodes, referrals, usage, users } from "@/db/schema";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { periodForUser } from "@/lib/usage";
import {
  BONUS_FEATURES,
  CLAIM_WINDOW_MS,
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_REWARDED_REFERRALS,
  REFERRAL_BONUS,
  inboxKey,
  invitePath,
  type BonusFeature,
  type ReferralBlockReason,
  type ReferralClaimOutcome,
  type ReferralSummary,
} from "./referrals";

const MAX_DEVICE_IDS = 10;
const MINT_ATTEMPTS = 3;

function mintCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join("");
}

// Drizzle wraps the driver's error, and the Postgres error code sits on the one it wraps.
function isUniqueViolation(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 4; depth++) {
    if (typeof current === "object" && "code" in current && current.code === "23505") return true;
    current = typeof current === "object" && "cause" in current ? current.cause : undefined;
  }
  return false;
}

function rememberDevice(deviceId: string) {
  const without = sql`array_remove(${referralCodes.deviceIds}, ${deviceId}::text)`;
  return sql`(array_append(${without}, ${deviceId}::text))[greatest(cardinality(${without}) - ${sql.raw(String(MAX_DEVICE_IDS - 2))}, 1):]`;
}

export async function ensureReferralCode(
  userId: string,
  deviceId: string | null,
  now = Date.now(),
): Promise<string | null> {
  const db = await getDb();
  const [existing] = deviceId
    ? await db
        .update(referralCodes)
        .set({ deviceIds: rememberDevice(deviceId) })
        .where(eq(referralCodes.userId, userId))
        .returning({ code: referralCodes.code })
    : await db
        .select({ code: referralCodes.code })
        .from(referralCodes)
        .where(eq(referralCodes.userId, userId))
        .limit(1);
  if (existing) return existing.code;

  for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        if (!(await lockUser(tx, userId))) return null;
        const [created] = await tx
          .insert(referralCodes)
          .values({
            userId,
            code: mintCode(),
            deviceIds: deviceId ? [deviceId] : [],
            createdAt: now,
          })
          .onConflictDoNothing({ target: referralCodes.userId })
          .returning({ code: referralCodes.code });
        if (created) return created.code;
        // A request racing this one made it first.
        const [raced] = await tx
          .select({ code: referralCodes.code })
          .from(referralCodes)
          .where(eq(referralCodes.userId, userId));
        return raced?.code ?? null;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Couldn't mint a unique invite code");
}

type ReferralRow = typeof referrals.$inferSelect;

async function addBonus(tx: Tx, userId: string, period: string): Promise<void> {
  await tx
    .insert(usage)
    .values(
      BONUS_FEATURES.map((feature) => ({
        subject: userId,
        feature,
        period,
        count: 0,
        bonus: REFERRAL_BONUS[feature],
      })),
    )
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: { bonus: sql`${usage.bonus} + excluded.bonus` },
    });
}

// Call with the inviter's row locked, so two friends at once can't both take the last place.
async function reward(tx: Tx, row: Pick<ReferralRow, "referredId" | "referrerId">, now: number) {
  const [paid] = await tx
    .select({ n: count() })
    .from(referrals)
    .where(and(eq(referrals.referrerId, row.referrerId), eq(referrals.status, "rewarded")));
  const status = (paid?.n ?? 0) < MAX_REWARDED_REFERRALS ? "rewarded" : "capped";
  const friendPeriod = await periodForUser(tx, row.referredId, now);
  if (!friendPeriod) return false;
  const [updated] = await tx
    .update(referrals)
    .set({ status, rewardedPeriod: friendPeriod.key, rewardedAt: now })
    .where(and(eq(referrals.referredId, row.referredId), eq(referrals.status, "pending")))
    .returning({ status: referrals.status });
  if (!updated) return false;
  await addBonus(tx, row.referredId, friendPeriod.key);
  if (status === "rewarded") {
    const inviterPeriod = await periodForUser(tx, row.referrerId, now);
    if (inviterPeriod) await addBonus(tx, row.referrerId, inviterPeriod.key);
  }
  log.info("referral.rewarded", { referrerId: row.referrerId, referredId: row.referredId, status });
  return true;
}

async function settleExisting(
  row: ReferralRow,
  checked: boolean,
  now: number,
): Promise<ReferralClaimOutcome> {
  if (row.status !== "pending") return "already";
  if (!checked) return "pending";
  const db = await getDb();
  const paid = await db.transaction(async (tx) => {
    if (!(await lockUser(tx, row.referrerId))) return false;
    return reward(tx, row, now);
  });
  return paid ? "rewarded" : "already";
}

async function blockReason(
  tx: Tx,
  friend: { email: string },
  referrer: { id: string; email: string },
  deviceId: string | null,
): Promise<ReferralBlockReason | null> {
  if (inboxKey(friend.email) === inboxKey(referrer.email)) return "same_person";
  if (!deviceId) return null;
  const [ownDevice] = await tx
    .select({ userId: referralCodes.userId })
    .from(referralCodes)
    .where(
      and(
        eq(referralCodes.userId, referrer.id),
        sql`${deviceId}::text = any(${referralCodes.deviceIds})`,
      ),
    )
    .limit(1);
  if (ownDevice) return "same_device";
  const [usedDevice] = await tx
    .select({ id: referrals.referredId })
    .from(referrals)
    .where(and(eq(referrals.referrerId, referrer.id), eq(referrals.deviceId, deviceId)))
    .limit(1);
  return usedDevice ? "same_device" : null;
}

export type ClaimInput = {
  userId: string;
  code: string;
  deviceId: string | null;
  checked: boolean;
};

export async function claimReferral(
  { userId, code, deviceId, checked }: ClaimInput,
  now = Date.now(),
): Promise<ReferralClaimOutcome> {
  const db = await getDb();
  const [linked] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredId, userId))
    .limit(1);
  if (linked) return settleExisting(linked, checked, now);

  const [owner] = await db
    .select({ userId: referralCodes.userId })
    .from(referralCodes)
    .where(eq(referralCodes.code, code))
    .limit(1);
  if (!owner) return "unknown_code";
  if (owner.userId === userId) return "self";
  const referrerId = owner.userId;

  return db.transaction(async (tx): Promise<ReferralClaimOutcome> => {
    if (!(await lockUser(tx, referrerId))) return "unknown_code";
    const people = await tx
      .select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(inArray(users.id, [userId, referrerId]));
    const friend = people.find((person) => person.id === userId);
    const referrer = people.find((person) => person.id === referrerId);
    if (!friend || !referrer) return "none";
    if (friend.createdAt < now - CLAIM_WINDOW_MS) return "existing_account";

    const reason = await blockReason(tx, friend, referrer, deviceId);
    const [row] = await tx
      .insert(referrals)
      .values({
        referredId: userId,
        referrerId,
        status: reason ? "blocked" : "pending",
        blockedReason: reason,
        deviceId,
        createdAt: now,
      })
      .onConflictDoNothing({ target: referrals.referredId })
      .returning();
    if (!row) return "already";
    if (reason) {
      log.info("referral.blocked", { referrerId, referredId: userId, reason });
      return "blocked";
    }
    log.info("referral.claimed", { referrerId, referredId: userId });
    if (!checked) return "pending";
    return (await reward(tx, row, now)) ? "rewarded" : "pending";
  });
}

export async function referralSummary(
  userId: string,
  deviceId: string | null,
  now = Date.now(),
): Promise<ReferralSummary | null> {
  const code = await ensureReferralCode(userId, deviceId, now);
  if (!code) return null;
  const db = await getDb();
  const period = await periodForUser(db, userId, now);
  if (!period) return null;
  const [byStatus, extras] = await Promise.all([
    db
      .select({ status: referrals.status, n: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .groupBy(referrals.status),
    db
      .select({ feature: usage.feature, bonus: usage.bonus })
      .from(usage)
      .where(
        and(
          eq(usage.subject, userId),
          inArray(usage.feature, BONUS_FEATURES),
          eq(usage.period, period.key),
        ),
      ),
  ]);
  const tally = (status: ReferralRow["status"]) =>
    byStatus.find((row) => row.status === status)?.n ?? 0;
  const extra = (feature: BonusFeature) =>
    extras.find((row) => row.feature === feature)?.bonus ?? 0;
  const rewarded = tally("rewarded");
  const checked = rewarded + tally("capped");
  return {
    code,
    url: `${appUrl()}${invitePath(code)}`,
    joined: checked + tally("pending"),
    checked,
    rewarded,
    maxRewarded: MAX_REWARDED_REFERRALS,
    perFriend: REFERRAL_BONUS,
    thisPeriod: { fix: extra("fix"), tailor: extra("tailor") },
    period: period.kind,
  };
}
