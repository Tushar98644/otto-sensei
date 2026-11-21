import type { TailorDraft } from "@/components/studio/tailor/session";
import { TEXT_LIMITS } from "@/config/plans";
import { normalizeJobUrl } from "@/lib/applications/schema";
import type { LinkRead } from "./job-link";
import type { UploadState } from "./resume-upload";

export type ResumeMode = "paste" | "upload";
export type JobMode = "paste" | "link";

const MIN_RESUME_CHARS = 100;
export const MIN_POST_CHARS = 80;

export function resumeProblem(mode: ResumeMode, text: string, upload: UploadState): string | null {
  if (mode === "upload") {
    if (upload.status === "reading") return "Wait a moment while Otto reads your file.";
    return upload.status === "read" ? null : "Choose your resume file, or paste the text instead.";
  }
  const length = text.trim().length;
  if (length === 0) return "Paste your resume first.";
  if (length < MIN_RESUME_CHARS) return "That's a bit short. Paste your whole resume.";
  if (length > TEXT_LIMITS.resumeChars)
    return "That's longer than a resume. Paste just your resume.";
  return null;
}

export function postProblem(text: string): string | null {
  const length = text.trim().length;
  if (length === 0) return "Paste the job post first.";
  if (length < MIN_POST_CHARS)
    return "That's a bit short. Paste the whole job post, not just the title.";
  if (length > TEXT_LIMITS.jobPostChars) {
    return `That's over ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters. Cut the company intro or the benefits.`;
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

export function privacyNote(mode: ResumeMode, jobMode: JobMode): string {
  return mode === "paste" && jobMode === "paste"
    ? "Pasted text is checked in your browser and never leaves it."
    : "The check runs in your browser. Nothing is stored.";
}

// A post read from a link keeps its posting, so Tailor shows the job and its hiring system.
export function jobDraft(text: string, read: Extract<LinkRead, { ok: true }> | null): TailorDraft {
  if (!read || read.text !== text) return { title: "", company: "", text, paste: true };
  const { posting, link } = read;
  return { title: posting.title, company: posting.company, text, link, posting, paste: false };
}
