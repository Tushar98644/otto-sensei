import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { and, eq, isNotNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { rateLimits, userSettings } from "@/db/schema";
import type { ApiErrorBody, ReferralClaimResponse, ReferralSummaryResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { cookieJar, createUser, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { ensureReferralCode } from "@/lib/referrals/records";
import { CLAIM_WINDOW_MS, REF_COOKIE } from "@/lib/referrals/referrals";
import { deleteUserData } from "@/lib/users";
import { POST as claim } from "./claim/route";
import { GET as summary } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getCurrentUser: vi.fn(actual.getCurrentUser) };
});

const HOUR = 60 * 60 * 1_000;
// A quarter past the hour, so the claim limit's window has 45 minutes left.
const QUARTER_PAST = Date.UTC(2026, 10, 21, 10, 15);

function claimRequest(body: unknown = {}, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/referrals/claim", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function outcomeOf(res: Response): Promise<ReferralClaimResponse["outcome"]> {
  return ((await res.json()) as ReferralClaimResponse).outcome;
}

// The invite as the referrals table kept it, from the friend's user_settings row.
async function referralOf(userId: string) {
  const [row] = await (
    await getDb()
  )
    .select({
      referrerId: userSettings.referredBy,
      status: userSettings.referralStatus,
      blockedReason: userSettings.referralBlockedReason,
      deviceId: userSettings.referralDeviceId,
      rewardedPeriod: userSettings.referralRewardedPeriod,
    })
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), isNotNull(userSettings.referredBy)));
  return row ?? null;
}

async function codeRowOf(userId: string) {
  const [row] = await (
    await getDb()
  )
    .select({ code: userSettings.referralCode, deviceIds: userSettings.referralDeviceIds })
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), isNotNull(userSettings.referralCode)));
  return row ?? null;
}

async function inviter(email = "ada@example.com"): Promise<{ id: string; code: string }> {
  const owner = await createUser(email, Date.now() - 30 * 24 * HOUR);
  const code = await ensureReferralCode(owner.id, crypto.randomUUID());
  if (!code) throw new Error("no code");
  return { id: owner.id, code };
}

