import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { getDb } from "@/db/client";
import { referrals } from "@/db/schema";
import { cookieJar, createUser, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { getUsage } from "@/lib/usage";
import { claimFromCookie, noteReferralCheck } from "./cookie";
import { ensureReferralCode } from "./records";
import { REF_COOKIE, REFERRAL_BONUS } from "./referrals";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

let owner: SessionUser;
let code: string;

async function linked(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(referrals).where(eq(referrals.referredId, userId));
  return row?.status ?? null;
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  owner = await createUser("owner@example.com", Date.now() - 60 * 24 * 60 * 60 * 1000);
  code = (await ensureReferralCode(owner.id, null)) ?? "";
});

describe("noteReferralCheck", () => {
  it("does nothing without an invite cookie", async () => {
    await noteReferralCheck();
    expect(cookieJar.has(REF_COOKIE)).toBe(false);
  });

  it("marks a signed-out check, which pays out at sign-up", async () => {
    cookieJar.set(REF_COOKIE, code);
    await noteReferralCheck();
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(`${code}.c`);
    expect(cookieJar.get(REF_COOKIE)?.httpOnly).toBe(false);

    const maya = await signInAs("maya@example.com");
    expect(await claimFromCookie(maya, { checked: false })).toBe("rewarded");
    expect(cookieJar.get(REF_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
    expect((await getUsage({ ...owner, plan: "pro" })).fix.limit).toBe(PLANS.pro.limits.fix + REFERRAL_BONUS.fix);
  });

  it("waits for the first check after sign-up, then pays once", async () => {
    cookieJar.set(REF_COOKIE, code);
    const maya = await signInAs("maya@example.com");
    expect(await claimFromCookie(maya, { checked: false })).toBe("pending");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(`${code}.j`);

    await noteReferralCheck();
    expect(await linked(maya.id)).toBe("rewarded");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");
    expect((await getUsage({ ...maya, plan: "pro" })).tailor.limit).toBe(
      PLANS.pro.limits.tailor + REFERRAL_BONUS.tailor,
    );
  });

  it("drops a cookie that can never pay", async () => {
    cookieJar.set(REF_COOKIE, "zzzz9999");
    const maya = await signInAs("maya@example.com");
    expect(await claimFromCookie(maya, { checked: false })).toBe("unknown_code");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");
  });

  it("never fails the check it runs after", async () => {
    cookieJar.set(REF_COOKIE, code);
    await signInAs("maya@example.com");
    const db = await getDb();
    vi.spyOn(db, "transaction").mockRejectedValueOnce(new Error("database is down"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(noteReferralCheck()).resolves.toBeUndefined();
    vi.restoreAllMocks();
  });
});
