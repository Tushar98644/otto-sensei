import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { fetchReadme, lookupProfile } from "./api";
import { clearGitHubCache } from "./cache";
import { GitHubError, MAX_CALLS_PER_REQUEST, newGitHubSession } from "./http";
import { installFakeGitHub, json, rawPull, rawRepo, searchResult, text, type FakeGitHub } from "./testing";

const REPOS = [
  rawRepo("octocat/small-tool", { stargazers_count: 3, description: "A tiny CLI" }),
  rawRepo("octocat/ledger-lint", {
    stargazers_count: 1200,
    description: "Flags rounding errors in financial reports",
    homepage: "ledgerlint.dev",
    topics: ["finance", "lint"],
  }),
  rawRepo("octocat/forked-thing", { fork: true, stargazers_count: 5000 }),
  rawRepo("octocat/sneaky", { homepage: "javascript:alert(1)" }),
];

const PULLS = [
  rawPull("vercel/next.js", 101, "octocat", { title: "fix(router): keep scroll on back" }),
  rawPull("vercel/next.js", 102, "octocat", { pull_request: { merged_at: null } }),
  rawPull("vercel/next.js", 103, "hubot"),
  rawPull("octocat/ledger-lint", 7, "octocat"),
  rawPull("nodejs/node", 55, "OctoCat", { pull_request: { merged_at: "2026-10-20T00:00:00Z" } }),
];

let github: FakeGitHub;

function standard(url: URL): Response | undefined {
  if (url.pathname === "/users/octocat/repos") return json(REPOS, { headers: { etag: 'W/"repos-1"' } });
  if (url.pathname === "/search/issues") return json(searchResult(PULLS));
  return undefined;
}

beforeEach(() => {
  delete process.env.GITHUB_TOKEN;
  resetEnvForTests();
  clearGitHubCache();
});

afterEach(() => {
  github?.restore();
  resetEnvForTests();
});

