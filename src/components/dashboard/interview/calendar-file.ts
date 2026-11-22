import { ROUTES } from "@/components/site/routes";
import { companyKey } from "@/components/ui/company-mark";

export type CalendarInterview = {
  applicationId: string;
  company: string;
  role: string;
  interviewAt: number;
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545 caps a line at 75 octets; longer ones continue on lines that start with a space.
function fold(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function dateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function stamp(at: number): string {
  return new Date(at)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function interviewTitle({
  company,
  role,
}: Pick<CalendarInterview, "company" | "role">): string {
  const job = [role.trim(), company.trim()].filter(Boolean).join(" at ");
  return job ? `Interview: ${job}` : "Interview";
}

// An all-day event on the interview's own day, with a nudge to practise the morning before.
export function interviewCalendar(
  interview: CalendarInterview,
  origin: string,
  now = Date.now(),
): string {
  const day = new Date(interview.interviewAt);
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const prep = `${origin}${ROUTES.dashboardInterview}/${encodeURIComponent(interview.applicationId)}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otto Sensei//Interview prep//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:interview-${interview.applicationId}@ottosensei.com`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${dateValue(day)}`,
    `DTEND;VALUE=DATE:${dateValue(next)}`,
    `SUMMARY:${escapeText(interviewTitle(interview))}`,
    `DESCRIPTION:${escapeText(`Your interview prep: ${prep}`)}`,
    `URL:${prep}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText("Practise your interview prep")}`,
    "TRIGGER:-PT15H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
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
