import type { z } from "zod";
import type {
  EmailChoicesSchema,
  FollowUpActionSchema,
  MarkNotificationsReadSchema,
  ReminderSettingsSchema,
} from "./validation";

export const NOTIFICATION_KINDS = ["application_follow_up", "trial_ending"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_LIMITS = {
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

export type NotificationsResponse = { ok: true; notifications: Notification[]; unread: number };
export type MarkNotificationsReadBody = z.input<typeof MarkNotificationsReadSchema>;
export type MarkNotificationsReadResponse = { ok: true; unread: number };

export type ReminderSettings = { emailReminders: boolean; followUpDays: number };
export type ReminderSettingsBody = z.input<typeof ReminderSettingsSchema>;
export type ReminderSettingsResponse = {
  ok: true;
  emailAvailable: boolean;
  chosen: boolean;
} & ReminderSettings;

// Each list has its own signed unsubscribe link: follow-up reminders, the weekly jobs email, and tips.
export const EMAIL_LISTS = ["reminders", "jobs", "tips"] as const;
export type EmailList = (typeof EMAIL_LISTS)[number];

export const TIP_EMAIL_KINDS = ["no_resume", "fixes_back", "trial_ended", "win_back"] as const;
export type TipEmailKind = (typeof TIP_EMAIL_KINDS)[number];

export type EmailChoices = { jobEmails: boolean; tipEmails: boolean; jobPromptClosed: boolean };
export type EmailChoicesBody = z.input<typeof EmailChoicesSchema>;
export type EmailChoicesResponse = { ok: true; emailAvailable: boolean } & EmailChoices;

export const FOLLOW_UP_ACTIONS = ["done", "snooze"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];
export type FollowUpActionBody = z.input<typeof FollowUpActionSchema>;
export type FollowUpActionResponse = {
  ok: true;
  company: string;
  followUpAt: number | null;
};

export function isInAppPath(value: string): boolean {
  return /^\/[^/\\]/.test(value);
}