describe("lookupProfile", () => {
  it("lists own repos without forks, most starred first, and merged pull requests to others", async () => {
    github = installFakeGitHub(standard);
    const session = newGitHubSession(15_000);
    const profile = await lookupProfile(session, "octocat");

    expect(profile.repos.map((repo) => repo.fullName)).toEqual([
      "octocat/ledger-lint",
      "octocat/small-tool",
      "octocat/sneaky",
    ]);
    const lint = profile.repos[0];
    expect(lint).toMatchObject({
      url: "https://github.com/octocat/ledger-lint",
      homepage: "https://ledgerlint.dev/",
      stars: 1200,
      topics: ["finance", "lint"],
    });
    expect(profile.repos.find((repo) => repo.name === "sneaky")?.homepage).toBe("");

    expect(profile.pulls.map((pull) => `${pull.repo}#${pull.number}`)).toEqual([
      "nodejs/node#55",
      "vercel/next.js#101",
    ]);
    expect(profile.pulls[1]?.url).toBe("https://github.com/vercel/next.js/pull/101");
    expect(profile.pulls[0]).not.toHaveProperty("body");
    expect(profile.pullsUnavailable).toBe(false);
    expect(session.calls).toBe(2);
  });

  it("only ever calls api.github.com, with the API version and a User-Agent", async () => {
    github = installFakeGitHub(standard);
    await lookupProfile(newGitHubSession(15_000), "octocat");
    expect(github.calls.length).toBe(2);
    for (const call of github.calls) {
      expect(new URL(call.url).origin).toBe("https://api.github.com");
      expect(call.headers.get("x-github-api-version")).toBe("2022-11-28");
      expect(call.headers.get("user-agent")).toBeTruthy();
      expect(call.headers.get("authorization")).toBeNull();
    }
    const search = new URL(github.calls[1]?.url ?? "");
    expect(search.searchParams.get("q")).toBe("is:pr is:merged is:public author:octocat -user:octocat");
  });

  it("sends the optional token when one is set", async () => {
    process.env.GITHUB_TOKEN = "github_pat_test";
    resetEnvForTests();
    github = installFakeGitHub(standard);
    await lookupProfile(newGitHubSession(15_000), "octocat");
    expect(github.calls[0]?.headers.get("authorization")).toBe("Bearer github_pat_test");
  });

  it("answers a repeat from the cache without calling GitHub", async () => {
    github = installFakeGitHub(standard);
    await lookupProfile(newGitHubSession(15_000), "octocat");
    const again = newGitHubSession(15_000);
    const profile = await lookupProfile(again, "OctoCat");
    expect(profile.repos).toHaveLength(3);
    expect(again.calls).toBe(0);
    expect(github.calls).toHaveLength(2);
  });

  it("says when there's no such account", async () => {
    github = installFakeGitHub(() => undefined);
    await expect(lookupProfile(newGitHubSession(15_000), "nobody-here")).rejects.toMatchObject({
      reason: "not_found",
    });
  });

  it("still lists repos when the pull request search is busy", async () => {
    github = installFakeGitHub((url) =>
      url.pathname === "/search/issues"
        ? json({ message: "slow down" }, { status: 403, headers: { "retry-after": "30" } })
        : standard(url),
    );
    const profile = await lookupProfile(newGitHubSession(15_000), "octocat");
    expect(profile.repos).toHaveLength(3);
    expect(profile.pulls).toEqual([]);
    expect(profile.pullsUnavailable).toBe(true);
  });

  it("reports GitHub's hourly limit with its reset time", async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    github = installFakeGitHub(() =>
      json(
        { message: "API rate limit exceeded" },
        { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } },
      ),
    );
    const error = await lookupProfile(newGitHubSession(15_000), "octocat").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GitHubError);
    expect((error as GitHubError).reason).toBe("rate_limited");
    expect((error as GitHubError).retryAfterMs).toBeGreaterThan(500_000);
  });

  it("follows a rename redirect on api.github.com but never one to another site", async () => {
    github = installFakeGitHub((url) => {
      if (url.pathname === "/users/oldname/repos") {
        return new Response(null, { status: 301, headers: { location: "https://api.github.com/users/octocat/repos" } });
      }
      if (url.pathname === "/users/evil/repos") {
        return new Response(null, { status: 302, headers: { location: "https://attacker.example/steal" } });
      }
      return standard(url);
    });
    const renamed = await lookupProfile(newGitHubSession(15_000), "oldname");
    expect(renamed.repos).toHaveLength(3);

    await expect(lookupProfile(newGitHubSession(15_000), "evil")).rejects.toMatchObject({ reason: "unavailable" });
    expect(github.calls.every((call) => new URL(call.url).origin === "https://api.github.com")).toBe(true);
  });

  it("revives a stale cache entry with a conditional request", async () => {
    github = installFakeGitHub(standard);
    const realNow = Date.now;
    await lookupProfile(newGitHubSession(15_000), "octocat");
    github.restore();
    github = installFakeGitHub((url, headers) => {
      if (url.pathname === "/users/octocat/repos" && headers.get("if-none-match") === 'W/"repos-1"') {
        return new Response(null, { status: 304 });
      }
      return standard(url);
    });
    Date.now = () => realNow() + 11 * 60_000;
    try {
      const profile = await lookupProfile(newGitHubSession(15_000), "octocat");
      expect(profile.repos).toHaveLength(3);
      expect(github.calls[0]?.headers.get("if-none-match")).toBe('W/"repos-1"');
    } finally {
      Date.now = realNow;
    }
  });

  it("refuses a body it can't read", async () => {
    github = installFakeGitHub(() => text("<html>oops</html>"));
    await expect(lookupProfile(newGitHubSession(15_000), "octocat")).rejects.toMatchObject({ reason: "unavailable" });
  });
});

describe("call budget", () => {
  it("stops at the per-request limit", async () => {
    github = installFakeGitHub(() => text("# Readme\n\nA tool that does a useful thing for people."));
    const session = newGitHubSession(15_000);
    for (let index = 0; index < MAX_CALLS_PER_REQUEST; index++) {
      await fetchReadme(session, `octocat/repo-${index}`);
    }
    await expect(fetchReadme(session, "octocat/one-more")).rejects.toMatchObject({ reason: "over_budget" });
    expect(github.calls).toHaveLength(MAX_CALLS_PER_REQUEST);
  });
});
