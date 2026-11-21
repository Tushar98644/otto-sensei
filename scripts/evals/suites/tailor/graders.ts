import { isDeepStrictEqual } from "node:util";
import type { z } from "zod";
import { applyTailorChoices, defaultChoices } from "@/components/studio/tailor/apply";
import { clip, oneLine } from "@/lib/ai/text";
import type { TailorResult } from "@/lib/ai/types";
import { sentencesOf, upgradedVerbs } from "@/lib/ai/writing-guards";
import type { TailorRequestSchema } from "@/lib/api/types";
import type { Grade } from "@/lib/evals/graders";
import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { findTerm, termKey } from "@/lib/tailor/keywords";
import { foldCase } from "@/lib/tailor/tokens";
import type { EvalCase } from "../../suite";

// A term with its other spellings, any of which counts.
export type Term = string | readonly string[];

export type TailorBody = z.output<typeof TailorRequestSchema>;

export type TailorExpect = {
  // Asked for by the post and shown by the resume: the result should find them.
  covered: readonly Term[];
  // Asked for by the post and missing from the resume: the result must not claim them.
  gaps: readonly Term[];
  must?: readonly Term[];
  nice?: readonly Term[];
  // Words on the page that are not this job's requirements (benefits, other listings).
  notRequired?: readonly Term[];
  // Checked only when the request leaves the field empty; "" means the post names none.
  jobTitle?: string;
  company?: string;
  // Experience id to the bullet ids allowed to lead that entry after tailoring.
  leads?: Readonly<Record<string, readonly string[]>>;
  allGuess?: boolean;
  notesMention?: readonly Term[];
};

export type TailorCase = EvalCase<TailorBody, TailorResult, TailorExpect>;

const JOB_FIELD_CHARS = 200;
const SUMMARY_SENTENCES = { min: 2, max: 3 };
const SHOWN = 4;

