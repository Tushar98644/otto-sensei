import { companyKey } from "@/components/ui/company-mark";
import { interviewEvent, type CalendarInterview } from "@/lib/calendar/feed";
import { calendarDocument } from "@/lib/calendar/ics";

export { interviewTitle, type CalendarInterview } from "@/lib/calendar/feed";

function deviceZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

// The interview at its time where one is set, else all day on its own day, with a reminder to practise.
export function interviewCalendar(
  interview: CalendarInterview,
  origin: string,
  now = Date.now(),
  zone = deviceZone(),
): string {
  return calendarDocument({ events: [interviewEvent(interview, { origin, stamp: now, zone })] });
}

export function calendarFileName(company: string): string {
  const slug = companyKey(company).replace(/\s+/g, "-").slice(0, 40);
  return `${slug || "my"}-interview.ics`;
}

export function downloadInterviewCalendar(interview: CalendarInterview): void {
  const blob = new Blob([interviewCalendar(interview, window.location.origin)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = calendarFileName(interview.company);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
