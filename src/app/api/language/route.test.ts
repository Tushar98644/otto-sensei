import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { saveLanguage } from "@/lib/account/language";
import { cookieJar, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { deleteUserData } from "@/lib/users";
import { PUT } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function put(payload: unknown, headers: Record<string, string> = {}) {
  return PUT(
    new Request("http://localhost/api/language", {
      method: "PUT",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(payload),
    }),
  );
}

async function storedLocale(userId: string): Promise<string | null | undefined> {
  const [row] = await (
    await getDb()
  )
    .select({ locale: userSettings.locale })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row?.locale;
}

const codeOf = async (res: Response) => ((await res.json()) as ApiErrorBody).error.code;

describe("/api/language", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("refuses other sites, form posts and signed-out visitors", async () => {
    expect((await put({ locale: "en" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await put({ locale: "en" }, { "content-type": "text/plain" })).status).toBe(415);
    const signedOut = await put({ locale: "en" });
    expect(signedOut.status).toBe(401);
    expect(signedOut.headers.get("cache-control")).toBe("no-store");
    expect(cookieJar.get("otto_lang")).toBeUndefined();
  });

  it("saves the account's language and sets the cookie the proxy reads", async () => {
    const user = await signInAs();
    expect(await storedLocale(user.id)).toBeUndefined();
    const res = await put({ locale: "en" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, locale: "en" });
    expect(await storedLocale(user.id)).toBe("en");
    expect(cookieJar.get("otto_lang")).toMatchObject({
      value: "en",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  });

  it("takes only a language that is live, and nothing else in the body", async () => {
    const user = await signInAs();
    for (const body of [
      { locale: "pt-br" },
      { locale: "es-MX" },
      { locale: "xx" },
      {},
      { locale: "en", extra: 1 },
    ]) {
      const res = await put(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(await codeOf(res)).toBe("bad_request");
    }
    expect(await storedLocale(user.id)).toBeUndefined();
    expect(cookieJar.get("otto_lang")).toBeUndefined();
  });

  it("limits how often it changes", async () => {
    await signInAs();
    for (let i = 0; i < 30; i++) expect((await put({ locale: "en" })).status).toBe(200);
    const limited = await put({ locale: "en" });
    expect(limited.status).toBe(429);
    expect(await codeOf(limited)).toBe("rate_limited");
  });

  it("tells Supabase, so the sign-in code email speaks it too", async () => {
    const user = await signInAs();
    await put({ locale: "en" });
    expect(fakeAuth.metadataOf(user.id)).toEqual({ otto_locale: "en" });
  });

  it("still saves the language when Supabase can't take it", async () => {
    const user = await signInAs();
    fakeAuth.failNext("updateUserById", new AuthRetryableFetchError("offline", 0));
    const res = await put({ locale: "en" });
    expect(res.status).toBe(200);
    expect(await storedLocale(user.id)).toBe("en");
    expect(fakeAuth.metadataOf(user.id)).toBeUndefined();
  });

  it("goes with the account, and refuses to write for a deleted one", async () => {
    const user = await signInAs();
    await put({ locale: "en" });
    await deleteUserData(user.id);
    expect(await storedLocale(user.id)).toBeUndefined();
    expect(await saveLanguage(user.id, "en")).toBe(false);
  });
});
