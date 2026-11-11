import type { z } from "zod";
import type {
  FollowUpActionSchema,
  MarkNotificationsReadSchema,
  ReminderSettingsSchema,
} from "./validation";

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
export type MarkNotificationsReadBody = z.input<typeof MarkNotificationsReadSchema>;
export type MarkNotificationsReadResponse = { ok: true; unread: number };

// The account's reminder defaults: whether reminders are also emailed (off until turned on), and
// how many days after applying the first one comes.
export type ReminderSettings = { emailReminders: boolean; followUpDays: number };
export type ReminderSettingsBody = z.input<typeof ReminderSettingsSchema>;
export type ReminderSettingsResponse = {
  ok: true;
  emailAvailable: boolean;
  chosen: boolean;
} & ReminderSettings;

// POST /api/notifications/follow-up: Done or Snooze from a reminder email's signed link. No
// session: the mail is opened anywhere, so the link's signature is the only proof.
export const FOLLOW_UP_ACTIONS = ["done", "snooze"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];
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
