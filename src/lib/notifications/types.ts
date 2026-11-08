import { z } from "zod";
import { FOLLOW_UP_DAYS } from "@/lib/applications/follow-up";

// Client-safe contract for in-app notifications and the reminder email setting.

export const NOTIFICATION_KINDS = ["application_follow_up"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_LIMITS = {
  // Newest shown in the bell. Older ones are still counted as unread until opened or pruned.
  listed: 30,
  // Ids one PATCH may mark read.
  markRead: 100,
  title: 200,
  body: 1_000,
} as const;

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  // An in-app path, or null.
  link: string | null;
  // Epoch ms; null while unread.
  readAt: number | null;
  createdAt: number;
};

// GET /api/notifications. Requires sign-in. Newest first; unread counts every unread one, not just
// the listed page.
export type NotificationsResponse = { ok: true; notifications: Notification[]; unread: number };

// PATCH /api/notifications: mark these ids, or everything, as read.
export const MarkNotificationsReadSchema = z.union([
  z.object({ ids: z.array(z.uuid()).min(1).max(NOTIFICATION_LIMITS.markRead) }),
  z.object({ all: z.literal(true) }),
]);
export type MarkNotificationsReadBody = z.input<typeof MarkNotificationsReadSchema>;
export type MarkNotificationsReadResponse = { ok: true; unread: number };

// The account's reminder defaults: whether reminders are also emailed (off until turned on), and
// how many days after applying the first one comes.
export type ReminderSettings = { emailReminders: boolean; followUpDays: number };

// GET/PUT /api/notifications/settings. Requires sign-in. PUT changes only the fields it sends.
// emailAvailable is false when this server can't send email (no Resend key), so the page doesn't
// offer a switch that does nothing.
export const ReminderSettingsSchema = z
  .object({
    emailReminders: z.boolean().optional(),
    followUpDays: z
      .number()
      .int()
      .min(FOLLOW_UP_DAYS.min)
      .max(FOLLOW_UP_DAYS.max)
      .optional(),
  })
  .refine(
    (body) => body.emailReminders !== undefined || body.followUpDays !== undefined,
    "Nothing to change.",
  );
export type ReminderSettingsBody = z.input<typeof ReminderSettingsSchema>;
export type ReminderSettingsResponse = { ok: true; emailAvailable: boolean } & ReminderSettings;

// POST /api/notifications/follow-up: Done or Snooze from a reminder email's signed link. No
// session: the mail is opened anywhere, so the link's signature is the only proof.
export const FOLLOW_UP_ACTIONS = ["done", "snooze"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];
export const FollowUpActionSchema = z.object({
  u: z.uuid(),
  a: z.uuid(),
  act: z.enum(FOLLOW_UP_ACTIONS),
  t: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export type FollowUpActionBody = z.input<typeof FollowUpActionSchema>;
// What the email's page says afterwards: the company, and the new date after a snooze.
export type FollowUpActionResponse = {
  ok: true;
  company: string;
  followUpAt: number | null;
};

// Only same-site paths are ever stored or followed, never a full URL or a protocol-relative one.
export function isInAppPath(value: string): boolean {
  return /^\/[^/\\]/.test(value);
}
