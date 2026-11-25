"use client";

import { ArrowLeft, Plus, RotateCcw, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { OttoLines } from "@/components/mascot/lines";
import { useOtto } from "@/components/mascot/use-otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { VoiceInput } from "@/components/ui/voice-field";
import { useAccountGate } from "@/components/account/account-gate";
import { DRAFT_LIMITS } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { api, isApiError } from "@/lib/api/client";
import type { DraftRequestBody } from "@/lib/api/types";
import type { Resume } from "@/lib/resume/schema";

export type GuidedDraftProps = {
  onDrafted: (resume: Resume, usedAI: boolean) => void;
  onCancel: () => void;
};

type JobForm = {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  notes: string[];
};

type Status = { kind: "editing" } | { kind: "drafting" } | { kind: "failed"; message: string };

type GuidedCopy = Messages["studio"]["guided"];

const MIN_NOTES = 2;

function noteExample(t: GuidedCopy, index: number): string | undefined {
  const { first, second, third, fourth } = t.noteExamples;
  return [first, second, third, fourth][index];
}

function emptyJob(): JobForm {
  return { company: "", title: "", startDate: "", endDate: "", current: false, notes: ["", ""] };
}

// The name stays in the browser; only the role and the jobs go to the server.
export function GuidedDraft({ onDrafted, onCancel }: GuidedDraftProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [jobs, setJobs] = useState<JobForm[]>(() => [emptyJob()]);
  const [screen, setScreen] = useState(-1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "editing" });
  const formRef = useRef<HTMLFormElement>(null);
  const gate = useAccountGate();
  const t = useMessages("studio").guided;
  const ottoErrors = useOtto().errors;

  const job = screen >= 0 ? jobs[screen] : undefined;
  const drafting = status.kind === "drafting";

  function updateJob(patch: Partial<JobForm>) {
    setJobs((list) => list.map((item, index) => (index === screen ? { ...item, ...patch } : item)));
  }

  function validate(): boolean {
    const found: Record<string, string> = {};
    if (screen === -1 && !role.trim()) found.role = t.roleNeeded;
    if (job) {
      if (!job.title.trim()) found.title = t.titleNeeded;
      if (!job.notes.some((note) => note.trim())) found.notes = t.notesNeeded;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
    }
    return Object.keys(found).length === 0;
  }

  function go(to: number) {
    setErrors({});
    setStatus({ kind: "editing" });
    setScreen(to);
  }

  function addJob() {
    if (!validate()) return;
    setJobs((list) => [...list, emptyJob()]);
    go(jobs.length);
  }

  function removeJob() {
    if (jobs.length <= 1) return;
    setJobs((list) => list.filter((_, index) => index !== screen));
    go(Math.max(0, screen - 1));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    if (screen < jobs.length - 1) return go(screen + 1);

    const body: DraftRequestBody = {
      targetRole: role.trim(),
      jobs: jobs.map((item) => ({
        company: item.company.trim(),
        title: item.title.trim(),
        startDate: item.startDate.trim(),
        endDate: item.current ? "" : item.endDate.trim(),
        notes: item.notes.map((note) => note.trim()).filter(Boolean),
      })),
    };
    setStatus({ kind: "drafting" });
    try {
      const { resume, usedAI } = await api.draft(body);
      const named = name.trim()
        ? { ...resume, basics: { ...resume.basics, name: name.trim() } }
        : resume;
      onDrafted(named, usedAI);
    } catch (error) {
      if (gate.handleApiError(error, "draft")) setStatus({ kind: "editing" });
      else setStatus({ kind: "failed", message: describeError(t, error, ottoErrors) });
    }
  }

  const otto =
    status.kind === "drafting"
      ? t.otto.drafting
      : status.kind === "failed"
        ? status.message
        : screen === -1
          ? t.otto.role
          : t.otto.job;
  const isLast = screen === jobs.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <OttoNote
        message={otto}
        meta={screen >= 0 ? fmt(t.jobOf, { number: screen + 1, total: jobs.length }) : undefined}
      >
        {status.kind === "failed" ? (
          <Button variant="secondary" onClick={() => formRef.current?.requestSubmit()}>
            <RotateCcw />
            {t.tryAgain}
          </Button>
        ) : null}
      </OttoNote>

      <form
        ref={formRef}
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-6"
      >
        <fieldset disabled={drafting} className="flex min-w-0 flex-col gap-5">
          {screen === -1 ? (
            <>
              <legend className="sr-only">{t.role}</legend>
              <Field label={t.role} error={errors.role} hint={t.roleHint}>
                <Input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder={t.rolePlaceholder}
                  maxLength={200}
                  autoComplete="off"
                />
              </Field>
              <Field label={t.name} optional hint={t.nameHint}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                  autoComplete="name"
                />
              </Field>
            </>
          ) : job ? (
            <JobFields job={job} errors={errors} onChange={updateJob} t={t} />
          ) : null}
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (screen === -1 ? onCancel() : go(screen - 1))}
            disabled={drafting}
          >
            <ArrowLeft />
            {screen === -1 ? t.otherWays : t.back}
          </Button>
          {job && jobs.length > 1 ? (
            <Button type="button" variant="ghost" onClick={removeJob} disabled={drafting}>
              <X />
              {t.removeJob}
            </Button>
          ) : null}
          <span className="hidden flex-1 sm:block" />
          {job && isLast && jobs.length < DRAFT_LIMITS.jobs ? (
            <Button type="button" variant="secondary" onClick={addJob} disabled={drafting}>
              <Plus />
              {t.addJob}
            </Button>
          ) : null}
          <Button type="submit" loading={drafting}>
            {screen === -1 ? t.next : isLast ? (drafting ? t.writing : t.write) : t.nextJob}
          </Button>
        </div>
      </form>
      {drafting ? <OttoWorking task="draft" /> : null}
      {gate.dialogs}
    </div>
  );
}

