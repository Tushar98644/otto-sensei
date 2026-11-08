import { z } from "zod";

// Client-safe. "Send feedback": one short note, its kind, and the page it was sent from.

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

// Short enough for three segments side by side on a 360px phone.
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Problem",
  idea: "Idea",
  other: "Other",
};

export const FEEDBACK_LIMITS = { minChars: 5, maxChars: 2_000, pathChars: 300 } as const;

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

export type FeedbackRequestBody = z.input<typeof FeedbackRequestSchema>;
export type FeedbackInput = z.output<typeof FeedbackRequestSchema>;
