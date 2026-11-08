import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/session";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb } from "@/lib/auth/test-helpers";
import { findUserById } from "@/lib/users";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const callback = (query: string) => GET(new NextRequest(`https://otto.test/auth/callback?${query}`));

// What the browser holds after POST /api/auth/google.
function startedGoogleSignIn() {
  cookieJar.set(`${AUTH_COOKIE}-code-verifier`, "verifier");
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("GET /auth/callback", () => {
  it("signs in, creates the free account and goes where the sign-in started", async () => {
    startedGoogleSignIn();
    const res = await callback(`code=${fakeAuth.issueOAuthCode("Ada@Gmail.com")}&next=%2Fstudio%3Fstep%3Dtailor`);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://otto.test/studio?step=tailor");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const user = await getCurrentUser();
    expect(user).toMatchObject({ email: "ada@gmail.com", plan: "free" });
    expect(await findUserById(user?.id ?? "")).not.toBeNull();
  });

  it("defaults to the dashboard and never leaves the site", async () => {
    startedGoogleSignIn();
    const res = await callback(`code=${fakeAuth.issueOAuthCode("ada@gmail.com")}&next=https://evil.example`);
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard");
  });

  it("sends someone who cancelled at Google back to sign in with a note", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await callback("error=access_denied&error_description=denied&next=%2Fstudio");
    expect(res.headers.get("location")).toBe("https://otto.test/login?next=%2Fstudio&error=google");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("treats a reused code, or one from another browser, as a failed sign-in", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const code = fakeAuth.issueOAuthCode("ada@gmail.com");
    const noVerifier = await callback(`code=${code}`);
    expect(noVerifier.headers.get("location")).toBe("https://otto.test/login?next=%2Fdashboard&error=google");
    startedGoogleSignIn();
    expect((await callback(`code=${code}`)).headers.get("location")).toBe("https://otto.test/dashboard");
    startedGoogleSignIn();
    expect((await callback(`code=${code}`)).headers.get("location")).toContain("error=google");
  });
});
