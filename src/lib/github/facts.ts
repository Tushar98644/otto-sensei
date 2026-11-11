import { asResumeLine, capitalize, clipWords, oneLine } from "@/lib/ai/text";
import type { LanguageShare, PullRecord } from "./api";
import type { GitHubDraftEntry, GitHubRepo } from "./types";

export type RepoItem = {
  kind: "repo";
  key: string;
  repo: GitHubRepo;
  languages: LanguageShare[];
  readme: string;
};

export type PullsItem = {
  kind: "pulls";
  key: string;
  repo: string;
  username: string;
  pulls: PullRecord[];
};

export type DraftItem = RepoItem | PullsItem;

export const BULLET_CHARS = 240;
export const MAX_REPO_BULLETS = 3;
const MIN_STARS = 10;
const MIN_FORKS = 5;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function monthOf(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : MONTH.format(time);
}

export function entryName(item: DraftItem): string {
  return item.kind === "repo" ? item.repo.name : `Contributions to ${item.repo}`;
}

export function entryLink(item: DraftItem): string {
  if (item.kind === "repo") return item.repo.url;
  const [only] = item.pulls;
  if (item.pulls.length === 1 && only) return only.url;
  const query = `is:pr is:merged author:${item.username}`;
  return `https://github.com/${item.repo}/pulls?q=${encodeURIComponent(query)}`;
}

function languageNames(item: RepoItem): string[] {
  const names = item.languages.map((language) => language.name);
  if (names.length === 0 && item.repo.language) names.push(item.repo.language);
  return names;
}

function list(words: readonly string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

function webLabel(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host.replace(/^www\./, "")}${pathname === "/" ? "" : pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

export function sourceText(item: DraftItem): string {
  if (item.kind === "pulls") {
    const lines = [`Repository: ${item.repo}`];
    for (const pull of item.pulls) {
      const merged = monthOf(pull.mergedAt);
      lines.push(`Pull request #${pull.number}${merged ? `, merged ${merged}` : ""}: ${pull.title}`);
      if (pull.body) lines.push(`Description of #${pull.number}: ${oneLine(pull.body)}`);
    }
    return lines.join("\n");
  }
  const { repo } = item;
  const languages = item.languages.length
    ? `Languages, most code first: ${item.languages.map((language) => language.name).join(", ")}`
    : repo.language
      ? `Main language: ${repo.language}`
      : "";
  const lines = [
    `Repository: ${repo.fullName}`,
    repo.description ? `Description: ${repo.description}` : "",
    repo.homepage ? `Website: ${webLabel(repo.homepage)}` : "",
    repo.topics.length ? `Topics: ${repo.topics.join(", ")}` : "",
    languages,
    repo.stars >= MIN_STARS ? `Stars on GitHub: ${repo.stars}` : "",
    repo.forks >= MIN_FORKS ? `Forks on GitHub: ${repo.forks}` : "",
    repo.archived ? "Archived: the owner no longer updates it" : "",
    item.readme ? `README:\n${item.readme}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

const PAST_TENSE: Record<string, string> = {
  add: "Added",
  allow: "Allowed",
  avoid: "Avoided",
  build: "Built",
  bump: "Bumped",
  change: "Changed",
  clean: "Cleaned",
  convert: "Converted",
  create: "Created",
  disable: "Disabled",
  document: "Documented",
  drop: "Dropped",
  enable: "Enabled",
  ensure: "Ensured",
  expose: "Exposed",
  extract: "Extracted",
  fix: "Fixed",
  handle: "Handled",
  implement: "Implemented",
  improve: "Improved",
  introduce: "Introduced",
  make: "Made",
  migrate: "Migrated",
  move: "Moved",
  normalize: "Normalized",
  optimize: "Optimized",
  prevent: "Prevented",
  refactor: "Refactored",
  remove: "Removed",
  rename: "Renamed",
  replace: "Replaced",
  rewrite: "Rewrote",
  simplify: "Simplified",
  support: "Supported",
  update: "Updated",
  upgrade: "Upgraded",
  use: "Used",
  validate: "Validated",
  write: "Wrote",
};

export function pullLine(pull: PullRecord): string {
  const title = oneLine(pull.title)
    .replace(/^\[[^\]]{1,40}\]\s*/, "")
    .replace(/^[a-z]+(?:\([^)]{0,40}\))?!?:\s+/i, "");
  const [first = "", ...rest] = title.split(" ");
  const past = PAST_TENSE[first.toLowerCase()];
  const sentence = past ? [past, ...rest].join(" ") : capitalize(title);
  const line = asResumeLine(sentence);
  const suffix = ` (#${pull.number})`;
  return `${clipWords(line, BULLET_CHARS - suffix.length)}${suffix}`;
}

function firstReadmeSentence(readme: string): string {
  const line = readme.split("\n").find((text) => text.split(" ").length >= 6) ?? "";
  return line.split(/(?<=[.!?])\s/)[0] ?? "";
}

export function plainBullets(item: DraftItem): string[] {
  if (item.kind === "pulls") return item.pulls.map(pullLine);
  const { repo } = item;
  const about = repo.description || firstReadmeSentence(item.readme);
  const languages = languageNames(item).slice(0, 3);
  const counts = [
    repo.stars >= MIN_STARS ? `${repo.stars.toLocaleString("en-US")} stars` : "",
    repo.forks >= MIN_FORKS ? `${repo.forks.toLocaleString("en-US")} forks` : "",
  ].filter(Boolean);
  const site = repo.homepage ? webLabel(repo.homepage) : "";
  const lines = [
    about ? clipWords(capitalize(asResumeLine(about)), BULLET_CHARS) : "",
    languages.length ? `Built with ${list(languages)}` : "",
    site ? `Live at ${site}` : "",
    counts.length ? `${list(counts)} on GitHub` : "",
  ];
  return lines
    .filter((line) => /\p{L}{2}/u.test(line) && !EMAIL_LIKE.test(line))
    .map(capitalize)
    .slice(0, MAX_REPO_BULLETS);
}

export function toEntry(item: DraftItem, bullets: string[]): GitHubDraftEntry {
  return { key: item.key, kind: item.kind, name: entryName(item), link: entryLink(item), bullets };
}
