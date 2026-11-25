"use client";

import { ChevronDown, ScanSearch, TriangleExclamationPoint, type LucideIcon } from "lucide-react";
import { useId, useState, type FormEvent, type RefObject } from "react";
import { EligibilityCard } from "@/components/eligibility/eligibility-card";
import { OttoWorking } from "@/components/mascot/otto-working";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { TEXT_LIMITS } from "@/config/plans";
import { useFormat } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { DAY_MS } from "@/lib/time";
import { cn } from "@/lib/utils";
import { HiringSystemNotes } from "./hiring-system-notes";
import { useJobFormCopy, type JobFormCopy } from "./job-form-copy";
import { RecentJobs } from "./recent-jobs-row";
import type { QueuedJob, ReadJob, TailorDraft } from "./session";
import { useJobLink } from "./use-job-link";
import { MIN_POST_CHARS } from "./use-tailor";

export { MIN_POST_CHARS };

const MAX_POST_CHARS = TEXT_LIMITS.jobPostChars;
const MAX_FIELD_CHARS = 200;
const QUIET_LINK = "min-h-11 self-start text-sm text-muted hover:text-ink";

export type JobFormProps = {
  draft: TailorDraft;
  onChange: (draft: TailorDraft) => void;
  onSubmit: () => void;
  busy: boolean;
  note?: string | null;
  queued?: QueuedJob | null;
  action?: { label: string; icon: LucideIcon };
  checks?: boolean;
  onPageLink?: () => void;
  // A pick sends the job at once, so only Tailor shows them, not the letter dialog.
  recent?: boolean;
};


function postProblem(t: JobFormCopy, format: Format, text: string): string | null {
  const length = text.trim().length;
  if (length === 0) return t.needsPost;
  if (length < MIN_POST_CHARS) return t.tooShort;
  if (length > MAX_POST_CHARS) return fmt(t.tooLong, { max: format.number(MAX_POST_CHARS) });
  return null;
}

const SHORT_DATE = { month: "short", day: "numeric" } as const;
const SHORT_DATE_YEAR = { month: "short", day: "numeric", year: "numeric" } as const;

function shortDate(format: Format, time: number, now: number): string {
  const date = new Date(time);
  const sameYear = now === 0 || date.getFullYear() === new Date(now).getFullYear();
  return format.date(date, sameYear ? SHORT_DATE : SHORT_DATE_YEAR);
}

function daysBetween(from: number, to: number): number {
  const day = (time: number) => {
    const date = new Date(time);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.round((day(to) - day(from)) / DAY_MS);
}

export function postedLine(
  t: JobFormCopy,
  format: Format,
  postedAt: number,
  now: number,
): string {
  const date = shortDate(format, postedAt, now);
  const days = now === 0 ? -1 : daysBetween(postedAt, now);
  if (days === 0) return t.postedToday;
  if (days === 1) return t.postedYesterday;
  return days > 1 ? fmt(t.postedDaysAgo, { date, days }) : fmt(t.postedOn, { date });
}

type JobCardProps = { job: ReadJob; link: string; onPasteInstead: () => void; checks: boolean };

function JobCard({ job, link, onPasteInstead, checks }: JobCardProps) {
  const now = useNow();
  const titleId = useId();
  const t = useJobFormCopy();
  const format = useFormat();
  const meta = [job.company, job.location].filter(Boolean).join(" · ");
  const closedOn =
    job.closesAt !== null && now !== 0 && job.closesAt < now
      ? shortDate(format, job.closesAt, now)
      : null;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-2xl bg-surface-muted p-4 sm:p-6"
    >
      <Eyebrow>{t.fromLink}</Eyebrow>
      <h3 id={titleId} className="mt-2 text-base/6 font-semibold text-ink">
        {job.title || t.untitled}
      </h3>
      {meta ? <p className="text-sm/6 text-muted">{meta}</p> : null}
      {job.firstPostedAt !== null ? (
        <p className="text-sm/6 text-subtle">{postedLine(t, format, job.firstPostedAt, now)}</p>
      ) : null}
      {closedOn ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm/6 text-warn-ink">
          <TriangleExclamationPoint className="size-4 shrink-0 text-warn" strokeWidth={1.75} />
          {fmt(t.closed, { date: closedOn })}
        </p>
      ) : null}
      <Button variant="link" onClick={onPasteInstead} className={cn("mt-1", QUIET_LINK)}>
        {t.pasteInstead}
      </Button>
      {checks ? (
        <HiringSystemNotes posting={job} link={link} className="mt-2 border-t border-border pt-1" />
      ) : null}
    </section>
  );
}

type SubmitRowProps = {
  busy: boolean;
  note?: string | null;
  onClick?: () => void;
  form?: string;
  action: { label: string; icon: LucideIcon };
};

function SubmitRow({ busy, note, onClick, form, action }: SubmitRowProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button
        type={onClick ? "button" : "submit"}
        form={form}
        size="lg"
        loading={busy}
        onClick={onClick}
        className="w-full sm:w-auto"
      >
        <action.icon />
        {action.label}
      </Button>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}

