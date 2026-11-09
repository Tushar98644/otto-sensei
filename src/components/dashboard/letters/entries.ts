import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing, WritingKind } from "@/lib/writings/schema";

// Client-safe and pure: what the Cover letters page lists, kept out of the component so it's
// tested. Letters and answers live in two places: saved rows (/api/writings, every one written
// since the page existed) and the letter on each tailored copy (tailor.coverLetter, synced with the
// resume). A letter in both shows once, as the saved row that also knows its copy.

export type LetterEntry = {
  key: string;
  kind: WritingKind;
  question: string;
  text: string;
  warnings: string[];
  demo: boolean;
  company: string;
  role: string;
  jobUrl: string;
  resumeId: string | null;
  resumeTitle: string;
  createdAt: number;
  // Where it's kept: the saved row, the tailored copy holding the same letter, or both. Edits and
  // deletes go to each.
  writingId: string | null;
  copyId: string | null;
};

export type LetterFilter = "all" | WritingKind;

const same = (a: string, b: string) => a.trim() === b.trim();

function fromWriting(writing: Writing, copies: readonly Resume[]): LetterEntry {
  const copy =
    writing.kind === "letter"
      ? copies.find((resume) => same(resume.tailor?.coverLetter ?? "", writing.text))
      : undefined;
  return {
    key: `writing:${writing.id}`,
    kind: writing.kind,
    question: writing.question,
    text: writing.text,
    warnings: writing.warnings,
    demo: writing.demo,
    company: writing.company,
    role: writing.role,
    jobUrl: writing.jobUrl,
    resumeId: writing.resumeId,
    resumeTitle: writing.resumeTitle,
    createdAt: writing.createdAt,
    writingId: writing.id,
    copyId: copy?.id ?? null,
  };
}

function fromCopy(copy: Resume): LetterEntry | null {
  const meta = copy.tailor;
  const text = meta?.coverLetter?.trim() ?? "";
  if (!meta || !text) return null;
  return {
    key: `copy:${copy.id}`,
    kind: "letter",
    question: "",
    text,
    warnings: [],
    demo: false,
    company: meta.company,
    role: meta.jobTitle,
    jobUrl: meta.jobUrl ?? "",
    resumeId: copy.id,
    resumeTitle: resumeTitle(copy),
    // The letter has no date of its own there; the copy was made for the same job.
    createdAt: meta.createdAt,
    writingId: null,
    copyId: copy.id,
  };
}

/** Every letter and answer, newest first. */
export function letterEntries(
  writings: readonly Writing[],
  resumes: readonly Resume[],
): LetterEntry[] {
  const copies = resumes.filter((resume) => (resume.tailor?.coverLetter ?? "").trim() !== "");
  const saved = writings.map((writing) => fromWriting(writing, copies));
  const linked = new Set(saved.map((entry) => entry.copyId).filter(Boolean));
  const onCopies = copies
    .filter((copy) => !linked.has(copy.id))
    .map(fromCopy)
    .filter((entry): entry is LetterEntry => entry !== null);
  return [...saved, ...onCopies].sort(
    (a, b) => b.createdAt - a.createdAt || a.key.localeCompare(b.key),
  );
}

export function filterEntries(entries: readonly LetterEntry[], filter: LetterFilter): LetterEntry[] {
  return filter === "all" ? [...entries] : entries.filter((entry) => entry.kind === filter);
}

export function kindCounts(entries: readonly LetterEntry[]): Record<LetterFilter, number> {
  const letters = entries.filter((entry) => entry.kind === "letter").length;
  return { all: entries.length, letter: letters, answer: entries.length - letters };
}

/** "Product Designer at Northwind", or whichever half is known. */
export function jobLine(entry: Pick<LetterEntry, "role" | "company">): string {
  return [entry.role, entry.company].filter((part) => part.trim() !== "").join(" at ");
}

/**
 * The resume it came from, by the title it has now, else the title it had when the letter was
 * written. Never "deleted": a resume another device made may simply not be synced here yet.
 */
export function sourceTitle(
  entry: Pick<LetterEntry, "resumeId" | "resumeTitle">,
  resumes: readonly Resume[],
): string {
  const live = entry.resumeId ? resumes.find((resume) => resume.id === entry.resumeId) : undefined;
  return live ? resumeTitle(live) : entry.resumeTitle.trim();
}

/**
 * The resume whose name block and format the letter's PDF and Word file use: its tailored copy,
 * else the resume it was written from, else the newest base resume, else a blank page.
 */
export function letterResume(
  entry: Pick<LetterEntry, "copyId" | "resumeId">,
  resumes: readonly Resume[],
): Resume {
  const byId = (id: string | null) => (id ? resumes.find((resume) => resume.id === id) : undefined);
  const newest = [...resumes].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    byId(entry.copyId) ??
    byId(entry.resumeId) ??
    newest.find((resume) => resume.tailor === null) ??
    newest[0] ??
    emptyResume(0)
  );
}

/** Where "Open in the studio" goes: the tailored copy's download step, or the resume it came from. */
export function studioTarget(
  entry: Pick<LetterEntry, "copyId" | "resumeId">,
  resumes: readonly Resume[],
): { id: string; step: "download" | "tailor" } | null {
  if (entry.copyId && resumes.some((resume) => resume.id === entry.copyId)) {
    return { id: entry.copyId, step: "download" };
  }
  if (entry.resumeId && resumes.some((resume) => resume.id === entry.resumeId)) {
    return { id: entry.resumeId, step: "tailor" };
  }
  return null;
}

/** The resume a new letter starts from: the one edited last (owner's call, 2026-11-08). */
export function defaultResume(resumes: readonly Resume[]): Resume | null {
  return [...resumes].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}
