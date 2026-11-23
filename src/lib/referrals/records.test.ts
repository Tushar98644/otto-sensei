import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { getDb } from "@/db/client";
import { users, userSettings } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { addMonths, consumeUsage, getUsage } from "@/lib/usage";
import { claimReferral, ensureReferralCode, referralSummary } from "./records";
import { CLAIM_WINDOW_MS, MAX_REWARDED_REFERRALS, REFERRAL_BONUS } from "./referrals";

const NOV = Date.UTC(2026, 10, 15, 12);
const DEC = Date.UTC(2026, 11, 2, 12);
const OWNER_DEVICE = "11111111-1111-4111-8111-111111111111";

let sequence = 0;
const device = () => `22222222-2222-4222-8222-${String(++sequence).padStart(12, "0")}`;

let owner: SessionUser;
let code: string;

async function friend(
  email = `friend${++sequence}@example.com`,
  createdAt = NOV,
): Promise<SessionUser> {
  return createUser(email, createdAt);
}

async function statusOf(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return row?.referredBy
    ? { status: row.referralStatus, blockedReason: row.referralBlockedReason }
    : null;
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://otto.example");
  resetEnvForTests();
  await resetDb();
  owner = await createUser("ada.lovelace@gmail.com", NOV - 30 * CLAIM_WINDOW_MS);
  const made = await ensureReferralCode(owner.id, OWNER_DEVICE, NOV);
  if (!made) throw new Error("no code");
  code = made;
});

const onPro = (user: SessionUser): SessionUser => ({ ...user, plan: "pro" });

describe("ensureReferralCode", () => {
  it("makes one code per account and keeps it", async () => {
    expect(await ensureReferralCode(owner.id, null, NOV)).toBe(code);
    expect(await ensureReferralCode(owner.id, device(), NOV)).toBe(code);
    const other = await createUser("grace@example.com", NOV);
    expect(await ensureReferralCode(other.id, null, NOV)).not.toBe(code);
  });

  it("remembers the newest 10 browsers, the latest last", async () => {
    const seen = Array.from({ length: 12 }, device);
    for (const id of seen) await ensureReferralCode(owner.id, id, NOV);
    await ensureReferralCode(owner.id, seen[5] ?? "", NOV);
    const db = await getDb();
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, owner.id));
    expect(row?.referralDeviceIds).toHaveLength(10);
    expect(row?.referralDeviceIds.at(-1)).toBe(seen[5]);
    expect(row?.referralDeviceIds).not.toContain(OWNER_DEVICE);
    expect(row?.referralDeviceIds).not.toContain(seen[0]);
  });

  it("gives nothing to an account that's gone", async () => {
    expect(await ensureReferralCode(crypto.randomUUID(), null, NOV)).toBeNull();
  });
});

