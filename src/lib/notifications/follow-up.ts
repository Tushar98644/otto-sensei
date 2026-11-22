import { ROUTES } from "@/components/site/routes";
import { applicationHref } from "@/lib/applications/thread";
import { DAY_MS } from "@/lib/time";
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

const count = new Intl.NumberFormat("en-US");

export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function oldestFirst(list: readonly DueApplication[]): DueApplication[] {
  return [...list].sort((a, b) => a.appliedAt - b.appliedAt);
}

export function followUpMessage(list: readonly DueApplication[], now: number): string {
  const due = oldestFirst(list);
  const names = [...new Set(due.map((item) => clip(item.company, NAME_CHARS)).filter(Boolean))];
  const [only] = due;
  if (due.length === 1 && only) {
    const interviewed = only.interviewedAt ?? null;
    const days = Math.max(1, Math.floor((now - (interviewed ?? only.appliedAt)) / DAY_MS));
    const ago = `${count.format(days)} ${days === 1 ? "day" : "days"}`;
    if (interviewed !== null) {
      const name = names[0] ? ` with ${names[0]}` : "";
      return `It's been ${ago} since your interview${name}. A short note keeps you in mind.`;
    }
    return `It's been ${ago} since you applied to ${names[0] ?? "that company"}. A short follow-up can help.`;
  }
  const shown = names.slice(0, 2);
  const rest = due.length - shown.length;
  const who =
    shown.length === 0
      ? `${count.format(due.length)} applications`
      : rest > 0
        ? `${shown.join(", ")} and ${count.format(rest)} more`
        : shown.join(" and ");
  return `${who} are ready for a follow-up. A short note can help.`;
}

export function followUpNotice(list: readonly DueApplication[], now: number): FollowUpNotice {
  const due = oldestFirst(list).map((item) => ({
    ...item,
    company: clip(item.company, NAME_CHARS),
  }));
  const only = due.length === 1 ? due[0] : undefined;
  const title = only
    ? only.company
      ? `Time to follow up with ${only.company}?`
      : "Time to follow up?"
    : `${count.format(due.length)} applications are ready for a follow-up`;
  return {
    title: clip(title, NOTIFICATION_LIMITS.title),
    body: clip(followUpMessage(due, now), NOTIFICATION_LIMITS.body),
    link: only ? applicationHref(only.id) : ROUTES.dashboardApplications,
    applicationId: only?.id ?? null,
  };
}

export function followUpNotices(list: readonly DueApplication[], now: number): FollowUpNotice[] {
  const due = oldestFirst(list);
  if (due.length === 0) return [];
  return due.length <= FOLLOW_UP_ROWS
    ? due.map((item) => followUpNotice([item], now))
    : [followUpNotice(due, now)];
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
