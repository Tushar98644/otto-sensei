import { resumeLang } from "@/lib/resume/lang";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { findTermIn } from "@/lib/tailor/keywords";
import { textTokens } from "@/lib/tailor/tokens";
import { lintResume, lintSummary } from "./bullets";
import type { LintIssue, LintIssueId, LintSeverity, ResumeLint } from "./types";

export type ReviewItemId =
  LintIssueId | "first-look" | "summary-voice" | "skills-unshown" | "headline";

export type ReviewTarget =
  | { kind: "line"; bulletId: string }
  | { kind: "entry"; entryId: string }
  | { kind: "summary" }
  | { kind: "basics" };

export type ReviewLine = {
  target: ReviewTarget;
  place: string;
  text: string;
  message: string;
};

export type ReviewItem = {
  id: ReviewItemId;
  severity: LintSeverity;
  title: string;
  reason: string;
  lines: ReviewLine[];
  more: number;
  target: ReviewTarget | null;
};

export type ResumeReview = {
  items: ReviewItem[];
  top: ReviewItem[];
};

export const MAX_TOP = 3;
const MAX_LINES = 5;
const MAX_NUMBER_LINES = 3;
const MAX_SKILL_NAMES = 5;
const MAX_SKILL_WORDS = 3;

const RANK: Record<ReviewItemId, number> = {
  "first-look": 0,
  duty: 1,
  "no-result": 2,
  "weak-start": 3,
  "first-person": 4,
  "summary-voice": 5,
  "stock-phrase": 6,
  "too-long": 7,
  tense: 8,
  headline: 9,
  "skills-unshown": 10,
  passive: 11,
  vague: 12,
  duplicate: 13,
  "too-short": 14,
  "no-method": 15,
  "no-number": 16,
  punctuation: 17,
};
const FILLERS: readonly ReviewItemId[] = ["no-number", "punctuation"];

type Group = { title: (count: number) => string; reason: string };

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
const lines = (count: number) => `${count} ${plural(count, "line", "lines")}`;

const GROUPS: Record<LintIssueId, Group> = {
  duty: {
    title: (n) => `${lines(n)} ${plural(n, "reads", "read")} like a job description`,
    reason: "Recruiters look for what you did and what changed, not the duty itself.",
  },
  "no-result": {
    title: (n) => `${lines(n)} ${plural(n, "doesn't", "don't")} say what changed`,
    reason:
      "Each line should end in a result: what got better, for whom, and how much if you know.",
  },
  "weak-start": {
    title: (n) => `${lines(n)} ${plural(n, "starts", "start")} weak`,
    reason: "Start with what you did, like Built, Cut, Led or Wrote.",
  },
  "first-person": {
    title: (n) => `${lines(n)} ${plural(n, "uses", "use")} I, me or we`,
    reason: "Resume lines leave out I, me and my.",
  },
  "stock-phrase": {
    title: (n) => `${lines(n)} ${plural(n, "uses", "use")} stock phrases`,
    reason: "Phrases every resume has get skimmed past. Show the result instead.",
  },
  "too-long": {
    title: (n) => `${lines(n)} ${plural(n, "runs", "run")} past two lines`,
    reason: "Long lines get skipped. Keep each one to one or two lines.",
  },
  tense: {
    title: (n) => `${lines(n)} in past jobs ${plural(n, "uses", "use")} present tense`,
    reason: "Jobs you've left read in past tense: Built, not Build.",
  },
  passive: {
    title: (n) => `${lines(n)} ${plural(n, "hides", "hide")} who did the work`,
    reason: "Say what you did, not what was done.",
  },
  vague: {
    title: (n) => `${lines(n)} ${plural(n, "uses", "use")} vague words`,
    reason: "Words like various or several stand in for a real number or name.",
  },
  duplicate: {
    title: (n) => `${lines(n)} ${plural(n, "repeats", "repeat")} another`,
    reason: "Keep one, or make each say something new.",
  },
  "too-short": {
    title: (n) => `${lines(n)} ${plural(n, "is", "are")} too short`,
    reason: "A few words can't show what you did and what changed.",
  },
  "no-method": {
    title: (n) => `${n} ${plural(n, "result doesn't", "results don't")} say how`,
    reason: "A result reads stronger with how you got it: by doing what.",
  },
  "no-number": {
    title: (n) => `${lines(n)} could use a number`,
    reason: "Where you know it, a number shows the size: how many, how much, how fast.",
  },
  punctuation: {
    title: (n) => `Full stops don't match in ${lines(n)}`,
    reason:
      "Lines under one job or project read neater when they all end the same way: with a full stop, or without.",
  },
};

function summaryItem(resume: Resume): ReviewItem | null {
  const issues = lintSummary(resume.summary, resumeLang(resume));
  if (issues.length === 0) return null;
  const target: ReviewTarget = { kind: "summary" };
  return {
    id: "summary-voice",
    severity: "high",
    title:
      issues.length > 1
        ? "Your summary uses stock phrases and I"
        : issues[0]?.id === "first-person"
          ? "Your summary uses I or we"
          : "Your summary uses stock phrases",
    reason: "The top of the page gets read first, so it should sound like your lines: facts, no I.",
    lines: [
      {
        target,
        place: "Summary",
        text: resume.summary.trim(),
        message: issues.map((issue) => issue.message).join(" "),
      },
    ],
    more: 0,
    target,
  };
}

