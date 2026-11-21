import { matchCheck, type MatchCheck } from "@/lib/match-check/check";
import { countLine, matchHeadline, STATUS_LABELS } from "@/lib/match-check/copy";
import { matchCheckFromText } from "@/lib/match-check/from-text";
import { resumeToText } from "@/lib/resume/ops";
import { defineSuite } from "../suite";
import { CASES } from "./match-check/cases";
import {
  askLengthGrade,
  askNumbersGrade,
  asksFromPostGrade,
  asksGrade,
  countsGrade,
  evidenceLengthGrade,
  falseMissingGrade,
  importanceGrade,
  inventedRequirementsGrade,
  MatchInputSchema,
  matchStatusGrade,
  noExtraTermsGrade,
  quotesResumeGrade,
  requirementsFoundGrade,
  schemaGrade,
  type MatchExpect,
  type MatchInput,
} from "./match-check/graders";

// The same calls the app makes: the /job-match page reads pasted text, the studio's free check a saved resume.
function check(input: MatchInput): MatchCheck {
  return input.via === "page"
    ? matchCheckFromText(input.resume, input.job)
    : matchCheck(input.resume, input.job);
}

function judgeOutput(output: MatchCheck): string {
  const rows = output.rows.map((row) => {
    const rank = row.importance ? ` [${row.importance}]` : "";
    const where = row.where ? ` (${row.where.place}: "${row.where.text}")` : "";
    return `- ${row.term}${rank}: ${STATUS_LABELS[row.status]}${where}`;
  });
  return [
    matchHeadline(output),
    countLine("Must-haves", output.must),
    countLine("Nice-to-haves", output.nice),
    ...rows,
    `Asks: ${output.asks.join(" | ") || "(none)"}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export const matchCheckSuite = defineSuite<MatchInput, MatchCheck, MatchExpect>({
  name: "match-check",
  description:
    "Word-for-word resume vs job check (/job-match page and the studio's free check). It makes no AI call, so every model gets the same result and only the judge costs anything.",
  inputSchema: MatchInputSchema,
  cases: CASES,
  run: async ({ input }) => check(input),
  graders: [
    schemaGrade,
    countsGrade,
    requirementsFoundGrade,
    matchStatusGrade,
    importanceGrade,
    noExtraTermsGrade,
    inventedRequirementsGrade,
    quotesResumeGrade,
    falseMissingGrade,
    asksGrade,
    askNumbersGrade,
    asksFromPostGrade,
    askLengthGrade,
    evidenceLengthGrade,
  ],
  rubric: {
    task: "Compare a resume with a job post word for word: list the skills, tools, certifications and languages the post asks for, mark each as used in a resume line, only listed, or not found, and quote the resume line.",
    criteria: [
      {
        id: "correct_status",
        description:
          "Each skill's status matches the resume's actual words: in a line only when a line shows it in use, listed when only a skills list names it, not found when the resume never names it; each quote really contains it.",
      },
      {
        id: "no_invented_requirements",
        description:
          "Every skill listed is one the post asks the candidate for, not one from the company intro, the benefits, the company's name, or plain words like go, excel or swift.",
      },
      {
        id: "coverage",
        description:
          "Lists the skills, tools, certifications and languages the post names, without leaving out obvious ones.",
      },
      {
        id: "importance",
        description:
          "Must-have and nice-to-have follow the post's own headings and wording, unranked skills are ones the post doesn't rank, and the asks quote the post's years or degree lines.",
      },
    ],
  },
  judgeInput: ({ input }) =>
    [
      `JOB POST\n${input.job}`,
      input.via === "page"
        ? `RESUME (pasted text)\n${input.resume}`
        : `RESUME (the parts the studio shows)\n${resumeToText(input.resume)}`,
    ].join("\n\n"),
  judgeOutput,
  estimate: () => ({ calls: 0, inputTokens: 0, outputTokens: 0 }),
});
