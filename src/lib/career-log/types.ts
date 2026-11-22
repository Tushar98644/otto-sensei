import type { UsageSnapshot } from "@/config/plans";

// A month as YYYY-MM and a calendar day as YYYY-MM-DD, both in the person's own time zone.
export type Month = string;
export type LocalDate = string;

export const ENTRY_FIELDS = ["shipped", "numbers", "learned"] as const;
export type EntryField = (typeof ENTRY_FIELDS)[number];

export const CAREER_LOG_LIMITS = {
  fieldChars: 2_000,
  // Ten years of months, far more than a search needs.
  entries: 120,
  jobChars: 200,
  // The most months one "Turn my log into resume lines" reads.
  linesMonths: 36,
  linesPerRun: 8,
  existingLines: 30,
} as const;

export type CareerLogEntry = {
  id: string;
  month: Month;
  shipped: string;
  numbers: string;
  learned: string;
  nothingNew: boolean;
  createdAt: number;
  updatedAt: number;
};

// The week of the month (1 to 4, or 5 for the last) and the weekday (0 Sunday to 6 Saturday).
export type CheckinDay = { week: number; weekday: number };
export const DEFAULT_CHECKIN_DAY: CheckinDay = { week: 1, weekday: 1 };
export const LAST_WEEK = 5;

export type CareerLogSettings = {
  checkins: boolean;
  emails: boolean;
  day: CheckinDay;
  timeZone: string;
  nextCheckinOn: LocalDate | null;
  pausedUntil: LocalDate | null;
  job: { role: string; company: string };
  promptClosed: boolean;
  promptSnoozed: boolean;
};

export type CareerLogResponse = {
  ok: true;
  entries: CareerLogEntry[];
  settings: CareerLogSettings;
  emailAvailable: boolean;
};
export type CareerEntryResponse = { ok: true; entry: CareerLogEntry | null };
export type CareerSettingsResponse = {
  ok: true;
  settings: CareerLogSettings;
  emailAvailable: boolean;
};

export type LogLine = {
  id: string;
  text: string;
  // The months it came from, and the person's own words it rests on most.
  months: Month[];
  quote: string;
};

export type LogLinesResult = { lines: LogLine[]; months: number };
export type LogLinesResponse = {
  ok: true;
  result: LogLinesResult;
  usage: UsageSnapshot;
  demo: boolean;
};
