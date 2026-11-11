import { TEXT_LIMITS } from "@/config/plans";
import {
  MAX_SAVED_REQUIREMENTS,
  SAVED_REQUIREMENT_LIMITS,
  type Resume,
  type SavedRequirement,
  type TailorMeta,
} from "@/lib/resume/schema";

// Read by shape, not type: localStorage copies are never re-parsed and may hold anything.

const MIN_JOB_CHARS = 80;

type LooseMeta = { jobText?: unknown; jobUrl?: unknown; requirements?: unknown };

function loose(meta: TailorMeta): LooseMeta {
  return meta as LooseMeta;
}

export function savedJobText(resume: Resume | null | undefined): string {
  const meta = resume?.tailor;
  if (!meta) return "";
  const value = loose(meta).jobText;
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text.length >= MIN_JOB_CHARS && text.length <= TEXT_LIMITS.jobPostChars ? text : "";
}

export function savedJobUrl(resume: Resume | null | undefined): string {
  const meta = resume?.tailor;
  if (!meta) return "";
  const value = loose(meta).jobUrl;
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";
}

export type { SavedRequirement };

export function savedRequirements(resume: Resume | null | undefined): SavedRequirement[] | null {
  const meta = resume?.tailor;
  if (!meta) return null;
  const list = loose(meta).requirements;
  if (!Array.isArray(list) || list.length > MAX_SAVED_REQUIREMENTS) return null;
  const out = list.map(readRequirement).filter((item): item is SavedRequirement => item !== null);
  return out.length > 0 ? out : null;
}

function readRequirement(value: unknown): SavedRequirement | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { text, importance, terms } = value as Record<string, unknown>;
  if (typeof text !== "string" || text.length > SAVED_REQUIREMENT_LIMITS.textChars) return null;
  const termsRead =
    Array.isArray(terms) &&
    terms.length <= SAVED_REQUIREMENT_LIMITS.terms &&
    terms.every(
      (term) => typeof term === "string" && term.length <= SAVED_REQUIREMENT_LIMITS.termChars,
    );
  return {
    text,
    importance: importance === "must" ? "must" : "nice",
    terms: termsRead ? (terms as string[]) : [],
  };
}

export function savedTerms(resume: Resume): string[] {
  const requirements = savedRequirements(resume);
  if (requirements) {
    const terms = requirements.flatMap((requirement) => requirement.terms);
    if (terms.length > 0) return terms;
  }
  return resume.tailor?.keywords ?? [];
}
