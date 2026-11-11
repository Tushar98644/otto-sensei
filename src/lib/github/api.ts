import { z } from "zod";
import { clip, oneLine } from "@/lib/ai/text";
import {
  cachedGet,
  GitHubError,
  isRepoName,
  jsonOf,
  MAX_JSON_BYTES,
  REPOS_PREFIX,
  repoPath,
  type GitHubSession,
} from "./http";
import { markdownExcerpt } from "./markdown";
import type { GitHubLookup, GitHubPull, GitHubRepo } from "./types";

const MAX_README_BYTES = 256 * 1024;
const README_CHARS = 1_500;
const PULL_BODY_CHARS = 700;
const MAX_REPOS = 60;
const PULLS_PER_SEARCH = 30;

export type PullRecord = GitHubPull & { body: string };

export type LanguageShare = { name: string; percent: number };

const RepoJson = z.object({
  id: z.number(),
  full_name: z.string(),
  description: z.string().nullish(),
  homepage: z.string().nullish(),
  language: z.string().nullish(),
  topics: z.array(z.string()).nullish(),
  stargazers_count: z.number().nullish(),
  forks_count: z.number().nullish(),
  fork: z.boolean().nullish(),
  private: z.boolean().nullish(),
  archived: z.boolean().nullish(),
  pushed_at: z.string().nullish(),
});

function webAddress(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || /\s/.test(text) || text.length > 300) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const isWeb = (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
    return isWeb && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

function newerFirst(a: string, b: string): number {
  return a === b ? 0 : a < b ? 1 : -1;
}

function count(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function toRepo(raw: z.infer<typeof RepoJson>): GitHubRepo | null {
  if (raw.fork || raw.private || !isRepoName(raw.full_name)) return null;
  const name = raw.full_name.split("/")[1] ?? raw.full_name;
  return {
    id: raw.id,
    name,
    fullName: raw.full_name,
    // Built from the checked name, not taken from the answer, so it is always a GitHub link.
    url: `https://github.com/${raw.full_name}`,
    description: clip(oneLine(raw.description ?? ""), 300),
    homepage: webAddress(raw.homepage),
    language: clip(oneLine(raw.language ?? ""), 50),
    topics: (raw.topics ?? []).slice(0, 10).map((topic) => clip(oneLine(topic), 50)).filter(Boolean),
    stars: count(raw.stargazers_count),
    forks: count(raw.forks_count),
    archived: raw.archived === true,
    pushedAt: raw.pushed_at ?? "",
  };
}

function parseRepos(body: string, truncated: boolean): GitHubRepo[] {
  const json = jsonOf(body, truncated);
  if (!Array.isArray(json)) throw new GitHubError("unavailable", "GitHub sent an unreadable repo list");
  const repos: GitHubRepo[] = [];
  for (const item of json) {
    const parsed = RepoJson.safeParse(item);
    const repo = parsed.success ? toRepo(parsed.data) : null;
    if (repo) repos.push(repo);
  }
  return repos
    .sort((a, b) => b.stars - a.stars || newerFirst(a.pushedAt, b.pushedAt))
    .slice(0, MAX_REPOS);
}

export async function fetchRepos(session: GitHubSession, username: string): Promise<GitHubRepo[]> {
  const path = `/users/${encodeURIComponent(username.toLowerCase())}/repos?type=owner&sort=pushed&per_page=100`;
  const repos = await cachedGet(session, path, {
    accept: "application/vnd.github+json",
    maxBytes: MAX_JSON_BYTES,
    parse: parseRepos,
  });
  if (repos === null) throw new GitHubError("not_found", "No GitHub account has that name");
  return repos;
}

const PullJson = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  repository_url: z.string(),
  body: z.string().nullish(),
  pull_request: z.object({ merged_at: z.string().nullish() }).nullish(),
  user: z.object({ login: z.string() }).nullish(),
});

