import { z } from "zod";
import { GITHUB_USERNAME } from "./username";

export const GITHUB_PICK_LIMITS = { repos: 4, pulls: 6 } as const;

export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string;
  homepage: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  archived: boolean;
  pushedAt: string;
};

export type GitHubPull = {
  id: number;
  number: number;
  title: string;
  url: string;
  repo: string;
  mergedAt: string;
};

export type GitHubLookup = {
  username: string;
  repos: GitHubRepo[];
  pulls: GitHubPull[];
  pullsUnavailable: boolean;
};

export type GitHubDraftKind = "repo" | "pulls";

export type GitHubDraftEntry = {
  key: string;
  kind: GitHubDraftKind;
  name: string;
  link: string;
  bullets: string[];
};

export const GitHubConnectRequestSchema = z.object({ next: z.string().max(512).optional() });
export type GitHubConnectBody = z.input<typeof GitHubConnectRequestSchema>;

export const GitHubLookupRequestSchema = z.object({
  username: z.string().trim().regex(GITHUB_USERNAME, "That isn't a GitHub username."),
});
export type GitHubLookupBody = z.input<typeof GitHubLookupRequestSchema>;
export type GitHubLookupResponse = { ok: true; profile: GitHubLookup };

// Sent only so the server can hide them from the AI. Never stored or logged.
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
    repos: z.array(z.string().trim().min(3).max(140)).max(GITHUB_PICK_LIMITS.repos).default([]),
    pulls: z.array(z.number().int().positive()).max(GITHUB_PICK_LIMITS.pulls).default([]),
    contact: GitHubContactSchema.optional(),
  })
  .refine((body) => body.repos.length + body.pulls.length > 0, "Pick at least one repo or pull request.");
export type GitHubDraftBody = z.input<typeof GitHubDraftRequestSchema>;
export type GitHubDraftRequest = z.output<typeof GitHubDraftRequestSchema>;

export type GitHubDraftResult = {
  entries: GitHubDraftEntry[];
  usedAI: boolean;
  missing: number;
};
export type GitHubDraftResponse = { ok: true } & GitHubDraftResult;