const WORD = /[\p{L}\p{N}]+(?:['’]\p{L}+)?/gu;
const SENTENCE_END = /[.!?]["”’)]?$/u;
const PRONOUNS: ReadonlySet<string> = new Set(["I", "I'm", "I've", "I'd", "I'll"]);
const SENIORITY: ReadonlySet<string> = new Set([
  "senior",
  "sr",
  "lead",
  "principal",
  "head",
  "chief",
  "director",
  "manager",
  "supervisor",
  "vp",
  "architect",
  "sous",
  "foreman",
  "superintendent",
]);
const NUMBER_WORDS: ReadonlyMap<string, number> = new Map([
  ...[
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
  ].map((word, value): [string, number] => [word, value]),
  ["thirty", 30],
  ["forty", 40],
  ["fifty", 50],
  ["sixty", 60],
  ["seventy", 70],
  ["eighty", 80],
  ["ninety", 90],
  ["hundred", 100],
  ["thousand", 1000],
  ["dozen", 12],
]);
const COMPOUND =
  /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)\b/g;
const DECADE = /^decades?$/;
// "one" reads as a pronoun far more often than a count.
const UNCOUNTED: ReadonlySet<string> = new Set(["one"]);
const BACHELOR = ["bachelor", "ba", "bs", "bsc", "beng", "bsn", "bba"];
const MASTER = ["master", "ma", "ms", "msc", "meng", "msn", "mfa", "mba"];
const DOCTORATE = ["phd", "doctorate", "doctoral", "dphil"];
const DEGREE_BACKING: ReadonlyMap<string, readonly string[]> = new Map([
  ...BACHELOR.map((word): [string, readonly string[]] => [word, BACHELOR]),
  ...MASTER.map((word): [string, readonly string[]] => [word, MASTER]),
  ...DOCTORATE.map((word): [string, readonly string[]] => [word, DOCTORATE]),
  ["mba", ["mba"]],
]);
// Too short to read as a degree claim ("LC-MS", "MS Excel"), but they still back one.
const BACKING_ONLY: ReadonlySet<string> = new Set(["ba", "bs", "ma", "ms"]);
const ANY_DEGREE = /^(?:degree|degrees|diploma)$/;
const ALIAS = /\b[eb]\d+\b/i;

const spellings = (term: Term): readonly string[] => (typeof term === "string" ? [term] : term);
const label = (term: Term) => spellings(term)[0] ?? "";

function sameTerm(a: string, b: string): boolean {
  const key = termKey(a);
  return (key !== "" && key === termKey(b)) || findTerm(a, b).found || findTerm(b, a).found;
}

const hits = (text: string, term: Term) =>
  spellings(term).some((spelling) => sameTerm(text, spelling));
const mentions = (text: string, term: Term) =>
  spellings(term).some((spelling) => findTerm(text, spelling).found);

function listed(items: readonly string[]): string {
  const more = items.length > SHOWN ? ` (+${items.length - SHOWN} more)` : "";
  return `${items.slice(0, SHOWN).join(", ")}${more}`;
}

function grade(name: string, failures: readonly string[], passed: string): Grade {
  return failures.length === 0
    ? { name, pass: true, detail: passed }
    : { name, pass: false, detail: listed(failures) };
}

const resumeOf = (kase: TailorCase) => kase.input.resume;
const resumeTextOf = (kase: TailorCase) => resumeToText(resumeOf(kase));

function requirementNamed(output: TailorResult, term: Term) {
  return output.requirements.filter(
    (requirement) =>
      mentions(requirement.text, term) || requirement.terms.some((name) => hits(name, term)),
  );
}

function isCovered(output: TailorResult, term: Term): boolean {
  const byKeyword = output.keywords.some((keyword) => keyword.inResume && hits(keyword.term, term));
  return (
    byKeyword || requirementNamed(output, term).some((requirement) => requirement.quote !== "")
  );
}

function isFlagged(output: TailorResult, term: Term): boolean {
  const byKeyword = output.keywords.some(
    (keyword) => !keyword.inResume && hits(keyword.term, term),
  );
  const byRequirement = requirementNamed(output, term).some(
    (requirement) => requirement.terms.length === 0 && requirement.quote === "",
  );
  return byKeyword || byRequirement;
}

function recall(name: string, wanted: readonly Term[], found: (term: Term) => boolean): Grade {
  const missed = wanted.filter((term) => !found(term)).map(label);
  // Up to one miss in four is allowed, so a long list survives one odd spelling.
  const allowed = Math.floor(wanted.length / 4);
  const detail = `${wanted.length - missed.length} of ${wanted.length} found`;
  return {
    name,
    pass: missed.length <= allowed,
    detail: missed.length === 0 ? detail : `${detail}; missed ${listed(missed)}`,
  };
}

export function requirementsFound(output: TailorResult): Grade {
  const count = output.requirements.length;
  return {
    name: "requirements-found",
    pass: count > 0,
    detail: `${count} requirement${count === 1 ? "" : "s"}`,
  };
}

export function coveredTerms(output: TailorResult, kase: TailorCase): Grade {
  return recall("covered-terms", kase.expect?.covered ?? [], (term) => isCovered(output, term));
}

export function gapTerms(output: TailorResult, kase: TailorCase): Grade[] {
  const gaps = kase.expect?.gaps ?? [];
  const proven = gaps
    .filter((term) =>
      output.keywords.some((keyword) => keyword.inResume && hits(keyword.term, term)),
    )
    .map((term) => `${label(term)} is marked as in the resume`);
  return [
    recall("gaps-flagged", gaps, (term) => isFlagged(output, term)),
    grade("gaps-not-proven", proven, "no missing term is marked as in the resume"),
  ];
}

export function importance(output: TailorResult, kase: TailorCase): Grade {
  const items = [
    ...output.keywords.map((keyword) => ({
      names: [keyword.term],
      importance: keyword.importance,
    })),
    ...output.requirements.map((requirement) => ({
      names: [requirement.text, ...requirement.terms],
      importance: requirement.importance,
    })),
  ];
  const wrong = (["must", "nice"] as const).flatMap((expected) =>
    (kase.expect?.[expected] ?? []).flatMap((term) => {
      const matched = items.filter((item) => item.names.some((name) => hits(name, term)));
      const right = matched.length === 0 || matched.some((item) => item.importance === expected);
      return right ? [] : [`${label(term)} should be "${expected}"`];
    }),
  );
  return grade("importance", wrong, "must and nice are as the post says");
}

export function offPostTerms(output: TailorResult, kase: TailorCase): Grade {
  const names = [
    ...output.keywords.map((keyword) => keyword.term),
    ...output.requirements.flatMap((requirement) => [requirement.text, ...requirement.terms]),
  ];
  const found = (kase.expect?.notRequired ?? [])
    .filter((term) => names.some((name) => mentions(name, term)))
    .map((term) => `${label(term)} is listed but is not this job's requirement`);
  return grade("off-post-terms", found, "nothing from outside the job's requirements");
}

function fieldProblem(
  field: string,
  given: string,
  expected: string | undefined,
  got: string,
): string | null {
  if (given.trim()) {
    const want = clip(oneLine(given), JOB_FIELD_CHARS);
    return got === want ? null : `${field} "${got}" is not the given "${want}"`;
  }
  if (expected === undefined) return null;
  if (expected === "") return got === "" ? null : `${field} "${got}", but the post names none`;
  return foldCase(got).includes(foldCase(expected))
    ? null
    : `${field} "${got}", expected "${expected}"`;
}

export function jobFields(output: TailorResult, kase: TailorCase): Grade {
  const { job } = kase.input;
  const problems = [
    fieldProblem("title", job.title, kase.expect?.jobTitle, output.job.title),
    fieldProblem("company", job.company, kase.expect?.company, output.job.company),
  ].filter((problem): problem is string => problem !== null);
  return grade("job-fields", problems, `"${output.job.title}" at "${output.job.company}"`);
}

function foldedWords(text: string): Set<string> {
  return new Set(
    Array.from(text.matchAll(WORD), (match) => foldCase(match[0].replace(/['’]s$/iu, ""))),
  );
}

export function capitalizedNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(WORD)) {
    const word = match[0].replace(/’/g, "'").replace(/'s$/i, "");
    if (!/\p{Lu}/u.test(word) || PRONOUNS.has(word)) continue;
    const before = text.slice(0, match.index).trimEnd();
    if (before === "" || SENTENCE_END.test(before)) continue;
    names.push(word);
  }
  return names;
}

export function summaryNames(output: TailorResult, kase: TailorCase): Grade {
  const known = foldedWords(resumeTextOf(kase));
  const fresh = [...new Set(capitalizedNames(output.summary))].filter(
    (name) => !known.has(foldCase(name)),
  );
  return grade(
    "summary-names",
    fresh.map((name) => `"${name}" is not in the resume`),
    "every name in the summary is in the resume",
  );
}

function knownCounts(text: string): Set<number> {
  const known = new Set<number>();
  for (const match of text.matchAll(/\d+(?:[.,]\d+)*/g))
    known.add(Number(match[0].replace(/,/g, "")));
  for (const match of text.toLowerCase().matchAll(COMPOUND)) {
    known.add((NUMBER_WORDS.get(match[1] ?? "") ?? 0) + (NUMBER_WORDS.get(match[2] ?? "") ?? 0));
  }
  for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
    const value = NUMBER_WORDS.get(word);
    if (value !== undefined) known.add(value);
  }
  return known;
}

export function numberWordsIn(text: string, source: string): string[] {
  const known = knownCounts(source);
  const words = foldedWords(source);
  const lower = text.toLowerCase();
  const invented: string[] = [];
  for (const match of lower.matchAll(COMPOUND)) {
    const value = (NUMBER_WORDS.get(match[1] ?? "") ?? 0) + (NUMBER_WORDS.get(match[2] ?? "") ?? 0);
    if (!known.has(value)) invented.push(match[0]);
  }
  for (const word of lower.replace(COMPOUND, " ").match(/\p{L}+/gu) ?? []) {
    const value = NUMBER_WORDS.get(word);
    if (value !== undefined && !UNCOUNTED.has(word) && !known.has(value)) invented.push(word);
    if (DECADE.test(word) && !words.has(word)) invented.push(word);
  }
  return [...new Set(invented)];
}

export function summaryNumberWords(output: TailorResult, kase: TailorCase): Grade {
  const invented = numberWordsIn(output.summary, resumeTextOf(kase));
  return grade(
    "summary-number-words",
    invented.map((word) => `"${word}" is not a count the resume gives`),
    "no spelled-out count the resume doesn't give",
  );
}

function degreeWords(text: string): string[] {
  const plain = text
    .toLowerCase()
    .replace(/(\p{L})\.(?=\p{L})/gu, "$1")
    .replace(/['’]s\b/gu, "");
  return (plain.match(/\p{L}+/gu) ?? []).map((word) =>
    word === "bachelors" || word === "masters" ? word.slice(0, -1) : word,
  );
}

export function inventedDegrees(text: string, resume: Resume): string[] {
  const backed = new Set(degreeWords(resumeToText(resume)));
  const hasDegree = resume.education.some((school) => school.degree.trim() !== "");
  const invented = degreeWords(text).filter((word) => {
    if (ANY_DEGREE.test(word)) return !hasDegree;
    if (BACKING_ONLY.has(word)) return false;
    const backing = DEGREE_BACKING.get(word);
    return backing !== undefined && !backing.some((form) => backed.has(form));
  });
  return [...new Set(invented)];
}

export function summaryDegrees(output: TailorResult, kase: TailorCase): Grade {
  const invented = inventedDegrees(output.summary, resumeOf(kase));
  return grade(
    "summary-degrees",
    invented.map((word) => `"${word}" is not a degree the resume shows`),
    "no degree the resume doesn't show",
  );
}

const singular = (word: string) => (word.length > 3 ? word.replace(/s$/, "") : word);

export function inflatedTitles(text: string, source: string): string[] {
  const known = new Set([...foldedWords(source)].map(singular));
  const words = [...foldedWords(text)].map(singular);
  return [...new Set(words.filter((word) => SENIORITY.has(word) && !known.has(word)))];
}

export function summarySeniority(output: TailorResult, kase: TailorCase): Grade {
  const inflated = inflatedTitles(output.summary, resumeTextOf(kase));
  return grade(
    "summary-seniority",
    inflated.map((word) => `"${word}" is a rank the resume doesn't hold`),
    "no rank the resume doesn't hold",
  );
}

function resumeLines(resume: Resume): string[] {
  const bullets = [...resume.experience, ...resume.projects, ...resume.education].flatMap((entry) =>
    entry.bullets.map((bullet) => bullet.text),
  );
  return [...bullets, resume.summary, resume.basics.headline].filter((line) => line.trim() !== "");
}

export function summaryVerbs(output: TailorResult, kase: TailorCase): Grade {
  const upgrades = upgradedVerbs(output.summary, resumeLines(resumeOf(kase)));
  return grade(
    "summary-verbs",
    upgrades.map((upgrade) => `"${upgrade.verb}" for "${upgrade.line}"`),
    "keeps the resume's own verbs",
  );
}

export function summaryGaps(output: TailorResult, kase: TailorCase): Grade {
  const claimed = (kase.expect?.gaps ?? [])
    .filter((term) => mentions(output.summary, term))
    .map((term) => `claims ${label(term)}, which the resume doesn't show`);
  return grade("summary-gaps", claimed, "claims nothing the resume lacks");
}

export function summarySentences(output: TailorResult): Grade {
  if (!output.summary.trim())
    return { name: "summary-sentences", pass: true, detail: "no summary" };
  const count = sentencesOf(output.summary).length;
  const { min, max } = SUMMARY_SENTENCES;
  return {
    name: "summary-sentences",
    pass: count >= min && count <= max,
    detail: `${count} sentence${count === 1 ? "" : "s"} (${min} to ${max})`,
  };
}

export function notesWithoutIds(output: TailorResult, kase: TailorCase): Grade {
  const ids = resumeOf(kase).experience.flatMap((job) => [
    job.id,
    ...job.bullets.map((bullet) => bullet.id),
  ]);
  const bad = output.notes.filter(
    (note) => ALIAS.test(note) || ids.some((id) => note.includes(id)),
  );
  return grade(
    "notes-no-ids",
    bad.map((note) => `"${note}"`),
    "notes quote lines, not ids",
  );
}

export function notesMention(output: TailorResult, kase: TailorCase): Grade {
  const wanted = kase.expect?.notesMention;
  if (!wanted) return { name: "notes-mention", pass: true, detail: "nothing expected" };
  const pass = output.notes.some((note) => wanted.some((term) => mentions(note, term)));
  return {
    name: "notes-mention",
    pass,
    detail: pass ? "a note names a weak must-have" : `no note names ${listed(wanted.map(label))}`,
  };
}

// What the app saves by default: suggested reorders on, the summary only when the resume has none.
export function tailoredResume(output: TailorResult, resume: Resume): Resume {
  return applyTailorChoices(resume, output, defaultChoices(resume, output));
}

const FIXED_FIELDS = [
  "title",
  "basics",
  "education",
  "projects",
  "skills",
  "certifications",
  "extras",
  "sectionOrder",
  "sectionTitles",
  "hiddenSections",
  "design",
  "template",
] as const satisfies readonly (keyof Resume)[];

const byId = <T extends { id: string }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.id.localeCompare(b.id));

export function unchangedSections(output: TailorResult, kase: TailorCase): Grade {
  const before = resumeOf(kase);
  const after = tailoredResume(output, before);
  const changed: string[] = FIXED_FIELDS.filter(
    (field) => !isDeepStrictEqual(after[field], before[field]),
  ).map((field) => `${field} changed`);
  const summary = before.summary.trim() ? before.summary : output.summary.trim() || before.summary;
  if (after.summary !== summary) changed.push("summary changed");
  if (after.experience.length !== before.experience.length)
    changed.push("experience entries changed");
  before.experience.forEach((job, index) => {
    const next = after.experience[index];
    const { bullets, ...details } = job;
    if (!next) return;
    const { bullets: nextBullets, ...nextDetails } = next;
    if (!isDeepStrictEqual(nextDetails, details))
      changed.push(`${job.title || job.id} details changed`);
    if (!isDeepStrictEqual(byId(nextBullets), byId(bullets))) {
      changed.push(`${job.title || job.id} lines changed, not just reordered`);
    }
  });
  return grade("unchanged-sections", changed, "only line order and an empty summary change");
}

export function leadLines(output: TailorResult, kase: TailorCase): Grade {
  const leads = Object.entries(kase.expect?.leads ?? {});
  const after = tailoredResume(output, resumeOf(kase));
  const wrong = leads.flatMap(([experienceId, allowed]) => {
    const job = after.experience.find((entry) => entry.id === experienceId);
    const first = job?.bullets.find((bullet) => bullet.text.trim() !== "");
    if (first && allowed.includes(first.id)) return [];
    const text = first ? `"${oneLine(first.text).slice(0, 60)}"` : "nothing";
    return [`${job?.title || experienceId} leads with ${text}`];
  });
  return grade(
    "lead-lines",
    wrong,
    `${leads.length} entr${leads.length === 1 ? "y leads" : "ies lead"} with a matching line`,
  );
}

export function guessesOnly(output: TailorResult, kase: TailorCase): Grade {
  if (!kase.expect?.allGuess) return { name: "guesses-only", pass: true, detail: "not expected" };
  const sure = output.requirements
    .filter((requirement) => requirement.source !== "guess")
    .map((requirement) => `"${requirement.text}" is "${requirement.source}"`);
  return grade("guesses-only", sure, "every requirement is a guess");
}
