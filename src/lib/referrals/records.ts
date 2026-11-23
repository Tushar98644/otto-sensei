import { randomInt } from "node:crypto";
import { and, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { usage, users, userSettings } from "@/db/schema";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { periodForUser, resolvePeriod, type PeriodAccount } from "@/lib/usage";
import {
  BONUS_FEATURES,
  CLAIM_WINDOW_MS,
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_REWARDED_REFERRALS,
  REFERRAL_BONUS,
  homeLinkFor,
  inboxKey,
  invitePath,
  type BonusFeature,
  type ReferralBlockReason,
  type ReferralClaimOutcome,
  type ReferralStatus,
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
  const without = sql`array_remove(${userSettings.referralDeviceIds}, ${deviceId}::text)`;
  return sql`(array_append(${without}, ${deviceId}::text))[greatest(cardinality(${without}) - ${sql.raw(String(MAX_DEVICE_IDS - 2))}, 1):]`;
}

export async function ensureReferralCode(
  userId: string,
  deviceId: string | null,
  now = Date.now(),
): Promise<string | null> {
  const db = await getDb();
  const hasCode = and(eq(userSettings.userId, userId), isNotNull(userSettings.referralCode));
  const [existing] = deviceId
    ? await db
        .update(userSettings)
        .set({ referralDeviceIds: rememberDevice(deviceId) })
        .where(hasCode)
        .returning({ code: userSettings.referralCode })
    : await db
        .select({ code: userSettings.referralCode })
        .from(userSettings)
        .where(hasCode)
        .limit(1);
  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        if (!(await lockUser(tx, userId))) return null;
        const code = {
          referralCode: mintCode(),
          referralDeviceIds: deviceId ? [deviceId] : [],
          referralCodeAt: now,
        };
        // Only an account without a code gets one; a request racing this one may have made it first.
        const [created] = await tx
          .insert(userSettings)
          .values({ userId, ...code, updatedAt: now })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: code,
            setWhere: isNull(userSettings.referralCode),
          })
          .returning({ code: userSettings.referralCode });
        if (created?.code) return created.code;
        const [raced] = await tx
          .select({ code: userSettings.referralCode })
          .from(userSettings)
          .where(eq(userSettings.userId, userId));
        return raced?.code ?? null;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Couldn't mint a unique invite code");
}

// Read only, so a visit to someone's public page never makes them a code.
async function referralCodeOf(userId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ code: userSettings.referralCode })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.code ?? null;
}

// Never fails the page it's for: without a code the link just goes home.
export async function ownerHomeLink(ownerId: string): Promise<string> {
  try {
    return homeLinkFor(await referralCodeOf(ownerId));
  } catch (error) {
    log.warn("referral.owner_code_failed", {}, error);
    return homeLinkFor(null);
  }
}

// The invite an account joined through, on its own user_settings row; referred_by goes null when the inviter's account is deleted, which ends it.
type ReferralRow = { referredId: string; referrerId: string; status: ReferralStatus };

const REFERRAL = {
  referredId: userSettings.userId,
  referrerId: userSettings.referredBy,
  status: userSettings.referralStatus,
};

function toReferral(row: {
  referredId: string;
  referrerId: string | null;
  status: ReferralStatus | null;
}) {
  return row.referrerId === null || row.status === null
    ? null
    : { referredId: row.referredId, referrerId: row.referrerId, status: row.status };
}

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
    .from(userSettings)
    .where(
      and(eq(userSettings.referredBy, row.referrerId), eq(userSettings.referralStatus, "rewarded")),
    );
  const status = (paid?.n ?? 0) < MAX_REWARDED_REFERRALS ? "rewarded" : "capped";
  const friendPeriod = await periodForUser(tx, row.referredId, now);
  if (!friendPeriod) return false;
  const [updated] = await tx
    .update(userSettings)
    .set({
      referralStatus: status,
      referralRewardedPeriod: friendPeriod.key,
      referralRewardedAt: now,
    })
    .where(
      and(
        eq(userSettings.userId, row.referredId),
        eq(userSettings.referredBy, row.referrerId),
        eq(userSettings.referralStatus, "pending"),
      ),
    )
    .returning({ status: userSettings.referralStatus });
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
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(
      and(
        eq(userSettings.userId, referrer.id),
        sql`${deviceId}::text = any(${userSettings.referralDeviceIds})`,
      ),
    )
    .limit(1);
  if (ownDevice) return "same_device";
  const [usedDevice] = await tx
    .select({ id: userSettings.userId })
    .from(userSettings)
    .where(
      and(eq(userSettings.referredBy, referrer.id), eq(userSettings.referralDeviceId, deviceId)),
    )
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
  const [stored] = await db
    .select(REFERRAL)
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), isNotNull(userSettings.referredBy)))
    .limit(1);
  const linked = stored ? toReferral(stored) : null;
  if (linked) return settleExisting(linked, checked, now);

  const [owner] = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.referralCode, code))
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
    const invite = {
      referredBy: referrerId,
      referralStatus: reason ? ("blocked" as const) : ("pending" as const),
      referralBlockedReason: reason,
      referralDeviceId: deviceId,
      referralRewardedPeriod: null,
      referralRewardedAt: null,
      referredAt: now,
    };
    // Nobody is invited twice: only an account not already linked to a live invite takes this one.
    const [claimed] = await tx
      .insert(userSettings)
      .values({ userId, ...invite, updatedAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: invite,
        setWhere: isNull(userSettings.referredBy),
      })
      .returning(REFERRAL);
    const row = claimed ? toReferral(claimed) : null;
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

// The signed-in account's own row gives the period, so the counts read beside the code, not after it.
export async function referralSummary(
  user: PeriodAccount,
  deviceId: string | null,
  now = Date.now(),
): Promise<ReferralSummary | null> {
  const userId = user.id;
  const db = await getDb();
  const period = resolvePeriod(user, now);
  const [code, byStatus, extras] = await Promise.all([
    ensureReferralCode(userId, deviceId, now),
    db
      .select({ status: userSettings.referralStatus, n: count() })
      .from(userSettings)
      .where(eq(userSettings.referredBy, userId))
      .groupBy(userSettings.referralStatus),
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
  if (!code) return null;
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
