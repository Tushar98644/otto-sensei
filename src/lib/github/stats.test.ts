import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { clearGitHubCache } from "./cache";
import { fetchGitHubStats } from "./profile";
import { githubStatsFrom } from "./stats";
import { installFakeGitHub, json, rawRepo, type FakeGitHub } from "./testing";
import type { GitHubRepo } from "./types";

const NOW = Date.UTC(2026, 10, 8, 12);
const DAY = 86_400_000;

const repo = (
  name: string,
  stars: number,
  language: string,
  extra: Partial<GitHubRepo> = {},
): GitHubRepo => ({
  id: stars,
  name,
  fullName: `octocat/${name}`,
  url: `https://github.com/octocat/${name}`,
  description: "",
  homepage: "",
  language,
  topics: [],
  stars,
  forks: 0,
  archived: false,
  pushedAt: "2026-11-01T00:00:00Z",
  ...extra,
});

const event = (type: string, daysAgo: number, name = "octocat/tally") => ({
  type,
  created_at: new Date(NOW - daysAgo * DAY).toISOString(),
  repo: { name },
});

describe("GitHub numbers for a portfolio", () => {
  it("adds up stars, counts languages and buckets recent activity by week", () => {
    const stats = githubStatsFrom(
      {
        login: "octocat",
        name: "The Octocat",
        followers: 9000,
        public_repos: 8,
      },
      [
        repo("tally", 4200, "TypeScript"),
        repo("pgsnap", 1900, "Go"),
        repo("old", 30, "TypeScript", { archived: true }),
        repo("notes", 0, ""),
      ],
      [
        event("PushEvent", 1),
        event("PushEvent", 2),
        event("ReleaseEvent", 10, "octocat/pgsnap"),
        event("WatchEvent", 3),
        event("PushEvent", 120),
      ],
      NOW,
    );
    expect(stats.totalStars).toBe(6130);
    expect(stats.languages).toEqual([
      { name: "TypeScript", repos: 2, percent: 67 },
      { name: "Go", repos: 1, percent: 33 },
    ]);
    expect(stats.repos.map((item) => item.name)).toEqual(["tally", "pgsnap", "notes"]);
    expect(stats.activity.events90d).toBe(4);
    expect(stats.activity.weeks).toHaveLength(12);
    expect(stats.activity.weeks.at(-1)).toBe(3);
    expect(stats.activity.weeks.at(-2)).toBe(1);
    expect(stats.activity.recent).toEqual([
      { repo: "octocat/tally", kind: "push", at: new Date(NOW - DAY).toISOString() },
      { repo: "octocat/pgsnap", kind: "release", at: new Date(NOW - 10 * DAY).toISOString() },
    ]);
    expect(stats).not.toHaveProperty("avatarUrl");
  });

  it("has no activity for an account without events", () => {
    const stats = githubStatsFrom({ login: "x" }, [], [], NOW);
    expect(stats.activity.lastActiveAt).toBeNull();
  });
});

describe("fetching them", () => {
  let github: FakeGitHub;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    resetEnvForTests();
    clearGitHubCache();
  });
  afterEach(() => {
    github.restore();
    delete process.env.GITHUB_TOKEN;
    resetEnvForTests();
  });

  const standard = (url: URL) => {
    if (url.pathname === "/users/octocat")
      return json({ login: "Octocat", name: "Octo", followers: 3, public_repos: 2 });
    if (url.pathname === "/users/octocat/repos")
      return json([rawRepo("Octocat/tally", { stargazers_count: 12 })]);
    if (url.pathname === "/users/octocat/events/public")
      return json([event("PushEvent", 1, "Octocat/tally")]);
    return undefined;
  };

  it("works without a token in three calls, and caches them", async () => {
    github = installFakeGitHub(standard);
    const stats = await fetchGitHubStats("octocat", NOW);
    expect(stats).toMatchObject({ username: "Octocat", totalStars: 12, followers: 3 });
    expect(github.paths()).toEqual([
      "/users/octocat",
      "/users/octocat/repos?type=owner&sort=pushed&per_page=100",
      "/users/octocat/events/public?per_page=100",
    ]);
    expect(github.calls.every((call) => !call.headers.has("authorization"))).toBe(true);
    await fetchGitHubStats("octocat", NOW);
    expect(github.calls).toHaveLength(3);
  });

  it("sends GITHUB_TOKEN when it's set", async () => {
    process.env.GITHUB_TOKEN = "ghp_test";
    resetEnvForTests();
    github = installFakeGitHub(standard);
    await fetchGitHubStats("octocat", NOW);
    expect(github.calls[0]?.headers.get("authorization")).toBe("Bearer ghp_test");
  });

  it("answers null for an account GitHub doesn't have, and keeps going without events", async () => {
    github = installFakeGitHub((url) =>
      url.pathname === "/users/nobody"
        ? json({ message: "Not Found" }, { status: 404 })
        : undefined,
    );
    expect(await fetchGitHubStats("nobody", NOW)).toBeNull();
    github.restore();
    clearGitHubCache();
    github = installFakeGitHub((url) =>
      url.pathname.endsWith("/events/public")
        ? json({ message: "busy" }, { status: 502 })
        : standard(url),
    );
    expect((await fetchGitHubStats("octocat", NOW))?.activity.events90d).toBe(0);
  });
});
