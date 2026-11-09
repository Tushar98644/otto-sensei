import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { clearGitHubCache } from "@/lib/github/cache";
import { installFakeGitHub, json, rawPull, rawRepo, searchResult, type FakeGitHub } from "@/lib/github/testing";
import type { GitHubDraftResponse, GitHubLookupResponse } from "@/lib/github/types";
import { POST as draft } from "./draft/route";
import { GITHUB_LIMITS } from "./limits";
import { POST as lookup } from "./lookup/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

let github: FakeGitHub;

function standard(url: URL): Response | undefined {
  if (url.pathname === "/users/octocat/repos") {
    return json([rawRepo("octocat/ledger-lint", { description: "Flags rounding errors", stargazers_count: 40 })]);
  }
  if (url.pathname === "/search/issues") return json(searchResult([rawPull("vercel/next.js", 101, "octocat")]));
  return undefined;
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.GITHUB_TOKEN;
  resetEnvForTests();
  clearGitHubCache();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  github?.restore();
  resetEnvForTests();
});

describe("POST /api/github/lookup", () => {
  it("lists public work without any account", async () => {
    github = installFakeGitHub(standard);
    const res = await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GitHubLookupResponse;
    expect(body.profile.repos.map((repo) => repo.fullName)).toEqual(["octocat/ledger-lint"]);
    expect(body.profile.pulls.map((pull) => pull.number)).toEqual([101]);
  });

  it("turns away a name that isn't a GitHub username before calling GitHub", async () => {
    github = installFakeGitHub(standard);
    const res = await lookup(jsonRequest("/api/github/lookup", { username: "octocat/../../orgs" }));
    expect(res.status).toBe(400);
    expect(github.calls).toHaveLength(0);
  });

  it("says plainly when the account doesn't exist", async () => {
    github = installFakeGitHub(() => undefined);
    const res = await lookup(jsonRequest("/api/github/lookup", { username: "nobody-here" }));
    expect(res.status).toBe(404);
    expect((await errorOf(res)).message).toContain("nobody-here");
  });

  it("passes on GitHub's wait time when it is busy", async () => {
    github = installFakeGitHub(() => json({ message: "slow down" }, { status: 429, headers: { "retry-after": "90" } }));
    const res = await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("90");
  });

  it("limits lookups per device", async () => {
    github = installFakeGitHub(standard);
    for (let i = 0; i < GITHUB_LIMITS.lookup.device; i++) {
      expect((await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }))).status).toBe(200);
    }
    const res = await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("limits lookups per network across devices", async () => {
    github = installFakeGitHub(standard);
    for (let i = 0; i < GITHUB_LIMITS.lookup.ip; i++) {
      cookieJar.clear();
      await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }, { ip: "198.51.100.4" }));
    }
    cookieJar.clear();
    const res = await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }, { ip: "198.51.100.4" }));
    expect(res.status).toBe(429);
  });

  it("refuses requests that aren't JSON or come from another site", async () => {
    github = installFakeGitHub(standard);
    expect((await lookup(jsonRequest("/api/github/lookup", { username: "octocat" }, { contentType: "text/plain" }))).status).toBe(415);
    const crossSite = jsonRequest("/api/github/lookup", { username: "octocat" });
    crossSite.headers.set("sec-fetch-site", "cross-site");
    expect((await lookup(crossSite)).status).toBe(403);
    expect(github.calls).toHaveLength(0);
  });
});

describe("POST /api/github/draft", () => {
  // Drafting is an AI call: Pro, Max or the trial. Looking repos up stays free (above).
  beforeEach(async () => {
    await signInOnTrial("octo@example.com");
  });

  it("drafts entries and never touches a resume", async () => {
    github = installFakeGitHub(standard);
    const res = await draft(
      jsonRequest("/api/github/draft", { username: "octocat", repos: ["octocat/ledger-lint"], pulls: [9_000_101] }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as GitHubDraftResponse;
    expect(body.usedAI).toBe(false);
    expect(body.entries.map((entry) => entry.name)).toEqual(["ledger-lint", "Contributions to vercel/next.js"]);
    expect(body.entries[0]?.bullets).toContain("40 stars on GitHub");
  });

  it("answers 404 when nothing picked is still on GitHub", async () => {
    github = installFakeGitHub(standard);
    const res = await draft(jsonRequest("/api/github/draft", { username: "octocat", repos: ["octocat/gone"] }));
    expect(res.status).toBe(404);
  });

  it("asks for at least one pick and at most the caps", async () => {
    github = installFakeGitHub(standard);
    expect((await draft(jsonRequest("/api/github/draft", { username: "octocat", repos: [] }))).status).toBe(400);
    const tooMany = { username: "octocat", pulls: [1, 2, 3, 4, 5, 6, 7] };
    expect((await draft(jsonRequest("/api/github/draft", tooMany))).status).toBe(400);
    expect(github.calls).toHaveLength(0);
  });

  it("is part of Pro: signed out or on Free it answers 402 before calling GitHub", async () => {
    github = installFakeGitHub(standard);
    const body = { username: "octocat", repos: ["octocat/ledger-lint"] };
    cookieJar.clear();
    for (const signIn of [async () => null, () => signInAs("free@example.com")]) {
      await signIn();
      const res = await draft(jsonRequest("/api/github/draft", body));
      expect(res.status).toBe(402);
      expect(await errorOf(res)).toEqual({
        code: "upgrade_required",
        message: "GitHub drafts come with Pro. Try Pro free for 3 days.",
      });
    }
    expect(github.calls).toHaveLength(0);
  });
});
