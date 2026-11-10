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
import type { ScreenerOptions } from "@/lib/tailor/requirements";

// Pure tailoring logic: what the result offers, and what the user picked, applied to a copy.

// ResumeSchema limits, so a tailored copy always passes validation when it syncs to the cloud.
const MAX_KEYWORDS = 60;
const MAX_TERM_CHARS = 100;
const MAX_SKILL_ITEMS = 100;
const MAX_SUMMARY_CHARS = 3_000;
const MAX_JOB_FIELD_CHARS = 200;
const MAX_BULLET_CHARS = 1_000;
const MAX_BULLETS = { experience: 40, projects: 20 } as const;

// A line the person wrote for a requirement the resume didn't show. Its id is made when it is
// added, so the screener view can point at it before the copy exists.
export type AddedLine = { id: string; parentId: string; text: string };

// "no": the person doesn't have it, so it stays missing and nothing is ever added for it.
export type RequirementChoice = { kind: "no" } | { kind: "line"; line: AddedLine };

export type TailorChoices = {
  // Screener answers by requirement id. Unanswered requirements are simply not shown yet.
  requirements: Record<string, RequirementChoice>;
  // Per experience id; a missing entry means the reorder is on.
  reorder: Record<string, boolean>;
  useSummary: boolean;
};

export type ReorderPlan = {
  experienceId: string;
  // "Backend Engineer at Stripe"
  label: string;
  bulletIds: string[];
  // Lines that end up higher than they are now, in their new order.
  movedUp: Bullet[];
};

// Where a new line can go: a job, or a project when there are no jobs that fit.
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

export function reorderPlans(resume: Resume, result: TailorResult): ReorderPlan[] {
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
    const label = [job.title, job.company].filter(Boolean).join(" at ") || "Experience";
    plans.push({ experienceId: job.id, label, bulletIds: order.bulletIds, movedUp });
  }
  return plans;
}

export function lineTargets(resume: Resume): LineTarget[] {
  return [
    ...resume.experience.map((job) => ({
      id: job.id,
      section: "experience" as const,
      label: [job.title, job.company].filter((part) => part.trim()).join(" at ") || "A job",
    })),
    ...resume.projects.map((project) => ({
      id: project.id,
      section: "projects" as const,
      label: `Project: ${project.name.trim() || "untitled"}`,
    })),
  ];
}

// Lines the person added, in requirement order, with the requirement they answer.
function addedLines(result: TailorResult, choices: TailorChoices) {
  return result.requirements.flatMap((requirement) => {
    const choice = choices.requirements[requirement.id];
    if (choice?.kind !== "line" || !choice.line.text.trim()) return [];
    return [{ requirement, line: choice.line }];
  });
}

// A must-have's line goes to the top of its job, where a screener and a skimming recruiter look
// first; a nice-to-have's goes after the lines already there.
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

// A tool the person confirmed with a line of their own also belongs in their skills, where
// recruiters search for it by name.
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
  // addSkills() appends to the first group, which holds at most MAX_SKILL_ITEMS.
  const room = MAX_SKILL_ITEMS - (resume.skills[0]?.items.length ?? 0);
  return addSkills(resume, fresh.slice(0, Math.max(0, room)));
}

export function defaultChoices(resume: Resume, result: TailorResult): TailorChoices {
  // A suggested summary fills an empty one by default, but never replaces the user's own
  // without a tick.
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

/**
 * The copy as the screener view should judge it: every choice applied except the suggested
 * summary. That summary is written from the resume's own skills list, so counting it would turn
 * "Listed but not shown" into "Proven" without a single new line of proof.
 */
export function screenerResume(
  source: Resume,
  result: TailorResult,
  choices: TailorChoices,
): Resume {
  return { ...applyTailorChoices(source, result, choices), summary: source.summary };
}

export function screenerOptions(choices: TailorChoices): Required<ScreenerOptions> {
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
  // The post as it was sent; optional so callers that only know the names still work.
  text?: string;
  // The link as typed, and the address it was read from.
  link?: string;
  posting?: { url: string } | null;
  // The Jobs tab opening it came from, when it did.
  jobId?: string | null;
};

// What the screener read from the post, inside TailorMetaSchema's caps.
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

// The user's own title and company win; the model's reading of the post fills any gaps. The post's
// text, link and requirements go on the copy too, so later steps work from the real job.
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
