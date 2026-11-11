import type { GitHubStats } from "@/lib/portfolio/content";
import { fetchRepos } from "./api";
import { cachedGet, GitHubError, jsonOf, MAX_JSON_BYTES, newGitHubSession } from "./http";
import {
  GitHubEventJson,
  GitHubUserJson,
  githubStatsFrom,
  type GitHubEvent,
  type GitHubUser,
} from "./stats";

const BUDGET_MS = 12_000;

function parseUser(body: string, truncated: boolean): GitHubUser {
  const parsed = GitHubUserJson.safeParse(jsonOf(body, truncated));
  if (!parsed.success) throw new GitHubError("unavailable", "GitHub sent an unreadable profile");
  return parsed.data;
}

function parseEvents(body: string, truncated: boolean): GitHubEvent[] {
  const json = jsonOf(body, truncated);
  if (!Array.isArray(json)) return [];
  return json.flatMap((item) => {
    const parsed = GitHubEventJson.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function fetchGitHubStats(
  username: string,
  now = Date.now(),
): Promise<GitHubStats | null> {
  const session = newGitHubSession(BUDGET_MS);
  const name = encodeURIComponent(username.toLowerCase());
  const user = await cachedGet(session, `/users/${name}`, {
    accept: "application/vnd.github+json",
    maxBytes: 64 * 1024,
    parse: parseUser,
  });
  if (user === null) return null;
  const repos = await fetchRepos(session, username);
  let events: GitHubEvent[] = [];
  try {
    events =
      (await cachedGet(session, `/users/${name}/events/public?per_page=100`, {
        accept: "application/vnd.github+json",
        maxBytes: MAX_JSON_BYTES,
        parse: parseEvents,
      })) ?? [];
  } catch (error) {
    if (!(error instanceof GitHubError) || error.reason === "over_budget") throw error;
  }
  return githubStatsFrom(user, repos, events, now);
}
