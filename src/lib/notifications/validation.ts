import { z } from "zod";
import { FOLLOW_UP_DAYS } from "@/lib/applications/follow-up";
import { FOLLOW_UP_ACTIONS, NOTIFICATION_LIMITS } from "./types";

export const MarkNotificationsReadSchema = z.union([
  z.object({ ids: z.array(z.uuid()).min(1).max(NOTIFICATION_LIMITS.markRead) }),
  z.object({ all: z.literal(true) }),
]);

export const ReminderSettingsSchema = z
  .object({
    emailReminders: z.boolean().optional(),
    followUpDays: z.number().int().min(FOLLOW_UP_DAYS.min).max(FOLLOW_UP_DAYS.max).optional(),
  })
  .refine(
    (body) => body.emailReminders !== undefined || body.followUpDays !== undefined,
    "Nothing to change.",
  );

export const EmailChoicesSchema = z
  .object({
    jobEmails: z.boolean().optional(),
    tipEmails: z.boolean().optional(),
    jobPromptClosed: z.literal(true).optional(),
  })
  .refine(
    (body) => body.jobEmails !== undefined || body.tipEmails !== undefined || body.jobPromptClosed,
    "Nothing to change.",
  );

export const FollowUpActionSchema = z.object({
  u: z.uuid(),
  a: z.uuid(),
  act: z.enum(FOLLOW_UP_ACTIONS),
  t: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

// From the bell, signed in: strict, so a signed body with a bad token can never fall through to it.
export const SessionFollowUpActionSchema = z.strictObject({
  a: z.uuid(),
  act: z.enum(FOLLOW_UP_ACTIONS),
});

export const FollowUpRequestSchema = z.union([FollowUpActionSchema, SessionFollowUpActionSchema]);
