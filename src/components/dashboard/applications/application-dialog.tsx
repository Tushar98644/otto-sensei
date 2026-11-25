"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, type FormEvent } from "react";
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
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { APPLICATION_LIMITS, type Application } from "@/lib/applications/schema";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUSES, isApplicationStatus } from "@/lib/applications/status";
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
  | { kind: "add"; key: number; resumeId: string | null }
  | { kind: "edit"; application: Application };

export type ApplicationDialogProps = {
  target: ApplicationDialogTarget | null;
  resumes: readonly Resume[];
  onClose: () => void;
};

export function ApplicationDialog({ target, resumes, onClose }: ApplicationDialogProps) {
  const { dialog } = useMessages("applications");
  const fromCard = target?.kind === "add" && target.resumeId !== null;
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={target?.kind === "edit" ? dialog.edit : fromCard ? dialog.markApplied : dialog.add}
      description={target?.kind === "edit" ? dialog.editNote : dialog.addNote}
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
  const t = useMessages("applications");
  const { dialog } = t;
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
  const latest = useRef<Application | null>(editing);
  const timer = useRef<number | undefined>(undefined);
  const [moreOpen, setMoreOpen] = useState(
    () => target.kind === "add" && values.resumeId === "" && resumes.length > 0,
  );
  // Opened before the resumes loaded: once they arrive, pick the card's resume and keep what was typed.
  const [hadResumes, setHadResumes] = useState(resumes.length > 0);
  if (!hadResumes && resumes.length > 0) {
    setHadResumes(true);
    if (target.kind === "add" && values.resumeId === "") {
      const resume = target.resumeId ? (byId.get(target.resumeId) ?? null) : null;
      if (resume) {
        const fill = emptyForm(0, resume, draft);
        setValues((current) => ({
          ...current,
          resumeId: fill.resumeId,
          company: current.company || fill.company,
          role: current.role || fill.role,
          jobUrl: current.jobUrl || fill.jobUrl,
        }));
      } else {
        setMoreOpen(true);
      }
    }
  }

  const missingVersion = editing?.resumeId && !byId.has(editing.resumeId) ? editing.resumeId : null;
  const versionTitles = missingVersion
    ? new Map([...titles, [missingVersion, editing?.resumeTitle ?? ""]])
    : titles;

  async function autosave(next: ApplicationFormValues) {
    const base = latest.current;
    if (!base) return;
    const result = validateForm(next, versionTitles, Date.now(), t);
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
    const result = validateForm(values, versionTitles, Date.now(), t);
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
      toast({ title: dialog.added, description: result.body.company, variant: "success" });
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
        <Field label={dialog.company} error={errors.company}>
          <Input
            value={values.company}
            onChange={(event) => set("company", event.target.value)}
            maxLength={APPLICATION_LIMITS.company}
            autoComplete="organization"
            data-autofocus={values.company === "" ? true : undefined}
          />
        </Field>
        <Field label={dialog.role} optional error={errors.role}>
          <Input
            value={values.role}
            onChange={(event) => set("role", event.target.value)}
            maxLength={APPLICATION_LIMITS.role}
            autoComplete="organization-title"
          />
        </Field>
      </div>

      <Field label={dialog.link} optional error={errors.jobUrl}>
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
          {dialog.more}
          <ChevronDown
            aria-hidden
            className={cn("transition-transform", moreOpen && "rotate-180")}
          />
        </Button>
      )}
      <div id={`${formId}-more`} hidden={!showMore} className="flex flex-col gap-5">
        <Field label={dialog.resume} hint={resumes.length === 0 ? dialog.resumeHint : undefined}>
          <Select value={values.resumeId} onChange={(event) => pickResume(event.target.value)}>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.label}
              </option>
            ))}
            {missingVersion ? (
              <option value={missingVersion}>
                {fmt(dialog.deletedTitle, {
                  title: editing?.resumeTitle || dialog.deletedResume,
                })}
              </option>
            ) : null}
            <option value="">{dialog.notInOtto}</option>
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={dialog.appliedOn} error={errors.appliedOn}>
            <Input
              type="date"
              value={values.appliedOn}
              max={today}
              onChange={(event) => set("appliedOn", event.target.value)}
            />
          </Field>
          <Field label={dialog.status}>
            <Select
              value={values.status}
              onChange={(event) => {
                const status = event.target.value;
                if (isApplicationStatus(status)) set("status", status);
              }}
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.statuses[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={dialog.notes} optional hint={dialog.notesHint} error={errors.notes}>
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
            {saved === "waiting" ? dialog.saving : saved === "saved" ? dialog.saved : ""}
          </p>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {dialog.cancel}
          </Button>
        )}
        <Button
          type="submit"
          loading={saving}
          data-autofocus={values.company !== "" ? true : undefined}
        >
          {editing ? dialog.done : dialog.addButton}
        </Button>
      </div>
    </form>
  );
}
