import { z } from "zod";
import { GITHUB_USERNAME } from "./username";

// Client-safe contract for "Import from GitHub": POST /api/github/lookup lists a person's public
// work, POST /api/github/draft turns the picked items into project entries. Nothing is added to a
// resume on the server; the dialog shows the drafts and the person confirms.

// A resume has room for a few projects, and each picked repo costs two GitHub calls on the
// server (README and languages), which keeps a draft inside its 10-call budget.
export const GITHUB_PICK_LIMITS = { repos: 4, pulls: 6 } as const;

export type GitHubRepo = {
  id: number;
  // "otto-resume"
  name: string;
  // "octocat/otto-resume"
  fullName: string;
  // https://github.com/octocat/otto-resume
  url: string;
  description: string;
  // The site the owner linked from the repo, "" when none.
  homepage: string;
  // GitHub's main language for the repo, "" when it found none.
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  archived: boolean;
  // ISO time of the last push, "" when unknown.
  pushedAt: string;
};

export type GitHubPull = {
  id: number;
  number: number;
  title: string;
  // https://github.com/vercel/next.js/pull/123
  url: string;
  // "vercel/next.js"
  repo: string;
  // ISO time it was merged.
  mergedAt: string;
};

export type GitHubLookup = {
  // As GitHub spells it in the person's repo links, else as typed.
  username: string;
  // Their own public repos, forks left out, most starred first.
  repos: GitHubRepo[];
  // Merged pull requests to other people's public repos, newest first.
  pulls: GitHubPull[];
  // True when GitHub was too busy to search pull requests; the repos still loaded.
  pullsUnavailable: boolean;
};

export type GitHubDraftKind = "repo" | "pulls";

export type GitHubDraftEntry = {
  // "repo:octocat/otto-resume" or "pulls:vercel/next.js"; unique within one draft.
  key: string;
  kind: GitHubDraftKind;
  // Becomes the project's name: the repo's name, or "Contributions to owner/repo".
  name: string;
  // The repo, the one pull request, or the person's merged pull requests in that repo.
  link: string;
  bullets: string[];
};

export const GitHubLookupRequestSchema = z.object({
  username: z.string().trim().regex(GITHUB_USERNAME, "That isn't a GitHub username."),
});
export type GitHubLookupBody = z.input<typeof GitHubLookupRequestSchema>;
export type GitHubLookupResponse = { ok: true; profile: GitHubLookup };

// The resume's own contact details, sent only so the server can hide them from the AI: READMEs
// and pull request descriptions often sign off with a name, an email or a phone number. Never
// stored or logged.
export const GitHubContactSchema = z.object({
  name: z.string().max(200).default(""),
  email: z.string().max(320).default(""),
  phone: z.string().max(50).default(""),
  links: z.array(z.string().max(500)).max(20).default([]),
});
export type GitHubContact = z.input<typeof GitHubContactSchema>;

export const GitHubDraftRequestSchema = z
  .object({
    username: z.string().trim().regex(GITHUB_USERNAME, "That isn't a GitHub username."),
    // Full names from the lookup ("octocat/otto-resume").
    repos: z.array(z.string().trim().min(3).max(140)).max(GITHUB_PICK_LIMITS.repos).default([]),
    // Pull request ids from the lookup.
    pulls: z.array(z.number().int().positive()).max(GITHUB_PICK_LIMITS.pulls).default([]),
    contact: GitHubContactSchema.optional(),
  })
  .refine((body) => body.repos.length + body.pulls.length > 0, "Pick at least one repo or pull request.");
export type GitHubDraftBody = z.input<typeof GitHubDraftRequestSchema>;
export type GitHubDraftRequest = z.output<typeof GitHubDraftRequestSchema>;

export type GitHubDraftResult = {
  entries: GitHubDraftEntry[];
  // False when the AI is off or failed: the lines are then GitHub's own words, lightly arranged.
  usedAI: boolean;
  // Picked items GitHub no longer lists (deleted, renamed or made private since the lookup).
  missing: number;
};
export type GitHubDraftResponse = { ok: true } & GitHubDraftResult;
