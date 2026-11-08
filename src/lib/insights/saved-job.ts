import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import {
  MAX_SAVED_REQUIREMENTS,
  SavedRequirementSchema,
  type Resume,
  type SavedRequirement,
  type TailorMeta,
} from "@/lib/resume/schema";

// Client-safe. What a tailored copy remembers about its job. Every copy has the title, company and
// keywords; copies made since 2026-11-08 also keep the post's text, its link and the requirement
// list (TailorMetaSchema). Those are still read by shape, not by type: copies in localStorage are
// never re-parsed, so an older or hand-edited one may hold anything there, or nothing.

const MIN_JOB_CHARS = 80;

const RequirementsSchema = z.array(z.unknown()).max(MAX_SAVED_REQUIREMENTS);

type LooseMeta = { jobText?: unknown; jobUrl?: unknown; requirements?: unknown };

function loose(meta: TailorMeta): LooseMeta {
  return meta as LooseMeta;
}

/** The job post's text saved with a tailored copy, or "" when it has none worth sending. */
export function savedJobText(resume: Resume | null | undefined): string {
  const meta = resume?.tailor;
  if (!meta) return "";
  const value = loose(meta).jobText;
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text.length >= MIN_JOB_CHARS && text.length <= TEXT_LIMITS.jobPostChars ? text : "";
}

/** The job link saved with a tailored copy, or "". */
export function savedJobUrl(resume: Resume | null | undefined): string {
  const meta = resume?.tailor;
  if (!meta) return "";
  const value = loose(meta).jobUrl;
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";
}

export type { SavedRequirement };

/**
 * The requirement list saved with a tailored copy, or null when the copy only kept keywords.
 * Entries that don't parse are skipped one by one rather than dropping the whole list.
 */
export function savedRequirements(resume: Resume | null | undefined): SavedRequirement[] | null {
  const meta = resume?.tailor;
  if (!meta) return null;
  const list = RequirementsSchema.safeParse(loose(meta).requirements);
  if (!list.success) return null;
  const out: SavedRequirement[] = [];
  for (const item of list.data) {
    const parsed = SavedRequirementSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out.length > 0 ? out : null;
}

/**
 * The names a screener searches for in this copy's job: the saved requirements' terms when there
 * are any, else the saved keywords. A requirement that is a kind of experience ("mentoring") has
 * no terms and is left out: it can't be counted across jobs word for word.
 */
export function savedTerms(resume: Resume): string[] {
  const requirements = savedRequirements(resume);
  if (requirements) {
    const terms = requirements.flatMap((requirement) => requirement.terms);
    if (terms.length > 0) return terms;
  }
  return resume.tailor?.keywords ?? [];
}
