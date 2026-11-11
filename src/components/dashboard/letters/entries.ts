import type { Application } from "@/lib/applications/schema";
import { applicationForCopy, applicationForWriting } from "@/lib/applications/thread";
import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing, WritingKind } from "@/lib/writings/schema";

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
  writingId: string | null;
  copyId: string | null;
  applicationId: string | null;
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
    applicationId: writing.applicationId,
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
    createdAt: meta.createdAt,
    writingId: null,
    copyId: copy.id,
    applicationId: null,
  };
}

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

export function entryApplication(
  entry: Pick<LetterEntry, "applicationId" | "copyId" | "jobUrl">,
  applications: readonly Application[],
  resumes: readonly Resume[],
): Application | null {
  if (entry.applicationId) {
    return applicationForWriting(applications, { applicationId: entry.applicationId, jobUrl: "" });
  }
  const copy = entry.copyId ? resumes.find((resume) => resume.id === entry.copyId) : undefined;
  return (
    (copy ? applicationForCopy(applications, copy) : null) ??
    applicationForWriting(applications, { applicationId: null, jobUrl: entry.jobUrl })
  );
}

export function jobLine(entry: Pick<LetterEntry, "role" | "company">): string {
  return [entry.role, entry.company].filter((part) => part.trim() !== "").join(" at ");
}

export function sourceTitle(
  entry: Pick<LetterEntry, "resumeId" | "resumeTitle">,
  resumes: readonly Resume[],
): string {
  const live = entry.resumeId ? resumes.find((resume) => resume.id === entry.resumeId) : undefined;
  return live ? resumeTitle(live) : entry.resumeTitle.trim();
}

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

export function defaultResume(resumes: readonly Resume[]): Resume | null {
  return [...resumes].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}
