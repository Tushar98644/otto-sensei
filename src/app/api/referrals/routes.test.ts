import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorBody, ReferralClaimResponse, ReferralSummaryResponse } from "@/lib/api/types";
import { cookieJar, createUser, jsonRequest, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { cleanResumePdf } from "@/lib/parse/test-fixtures";
import { ensureReferralCode } from "@/lib/referrals/records";
import { REF_COOKIE } from "@/lib/referrals/referrals";
import { POST as check } from "../check/route";
import { POST as claim } from "./claim/route";
import { GET as summary } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://otto.example");
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
});

describe("GET /api/referrals", () => {
  it("needs an account", async () => {
    const res = await summary();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns the same invite link every time", async () => {
    await signInAs("ada@example.com");
    const first = (await (await summary()).json()) as ReferralSummaryResponse;
    const again = (await (await summary()).json()) as ReferralSummaryResponse;
    expect(first.referrals.url).toBe(`https://otto.example/?ref=${first.referrals.code}`);
    expect(again.referrals.code).toBe(first.referrals.code);
    expect(first.referrals).toMatchObject({ joined: 0, checked: 0, rewarded: 0 });
  });

  it("treats the owner's own browser as the owner", async () => {
    await signInAs("ada@example.com");
    const { referrals } = (await (await summary()).json()) as ReferralSummaryResponse;
    // Same cookie jar, so the same otto_did device cookie signs up the "friend".
    cookieJar.set(REF_COOKIE, `${referrals.code}.c`);
    await signInAs("not-ada@example.com");
    const res = await claim(jsonRequest("/api/referrals/claim", {}));
    expect(((await res.json()) as ReferralClaimResponse).outcome).toBe("blocked");
  });
});

describe("POST /api/referrals/claim", () => {
  it("needs JSON and an account", async () => {
    expect(
      (await claim(jsonRequest("/api/referrals/claim", {}, { contentType: "text/plain" }))).status,
    ).toBe(415);
    const res = await claim(jsonRequest("/api/referrals/claim", {}));
    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe("unauthorized");
  });

  it("answers none without an invite cookie", async () => {
    await signInAs("maya@example.com");
    const res = await claim(jsonRequest("/api/referrals/claim", {}));
    expect(await res.json()).toEqual({ ok: true, outcome: "none" });
  });

  it("links a friend from another browser and keeps the cookie until a check", async () => {
    const owner = await createUser("ada@example.com", Date.now() - 30 * 24 * 60 * 60 * 1000);
    const code = await ensureReferralCode(owner.id, crypto.randomUUID());
    cookieJar.set(REF_COOKIE, code ?? "");
    await signInAs("maya@example.com");
    const res = await claim(jsonRequest("/api/referrals/claim", {}));
    expect(await res.json()).toEqual({ ok: true, outcome: "pending" });
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(`${code}.j`);
  });
});

describe("a resume check", () => {
  function upload(bytes: Uint8Array): Request {
    const form = new FormData();
    form.append("file", new File([new Uint8Array(bytes)], "resume.pdf"));
    return new Request("http://localhost/api/check", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.7" },
      body: form,
    });
  }

  it("marks the invite as checked before sign-up, then pays out on the claim", async () => {
    const owner = await createUser("ada@example.com", Date.now() - 30 * 24 * 60 * 60 * 1000);
    const code = await ensureReferralCode(owner.id, crypto.randomUUID());
    cookieJar.set(REF_COOKIE, code ?? "");
    expect((await check(upload(await cleanResumePdf()))).status).toBe(200);
    expect(cookieJar.get(REF_COOKIE)?.value).toBe(`${code}.c`);

    await signInAs("maya@example.com");
    const res = await claim(jsonRequest("/api/referrals/claim", {}));
    expect(await res.json()).toEqual({ ok: true, outcome: "rewarded" });
    const { referrals } = (await (
      await summaryAs("ada@example.com")
    ).json()) as ReferralSummaryResponse;
    expect(referrals).toMatchObject({ joined: 1, checked: 1, rewarded: 1 });
  });
});

async function summaryAs(email: string): Promise<Response> {
  await signInAs(email);
  return summary();
}
