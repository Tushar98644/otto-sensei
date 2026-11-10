import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { ApplicationIdSchema } from "@/lib/applications/schema";
import { ResumeSchema } from "@/lib/resume/schema";

// Client-safe. The interview prep pack for one application: what POST /api/interview returns and
// what the application row keeps (applications.prep). The caps bound a stored pack, and a stored
// pack is parsed again on read, so a bad row shows as "no pack yet" instead of breaking the page.

export const PREP_LIMITS = {
  questions: 8,
  stories: 4,
  asks: 5,
  points: 4,
  questionChars: 220,
  // v1's `why`, which `checking` replaces, had the same cap, so every v1 pack reads as v2 whole.
  checkingChars: 220,
  followUpChars: 160,
  pointChars: 160,
  titleChars: 100,
  // A resume line's own cap (BulletSchema).
  lineChars: 1_000,
  placeChars: 300,
  partChars: 400,
  jobFieldChars: 200,
} as const;

// The rounds of a typical interview, in the order they happen. A pack lists its questions in this
// order, so opening comes first and closing last.
export const PREP_ROUNDS = ["opening", "fit", "skills", "behavioural", "closing"] as const;
export type PrepRound = (typeof PREP_ROUNDS)[number];

// v1 questions carry no round; this is the round they're shown under.
export const DEFAULT_ROUND: PrepRound = "fit";

const text = (max: number) => z.string().max(max);

export const PrepQuestionSchema = z.object({
  round: z.enum(PREP_ROUNDS),
  // Worded the way an interviewer says it in the room: "Walk me through how you'd cut…".
  question: text(PREP_LIMITS.questionChars),
  // What the interviewer is really testing: "Whether you can find what's slow and prove the fix."
  checking: text(PREP_LIMITS.checkingChars),
  // The probe they usually add after the answer. Empty when there isn't an obvious one.
  followUp: text(PREP_LIMITS.followUpChars),
  // Answer pointers drawn only from the resume and the job post, with [blanks] for the rest.
  points: z.array(text(PREP_LIMITS.pointChars)).max(PREP_LIMITS.points),
  // Index into the pack's stories when one of them answers this question.
  story: z.number().int().min(0).max(PREP_LIMITS.stories - 1).nullable(),
});

// One STAR outline. `line` is a real resume line, word for word, and `place` is where it sits; the
// four parts use that line's facts only, with [blanks] for what only the person knows.
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
// Good questions for the person to ask the interviewer.
const AsksSchema = z.array(text(PREP_LIMITS.questionChars)).max(PREP_LIMITS.asks);

export const InterviewPrepSchema = z
  .object({
    version: z.literal(2),
    job: JobSchema,
    questions: z.array(PrepQuestionSchema).max(PREP_LIMITS.questions),
    stories: z.array(StarStorySchema).max(PREP_LIMITS.stories),
    asks: AsksSchema,
    createdAt: z.number().int(),
    // Made without an AI key: sample output the page must label as such.
    demo: z.boolean(),
  })
  .superRefine((prep, ctx) => {
    prep.questions.forEach((item, index) => {
      if (item.story !== null && item.story >= prep.stories.length) {
        ctx.addIssue({ code: "custom", message: "No such story", path: ["questions", index, "story"] });
      }
    });
  });

// Packs made before rounds (2026-11-08 to 2026-11-09). Read only: new packs are always v2.
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

/** Questions in interview order: by round, keeping the given order within a round. */
export function byRound<T extends Pick<PrepQuestion, "round">>(questions: readonly T[]): T[] {
  return [...questions].sort((a, b) => PREP_ROUNDS.indexOf(a.round) - PREP_ROUNDS.indexOf(b.round));
}

/**
 * A stored pack, or null when the row has none or holds something this build can't read. A v1 pack
 * comes back as v2: its `why` becomes `checking`, under the default round, with no extras.
 */
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

// POST /api/interview. Requires sign-in; shares the "letter" allowance with cover letters.
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

// saved: false when the application was deleted (or another account's) while the pack was being
// made. The person still gets the pack they were counted for.
export type InterviewResult = { prep: InterviewPrep; saved: boolean };

// GET /api/interview: one line per application with a saved pack, newest pack first. Counts only,
// so the list stays small however many packs there are.
export type PrepSummary = {
  applicationId: string;
  company: string;
  role: string;
  jobUrl: string;
  resumeTitle: string;
  // When the pack was made.
  createdAt: number;
  questions: number;
  stories: number;
  demo: boolean;
};

export const PREP_LIST_LIMIT = 200;

// GET /api/interview/:applicationId: the job details the prep page needs, not the whole row.
export type PrepTarget = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  resumeId: string | null;
  resumeTitle: string;
};
