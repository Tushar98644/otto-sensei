import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, fakeAuth, jsonRequest, resetDb } from "@/lib/auth/test-helpers";
import { POST as requestCode } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

// config.ts lists only English as live today; Spanish stands in for a language once it goes live.
vi.mock("@/i18n/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/i18n/config")>();
  const live = new Set(["en", "es"]);
  return { ...real, isEnabledLocale: (value: unknown) => real.isLocale(value) && live.has(value) };
});

const ask = (body: Record<string, unknown>, ip = "203.0.113.7") =>
  requestCode(jsonRequest("/api/auth/request-code", body, { ip }));

describe("the language of a new account's code email", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("sends Supabase exactly what it always did for English", async () => {
    expect((await ask({ email: "ada@example.com" })).status).toBe(200);
    expect((await ask({ email: "bo@example.com", locale: "en" }, "203.0.113.8")).status).toBe(200);
    expect(fakeAuth.sent.map((sent) => sent.data)).toEqual([undefined, undefined]);
  });

  it("takes the sign-in page's live language, else the app's cookie", async () => {
    await ask({ email: "ada@example.com", locale: "es" });
    cookieJar.set("otto_lang", "es");
    await ask({ email: "bo@example.com" }, "203.0.113.8");
    expect(fakeAuth.sent.map((sent) => sent.data)).toEqual([
      { otto_locale: "es" },
      { otto_locale: "es" },
    ]);
  });

  it("ignores a language that isn't live or isn't one, and still sends the code", async () => {
    for (const [index, locale] of ["fr", "xx", 7, "es".repeat(20)].entries()) {
      const res = await ask(
        { email: `user${index}@example.com`, locale },
        `203.0.113.${20 + index}`,
      );
      expect(res.status).toBe(200);
    }
    expect(fakeAuth.sent.map((sent) => sent.data)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});
