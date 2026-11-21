import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { STRUCTURE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { structureResume, type StructureResult } from "@/lib/ai/structure";
import {
  matchesSchema,
  noInventedNumbers,
  novelWordsAtMost,
  type Grade,
} from "@/lib/evals/graders";
import { log } from "@/lib/log";
import { heuristicParse } from "@/lib/resume/heuristic-parse";
import { ResumeSchema } from "@/lib/resume/validation";
import { tokensOf } from "../cost";
import { defineSuite, type EvalCase } from "../suite";
import { STRUCTURE_CASES } from "./structure/cases";
import {
  copiedTexts,
  leftOutGrade,
  overallGrade,
  readOf,
  resumeOf,
  scoreRead,
  sectionGrades,
  type ReadResume,
} from "./structure/graders";

type StructureInput = { text: string };
type StructureExpect = { read: ReadResume | null; leftOut?: readonly string[] };
export type StructureCase = EvalCase<StructureInput, StructureResult, StructureExpect>;

// structureResume skips the AI for text shorter than this (MIN_AI_CHARS in src/lib/ai/structure.ts).
const AI_MIN_CHARS = 40;
// The import route gives the AI read until 55 s after the request starts (AI_READ_BY_MS).
const AI_READ_BY_MS = 55_000;
// A verbatim read copies every word, so even a little new wording is a sign of rewriting.
const MAX_NOVEL_WORDS = 0.05;
// The response JSON schema sent with every structure call, on top of the prompt and the text.
const SCHEMA_TOKENS = 2_000;
const REASONING_TOKENS = 1_000;
const OUTPUT_PER_TEXT_TOKEN = 1.5;
const GOLDEN_NOW = Date.UTC(2026, 10, 1);

const InputSchema = z.object({
  text: z
    .string()
    .max(TEXT_LIMITS.resumeChars)
    .refine((text) => text.trim().length >= AI_MIN_CHARS, {
      message: `needs at least ${AI_MIN_CHARS} characters, or the app never asks the AI`,
    }),
});

const aiEvents = new AsyncLocalStorage<string[]>();
let listening = false;

function noteAiEvent(event: string, reason: unknown): void {
  if (!event.startsWith("ai.")) return;
  aiEvents.getStore()?.push(`${event.slice(3)}${typeof reason === "string" ? `=${reason}` : ""}`);
}

// structureResume hides why it fell back; the client's own log events say, so each case keeps the ones it caused.
function listenForAiEvents(): void {
  if (listening) return;
  listening = true;
  const { warn, error } = log;
  log.warn = (event, fields, cause) => {
    noteAiEvent(event, fields?.reason);
    warn(event, fields, cause);
  };
  log.error = (event, cause, fields) => {
    noteAiEvent(event, fields?.reason);
    error(event, cause, fields);
  };
}

export async function readResume(kase: StructureCase): Promise<StructureResult> {
  listenForAiEvents();
  const seen: string[] = [];
  const startedAt = Date.now();
  const result = await aiEvents.run(seen, () =>
    structureResume(kase.input.text, startedAt, { ai: true, deadline: startedAt + AI_READ_BY_MS }),
  );
  if (result.usedAI) return result;
  // For text that isn't a resume, an empty read is the right answer and the app keeps its rules read.
  if (kase.expect?.read === null && seen.includes("structure_rejected=empty")) return result;
  throw new Error(`fell back to the rule-based read (${seen.join(", ") || "no reason logged"})`);
}

function readGrades(output: StructureResult, kase: StructureCase): Grade[] {
  const expected = kase.expect?.read;
  if (!expected) return [];
  const scores = scoreRead(expected, readOf(output.resume));
  return [overallGrade(scores), ...scores.flatMap(sectionGrades)];
}

function notAResumeGrade(output: StructureResult, kase: StructureCase): Grade[] {
  if (kase.expect?.read !== null) return [];
  const read = readOf(output.resume);
  return [
    {
      name: "not-a-resume",
      pass: !output.usedAI,
      detail: output.usedAI
        ? `read a resume out of it: ${read.experience.length} jobs, ${read.skills.flatMap((group) => group.items).length} skills, name "${read.basics.name}"`
        : "returned nothing, so the app kept its rule-based read",
    },
  ];
}

// The rule-based read the app falls back to isn't the model's work, so it isn't graded as such.
function aiTexts(output: StructureResult): string[] | null {
  return output.usedAI ? copiedTexts(readOf(output.resume)) : null;
}

function judgeText(output: StructureResult): string {
  if (!output.usedAI) {
    return "(The reader returned nothing usable, so the app kept its basic rule-based read and showed no AI result.)";
  }
  const read = readOf(output.resume);
  const { basics } = read;
  const line = (label: string, value: string) => (value ? [`${label}: ${value}`] : []);
  const dates = (start: string, end: string) => [start, end].filter(Boolean).join(" to ");
  const bullets = (texts: readonly string[]) => texts.map((text) => `  - ${text}`);
  return [
    ...line("Name", basics.name),
    ...line("Headline", basics.headline),
    ...line("Email", basics.email),
    ...line("Phone", basics.phone),
    ...line("Location", basics.location),
    ...basics.links.map((link) => `Link: ${link.label} ${link.url}`),
    ...line("Summary", read.summary),
    ...read.experience.flatMap((job) => [
      `Job: title "${job.title}" | company "${job.company}" | location "${job.location}" | ${dates(job.startDate, job.endDate)}`,
      ...bullets(job.bullets),
    ]),
    ...read.education.flatMap((school) => [
      `School: "${school.school}" | degree "${school.degree}" | field "${school.field}" | location "${school.location}" | ${dates(school.startDate, school.endDate)}`,
      ...bullets(school.bullets),
    ]),
    ...read.projects.flatMap((project) => [
      `Project: "${project.name}"${project.link ? ` | ${project.link}` : ""}`,
      ...bullets(project.bullets),
    ]),
    ...read.skills.map(
      (group) => `Skills${group.label ? ` (${group.label})` : ""}: ${group.items.join(", ")}`,
    ),
    ...read.certifications.map(
      (cert) => `Certification: "${cert.name}" | issuer "${cert.issuer}" | ${cert.date}`,
    ),
    ...read.extras.flatMap((section) => [
      `Section "${section.title}" (${section.kind}):`,
      ...section.items.flatMap((item) => [
        `  * ${[item.title, item.subtitle, item.date, item.detail].filter(Boolean).join(" | ")}`,
        ...item.bullets.map((text) => `    - ${text}`),
      ]),
    ]),
  ].join("\n");
}

const CASES: readonly StructureCase[] = STRUCTURE_CASES.map((data) => ({
  id: data.id,
  note: data.note,
  input: { text: data.text },
  expect: { read: data.read, ...(data.leftOut ? { leftOut: data.leftOut } : {}) },
  golden: data.read
    ? { resume: resumeOf(data.read, GOLDEN_NOW), usedAI: true }
    : { resume: heuristicParse(data.text, GOLDEN_NOW), usedAI: false },
}));

export const structureSuite = defineSuite<StructureInput, StructureResult, StructureExpect>({
  name: "structure",
  description:
    "Read an uploaded resume's text into structured fields (structureResume, as /api/import calls it), graded field by field for precision and recall.",
  inputSchema: InputSchema,
  cases: CASES,
  run: (kase) => readResume(kase),
  graders: [
    (output) => matchesSchema(ResumeSchema, output.resume),
    notAResumeGrade,
    readGrades,
    (output, kase) =>
      kase.expect?.leftOut && kase.expect.read
        ? leftOutGrade(readOf(output.resume), kase.expect.leftOut)
        : [],
    (output, kase) => {
      const texts = aiTexts(output);
      return texts ? noInventedNumbers(texts, [kase.input.text]) : [];
    },
    (output, kase) => {
      const texts = aiTexts(output);
      return texts ? novelWordsAtMost(texts, kase.input.text, MAX_NOVEL_WORDS) : [];
    },
  ],
  rubric: {
    task: "Read the plain text of one uploaded resume into a resume editor's fields (contact details, summary, jobs, education, projects, skills, certifications and other sections), copying the text exactly; when the text is not a resume, return nothing.",
    criteria: [
      {
        id: "complete",
        description:
          "Every job, school, project, skill, certification and other section in the text is there with all of its lines; nothing is dropped or cut short.",
      },
      {
        id: "right_fields",
        description:
          "Each value sits in the right field and entry: title vs company, start vs end date, degree vs school, each line under its own job, spoken languages and awards in their own sections.",
      },
      {
        id: "verbatim",
        description:
          "Text is copied exactly as written: no rewording, fixing, merging or splitting of lines, and no added facts, dates or numbers.",
      },
      {
        id: "clean",
        description:
          "Leaves out page numbers, repeated headers and footers, reference lines and personal details such as date of birth or marital status; text that is not a resume gives no read at all.",
      },
    ],
  },
  judgeInput: ({ input }) => input.text,
  judgeOutput: (output) => judgeText(output),
  estimate: ({ input }) => {
    const text = tokensOf(input.text);
    return {
      calls: 1,
      inputTokens: tokensOf(STRUCTURE_SYSTEM_PROMPT) + SCHEMA_TOKENS + text,
      outputTokens: Math.ceil(text * OUTPUT_PER_TEXT_TOKEN) + REASONING_TOKENS,
    };
  },
});
