import type { TailorResult } from "@/lib/ai/types";
import { normalizeJobUrl } from "@/lib/applications/schema";
import { addSkills, reorderBullets } from "@/lib/resume/ops";
import {
  COVER_LETTER_CHARS,
  JOB_TEXT_CHARS,
  MAX_SAVED_REQUIREMENTS,
  type Bullet,
  type Resume,
  type SavedRequirement,
} from "@/lib/resume/schema";
import type { TailorCopyMeta } from "@/lib/store/resume-store";
import studioTailorEn from "@/i18n/messages/en/studio-tailor";
import type { ReasonWords } from "@/lib/tailor/reasons";
import { refPlace, type ScreenerOptions } from "@/lib/tailor/requirements";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { PluralForms } from "@/i18n/types";
import { joinList } from "@/lib/lint/i18n";
import { countText } from "../count";

const MAX_KEYWORDS = 60;
const MAX_TERM_CHARS = 100;
const MAX_SKILL_ITEMS = 100;
const MAX_SUMMARY_CHARS = 3_000;
const MAX_JOB_FIELD_CHARS = 200;
const MAX_BULLET_CHARS = 1_000;
const MAX_BULLETS = { experience: 40, projects: 20 } as const;

export type AddedLine = { id: string; parentId: string; text: string };

export type RequirementChoice = { kind: "no" } | { kind: "line"; line: AddedLine };

export type TailorChoices = {
  requirements: Record<string, RequirementChoice>;
  reorder: Record<string, boolean>;
  useSummary: boolean;
};

export type ReorderPlan = {
  experienceId: string;
  label: string;
  bulletIds: string[];
  movedUp: Bullet[];
};

export type LineTarget = { id: string; section: "experience" | "projects"; label: string };

export function tailorTerms(result: TailorResult): string[] {
  return result.keywords
    .map((keyword) => keyword.term.trim().slice(0, MAX_TERM_CHARS))
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS);
}

function isPermutation(current: readonly string[], proposed: readonly string[]): boolean {
  if (current.length !== proposed.length) return false;
  const remaining = new Set(current);
  return proposed.every((id) => remaining.delete(id)) && remaining.size === 0;
}

type TargetWords = Pick<ReasonWords, "places" | "targets">;

const ENGLISH_TARGETS: TargetWords = studioTailorEn.reasons;

export function reorderPlans(
  resume: Resume,
  result: TailorResult,
  t: TargetWords = ENGLISH_TARGETS,
): ReorderPlan[] {
  const plans: ReorderPlan[] = [];
  const seen = new Set<string>();
  for (const order of result.bulletOrder) {
    const job = resume.experience.find((entry) => entry.id === order.experienceId);
    const ids = job?.bullets.map((bullet) => bullet.id) ?? [];
    if (!job || seen.has(job.id) || !isPermutation(ids, order.bulletIds)) continue;
    seen.add(job.id);
    const position = new Map(job.bullets.map((bullet, index) => [bullet.id, index]));
    const byId = new Map(job.bullets.map((bullet) => [bullet.id, bullet]));
    const movedUp = order.bulletIds
      .filter((id, index) => index < (position.get(id) ?? index))
      .map((id) => byId.get(id))
      .filter((bullet): bullet is Bullet => bullet !== undefined && bullet.text.trim() !== "");
    if (movedUp.length === 0) continue;
    const label = refPlace(
      { section: "experience", roleTitle: job.title, company: job.company, parentLabel: "" },
      t.places,
    );
    plans.push({ experienceId: job.id, label, bulletIds: order.bulletIds, movedUp });
  }
  return plans;
}

