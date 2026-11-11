import { z } from "zod";
import { FEEDBACK_KINDS, FEEDBACK_LIMITS } from "./types";

const PAGE_PATH = /^\/(?![/\\])[^\s?#]*$/;

export const FeedbackRequestSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z
    .string()
    .trim()
    .min(FEEDBACK_LIMITS.minChars, "Write a few more words.")
    .max(FEEDBACK_LIMITS.maxChars, `Keep it under ${FEEDBACK_LIMITS.maxChars} characters.`),
  pagePath: z.string().max(FEEDBACK_LIMITS.pathChars).regex(PAGE_PATH).optional().catch(undefined),
});
