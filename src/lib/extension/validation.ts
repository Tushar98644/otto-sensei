import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { oneLine } from "@/lib/ai/text";
import { ResumeSchema } from "@/lib/resume/validation";
import { ANSWER_LIMITS, DEFAULT_HEARD_FROM, PAY_PERIODS, PLACE_KEY } from "./answers";
import { EXTENSION_LIMITS } from "./types";
import { JOB_SITES } from "./urls";

export const SavePostSchema = z.object({
  url: z.string().trim().min(1).max(EXTENSION_LIMITS.urlChars),
  site: z.enum(JOB_SITES).catch("other"),
  title: z
    .string()
    .max(EXTENSION_LIMITS.titleChars * 2)
    .default(""),
  company: z
    .string()
    .max(EXTENSION_LIMITS.companyChars * 2)
    .default(""),
  location: z
    .string()
    .max(EXTENSION_LIMITS.locationChars * 2)
    .default(""),
  // Longer posts are cut to the limit rather than refused: the start of a post says the most.
  text: z
    .string()
    .max(EXTENSION_LIMITS.postChars * 2)
    .default(""),
});

export const PostIdSchema = z.uuid();

export const ResumeIdSchema = ResumeSchema.shape.id;

const answerText = z.string().trim().max(ANSWER_LIMITS.textChars);

const PaySchema = z.object({
  amount: z.number().finite().min(0).max(ANSWER_LIMITS.maxAmount),
  currency: z.string().regex(/^[A-Z]{3}$/),
  period: z.enum(PAY_PERIODS),
});

const WorkRightsSchema = z
  .record(
    z.string().regex(PLACE_KEY),
    z.object({ authorized: z.boolean().nullable(), sponsorship: z.boolean().nullable() }),
  )
  .refine((rights) => Object.keys(rights).length <= ANSWER_LIMITS.places);

const question = z.string().trim().min(1).max(ANSWER_LIMITS.questionChars);
const answer = z.string().trim().max(ANSWER_LIMITS.answerChars);

// What is stored; a row that no longer reads falls back to nothing saved.
export const ApplyAnswersSchema = z.object({
  noticePeriod: answerText.default(""),
  currentPay: PaySchema.nullable().default(null),
  expectedPay: PaySchema.nullable().default(null),
  workRights: WorkRightsSchema.default({}),
  relocate: z.boolean().nullable().default(null),
  startDate: answerText.default(""),
  heardFrom: answerText.default(DEFAULT_HEARD_FROM),
  custom: z
    .array(z.object({ question, answer, at: z.number().int().min(0) }))
    .max(ANSWER_LIMITS.customAnswers)
    .default([]),
});

export const ApplyAnswersPatchSchema = z.object({
  noticePeriod: answerText.optional(),
  currentPay: PaySchema.nullable().optional(),
  expectedPay: PaySchema.nullable().optional(),
  workRights: WorkRightsSchema.optional(),
  relocate: z.boolean().nullable().optional(),
  startDate: answerText.optional(),
  heardFrom: answerText.optional(),
  custom: z.array(z.object({ question, answer })).max(ANSWER_LIMITS.customAnswers).optional(),
});

// Draft with Otto: the resume is read on the server, so the extension never holds the whole of it.
export const ExtensionAnswerSchema = z.object({
  resumeId: ResumeIdSchema,
  job: z.object({
    text: z.string().trim().min(EXTENSION_LIMITS.minPostChars).max(TEXT_LIMITS.jobPostChars),
    title: z.string().trim().max(EXTENSION_LIMITS.titleChars).default(""),
    company: z.string().trim().max(EXTENSION_LIMITS.companyChars).default(""),
  }),
  question: z.string().overwrite(oneLine).min(8).max(500),
  requestId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{16,100}$/)
    .optional(),
});

export const ExtensionApplicationSchema = z.object({
  id: z.uuid(),
  url: z.string().trim().min(1).max(EXTENSION_LIMITS.urlChars),
  title: z
    .string()
    .max(EXTENSION_LIMITS.titleChars * 2)
    .default(""),
  company: z
    .string()
    .max(EXTENSION_LIMITS.companyChars * 2)
    .default(""),
  resumeId: ResumeIdSchema.nullable().default(null),
});
