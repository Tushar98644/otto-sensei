import type { UserIdentity } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { requestLoginCode, verifyLoginCode } from "./codes";
import { devGitHubConnection, githubConnectionOf } from "./github";
import { getCurrentAccount } from "./session";
import { cookieJar, resetDb } from "./test-helpers";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function identity(provider: string, data: Record<string, unknown>): UserIdentity {
  return { id: "1", identity_id: `${provider}-1`, user_id: "u1", provider, identity_data: data };
}

const email = identity("email", { email: "ada@example.com" });

describe("githubConnectionOf", () => {
  it("reads the login Supabase stored when GitHub was linked", () => {
    const github = identity("github", { user_name: "AdaCodes", preferred_username: "AdaCodes" });
    expect(githubConnectionOf({ identities: [email, github] })).toEqual({
      login: "AdaCodes",
      canDisconnect: true,
    });
    const preferredOnly = identity("github", { preferred_username: "ada" });
    expect(githubConnectionOf({ identities: [preferredOnly] })).toEqual({
      login: "ada",
      canDisconnect: false,
    });
  });

  it("is null without a GitHub identity, or with a login that isn't a GitHub username", () => {
    expect(githubConnectionOf({ identities: [email] })).toBeNull();
    expect(githubConnectionOf({ identities: undefined })).toBeNull();
    // Only identity_data from GitHub counts, never a name in the user's own metadata.
    expect(
      githubConnectionOf({ identities: [identity("google", { user_name: "octocat" })] }),
    ).toBeNull();
    expect(
      githubConnectionOf({ identities: [identity("github", { user_name: "../orgs" })] }),
    ).toBeNull();
  });
});

describe("dev sign-in's GitHub connection", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetEnvForTests();
  });

  function setEnv(nodeEnv: "development" | "production", login?: string, devAuth?: string) {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("DEV_GITHUB_LOGIN", login);
    vi.stubEnv("DEV_AUTH", devAuth);
    resetEnvForTests();
  }

  it("connects every dev account to DEV_GITHUB_LOGIN", async () => {
    setEnv("development", "octocat");
    const { devCode } = await requestLoginCode("ada@example.com", "198.51.100.7");
    await verifyLoginCode("ada@example.com", devCode ?? "");
    expect((await getCurrentAccount())?.github).toEqual({ login: "octocat", canDisconnect: false });
  });

  it("is off without the variable, with real Supabase sign-in, and always in production", () => {
    setEnv("development");
    expect(devGitHubConnection()).toBeNull();
    setEnv("development", "octocat", "supabase");
    expect(devGitHubConnection()).toBeNull();
    setEnv("production", "octocat");
    expect(devGitHubConnection()).toBeNull();
    setEnv("development", "not a name");
    expect(devGitHubConnection()).toBeNull();
  });
});