export function lineTargets(resume: Resume, t: TargetWords = ENGLISH_TARGETS): LineTarget[] {
  const named = (title: string, company: string) => {
    const parts = [title, company].filter((part) => part.trim());
    const [first = "", second] = parts;
    return second ? fmt(t.places.at, { title: first, company: second }) : first;
  };
  return [
    ...resume.experience.map((job) => ({
      id: job.id,
      section: "experience" as const,
      label: named(job.title, job.company) || t.targets.aJob,
    })),
    ...resume.projects.map((project) => ({
      id: project.id,
      section: "projects" as const,
      label: fmt(t.targets.project, { name: project.name.trim() || t.targets.untitled }),
    })),
  ];
}

function addedLines(result: TailorResult, choices: TailorChoices) {
  return result.requirements.flatMap((requirement) => {
    const choice = choices.requirements[requirement.id];
    if (choice?.kind !== "line" || !choice.line.text.trim()) return [];
    return [{ requirement, line: choice.line }];
  });
}

function withAddedLines(resume: Resume, result: TailorResult, choices: TailorChoices): Resume {
  let next = resume;
  const atTop = new Map<string, number>();
  for (const { requirement, line } of addedLines(result, choices)) {
    const bullet: Bullet = { id: line.id, text: line.text.trim().slice(0, MAX_BULLET_CHARS) };
    const place = <T extends { id: string; bullets: Bullet[] }>(entry: T, max: number): T => {
      if (entry.id !== line.parentId || entry.bullets.length >= max) return entry;
      if (entry.bullets.some((existing) => existing.id === bullet.id)) return entry;
      if (requirement.importance === "nice") {
        return { ...entry, bullets: [...entry.bullets, bullet] };
      }
      const index = atTop.get(entry.id) ?? 0;
      atTop.set(entry.id, index + 1);
      return {
        ...entry,
        bullets: [...entry.bullets.slice(0, index), bullet, ...entry.bullets.slice(index)],
      };
    };
    next = {
      ...next,
      experience: next.experience.map((job) => place(job, MAX_BULLETS.experience)),
      projects: next.projects.map((project) => place(project, MAX_BULLETS.projects)),
    };
  }
  return next;
}

export function confirmedSkills(result: TailorResult, choices: TailorChoices): string[] {
  return addedLines(result, choices)
    .map(({ requirement }) => requirement.terms[0]?.trim().slice(0, MAX_TERM_CHARS) ?? "")
    .filter(Boolean);
}

function addConfirmedSkills(resume: Resume, skills: string[]): Resume {
  const existing = new Set(
    resume.skills.flatMap((group) => group.items.map((item) => item.trim().toLowerCase())),
  );
  const fresh = [...new Set(skills)].filter((skill) => !existing.has(skill.toLowerCase()));
  const room = MAX_SKILL_ITEMS - (resume.skills[0]?.items.length ?? 0);
  return addSkills(resume, fresh.slice(0, Math.max(0, room)));
}

export function defaultChoices(resume: Resume, result: TailorResult): TailorChoices {
  return {
    requirements: {},
    reorder: {},
    useSummary: !resume.summary.trim() && result.summary.trim() !== "",
  };
}

export function applyTailorChoices(
  resume: Resume,
  result: TailorResult,
  choices: TailorChoices,
): Resume {
  let next = resume;
  for (const plan of reorderPlans(resume, result)) {
    if (choices.reorder[plan.experienceId] !== false) {
      next = reorderBullets(next, plan.experienceId, plan.bulletIds);
    }
  }
  next = withAddedLines(next, result, choices);
  next = addConfirmedSkills(next, confirmedSkills(result, choices));
  const summary = result.summary.trim();
  if (choices.useSummary && summary) {
    next = { ...next, summary: summary.slice(0, MAX_SUMMARY_CHARS) };
  }
  return next;
}

// Skips the suggested summary: it's written from the skills list, so it adds no proof.
export function screenerResume(
  source: Resume,
  result: TailorResult,
  choices: TailorChoices,
): Resume {
  return { ...applyTailorChoices(source, result, choices), summary: source.summary };
}

