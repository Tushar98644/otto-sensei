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
  questionChars: 220,
  whyChars: 220,
  titleChars: 100,
  // A resume line's own cap (BulletSchema).
  lineChars: 1_000,
  placeChars: 300,
  partChars: 400,
  jobFieldChars: 200,
} as const;

const text = (max: number) => z.string().max(max);

export const PrepQuestionSchema = z.object({
  question: text(PREP_LIMITS.questionChars),
  // What in the job post makes the question likely: "The post lists SQL as a must-have."
  why: text(PREP_LIMITS.whyChars),
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

export const InterviewPrepSchema = z.object({
  version: z.literal(1),
  job: z.object({ title: text(PREP_LIMITS.jobFieldChars), company: text(PREP_LIMITS.jobFieldChars) }),
  questions: z.array(PrepQuestionSchema).max(PREP_LIMITS.questions),
  stories: z.array(StarStorySchema).max(PREP_LIMITS.stories),
  // Good questions for the person to ask the interviewer.
  asks: z.array(text(PREP_LIMITS.questionChars)).max(PREP_LIMITS.asks),
  createdAt: z.number().int(),
  // Made without an AI key: sample output the page must label as such.
  demo: z.boolean(),
});

export type PrepQuestion = z.infer<typeof PrepQuestionSchema>;
export type StarStory = z.infer<typeof StarStorySchema>;
export type InterviewPrep = z.infer<typeof InterviewPrepSchema>;

/** A stored pack, or null when the row has none or holds something this build can't read. */
export function readPrep(value: unknown): InterviewPrep | null {
  if (value === null || value === undefined) return null;
  const parsed = InterviewPrepSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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