function firstLookItem(resume: Resume): ReviewItem | null {
  const found: ReviewLine[] = [];
  for (const job of resume.experience) {
    if (job.hidden) continue;
    const missing = [
      job.title.trim() ? null : "job title",
      job.company.trim() ? null : "company",
      job.startDate.trim() ? null : "dates",
    ].filter((part): part is string => part !== null);
    if (missing.length === 0) continue;
    const label = [job.title, job.company].filter((part) => part.trim()).join(" at ") || "A job";
    const list =
      missing.length > 1 ? `${missing.slice(0, -1).join(", ")} or ${missing.at(-1)}` : missing[0];
    found.push({
      target: { kind: "entry", entryId: job.id },
      place: label,
      text: label,
      message: `No ${list}.`,
    });
  }
  const [first] = found;
  if (!first) return null;
  return {
    id: "first-look",
    severity: "high",
    title: `${found.length} ${plural(found.length, "job is", "jobs are")} missing a title, company or dates`,
    reason: "A recruiter's first look goes to your job titles, companies and dates.",
    lines: found.slice(0, MAX_LINES),
    more: Math.max(0, found.length - MAX_LINES),
    target: first.target,
  };
}

function headlineItem(resume: Resume): ReviewItem | null {
  if (resume.basics.headline.trim()) return null;
  return {
    id: "headline",
    severity: "low",
    title: "No job title under your name",
    reason: "Put the job you want at the top, so the reader knows what you're applying as.",
    lines: [],
    more: 0,
    target: { kind: "basics" },
  };
}

function skillsItem(resume: Resume): ReviewItem | null {
  const shown = listBullets(resume)
    .filter((ref) => ref.section === "experience" || ref.section === "projects")
    .map((ref) => ref.text)
    .join("\n");
  const tokens = textTokens(shown);
  const seen = new Set<string>();
  const unshown: string[] = [];
  for (const group of resume.skills) {
    for (const raw of group.items) {
      const skill = raw.trim();
      const key = skill.toLowerCase();
      if (!skill || seen.has(key) || skill.split(/\s+/).length > MAX_SKILL_WORDS) continue;
      seen.add(key);
      if (!findTermIn(shown, tokens, skill).found) unshown.push(skill);
    }
  }
  if (unshown.length === 0) return null;
  const named = unshown.slice(0, MAX_SKILL_NAMES);
  const rest = unshown.length - named.length;
  const list = rest > 0 ? `${named.join(", ")} and ${rest} more` : joinAnd(named);
  const first = listBullets(resume).find((ref) => ref.section === "experience" && ref.text.trim());
  return {
    id: "skills-unshown",
    severity: "low",
    title: `${unshown.length} ${plural(unshown.length, "skill is", "skills are")} only in your Skills list`,
    reason: `${list}: no job or project line shows you using ${plural(unshown.length, "it", "them")}. Recruiters and screeners trust a skill more in a line about what you did.`,
    lines: [],
    more: 0,
    target: first ? { kind: "line", bulletId: first.bulletId } : null,
  };
}

function joinAnd(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function lineGroups(resume: Resume, lint: ResumeLint): ReviewItem[] {
  const byId = new Map<LintIssueId, { severity: LintSeverity; lines: ReviewLine[] }>();
  for (const ref of listBullets(resume)) {
    if (!ref.text.trim()) continue;
    const issues: readonly LintIssue[] = Object.hasOwn(lint.byBullet, ref.bulletId)
      ? (lint.byBullet[ref.bulletId] ?? [])
      : [];
    for (const issue of issues) {
      const group = byId.get(issue.id) ?? { severity: issue.severity, lines: [] };
      group.lines.push({
        target: { kind: "line", bulletId: ref.bulletId },
        place: ref.parentLabel,
        text: ref.text.trim(),
        message: issue.message,
      });
      byId.set(issue.id, group);
    }
  }
  return [...byId].map(([id, group]) => {
    const cap = id === "no-number" ? MAX_NUMBER_LINES : MAX_LINES;
    const [first] = group.lines;
    return {
      id,
      severity: group.severity,
      title: GROUPS[id].title(group.lines.length),
      reason: GROUPS[id].reason,
      lines: group.lines.slice(0, cap),
      more: Math.max(0, group.lines.length - cap),
      target: first?.target ?? null,
    };
  });
}

export function rankReview(items: readonly ReviewItem[]): ResumeReview {
  const sorted = [...items].sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1) || RANK[a.id] - RANK[b.id],
  );
  const top = sorted.filter((item) => !FILLERS.includes(item.id)).slice(0, MAX_TOP);
  for (const id of FILLERS) {
    const filler = sorted.find((item) => item.id === id);
    if (filler && top.length < MAX_TOP) top.push(filler);
  }
  return { items: sorted, top };
}

export function reviewResume(resume: Resume, lint: ResumeLint = lintResume(resume)): ResumeReview {
  const items = [
    firstLookItem(resume),
    summaryItem(resume),
    headlineItem(resume),
    skillsItem(resume),
    ...lineGroups(resume, lint),
  ].filter((item): item is ReviewItem => item !== null);
  return rankReview(items);
}
