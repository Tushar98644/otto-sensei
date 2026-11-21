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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import {
  APPLICATION_LIMITS,
  cleanLine,
  normalizeJobUrl,
  type Application,
} from "@/lib/applications/schema";
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
  | { kind: "add"; key: number; resumeId: string | null }
  | { kind: "edit"; application: Application; focus?: "interview" };

export type ApplicationDialogProps = {
  target: ApplicationDialogTarget | null;
  resumes: readonly Resume[];
  onClose: () => void;
};

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
          : "Otto reminds you to follow up and counts which resume gets interviews."
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

type JobPost = { company: string; role: string };

// A read fills only what's still blank, so nothing typed is ever replaced.
function fillFromPost(values: ApplicationFormValues, post: JobPost): ApplicationFormValues {
  return {
    ...values,
    company: values.company.trim() ? values.company : post.company,
    role: values.role.trim() ? values.role : post.role,
  };
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

  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const lookup = useRef<{ url: string; post: Promise<JobPost | null> } | null>(null);

  async function fetchPost(url: string): Promise<JobPost | null> {
    const current = () => lookup.current?.url === url;
    setReading(true);
    setReadNote(null);
    try {
      const { posting } = await api.readJob({ url });
      const post = { company: cleanLine(posting.company), role: cleanLine(posting.title) };
      if (current()) {
        setReadNote(
          post.company
            ? "Filled in from the post. Check it, then add it."
            : "The post doesn't name the company. Type it below.",
        );
      }
      return post;
    } catch (error) {
      if (current()) {
        setReadNote(
          isApiError(error, "network_error")
            ? "You seem to be offline. Type the details below."
            : "Otto couldn't read that post. Type the details below.",
        );
      }
      return null;
    } finally {
      if (current()) setReading(false);
    }
  }

  // One read per link: a paste, a blur and a submit for the same link share it.
  function readPost(raw: string): Promise<JobPost | null> {
    const url = normalizeJobUrl(raw);
    if (!url) return Promise.resolve(null);
    if (lookup.current?.url === url) return lookup.current.post;
    const post = fetchPost(url);
    lookup.current = { url, post };
    return post;
  }

  function readInto(raw: string) {
    if (editing || (values.company.trim() && values.role.trim())) return;
    const url = normalizeJobUrl(raw);
    if (!url) return;
    void readPost(raw).then((post) => {
      if (!post) return;
      setValues((latest) =>
        normalizeJobUrl(latest.jobUrl) === url ? fillFromPost(latest, post) : latest,
      );
    });
  }

  // A read for a link that has since changed no longer fills anything or speaks.
  function setLink(raw: string) {
    set("jobUrl", raw);
    if (lookup.current && normalizeJobUrl(raw) !== lookup.current.url) {
      lookup.current = null;
      setReading(false);
      setReadNote(null);
    }
  }

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
    if (saving) return;
    let ready = values;
    // Only a missing company waits on the post; a missing title alone isn't worth the wait.
    if (values.company.trim() === "" && normalizeJobUrl(values.jobUrl)) {
      setSaving(true);
      const post = await readPost(values.jobUrl);
      setSaving(false);
      if (post) {
        ready = fillFromPost(values, post);
        setValues((latest) => fillFromPost(latest, post));
      }
    }
    const result = validateForm(ready, versionTitles, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.appliedOn || result.errors.interviewOn || result.errors.notes) {
        setMoreOpen(true);
      }
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
  const focusInterview = target.kind === "edit" && target.focus === "interview";

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        label="Job link"
        optional
        error={errors.jobUrl}
        hint={
          editing ? undefined : (
            <span aria-live="polite" className="inline-flex items-center gap-1.5">
              {reading ? <Spinner className="size-3.5" /> : null}
              {reading
                ? "Reading the post…"
                : (readNote ?? "Paste it and Otto fills in the company and title.")}
            </span>
          )
        }
      >
        <Input
          type="url"
          inputMode="url"
          value={values.jobUrl}
          onChange={(event) => setLink(event.target.value)}
          onPaste={(event) => {
            const input = event.currentTarget;
            window.setTimeout(() => readInto(input.value), 0);
          }}
          onBlur={() => readInto(values.jobUrl)}
          placeholder="https://"
          maxLength={APPLICATION_LIMITS.jobUrl}
          autoComplete="off"
          spellCheck={false}
          data-autofocus={!editing && values.company === "" ? true : undefined}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" error={errors.company}>
          <Input
            value={values.company}
            onChange={(event) => set("company", event.target.value)}
            maxLength={APPLICATION_LIMITS.company}
            autoComplete="organization"
            data-autofocus={editing && values.company === "" ? true : undefined}
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
        {values.status === "interview" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Interview day" optional error={errors.interviewOn}>
              <Input
                type="date"
                value={values.interviewOn}
                onChange={(event) => set("interviewOn", event.target.value)}
                data-autofocus={focusInterview ? true : undefined}
              />
            </Field>
          </div>
        ) : null}
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
          data-autofocus={values.company !== "" && !focusInterview ? true : undefined}
        >
          {editing ? "Done" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
