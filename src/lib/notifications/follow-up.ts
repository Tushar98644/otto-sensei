import { ROUTES } from "@/components/site/routes";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import { applicationHref } from "@/lib/applications/thread";
import { DAY_MS } from "@/lib/time";
import { emailMessages } from "./locale";
import { NOTIFICATION_LIMITS } from "./types";

// Company names and roles are the user's own text: capped everywhere, and escaped in the emails that remain.

export type DueApplication = {
  id: string;
  company: string;
  role: string;
  appliedAt: number;
  // Set when the follow-up comes after an interview on that day.
  interviewedAt?: number | null;
};

export type FollowUpNotice = {
  title: string;
  body: string;
  link: string;
  applicationId: string | null;
};

export const NAME_CHARS = 80;
// Up to this many due in one run get a bell row each, with Done, Snooze and the writer; more share one row.
export const FOLLOW_UP_ROWS = 3;

export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function oldestFirst(list: readonly DueApplication[]): DueApplication[] {
  return [...list].sort((a, b) => a.appliedAt - b.appliedAt);
}

export function followUpMessage(
  list: readonly DueApplication[],
  now: number,
  locale: Locale,
): string {
  const t = emailMessages(locale).followUp;
  const format = formatFor(locale);
  const due = oldestFirst(list);
  const names = [...new Set(due.map((item) => clip(item.company, NAME_CHARS)).filter(Boolean))];
  const [only] = due;
  if (due.length === 1 && only) {
    const interviewed = only.interviewedAt ?? null;
    const days = Math.max(1, Math.floor((now - (interviewed ?? only.appliedAt)) / DAY_MS));
    const ago = format.plural(t.days, days);
    if (interviewed !== null) {
      return names[0]
        ? fmt(t.sinceInterview, { days: ago, company: names[0] })
        : fmt(t.sinceInterviewBlank, { days: ago });
    }
    return fmt(t.sinceApplied, { days: ago, company: names[0] ?? t.thatCompany });
  }
  const [first, second] = names;
  const rest = due.length - Math.min(names.length, 2);
  const who =
    first === undefined
      ? format.plural(t.applications, due.length)
      : rest > 0
        ? fmt(t.andMore, { names: names.slice(0, 2).join(", "), count: format.number(rest) })
        : second === undefined
          ? first
          : fmt(t.pair, { first, second });
  return fmt(t.many, { who });
}

export function followUpNotice(
  list: readonly DueApplication[],
  now: number,
  locale: Locale,
): FollowUpNotice {
  const t = emailMessages(locale).followUp;
  const due = oldestFirst(list).map((item) => ({
    ...item,
    company: clip(item.company, NAME_CHARS),
  }));
  const only = due.length === 1 ? due[0] : undefined;
  const title = only
    ? only.company
      ? fmt(t.title, { company: only.company })
      : t.titleBlank
    : formatFor(locale).plural(t.titleMany, due.length);
  return {
    title: clip(title, NOTIFICATION_LIMITS.title),
    body: clip(followUpMessage(due, now, locale), NOTIFICATION_LIMITS.body),
    link: only ? applicationHref(only.id) : ROUTES.dashboardApplications,
    applicationId: only?.id ?? null,
  };
}

export function followUpNotices(
  list: readonly DueApplication[],
  now: number,
  locale: Locale,
): FollowUpNotice[] {
  const due = oldestFirst(list);
  if (due.length === 0) return [];
  return due.length <= FOLLOW_UP_ROWS
    ? due.map((item) => followUpNotice([item], now, locale))
    : [followUpNotice(due, now, locale)];
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// PNG: email clients don't show inline SVG. Drawn at 2x (96px), shown at 48px.
export const OTTO_HEAD_EMAIL_PATH = "/email/otto-head.png";

export const INK = "#12241d";
export const MUTED = "#475850";
export const FOREST = "#0e3b2e";
export const RULE = "#dbe4de";
export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
