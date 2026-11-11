import type { z } from "zod";
import type { FeedbackRequestSchema } from "./validation";

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

// Short enough for three segments side by side on a 360px phone.
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Problem",
  idea: "Idea",
  other: "Other",
};

export const FEEDBACK_LIMITS = { minChars: 5, maxChars: 2_000, pathChars: 300 } as const;

export type FeedbackRequestBody = z.input<typeof FeedbackRequestSchema>;
export type FeedbackInput = z.output<typeof FeedbackRequestSchema>;