type PasteFieldsProps = JobFormProps & {
  postRef: RefObject<HTMLTextAreaElement | null>;
  readNote: string | null;
};

function PasteFields({
  draft,
  onChange,
  onSubmit,
  busy,
  note,
  postRef,
  readNote,
  action,
  checks = true,
}: PasteFieldsProps) {
  const [submitted, setSubmitted] = useState(false);
  const [openOptions] = useState(() => draft.title !== "" || draft.company !== "");
  const formId = useId();
  const t = useJobFormCopy();
  const format = useFormat();
  const problem = postProblem(t, format, draft.text);
  const length = draft.text.trim().length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (problem) {
      postRef.current?.focus();
      return;
    }
    onSubmit();
  }

  return (
    <div className="flex flex-col gap-5">
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        {readNote ? <Alert role="note">{readNote}</Alert> : null}
        {checks ? (
          <HiringSystemNotes
            posting={null}
            link={draft.link}
            className="rounded-2xl bg-surface-muted px-4 py-1 sm:px-6"
          />
        ) : null}
        <details open={openOptions} className="group">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-sm text-muted hover:text-ink">
            {t.moreOptions}
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={t.title} optional>
              <Input
                value={draft.title}
                maxLength={MAX_FIELD_CHARS}
                autoComplete="off"
                placeholder={t.titlePlaceholder}
                onChange={(event) => onChange({ ...draft, title: event.target.value })}
              />
            </Field>
            <Field label={t.company} optional>
              <Input
                value={draft.company}
                maxLength={MAX_FIELD_CHARS}
                autoComplete="off"
                placeholder={t.companyPlaceholder}
                onChange={(event) => onChange({ ...draft, company: event.target.value })}
              />
            </Field>
          </div>
        </details>
        <Field
          label={t.post}
          error={submitted ? problem : null}
          hint={
            <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span>{t.postHint}</span>
              <span
                className={cn(
                  "tabular-nums",
                  length > MAX_POST_CHARS && "font-medium text-fail-ink",
                )}
              >
                {format.number(length)} / {format.number(MAX_POST_CHARS)}
              </span>
            </span>
          }
        >
          <VoiceTextarea
            ref={postRef}
            value={draft.text}
            rows={10}
            spellCheck={false}
            placeholder={t.postPlaceholder}
            className="min-h-60"
            onChange={(event) => onChange({ ...draft, text: event.target.value })}
            onDictate={(text) => onChange({ ...draft, text })}
          />
        </Field>
      </form>
      {problem || !checks ? null : <EligibilityCard location="" text={draft.text} />}
      <SubmitRow busy={busy} note={note} form={formId} action={action ?? compareAction(t)} />
    </div>
  );
}

function compareAction(t: JobFormCopy) {
  return { label: t.compare, icon: ScanSearch };
}

export function JobForm(props: JobFormProps) {
  const t = useJobFormCopy();
  const { onSubmit, busy, note, checks = true, recent = false } = props;
  const action = props.action ?? compareAction(t);
  // Refs come out first: React's lint treats every field of an object holding refs as a ref.
  const { linkRef, postRef, ...job } = useJobLink(props);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void job.read();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field
          label={t.link}
          error={job.linkError}
          hint={job.linkError ? null : t.linkHint}
        >
          <Input
            ref={linkRef}
            type="url"
            inputMode="url"
            value={job.link}
            autoComplete="off"
            spellCheck={false}
            placeholder="https://"
            enterKeyHint="go"
            onChange={(event) => job.edit(event.target.value)}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").trim();
              if (!pasted || job.reading || busy) return;
              const whole =
                event.currentTarget.value.trim() === "" ||
                /^(https?:\/\/|www\.)/i.test(pasted) ||
                /\s/.test(pasted);
              if (!whole) return;
              event.preventDefault();
              job.pasteAndRead(pasted);
            }}
          />
        </Field>
        {job.reading ? (
          <OttoWorking task="job" size="sm" />
        ) : job.posting || job.pasting || !note ? null : (
          <p className="text-sm text-muted">{note}</p>
        )}
        {job.posting || job.pasting ? null : (
          <Button variant="link" onClick={job.pasteInstead} className={QUIET_LINK}>
            {t.noLink}
          </Button>
        )}
      </form>
      {recent && !job.posting && !job.pasting && !job.reading ? (
        <RecentJobs onPick={job.open} disabled={busy} />
      ) : null}

      <p aria-live="polite" className="sr-only">
        {job.status}
      </p>
      {job.posting ? (
        <>
          <JobCard
            job={job.posting}
            link={job.link}
            onPasteInstead={job.pasteInstead}
            checks={checks}
          />
          {checks ? (
            <EligibilityCard location={job.posting.location} text={props.draft.text} />
          ) : null}
          <SubmitRow busy={busy} note={note} onClick={onSubmit} action={action} />
        </>
      ) : null}
      {job.pasting ? <PasteFields {...props} postRef={postRef} readNote={job.readNote} /> : null}
    </div>
  );
}
