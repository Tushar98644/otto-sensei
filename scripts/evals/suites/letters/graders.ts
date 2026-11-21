import { z } from "zod";
import type { CoverLetterResult, OutreachResult } from "@/lib/ai/types";
import { LETTER_WORDS, NOTE_CHARS } from "@/lib/ai/writing";
import {
  clichesIn,
  sentencesOf,
  unbackedIn,
  upgradedVerbs,
  wordCount,
} from "@/lib/ai/writing-guards";
import { LetterRequestSchema } from "@/lib/api/types";
import {
  AI_TELLS,
  matchesSchema,
  noBannedPhrases,
  noInventedNumbers,
  novelWordsAtMost,
  withinLength,
  type BannedPhrase,
  type Grade,
} from "@/lib/evals/graders";
import { listBullets, resumeToText } from "@/lib/resume/ops";
import { WRITING_LIMITS } from "@/lib/writings/schema";
import { WritingStyleSchema } from "@/lib/writing-style/validation";
import type { EvalCase, Grader } from "../../suite";

export const LettersInputSchema = LetterRequestSchema.extend({
  kind: z.enum(["letter", "outreach"]),
  style: WritingStyleSchema.optional(),
});

export type LettersInput = z.output<typeof LettersInputSchema>;
export type LettersKind = LettersInput["kind"];
export type LettersOutput = CoverLetterResult | OutreachResult;

// One fact or term, or its spellings: any one of them counts.
export type Term = string | readonly string[];

export type LettersExpect = {
  role?: string;
  // A thin resume can't honestly fill the asked length, so its body may be this short.
  minWords?: number;
  facts?: readonly Term[];
  post?: readonly Term[];
  absent?: readonly string[];
};

export type LettersCase = EvalCase<LettersInput, LettersOutput, LettersExpect>;
type LettersGrader = Grader<LettersInput, LettersOutput, LettersExpect>;

