import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import type { ApiErrorBody } from "@/lib/api/types";
import {
  AUTH_COOKIE,
  cookieJar,
  fakeAuth,
  resetDb,
  signInAs,
  supabaseAdminMock,
} from "@/lib/auth/test-helpers";
import { consumeUsage } from "@/lib/usage";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing")>()),
  billingMode: () => "mock",
}));

const COULDNT_LOAD = {
  ok: false,
  error: { code: "server_error", message: "Couldn't load your account. Please try again." },
};

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/me when something fails", () => {
  it("answers 500 during a Supabase outage and keeps the visitor signed in for the retry", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await signInAs("ada@example.com");
    const token = cookieJar.get(AUTH_COOKIE)?.value;
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));

    const res = await GET();
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual(COULDNT_LOAD);
    expect(cookieJar.get(AUTH_COOKIE)?.value).toBe(token);
    expect(warn).toHaveBeenCalledWith("[warn] auth.get_user_failed", expect.anything());
    expect(errors).toHaveBeenCalledWith("[error] me.failed", expect.anything());

    const retry = await GET();
    expect(retry.status).toBe(200);
    expect((await retry.json()).user).toMatchObject({ id: user.id, email: "ada@example.com" });
  });

  it("treats Supabase rate limiting as an outage, not a sign-out", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    await signInAs("ada@example.com");
    fakeAuth.failNext(
      "getUser",
      new AuthApiError("Too many requests", 429, "over_request_rate_limit"),
    );

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual(COULDNT_LOAD);
    expect(cookieJar.get(AUTH_COOKIE)?.value).toBeTruthy();
  });

  it("answers 500 without the database's error when usage can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await signInAs("ada@example.com");
    vi.spyOn(await getDb(), "select").mockImplementation(() => {
      throw new Error('relation "usage" does not exist at 10.0.0.12:5432');
    });

    const res = await GET();
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as ApiErrorBody;
    expect(body).toEqual(COULDNT_LOAD);
    expect(JSON.stringify(body)).not.toContain("5432");
  });

  it("signs out a session whose account was deleted in Supabase", async () => {
    const user = await signInAs("ada@example.com");
    const admin = supabaseAdminMock.createSupabaseAdminClient();
    expect((await admin!.auth.admin.deleteUser(user.id)).error).toBeNull();

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, user: null, usage: null, aiBudget: null });
  });
});

describe("GET /api/me with more than one account", () => {
  it("shows each signed-in person only their own account and usage", async () => {
    const ada = await signInAs("ada@example.com");
    const adaToken = cookieJar.get(AUTH_COOKIE)?.value ?? "";
    await consumeUsage(ada, "fix");
    await consumeUsage(ada, "fix");

    const bob = await signInAs("bob@example.com");
    const asBob = await (await GET()).json();
    expect(asBob.user).toMatchObject({ id: bob.id, email: "bob@example.com" });
    expect(asBob.usage.fix.used).toBe(0);

    cookieJar.set(AUTH_COOKIE, adaToken);
    const asAda = await (await GET()).json();
    expect(asAda.user).toMatchObject({ id: ada.id, email: "ada@example.com" });
    expect(asAda.usage.fix.used).toBe(2);
  });
});
