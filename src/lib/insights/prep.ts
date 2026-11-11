import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import { ResumeSchema } from "@/lib/resume/validation";

// A stored pack is parsed again on read, so a bad row shows as "no pack yet" instead of breaking.

export const PREP_LIMITS = {
  questions: 8,
  stories: 4,
  asks: 5,
  points: 4,
  questionChars: 220,
  // v1's `why` had the same cap, so every v1 pack reads as v2 whole.
  checkingChars: 220,
  followUpChars: 160,
  pointChars: 160,
  titleChars: 100,
  lineChars: 1_000,
  placeChars: 300,
  partChars: 400,
  jobFieldChars: 200,
} as const;

// In the order they happen; a pack lists its questions in this order.
export const PREP_ROUNDS = ["opening", "fit", "skills", "behavioural", "closing"] as const;
export type PrepRound = (typeof PREP_ROUNDS)[number];

// v1 questions carry no round; this is the round they're shown under.
export const DEFAULT_ROUND: PrepRound = "fit";

const text = (max: number) => z.string().max(max);

export const PrepQuestionSchema = z.object({
  round: z.enum(PREP_ROUNDS),
  question: text(PREP_LIMITS.questionChars),
  // e.g. "Whether you can find what's slow and prove the fix."
  checking: text(PREP_LIMITS.checkingChars),
  followUp: text(PREP_LIMITS.followUpChars),
  // Only from the resume and the job post, with [blanks] for the rest.
  points: z.array(text(PREP_LIMITS.pointChars)).max(PREP_LIMITS.points),
  story: z.number().int().min(0).max(PREP_LIMITS.stories - 1).nullable(),
});

// `line` is a real resume line, word for word; the four parts use only its facts, with [blanks].
export const StarStorySchema = z.object({
  title: text(PREP_LIMITS.titleChars),
  line: text(PREP_LIMITS.lineChars),
  place: text(PREP_LIMITS.placeChars),
  situation: text(PREP_LIMITS.partChars),
  task: text(PREP_LIMITS.partChars),
  action: text(PREP_LIMITS.partChars),
  result: text(PREP_LIMITS.partChars),
});

const JobSchema = z.object({
  title: text(PREP_LIMITS.jobFieldChars),
  company: text(PREP_LIMITS.jobFieldChars),
});
const AsksSchema = z.array(text(PREP_LIMITS.questionChars)).max(PREP_LIMITS.asks);

export const InterviewPrepSchema = z
  .object({
    version: z.literal(2),
    job: JobSchema,
    questions: z.array(PrepQuestionSchema).max(PREP_LIMITS.questions),
    stories: z.array(StarStorySchema).max(PREP_LIMITS.stories),
    asks: AsksSchema,
    createdAt: z.number().int(),
    // Made without an AI key: the page must label it as sample output.
    demo: z.boolean(),
  })
  .superRefine((prep, ctx) => {
    prep.questions.forEach((item, index) => {
      if (item.story !== null && item.story >= prep.stories.length) {
        ctx.addIssue({ code: "custom", message: "No such story", path: ["questions", index, "story"] });
      }
    });
  });

// Packs made before rounds. Read only: new packs are always v2.
const InterviewPrepV1Schema = z.object({
  version: z.literal(1),
  job: JobSchema,
  questions: z
    .array(z.object({ question: text(PREP_LIMITS.questionChars), why: text(PREP_LIMITS.checkingChars) }))
    .max(PREP_LIMITS.questions),
  stories: z.array(StarStorySchema).max(PREP_LIMITS.stories),
  asks: AsksSchema,
  createdAt: z.number().int(),
  demo: z.boolean(),
});

export type PrepQuestion = z.infer<typeof PrepQuestionSchema>;
export type StarStory = z.infer<typeof StarStorySchema>;
export type InterviewPrep = z.infer<typeof InterviewPrepSchema>;

export function byRound<T extends Pick<PrepQuestion, "round">>(questions: readonly T[]): T[] {
  return [...questions].sort((a, b) => PREP_ROUNDS.indexOf(a.round) - PREP_ROUNDS.indexOf(b.round));
}

// A v1 pack comes back as v2: `why` becomes `checking`, under the default round.
export function readPrep(value: unknown): InterviewPrep | null {
  if (value === null || value === undefined) return null;
  const parsed = InterviewPrepSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const old = InterviewPrepV1Schema.safeParse(value);
  if (!old.success) return null;
  return {
    ...old.data,
    version: 2,
    questions: old.data.questions.map(({ question, why }) => ({
      round: DEFAULT_ROUND,
      question,
      checking: why,
      followUp: "",
      points: [],
      story: null,
    })),
  };
}

// Shares the "letter" allowance with cover letters.
export const InterviewRequestSchema = z.object({
  applicationId: ApplicationIdSchema,
  resume: ResumeSchema,
  job: z.object({
    text: z.string().trim().min(80).max(TEXT_LIMITS.jobPostChars),
    title: z.string().trim().max(PREP_LIMITS.jobFieldChars).default(""),
    company: z.string().trim().max(PREP_LIMITS.jobFieldChars).default(""),
  }),
});
export type InterviewRequestBody = z.input<typeof InterviewRequestSchema>;

// saved: false when the application was deleted while the pack was being made; the person still
// gets the pack they were counted for.
export type InterviewResult = { prep: InterviewPrep; saved: boolean };

// Counts only, so the list stays small however many packs there are.
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
