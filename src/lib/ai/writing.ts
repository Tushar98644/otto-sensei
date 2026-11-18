import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { listBullets, resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import {
  DEFAULT_WRITING_STYLE,
  STYLE_LIMITS,
  type WritingLength,
  type WritingStyleBody,
  type WritingTone,
} from "@/lib/writing-style/schema";
import { runStructured, type AITask } from "./client";
import { ANSWER_SYSTEM_PROMPT, LETTER_SYSTEM_PROMPT, OUTREACH_SYSTEM_PROMPT } from "./prompts";
import { redactResume, redactorFor, type Redactor } from "./redact";
import { clip, clipWords, MAX_RESUME_CHARS, oneLine, tag, type DataTag } from "./text";
import {
  AIError,
  type AnswerResult,
  type CoverLetterResult,
  type OutreachResult,
  type WritingInput,
} from "./types";
import { demoAnswer, demoLetter, demoOutreach } from "./writing-demo";
import {
  checkProse,
  clichesIn,
  clipToWords,
  dropClichedSentences,
  problemScore,
  retryNotes,
  sentencesOf,
  unbackedIn,
  upgradedVerbs,
  wordCount,
  type ProseCheck,
} from "./writing-guards";
import { clicheWarning, fillInWarning, unbackedWarning, verbWarning } from "./warning-text";

export const LETTER_WORDS = { min: 150, max: 250 } as const;
export const ANSWER_WORDS = { min: 60, max: 150 } as const;
export const QUESTION_CHARS = { min: 8, max: 500 } as const;
// The prompt asks for 60 to 120 words; the cap leaves room so clipping never drops the closing ask.
const OUTREACH_WORDS = { min: 60, max: 150 } as const;
const SUBJECT_CHARS = 90;
// LinkedIn's limit for a free account's invitation note.
export const NOTE_CHARS = 200;
const JOB_FIELD_CHARS = 200;
const LETTER_FLOOR_WORDS = 110;
const ANSWER_FLOOR_WORDS = 45;
const OUTREACH_FLOOR_WORDS = 45;
const NOTE_GREETING = "Hi [first name], ";
// One budget for both calls: the first may use all of it, and a retry starts only if it can finish.
const TOTAL_DEADLINE_MS = 50_000;
const MIN_RETRY_MS = 15_000;

const LetterOutputSchema = z.object({
  paragraphs: z.array(z.string()).describe("The letter body: 3 short paragraphs."),
});
const AnswerOutputSchema = z.object({ answer: z.string() });
const OutreachOutputSchema = z.object({
  subject: z.string(),
  email: z.array(z.string()).describe("The email body: 2 or 3 short paragraphs."),
  note: z.string(),
});

type Range = { readonly min: number; readonly max: number };
type Piece = "letter" | "answer" | "outreach";
type Lengths = { range: Range; floor: number };

// The shorter style's asked word counts, with the same room above them as the standard ones.
const SHORTER: Record<
  Piece,
  { part: string; min: number; max: number; cap: number; floor: number }
> = {
  letter: { part: "the body", min: 110, max: 150, cap: 180, floor: 80 },
  answer: { part: "the answer", min: 45, max: 90, cap: 110, floor: 35 },
  outreach: { part: "the email body", min: 45, max: 80, cap: 110, floor: 35 },
};

const STANDARD: Record<Piece, Lengths> = {
  letter: { range: LETTER_WORDS, floor: LETTER_FLOOR_WORDS },
  answer: { range: ANSWER_WORDS, floor: ANSWER_FLOOR_WORDS },
  outreach: { range: OUTREACH_WORDS, floor: OUTREACH_FLOOR_WORDS },
};

function lengthsFor(piece: Piece, length: WritingLength): Lengths {
  if (length === "standard") return STANDARD[piece];
  const { min, cap, floor } = SHORTER[piece];
  return { range: { min, max: cap }, floor };
}

const TONE_LINES: Record<WritingTone, string | null> = {
  natural: null,
  warm: "Tone: warm. Friendly and personal, still professional.",
  direct: "Tone: direct. Short sentences, straight to the point.",
  formal:
    'Tone: formal. Polished and traditional, with no contractions: write "I am" and "I would", never "I\'m" or "I\'d".',
};

const UK_SPELLING =
  'Spelling: British English, such as "organise", "colour" and "centre", and "CV" for a resume.';

const TAG_START =
  /<(?=\s*\/?\s*(?:style|resume|role|line|answers|experience|job_post|question)\b)/gi;
const ANY_TAG = /<\s*\/?\s*[a-z][\w-]*\b[^>]*>/gi;
const NUMBER_AND_WORD =
  /(?<![\p{L}\p{N}.,])[$€£¥]?(\d+(?:[.,]\d+)*)(?:%|\+|[kKmMbBx](?![\p{L}\p{N}]))?[\s-]+(\p{L}+)/gu;

type Prepared = {
  job: WritingInput;
  shownText: string;
  redactor: Redactor;
  sources: string[];
  noteNumbers: ReadonlySet<string>;
  lines: string[];
  shownNotes: string;
};

// Swaps the "<" instead of deleting the tag, so the text around it can't join into a new one.
function defuseTags(text: string): string {
  return text.replace(TAG_START, "‹");
}

function numbersWithWord(text: string): { digits: string; key: string }[] {
  return Array.from(text.matchAll(NUMBER_AND_WORD), (match) => {
    const digits = (match[1] ?? "").replace(/,/g, "");
    return { digits, key: `${digits} ${(match[2] ?? "").toLowerCase()}` };
  });
}

// A number from the notes is backed only beside the same word, so "under 150 words" can't back "150 customers".
function factSources(text: string, prepared: Prepared): string[] {
  const backed = numbersWithWord(text)
    .filter(({ key }) => prepared.noteNumbers.has(key))
    .map(({ digits }) => digits);
  return backed.length ? [...prepared.sources, backed.join(" ")] : prepared.sources;
}

function prepare(resume: Resume, input: WritingInput, style: WritingStyleBody): Prepared {
  const job: WritingInput = {
    jobText: input.jobText.trim(),
    jobTitle: clip(oneLine(input.jobTitle), JOB_FIELD_CHARS),
    company: clip(oneLine(input.company), JOB_FIELD_CHARS),
  };
  if (job.jobText.length > TEXT_LIMITS.jobPostChars) {
    throw new AIError("too_long", `The job post is over ${TEXT_LIMITS.jobPostChars} characters`);
  }
  const resumeText = resumeToText(resume);
  if (resumeText.length > MAX_RESUME_CHARS) {
    throw new AIError("too_long", `The resume is over ${MAX_RESUME_CHARS} characters`);
  }
  const lines = [...listBullets(resume).map((bullet) => bullet.text), resume.summary];
  const redactor = redactorFor(resume);
  const shownText = resumeToText(redactResume(resume, redactor));
  const notes = clip(style.notes, STYLE_LIMITS.notes);
  // The notes stay out of sources, so a phrase they name, such as "I learned", is still checked.
  const noteNumbers = new Set(numbersWithWord(notes).map(({ key }) => key));
  const untagged = defuseTags(notes.replace(ANY_TAG, " ")).replace(/[ \t]{2,}/g, " ");
  const shownNotes = redactor.redact(untagged).trim();
  const sources = [resumeText, job.jobTitle, job.company];
  return { job, shownText, redactor, sources, noteNumbers, lines, shownNotes };
}

// Sent only when it says something, so a default style sends the same message as no style.
function styleBlock(style: WritingStyleBody, piece: Piece, prepared: Prepared): string {
  const shorter = SHORTER[piece];
  const lines = [
    TONE_LINES[style.tone],
    style.length === "shorter" &&
      `Length: shorter. Write ${shorter.part} in about ${shorter.min} to ${shorter.max} words.`,
    style.spelling === "uk" && UK_SPELLING,
    prepared.shownNotes && `The person's notes, in their own words:\n${prepared.shownNotes}`,
  ].filter((line): line is string => Boolean(line));
  return lines.length ? `<style>\n${lines.join("\n")}\n</style>` : "";
}

// A resume, post or question can't open or close a <style> block or a data tag of its own.
function dataTag(name: DataTag, body: string): string {
  return tag(name, defuseTags(body));
}

function userMessage(parts: readonly string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

function closingLine(signOff: string, fallback: string): string {
  const own = oneLine(signOff).replace(/[\s,]+$/u, "");
  if (!own) return `${fallback},`;
  return /[.!?]$/u.test(own) ? own : `${own},`;
}

function postText(job: WritingInput): string {
  return [
    job.jobTitle && `Job title: ${job.jobTitle}`,
    job.company && `Company: ${job.company}`,
    job.jobText,
  ]
    .filter(Boolean)
    .join("\n");
}

function needsRetry(check: ProseCheck): boolean {
  return (
    check.cliches.length > 0 ||
    check.upgrades.length > 0 ||
    check.unbacked.length > 0 ||
    check.maskedNumbers > 0
  );
}

// polish() drops stock-phrase sentences, so a draft that stays full length without them is kept.
function clichesDropCleanly(check: ProseCheck, range: Range, sources: readonly string[]): boolean {
  if (check.upgrades.length > 0 || check.unbacked.length > 0 || check.maskedNumbers > 0) {
    return false;
  }
  const { paragraphs, dropped } = dropClichedSentences(check.paragraphs, range.min, sources);
  return dropped > 0 && paragraphs.length === check.paragraphs.length;
}

type DraftRequest<T> = {
  task: AITask;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  paragraphs: (output: T) => string[];
  range: Range;
};

type Drafted<T> = { check: ProseCheck; output: T };

async function draft<T>(request: DraftRequest<T>, prepared: Prepared): Promise<Drafted<T>> {
  const started = Date.now();
  const call = async (user: string, deadlineMs: number): Promise<Drafted<T>> => {
    const output = await runStructured(
      { task: request.task, system: request.system, user, schema: request.schema, effort: "low" },
      { deadlineMs },
    );
    const paragraphs = request.paragraphs(output).map((text) => prepared.redactor.restore(text));
    const sources = factSources(paragraphs.join("\n\n"), prepared);
    return { check: checkProse(paragraphs, sources, prepared.lines), output };
  };
  const firstDraft = await call(request.user, TOTAL_DEADLINE_MS);
  const first = firstDraft.check;
  const left = TOTAL_DEADLINE_MS - (Date.now() - started);
  if (!needsRetry(first) || left < MIN_RETRY_MS) return firstDraft;
  if (clichesDropCleanly(first, request.range, prepared.sources)) {
    log.info(`${request.task}.retry_skipped`, { cliches: first.cliches.length });
    return firstDraft;
  }

  const notes = retryNotes(first, request.range).map((note) => `- ${note}`);
  log.info(`${request.task}.retry`, {
    cliches: first.cliches.length,
    upgrades: first.upgrades.length,
    unbacked: first.unbacked.length,
    maskedNumbers: first.maskedNumbers,
  });
  const retry = ["A first draft had these problems. Write it again without them:", ...notes];
  try {
    // The notes quote resume lines, which can hold a link or an email.
    const notesText = prepared.redactor.redact(retry.join("\n"));
    const second = await call(`${request.user}\n\n${notesText}`, left);
    const better = problemScore(second.check, request.range) < problemScore(first, request.range);
    return better ? second : firstDraft;
  } catch (error) {
    if (!(error instanceof AIError)) throw error;
    log.warn(`${request.task}.retry_failed`, { code: error.code });
    return firstDraft;
  }
}

function quoted(text: string): string {
  const line = oneLine(text);
  return `“${line.length > 80 ? `${line.slice(0, 77).trimEnd()}…` : line}”`;
}

function warningsFor(text: string, prepared: Prepared, blankHint: string): string[] {
  const warnings: string[] = [];
  const blanks = [...new Set(text.match(/\[[^\]\n]+\]/g) ?? [])];
  if (blanks.length) warnings.push(fillInWarning(blanks, blankHint));
  for (const upgrade of upgradedVerbs(text, prepared.lines)) {
    warnings.push(verbWarning(upgrade.verb, quoted(upgrade.line)));
  }
  for (const phrase of unbackedIn(text, prepared.sources)) {
    warnings.push(unbackedWarning(phrase));
  }
  const cliches = clichesIn(text, prepared.sources);
  if (cliches.length) warnings.push(clicheWarning(cliches));
  return warnings;
}

function polish(
  check: ProseCheck,
  range: Range,
  floor: number,
  sources: readonly string[],
): string[] {
  const { paragraphs } = dropClichedSentences(check.paragraphs, floor, sources);
  const clipped = clipToWords(paragraphs, range.max);
  if (wordCount(clipped.join(" ")) === 0) {
    throw new AIError("invalid_output", "The AI model returned empty text");
  }
  return clipped;
}

function letterMessage(prepared: Prepared, style: string): string {
  return userMessage([
    dataTag("resume", prepared.shownText),
    dataTag("job_post", postText(prepared.job)),
    style,
    "Write the cover letter.",
  ]);
}

export function assembleLetter(
  paragraphs: readonly string[],
  name: string,
  company: string,
  signOff = "",
): string {
  const greeting = company ? `Dear ${company} team,` : "Dear hiring team,";
  const closing = closingLine(signOff, "Best regards");
  return [greeting, ...paragraphs, name ? `${closing}\n${name}` : closing].join("\n\n");
}

export async function writeCoverLetter(
  resume: Resume,
  input: WritingInput,
  style: WritingStyleBody = DEFAULT_WRITING_STYLE,
): Promise<CoverLetterResult> {
  const prepared = prepare(resume, input, style);
  const { range, floor } = lengthsFor("letter", style.length);
  const name = oneLine(resume.basics.name);
  const company = prepared.job.company;
  const paragraphs = aiEnabled()
    ? polish(
        await draft(
          {
            task: "letter",
            system: LETTER_SYSTEM_PROMPT,
            user: letterMessage(prepared, styleBlock(style, "letter", prepared)),
            schema: LetterOutputSchema,
            paragraphs: (output) => output.paragraphs,
            range,
          },
          prepared,
        ).then((drafted) => drafted.check),
        range,
        floor,
        prepared.sources,
      )
    : demoLetter(resume, prepared.job);
  const body = paragraphs.join("\n\n");
  return {
    letter: assembleLetter(paragraphs, name, company, style.signOff),
    words: wordCount(body),
    warnings: warningsFor(body, prepared, "before you send it. Otto never guesses numbers."),
  };
}

function answerMessage(prepared: Prepared, question: string, style: string): string {
  return userMessage([
    dataTag("resume", prepared.shownText),
    dataTag("job_post", postText(prepared.job)),
    dataTag("question", question),
    style,
    "Draft the answer.",
  ]);
}

export async function answerQuestion(
  resume: Resume,
  input: WritingInput,
  question: string,
  style: WritingStyleBody = DEFAULT_WRITING_STYLE,
): Promise<AnswerResult> {
  const asked = clip(oneLine(question), QUESTION_CHARS.max);
  if (asked.length < QUESTION_CHARS.min) {
    throw new AIError("invalid_output", "There is no question to answer");
  }
  const prepared = prepare(resume, input, style);
  const { range, floor } = lengthsFor("answer", style.length);
  const shownQuestion = prepared.redactor.redact(asked);
  const paragraphs = aiEnabled()
    ? polish(
        await draft(
          {
            task: "answer",
            system: ANSWER_SYSTEM_PROMPT,
            user: answerMessage(prepared, shownQuestion, styleBlock(style, "answer", prepared)),
            schema: AnswerOutputSchema,
            paragraphs: (output) => output.answer.split(/\n\s*\n/),
            range,
          },
          prepared,
        ).then((drafted) => drafted.check),
        range,
        floor,
        prepared.sources,
      )
    : demoAnswer(resume, prepared.job, asked);
  const answer = paragraphs.join("\n\n");
  return {
    answer,
    words: wordCount(answer),
    warnings: warningsFor(answer, prepared, "with your own words before you send it."),
  };
}

function outreachMessage(prepared: Prepared, style: string): string {
  return userMessage([
    dataTag("resume", prepared.shownText),
    dataTag("job_post", postText(prepared.job)),
    style,
    "Write the message.",
  ]);
}

function assembleOutreach(
  paragraphs: readonly string[],
  name: string,
  style: WritingStyleBody,
): string {
  const greeting = style.tone === "formal" ? "Dear [first name]," : "Hi [first name],";
  const closing = closingLine(style.signOff, "Best");
  return [greeting, ...paragraphs, name ? `${closing}\n${name}` : closing].join("\n\n");
}

type OutreachParts = { subject: string; email: string[]; note: string };

function hasProblems(check: ProseCheck): boolean {
  return needsRetry(check) || check.placeholders.length > 0;
}

// A subject or note with an invented number, an upgraded verb or a stock phrase is replaced, not shipped with a warning.
function finishOutreach(
  email: ProseCheck,
  subject: string,
  note: string,
  prepared: Prepared,
  lengths: Lengths,
): OutreachParts {
  const { sources, lines, job } = prepared;
  const body = polish(email, lengths.range, lengths.floor, sources);
  const subjectCheck = checkProse([subject], factSources(subject, prepared), lines);
  const noteCheck = checkProse([note], factSources(note, prepared), lines);
  const shownSubject = clip(oneLine(subjectCheck.paragraphs[0] ?? ""), SUBJECT_CHARS);
  const shownNote = oneLine(noteCheck.paragraphs.join(" "));
  return {
    subject: shownSubject && !hasProblems(subjectCheck) ? shownSubject : fallbackSubject(job),
    email: body,
    note: shownNote && !hasProblems(noteCheck) ? shownNote : fallbackNote(body, job),
  };
}

function fallbackSubject(job: WritingInput): string {
  const role = job.jobTitle || "The open role";
  return clip(job.company ? `${role} at ${job.company}` : role, SUBJECT_CHARS);
}

const NOTE_BUDGET = NOTE_CHARS - NOTE_GREETING.length;

// The email's first sentence when it fits the note, or a plain line naming the role.
function fallbackNote(body: readonly string[], job: WritingInput): string {
  const first = sentencesOf(body[0] ?? "")[0]?.trim() ?? "";
  if (first && first.length <= NOTE_BUDGET) return first;
  const role = job.jobTitle ? `the ${job.jobTitle} role` : "your open role";
  const line = `I am applying for ${role}${job.company ? ` at ${job.company}` : ""} and would be glad to connect.`;
  return clipWords(line, NOTE_BUDGET);
}

export async function writeOutreach(
  resume: Resume,
  input: WritingInput,
  style: WritingStyleBody = DEFAULT_WRITING_STYLE,
): Promise<OutreachResult> {
  const prepared = prepare(resume, input, style);
  const lengths = lengthsFor("outreach", style.length);
  const name = oneLine(resume.basics.name);
  let parts: OutreachParts;
  if (aiEnabled()) {
    const { check, output } = await draft(
      {
        task: "outreach",
        system: OUTREACH_SYSTEM_PROMPT,
        user: outreachMessage(prepared, styleBlock(style, "outreach", prepared)),
        schema: OutreachOutputSchema,
        paragraphs: (result) => result.email,
        range: lengths.range,
      },
      prepared,
    );
    const restore = (text: string) => prepared.redactor.restore(text);
    parts = finishOutreach(check, restore(output.subject), restore(output.note), prepared, lengths);
  } else {
    parts = demoOutreach(resume, prepared.job);
  }
  const body = parts.email.join("\n\n");
  // The note's length is shown live in the dialog, so a warning here would go stale as the person edits it.
  const warnings = warningsFor(
    `${parts.subject}.\n\n${body}\n\n${parts.note}`,
    prepared,
    "before you send it.",
  );
  return {
    subject: parts.subject,
    email: assembleOutreach(parts.email, name, style),
    note: `${NOTE_GREETING}${parts.note}`,
    words: wordCount(body),
    warnings,
  };
}
