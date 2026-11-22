import { AI_INTERVIEW_MAX_PRICE, AI_MAX_PRICE } from "@/lib/ai/client";
import { INTERVIEW_TECHNICAL_ROLE_PROMPT, prepareInterview } from "@/lib/ai/interview";
import { TECHNICAL_SYSTEM_PROMPT } from "@/lib/ai/interview-technical";
import { aiEnabled } from "@/lib/env";
import { AI_TELLS, matchesSchema, noBannedPhrases } from "@/lib/evals/graders";
import {
  InterviewPrepSchema,
  InterviewRequestSchema,
  type InterviewPrep,
  type InterviewRequestBody,
} from "@/lib/insights/prep";
import { focusLine, prepToText } from "@/lib/insights/prep-view";
import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { tokensOf } from "../cost";
import { defineSuite } from "../suite";
import { INTERVIEW_CASES, type InterviewCase, type InterviewExpect } from "./interview/cases";
import * as check from "./interview/graders";

// The JSON schemas sent as response_format, on top of each prompt.
const SCHEMA_TOKENS = 500;
const PLAN_TOKENS = 450;
// About 2,000 for the general rounds and stories with low-effort reasoning, billed as output.
const GENERAL_OUTPUT_TOKENS = 3_000;
// About 4,000 for 8 to 12 technical questions plus medium-effort reasoning.
const TECHNICAL_OUTPUT_TOKENS = 7_000;
// The estimate is priced at the model under test, so the technical call is scaled up to its own price cap.
const PROMPT_SCALE = AI_INTERVIEW_MAX_PRICE.prompt / AI_MAX_PRICE.prompt;
const COMPLETION_SCALE = AI_INTERVIEW_MAX_PRICE.completion / AI_MAX_PRICE.completion;

function judgeInput({ input }: InterviewCase): string {
  return [
    "RESUME",
    resumeToText(input.resume as Resume),
    "",
    "JOB POST",
    input.job.title && `Title given: ${input.job.title}`,
    input.job.company && `Company given: ${input.job.company}`,
    input.job.text,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function judgeOutput(output: InterviewPrep, { input }: InterviewCase): string {
  const focus = output.technical
    ? `Technical round focus: ${focusLine(output.technical)}`
    : "No technical round";
  return [
    focus,
    "",
    prepToText(output, { company: input.job.company ?? "", role: input.job.title ?? "" }),
  ].join("\n");
}

export const interviewSuite = defineSuite<InterviewRequestBody, InterviewPrep, InterviewExpect>({
  name: "interview",
  description:
    "Interview prep for technical roles (prepareInterview, as /api/interview calls it): the general rounds on the model under test, and the technical round on AI_INTERVIEW_MODEL.",
  inputSchema: InterviewRequestSchema,
  cases: INTERVIEW_CASES,
  run: async (kase) => {
    if (!aiEnabled()) {
      throw new Error(
        "OPENROUTER_API_KEY is not set, so prepareInterview would return its demo pack",
      );
    }
    const { resume, job, focus } = InterviewRequestSchema.parse(kase.input);
    return prepareInterview(
      resume,
      { jobText: job.text, jobTitle: job.title, company: job.company },
      { focus },
    );
  },
  graders: [
    (output) => matchesSchema(InterviewPrepSchema, output),
    check.focusAndLevel,
    check.technicalCount,
    check.questionShape,
    check.oneDesign,
    check.codingWhenSignalled,
    check.topicCoverage,
    check.deepDiveGrounding,
    check.noInventedPersonFacts,
    check.seniorityFit,
    check.generalRounds,
    (output) => noBannedPhrases(check.technicalTexts(output), AI_TELLS, "ai-tells"),
  ],
  rubric: {
    task: "Prepare one person for a technical interview: short general rounds, then 8 to 12 technical questions for this role and level, built from their own resume lines and the job post, each with what a strong answer covers, common pitfalls and two follow-up probes.",
    criteria: [
      {
        id: "technical_depth",
        description:
          "The technical questions are the ones a strong interviewer for this exact role asks: concrete scenarios, not high-level overviews, and the covers name the real concepts, trade-offs and failure modes (for an AI engineer: retrieval, evals, prompt and semantic caching, cost and latency).",
      },
      {
        id: "role_fit",
        description:
          "The topics match the role and what the post stresses most, the design question is framed around this company's product, and coding warm-ups appear only when the post names a coding round.",
      },
      {
        id: "seniority_fit",
        description:
          "The depth matches the level: juniors explain and apply, mid-level choose and debug, seniors weigh trade-offs and failure modes, staff set direction across teams; the design scale is stated as an assumption.",
      },
      {
        id: "grounding",
        description:
          "Each project deep-dive opens from a real resume line and asks the hard question about it; nothing about the person (employer, title, date, number, result, tool) is invented, and general know-how is written as guidance, not as their history.",
      },
      {
        id: "useful_prep",
        description:
          "A candidate could rehearse with this and walk in better prepared: the pitfalls are the real mistakes people make, and the probes are the follow-ups interviewers really ask.",
      },
    ],
  },
  judgeInput,
  judgeOutput,
  estimate: ({ input }) => {
    const resume = tokensOf(resumeToText(input.resume as Resume));
    const shared = SCHEMA_TOKENS + 2 * resume + tokensOf(input.job.text);
    return {
      calls: 2,
      inputTokens: Math.ceil(
        tokensOf(INTERVIEW_TECHNICAL_ROLE_PROMPT) +
          shared +
          PROMPT_SCALE * (tokensOf(TECHNICAL_SYSTEM_PROMPT) + shared + PLAN_TOKENS),
      ),
      outputTokens: Math.ceil(GENERAL_OUTPUT_TOKENS + COMPLETION_SCALE * TECHNICAL_OUTPUT_TOKENS),
    };
  },
});