describe("claimReferral", () => {
  it("links a new account, then pays both on the first check", async () => {
    const maya = await friend();
    expect(
      await claimReferral({ userId: maya.id, code, deviceId: device(), checked: false }, NOV),
    ).toBe("pending");
    expect(await statusOf(maya.id)).toEqual({ status: "pending", blockedReason: null });
    expect((await getUsage(onPro(maya), NOV)).fix.limit).toBe(PLANS.pro.limits.fix);

    expect(await claimReferral({ userId: maya.id, code, deviceId: null, checked: true }, NOV)).toBe(
      "rewarded",
    );
    for (const person of [maya, owner]) {
      const usage = await getUsage(onPro(person), NOV);
      expect(usage.fix.limit).toBe(PLANS.pro.limits.fix + REFERRAL_BONUS.fix);
      expect(usage.tailor.limit).toBe(PLANS.pro.limits.tailor + REFERRAL_BONUS.tailor);
      expect(usage.letter.limit).toBe(PLANS.pro.limits.letter);
    }
    expect(await getUsage(maya, NOV)).toMatchObject({
      fix: { used: 0, limit: PLANS.free.limits.fix + REFERRAL_BONUS.fix },
      tailor: { used: 0, limit: 0 },
      letter: { used: 0, limit: 0 },
    });
    expect((await getUsage(onPro(owner), DEC)).fix.limit).toBe(PLANS.pro.limits.fix);
    expect(await claimReferral({ userId: maya.id, code, deviceId: null, checked: true }, NOV)).toBe(
      "already",
    );
    expect((await getUsage(onPro(owner), NOV)).fix.limit).toBe(
      PLANS.pro.limits.fix + REFERRAL_BONUS.fix,
    );
  });

  it("pays at once when the check ran before sign-up", async () => {
    const maya = await friend();
    expect(
      await claimReferral({ userId: maya.id, code, deviceId: device(), checked: true }, NOV),
    ).toBe("rewarded");
    expect(await statusOf(maya.id)).toMatchObject({ status: "rewarded" });
  });

  it("lets the bonus through the one-statement allowance check, exactly", async () => {
    const maya = await friend();
    await claimReferral({ userId: maya.id, code, deviceId: device(), checked: true }, NOV);
    const limit = PLANS.pro.limits.tailor + REFERRAL_BONUS.tailor;
    const results = await Promise.all(
      Array.from({ length: limit + 4 }, () => consumeUsage(onPro(maya), "tailor", NOV)),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(limit);
    expect((await getUsage(onPro(maya), NOV)).tailor).toEqual({ used: limit, limit });
  });

  it("lets a Free friend and a Free inviter spend the line fix extras, while tailoring stays with Pro", async () => {
    const maya = await friend();
    await claimReferral({ userId: maya.id, code, deviceId: device(), checked: true }, NOV);
    const fixes = PLANS.free.limits.fix + REFERRAL_BONUS.fix;
    for (const person of [maya, owner]) {
      for (let i = 0; i < fixes; i++)
        expect((await consumeUsage(person, "fix", NOV)).allowed).toBe(true);
      const spent = await consumeUsage(person, "fix", NOV);
      expect(spent.allowed).toBe(false);
      expect(spent.usage.fix).toEqual({ used: fixes, limit: fixes });
      expect((await consumeUsage(person, "tailor", NOV)).allowed).toBe(false);
    }
  });

  it("adds a bonus on top of what's already used this month", async () => {
    for (let i = 0; i < PLANS.pro.limits.tailor; i++)
      await consumeUsage(onPro(owner), "tailor", NOV);
    expect((await consumeUsage(onPro(owner), "tailor", NOV)).allowed).toBe(false);
    await claimReferral(
      { userId: (await friend()).id, code, deviceId: device(), checked: true },
      NOV,
    );
    expect((await consumeUsage(onPro(owner), "tailor", NOV)).allowed).toBe(true);
  });

  it("refuses your own code, unknown codes and old accounts", async () => {
    expect(
      await claimReferral({ userId: owner.id, code, deviceId: device(), checked: true }, NOV),
    ).toBe("self");
    const maya = await friend();
    expect(
      await claimReferral(
        { userId: maya.id, code: "zzzz9999", deviceId: null, checked: true },
        NOV,
      ),
    ).toBe("unknown_code");
    const old = await friend(undefined, NOV - CLAIM_WINDOW_MS - 1);
    expect(
      await claimReferral({ userId: old.id, code, deviceId: device(), checked: true }, NOV),
    ).toBe("existing_account");
    expect(await statusOf(old.id)).toBeNull();
    expect((await getUsage(onPro(owner), NOV)).fix.limit).toBe(PLANS.pro.limits.fix);
  });

  it("blocks the inviter's own mailbox under another spelling", async () => {
    const alias = await friend("adalovelace+2@googlemail.com");
    expect(
      await claimReferral({ userId: alias.id, code, deviceId: device(), checked: true }, NOV),
    ).toBe("blocked");
    expect(await statusOf(alias.id)).toEqual({ status: "blocked", blockedReason: "same_person" });
    expect((await getUsage(onPro(alias), NOV)).fix.limit).toBe(PLANS.pro.limits.fix);
  });

  it("blocks the inviter's browser, and a second friend from one browser", async () => {
    const fromOwnBrowser = await friend();
    expect(
      await claimReferral(
        { userId: fromOwnBrowser.id, code, deviceId: OWNER_DEVICE, checked: true },
        NOV,
      ),
    ).toBe("blocked");
    expect(await statusOf(fromOwnBrowser.id)).toEqual({
      status: "blocked",
      blockedReason: "same_device",
    });

    const shared = device();
    expect(
      await claimReferral(
        { userId: (await friend()).id, code, deviceId: shared, checked: true },
        NOV,
      ),
    ).toBe("rewarded");
    const second = await friend();
    expect(
      await claimReferral({ userId: second.id, code, deviceId: shared, checked: true }, NOV),
    ).toBe("blocked");
    expect((await getUsage(onPro(owner), NOV)).fix.limit).toBe(
      PLANS.pro.limits.fix + REFERRAL_BONUS.fix,
    );
  });

  it("stops paying the inviter after the cap, but still pays the friend", async () => {
    const friends = await Promise.all(
      Array.from({ length: MAX_REWARDED_REFERRALS + 2 }, () => friend()),
    );
    const outcomes = await Promise.all(
      friends.map((person) =>
        claimReferral({ userId: person.id, code, deviceId: device(), checked: true }, NOV),
      ),
    );
    expect(outcomes.every((outcome) => outcome === "rewarded")).toBe(true);
    const summary = await referralSummary(owner, null, NOV);
    expect(summary).toMatchObject({
      joined: MAX_REWARDED_REFERRALS + 2,
      checked: MAX_REWARDED_REFERRALS + 2,
      rewarded: MAX_REWARDED_REFERRALS,
      thisPeriod: {
        fix: MAX_REWARDED_REFERRALS * REFERRAL_BONUS.fix,
        tailor: MAX_REWARDED_REFERRALS * REFERRAL_BONUS.tailor,
      },
      period: "month",
    });
    const last = friends.at(-1);
    if (!last) throw new Error("no friends");
    expect((await getUsage(onPro(last), NOV)).fix.limit).toBe(
      PLANS.pro.limits.fix + REFERRAL_BONUS.fix,
    );
  });

  it("credits an account to one inviter only", async () => {
    const other = await createUser("grace@example.com", NOV);
    const otherCode = await ensureReferralCode(other.id, null, NOV);
    const maya = await friend();
    await claimReferral({ userId: maya.id, code, deviceId: device(), checked: false }, NOV);
    expect(
      await claimReferral(
        { userId: maya.id, code: otherCode ?? "", deviceId: device(), checked: true },
        NOV,
      ),
    ).toBe("rewarded");
    expect((await getUsage(onPro(owner), NOV)).fix.limit).toBe(
      PLANS.pro.limits.fix + REFERRAL_BONUS.fix,
    );
    expect((await getUsage(onPro(other), NOV)).fix.limit).toBe(PLANS.pro.limits.fix);
  });
});

describe("referralSummary", () => {
  it("shows the link and counts, never blocked sign-ups", async () => {
    await claimReferral(
      { userId: (await friend()).id, code, deviceId: device(), checked: false },
      NOV,
    );
    await claimReferral(
      { userId: (await friend()).id, code, deviceId: device(), checked: true },
      NOV,
    );
    await claimReferral(
      { userId: (await friend()).id, code, deviceId: OWNER_DEVICE, checked: true },
      NOV,
    );
    expect(await referralSummary(owner, null, NOV)).toEqual({
      code,
      url: `https://otto.example/?ref=${code}`,
      joined: 2,
      checked: 1,
      rewarded: 1,
      maxRewarded: MAX_REWARDED_REFERRALS,
      perFriend: REFERRAL_BONUS,
      thisPeriod: REFERRAL_BONUS,
      period: "month",
    });
  });

  it("puts a yearly subscriber's extras on their month of the year, and the friend's on their month", async () => {
    const yearStart = Date.UTC(2026, 0, 31, 9, 30);
    const yearly = {
      plan: "pro",
      planInterval: "year",
      planPeriodStartsAt: yearStart,
      planPeriodEndsAt: addMonths(yearStart, 12),
      planRenewsAt: addMonths(yearStart, 12),
    } as const;
    const db = await getDb();
    await db.update(users).set(yearly).where(eq(users.id, owner.id));
    const yearlyOwner: SessionUser = { ...owner, ...yearly };
    const maya = await friend();
    expect(
      await claimReferral({ userId: maya.id, code, deviceId: device(), checked: true }, NOV),
    ).toBe("rewarded");

    expect((await getUsage(yearlyOwner, NOV)).fix.limit).toBe(
      PLANS.pro.limits.fix + REFERRAL_BONUS.fix,
    );
    expect((await getUsage(onPro(maya), NOV)).fix.limit).toBe(
      PLANS.pro.limits.fix + REFERRAL_BONUS.fix,
    );
    expect(await referralSummary(yearlyOwner, null, NOV)).toMatchObject({
      thisPeriod: REFERRAL_BONUS,
      period: "month",
    });
    const nextMonth = Date.UTC(2026, 10, 30, 9, 30);
    expect((await getUsage(yearlyOwner, nextMonth)).fix.limit).toBe(PLANS.pro.limits.fix);
  });
});
