import { parseGitHubUsername } from "@/lib/github/username";
import {
  socialHref,
  webHref,
  type ContentLink,
  type ContentSocial,
  type SocialKind,
  type TextPart,
} from "./content";
import type { PortfolioView } from "./view";

export const clean = (value: string) => value.replace(/\s+/g, " ").trim();

// A full stop only ends a sentence before a space or the end, so "Next.js" and "gmail.com" stay whole.
export function sentences(text: string): string[] {
  return (clean(text).match(/(?:[^.!?]|[.!?](?!\s|$))+(?:[.!?]+(?=\s|$)|$)/g) ?? [])
    .map(clean)
    .filter(Boolean);
}

export function clip(text: string, max: number): string {
  const value = clean(text);
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "")}…`;
}

/** Never half a sentence unless one is too long. */
export function wholeSentences(list: readonly string[], max: number): string {
  let out = "";
  for (const sentence of list) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  return out || (list[0] ? clip(list[0], max) : "");
}

export function initialsOf(name: string): string {
  const parts = clean(name)
    .split(/[\s-]+/)
    .filter((part) => /\p{L}/u.test(part));
  const letters = parts.length > 1 ? [parts[0]!, parts.at(-1)!] : parts.slice(0, 1);
  return letters.map((part) => [...part].find((ch) => /\p{L}/u.test(ch))!.toUpperCase()).join("");
}

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole word, case-insensitive ("Node.js", "C++" included). */
export function mentions(text: string, term: string): boolean {
  const value = term.trim();
  if (value.length < 1) return false;
  return new RegExp(`(?:^|[^\\p{L}\\p{N}+#.])${escapeRegex(value)}(?![\\p{L}\\p{N}+#])`, "iu").test(
    text,
  );
}

const YEAR = /\b((?:19|20)\d{2})\b/;
const CURRENT = /^(?:present|now|current|today|ongoing)$/i;

export function yearOf(date: string): number | null {
  const match = YEAR.exec(date);
  return match ? Number(match[1]) : null;
}

export function isCurrent(end: string): boolean {
  return end.trim() === "" || CURRENT.test(end.trim());
}

export function spanOf(start: string, end: string, nowYear: number): [number, number] | null {
  const from = yearOf(start);
  if (from === null) return null;
  const to = isCurrent(end) ? nowYear : (yearOf(end) ?? from);
  return to >= from ? [from, to] : null;
}

export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function link(raw: string | null | undefined): ContentLink | null {
  const href = webHref(raw ?? "");
  if (!href) return null;
  const url = new URL(href);
  const path = url.pathname.replace(/\/+$/, "");
  return { href, text: `${url.hostname.replace(/^www\./, "")}${path}` };
}

const REPO_LINK = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/([^/?#\s]+)/i;

export function repoName(raw: string): string | null {
  const match = REPO_LINK.exec(raw.trim());
  if (!match?.[1] || !match[2] || !parseGitHubUsername(match[1])) return null;
  return `${match[1]}/${match[2].replace(/\.git$/i, "")}`;
}

const SOCIAL_HOSTS: [RegExp, SocialKind, string][] = [
  [/(^|\.)github\.com$/, "github", "GitHub"],
  [/(^|\.)linkedin\.com$/, "linkedin", "LinkedIn"],
  [/(^|\.)(x|twitter)\.com$/, "x", "X"],
  [/(^|\.)bsky\.app$/, "bluesky", "Bluesky"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube", "YouTube"],
  [/(^|\.)dribbble\.com$/, "dribbble", "Dribbble"],
  [/(^|\.)behance\.net$/, "behance", "Behance"],
  [/(^|\.)instagram\.com$/, "instagram", "Instagram"],
  [/(^|\.)medium\.com$/, "medium", "Medium"],
  [/(^|\.)dev\.to$/, "devto", "DEV"],
  [/(^|\.)stackoverflow\.com$/, "stackoverflow", "Stack Overflow"],
];

const SOCIAL_LABELS: Record<SocialKind, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  youtube: "YouTube",
  dribbble: "Dribbble",
  behance: "Behance",
  instagram: "Instagram",
  medium: "Medium",
  devto: "DEV",
  stackoverflow: "Stack Overflow",
  website: "Website",
  email: "Email",
};

export function socialKindOf(href: string): SocialKind {
  if (href.startsWith("mailto:")) return "email";
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "website";
  }
  const host = url.hostname.toLowerCase();
  for (const [pattern, kind] of SOCIAL_HOSTS) if (pattern.test(host)) return kind;
  if (/^\/@[\w.]+\/?$/.test(url.pathname)) return "mastodon";
  return "website";
}

/** What a reader would recognise: "jordanellis", "in/jordan-ellis", "@jordanbuilds", "jordanellis.dev". */
export function socialHandle(kind: SocialKind, href: string): string {
  if (kind === "email") return href.replace(/^mailto:/, "");
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  switch (kind) {
    case "github":
    case "dribbble":
    case "behance":
    case "devto":
      return parts[0] ?? url.hostname;
    case "linkedin":
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : url.hostname;
    case "x":
    case "instagram":
      return parts[0] ? `@${parts[0].replace(/^@/, "")}` : url.hostname;
    case "bluesky":
      return parts[1] ? `@${parts[1]}` : url.hostname;
    case "mastodon":
      return `${parts[0] ?? ""}@${url.hostname}`;
    case "medium":
      return parts[0] ?? url.hostname;
    default:
      return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`;
  }
}

export function toSocial(
  kind: SocialKind | undefined,
  label: string,
  raw: string,
): ContentSocial | null {
  const href = socialHref(raw);
  if (!href) return null;
  const detected = kind ?? socialKindOf(href);
  return {
    kind: detected,
    label: clean(label) || SOCIAL_LABELS[detected],
    handle: socialHandle(detected, href),
    href,
  };
}

/** Longest phrase first, so "Ledgerly Pay" wins over "Ledgerly". */
export function markParts(paragraph: string, highlights: readonly string[]): TextPart[] {
  const terms = [...new Set(highlights.map(clean).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (terms.length === 0) return paragraph ? [{ text: paragraph, mark: false }] : [];
  const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: paragraph.slice(last, at), mark: false });
    parts.push({ text: match[0], mark: true });
    last = at + match[0].length;
  }
  if (last < paragraph.length) parts.push({ text: paragraph.slice(last), mark: false });
  return parts;
}

export function resumeGitHubUsername(view: Pick<PortfolioView, "github">): string | null {
  return view.github?.href ? parseGitHubUsername(view.github.href) : null;
}
