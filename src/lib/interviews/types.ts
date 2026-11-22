import { z } from "zod";
import type { Application } from "@/lib/applications/schema";
import { INTERVIEW_OUTCOMES } from "@/lib/notifications/types";

export const InterviewOutcomeSchema = z.strictObject({ outcome: z.enum(INTERVIEW_OUTCOMES) });
export type InterviewOutcomeBody = z.input<typeof InterviewOutcomeSchema>;
export type InterviewOutcomeResponse = { ok: true; application: Application };
