import { savedTerms } from "@/lib/insights/saved-job";
import { lintBullet, lintResume } from "@/lib/lint/bullets";
import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { extrasOf, type Bullet, type Resume } from "@/lib/resume/schema";
import { findTermIn } from "@/lib/tailor/keywords";
import { textTokens } from "@/lib/tailor/tokens";
import { visibleResume } from "./visible";

// "Fit to one page": which lines to offer for hiding, and how many of them a page needs gone.
// It only ever hides (hidden: true), never deletes, so every line can come back.

export type FitLine = {
  bulletId: string;
  text: string;
  // Where it sits, in words: "Software Engineer at Bluefin Analytics".
  place: string;
  // The line's most important lint issue, if it has one.
  issue: LintIssueId | null;
  // A tailored copy's line that proves none of the job's requirements (names none of its terms).
  offTarget: boolean;
};

// Planning renders the PDF about log2(n) + 1 times, so the list stays short enough to plan in a
// second or two.
export const MAX_FIT_LINES = 32;

const SEVERITY_WEIGHT = { high: 3, low: 1 } as const;

type Group = { place: string; bullets: readonly Bullet[] };

function groups(resume: Resume): Group[] {
  const out: Group[] = [];
  for (const key of resume.sectionOrder) {
    if (key === "experience") {
      for (const job of resume.experience) {
        out.push({
          place: [job.title, job.company].filter(Boolean).join(" at ") || "Experience",
          bullets: job.bullets,
        });
      }
    } else if (key === "projects") {
      for (const project of resume.projects) {
        out.push({ place: project.name || "Project", bullets: project.bullets });
      }
    } else if (key === "education") {
      for (const school of resume.education) {
        out.push({
          place: [school.degree, school.school].filter(Boolean).join(", ") || "Education",
          bullets: school.bullets,
        });
      }
    }
  }
  for (const section of extrasOf(resume)) {
    for (const item of section.items) {
      out.push({ place: item.title || section.title || "Extra section", bullets: item.bullets });
    }
  }
  return out;
}

function weight(issues: readonly LintIssue[]): number {
  return issues.reduce((sum, issue) => sum + SEVERITY_WEIGHT[issue.severity], 0);
}

function topIssue(issues: readonly LintIssue[]): LintIssueId | null {
  return (issues.find((issue) => issue.severity === "high") ?? issues[0])?.id ?? null;
}

/**
 * Lines that could go, least useful first: the weakest lint first, and later lines (older jobs,
 * the end of a list) before earlier ones at the same strength. On a tailored copy, a line that names
 * a requirement's term or a keyword is never offered: it is what the screener looks for. Each entry
 * keeps its first line, so no job is left as a bare heading.
 */
export function fitCandidates(resume: Resume): FitLine[] {
  const shown = visibleResume(resume);
  const lint = lintResume(shown).byBullet;
  const terms = shown.tailor
    ? [...new Set([...savedTerms(shown), ...shown.tailor.keywords])].filter((term) => term.trim())
    : [];
  const ranked: { line: FitLine; weight: number; position: number }[] = [];
  let position = 0;
  for (const group of groups(shown)) {
    const lines = group.bullets.filter((bullet) => bullet.text.trim() !== "");
    for (const bullet of lines.slice(1)) {
      position += 1;
      const issues = lint[bullet.id] ?? lintBullet(bullet.text);
      let offTarget = false;
      if (terms.length > 0) {
        const tokens = textTokens(bullet.text);
        if (terms.some((term) => findTermIn(bullet.text, tokens, term).found)) continue;
        offTarget = true;
      }
      ranked.push({
        line: {
          bulletId: bullet.id,
          text: bullet.text.trim(),
          place: group.place,
          issue: topIssue(issues),
          offTarget,
        },
        weight: weight(issues),
        position,
      });
    }
  }
  return ranked
    .sort((a, b) => b.weight - a.weight || b.position - a.position)
    .slice(0, MAX_FIT_LINES)
    .map((item) => item.line);
}

function setHidden(resume: Resume, ids: ReadonlySet<string>, hidden: boolean): Resume {
  if (ids.size === 0) return resume;
  let changed = false;
  const lines = (bullets: Bullet[]): Bullet[] =>
    bullets.map((bullet) => {
      if (!ids.has(bullet.id) || (bullet.hidden === true) === hidden) return bullet;
      changed = true;
      if (hidden) return { ...bullet, hidden: true };
      const shown = { ...bullet };
      delete shown.hidden;
      return shown;
    });
  const entries = <T extends { bullets: Bullet[] }>(items: T[]): T[] =>
    items.map((item) => ({ ...item, bullets: lines(item.bullets) }));
  const next: Resume = {
    ...resume,
    experience: entries(resume.experience),
    projects: entries(resume.projects),
    education: entries(resume.education),
    extras: extrasOf(resume).map((section) => ({ ...section, items: entries(section.items) })),
  };
  return changed ? next : resume;
}

export function hideLines(resume: Resume, ids: ReadonlySet<string>): Resume {
  return setHidden(resume, ids, true);
}

export function showLines(resume: Resume, ids: ReadonlySet<string>): Resume {
  return setHidden(resume, ids, false);
}

export type FitPlan = {
  // How many lines from the top of the list to hide.
  count: number;
  // False when hiding every line on the list still leaves more than one page.
  fits: boolean;
};

/**
 * The fewest lines, taken from the top of `lines`, whose hiding fits the resume on one page.
 * `pagesOf` renders a resume and counts its pages; hiding more never adds a page, so a binary
 * search finds the answer in about log2(n) + 1 renders.
 */
export async function planFit(
  resume: Resume,
  lines: readonly FitLine[],
  pagesOf: (resume: Resume) => Promise<number>,
): Promise<FitPlan> {
  const hideFirst = (count: number) =>
    hideLines(resume, new Set(lines.slice(0, count).map((line) => line.bulletId)));
  if (lines.length === 0 || (await pagesOf(hideFirst(lines.length))) > 1) {
    return { count: lines.length, fits: false };
  }
  let low = 1;
  let high = lines.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((await pagesOf(hideFirst(middle))) <= 1) high = middle;
    else low = middle + 1;
  }
  return { count: high, fits: true };
}
