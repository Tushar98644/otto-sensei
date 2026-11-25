import type { TailorDraft } from "@/components/studio/tailor/session";
import { TEXT_LIMITS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import matchCheckEn from "@/i18n/messages/en/match-check";
import { normalizeJobUrl } from "@/lib/applications/schema";
import type { MatchCheckMessages } from "@/lib/match-check/copy";
import type { LinkRead } from "./job-link";
import type { UploadState } from "./resume-upload";

export type ResumeMode = "paste" | "upload";
export type JobMode = "paste" | "link";

const MIN_RESUME_CHARS = 100;
export const MIN_POST_CHARS = 80;

export function resumeProblem(
  mode: ResumeMode,
  text: string,
  upload: UploadState,
  t: MatchCheckMessages = matchCheckEn,
): string | null {
  const problems = t.resume.problems;
  if (mode === "upload") {
    if (upload.status === "reading") return problems.reading;
    return upload.status === "read" ? null : problems.noFile;
  }
  const length = text.trim().length;
  if (length === 0) return problems.empty;
  if (length < MIN_RESUME_CHARS) return problems.short;
  if (length > TEXT_LIMITS.resumeChars) return problems.long;
  return null;
}

export function postProblem(
  text: string,
  t: MatchCheckMessages = matchCheckEn,
  format: Format = formatFor("en"),
): string | null {
  const problems = t.post.problems;
  const length = text.trim().length;
  if (length === 0) return problems.empty;
  if (length < MIN_POST_CHARS) return problems.short;
  if (length > TEXT_LIMITS.jobPostChars) {
    return fmt(problems.long, { max: format.number(TEXT_LIMITS.jobPostChars) });
  }
  return null;
}

// Longer text with spaces in the link box is the post itself, pasted into the wrong box.
export function isPostText(text: string): boolean {
  const value = text.trim();
  return /\s/.test(value) && value.length >= MIN_POST_CHARS;
}

// Only a whole address counts, so a post that happens to start with a link stays a post.
export function isJobLink(text: string): boolean {
  const value = text.trim();
  return value.length <= 2048 && /^(?:https?:\/\/|www\.)\S+$/i.test(value);
}

// Only a web link in ?job= is read, so an address can't put its own text in the post box.
export function jobLinkParam(value: string | null): string | null {
  return (value && normalizeJobUrl(value)) || null;
}

export function privacyNote(
  mode: ResumeMode,
  jobMode: JobMode,
  t: MatchCheckMessages = matchCheckEn,
): string {
  return mode === "paste" && jobMode === "paste" ? t.privacy.pasted : t.privacy.uploaded;
}

// A post read from a link keeps its posting, so Tailor shows the job and its hiring system.
export function jobDraft(text: string, read: Extract<LinkRead, { ok: true }> | null): TailorDraft {
  if (!read || read.text !== text) return { title: "", company: "", text, paste: true };
  const { posting, link } = read;
  return { title: posting.title, company: posting.company, text, link, posting, paste: false };
}
