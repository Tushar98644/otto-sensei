import { z } from "zod";
import type { GitHubRepoSummary, GitHubStats } from "@/lib/portfolio/content";
import type { GitHubRepo } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 12;
const TOP_REPOS = 8;
const TOP_LANGUAGES = 6;
const RECENT = 5;

export const GitHubUserJson = z.object({
  login: z.string(),
  name: z.string().nullish(),
  bio: z.string().nullish(),
  followers: z.number().nullish(),
  public_repos: z.number().nullish(),
  created_at: z.string().nullish(),
});
export type GitHubUser = z.infer<typeof GitHubUserJson>;

export const GitHubEventJson = z.object({
  type: z.string(),
  created_at: z.string(),
  repo: z.object({ name: z.string() }).nullish(),
});
export type GitHubEvent = z.infer<typeof GitHubEventJson>;

const EVENT_KINDS: Record<string, GitHubStats["activity"]["recent"][number]["kind"]> = {
  PushEvent: "push",
  PullRequestEvent: "pull",
  ReleaseEvent: "release",
  CreateEvent: "create",
  IssuesEvent: "issue",
};

const clip = (value: string | null | undefined, max: number) =>
  (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const count = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

function summary(repo: GitHubRepo): GitHubRepoSummary {
  return {
    name: repo.name,
    fullName: repo.fullName,
    url: repo.url,
    description: repo.description,
    homepage: repo.homepage,
    language: repo.language,
    topics: repo.topics,
    stars: repo.stars,
    forks: repo.forks,
    pushedAt: repo.pushedAt,
  };
}

export function githubStatsFrom(
  user: GitHubUser,
  repos: readonly GitHubRepo[],
  events: readonly GitHubEvent[],
  now = Date.now(),
): GitHubStats {
  const languages = new Map<string, number>();
  for (const repo of repos) {
    if (repo.language) languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1);
  }
  const withLanguage = [...languages.values()].reduce((sum, n) => sum + n, 0);

  const weeks = Array.from({ length: WEEKS }, () => 0);
  const recent: GitHubStats["activity"]["recent"] = [];
  let events90d = 0;
  let lastActiveAt: string | null = null;
  for (const event of events) {
    const at = Date.parse(event.created_at);
    if (!Number.isFinite(at) || at > now + DAY_MS) continue;
    const age = now - at;
    if (age <= 90 * DAY_MS) events90d += 1;
    const week = Math.floor(age / (7 * DAY_MS));
    if (week >= 0 && week < WEEKS) weeks[WEEKS - 1 - week]! += 1;
    if (!lastActiveAt || at > Date.parse(lastActiveAt)) lastActiveAt = new Date(at).toISOString();
    const kind = EVENT_KINDS[event.type];
    const repo = event.repo?.name ?? "";
    if (kind && repo && recent.length < RECENT && !recent.some((item) => item.repo === repo)) {
      recent.push({ repo: clip(repo, 140), kind, at: new Date(at).toISOString() });
    }
  }

  return {
    username: clip(user.login, 39),
    name: clip(user.name, 100),
    bio: clip(user.bio, 300),
    followers: count(user.followers),
    publicRepos: count(user.public_repos),
    totalStars: repos.reduce((sum, repo) => sum + repo.stars, 0),
    languages: [...languages.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_LANGUAGES)
      .map(([name, n]) => ({ name, repos: n, percent: Math.round((n / withLanguage) * 100) })),
    repos: repos
      .filter((repo) => !repo.archived)
      .slice(0, TOP_REPOS)
      .map(summary),
    activity: { lastActiveAt, events90d, weeks, recent },
    joinedAt: user.created_at ?? "",
    fetchedAt: now,
  };
}

type StoredStats = GitHubStats & { connected: true };

// The mark is what makes a copy count: older copies were read for whatever username the page named.
export function storedStats(stats: GitHubStats): StoredStats {
  return { ...stats, connected: true };
}

export function parseStoredStats(value: unknown): GitHubStats | null {
  if (!value || typeof value !== "object") return null;
  const stats = value as Partial<StoredStats>;
  if (stats.connected !== true) return null;
  if (typeof stats.username !== "string" || typeof stats.fetchedAt !== "number") return null;
  if (!Array.isArray(stats.repos) || !Array.isArray(stats.languages) || !stats.activity)
    return null;
  // Copies saved before 2026-11-10 carry an avatar address; pages draw no pictures, so it's dropped.
  const { avatarUrl, connected, ...rest } = stats as StoredStats & { avatarUrl?: unknown };
  void avatarUrl;
  void connected;
  return rest;
}
