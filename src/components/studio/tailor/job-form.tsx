"use client";

import { ChevronDown, ScanSearch, TriangleExclamationPoint } from "lucide-react";
import { useId, useState, type FormEvent, type RefObject } from "react";
import { EligibilityCard } from "@/components/eligibility/eligibility-card";
import { OTTO } from "@/components/mascot/lines";
import { OttoWorking } from "@/components/mascot/otto-working";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEXT_LIMITS } from "@/config/plans";
import { cn } from "@/lib/utils";
import { HiringSystemNotes } from "./hiring-system-notes";
import type { ReadJob, TailorDraft } from "./session";
import { MIN_POST_CHARS, useJobLink } from "./use-tailor";

export { MIN_POST_CHARS };

const MAX_POST_CHARS = TEXT_LIMITS.jobPostChars;
const MAX_FIELD_CHARS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const QUIET_LINK = "min-h-11 self-start text-sm text-muted hover:text-ink";

export type JobFormProps = {
  draft: TailorDraft;
  onChange: (draft: TailorDraft) => void;
  onSubmit: () => void;
  busy: boolean;
  // e.g. "2 of 3 free tailored versions left this month."
  note?: string | null;
};

function postProblem(text: string): string | null {
  const length = text.trim().length;
  if (length === 0) return OTTO.tailor.needsPost;
  if (length < MIN_POST_CHARS) {
    return "That's a bit short. Paste the whole job post, not just the title.";
  }
  if (length > MAX_POST_CHARS) {
    return `That's over ${MAX_POST_CHARS.toLocaleString()} characters. Cut the company intro or the benefits, then try again.`;
  }
  return null;
}

function shortDate(time: number, now: number): string {
  const date = new Date(time);
  const sameYear = now === 0 || date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// Calendar days where the person is, so a job posted late yesterday reads as "yesterday".
function daysBetween(from: number, to: number): number {
  const day = (time: number) => {
    const date = new Date(time);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.round((day(to) - day(from)) / DAY_MS);
}

/** "First posted Jul 22 (108 days ago)". `now` is 0 before the clock is known. */
export function postedLine(postedAt: number, now: number): string {
  const date = shortDate(postedAt, now);
  const days = now === 0 ? -1 : daysBetween(postedAt, now);
  if (days === 0) return "First posted today";
  if (days === 1) return "First posted yesterday";
  return days > 1 ? `First posted ${date} (${days} days ago)` : `First posted ${date}`;
}

type JobCardProps = { job: ReadJob; link: string; onPasteInstead: () => void };

function JobCard({ job, link, onPasteInstead }: JobCardProps) {
  const now = useNow();
  const titleId = useId();
  const meta = [job.company, job.location].filter(Boolean).join(" · ");
  const closedOn =
    job.closesAt !== null && now !== 0 && job.closesAt < now ? shortDate(job.closesAt, now) : null;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-2xl bg-surface-muted p-4 sm:p-6"
    >
      <Eyebrow>From the link</Eyebrow>
      <h3 id={titleId} className="mt-2 text-base/6 font-semibold text-ink">
        {job.title || "Untitled job"}
      </h3>
      {meta ? <p className="text-sm/6 text-muted">{meta}</p> : null}
      {/* Only the first posting date: an edit date would make an old job look new. */}
      {job.firstPostedAt !== null ? (
        <p className="text-sm/6 text-subtle">{postedLine(job.firstPostedAt, now)}</p>
      ) : null}
      {closedOn ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm/6 text-warn-ink">
          <TriangleExclamationPoint className="size-4 shrink-0 text-warn" strokeWidth={1.75} />
          The post says it closed {closedOn}.
        </p>
      ) : null}
      <Button variant="link" onClick={onPasteInstead} className={cn("mt-1", QUIET_LINK)}>
        Not right? Paste the text instead
      </Button>
      <HiringSystemNotes posting={job} link={link} className="mt-2 border-t border-border pt-1" />
    </section>
  );
}

// form: the id of the form it submits when it sits outside it.
type SubmitRowProps = { busy: boolean; note?: string | null; onClick?: () => void; form?: string };