export function screenerOptions(
  choices: TailorChoices,
): Required<Omit<ScreenerOptions, "places">> {
  const declined = new Set<string>();
  const linked = new Map<string, string>();
  for (const [id, choice] of Object.entries(choices.requirements)) {
    if (choice.kind === "no") declined.add(id);
    else linked.set(id, choice.line.id);
  }
  return { declined, linked };
}

export type TailorJob = {
  title: string;
  company: string;
  text?: string;
  link?: string;
  posting?: { url: string } | null;
  jobId?: string | null;
};

function savedRequirementsOf(result: TailorResult): SavedRequirement[] {
  return result.requirements.slice(0, MAX_SAVED_REQUIREMENTS).map((requirement) => ({
    text: requirement.text.trim().slice(0, 300),
    importance: requirement.importance,
    terms: requirement.terms
      .map((term) => term.trim().slice(0, MAX_TERM_CHARS))
      .filter(Boolean)
      .slice(0, 8),
  }));
}

export function tailorMeta(result: TailorResult, job: TailorJob, coverLetter = ""): TailorCopyMeta {
  const letter = coverLetter.trim().slice(0, COVER_LETTER_CHARS);
  const jobText = (job.text ?? "").trim().slice(0, JOB_TEXT_CHARS);
  const jobUrl = normalizeJobUrl(job.posting?.url ?? job.link ?? "") ?? "";
  const requirements = savedRequirementsOf(result);
  return {
    jobTitle: (job.title.trim() || result.job.title.trim()).slice(0, MAX_JOB_FIELD_CHARS),
    company: (job.company.trim() || result.job.company.trim()).slice(0, MAX_JOB_FIELD_CHARS),
    keywords: tailorTerms(result),
    ...(letter ? { coverLetter: letter } : {}),
    ...(jobText ? { jobText } : {}),
    ...(jobUrl ? { jobUrl } : {}),
    ...(requirements.length > 0 ? { requirements } : {}),
    ...(job.jobId ? { jobId: job.jobId } : {}),
  };
}

export type ChangeSummary = {
  lines: number;
  skills: number;
  reorderedJobs: number;
  summary: boolean;
};

export function summarizeChoices(
  resume: Resume,
  result: TailorResult,
  choices: TailorChoices,
): ChangeSummary {
  const listed = new Set(
    resume.skills.flatMap((group) => group.items.map((item) => item.trim().toLowerCase())),
  );
  const newSkills = confirmedSkills(result, choices).filter(
    (skill) => !listed.has(skill.toLowerCase()),
  );
  return {
    lines: addedLines(result, choices).length,
    skills: new Set(newSkills).size,
    reorderedJobs: reorderPlans(resume, result).filter(
      (plan) => choices.reorder[plan.experienceId] !== false,
    ).length,
    summary: choices.useSummary && result.summary.trim() !== "",
  };
}

type ChangeWords = {
  lines: PluralForms;
  skills: PluralForms;
  reordered: PluralForms;
  summary: string;
};
type ChangeCopy = ChangeWords & { inline: ChangeWords; sentence: string; none: string };

function changeParts(
  words: ChangeWords,
  format: Format,
  { lines, skills, reorderedJobs, summary }: ChangeSummary,
): string[] {
  return [
    lines ? countText(format, words.lines, lines) : null,
    skills ? countText(format, words.skills, skills) : null,
    reorderedJobs ? countText(format, words.reordered, reorderedJobs) : null,
    summary ? words.summary : null,
  ].filter((line): line is string => line !== null);
}

export function changeLines(t: ChangeCopy, format: Format, changes: ChangeSummary): string[] {
  return changeParts(t, format, changes);
}

export function describeChanges(t: ChangeCopy, format: Format, changes: ChangeSummary): string {
  const parts = changeParts(t.inline, format, changes);
  if (parts.length === 0) return t.none;
  return fmt(t.sentence, { changes: joinList(parts, format.locale) });
}
