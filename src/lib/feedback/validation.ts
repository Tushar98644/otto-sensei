import { z } from "zod";
import { FEEDBACK_KINDS, FEEDBACK_LIMITS } from "./types";

// The POST /api/feedback body schema (zod), apart from ./types so the feedback dialog doesn't load
// zod.

// A path on this site only, like "/studio": never "//host" or a full URL. Query strings and hashes
// are left out by the sender, since they can carry ids that say more than the page does.
const PAGE_PATH = /^\/(?![/\\])[^\s?#]*$/;

export const FeedbackRequestSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z
    .string()
    .trim()
    .min(FEEDBACK_LIMITS.minChars, "Write a few more words.")
    .max(FEEDBACK_LIMITS.maxChars, `Keep it under ${FEEDBACK_LIMITS.maxChars} characters.`),
  // Added by the dialog, not typed by anyone, so a bad one is dropped instead of losing the note.
  pagePath: z.string().max(FEEDBACK_LIMITS.pathChars).regex(PAGE_PATH).optional().catch(undefined),
});