type JobFieldsProps = {
  job: JobForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<JobForm>) => void;
  t: GuidedCopy;
};

function JobFields({ job, errors, onChange, t }: JobFieldsProps) {
  const setNote = (index: number, value: string) =>
    onChange({ notes: job.notes.map((note, k) => (k === index ? value : note)) });
  return (
    <>
      <legend className="sr-only">{t.oneJob}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.title} error={errors.title}>
          <Input
            value={job.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t.titlePlaceholder}
            maxLength={200}
          />
        </Field>
        <Field label={t.company} optional>
          <Input
            value={job.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="Contoso"
            maxLength={200}
          />
        </Field>
        <Field label={t.started} optional>
          <Input
            value={job.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            placeholder={t.startedPlaceholder}
            maxLength={50}
          />
        </Field>
        <Field label={t.ended} optional>
          <Input
            value={job.current ? t.present : job.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            placeholder={t.endedPlaceholder}
            maxLength={50}
            disabled={job.current}
          />
        </Field>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={job.current}
          onChange={(e) => onChange({ current: e.target.checked })}
          className="size-5 shrink-0 cursor-pointer accent-ink"
        />
        {t.current}
      </label>

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">{t.notes}</legend>
        <p className="-mt-1 text-sm text-muted">
          {fmt(t.notesHint, { min: MIN_NOTES, max: DRAFT_LIMITS.notesPerJob })}
        </p>
        {job.notes.map((note, index) => (
          <Field
            key={index}
            label={fmt(t.note, { number: index + 1 })}
            hideLabel
            error={index === 0 ? errors.notes : undefined}
          >
            <VoiceInput
              value={note}
              onChange={(e) => setNote(index, e.target.value)}
              onDictate={(text) => setNote(index, text)}
              placeholder={noteExample(t, index)}
              maxLength={DRAFT_LIMITS.noteChars}
            />
          </Field>
        ))}
        {job.notes.length < DRAFT_LIMITS.notesPerJob ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="self-start"
            onClick={() => onChange({ notes: [...job.notes, ""] })}
          >
            <Plus />
            {t.addNote}
          </Button>
        ) : null}
      </fieldset>
    </>
  );
}

function describeError(t: GuidedCopy, error: unknown, errors: OttoLines["errors"]): string {
  if (
    isApiError(error, "rate_limited") ||
    isApiError(error, "limit_reached") ||
    isApiError(error, "upgrade_required")
  ) {
    return error.message;
  }
  if (isApiError(error, "network_error")) return t.offline;
  if (isApiError(error, "bad_request")) return t.badForm;
  return errors.generic;
}