// The saved-writing limits, so every result fits the Writings list.
const LetterResultSchema = z.object({
  letter: z.string().min(1).max(WRITING_LIMITS.letterChars),
  words: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

const OutreachResultSchema = z.object({
  subject: z.string().min(1).max(WRITING_LIMITS.subject),
  email: z.string().min(1).max(WRITING_LIMITS.outreachChars),
  note: z.string().max(WRITING_LIMITS.noteChars),
  words: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

// The body word counts writeCoverLetter and writeOutreach accept, as in src/lib/ai/writing.ts.
const WORD_RANGES: Record<
  LettersKind,
  Record<"standard" | "shorter", { min: number; max: number }>
> = {
  letter: { standard: LETTER_WORDS, shorter: { min: 110, max: 180 } },
  outreach: { standard: { min: 60, max: 150 }, shorter: { min: 45, max: 110 } },
};
const PARAGRAPHS: Record<LettersKind, { min: number; max: number }> = {
  letter: { min: 3, max: 3 },
  outreach: { min: 2, max: 3 },
};
const FACTS_NEEDED: Record<LettersKind, number> = { letter: 2, outreach: 1 };
const SUBJECT_WORDS = { min: 4, max: 9 } as const;
const NOTE_MIN_CHARS = 80;
const ROLE_SHARE = 0.5;
const COPIED_WORDS = 8;
const LONGEST_SENTENCE = 35;
const DIRECT = { mean: 18, longest: 28 } as const;
// Loose on purpose: catches off-topic, translated or padded text, not ordinary phrasing.
const NOVEL_SHARE = 0.65;
const SHOWN = 3;

const NOTE_GREETING = /^(?:Hi|Dear) \[first name\],\s*/;
const OPENER = /^(?:dear|hi|hello|hey|greetings)\b/i;
const SIGN_OFF =
  /\b(?:sincerely|regards|warmly|best wishes|yours (?:truly|faithfully)|cheers)\s*[,.!]?\s*$/i;
const BLANK = /\[[^\]\n]+\]/g;
const WORD = /[\p{L}\p{N}]+/gu;
const ROLE_STOP = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const CONTRACTION =
  /(?<!\p{L})(?:i['’](?:m|d|ve|ll)|(?:you|we|they|who)['’](?:re|ve|ll|d)|(?:it|that|there|here|what|let|he|she)['’]s|\p{L}+n['’]t)(?!\p{L})/giu;

const US_STEMS = (
  "organi recogni reali speciali prioriti optimi standardi summari minimi maximi utili " +
  "digiti moderni customi categori authori emphasi apologi finali visuali initiali " +
  "familiari stabili centrali normali personali analy paraly cataly"
).split(" ");
const US_WORDS = (
  "color colors colored colorful behavior behaviors favorite favorites favor honor " +
  "honored labor neighbor neighbors humor flavor flavors center centers centered theater " +
  "fiber traveled traveling traveler travelers canceled canceling modeled modeling " +
  "labeled labeling fulfill fulfillment enroll enrollment skillful defense catalog gray " +
  "resume resumes résumé résumés"
).split(" ");
const US_SPELLING = new RegExp(
  `(?<!\\p{L})(?:(?:${US_STEMS.join("|")})z\\p{L}*|${US_WORDS.join("|")})(?!\\p{L})`,
  "giu",
);

const APOLOGIES: readonly BannedPhrase[] = [
  { label: "willing to learn", pattern: /\b(?:willing|eager|keen|happy|ready) to learn\b/i },
  { label: "quick learner", pattern: /\bquick (?:learner|study)\b/i },
  { label: "lack experience", pattern: /\b(?:lack|lacking|without) (?:\w+ )?experience\b/i },
  {
    label: "although I don't have",
    pattern:
      /\b(?:although|while|though) I(?:['’]m not| am not| (?:don['’]t|do not|haven['’]t|have not))\b/i,
  },
  { label: "pick it up quickly", pattern: /\bpick (?:it|this|that|them) up (?:quickly|fast)\b/i },
  "I apologize",
  "I apologise",
];

const BIG_ASKS: readonly BannedPhrase[] = [
  { label: "referral", pattern: /\breferr?als?\b|\brefer me\b/i },
  { label: "attachment", pattern: /\b(?:attached|attachments?|enclosed)\b/i },
  {
    label: "asks for the job",
    pattern: /\b(?:hire me|offer me|give me (?:a|the) (?:job|role|position))\b/i,
  },
];

const NOTE_ASKS = /\?|\b(?:a (?:quick |short )?(?:call|chat)|coffee|meeting|referr?al|refer me)\b/i;

type Parts = { body: string[]; subject: string | null; note: string | null };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function shown(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 70 ? `${line.slice(0, 69)}…` : line;
}

function listed(name: string, found: readonly string[], passed: string): Grade {
  if (found.length === 0) return { name, pass: true, detail: passed };
  const more = found.length > SHOWN ? ` (+${found.length - SHOWN} more)` : "";
  return { name, pass: false, detail: `${found.slice(0, SHOWN).join("; ")}${more}` };
}

// The product joins the greeting, the body paragraphs and the sign-off with blank lines.
export function bodyOf(text: string): string[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.slice(1, -1);
}

function partsOf(output: LettersOutput, { input }: LettersCase): Parts {
  if (input.kind === "outreach" && "email" in output) {
    return {
      body: bodyOf(output.email),
      subject: output.subject,
      note: output.note.replace(NOTE_GREETING, ""),
    };
  }
  if (input.kind === "letter" && "letter" in output) {
    return { body: bodyOf(output.letter), subject: null, note: null };
  }
  return { body: [], subject: null, note: null };
}

function writtenTexts(parts: Parts): string[] {
  return [parts.subject, ...parts.body, parts.note].filter(
    (text): text is string => text !== null && text.trim() !== "",
  );
}

// The subject ends a sentence, as in the text the product checks before it warns.
function proseOf(parts: Parts): string {
  const subject = parts.subject?.trim() ? `${parts.subject.trim()}.` : null;
  return [subject, ...parts.body, parts.note].filter(Boolean).join("\n\n");
}

function sourcesOf({ input }: LettersCase): string[] {
  return [resumeToText(input.resume), input.job.title, input.job.company];
}

function linesOf({ input }: LettersCase): string[] {
  return [...listBullets(input.resume).map((bullet) => bullet.text), input.resume.summary];
}

function alternatives(term: Term): readonly string[] {
  return typeof term === "string" ? [term] : term;
}

function termPattern(term: string): RegExp {
  const words = escapeRegExp(term.trim()).replace(/[-\s]+/g, "[-\\s]+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${words}(?![\\p{L}\\p{N}])`, "iu");
}

export function termIn(text: string, term: Term): boolean {
  return alternatives(term).some((each) => termPattern(each).test(text));
}

const labelOf = (term: Term) => alternatives(term)[0] ?? "";

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

// "engineer" also finds "engineering", and "nights" finds "night".
function sameWord(wanted: string, word: string): boolean {
  return wanted === word || (wanted.length >= 5 && word.startsWith(wanted.slice(0, -2)));
}

export function roleShare(role: string, text: string): number {
  const wanted = wordsOf(role).filter((word) => !ROLE_STOP.has(word));
  if (wanted.length === 0) return 1;
  const words = wordsOf(text);
  const found = wanted.filter((each) => words.some((word) => sameWord(each, word)));
  return found.length / wanted.length;
}

function grams(text: string, size: number): string[] {
  const words = wordsOf(text);
  return Array.from({ length: Math.max(0, words.length - size + 1) }, (_, index) =>
    words.slice(index, index + size).join(" "),
  );
}

export const resultShape: LettersGrader = (output, { input }) =>
  matchesSchema(input.kind === "letter" ? LetterResultSchema : OutreachResultSchema, output);

// The checks behind the product's own warnings, run again on what it returned.
export const honesty: LettersGrader = (output, kase) => {
  const parts = partsOf(output, kase);
  const texts = writtenTexts(parts);
  const prose = proseOf(parts);
  const sources = sourcesOf(kase);
  const upgrades = upgradedVerbs(prose, linesOf(kase)).map(
    (upgrade) => `"${upgrade.verb}", but the resume says "${shown(upgrade.line)}"`,
  );
  const quote = (phrase: string) => `"${phrase}"`;
  return [
    noInventedNumbers(texts, sources),
    listed("upgraded-verbs", upgrades, "keeps the resume's own verbs"),
    listed(
      "unbacked-claims",
      unbackedIn(prose, sources).map(quote),
      "no lesson, reason or time span the resume doesn't state",
    ),
    listed("cliches", clichesIn(prose, sources).map(quote), "no stock phrase"),
    listed("blanks", [...new Set(prose.match(BLANK) ?? [])], "no [blank] left to fill in"),
    noBannedPhrases(texts, AI_TELLS, "ai-tells"),
  ];
};

export const bodyLength: LettersGrader = (output, kase) => {
  const range = WORD_RANGES[kase.input.kind][kase.input.style?.length ?? "standard"];
  const min = kase.expect?.minWords ?? range.min;
  const body = partsOf(output, kase).body.join("\n\n");
  return withinLength(body, { min, max: range.max, unit: "words" }, "body-length");
};

export const paragraphs: LettersGrader = (output, kase) => {
  const count = partsOf(output, kase).body.length;
  const { min, max } = PARAGRAPHS[kase.input.kind];
  const asked = min === max ? `${min}` : `${min} to ${max}`;
  return {
    name: "paragraphs",
    pass: count >= min && count <= max,
    detail: `${count} body paragraph${count === 1 ? "" : "s"}, asked for ${asked}`,
  };
};

// The product adds the greeting, sign-off and name, so the body must not have its own.
export const bodyOnly: LettersGrader = (output, kase) => {
  const { body } = partsOf(output, kase);
  const name = kase.input.resume.basics.name.trim();
  const found = [
    ...body.filter((paragraph) => OPENER.test(paragraph)).map((p) => `a greeting: "${shown(p)}"`),
    ...body
      .slice(-1)
      .filter((p) => SIGN_OFF.test(p))
      .map((p) => `a sign-off: "${shown(p)}"`),
    ...(name && body.some((p) => p.includes(name)) ? [`the person's name`] : []),
  ];
  return listed("body-only", found, "no greeting, sign-off or name inside the body");
};

export const namesRole: LettersGrader = (output, kase) => {
  const role = kase.expect?.role ?? kase.input.job.title;
  if (!role.trim()) return [];
  const parts = partsOf(output, kase);
  const places: [string, string][] = [["first paragraph", parts.body[0] ?? ""]];
  if (parts.subject !== null) places.push(["subject", parts.subject]);
  if (parts.note !== null) places.push(["LinkedIn note", parts.note]);
  const missing = places.filter(([, text]) => roleShare(role, text) < ROLE_SHARE);
  return {
    name: "names-role",
    pass: missing.length === 0,
    detail:
      missing.length === 0
        ? `names "${role}"`
        : `"${role}" isn't named in the ${missing.map(([where]) => where).join(" or ")}`,
  };
};

export const namesCompany: LettersGrader = (output, kase) => {
  const company = kase.input.job.company.trim();
  if (kase.input.kind !== "outreach" || !company) return [];
  const named = writtenTexts(partsOf(output, kase)).some((text) => termIn(text, company));
  return {
    name: "names-company",
    pass: named,
    detail: named ? `names ${company}` : `the subject, email and note never name ${company}`,
  };
};

export const resumeFacts: LettersGrader = (output, kase) => {
  const facts = kase.expect?.facts ?? [];
  if (facts.length === 0) return [];
  const text = writtenTexts(partsOf(output, kase)).join("\n");
  const used = facts.filter((fact) => termIn(text, fact)).map(labelOf);
  const needed = Math.min(FACTS_NEEDED[kase.input.kind], facts.length);
  const which = used.length ? `: ${used.join(", ")}` : "";
  return {
    name: "resume-facts",
    pass: used.length >= needed,
    detail: `uses ${used.length} of ${facts.length} best-fitting resume facts, needs ${needed}${which}`,
  };
};

export const postSpecific: LettersGrader = (output, kase) => {
  const terms = kase.expect?.post ?? [];
  if (terms.length === 0) return [];
  const text = writtenTexts(partsOf(output, kase)).join("\n");
  const hit = terms.find((term) => termIn(text, term));
  return {
    name: "post-specific",
    pass: hit !== undefined,
    detail:
      hit !== undefined
        ? `names "${labelOf(hit)}" from the post`
        : `names none of ${terms.map(labelOf).join(", ")} from the post`,
  };
};

export const unshownClaims: LettersGrader = (output, kase) => {
  const absent = kase.expect?.absent ?? [];
  if (absent.length === 0) return [];
  return noBannedPhrases(writtenTexts(partsOf(output, kase)), absent, "unshown-claims");
};

export const copiedFromPost: LettersGrader = (output, kase) => {
  const own = new Set(grams(resumeToText(kase.input.resume), COPIED_WORDS));
  const post = new Set(grams(kase.input.job.text, COPIED_WORDS).filter((gram) => !own.has(gram)));
  const copied = writtenTexts(partsOf(output, kase))
    .flatMap((text) => grams(text, COPIED_WORDS))
    .find((gram) => post.has(gram));
  return {
    name: "copied-from-post",
    pass: copied === undefined,
    detail:
      copied === undefined
        ? `no run of ${COPIED_WORDS} words copied from the post`
        : `copies "${copied}" from the post`,
  };
};

export const grounded: LettersGrader = (output, kase) => {
  const { job, style } = kase.input;
  const source = [...sourcesOf(kase), job.text, style?.notes ?? ""].join("\n");
  return novelWordsAtMost(writtenTexts(partsOf(output, kase)), source, NOVEL_SHARE);
};

export const apologies: LettersGrader = (output, kase) =>
  noBannedPhrases(writtenTexts(partsOf(output, kase)), APOLOGIES, "apologies");

export const sentenceLength: LettersGrader = (output, kase) => {
  const long = writtenTexts(partsOf(output, kase))
    .flatMap(sentencesOf)
    .filter((sentence) => wordCount(sentence) > LONGEST_SENTENCE)
    .map((sentence) => `${wordCount(sentence)} words: "${shown(sentence)}"`);
  return listed("sentence-length", long, `no sentence over ${LONGEST_SENTENCE} words`);
};

export const styleRules: LettersGrader = (output, kase) => {
  const style = kase.input.style;
  if (!style) return [];
  const parts = partsOf(output, kase);
  const texts = writtenTexts(parts);
  const grades: Grade[] = [];
  if (style.tone === "formal") {
    const found = texts.flatMap((text) => text.match(CONTRACTION) ?? []);
    grades.push(
      listed(
        "formal-tone",
        [...new Set(found)].map((word) => `"${word}"`),
        "no contractions",
      ),
    );
  }
  if (style.tone === "direct") {
    const counts = parts.body.flatMap(sentencesOf).map(wordCount);
    const mean = counts.length ? counts.reduce((sum, count) => sum + count, 0) / counts.length : 0;
    const longest = Math.max(0, ...counts);
    grades.push({
      name: "direct-tone",
      pass: mean <= DIRECT.mean && longest <= DIRECT.longest,
      detail: `sentences average ${mean.toFixed(1)} words (limit ${DIRECT.mean}), longest ${longest} (limit ${DIRECT.longest})`,
    });
  }
  if (style.spelling === "uk") {
    const own = new Set(wordsOf(sourcesOf(kase).join("\n")));
    const found = texts
      .flatMap((text) => text.match(US_SPELLING) ?? [])
      .filter((word) => !own.has(word.toLowerCase()));
    grades.push(
      listed(
        "uk-spelling",
        [...new Set(found)].map((word) => `"${word}"`),
        "no US spelling",
      ),
    );
  }
  return grades;
};

export const outreachParts: LettersGrader = (output, kase) => {
  if (kase.input.kind !== "outreach") return [];
  const { body, subject, note } = partsOf(output, kase);
  const fullNote = "note" in output ? output.note : "";
  const subjectText = subject ?? "";
  const noteText = note ?? "";
  const ask = body.at(-1) ?? "";
  const bigAsks = noBannedPhrases(body, BIG_ASKS);
  return [
    withinLength(subjectText, { ...SUBJECT_WORDS, unit: "words" }, "subject-length"),
    listed(
      "subject-form",
      [
        ...(/[?!]/.test(subjectText) ? ["a question or exclamation mark"] : []),
        ...(/\bquick question\b/i.test(subjectText) ? ['"quick question"'] : []),
      ],
      'no question, exclamation mark or "quick question"',
    ),
    {
      name: "note-length",
      pass: fullNote.length <= NOTE_CHARS && noteText.length >= NOTE_MIN_CHARS,
      detail: `${fullNote.length} characters with the greeting (LinkedIn's limit ${NOTE_CHARS}), ${noteText.length} without (at least ${NOTE_MIN_CHARS})`,
    },
    listed(
      "note-form",
      [
        ...(NOTE_GREETING.test(fullNote) ? [] : ["it doesn't start with the product's greeting"]),
        ...(OPENER.test(noteText) ? ["a second greeting"] : []),
        ...(NOTE_ASKS.test(noteText)
          ? [`asks for more than connecting: "${shown(noteText)}"`]
          : []),
      ],
      "one greeting, asks only to connect",
    ),
    {
      name: "easy-ask",
      pass: ask.includes("?") && bigAsks.pass,
      detail: !ask.includes("?")
        ? `the last paragraph asks nothing: "${shown(ask)}"`
        : bigAsks.pass
          ? "ends with one small question"
          : `asks too much: ${bigAsks.detail}`,
    },
  ];
};
