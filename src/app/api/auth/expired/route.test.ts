import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession } from "@/lib/auth/session";
import { AUTH_COOKIE, cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function request(next?: string) {
  const url = new URL("https://otto.test/api/auth/expired");
  if (next !== undefined) url.searchParams.set("next", next);
  return new NextRequest(url);
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("GET /api/auth/expired", () => {
  it("clears a dead cookie and sends the visitor to sign in, then back", async () => {
    await signInAs("ada@example.com");
    const token = cookieJar.get(AUTH_COOKIE)?.value ?? "";
    await clearSession();
    cookieJar.set(AUTH_COOKIE, token);

    const res = await GET(request("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://otto.test/login?next=%2Fdashboard");
    expect(cookieJar.get(AUTH_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
  });

  it("never touches a working session", async () => {
    await signInAs("ada@example.com");
    const res = await GET(request("/dashboard"));
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard");
    expect(cookieJar.get(AUTH_COOKIE)?.value).not.toBe("");
  });

  it("keeps the asked-for page and its query on the way to sign in", async () => {
    const res = await GET(request("/dashboard/jobs?resume=r1"));
    expect(res.headers.get("location")).toBe(
      "https://otto.test/login?next=%2Fdashboard%2Fjobs%3Fresume%3Dr1",
    );
  });

  it("only redirects within the site", async () => {
    const res = await GET(request("https://evil.example/phish"));
    expect(res.headers.get("location")).toBe("https://otto.test/login?next=%2Fdashboard");
  });
});
