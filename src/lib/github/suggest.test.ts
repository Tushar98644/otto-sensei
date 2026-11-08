import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { suggestPicks } from "./suggest";
import type { GitHubLookup, GitHubPull, GitHubRepo } from "./types";

function repo(name: string, overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: name.length,
    name,
    fullName: `octocat/${name}`,
    url: `https://github.com/octocat/${name}`,
    description: "",
    homepage: "",
    language: "TypeScript",
    topics: [],
    stars: 0,
    forks: 0,
    archived: false,
    pushedAt: "",
    ...overrides,
  };
}

function pull(id: number, target: string): GitHubPull {
  return {
    id,
    number: id,
    title: `Fix ${id}`,
    url: `https://github.com/${target}/pull/${id}`,
    repo: target,
    mergedAt: "2026-09-01T00:00:00Z",
  };
}

function profile(repos: GitHubRepo[], pulls: GitHubPull[] = []): GitHubLookup {
  return { username: "octocat", repos, pulls, pullsUnavailable: false };
}

const blank: Resume = emptyResume(0);

describe("suggestPicks", () => {
  it("takes the top three live repos in GitHub's order", () => {
    const picks = suggestPicks(
      profile([repo("ledger"), repo("old", { archived: true }), repo("lint"), repo("cli"), repo("extra")]),
      blank,
    );
    expect(picks).toEqual({
      repos: ["octocat/ledger", "octocat/lint", "octocat/cli"],
      pulls: [],
    });
  });

  it("skips repos the resume already lists, by link or name", () => {
    const resume: Resume = {
      ...blank,
      projects: [
        { id: "p1", name: "Ledger", link: "", bullets: [] },
        { id: "p2", name: "Something", link: "https://github.com/octocat/lint/", bullets: [] },
      ],
    };
    expect(suggestPicks(profile([repo("ledger"), repo("lint"), repo("cli")]), resume).repos).toEqual([
      "octocat/cli",
    ]);
  });

  it("fills the room left with pull requests, keeping every one to a repo it picked", () => {
    const picks = suggestPicks(
      profile(
        [repo("ledger")],
        [pull(1, "vercel/next.js"), pull(2, "vercel/next.js"), pull(3, "nodejs/node"), pull(4, "denoland/deno")],
      ),
      blank,
    );
    expect(picks).toEqual({ repos: ["octocat/ledger"], pulls: [1, 2, 3] });
  });

  it("picks nothing from an empty profile", () => {
    expect(suggestPicks(profile([]), blank)).toEqual({ repos: [], pulls: [] });
  });
});
