import {
  APPLICATION_LIMITS,
  cleanLine,
  cleanNotes,
  MIN_APPLIED_AT,
  normalizeJobUrl,
  type Application,
  type CreateApplicationInput,
  type UpdateApplicationBody,
} from "@/lib/applications/schema";
import type { ApplicationStatus } from "@/lib/applications/status";
import { savedJobUrl } from "@/lib/insights/saved-job";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export type ApplicationFormValues = {
  resumeId: string;
  company: string;
  role: string;
  jobUrl: string;
  appliedOn: string;
  status: ApplicationStatus;
  notes: string;
};

export type FormField = "company" | "role" | "jobUrl" | "appliedOn" | "notes";
export type FormErrors = Partial<Record<FormField, string>>;

export type JobDraft = {
  title: string;
  company: string;
  link?: string;
  posting?: { url: string } | null;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function toDateInput(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Local noon, so the day survives a daylight-saving shift and reads the same a few zones away.
export function fromDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date.getTime();
}

export function toTimeInput(minutes: number | null): string {
  return minutes === null ? "" : `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function fromTimeInput(value: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [hour, minute] = [Number(match[1]), Number(match[2])];
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function versionChoices(resumes: readonly Resume[]): { id: string; label: string }[] {
  return [...resumes]
    .sort(
      (a, b) => Number(b.tailor !== null) - Number(a.tailor !== null) || b.updatedAt - a.updatedAt,
    )
    .map((resume) => ({
      id: resume.id,
      label: resume.tailor ? `${resumeTitle(resume)} (tailored)` : resumeTitle(resume),
    }));
}

export function prefillFor(
  resume: Resume | null,
  draft: JobDraft | null,
): Pick<ApplicationFormValues, "company" | "role" | "jobUrl"> {
  const tailor = resume?.tailor;
  if (!tailor) return { company: "", role: "", jobUrl: "" };
  const company = tailor.company.trim();
  const role = tailor.jobTitle.trim();
  const sameJob =
    draft !== null &&
    cleanLine(draft.company).toLowerCase() === company.toLowerCase() &&
    cleanLine(draft.title).toLowerCase() === role.toLowerCase() &&
    (company !== "" || role !== "");
  const link = savedJobUrl(resume) || (sameJob ? (draft.posting?.url ?? draft.link ?? "") : "");
  return { company, role, jobUrl: normalizeJobUrl(link) ?? "" };
}

export function emptyForm(
  now: number,
  resume: Resume | null,
  draft: JobDraft | null,
): ApplicationFormValues {
  return {
    resumeId: resume?.id ?? "",
    ...prefillFor(resume, draft),
    appliedOn: toDateInput(now),
    status: "applied",
    notes: "",
  };
}

export function formFromApplication(application: Application): ApplicationFormValues {
  return {
    resumeId: application.resumeId ?? "",
    company: application.company,
    role: application.role,
    jobUrl: application.jobUrl,
    appliedOn: toDateInput(application.appliedAt),
    status: application.status,
    notes: application.notes,
  };
}

export function switchResume(
  values: ApplicationFormValues,
  previous: Resume | null,
  next: Resume | null,
  draft: JobDraft | null,
): ApplicationFormValues {
  const before = prefillFor(previous, draft);
  const after = prefillFor(next, draft);
  const keep = (field: "company" | "role" | "jobUrl") =>
    values[field].trim() === "" || values[field] === before[field] ? after[field] : values[field];
  return {
    ...values,
    resumeId: next?.id ?? "",
    company: keep("company"),
    role: keep("role"),
    jobUrl: keep("jobUrl"),
  };
}

export type ValidForm = { ok: true; body: CreateApplicationInput };

export function validateForm(
  values: ApplicationFormValues,
  titles: ReadonlyMap<string, string>,
  now: number,
): ValidForm | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const company = cleanLine(values.company);
  const role = cleanLine(values.role);
  const notes = cleanNotes(values.notes);
  const jobUrl = normalizeJobUrl(values.jobUrl);
  const appliedAt = fromDateInput(values.appliedOn);

  if (company === "") errors.company = "Add the company you applied to.";
  else if (company.length > APPLICATION_LIMITS.company)
    errors.company = `Keep it under ${APPLICATION_LIMITS.company} characters.`;
  if (role.length > APPLICATION_LIMITS.role)
    errors.role = `Keep it under ${APPLICATION_LIMITS.role} characters.`;
  if (jobUrl === null) errors.jobUrl = "That doesn't look like a web link. Paste the full address.";
  if (appliedAt === null) errors.appliedOn = "Pick the day you applied.";
  else if (values.appliedOn > toDateInput(now)) errors.appliedOn = "That day hasn't come yet.";
  else if (appliedAt < MIN_APPLIED_AT) errors.appliedOn = "Pick a day from 2000 on.";
  if (notes.length > APPLICATION_LIMITS.notes)
    errors.notes = `Keep notes under ${APPLICATION_LIMITS.notes} characters.`;

  if (Object.keys(errors).length > 0 || jobUrl === null || appliedAt === null) {
    return { ok: false, errors };
  }
  const resumeId = values.resumeId || null;
  return {
    ok: true,
    body: {
      resumeId,
      jobId: null,
      resumeTitle: resumeId
        ? (titles.get(resumeId) ?? "").slice(0, APPLICATION_LIMITS.resumeTitle)
        : "",
      company,
      role,
      jobUrl,
      appliedAt,
      status: values.status,
      notes,
    },
  };
}

// Only what the edit changed, so a save can't overwrite a status changed on another device.
export function patchFrom(original: Application, body: ValidForm["body"]): UpdateApplicationBody {
  const patch: UpdateApplicationBody = {};
  if (body.resumeId !== original.resumeId) {
    patch.resumeId = body.resumeId;
    patch.resumeTitle = body.resumeTitle;
  }
  if (body.company !== original.company) patch.company = body.company;
  if (body.role !== original.role) patch.role = body.role;
  if (body.jobUrl !== original.jobUrl) patch.jobUrl = body.jobUrl;
  if (toDateInput(body.appliedAt) !== toDateInput(original.appliedAt))
    patch.appliedAt = body.appliedAt;
  if (body.status !== original.status) patch.status = body.status;
  if (body.notes !== original.notes) patch.notes = body.notes;
  return patch;
}
