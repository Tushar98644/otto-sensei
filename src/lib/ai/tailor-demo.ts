import { bulletText } from "@/lib/resume/sections";
import type { Resume } from "@/lib/resume/schema";
import { findTerm, normalizeTerm } from "@/lib/tailor/keywords";
import type { RawRequirement } from "@/lib/tailor/requirements";
import type { RawTailor } from "./tailor-finalize";
import { COMMON_SKILLS, EXACT_CASE_SKILLS, STOPWORDS } from "./tailor-vocabulary";

// Demo mode (no API key): requirements from a phrase frequency count; deterministic.

type Section = "required" | "nice" | "other";

type Phrase = {
  surface: string;
  words: string[];
  count: number;
  // Seen at least once in a requirements section or on a line that says "required" or "must".
  required: boolean;
  first: number;
};

type Candidate = Phrase & { term: string; skill: boolean };
type DemoKeyword = { term: string; importance: "must" | "nice"; required: boolean };

const MAX_KEYWORDS = 25;
// A word outside the skills list needs repeats to count: one mention is noise, three a theme.
const MIN_REPEATS_WORD = 3;
const MIN_REPEATS_PAIR = 2;
const MAX_HEADING_WORDS = 8;

const NICE_HEADING =
  /\b(?:nice[- ]to[- ]haves?|preferred|bonus|pluses|a plus|desirable|good to have|ideally)\b/i;
