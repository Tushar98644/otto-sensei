import type { z } from "zod";
import type {
  BulkApplicationStatusSchema,
  CreateApplicationSchema,
  UpdateApplicationSchema,
} from "./validation";
import type { ApplicationStage, ApplicationStatus } from "./status";

export const APPLICATION_LIMITS = {
  perUser: 2_000,
  // 500 worst-case rows stay near 3 MB, under Vercel's 4.5 MB response limit.
  pageSize: 500,
  bulk: 500,
  company: 200,
  role: 200,
  resumeTitle: 200,
  jobUrl: 2_048,
  notes: 500,
} as const;

export const MIN_APPLIED_AT = Date.UTC(2000, 0, 1);

export type Application = {
  id: string;
  // Usually a tailored copy. Null: a file that isn't in Otto.
  resumeId: string | null;
  // So the win rate can still name it once it's deleted.
  resumeTitle: string;
  company: string;
  role: string;
  jobUrl: string;
  appliedAt: number;
  status: ApplicationStatus;
  // The furthest step it ever reached (stageAfter): what the win rate counts.
  stageReached: ApplicationStage;
  statusChangedAt: number;
  notes: string;
  followUpAt: number | null;
  // Null for a job found elsewhere, or one whose post was removed.
  jobId: string | null;
  // The pack itself is read by /api/interview.
  hasPrep: boolean;
  // Local noon of the interview day.
  interviewAt: number | null;
  createdAt: number;
  updatedAt: number;
};

// "" for none. https:// is assumed when pasted without a scheme. Null when it isn't a link.
export function normalizeJobUrl(input: string): string | null {
  const value = input.trim();
  if (value === "") return "";
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || !url.hostname.includes(".")) return null;
  return url.href.length <= APPLICATION_LIMITS.jobUrl ? url.href : null;
}

export function cleanLine(value: string): string {
  return value.replace(/[\p{Cc}\s]+/gu, " ").trim();
}

export function cleanNotes(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\P{Cc}\n\t]/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export type CreateApplicationBody = z.input<typeof CreateApplicationSchema>;
export type CreateApplicationInput = z.output<typeof CreateApplicationSchema>;
export type UpdateApplicationBody = z.input<typeof UpdateApplicationSchema>;
export type UpdateApplicationInput = z.output<typeof UpdateApplicationSchema>;
export type BulkApplicationStatusBody = z.input<typeof BulkApplicationStatusSchema>;
