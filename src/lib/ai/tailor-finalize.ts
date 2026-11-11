import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { findTerm, keywordCoverage, termKey } from "@/lib/tailor/keywords";
import {
  mustProofBulletIds,
  normalizeRequirements,
  withVerifiedQuotes,
  type RawRequirement,
} from "@/lib/tailor/requirements";
import { hasInventedNumbers } from "./guards";
import { cleanList, clip, clipWords, hasPlaceholder, oneLine } from "./text";
import type {
  TailorInput,
  TailorKeyword,
  TailorQuestion,
  TailorRequirement,
  TailorResult,
} from "./types";

// Nothing the model says about the resume is trusted: matches are recomputed, quotes checked word
// for word and invalid orderings dropped.

export type RawTailor = {
  jobTitle: string;
  company: string;
  requirements: RawRequirement[];
  bulletOrder: { experienceId: string; bulletIds: string[] }[];
  summary: string;
  notes: string[];
};

const MAX_KEYWORDS = 25;
const MAX_QUESTIONS = 8;
const MAX_NOTES = 3;
const SUMMARY_CHARS = 600;
const NOTE_CHARS = 200;
// TailorMetaSchema stores keywords and the job fields with these caps.
const TERM_CHARS = 100;
const JOB_FIELD_CHARS = 200;

type RankedKeyword = Pick<TailorKeyword, "term" | "importance">;

function requirementTerms(requirements: readonly TailorRequirement[]): RankedKeyword[] {
  return requirements.flatMap((requirement) =>
    requirement.terms.map((term) => ({ term, importance: requirement.importance })),
  );
}

function rankKeywords(raw: readonly RankedKeyword[]): RankedKeyword[] {
  const seen = new Set<string>();
  const unique: RankedKeyword[] = [];
  for (const keyword of raw) {
    const term = clip(oneLine(keyword.term), TERM_CHARS);
    const key = termKey(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ term, importance: keyword.importance });
  }
  // Must-haves first, so the cap never drops one in favor of a nice-to-have.
  const must = unique.filter((keyword) => keyword.importance === "must");
  const nice = unique.filter((keyword) => keyword.importance === "nice");
  return [...must, ...nice].slice(0, MAX_KEYWORDS);
}

function matchKeywords(ranked: RankedKeyword[], resume: Resume, resumeText: string): TailorKeyword[] {
  const coverage = keywordCoverage(resume, ranked.map((keyword) => keyword.term));
  const byTerm = new Map(coverage.matches.map((match) => [match.term, match]));
  return ranked.map((keyword) => {
    const match = byTerm.get(keyword.term) ?? findTerm(resumeText, keyword.term);
    return { ...keyword, inResume: match.found, evidence: match.evidence };
  });
}

function askAbout(keywords: TailorKeyword[]): TailorQuestion[] {
  return keywords
    .filter((keyword) => !keyword.inResume)
    .slice(0, MAX_QUESTIONS)
    .map((keyword) => ({
      term: keyword.term,
      question: `Have you used ${keyword.term} at work, in a project, or in a course?`,
    }));
}

// Exact permutation of the entry's bullets or nothing, so a line is never dropped or duplicated.
// Lines proving a must-have go first: screeners and skimming recruiters read the top lines first.
function validOrders(
  orders: RawTailor["bulletOrder"],
  resume: Resume,
  proofIds: ReadonlySet<string>,
): TailorResult["bulletOrder"] {
  const proposedById = new Map<string, string[]>();
  for (const order of orders) {
    const job = resume.experience.find((entry) => entry.id === order.experienceId);
    if (!job || proposedById.has(job.id)) continue;
    const ids = job.bullets.map((bullet) => bullet.id);
    const proposed = order.bulletIds;
    const isPermutation =
      proposed.length === ids.length &&
      new Set(proposed).size === proposed.length &&
      proposed.every((id) => ids.includes(id));
    if (isPermutation) proposedById.set(job.id, [...proposed]);
  }
  const valid: TailorResult["bulletOrder"] = [];
  for (const job of resume.experience) {
    const ids = job.bullets.map((bullet) => bullet.id);
    const base = proposedById.get(job.id) ?? ids;
    const aimed = [
      ...base.filter((id) => proofIds.has(id)),
      ...base.filter((id) => !proofIds.has(id)),
    ];
    if (aimed.every((id, index) => id === ids[index])) continue;
    valid.push({ experienceId: job.id, bulletIds: aimed });
  }
  return valid;
}

// A number the resume lacks is a made-up fact, and no summary beats a false one; nor placeholders.
function checkedSummary(summary: string, resumeText: string): string {
  const text = clipWords(oneLine(summary), SUMMARY_CHARS);
  if (!text || hasPlaceholder(text) || hasInventedNumbers(text, [resumeText])) return "";
  return text;
}

export function finalizeTailor(raw: RawTailor, resume: Resume, input: TailorInput): TailorResult {
  const resumeText = resumeToText(resume);
  const requirements = withVerifiedQuotes(resume, normalizeRequirements(raw.requirements));
  const keywords = matchKeywords(rankKeywords(requirementTerms(requirements)), resume, resumeText);
  const sources = [resumeText, input.jobText];
  return {
    job: {
      title: clip(oneLine(input.jobTitle) || oneLine(raw.jobTitle), JOB_FIELD_CHARS),
      company: clip(oneLine(input.company) || oneLine(raw.company), JOB_FIELD_CHARS),
    },
    requirements,
    keywords,
    askUser: askAbout(keywords),
    bulletOrder: validOrders(raw.bulletOrder, resume, mustProofBulletIds(resume, requirements)),
    summary: checkedSummary(raw.summary, resumeText),
    notes: cleanList(
      raw.notes.filter((note) => !hasInventedNumbers(note, sources)),
      MAX_NOTES,
      NOTE_CHARS,
    ),
  };
}
