import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { findTerm, keywordCoverage, normalizeTerm } from "@/lib/tailor/keywords";
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

// Turns a raw tailoring answer (from the model or the demo) into a TailorResult. Nothing the model
// says about the resume is trusted: matches are recomputed here, quotes checked word for word and
// invalid orderings dropped.

export type RawTailor = {
  jobTitle: string;
  company: string;
  requirements: RawRequirement[];
  // Real experience and bullet ids.
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

// Spaces are dropped because matching ignores them too: "front end" and "frontend" are one term.
function termKey(term: string): string {
  return normalizeTerm(term).replace(/ /g, "");
}

// Every name a requirement can be searched by, so the tailored copy keeps a keyword list.
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
  // One tokenization of the resume for every term, instead of one per term.
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

// Same rule as reorderBullets(): an exact permutation of the entry's bullets or nothing, so an
// ordering can never drop or duplicate a line. Then the lines that prove a must-have go to the top
// of their job, keeping the model's order otherwise: an AI screener and a skimming recruiter both
// read the top lines first. Orders that change nothing are left out.
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

// A number the resume doesn't contain ("8 years of experience") is a made-up fact, and no
// summary beats a false one. Placeholders don't belong in a ready-to-use summary either.
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
