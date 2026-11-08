import type { Resume } from "@/lib/resume/schema";
import { isOnResume } from "./to-projects";
import { GITHUB_PICK_LIMITS, type GitHubLookup } from "./types";

// Client-safe and pure. What "Import from GitHub" picks by itself, so the person only has to say
// which drafts to keep: the most starred repos of their own that are still alive and not on the
// resume yet, then merged pull requests to other people's repos, newest first, while there's room.

// A resume reads best with a few strong projects, not every repo.
export const SUGGESTED_PROJECTS = 3;

export type SuggestedPicks = { repos: string[]; pulls: number[] };

export function suggestPicks(profile: GitHubLookup, resume: Resume): SuggestedPicks {
  const repos = profile.repos
    .filter((repo) => !repo.archived && !isOnResume(resume, { name: repo.name, link: repo.url }))
    .slice(0, Math.min(SUGGESTED_PROJECTS, GITHUB_PICK_LIMITS.repos))
    .map((repo) => repo.fullName);

  // Each repo the pull requests went to becomes one project.
  const pullRepos = new Set<string>();
  const pulls: number[] = [];
  for (const pull of profile.pulls) {
    if (pulls.length >= GITHUB_PICK_LIMITS.pulls) break;
    const onResume = isOnResume(resume, { name: `Contributions to ${pull.repo}`, link: pull.url });
    if (onResume) continue;
    if (!pullRepos.has(pull.repo)) {
      if (repos.length + pullRepos.size >= SUGGESTED_PROJECTS) continue;
      pullRepos.add(pull.repo);
    }
    pulls.push(pull.id);
  }
  return { repos, pulls };
}
