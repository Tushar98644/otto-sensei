import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import type { ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { DAY_MS } from "@/lib/time";
import { calendarDocument, type IcsEvent, type IcsWhen } from "./ics";
import { interviewStart, wallTime, zoneOrUtc } from "./zones";

// The private calendar feed: every interview, at its time where one is set, and each follow-up day.

export const FEED = {
  // Interviews further back than this leave the feed; follow-ups a little sooner.
  interviewDays: 120,
  followUpDays: 30,
  maxEvents: 500,
  // Calendars that honour it read the feed again this often; Google decides for itself.
  refreshHours: 1,
  // Otto doesn't know how long an interview runs, so a timed one is shown as an hour.
  interviewMinutes: 60,
} as const;

const DOMAIN = "ottosensei.com";

export type CalendarInterview = {
  applicationId: string;
  company: string;
  role: string;
  interviewAt: number;
  // Minutes after midnight in interviewZone; null is a day with no time.
  interviewTime: number | null;
  interviewZone: string | null;
};

export type FeedApplication = Omit<CalendarInterview, "interviewAt"> & {
  interviewAt: number | null;
  status: ApplicationStatus;
  statusChangedAt: number;
  followUpAt: number | null;
  updatedAt: number;
};

export function interviewTitle({
  company,
  role,
}: Pick<CalendarInterview, "company" | "role">): string {
  const job = [role.trim(), company.trim()].filter(Boolean).join(" at ");
  return job ? `Interview: ${job}` : "Interview";
}

// The prep page itself, never with ?start=1: opening a calendar event must not spend allowance.
export function prepPath(applicationId: string): string {
  return `${ROUTES.dashboardInterview}/${encodeURIComponent(applicationId)}`;
}

// A timed interview sits at its time in the zone it was typed in; a day alone is all-day in the account's zone.
export function interviewWhen(interview: CalendarInterview, fallbackZone: string): IcsWhen {
  const zone =
    interview.interviewTime !== null && interview.interviewZone
      ? zoneOrUtc(interview.interviewZone)
      : zoneOrUtc(fallbackZone);
  const start = interviewStart(interview.interviewAt, interview.interviewTime, zone);
  if (start !== null) return { kind: "time", start, minutes: FEED.interviewMinutes, zone };
  return { kind: "day", date: wallTime(interview.interviewAt, zone) };
}

export function interviewEvent(
  interview: CalendarInterview,
  { origin, stamp, zone }: { origin: string; stamp: number; zone: string },
): IcsEvent {
  const prep = `${origin}${prepPath(interview.applicationId)}`;
  const when = interviewWhen(interview, zone);
  return {
    uid: `interview-${interview.applicationId}@${DOMAIN}`,
    stamp,
    summary: interviewTitle(interview),
    description: `Your interview prep: ${prep}`,
    url: prep,
    when,
    busy: when.kind === "time",
    alarm:
      when.kind === "time"
        ? { trigger: "-PT1H", description: "Your interview starts in an hour" }
        : { trigger: "-PT15H", description: "Practice your interview prep" },
  };
}

function followUpEvent(
  item: FeedApplication & { followUpAt: number },
  { origin, zone }: { origin: string; zone: string },
): IcsEvent {
  const company = item.company.trim();
  const url = `${origin}${applicationHref(item.applicationId)}`;
  return {
    uid: `follow-up-${item.applicationId}@${DOMAIN}`,
    stamp: item.updatedAt,
    summary: company ? `Follow up with ${company}` : "Follow up on an application",
    description: `${item.status === "interview" ? "A short note after your interview" : "A short note about your application"} keeps you in mind. Otto can draft it: ${url}`,
    url,
    when: { kind: "day", date: wallTime(item.followUpAt, zone) },
    busy: false,
    alarm: null,
  };
}

// An interview stays once it happened; one booked and then closed before its day goes.
function interviewHappened(item: FeedApplication & { interviewAt: number }): boolean {
  if (item.status === "interview" || item.status === "offer") return true;
  return item.interviewAt < item.statusChangedAt;
}

export function feedEvents(
  applications: readonly FeedApplication[],
  { origin, timeZone, now }: { origin: string; timeZone: string | null; now: number },
): IcsEvent[] {
  const zone = zoneOrUtc(timeZone);
  const interviewsFrom = now - FEED.interviewDays * DAY_MS;
  const followUpsFrom = now - FEED.followUpDays * DAY_MS;
  const interviews = applications.flatMap((item) => {
    const { interviewAt } = item;
    if (interviewAt === null || interviewAt < interviewsFrom) return [];
    const dated = { ...item, interviewAt };
    return interviewHappened(dated)
      ? [interviewEvent(dated, { origin, stamp: item.updatedAt, zone })]
      : [];
  });
  const followUps = applications.flatMap((item) =>
    item.followUpAt !== null &&
    item.followUpAt >= followUpsFrom &&
    (item.status === "applied" || item.status === "interview")
      ? [followUpEvent({ ...item, followUpAt: item.followUpAt }, { origin, zone })]
      : [],
  );
  return [...interviews, ...followUps].slice(0, FEED.maxEvents);
}

export function calendarFeed(
  applications: readonly FeedApplication[],
  options: { origin: string; timeZone: string | null; now: number },
): string {
  return calendarDocument({
    events: feedEvents(applications, options),
    feed: {
      name: `${BRAND.name} interviews`,
      description: `Interviews and follow-ups you log in ${BRAND.name}, each linking to its prep.`,
      timeZone: zoneOrUtc(options.timeZone),
      refreshHours: FEED.refreshHours,
    },
  });
}
