import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentAccount, getCurrentUser } from "@/lib/auth/session";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
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

describe("GET /auth/callback after Connect GitHub", () => {
  const back = "next=%2Fstudio%3Fstep%3Dfix%26github%3Dr1&link=github";

  it("links GitHub to the signed-in account and goes back to the page", async () => {
    const ada = await signInAs("ada@example.com");
    startedGoogleSignIn();
    const res = await callback(`code=${fakeAuth.issueLinkCode(ada.id, "AdaCodes")}&${back}`);
    expect(res.headers.get("location")).toBe("https://otto.test/studio?step=fix&github=r1");
    const account = await getCurrentAccount();
    expect(account?.user.id).toBe(ada.id);
    expect(account?.github).toEqual({ login: "AdaCodes", canDisconnect: true });
  });

  it("goes back to the page saying why when GitHub belongs to another account", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const ada = await signInAs("ada@example.com");
    const res = await callback(`${back}&error=server_error&error_code=identity_already_exists`);
    expect(res.headers.get("location")).toBe("https://otto.test/studio?step=fix&github=r1&github_error=taken");
    expect((await getCurrentUser())?.id).toBe(ada.id);
  });

  it("adds no message when the person cancelled at GitHub, and a plain one for anything else", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await signInAs("ada@example.com");
    const cancelled = await callback(`${back}&error=access_denied`);
    expect(cancelled.headers.get("location")).toBe("https://otto.test/studio?step=fix&github=r1");
    const stale = await callback(`${back}&code=used-already`);
    expect(stale.headers.get("location")).toContain("github_error=failed");
  });
});

// The app only links GitHub, but once the provider is on, a GitHub sign-in can be started by hand
// (Supabase's authorize URL). It is treated like any new sign-in.
describe("GET /auth/callback after a GitHub sign-in started by hand", () => {
  it("makes an ordinary free account connected to that GitHub account", async () => {
    startedGoogleSignIn();
    const res = await callback(`code=${fakeAuth.issueOAuthCode("Dev@Example.com", { github: "newdev" })}`);
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard");
    const account = await getCurrentAccount();
    expect(account?.user).toMatchObject({ email: "dev@example.com", plan: "free" });
    expect(account?.github).toEqual({ login: "newdev", canDisconnect: false });
  });

  it("lands in the existing account with that verified email, as Supabase links them", async () => {
    const ada = await signInAs("ada@example.com");
    cookieJar.clear();
    startedGoogleSignIn();
    await callback(`code=${fakeAuth.issueOAuthCode("ada@example.com", { github: "adacodes" })}`);
    const account = await getCurrentAccount();
    expect(account?.user.id).toBe(ada.id);
    expect(account?.github).toEqual({ login: "adacodes", canDisconnect: true });
  });
});
