import { TEXT_LIMITS } from "@/config/plans";
import { clipWords, oneLine } from "@/lib/ai/text";
import { findSkills } from "@/lib/job-feed/skills";
import { bulletText } from "@/lib/resume/sections";
import { findTerm, termKey } from "@/lib/tailor/keywords";
import { termTokens, textTokens } from "@/lib/tailor/tokens";
import { acronymForms, findCandidates } from "./vocabulary";

export type Importance = "must" | "nice" | null;

export type PostTerm = {
  label: string;
  terms: string[];
  importance: Importance;
};

export type PostRead = {
  terms: PostTerm[];
  asks: string[];
  sorted: boolean;
};

type Section = "must" | "nice" | "duties" | "intro" | "closing" | null;

export const MAX_TERMS = 40;
const MAX_ASKS = 4;
const ASK_CHARS = 160;
const MAX_HEADING_WORDS = 8;
const MAX_LABEL_WORDS = 5;
const MAX_SURFACE_TOKENS = 4;

const NICE_HEADING =
  /\b(?:nice[- ]to[- ]haves?|preferred|bonus(?: points)?|pluses|a plus|desirable|good to have|great to have|ideally|even better|extra credit|not required|would be (?:great|nice|helpful|a plus))\b/i;
const MUST_HEADING =
  /\b(?:requirements?|required|qualifications?|must[- ]haves?|essentials?|minimum|what you(?:['’]ll| will)? (?:need|bring)|what we(?:['’]re| are)? looking for|looking for|you (?:have|bring|should have|will have)|who you are|about you|your (?:profile|background|skills|experience)|ideal candidates?|skills|experience|competenc\w*)\b/i;