function parsePulls(username: string) {
  const own = username.toLowerCase();
  return (body: string, truncated: boolean): PullRecord[] => {
    const json = jsonOf(body, truncated);
    const items = z.object({ items: z.array(z.unknown()) }).safeParse(json);
    if (!items.success) throw new GitHubError("unavailable", "GitHub sent unreadable search results");
    const pulls: PullRecord[] = [];
    for (const item of items.data.items) {
      const parsed = PullJson.safeParse(item);
      if (!parsed.success) continue;
      const pull = parsed.data;
      const repo = pull.repository_url.startsWith(REPOS_PREFIX)
        ? pull.repository_url.slice(REPOS_PREFIX.length)
        : "";
      const mergedAt = pull.pull_request?.merged_at;
      if (!isRepoName(repo) || !mergedAt || pull.user?.login.toLowerCase() !== own) continue;
      if (repo.split("/")[0]?.toLowerCase() === own) continue;
      pulls.push({
        id: pull.id,
        number: pull.number,
        title: clip(oneLine(pull.title), 300),
        url: `https://github.com/${repo}/pull/${pull.number}`,
        repo,
        mergedAt,
        body: markdownExcerpt(pull.body ?? "", PULL_BODY_CHARS),
      });
    }
    return pulls.sort((a, b) => newerFirst(a.mergedAt, b.mergedAt));
  };
}

export async function fetchMergedPulls(session: GitHubSession, username: string): Promise<PullRecord[]> {
  const query = `is:pr is:merged is:public author:${username} -user:${username}`;
  const path = `/search/issues?q=${encodeURIComponent(query.toLowerCase())}&sort=updated&order=desc&per_page=${PULLS_PER_SEARCH}`;
  const pulls = await cachedGet(session, path, {
    accept: "application/vnd.github+json",
    maxBytes: MAX_JSON_BYTES,
    parse: parsePulls(username),
  });
  return pulls ?? [];
}

function parseLanguages(body: string, truncated: boolean): LanguageShare[] {
  const parsed = z.record(z.string(), z.number()).safeParse(jsonOf(body, truncated));
  if (!parsed.success) return [];
  const entries = Object.entries(parsed.data).filter(([, bytes]) => bytes > 0);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return [];
  return entries
    .map(([name, bytes]) => ({ name: clip(oneLine(name), 50), percent: Math.round((bytes / total) * 100) }))
    .filter((language) => language.name && language.percent >= 1)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);
}

export async function fetchLanguages(session: GitHubSession, fullName: string): Promise<LanguageShare[]> {
  const languages = await cachedGet(session, repoPath(fullName, "/languages"), {
    accept: "application/vnd.github+json",
    maxBytes: 64 * 1024,
    parse: parseLanguages,
  });
  return languages ?? [];
}

export async function fetchReadme(session: GitHubSession, fullName: string): Promise<string> {
  const readme = await cachedGet(session, repoPath(fullName, "/readme"), {
    accept: "application/vnd.github.raw",
    maxBytes: MAX_README_BYTES,
    parse: (body) => markdownExcerpt(body, README_CHARS),
  });
  return readme ?? "";
}

function withoutBody(pull: PullRecord): GitHubPull {
  const { id, number, title, url, repo, mergedAt } = pull;
  return { id, number, title, url, repo, mergedAt };
}

export async function lookupProfile(session: GitHubSession, username: string): Promise<GitHubLookup> {
  const repos = await fetchRepos(session, username);
  let pulls: PullRecord[] = [];
  let pullsUnavailable = false;
  try {
    pulls = await fetchMergedPulls(session, username);
  } catch (error) {
    if (!(error instanceof GitHubError) || error.reason === "over_budget") throw error;
    pullsUnavailable = true;
  }
  const spelled = repos[0]?.fullName.split("/")[0] ?? username;
  return { username: spelled, repos, pulls: pulls.map(withoutBody), pullsUnavailable };
}
