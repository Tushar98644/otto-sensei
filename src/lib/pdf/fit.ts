import { fmt } from "@/i18n/format";
import { savedTerms } from "@/lib/insights/saved-job";
import { lintBullet, lintResume } from "@/lib/lint/bullets";
import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { extrasOf, type Bullet, type Resume } from "@/lib/resume/schema";
import { findTermIn } from "@/lib/tailor/keywords";
import { textTokens } from "@/lib/tailor/tokens";
import { visibleResume } from "./visible";

export type FitLine = {
  bulletId: string;
  text: string;
  place: string;
  issue: LintIssueId | null;
  offTarget: boolean;
};

export const MAX_FIT_LINES = 32;

const SEVERITY_WEIGHT = { high: 3, low: 1 } as const;

type Group = { place: string; bullets: readonly Bullet[] };

// Where a line sits, in the reader's words.
export type FitPlaces = {
  at: string;
  experience: string;
  project: string;
  education: string;
  extra: string;
};

const ENGLISH_PLACES: FitPlaces = {
  at: "{title} at {company}",
  experience: "Experience",
  project: "Project",
  education: "Education",
  extra: "Extra section",
};

function jobPlace(title: string, company: string, places: FitPlaces): string {
  if (title && company) return fmt(places.at, { title, company });
  return title || company || places.experience;
}

function groups(resume: Resume, places: FitPlaces): Group[] {
  const out: Group[] = [];
  for (const key of resume.sectionOrder) {
    if (key === "experience") {
      for (const job of resume.experience) {
        out.push({ place: jobPlace(job.title, job.company, places), bullets: job.bullets });
      }
    } else if (key === "projects") {
      for (const project of resume.projects) {
        out.push({ place: project.name || places.project, bullets: project.bullets });
      }
    } else if (key === "education") {
      for (const school of resume.education) {
        out.push({
          place: [school.degree, school.school].filter(Boolean).join(", ") || places.education,
          bullets: school.bullets,
        });
      }
    }
  }
  for (const section of extrasOf(resume)) {
    for (const item of section.items) {
      out.push({ place: item.title || section.title || places.extra, bullets: item.bullets });
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

export function fitCandidates(resume: Resume, places: FitPlaces = ENGLISH_PLACES): FitLine[] {
  const shown = visibleResume(resume);
  const lint = lintResume(shown).byBullet;
  const terms = shown.tailor
    ? [...new Set([...savedTerms(shown), ...shown.tailor.keywords])].filter((term) => term.trim())
    : [];
  const ranked: { line: FitLine; weight: number; position: number }[] = [];
  let position = 0;
  for (const group of groups(shown, places)) {
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
  count: number;
  fits: boolean;
};

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