const DUTIES_HEADING =
  /\b(?:responsibilit\w*|duties|what you(?:['’]ll| will)? (?:do|be doing|work on|own)|your (?:role|day|tasks|mission|impact)|(?:the|this) (?:role|job|position|opportunity)|in this role|day[- ]to[- ]day|tasks|overview|job description)\b/i;
const CLOSING_HEADING =
  /\b(?:benefits|perks|what we offer|we offer|compensation|salary|pay|how to apply|equal (?:opportunity|employment)|diversity|why|life at|working (?:here|at|with us))\b/i;
const INTRO_HEADING =
  /\b(?:about|who we are|our (?:values|culture|mission|story|team)|location|the team)\b/i;

// Without a colon, capitals or markdown, a line is a heading only when all of it is a heading phrase.
const QUALIFIER =
  "(?:the|our|your|key|core|main|basic|minimum|required|preferred|desired|desirable|additional|essential|ideal|job|role|technical|tech|general)";
const NOUN =
  "(?:requirements?|qualifications?|skills?|experience|competenc(?:y|ies)|criteria|knowledge|abilities|responsibilit(?:y|ies)|duties|tasks|overview|description|benefits|perks|compensation|salary|pay|location|values|culture|mission|story|team|impact|profile|background|role|opportunity|position|stack|candidate|day)";
const PHRASES = [
  "(?:nice|good|great)[- ]to[- ]haves?",
  "must[- ]haves?",
  "preferred",
  "required",
  "essentials?",
  "desirable",
  "bonus points(?: if you have)?",
  "pluses",
  "(?:it['’]s )?a (?:big )?plus(?: if you have)?",
  "even better(?: if you have)?",
  "extra credit",
  "ideally(?: you have)?",
  "what you(?:['’]ll| will)? (?:need|bring|do|be doing|work on|own|have)",
  "what (?:we|we['’]re|we are) (?:looking for|offer|need|do)",
  "what we look for",
  "who (?:you are|we are|we['’]re looking for|we are looking for)",
  "(?:we['’]re |we are )?looking for",
  "you (?:have|bring|should have|will have)",
  "in this role(?:,? you will)?",
  "day[- ]to[- ]day",
  "a day in the life",
  "how to apply",
  "we offer",
  "equal (?:opportunity|employment)(?: (?:employer|opportunity))?",
  "diversity(?: (?:and|&) inclusion)?",
].join("|");
const JOIN = "(?:\\s*[,&/]\\s*|\\s+and\\s+)";
const NOUNS = `(?:${QUALIFIER}\\s+)*${NOUN}(?:${JOIN}(?:${QUALIFIER}\\s+)*${NOUN})*`;
const TITLE = new RegExp(`^(?:${QUALIFIER}\\s+)*(?:${NOUNS}|${PHRASES})$`, "i");
// The rest of these is usually the company's name: "About Acme", "Why Acme", "Life at Acme".
const NAMED_HEADING = /^(?:about|why|life at|working at)\b/i;

const NICE_WORDING =
  /\b(?:nice[- ]to[- ]have|(?:a|an|big|huge)\s+(?:plus|bonus|advantage)|bonus|preferred|preferably|ideally|desirable|advantageous|good to have|great to have|would be (?:great|nice|helpful|a plus)|not (?:required|essential|a must))\b/i;
const MUST_WORDING =
  /\b(?:required|requires|require|must|essential|mandatory|need to have|you need|minimum of|at least)\b/i;

const YEARS = /\b\d{1,2}\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?years?\b/i;
const EXPERIENCE = /\bexperience[ds]?\b/i;
const DEGREE = /\b(?:bachelor(?:['’]?s)?|master(?:['’]?s)?|ph\.?\s?d|doctorate|mba|degree)\b/i;

const SENTENCE_BREAK = /;|(?<=[.!?])(?<!\b(?:e\.g|i\.e|etc|incl|vs|approx)\.)\s+(?=\p{Lu})/u;
const CLAUSE_BREAK = /,\s+|\s+(?:and|but|while|whereas)\s+/i;

function headingText(line: string): string | null {
  if (bulletText(line) !== null) return null;
  const text = line.replace(/^[\s#*_>]+|[\s*_:]+$/gu, "");
  if (!text || text.split(/\s+/).length > MAX_HEADING_WORDS || /[.!?,;]$/u.test(text)) return null;
  return text;
}

function classify(text: string): Section | undefined {
  if (NICE_HEADING.test(text)) return "nice";
  if (MUST_HEADING.test(text)) return "must";
  if (DUTIES_HEADING.test(text)) return "duties";
  if (CLOSING_HEADING.test(text)) return "closing";
  if (INTRO_HEADING.test(text)) return "intro";
  return undefined;
}

// A colon at the end, capitals or markdown make a line a heading, whatever its words.
function isMarked(line: string, text: string): boolean {
  if (/:\s*$/u.test(line) || /^#|^\*\*.+\*\*$|^__.+__$/u.test(line)) return true;
  return /\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text);
}

// A short line that names a skill or a number ("Experience with AWS", "5+ years of SQL") is a requirement, not a heading.
function headingSection(line: string, current: Section): Section | undefined {
  const text = headingText(line);
  if (text === null || /\d/.test(text)) return undefined;
  if (findSkills(text).length > 0 || findCandidates(text).length > 0) return undefined;
  if (isMarked(line, text) || TITLE.test(text) || NAMED_HEADING.test(text)) {
    // A heading Otto doesn't know starts a section that says nothing about importance.
    return classify(text) ?? null;
  }
  // A company intro ends at its first short line that isn't a sentence, often a heading Otto doesn't know.
  return current === "intro" ? null : undefined;
}

// Under the title, a short line in title case that names more than skills is the company or the place.
function namesCompany(line: string): boolean {
  const text = headingText(line);
  if (text === null || /(?:^|\s)\p{Ll}/u.test(text)) return false;
  if ([MUST_WORDING, NICE_WORDING, YEARS, EXPERIENCE].some((asks) => asks.test(text))) return false;
  const skills = [...findSkills(text), ...findCandidates(text).flatMap((found) => found.terms)];
  const known = new Set(skills.flatMap(termTokens));
  return textTokens(text).some((token) => !known.has(token.value));
}

function inlineLabel(content: string): { section: Section; rest: string } | null {
  const colon = content.indexOf(":");
  if (colon <= 0) return null;
  const label = content.slice(0, colon).trim();
  const rest = content.slice(colon + 1).trim();
  if (!rest || label.split(/\s+/).length > MAX_LABEL_WORDS) return null;
  const section = classify(label);
  return section === undefined ? null : { section, rest };
}

function clausesOf(text: string): string[] {
  return text
    .split(SENTENCE_BREAK)
    .flatMap((sentence) =>
      NICE_WORDING.test(sentence) && MUST_WORDING.test(sentence)
        ? sentence.split(CLAUSE_BREAK)
        : [sentence],
    );
}

function importanceOf(clause: string, section: Section): Importance {
  if (NICE_WORDING.test(clause)) return "nice";
  if (MUST_WORDING.test(clause)) return "must";
  return section === "must" || section === "nice" ? section : null;
}

// Where a vocabulary skill came from another spelling (Tailwind for Tailwind CSS), keep the post's own words too.
function surfaceOf(clause: string, label: string): string | null {
  if (findTerm(clause, label).found) return null;
  const tokens = textTokens(clause);
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i; j < tokens.length && j < i + MAX_SURFACE_TOKENS; j++) {
      const span = clause.slice(tokens[i]!.start, tokens[j]!.end);
      if (findSkills(span).includes(label)) return span;
    }
  }
  return null;
}

type Tally = PostTerm & { order: number };

const RANK: Record<"must" | "nice" | "none", number> = { must: 2, nice: 1, none: 0 };
const rankOf = (importance: Importance) => RANK[importance ?? "none"];

export function readPost(jobText: string): PostRead {
  const text = typeof jobText === "string" ? jobText.slice(0, TEXT_LIMITS.jobPostChars) : "";
  const tallies = new Map<string, Tally>();
  const asks: string[] = [];
  let section: Section = null;
  let order = 0;
  // The post's top lines, until a heading or a sentence: its title, then the company and the place.
  let header = true;
  let title = true;

  const note = (label: string, forms: readonly string[], importance: Importance) => {
    const key = termKey(label);
    if (!key) return;
    let tally = tallies.get(key);
    if (!tally) {
      tally = { label, terms: [label], importance, order: order++ };
      tallies.set(key, tally);
    }
    for (const form of forms) {
      if (!tally.terms.some((term) => termKey(term) === termKey(form))) tally.terms.push(form);
    }
    if (rankOf(importance) > rankOf(tally.importance)) tally.importance = importance;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = headingSection(line, section);
    if (heading !== undefined) {
      section = heading;
      header = false;
      continue;
    }
    let content = bulletText(line) ?? line;
    let lineSection = section;
    const label = inlineLabel(content);
    if (label) {
      lineSection = label.section;
      content = label.rest;
    }
    if (header) {
      const company = !title && !label && namesCompany(line);
      title = false;
      header = !label && headingText(line) !== null;
      if (company) continue;
    }
    if (lineSection === "intro" || lineSection === "closing") continue;

    for (const clause of clausesOf(content)) {
      const importance = importanceOf(clause, lineSection);
      for (const skill of findSkills(clause)) {
        const surface = surfaceOf(clause, skill);
        note(skill, [...(surface ? [surface] : []), ...acronymForms(skill)], importance);
      }
      for (const candidate of findCandidates(clause)) {
        note(candidate.label, candidate.terms, importance);
      }

      const years = YEARS.test(clause) && (importance !== null || EXPERIENCE.test(clause));
      const asksFor =
        lineSection !== "duties" && asks.length < MAX_ASKS && (years || DEGREE.test(clause));
      if (!asksFor) continue;
      const ask = clipWords(oneLine(clause), ASK_CHARS).replace(/^[\s,;:–—-]+/u, "");
      if (ask && !asks.includes(ask)) asks.push(ask);
    }
  }

  const all = [...tallies.values()].sort(
    (a, b) => rankOf(b.importance) - rankOf(a.importance) || a.order - b.order,
  );
  const terms = all
    .slice(0, MAX_TERMS)
    .map(({ label, terms: forms, importance }) => ({ label, terms: forms, importance }));
  return { terms, asks, sorted: terms.some((term) => term.importance !== null) };
}
