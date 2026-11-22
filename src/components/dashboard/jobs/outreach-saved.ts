import type { OutreachDraft } from "@/components/studio/tailor/use-writing";
import {
  WRITING_LIMITS,
  type CreateWritingBody,
  type OutreachLookup,
  type UpdateWritingBody,
  type Writing,
} from "@/lib/writings/schema";

// What the outreach dialog needs about a job: an opening from the Jobs tab or a tracked application.
export type OutreachJob = {
  id: string | null;
  title: string;
  company: string;
  url: string;
  applicationId?: string | null;
  // The post's text when it is already at hand, such as the one a tailored copy was made from.
  post?: string;
  // Set when the person applied that many days ago and wants a follow-up rather than a first message.
  followUp?: { days: number };
  // Set after an interview: a thank-you to the people they met.
  thankYou?: true;
};

export type OutreachFields = Pick<OutreachDraft, "subject" | "email" | "note">;
export type OutreachField = keyof OutreachFields;

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export function outreachKey(job: OutreachJob): string {
  if (job.followUp) return `follow-up:${outreachKey({ ...job, followUp: undefined })}`;
  if (job.thankYou) return `thank-you:${outreachKey({ ...job, thankYou: undefined })}`;
  if (job.id) return `job:${job.id}`;
  if (job.url.trim()) return `url:${job.url.trim()}`;
  if (job.applicationId) return `application:${job.applicationId}`;
  return `name:${oneLine(job.company).toLowerCase()}|${oneLine(job.title).toLowerCase()}`;
}

// A follow-up or a thank-you is always a new message, so it never opens the first one.
export function outreachLookup(job: OutreachJob): OutreachLookup | null {
  if (job.followUp || job.thankYou) return null;
  const lookup = { job: job.id ?? "", application: job.applicationId ?? "" };
  return lookup.job || lookup.application ? lookup : null;
}

// Within what the server keeps, so a fresh message never fails to save over a long note or many warnings.
export function fitOutreach(draft: OutreachDraft): OutreachDraft {
  return {
    ...draft,
    note: draft.note.slice(0, WRITING_LIMITS.noteChars),
    warnings: draft.warnings
      .slice(0, WRITING_LIMITS.warnings)
      .map((warning) => warning.slice(0, WRITING_LIMITS.warningChars)),
  };
}

export function fieldsOf(draft: OutreachFields): OutreachFields {
  return { subject: draft.subject, email: draft.email, note: draft.note };
}

export function draftOf(writing: Writing): OutreachDraft {
  return {
    subject: writing.outreach?.subject ?? "",
    email: writing.text,
    note: writing.outreach?.note ?? "",
    warnings: writing.warnings,
    demo: writing.demo,
  };
}

export function outreachBody(
  job: OutreachJob,
  resume: { id: string; title: string },
  draft: OutreachDraft,
): CreateWritingBody {
  return {
    kind: "outreach",
    resumeId: resume.id,
    resumeTitle: resume.title,
    company: job.company.trim(),
    role: job.title.trim(),
    jobUrl: job.url.trim(),
    jobId: job.id,
    text: draft.email,
    subject: draft.subject,
    note: draft.note,
    warnings: draft.warnings,
    demo: draft.demo,
    applicationId: job.applicationId ?? null,
  };
}

// Only the parts that changed since the last save; an emptied email waits, since a message needs one.
export function outreachChange(
  current: OutreachFields,
  saved: OutreachFields,
): UpdateWritingBody | null {
  const change: UpdateWritingBody = {};
  const email = current.email.trim();
  if (oneLine(current.subject) !== oneLine(saved.subject)) change.subject = current.subject;
  if (email && email !== saved.email.trim()) change.text = current.email;
  if (current.note.trim() !== saved.note.trim()) change.note = current.note;
  return Object.keys(change).length > 0 ? change : null;
}