function SubmitRow({ busy, note, onClick, form }: SubmitRowProps) {
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
        <ScanSearch />
        Compare with my resume
      </Button>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}

type PasteFieldsProps = JobFormProps & {
  postRef: RefObject<HTMLTextAreaElement | null>;
  // Why the link couldn't be read, when that is how the person got here.
  readNote: string | null;
};

// The backup: the job typed or pasted in by hand. Mounts fresh each time it opens, so its errors
// wait for that opening's first submit.
function PasteFields({
  draft,
  onChange,
  onSubmit,
  busy,
  note,
  postRef,
  readNote,
}: PasteFieldsProps) {
  const [submitted, setSubmitted] = useState(false);
  // Read once: the browser owns the open state after that, so clearing both fields while typing
  // never folds them away.
  const [openOptions] = useState(() => draft.title !== "" || draft.company !== "");
  const formId = useId();
  const problem = postProblem(draft.text);
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

  // The eligibility card holds its own form (the work profile dialog), so it sits after this form
  // instead of inside it, and the submit button joins the form by id.
  return (
    <div className="flex flex-col gap-5">
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        {/* The form's live status already announces it. */}
        {readNote ? <Alert role="note">{readNote}</Alert> : null}
        {/* A link that couldn't be read can still name the hiring system in its address. */}
        <HiringSystemNotes
          posting={null}
          link={draft.link}
          className="rounded-2xl bg-surface-muted px-4 py-1 sm:px-6"
        />
        {/* Otto reads the title and company from the post; these only override it. */}
        <details open={openOptions} className="group">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-sm text-muted hover:text-ink">
            More options
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Job title" optional>
              <Input
                value={draft.title}
                maxLength={MAX_FIELD_CHARS}
                autoComplete="off"
                placeholder="e.g. Product Designer"
                onChange={(event) => onChange({ ...draft, title: event.target.value })}
              />
            </Field>
            <Field label="Company" optional>
              <Input
                value={draft.company}
                maxLength={MAX_FIELD_CHARS}
                autoComplete="off"
                placeholder="e.g. Shopify"
                onChange={(event) => onChange({ ...draft, company: event.target.value })}
              />
            </Field>
          </div>
        </details>
        <Field
          label="Job post"
          error={submitted ? problem : null}
          hint={
            <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span>Paste all of it: duties, requirements and nice-to-haves.</span>
              <span
                className={cn(
                  "tabular-nums",
                  length > MAX_POST_CHARS && "font-medium text-fail-ink",
                )}
              >
                {length.toLocaleString()} / {MAX_POST_CHARS.toLocaleString()}
              </span>
            </span>
          }
        >
          <Textarea
            ref={postRef}
            value={draft.text}
            rows={10}
            spellCheck={false}
            placeholder="Paste the job post here"
            className="min-h-60"
            onChange={(event) => onChange({ ...draft, text: event.target.value })}
          />
        </Field>
      </form>
      {problem ? null : <EligibilityCard location="" text={draft.text} />}
      <SubmitRow busy={busy} note={note} form={formId} />
    </div>
  );
}

// One link field: Otto reads the job and goes straight on to comparing. The title, company and
// text fields only open as the backup, or when the person asks for them.
export function JobForm(props: JobFormProps) {
  const { onSubmit, busy, note } = props;
  // Refs come out first: the React lint rules treat every field of an object holding refs as a
  // ref, and the rest of `job` is read during render.
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
          label="Job link"
          error={job.linkError}
          hint={
            job.linkError
              ? null
              : "Paste the link and Otto reads it at once. Works with most job sites, but not LinkedIn or Indeed."
          }
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
              // A whole link (or a whole post) replaces the field; a fragment pasted into a
              // half-typed link is left to the browser.
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
            No link? Paste the job text
          </Button>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {job.status}
      </p>
      {job.posting ? (
        <>
          <JobCard job={job.posting} link={job.link} onPasteInstead={job.pasteInstead} />
          <EligibilityCard location={job.posting.location} text={props.draft.text} />
          <SubmitRow busy={busy} note={note} onClick={onSubmit} />
        </>
      ) : null}
      {job.pasting ? <PasteFields {...props} postRef={postRef} readNote={job.readNote} /> : null}
    </div>
  );
}
