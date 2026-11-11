import { z } from "zod";
import { toTime } from "@/lib/jobs/posting";
import type { EmploymentType, Seniority } from "../types";

export type RawJob = {
  externalId: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  employmentType: EmploymentType | null;
  postedAt: number | null;
  validThrough: number | null;
  url: string;
  text: string;
  seniority?: Seniority | null;
};

export class FeedShapeError extends Error {
  constructor(source: string) {
    super(`Unexpected ${source} response`);
    this.name = "FeedShapeError";
  }
}

export const nullishString = z.string().nullish();

export function httpsLink(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function joinLocation(parts: readonly (string | null | undefined)[]): string {
  const clean = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return [...new Set(clean)].join(" · ");
}

export const REMOTE_WORDS = /\b(?:remote|anywhere|distributed|work from home)\b/i;

export function eachItem<T>(items: readonly unknown[], schema: z.ZodType<T>): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function typeFrom(value: string | null | undefined): EmploymentType | null {
  const text = (value ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (!text) return null;
  if (/intern/.test(text)) return "internship";
  if (/parttime/.test(text)) return "part_time";
  if (/contract|freelance/.test(text)) return "contract";
  if (/temp/.test(text)) return "temporary";
  if (/fulltime|permanent|regular/.test(text)) return "full_time";
  return null;
}

const BOARD_LEVELS: Record<string, Seniority> = {
  internship: "intern",
  student: "intern",
  student_college: "intern",
  "entry level": "junior",
  entry_level: "junior",
  "entry-level": "junior",
  associate: "junior",
  director: "director",
  executive: "director",
  manager: "lead",
};

export const levelFrom = (value: string | null | undefined): Seniority | null =>
  BOARD_LEVELS[(value ?? "").trim().toLowerCase()] ?? null;

export const epochSeconds = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? toTime(value * 1000) : null;
