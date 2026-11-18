import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { listBullets, resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { runStructured, type AITask } from "./client";
import { ANSWER_SYSTEM_PROMPT, LETTER_SYSTEM_PROMPT, OUTREACH_SYSTEM_PROMPT } from "./prompts";
import { redactResume, redactorFor, type Redactor } from "./redact";
import { clip, clipWords, MAX_RESUME_CHARS, oneLine, tag } from "./text";
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

type Prepared = {
  job: WritingInput;
  shownText: string;
  redactor: Redactor;
  sources: string[];
  lines: string[];
};

function prepare(resume: Resume, input: WritingInput): Prepared {
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
  return { job, shownText, redactor, sources: [resumeText, job.jobTitle, job.company], lines };
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
    return { check: checkProse(paragraphs, prepared.sources, prepared.lines), output };
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
  if (blanks.length) warnings.push(`Fill in ${blanks.join(", ")} ${blankHint}`);
  for (const upgrade of upgradedVerbs(text, prepared.lines)) {
    warnings.push(`Check “${upgrade.verb}”. Your resume says ${quoted(upgrade.line)}.`);
  }
  for (const phrase of unbackedIn(text, prepared.sources)) {
    warnings.push(`Check “${phrase}”: only you know that. Keep it if it's true.`);
  }
  const cliches = clichesIn(text, prepared.sources);
  if (cliches.length) {
    const phrases = cliches.map((phrase) => `“${phrase}”`).join(", ");
    warnings.push(`Swap ${phrases} for your own words. Recruiters skim past it.`);
  }
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

function letterMessage(resumeText: string, job: WritingInput): string {
  return [tag("resume", resumeText), tag("job_post", postText(job)), "Write the cover letter."]
    .join("\n\n");
}

export function assembleLetter(
  paragraphs: readonly string[],
  name: string,
  company: string,
): string {
  const greeting = company ? `Dear ${company} team,` : "Dear hiring team,";
  const signOff = name ? `Best regards,\n${name}` : "Best regards,";
  return [greeting, ...paragraphs, signOff].join("\n\n");
}

export async function writeCoverLetter(
  resume: Resume,
  input: WritingInput,
): Promise<CoverLetterResult> {
  const prepared = prepare(resume, input);
  const name = oneLine(resume.basics.name);
  const company = prepared.job.company;
  const paragraphs = aiEnabled()
    ? polish(
        await draft(
          {
            task: "letter",
            system: LETTER_SYSTEM_PROMPT,
            user: letterMessage(prepared.shownText, prepared.job),
            schema: LetterOutputSchema,
            paragraphs: (output) => output.paragraphs,
            range: LETTER_WORDS,
          },
          prepared,
        ).then((drafted) => drafted.check),
        LETTER_WORDS,
        LETTER_FLOOR_WORDS,
        prepared.sources,
      )
    : demoLetter(resume, prepared.job);
  const body = paragraphs.join("\n\n");
  return {
    letter: assembleLetter(paragraphs, name, company),
    words: wordCount(body),
    warnings: warningsFor(body, prepared, "before you send it. Otto never guesses numbers."),
  };
}

function answerMessage(resumeText: string, job: WritingInput, question: string): string {
  return [
    tag("resume", resumeText),
    tag("job_post", postText(job)),
    tag("question", question),
    "Draft the answer.",
  ].join("\n\n");
}

export async function answerQuestion(
  resume: Resume,
  input: WritingInput,
  question: string,
): Promise<AnswerResult> {
  const asked = clip(oneLine(question), QUESTION_CHARS.max);
  if (asked.length < QUESTION_CHARS.min) {
    throw new AIError("invalid_output", "There is no question to answer");
  }
  const prepared = prepare(resume, input);
  const shownQuestion = prepared.redactor.redact(asked);
  const paragraphs = aiEnabled()
    ? polish(
        await draft(
          {
            task: "answer",
            system: ANSWER_SYSTEM_PROMPT,
            user: answerMessage(prepared.shownText, prepared.job, shownQuestion),
            schema: AnswerOutputSchema,
            paragraphs: (output) => output.answer.split(/\n\s*\n/),
            range: ANSWER_WORDS,
          },
          prepared,
        ).then((drafted) => drafted.check),
        ANSWER_WORDS,
        ANSWER_FLOOR_WORDS,
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

function outreachMessage(resumeText: string, job: WritingInput): string {
  return [tag("resume", resumeText), tag("job_post", postText(job)), "Write the message."].join(
    "\n\n",
  );
}

function assembleOutreach(paragraphs: readonly string[], name: string): string {
  const signOff = name ? `Best,\n${name}` : "Best,";
  return ["Hi [first name],", ...paragraphs, signOff].join("\n\n");
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
): OutreachParts {
  const { sources, lines, job } = prepared;
  const body = polish(email, OUTREACH_WORDS, OUTREACH_FLOOR_WORDS, sources);
  const subjectCheck = checkProse([subject], sources, lines);
  const noteCheck = checkProse([note], sources, lines);
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
  const line = `I'm applying for ${role}${job.company ? ` at ${job.company}` : ""} and would be glad to connect.`;
  return clipWords(line, NOTE_BUDGET);
}

export async function writeOutreach(resume: Resume, input: WritingInput): Promise<OutreachResult> {
  const prepared = prepare(resume, input);
  const name = oneLine(resume.basics.name);
  let parts: OutreachParts;
  if (aiEnabled()) {
    const { check, output } = await draft(
      {
        task: "outreach",
        system: OUTREACH_SYSTEM_PROMPT,
        user: outreachMessage(prepared.shownText, prepared.job),
        schema: OutreachOutputSchema,
        paragraphs: (result) => result.email,
        range: OUTREACH_WORDS,
      },
      prepared,
    );
    const restore = (text: string) => prepared.redactor.restore(text);
    parts = finishOutreach(check, restore(output.subject), restore(output.note), prepared);
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
    email: assembleOutreach(parts.email, name),
    note: `${NOTE_GREETING}${parts.note}`,
    words: wordCount(body),
    warnings,
  };
}
