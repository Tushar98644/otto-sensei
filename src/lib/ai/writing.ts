import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { listBullets, resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { runStructured, type AITask } from "./client";
import { ANSWER_SYSTEM_PROMPT, LETTER_SYSTEM_PROMPT } from "./prompts";
import { redactResume, redactorFor, type Redactor } from "./redact";
import { clip, MAX_RESUME_CHARS, oneLine, tag } from "./text";
import { AIError, type AnswerResult, type CoverLetterResult, type WritingInput } from "./types";
import { demoAnswer, demoLetter } from "./writing-demo";
import {
  checkProse,
  clichesIn,
  clipToWords,
  dropClichedSentences,
  problemScore,
  retryNotes,
  unbackedIn,
  upgradedVerbs,
  wordCount,
  type ProseCheck,
} from "./writing-guards";

export const LETTER_WORDS = { min: 150, max: 250 } as const;
export const ANSWER_WORDS = { min: 60, max: 150 } as const;
export const QUESTION_CHARS = { min: 8, max: 500 } as const;
const JOB_FIELD_CHARS = 200;
const LETTER_FLOOR_WORDS = 110;
const ANSWER_FLOOR_WORDS = 45;
// Two calls fit the route's 60 seconds: a retry only starts with enough time left to finish.
const FIRST_DEADLINE_MS = 30_000;
const TOTAL_DEADLINE_MS = 50_000;
const MIN_RETRY_MS = 15_000;

const LetterOutputSchema = z.object({
  paragraphs: z.array(z.string()).describe("The letter body: 3 short paragraphs."),
});
const AnswerOutputSchema = z.object({ answer: z.string() });

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

type DraftRequest<T> = {
  task: AITask;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  paragraphs: (output: T) => string[];
  range: Range;
};

async function draft<T>(request: DraftRequest<T>, prepared: Prepared): Promise<ProseCheck> {
  const started = Date.now();
  const call = async (user: string, deadlineMs: number) => {
    const output = await runStructured(
      { task: request.task, system: request.system, user, schema: request.schema, effort: "low" },
      { deadlineMs },
    );
    const paragraphs = request.paragraphs(output).map((text) => prepared.redactor.restore(text));
    return checkProse(paragraphs, prepared.sources, prepared.lines);
  };
  const first = await call(request.user, FIRST_DEADLINE_MS);
  const left = TOTAL_DEADLINE_MS - (Date.now() - started);
  if (!needsRetry(first) || left < MIN_RETRY_MS) return first;

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
    const better = problemScore(second, request.range) < problemScore(first, request.range);
    return better ? second : first;
  } catch (error) {
    if (!(error instanceof AIError)) throw error;
    log.warn(`${request.task}.retry_failed`, { code: error.code });
    return first;
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
  const cliches = clichesIn(text);
  if (cliches.length) {
    const phrases = cliches.map((phrase) => `“${phrase}”`).join(", ");
    warnings.push(`Swap ${phrases} for your own words. Recruiters skim past it.`);
  }
  return warnings;
}

function polish(check: ProseCheck, range: Range, floor: number): string[] {
  const { paragraphs } = dropClichedSentences(check.paragraphs, floor);
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
        ),
        LETTER_WORDS,
        LETTER_FLOOR_WORDS,
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
        ),
        ANSWER_WORDS,
        ANSWER_FLOOR_WORDS,
      )
    : demoAnswer(resume, prepared.job, asked);
  const answer = paragraphs.join("\n\n");
  return {
    answer,
    words: wordCount(answer),
    warnings: warningsFor(answer, prepared, "with your own words before you send it."),
  };
}
