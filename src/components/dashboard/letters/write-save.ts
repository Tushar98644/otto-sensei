import type { SavedWriting } from "@/components/studio/tailor/session";
import type { OutreachDraft } from "@/components/studio/tailor/use-writing";
import { normalizeJobUrl } from "@/lib/applications/schema";
import { newId } from "@/lib/resume/schema";
import type { WritingKind } from "@/lib/writings/schema";
import { fitOutreach } from "../jobs/outreach-saved";
import type { LetterEntry } from "./entries";

export type WriteJob = {
  title: string;
  company: string;
  url: string;
  jobId: string | null;
  applicationId: string | null;
};

export type WriteResult =
  | ({ kind: "letter" } & SavedWriting)
  | ({ kind: "answer"; question: string } & SavedWriting)
  | { kind: "outreach"; draft: OutreachDraft };

export type WriteBody = {
  kind: WritingKind;
  resumeId: string;
  resumeTitle: string;
  company: string;
  role: string;
  jobUrl: string;
  jobId: string | null;
  question: string;
  text: string;
  subject: string;
  note: string;
  warnings: string[];
  demo: boolean;
  applicationId: string | null;
};

export function writeBody(
  result: WriteResult,
  job: WriteJob,
  resume: { id: string; title: string },
): WriteBody {
  const base = {
    resumeId: resume.id,
    resumeTitle: resume.title,
    company: job.company.trim(),
    role: job.title.trim(),
    jobUrl: normalizeJobUrl(job.url) ?? "",
    applicationId: job.applicationId,
  };
  if (result.kind === "outreach") {
    const draft = fitOutreach(result.draft);
    return {
      ...base,
      kind: "outreach",
      jobId: job.jobId,
      question: "",
      text: draft.email,
      subject: draft.subject,
      note: draft.note,
      warnings: draft.warnings,
      demo: draft.demo,
    };
  }
  return {
    ...base,
    kind: result.kind,
    jobId: null,
    question: result.kind === "answer" ? result.question : "",
    text: result.text,
    subject: "",
    note: "",
    warnings: result.warnings,
    demo: result.demo,
  };
}

// What the list shows for a piece the server didn't keep, so it can still be read and copied.
export function unsavedEntry(body: WriteBody, now: number): LetterEntry {
  const { subject, note, jobId, ...rest } = body;
  return {
    ...rest,
    key: `new:${newId()}`,
    createdAt: now,
    writingId: null,
    copyId: null,
    ...(body.kind === "outreach" ? { outreach: { subject, note, jobId } } : {}),
  };
}
