import type { GitHubContact, GitHubPull, GitHubRepo } from "@/lib/github/types";
import { parseGitHubUsername } from "@/lib/github/username";
import type { Resume } from "@/lib/resume/schema";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import EN_GITHUB from "@/i18n/messages/en/github";

export function usernameFromResume(resume: Resume): string {
  for (const link of resume.basics.links) {
    const name = parseGitHubUsername(link.url);
    if (name) return name;
  }
  return "";
}

const FEW_PROJECTS = 2;

export function offersGitHubImport(resume: Resume): boolean {
  return usernameFromResume(resume) !== "" && resume.projects.length < FEW_PROJECTS;
}

export function contactOf(resume: Resume): GitHubContact {
  const { basics } = resume;
  return {
    name: basics.name.trim().slice(0, 200),
    email: basics.email.trim().slice(0, 320),
    phone: basics.phone.trim().slice(0, 50),
    links: basics.links
      .map((link) => link.url.trim().slice(0, 500))
      .filter(Boolean)
      .slice(0, 20),
  };
}

type PickWords = Messages["github"]["pick"];

export function repoMeta(
  repo: GitHubRepo,
  t: PickWords = EN_GITHUB.pick,
  format: Format = formatFor("en"),
): string {
  return [
    repo.language,
    repo.stars > 0 ? format.plural(t.stars, repo.stars) : "",
    repo.archived ? t.archived : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function pullMeta(
  pull: GitHubPull,
  t: PickWords = EN_GITHUB.pick,
  format: Format = formatFor("en"),
): string {
  const time = Date.parse(pull.mergedAt);
  const month = Number.isNaN(time)
    ? ""
    : format.date(time, { month: "short", year: "numeric", timeZone: "UTC" });
  const merged = month ? fmt(t.merged, { month }) : "";
  return [`${pull.repo} #${pull.number}`, merged].filter(Boolean).join(" · ");
}

export function matchesQuery(fields: readonly string[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(fields.join(" "));
  return words.every((word) => haystack.includes(word));
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function shortLink(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

export const GITHUB_OTTO = {
  pick: EN_GITHUB.pick.otto,
  nothing: (username: string) => fmt(EN_GITHUB.pick.nothing, { username }),
  reviewAI: EN_GITHUB.review.usedAI,
  reviewPlain: EN_GITHUB.review.plain,
} as const;
