import type { z } from "zod";
import type {
  FollowUpActionSchema,
  MarkNotificationsReadSchema,
  ReminderSettingsSchema,
} from "./validation";

export const NOTIFICATION_KINDS = ["application_follow_up"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_LIMITS = {
  // Older ones still count as unread until opened or pruned.
  listed: 30,
  markRead: 100,
  title: 200,
  body: 1_000,
} as const;

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  readAt: number | null;
  createdAt: number;
};

// unread counts every unread one, not just the listed page.
export type NotificationsResponse = { ok: true; notifications: Notification[]; unread: number };
export type MarkNotificationsReadBody = z.input<typeof MarkNotificationsReadSchema>;
export type MarkNotificationsReadResponse = { ok: true; unread: number };

// Emails are off until turned on.
export type ReminderSettings = { emailReminders: boolean; followUpDays: number };
export type ReminderSettingsBody = z.input<typeof ReminderSettingsSchema>;
export type ReminderSettingsResponse = {
  ok: true;
  emailAvailable: boolean;
  chosen: boolean;
} & ReminderSettings;

// No session: the mail is opened anywhere, so the link's signature is the only proof.
export const FOLLOW_UP_ACTIONS = ["done", "snooze"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];
export type FollowUpActionBody = z.input<typeof FollowUpActionSchema>;
export type FollowUpActionResponse = {
  ok: true;
  company: string;
  followUpAt: number | null;
};

// Never a full or protocol-relative URL.
export function isInAppPath(value: string): boolean {
  return /^\/[^/\\]/.test(value);
}
