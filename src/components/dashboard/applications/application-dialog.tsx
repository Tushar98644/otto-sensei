"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { errorMessage } from "@/components/account/errors";
import { loadDraft } from "@/components/studio/tailor/session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { APPLICATION_LIMITS, type Application } from "@/lib/applications/schema";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUSES, isApplicationStatus, STATUS_NAMES } from "@/lib/applications/status";
import { copyJobId } from "@/lib/applications/thread";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import {
  emptyForm,
  formFromApplication,
  patchFrom,
  switchResume,
  toDateInput,
  validateForm,
  versionChoices,
  type ApplicationFormValues,
  type FormErrors,
  type JobDraft,
} from "./form";
import { addApplication, changeApplication } from "./use-applications";

export type ApplicationDialogTarget =
  // `key` starts every opening from a fresh form.
  | { kind: "add"; key: number; resumeId: string | null }
  | { kind: "edit"; application: Application };

export type ApplicationDialogProps = {
  target: ApplicationDialogTarget | null;
  resumes: readonly Resume[];
  onClose: () => void;
};

// Add or edit one application. Adding asks for the company, the role and the link; the rest
// (which resume, the day, the status, notes) has sensible defaults behind "More options". Opened
// from a tailored copy, it starts filled in from that copy's job. Editing saves each change by
// itself; Done only closes.
export function ApplicationDialog({ target, resumes, onClose }: ApplicationDialogProps) {
  const fromCard = target?.kind === "add" && target.resumeId !== null;
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        target?.kind === "edit"
          ? "Edit application"
          : fromCard
            ? "Mark as applied"
            : "Add an application"
      }
      description={
        target?.kind === "edit"
          ? "Changes save as you make them."
          : "Your own record, so you can see which resume version gets interviews. Otto reminds you to follow up."
      }
    >
      {target ? (
        <ApplicationForm
          key={target.kind === "edit" ? target.application.id : `add-${target.key}`}
          target={target}
          resumes={resumes}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function readDraft(): JobDraft | null {
  try {
    return loadDraft();
  } catch {
    return null;
  }
}

function ApplicationForm({
  target,
  resumes,
  onClose,
}: {
  target: ApplicationDialogTarget;
  resumes: readonly Resume[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const byId = useMemo(() => new Map(resumes.map((resume) => [resume.id, resume])), [resumes]);
  const titles = useMemo(
    () => new Map(resumes.map((resume) => [resume.id, resumeTitle(resume)])),
    [resumes],
  );
  const choices = useMemo(() => versionChoices(resumes), [resumes]);
  const [draft] = useState(readDraft);
  const [values, setValues] = useState<ApplicationFormValues>(() =>
    target.kind === "edit"
      ? formFromApplication(target.application)
      : emptyForm(Date.now(), target.resumeId ? (byId.get(target.resumeId) ?? null) : null, draft),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [today] = useState(() => toDateInput(Date.now()));
  const [saved, setSaved] = useState<"idle" | "waiting" | "saved">("idle");
  const editing = target.kind === "edit" ? target.application : null;
  // The row as the server last returned it, so each autosave sends only what is new.
  const latest = useRef<Application | null>(editing);
  const timer = useRef<number | undefined>(undefined);
  const [moreOpen, setMoreOpen] = useState(
    () => target.kind === "add" && values.resumeId === "" && resumes.length > 0,
  );

  // A version deleted since keeps its place in the picker, under the title it was sent with.
  const missingVersion = editing?.resumeId && !byId.has(editing.resumeId) ? editing.resumeId : null;
  const versionTitles = missingVersion
    ? new Map([...titles, [missingVersion, editing?.resumeTitle ?? ""]])
    : titles;

  async function autosave(next: ApplicationFormValues) {
    const base = latest.current;
    if (!base) return;
    const result = validateForm(next, versionTitles, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      setSaved("idle");
      return;
    }
    setErrors({});
    const patch = patchFrom(base, result.body);
    if (Object.keys(patch).length === 0) {
      setSaved("saved");
      return;
    }
    try {
      latest.current = await changeApplication(base, patch);
      setFailure(null);
      setSaved("saved");
    } catch (error) {
      setFailure(errorMessage(error));
      setSaved("idle");
    }
  }

  const pending = useRef<ApplicationFormValues | null>(null);
  function flush() {
    window.clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next) void autosave(next);
  }
  const flushOnClose = useEffectEvent(flush);
  useEffect(() => () => flushOnClose(), []);

  function changed(next: ApplicationFormValues) {
    if (!editing) return;
    pending.current = next;
    setSaved("waiting");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 700);
  }

  function set<K extends keyof ApplicationFormValues>(field: K, value: ApplicationFormValues[K]) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
    changed(next);
  }

  function pickResume(id: string) {
    const previous = byId.get(values.resumeId) ?? null;
    const next = byId.get(id) ?? null;
    if (editing) set("resumeId", id);
    else setValues((current) => switchResume(current, previous, next, draft));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing) {
      flush();
      onClose();
      return;
    }
    const result = validateForm(values, versionTitles, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.appliedOn || result.errors.notes) setMoreOpen(true);
      // After React has marked the fields, so the first wrong one takes focus with its message.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      await addApplication({
        ...result.body,
        jobId: copyJobId(byId.get(result.body.resumeId ?? "")),
      });
      toast({ title: "Application added", description: result.body.company, variant: "success" });
      onClose();
    } catch (error) {
      setFailure(errorMessage(error));
      setSaving(false);
    }
  }

  const showMore = editing !== null || moreOpen;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" error={errors.company}>
          <Input
            value={values.company}
            onChange={(event) => set("company", event.target.value)}
            maxLength={APPLICATION_LIMITS.company}
            autoComplete="organization"
            data-autofocus={values.company === "" ? true : undefined}
          />
        </Field>
        <Field label="Job title" optional error={errors.role}>
          <Input
            value={values.role}
            onChange={(event) => set("role", event.target.value)}
            maxLength={APPLICATION_LIMITS.role}
            autoComplete="organization-title"
          />
        </Field>
      </div>

      <Field label="Job link" optional error={errors.jobUrl}>
        <Input
          type="url"
          inputMode="url"
          value={values.jobUrl}
          onChange={(event) => set("jobUrl", event.target.value)}
          placeholder="https://"
          maxLength={APPLICATION_LIMITS.jobUrl}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      {editing ? null : (
        <Button
          variant="link"
          aria-expanded={moreOpen}
          aria-controls={`${formId}-more`}
          onClick={() => setMoreOpen((open) => !open)}
          className="min-h-11 self-start text-sm text-muted hover:text-ink"
        >
          More options
          <ChevronDown aria-hidden className={cn("transition-transform", moreOpen && "rotate-180")} />
        </Button>
      )}
      <div id={`${formId}-more`} hidden={!showMore} className="flex flex-col gap-5">
        <Field
          label="Resume you sent"
          hint={resumes.length === 0 ? "Your resumes show up here once you make one." : undefined}
        >
          <Select value={values.resumeId} onChange={(event) => pickResume(event.target.value)}>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.label}
              </option>
            ))}
            {missingVersion ? (
              <option
                value={missingVersion}
              >{`${editing?.resumeTitle || "A deleted resume"} (deleted)`}</option>
            ) : null}
            <option value="">A resume not in Otto</option>
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Applied on" error={errors.appliedOn}>
            <Input
              type="date"
              value={values.appliedOn}
              max={today}
              onChange={(event) => set("appliedOn", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={values.status}
              onChange={(event) => {
                const status = event.target.value;
                if (isApplicationStatus(status)) set("status", status);
              }}
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_NAMES[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Notes"
          optional
          hint="A line or two, like who referred you."
          error={errors.notes}
        >
          <Textarea
            value={values.notes}
            onChange={(event) => set("notes", event.target.value)}
            rows={3}
            maxLength={APPLICATION_LIMITS.notes}
            className="min-h-20"
          />
        </Field>
      </div>

      {failure ? <Alert variant="error">{failure}</Alert> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {editing ? (
          <p aria-live="polite" className="text-sm text-subtle sm:mr-auto">
            {saved === "waiting" ? "Saving…" : saved === "saved" ? "Saved" : ""}
          </p>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={saving}
          data-autofocus={values.company !== "" ? true : undefined}
        >
          {editing ? "Done" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