const REQUIRED_HEADING =
  /\b(?:requirements?|required|qualifications?|must[- ]haves?|what you(?:['’]ll)? need|what you bring|you (?:have|bring)|who you are|about you|looking for|skills|experience)\b/i;
const OTHER_HEADING =
  /\b(?:responsibilit\w*|what you(?:['’]ll)? do|about (?:us|the (?:role|team|company|job))|benefits|perks|we offer|compensation|salary|how to apply|your role|day[- ]to[- ]day|who we are|why join)\b/i;
const REQUIRED_LINE = /\b(?:required|must)\b/i;
// Two words only form a phrase when nothing but a space separates them.
const PHRASE_BREAK = /[,;:!?()[\]{}|•·"“”]|\.(?=\s|$)|\s[-–—]\s/u;
// Words the way job posts write tech names: Node.js, C++, C#, CI/CD, front-end, R&D, .NET.
const WORD = /\.net(?![\p{L}\p{N}])|[\p{L}\p{N}](?:[\p{L}\p{N}+#.&'’/-]*[\p{L}\p{N}+#])?/giu;

const DEMO_NOTES = [
  "Use the job post's exact words for skills you really have. Hiring software matches words, not meanings.",
  "Start each job with the bullet that fits this role best. Recruiters often read only the top lines.",
];

function termKey(term: string): string {
  return normalizeTerm(term).replace(/ /g, "");
}

const SKILL_BY_KEY = new Map(COMMON_SKILLS.map((skill) => [termKey(skill), skill]));

function headingSection(line: string): Section | null {
  if (bulletText(line) !== null) return null;
  const text = line.replace(/^[\s#*_>]+|[\s*_:]+$/gu, "");
  if (!text || text.split(/\s+/).length > MAX_HEADING_WORDS || /[.!?]$/u.test(text)) return null;
  if (NICE_HEADING.test(text)) return "nice";
  if (REQUIRED_HEADING.test(text)) return "required";
  // Any other short line ending in a colon ("Benefits:") starts a section that isn't requirements.
  return /:\s*$/u.test(line) || OTHER_HEADING.test(text) ? "other" : null;
}

function scanPost(jobText: string): Map<string, Phrase> {
  const phrases = new Map<string, Phrase>();
  const keys = new Map<string, string>();
  const keyOf = (surface: string) => {
    let key = keys.get(surface);
    if (key === undefined) {
      key = termKey(surface);
      keys.set(surface, key);
    }
    return key;
  };
  let section: Section = "other";
  let order = 0;
  for (const line of jobText.split(/\r?\n/)) {
    section = headingSection(line) ?? section;
    const required = section === "required" || REQUIRED_LINE.test(line);
    for (const run of line.split(PHRASE_BREAK)) {
      const tokens = run.match(WORD) ?? [];
      for (let i = 0; i < tokens.length; i++) {
        const grams = [tokens.slice(i, i + 1)];
        if (i + 1 < tokens.length) grams.push(tokens.slice(i, i + 2));
        for (const words of grams) {
          const surface = words.join(" ");
          const key = keyOf(surface);
          if (!key) continue;
          const phrase = phrases.get(key);
          if (phrase) {
            phrase.count += 1;
            phrase.required ||= required;
          } else {
            phrases.set(key, { surface, words, count: 1, required, first: order++ });
          }
        }
      }
    }
  }
  return phrases;
}

function isContentWord(word: string): boolean {
  return !STOPWORDS.has(word.toLowerCase()) && /\p{L}.*\p{L}/u.test(word);
}

// The phrase scan reads every word as a term; the real matcher reads the post as prose, where only
// "Go" is the language and "excel at" is not Excel.
function isSkillInPost(skill: string, jobText: string): boolean {
  if (!findTerm(jobText, skill).found) return false;
  if (!EXACT_CASE_SKILLS.has(skill)) return true;
  return new RegExp(`(?<![\\p{L}\\p{N}])${skill}(?![\\p{L}\\p{N}])`, "u").test(jobText);
}

const isMust = (candidate: Candidate) => candidate.required || candidate.count >= 2;

function pickKeywords(jobText: string): DemoKeyword[] {
  const candidates: Candidate[] = [];
  for (const [key, phrase] of scanPost(jobText)) {
    const skill = SKILL_BY_KEY.get(key);
    if (skill) {
      if (isSkillInPost(skill, jobText)) candidates.push({ ...phrase, term: skill, skill: true });
      continue;
    }
    const repeats = phrase.words.length === 1 ? MIN_REPEATS_WORD : MIN_REPEATS_PAIR;
    if (phrase.count >= repeats && phrase.words.every(isContentWord)) {
      candidates.push({ ...phrase, term: phrase.surface, skill: false });
    }
  }
  // "payments" on its own adds nothing once "payment systems" is in.
  const inLongerTerm = new Set(
    candidates.filter((c) => c.words.length > 1).flatMap((c) => c.words.map(termKey)),
  );
  const kept = candidates.filter(
    (c) => c.skill || c.words.length > 1 || !inLongerTerm.has(termKey(c.words[0] ?? "")),
  );
  kept.sort(
    (a, b) =>
      Number(isMust(b)) - Number(isMust(a)) ||
      Number(b.skill) - Number(a.skill) ||
      b.count - a.count ||
      a.first - b.first,
  );
  return kept
    .slice(0, MAX_KEYWORDS)
    .map((c) => ({ term: c.term, importance: isMust(c) ? "must" : "nice", required: c.required }));
}

// From a requirements section or "required" line: structure. Only repeated: wording.
function toRequirement(keyword: DemoKeyword): RawRequirement {
  return {
    text: keyword.term,
    importance: keyword.importance,
    source: keyword.required ? "structure" : "wording",
    terms: [keyword.term],
    quote: "",
    ask: `Have you used ${keyword.term}?`,
  };
}

function orderBullets(resume: Resume, keywords: DemoKeyword[]): RawTailor["bulletOrder"] {
  const score = (text: string) =>
    keywords.reduce(
      (sum, keyword) =>
        sum + (findTerm(text, keyword.term).found ? (keyword.importance === "must" ? 2 : 1) : 0),
      0,
    );
  return resume.experience.map((job) => {
    const ranked = job.bullets.map((bullet, index) => ({
      id: bullet.id,
      index,
      score: bullet.text.trim() ? score(bullet.text) : -1,
    }));
    ranked.sort((a, b) => b.score - a.score || a.index - b.index);
    return { experienceId: job.id, bulletIds: ranked.map((entry) => entry.id) };
  });
}

export function demoTailor(resume: Resume, jobText: string): RawTailor {
  const keywords = pickKeywords(jobText);
  return {
    jobTitle: "",
    company: "",
    requirements: keywords.map(toRequirement),
    bulletOrder: orderBullets(resume, keywords),
    summary: "",
    notes: [...DEMO_NOTES],
  };
}
