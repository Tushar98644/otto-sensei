import { z } from "zod";
import { FOLLOW_UP_DAYS } from "@/lib/applications/follow-up";
import { FOLLOW_UP_ACTIONS, NOTIFICATION_LIMITS } from "./types";

// Request schemas for the notification routes (zod), apart from ./types so the bell doesn't load
// zod.

// PATCH /api/notifications: mark these ids, or everything, as read.
export const MarkNotificationsReadSchema = z.union([
  z.object({ ids: z.array(z.uuid()).min(1).max(NOTIFICATION_LIMITS.markRead) }),
  z.object({ all: z.literal(true) }),
]);

// GET/PUT /api/notifications/settings. Requires sign-in. PUT changes only the fields it sends.
// emailAvailable is false when this server can't send email (no Resend key), so the page doesn't
// offer a switch that does nothing. chosen: the account has saved a setting (always true after a
// PUT); false means it is still on the defaults it never looked at.
export const ReminderSettingsSchema = z
  .object({
    emailReminders: z.boolean().optional(),
    followUpDays: z.number().int().min(FOLLOW_UP_DAYS.min).max(FOLLOW_UP_DAYS.max).optional(),
  })
  .refine(
    (body) => body.emailReminders !== undefined || body.followUpDays !== undefined,
    "Nothing to change.",
  );

export const FollowUpActionSchema = z.object({
  u: z.uuid(),
  a: z.uuid(),
  act: z.enum(FOLLOW_UP_ACTIONS),
  t: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
