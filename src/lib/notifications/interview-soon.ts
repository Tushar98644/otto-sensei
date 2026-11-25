import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import { DAY_MS } from "@/lib/time";
import { clip, NAME_CHARS } from "./follow-up";
import { interviewPrepPath } from "./links";
import { emailMessages } from "./locale";
import { zoneOf } from "./trial-ending";
import { NOTIFICATION_LIMITS } from "./types";

export type InterviewSoon = { id: string; company: string; role: string; interviewAt: number };

export type InterviewSoonNotice = {
  title: string;
  body: string;
  link: string;
  applicationId: string;
};

function dayKey(at: number, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zone,
  }).format(at);
}

// The board saves the day as local noon, so it lands on that day in the person's own zone.
export function interviewDay(
  interviewAt: number,
  now: number,
  timeZone: string | null,
  locale: Locale,
): string {
  const t = emailMessages(locale).interviewSoon;
  const zone = zoneOf(timeZone);
  const day = dayKey(interviewAt, zone);
  if (day === dayKey(now, zone)) return t.today;
  if (day === dayKey(now + DAY_MS, zone)) return t.tomorrow;
  const weekday = formatFor(locale).date(interviewAt, { weekday: "long", timeZone: zone });
  return fmt(t.onDay, { weekday });
}

function titleOf(item: InterviewSoon, now: number, timeZone: string | null, locale: Locale) {
  const t = emailMessages(locale).interviewSoon;
  const company = clip(item.company, NAME_CHARS);
  const day = interviewDay(item.interviewAt, now, timeZone, locale);
  return clip(
    company ? fmt(t.title, { company, day }) : fmt(t.titleBlank, { day }),
    NOTIFICATION_LIMITS.title,
  );
}

export function interviewSoonNotice(
  item: InterviewSoon,
  now: number,
  timeZone: string | null,
  locale: Locale,
): InterviewSoonNotice {
  const t = emailMessages(locale).interviewSoon;
  const role = clip(item.role, NAME_CHARS);
  const body = role ? `${fmt(t.role, { role })} ${t.advice}` : t.advice;
  return {
    title: titleOf(item, now, timeZone, locale),
    body: clip(body, NOTIFICATION_LIMITS.body),
    link: interviewPrepPath(item.id),
    applicationId: item.id,
  };
}
