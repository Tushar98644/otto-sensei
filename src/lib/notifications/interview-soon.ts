import { DAY_MS } from "@/lib/time";
import { clip, NAME_CHARS } from "./follow-up";
import { interviewPrepPath } from "./links";
import { zoneOf } from "./trial-ending";
import { NOTIFICATION_LIMITS } from "./types";

export type InterviewSoon = { id: string; company: string; role: string; interviewAt: number };

export type InterviewSoonNotice = {
  title: string;
  body: string;
  link: string;
  applicationId: string;
};

export type InterviewEmailLine = { title: string; detail: string; prepUrl: string };

const ADVICE = "Go over the likely questions in your prep before you go.";

function dayKey(at: number, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zone,
  }).format(at);
}

// The board saves the day as local noon, so it lands on that day in the person's own zone.
export function interviewDay(interviewAt: number, now: number, timeZone: string | null): string {
  const zone = zoneOf(timeZone);
  const day = dayKey(interviewAt, zone);
  if (day === dayKey(now, zone)) return "today";
  if (day === dayKey(now + DAY_MS, zone)) return "tomorrow";
  return `on ${new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: zone }).format(interviewAt)}`;
}

function titleOf(item: InterviewSoon, now: number, timeZone: string | null): string {
  const company = clip(item.company, NAME_CHARS);
  const day = interviewDay(item.interviewAt, now, timeZone);
  return clip(
    company ? `Your interview with ${company} is ${day}` : `Your interview is ${day}`,
    NOTIFICATION_LIMITS.title,
  );
}

export function interviewSoonNotice(
  item: InterviewSoon,
  now: number,
  timeZone: string | null,
): InterviewSoonNotice {
  const role = clip(item.role, NAME_CHARS);
  return {
    title: titleOf(item, now, timeZone),
    body: clip(`${role ? `For the ${role} role. ` : ""}${ADVICE}`, NOTIFICATION_LIMITS.body),
    link: interviewPrepPath(item.id),
    applicationId: item.id,
  };
}

export function interviewEmailLine(
  item: InterviewSoon,
  now: number,
  timeZone: string | null,
  base: string,
): InterviewEmailLine {
  return {
    title: titleOf(item, now, timeZone),
    detail: clip(item.role, NAME_CHARS),
    prepUrl: new URL(interviewPrepPath(item.id), base).toString(),
  };
}
