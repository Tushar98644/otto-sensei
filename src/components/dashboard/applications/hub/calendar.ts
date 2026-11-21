import { BRAND } from "@/config/brand";
import type { Application } from "@/lib/applications/schema";
import { toDateInput } from "../form";

export type CalendarEvent = Pick<Application, "id" | "company" | "role" | "jobUrl"> & {
  interviewAt: number;
  prepUrl: string;
};

// RFC 5545 text: backslash, semicolon, comma and line breaks are escaped.
function text(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n?|\n/g, "\\n");
}

// Lines over 75 octets fold onto continuation lines that start with a space.
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function dateValue(timestamp: number): string {
  return toDateInput(timestamp).replace(/-/g, "");
}

function stampValue(timestamp: number): string {
  return new Date(timestamp)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// The interview day is kept as a local date, so the event is all-day on that date.
export function interviewIcs(event: CalendarEvent, now: number): string {
  const title = event.role
    ? `Interview: ${event.role}, ${event.company}`
    : `Interview: ${event.company}`;
  const notes = [event.jobUrl ? `Job post: ${event.jobUrl}` : "", `Prep: ${event.prepUrl}`]
    .filter(Boolean)
    .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND.name}//Applications//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:interview-${event.id}@${BRAND.supportEmail.split("@")[1]}`,
    `DTSTAMP:${stampValue(now)}`,
    `DTSTART;VALUE=DATE:${dateValue(event.interviewAt)}`,
    `DTEND;VALUE=DATE:${dateValue(nextDay(event.interviewAt))}`,
    `SUMMARY:${text(title)}`,
    `DESCRIPTION:${text(notes)}`,
    ...(event.jobUrl ? [`URL:${event.jobUrl}`] : []),
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

function nextDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function icsFileName(company: string): string {
  const slug = company
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `interview-${slug || "otto"}.ics`;
}
