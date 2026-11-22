import type { z } from "zod";
import type {
  FollowUpActionSchema,
  MarkNotificationsReadSchema,
  ReminderSettingsSchema,
  SessionFollowUpActionSchema,
} from "./validation";

export const NOTIFICATION_KINDS = [
  "application_follow_up",
  "trial_ending",
  "interview_soon",
  "share_viewed",
  "portfolio_views",
  "interview_after",
  "interview_today",
  "job_matches",
  "career_checkin",
  "weekly_recap",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// Someone opened a share link or the portfolio: counts and when, never who.
export const VIEW_KINDS = ["share_viewed", "portfolio_views"] as const satisfies NotificationKind[];

export function isViewKind(kind: NotificationKind): boolean {
  return (VIEW_KINDS as readonly NotificationKind[]).includes(kind);
}

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
  applicationId: string | null;
  // Only on the newest row about a follow-up that is still due, so Done and Snooze show once.
  followUpDue: boolean;
  // Only on the newest "How did it go?" row whose interview is still unanswered.
  outcomeOpen: boolean;
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
  // "Not now" on the reminders card, still resting (lib/notifications/prompts).
  promptSnoozed: boolean;
} & ReminderSettings;

// Each list has its own signed unsubscribe link: follow-up reminders, the weekly jobs email, tips and views (from emails already sent), and the career log check-in, the one email still sent.
export const EMAIL_LISTS = ["reminders", "jobs", "tips", "views", "career"] as const;
export type EmailList = (typeof EMAIL_LISTS)[number];

export const TIP_EMAIL_KINDS = ["no_resume", "fixes_back", "trial_ended", "win_back"] as const;
export type TipEmailKind = (typeof TIP_EMAIL_KINDS)[number];

// One-time service notices: every account gets each once, whatever its email choices.
export const NOTICE_EMAIL_KINDS = ["processor_notice"] as const;
export type NoticeEmailKind = (typeof NOTICE_EMAIL_KINDS)[number];

export const EMAIL_LOG_KINDS = [...TIP_EMAIL_KINDS, ...NOTICE_EMAIL_KINDS] as const;

export type EmailChoices = {
  jobEmails: boolean;
  tipEmails: boolean;
  viewEmails: boolean;
  jobPromptClosed: boolean;
  jobPromptSnoozed: boolean;
  viewPromptClosed: boolean;
  viewPromptSnoozed: boolean;
};

export const FOLLOW_UP_ACTIONS = ["done", "snooze"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];
export type FollowUpActionBody = z.input<typeof FollowUpActionSchema>;
export type SessionFollowUpActionBody = z.input<typeof SessionFollowUpActionSchema>;
export type FollowUpActionResponse = {
  ok: true;
  company: string;
  followUpAt: number | null;
};

// The one-tap answers to "How did it go?".
export const INTERVIEW_OUTCOMES = ["next_round", "waiting", "rejected"] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export function isInAppPath(value: string): boolean {
  return /^\/[^/\\]/.test(value);
}