// The account is deleted from another tab after this request's session check passed.
function deleteAccountAfterSessionCheck(): void {
  const real = vi.mocked(getCurrentUser).getMockImplementation();
  if (!real) throw new Error("getCurrentUser has no implementation");
  vi.mocked(getCurrentUser).mockImplementationOnce(async () => {
    const user = await real();
    if (user) await deleteUserData(user.id);
    return user;
  });
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://otto.example");
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("GET /api/referrals", () => {
  it("tells a signed-out visitor to sign in, and mints no code", async () => {
    const res = await summary();
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to get your invite link.",
    });
    expect(
      await (await getDb()).select().from(userSettings).where(isNotNull(userSettings.referralCode)),
    ).toHaveLength(0);
  });

  it("answers 401, not an error, when the account is deleted mid-request, and leaves no code behind", async () => {
    const ada = await signInAs("ada@example.com");
    deleteAccountAfterSessionCheck();
    const res = await summary();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await errorOf(res)).code).toBe("unauthorized");
    expect(await codeRowOf(ada.id)).toBeNull();
  });

  it("hides a sign-in outage behind a retry message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signInAs("ada@example.com");
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed at 10.0.0.7", 0));
    const res = await summary();
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: "server_error", message: "Couldn't load your invite link. Please try again." },
    });
    expect(text).not.toContain("10.0.0.7");
  });

  it("answers 500 when the database fails, then works on the next try", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ada = await signInAs("ada@example.com");
    vi.spyOn(await getDb(), "transaction").mockRejectedValueOnce(new Error("database is down"));
    expect((await summary()).status).toBe(500);
    expect(await codeRowOf(ada.id)).toBeNull();

    const res = await summary();
    expect(res.status).toBe(200);
    const { referrals: mine } = (await res.json()) as ReferralSummaryResponse;
    expect((await codeRowOf(ada.id))?.code).toBe(mine.code);
  });

  it("remembers each of the owner's browsers on their code", async () => {
    const ada = await signInAs("ada@example.com");
    await summary();
    const laptop = cookieJar.get("otto_did");
    expect(laptop).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });

    cookieJar.delete("otto_did");
    await summary();
    const phone = cookieJar.get("otto_did")?.value;
    expect(phone).toBeTruthy();
    expect(phone).not.toBe(laptop?.value);
    expect((await codeRowOf(ada.id))?.deviceIds).toEqual([laptop?.value, phone]);
  });

  it("counts joined, checked and rewarded friends, never blocked ones, with this period's extras", async () => {
    const owner = await inviter();
    await signInAs("maya@example.com");
    cookieJar.set(REF_COOKIE, `${owner.code}.c`);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("rewarded");

    const db = await getDb();
    const seeded = [
      { status: "pending" },
      { status: "pending" },
      { status: "capped", rewardedPeriod: "2026-11", rewardedAt: Date.now() },
      { status: "blocked", blockedReason: "same_device" },
    ] as const;
    for (const row of seeded) {
      const friend = await createUser(`${crypto.randomUUID()}@example.com`);
      const { status, ...rest } = row;
      await db.insert(userSettings).values({
        userId: friend.id,
        referredBy: owner.id,
        referralStatus: status,
        ...("blockedReason" in rest ? { referralBlockedReason: rest.blockedReason } : {}),
        ...("rewardedPeriod" in rest
          ? { referralRewardedPeriod: rest.rewardedPeriod, referralRewardedAt: rest.rewardedAt }
          : {}),
        referredAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    cookieJar.clear();
    await signInAs("ada@example.com");
    const { referrals: mine } = (await (await summary()).json()) as ReferralSummaryResponse;
    expect(mine).toMatchObject({ joined: 4, checked: 2, rewarded: 1, maxRewarded: 20 });
    expect(mine.thisPeriod).toEqual({ fix: 10, tailor: 2 });
  });
});

describe("POST /api/referrals/claim", () => {
  it("refuses another website's request before reading the cookie", async () => {
    const { code } = await inviter();
    cookieJar.set(REF_COOKIE, code);
    const maya = await signInAs("maya@example.com");
    const foreign: Record<string, string>[] = [
      { "sec-fetch-site": "cross-site" },
      { origin: "https://elsewhere.example" },
    ];
    for (const headers of foreign) {
      const res = await claim(claimRequest({}, headers));
      expect(res.status).toBe(403);
      expect((await errorOf(res)).code).toBe("forbidden");
    }
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(code);
    expect(await referralOf(maya.id)).toBeNull();
  });

  it("keeps the invite cookie for after sign-in when the visitor is signed out", async () => {
    const { code } = await inviter();
    cookieJar.set(REF_COOKIE, `${code}.c`);
    const res = await claim(claimRequest());
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({ code: "unauthorized", message: "Sign in first." });
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(`${code}.c`);
  });

  it("takes the code from the cookie only, never the body", async () => {
    const { code } = await inviter();
    const maya = await signInAs("maya@example.com");
    const res = await claim(claimRequest({ code }));
    expect(await res.json()).toEqual({ ok: true, outcome: "none" });
    expect(await referralOf(maya.id)).toBeNull();
  });

  it("allows 10 claims an hour per account, then says how long to wait without touching the cookie", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: QUARTER_PAST });
    const { code } = await inviter();
    const maya = await signInAs("maya@example.com");
    for (let i = 0; i < 10; i++) {
      expect(await outcomeOf(await claim(claimRequest()))).toBe("none");
    }

    cookieJar.set(REF_COOKIE, code);
    const res = await claim(claimRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("2700");
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "Too many tries. Try again in 45 minutes.",
    });
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(code);
    expect(await referralOf(maya.id)).toBeNull();

    cookieJar.clear();
    await signInAs("sam@example.com");
    expect((await claim(claimRequest())).status).toBe(200);

    vi.setSystemTime(QUARTER_PAST + HOUR);
    cookieJar.clear();
    await signInAs("maya@example.com");
    cookieJar.set(REF_COOKIE, code);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("pending");
    expect((await referralOf(maya.id))?.status).toBe("pending");
    const windows = await (
      await getDb()
    )
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, `referral:claim:${maya.id}`));
    expect(windows.map((row) => row.count).sort((a, b) => a - b)).toEqual([1, 11]);
  });

  it("answers 500 when the database fails, keeping the cookie so the next try links the friend", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const owner = await inviter();
    cookieJar.set(REF_COOKIE, owner.code);
    const maya = await signInAs("maya@example.com");
    vi.spyOn(await getDb(), "transaction").mockRejectedValueOnce(new Error("database is down"));

    const res = await claim(claimRequest());
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Something went wrong. Please try again.",
    });
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(owner.code);
    expect(await referralOf(maya.id)).toBeNull();

    expect(await outcomeOf(await claim(claimRequest()))).toBe("pending");
    expect(await referralOf(maya.id)).toMatchObject({ referrerId: owner.id, status: "pending" });
  });

  it("answers 500 during a sign-in outage", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signInAs("maya@example.com");
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const res = await claim(claimRequest());
    expect(res.status).toBe(500);
    expect((await errorOf(res)).code).toBe("server_error");
  });

  it("drops an invite that can never pay: the owner's own, an unknown code, or an old account's", async () => {
    const owner = await inviter();
    await signInAs("ada@example.com");
    cookieJar.set(REF_COOKIE, owner.code);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("self");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");

    await signInAs("maya@example.com");
    cookieJar.set(REF_COOKIE, "zzzz9999");
    expect(await outcomeOf(await claim(claimRequest()))).toBe("unknown_code");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");

    const old = await createUser("old@example.com", Date.now() - CLAIM_WINDOW_MS - HOUR);
    await signInAs("old@example.com");
    cookieJar.set(REF_COOKIE, `${owner.code}.c`);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("existing_account");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");
    expect(await referralOf(old.id)).toBeNull();
  });

  it("ignores a cookie that isn't an invite code", async () => {
    const maya = await signInAs("maya@example.com");
    for (const value of ["not-a-code", "abcdefgh.x", "abcdefgh.c.j"]) {
      cookieJar.set(REF_COOKIE, value);
      expect(await outcomeOf(await claim(claimRequest()))).toBe("none");
    }
    expect(await referralOf(maya.id)).toBeNull();
  });

  it("says already for a friend who was paid out, and pays no one twice", async () => {
    const owner = await inviter();
    const maya = await signInAs("maya@example.com");
    cookieJar.set(REF_COOKIE, `${owner.code}.c`);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("rewarded");

    const other = await inviter("grace@example.com");
    cookieJar.set(REF_COOKIE, `${other.code}.c`);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("already");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");
    expect(await referralOf(maya.id)).toMatchObject({ referrerId: owner.id, status: "rewarded" });
  });

  it("answers blocked when the friend uses the inviter's mailbox under another spelling", async () => {
    const owner = await inviter("ada.lovelace@gmail.com");
    const twin = await signInAs("adalovelace+otto@gmail.com");
    cookieJar.set(REF_COOKIE, owner.code);
    expect(await outcomeOf(await claim(claimRequest()))).toBe("blocked");
    expect(cookieJar.get(REF_COOKIE)?.value).toBe("");
    expect(await referralOf(twin.id)).toMatchObject({
      status: "blocked",
      blockedReason: "same_person",
    });
  });
});
