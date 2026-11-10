import type { GitHubContact, GitHubPull, GitHubRepo } from "@/lib/github/types";
import { parseGitHubUsername } from "@/lib/github/username";
import type { Resume } from "@/lib/resume/schema";

// Client-safe helpers for the "Import from GitHub" dialog.

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** The GitHub username in the resume's own links, so most people never type it. */
export function usernameFromResume(resume: Resume): string {
  for (const link of resume.basics.links) {
    const name = parseGitHubUsername(link.url);
    if (name) return name;
  }
  return "";
}

// Below this many projects, the studio offers the GitHub import at the top of Projects.
const FEW_PROJECTS = 2;

/** The resume links a GitHub profile but has fewer than two projects: worth offering the import. */
export function offersGitHubImport(resume: Resume): boolean {
  return usernameFromResume(resume) !== "" && resume.projects.length < FEW_PROJECTS;
}

/** What the server hides from the AI: the details this resume itself shows. */
export function contactOf(resume: Resume): GitHubContact {
  const { basics } = resume;
  return {
    name: basics.name.trim().slice(0, 200),
    email: basics.email.trim().slice(0, 320),
    phone: basics.phone.trim().slice(0, 50),
    links: basics.links.map((link) => link.url.trim().slice(0, 500)).filter(Boolean).slice(0, 20),
  };
}

// "TypeScript · 1,200 stars · Archived"
export function repoMeta(repo: GitHubRepo): string {
  return [
    repo.language,
    repo.stars > 0 ? `${repo.stars.toLocaleString("en-US")} ${repo.stars === 1 ? "star" : "stars"}` : "",
    repo.archived ? "Archived" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

// "vercel/next.js #101 · Merged Sep 2026"
export function pullMeta(pull: GitHubPull): string {
  const time = Date.parse(pull.mergedAt);
  const merged = Number.isNaN(time) ? "" : `Merged ${MONTH.format(time)}`;
  return [`${pull.repo} #${pull.number}`, merged].filter(Boolean).join(" · ");
}

/** Case- and accent-blind match on every word, in any order. */
export function matchesQuery(fields: readonly string[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(fields.join(" "));
  return words.every((word) => haystack.includes(word));
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// "github.com/octocat/ledger-lint", for showing a link without its scheme.
export function shortLink(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

// Otto's lines in the dialog: first person, 18 words at most (checked in format.test.ts).
export const GITHUB_OTTO = {
  pick: "Pick your best work. I'll write lines only from what GitHub shows.",
  nothing: (username: string) => `I found no public repos or merged pull requests for ${username}.`,
  reviewAI: "I used only facts and numbers from GitHub. Untick anything you don't want.",
  reviewPlain: "These lines use GitHub's own words. Make them yours after adding.",
} as const;
