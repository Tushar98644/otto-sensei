import type { Resume } from "@/lib/resume/schema";
import { isOnResume } from "./to-projects";
import { GITHUB_PICK_LIMITS, type GitHubLookup } from "./types";

// The most starred own repos still alive and not on the resume, then merged pull requests to
// others' repos, newest first, while there's room.

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
