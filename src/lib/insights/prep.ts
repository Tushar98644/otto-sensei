import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import { ResumeSchema } from "@/lib/resume/validation";
import { FocusChoiceSchema, PREP_LEVELS, ROLE_FOCUSES, TECHNICAL_KINDS } from "./prep-focus";
import { DEFAULT_ROUND, PREP_ROUNDS } from "./prep-rounds";

export { byRound, DEFAULT_ROUND, PREP_ROUNDS, type PrepRound } from "./prep-rounds";

export const PREP_LIMITS = {
  questions: 8,
  stories: 4,
  asks: 5,
  points: 4,
  questionChars: 220,
  checkingChars: 220,
  followUpChars: 160,
  pointChars: 160,
  titleChars: 100,
  lineChars: 1_000,
  placeChars: 300,
  partChars: 400,
  jobFieldChars: 200,
  technical: 12,
  technicalQuestionChars: 320,
  topicChars: 60,
  assumeChars: 240,
  covers: 6,
  coverChars: 200,
  pitfalls: 3,
  pitfallChars: 160,
  probes: 2,
} as const;

const text = (max: number) => z.string().max(max);

export const PrepQuestionSchema = z.object({
  round: z.enum(PREP_ROUNDS),
  question: text(PREP_LIMITS.questionChars),
  checking: text(PREP_LIMITS.checkingChars),
  followUp: text(PREP_LIMITS.followUpChars),
  points: z.array(text(PREP_LIMITS.pointChars)).max(PREP_LIMITS.points),
  story: z
    .number()
    .int()
    .min(0)
    .max(PREP_LIMITS.stories - 1)
    .nullable(),
});

export const StarStorySchema = z.object({
  title: text(PREP_LIMITS.titleChars),
  line: text(PREP_LIMITS.lineChars),
  place: text(PREP_LIMITS.placeChars),
  situation: text(PREP_LIMITS.partChars),
  task: text(PREP_LIMITS.partChars),
  action: text(PREP_LIMITS.partChars),
  result: text(PREP_LIMITS.partChars),
});

// Covers, pitfalls and probes are general know-how; only `resume` and the deep-dive question speak about the person.
export const TechnicalQuestionSchema = z.object({
  kind: z.enum(TECHNICAL_KINDS),
  topic: text(PREP_LIMITS.topicChars),
  question: text(PREP_LIMITS.technicalQuestionChars),
  assume: text(PREP_LIMITS.assumeChars),
  covers: z.array(text(PREP_LIMITS.coverChars)).max(PREP_LIMITS.covers),
  pitfalls: z.array(text(PREP_LIMITS.pitfallChars)).max(PREP_LIMITS.pitfalls),
  probes: z.array(text(PREP_LIMITS.followUpChars)).max(PREP_LIMITS.probes),
  resume: z
    .object({ line: text(PREP_LIMITS.lineChars), place: text(PREP_LIMITS.placeChars) })
    .nullable(),
});

export const TechnicalSectionSchema = z.object({
  focus: z.enum(ROLE_FOCUSES),
  level: z.enum(PREP_LEVELS),
  coding: z.boolean(),
  questions: z.array(TechnicalQuestionSchema).max(PREP_LIMITS.technical),
});

const JobSchema = z.object({
  title: text(PREP_LIMITS.jobFieldChars),
  company: text(PREP_LIMITS.jobFieldChars),
});
const AsksSchema = z.array(text(PREP_LIMITS.questionChars)).max(PREP_LIMITS.asks);

const PackFields = {
  job: JobSchema,
  questions: z.array(PrepQuestionSchema).max(PREP_LIMITS.questions),
  stories: z.array(StarStorySchema).max(PREP_LIMITS.stories),
  asks: AsksSchema,
  createdAt: z.number().int(),
  demo: z.boolean(),
};

function storiesExist(
  prep: { questions: readonly PrepQuestion[]; stories: readonly unknown[] },
  ctx: z.RefinementCtx,
) {
  prep.questions.forEach((item, index) => {
    if (item.story !== null && item.story >= prep.stories.length) {
      ctx.addIssue({
        code: "custom",
        message: "No such story",
        path: ["questions", index, "story"],
      });
    }
  });
}

export const InterviewPrepSchema = z
  .object({ version: z.literal(3), ...PackFields, technical: TechnicalSectionSchema.nullable() })
  .superRefine(storiesExist);

const InterviewPrepV2Schema = z
  .object({ version: z.literal(2), ...PackFields })
  .superRefine(storiesExist);

const InterviewPrepV1Schema = z.object({
  version: z.literal(1),
  job: JobSchema,
  questions: z
    .array(
      z.object({ question: text(PREP_LIMITS.questionChars), why: text(PREP_LIMITS.checkingChars) }),
    )
    .max(PREP_LIMITS.questions),
  stories: z.array(StarStorySchema).max(PREP_LIMITS.stories),
  asks: AsksSchema,
  createdAt: z.number().int(),
  demo: z.boolean(),
});

export type PrepQuestion = z.infer<typeof PrepQuestionSchema>;
export type StarStory = z.infer<typeof StarStorySchema>;
export type TechnicalQuestion = z.infer<typeof TechnicalQuestionSchema>;
export type TechnicalSection = z.infer<typeof TechnicalSectionSchema>;
export type InterviewPrep = z.infer<typeof InterviewPrepSchema>;

// Packs saved before version 3 have no technical section; version 1 also lacks rounds and notes.
export function readPrep(value: unknown): InterviewPrep | null {
  if (value === null || value === undefined) return null;
  const parsed = InterviewPrepSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const v2 = InterviewPrepV2Schema.safeParse(value);
  if (v2.success) return { ...v2.data, version: 3, technical: null };
  const old = InterviewPrepV1Schema.safeParse(value);
  if (!old.success) return null;
  return {
    ...old.data,
    version: 3,
    questions: old.data.questions.map(({ question, why }) => ({
      round: DEFAULT_ROUND,
      question,
      checking: why,
      followUp: "",
      points: [],
      story: null,
    })),
    technical: null,
  };
}

export function questionCount(prep: Pick<InterviewPrep, "questions" | "technical">): number {
  return prep.questions.length + (prep.technical?.questions.length ?? 0);
}

export const InterviewRequestSchema = z.object({
  applicationId: ApplicationIdSchema,
  resume: ResumeSchema,
  job: z.object({
    text: z.string().trim().min(80).max(TEXT_LIMITS.jobPostChars),
    title: z.string().trim().max(PREP_LIMITS.jobFieldChars).default(""),
    company: z.string().trim().max(PREP_LIMITS.jobFieldChars).default(""),
  }),
  focus: FocusChoiceSchema.default({ role: "auto", level: "auto" }),
});
export type InterviewRequestBody = z.input<typeof InterviewRequestSchema>;

export type InterviewResult = { prep: InterviewPrep; saved: boolean };

export type PrepSummary = {
  applicationId: string;
  company: string;
  role: string;
  jobUrl: string;
  resumeTitle: string;
  createdAt: number;
  questions: number;
  stories: number;
  demo: boolean;
};

export const PREP_LIST_LIMIT = 200;

export type PrepTarget = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  resumeId: string | null;
  resumeTitle: string;
};
