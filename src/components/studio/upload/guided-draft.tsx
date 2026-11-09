"use client";

import { ArrowLeft, Plus, RotateCcw, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAccountGate } from "@/components/account/account-gate";
import { api, isApiError } from "@/lib/api/client";
import { DRAFT_LIMITS, type DraftRequestBody } from "@/lib/api/types";
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

const NOTE_EXAMPLES = [
  "Answered about 40 customer emails a day",
  "Trained 3 new team members",
  "Set up a weekly sales report in Excel",
  "Cut stock waste by checking orders twice a week",
];
const MIN_NOTES = 2;

function emptyJob(): JobForm {
  return { company: "", title: "", startDate: "", endDate: "", current: false, notes: ["", ""] };
}

// "Build with Otto": the role someone wants, then one screen per job, then an AI first draft.
// Their name stays in the browser; only the role and the jobs go to the server.
export function GuidedDraft({ onDrafted, onCancel }: GuidedDraftProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [jobs, setJobs] = useState<JobForm[]>(() => [emptyJob()]);
  // -1 is the role screen; 0..n-1 are the jobs.
  const [screen, setScreen] = useState(-1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "editing" });
  const formRef = useRef<HTMLFormElement>(null);
  // A signed-in account at its monthly limit gets the next plan up, one click from checkout.
  const gate = useAccountGate();

  const job = screen >= 0 ? jobs[screen] : undefined;
  const drafting = status.kind === "drafting";

  function updateJob(patch: Partial<JobForm>) {
    setJobs((list) => list.map((item, index) => (index === screen ? { ...item, ...patch } : item)));
  }

  function validate(): boolean {
    const found: Record<string, string> = {};
    if (screen === -1 && !role.trim()) found.role = "Tell Otto the job you want, like “Data analyst”.";
    if (job) {
      if (!job.title.trim()) found.title = "Add your job title.";
      if (!job.notes.some((note) => note.trim())) found.notes = "Add at least one thing you did.";
    }
    setErrors(found);
    // Focus the first problem so keyboard and screen reader users land on it.
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
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
      const named = name.trim() ? { ...resume, basics: { ...resume.basics, name: name.trim() } } : resume;
      onDrafted(named, usedAI);
    } catch (error) {
      // The sign-in or trial prompt opens instead; the form keeps every answer for the retry.
      if (gate.handleApiError(error, "draft")) setStatus({ kind: "editing" });
      else setStatus({ kind: "failed", message: describeError(error) });
    }
  }

  const otto =
    status.kind === "drafting"
      ? "Writing your first draft now. I only use what you told me."
      : status.kind === "failed"
        ? status.message
        : screen === -1
          ? "Let's build it together. First, what job do you want next?"
          : "Tell me about one job, internship or volunteer role. Numbers help, if you know them.";
  const isLast = screen === jobs.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <OttoNote message={otto} meta={screen >= 0 ? `Job ${screen + 1} of ${jobs.length}` : undefined}>
        {status.kind === "failed" ? (
          <Button variant="outline" onClick={() => formRef.current?.requestSubmit()}>
            <RotateCcw />
            Try again
          </Button>
        ) : null}
      </OttoNote>

      <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-6">
        <fieldset disabled={drafting} className="flex min-w-0 flex-col gap-5">
          {screen === -1 ? (
            <>
              <legend className="sr-only">The job you want</legend>
              <Field label="The job you want" error={errors.role} hint="One job title is enough.">
                <Input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Customer success manager"
                  maxLength={200}
                  autoComplete="off"
                 
                />
              </Field>
              <Field label="Your name" optional hint="It goes on the resume. Otto's AI never sees it.">
                <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} autoComplete="name" />
              </Field>
            </>
          ) : job ? (
            <JobFields job={job} errors={errors} onChange={updateJob} />
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
            {screen === -1 ? "Other ways to start" : "Back"}
          </Button>
          {job && jobs.length > 1 ? (
            <Button type="button" variant="ghost" onClick={removeJob} disabled={drafting}>
              <X />
              Remove this job
            </Button>
          ) : null}
          <span className="hidden flex-1 sm:block" />
          {job && isLast && jobs.length < DRAFT_LIMITS.jobs ? (
            <Button type="button" variant="outline" onClick={addJob} disabled={drafting}>
              <Plus />
              Add another job
            </Button>
          ) : null}
          <Button type="submit" loading={drafting}>
            {screen === -1 ? "Next" : isLast ? (drafting ? "Writing…" : "Write my draft") : "Next job"}
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
};

function JobFields({ job, errors, onChange }: JobFieldsProps) {
  const setNote = (index: number, value: string) =>
    onChange({ notes: job.notes.map((note, k) => (k === index ? value : note)) });
  return (
    <>
      <legend className="sr-only">One job</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" error={errors.title}>
          <Input value={job.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Support specialist" maxLength={200} />
        </Field>
        <Field label="Company" optional>
          <Input value={job.company} onChange={(e) => onChange({ company: e.target.value })} placeholder="Contoso" maxLength={200} />
        </Field>
        <Field label="Started" optional>
          <Input value={job.startDate} onChange={(e) => onChange({ startDate: e.target.value })} placeholder="Mar 2023" maxLength={50} />
        </Field>
        <Field label="Ended" optional>
          <Input
            value={job.current ? "Present" : job.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            placeholder="Jan 2025"
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
        I work here now
      </label>

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Things you did</legend>
        <p className="-mt-1 text-sm text-muted">
          {`${MIN_NOTES} to ${DRAFT_LIMITS.notesPerJob}, in your own words. Add numbers you know; Otto marks the ones to fill in.`}
        </p>
        {job.notes.map((note, index) => (
          <Field key={index} label={`Thing you did ${index + 1}`} hideLabel error={index === 0 ? errors.notes : undefined}>
            <Input
              value={note}
              onChange={(e) => setNote(index, e.target.value)}
              placeholder={NOTE_EXAMPLES[index]}
              maxLength={DRAFT_LIMITS.noteChars}
            />
          </Field>
        ))}
        {job.notes.length < DRAFT_LIMITS.notesPerJob ? (
          <Button type="button" variant="link" size="sm" className="self-start" onClick={() => onChange({ notes: [...job.notes, ""] })}>
            <Plus />
            Add one more
          </Button>
        ) : null}
      </fieldset>
    </>
  );
}

function describeError(error: unknown): string {
  if (
    isApiError(error, "rate_limited") ||
    isApiError(error, "limit_reached") ||
    isApiError(error, "upgrade_required")
  ) {
    return error.message;
  }
  if (isApiError(error, "network_error")) return "I can't reach the server. Check your connection and try again.";
  if (isApiError(error, "bad_request")) return "Something in the form didn't come through. Check each job and try again.";
  return OTTO.errors.generic;
}
