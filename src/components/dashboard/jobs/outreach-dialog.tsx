"use client";

import { ArrowUpRight, RotateCcw, Send, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { WritingStyleHint } from "@/components/settings/writing-style-hint";
import { writingAllowance } from "@/components/studio/tailor/writing-allowance";
import { useWriting } from "@/components/studio/tailor/use-writing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { TEXT_LIMITS } from "@/config/plans";
import { api } from "@/lib/api/client";
import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import { useStudioActions } from "../use-studio-actions";
import { OutreachFields, OutreachSaveStatus } from "./outreach-fields";
import { outreachKey, outreachLookup, type OutreachJob } from "./outreach-saved";
import { OutreachSend } from "./outreach-send";
import { useOutreachKeeper, type Kept, type OutreachActions } from "./use-outreach-keeper";

// Kept in step with the server: OutreachRequestSchema's shortest post.
const MIN_POST_CHARS = 80;

const TITLE = "Write an outreach message";

export type OutreachDialogProps = {
  job: OutreachJob | null;
  resume: Resume | null;
  onClose: () => void;
  onSaved?: (writing: Writing) => void;
};

export function OutreachDialog({ job, resume, onClose, onSaved }: OutreachDialogProps) {
  const { kept, actions } = useOutreachKeeper(onSaved);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  if (!job) return <Dialog open={false} onOpenChange={onClose} title={TITLE} />;
  const key = outreachKey(job);
  const unsaved = [...kept.values()].some(
    (item) => item.save === "saving" || item.save === "failed",
  );
  return (
    <OutreachFlow
      key={key}
      jobKey={key}
      job={job}
      resume={resume}
      onClose={onClose}
      kept={kept.get(key) ?? null}
      actions={actions}
      pending={pending.has(key)}
      keepPage={pending.size > 0 || unsaved}
      onPending={(busy) =>
        setPending((current) => {
          const next = new Set(current);
          if (busy) next.add(key);
          else next.delete(key);
          return next;
        })
      }
    />
  );
}

type Post = { status: "loading" | "ready" | "paste"; text: string };

function firstPost(job: OutreachJob, kept: Kept | null): Post {
  const known = (kept?.post || job.post || "").trim();
  if (known.length >= MIN_POST_CHARS) return { status: "ready", text: known };
  if (job.id || job.url.trim()) return { status: "loading", text: "" };
  return { status: "paste", text: known };
}

// An opening from the Jobs tab is read from our copy; a tracked application's link the way a pasted link is.
async function readPost(id: string | null, url: string): Promise<string> {
  if (id) return (await api.jobPost(id)).text.trim();
  return (await api.readJob({ url })).posting.text.trim();
}

type FlowProps = {
  jobKey: string;
  job: OutreachJob;
  // Null when this browser has no resume: a kept message still opens, but a new one can't be written.
  resume: Resume | null;
  onClose: () => void;
  kept: Kept | null;
  actions: OutreachActions;
  pending: boolean;
  // True while a write runs or a message isn't saved yet, which leaving the page would drop.
  keepPage: boolean;
  onPending: (busy: boolean) => void;
};

function OutreachFlow({
  jobKey,
  job,
  resume,
  onClose,
  kept,
  actions,
  pending,
  keepPage,
  onPending,
}: FlowProps) {
  const { user, me, loading } = useMe();
  const studio = useStudioActions();
  const message = kept?.draft ?? null;
  const [post, setPost] = useState<Post>(() => firstPost(job, kept));
  // A message reopened from this page keeps the post it came from, so its addresses show at once.
  const [mustRead] = useState(() => firstPost(job, kept).status === "loading");
  const [lookup] = useState(() => (kept ? null : outreachLookup(job)));
  const [checking, setChecking] = useState(lookup !== null);
  const [askPost, setAskPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const postRef = useRef<HTMLTextAreaElement>(null);
  // useWriting reads its own resume only for line fixes, which this dialog doesn't make.
  const [blank] = useState(() => emptyResume());
  const writing = useWriting(resume ?? blank, {
    title: job.title,
    company: job.company,
    text: post.text,
    link: job.url,
  });
  const jobId = job.id;
  const jobUrl = job.url;
  const usable = resume !== null || message !== null;

  useEffect(() => {
    if (!mustRead || !usable) return;
    let live = true;
    readPost(jobId, jobUrl)
      .then((text) => {
        const ready = text.length >= MIN_POST_CHARS;
        if (ready) actions.readPost(jobKey, text);
        if (live) setPost({ status: ready ? "ready" : "paste", text });
      })
      .catch(() => {
        if (live) setPost({ status: "paste", text: "" });
      });
    return () => {
      live = false;
    };
  }, [actions, jobId, jobKey, jobUrl, mustRead, usable]);

  useEffect(() => {
    if (!lookup) return;
    let live = true;
    api
      .outreachWriting(lookup)
      .then(({ writing: found }) => {
        if (!found) return;
        actions.found(jobKey, found);
        // The button focus started on goes away when the kept message replaces it.
        requestAnimationFrame(() => {
          if (live && document.activeElement === document.body) subjectRef.current?.focus();
        });
      })
      // A failed look leaves the dialog empty, ready to write one.
      .catch(() => undefined)
      .finally(() => {
        if (live) setChecking(false);
      });
    return () => {
      live = false;
    };
  }, [actions, jobKey, lookup]);

  const busy = writing.busy === "outreach" || pending;
  const failed = writing.error?.task === "outreach" ? writing.error.message : null;
  // A failed write may be the post's fault, so the post Otto read becomes editable.
  const showPost =
    post.status !== "loading" &&
    (message ? askPost || failed !== null : post.status === "paste" || failed !== null);
  const reading = post.status === "loading" && usable;
  const waiting = reading || checking;
  const noResume = !resume && !message && !checking;
  const allowance = loading
    ? null
    : writingAllowance(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);
  const source = kept?.resumeTitle || (resume ? resumeTitle(resume) : "");
  const role = job.title.trim() || "this role";
  const company = job.company.trim();

  async function write() {
    if (!resume || busy || waiting) return;
    if (post.text.trim().length < MIN_POST_CHARS) {
      setAskPost(true);
      setPostError(
        post.text.trim()
          ? "That's too short to be the whole post. Paste all of it."
          : "Paste the job post first.",
      );
      requestAnimationFrame(() => postRef.current?.focus());
      return;
    }
    const first = message === null;
    const sent = post.text;
    onPending(true);
    try {
      const result = await writing.outreach(resume);
      if (!result) return;
      actions.written(
        jobKey,
        { job, resume: { id: resume.id, title: resumeTitle(resume) } },
        result,
        sent,
      );
      setAskPost(false);
      // Focus would otherwise fall to the page behind the dialog when the button it was on goes away.
      if (first) requestAnimationFrame(() => subjectRef.current?.focus());
    } finally {
      onPending(false);
    }
  }

  const status = (
    <>
      {busy ? <OttoWorking task="outreach" size="sm" /> : null}
      {failed ? <Alert variant="error">{failed}</Alert> : null}
    </>
  );

  const postField = showPost ? (
    <div className="flex flex-col gap-2">
      <Field
        label="The job post"
        hint={
          post.status === "paste"
            ? "Otto couldn't read this post. Open the job and paste its description here."
            : "This is the post Otto read. Trim it to the job description, then try again."
        }
        error={postError}
      >
        <Textarea
          ref={postRef}
          rows={6}
          maxLength={TEXT_LIMITS.jobPostChars}
          value={post.text}
          onChange={(event) => {
            setPost({ status: "paste", text: event.target.value });
            setPostError(null);
          }}
        />
      </Field>
      {job.url.trim() ? (
        <a
          href={job.url}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink underline decoration-border-strong underline-offset-4"
        >
          Open the job
          <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">
            (opens {company || "the company"}&apos;s posting in a new tab)
          </span>
        </a>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => {
          if (next) return;
          actions.flush(jobKey);
          onClose();
        }}
        size="lg"
        title={message ? "Your outreach message" : TITLE}
        illustration={
          <OttoNote
            size="sm"
            live={false}
            message={
              noResume
                ? OTTO.letters.noResume
                : "I'll write a short email and a LinkedIn note from your resume and this job, nothing made up."
            }
          />
        }
      >
        {noResume ? (
          <Button variant="secondary" className="self-start" onClick={studio.upload}>
            <Upload aria-hidden />
            Upload a resume
          </Button>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm/6 text-pretty text-muted">
                For <span className="font-medium text-ink">{role}</span>
                {company ? (
                  <>
                    {" "}
                    at <span className="font-medium text-ink">{company}</span>
                  </>
                ) : null}
                {source ? (
                  <>
                    , from <span className="font-medium text-ink">{source}</span>
                  </>
                ) : null}
                . Send it to the hiring manager, someone on the team, or a founder at a small
                company.
              </p>
              <WritingStyleHint linked={!(keepPage || busy)} />
            </div>

            {waiting && !message ? (
              reading ? (
                <OttoWorking task="job" size="sm" />
              ) : (
                <OttoWorking
                  task="job"
                  size="sm"
                  message="Checking for a message you already wrote."
                />
              )
            ) : null}
            {message || !resume ? null : postField}

            {message || !resume ? null : (
              <div className="flex flex-col items-start gap-2">
                <Button
                  data-autofocus
                  loading={busy}
                  aria-disabled={waiting || undefined}
                  onClick={() => void write()}
                >
                  <Send aria-hidden />
                  Write my message
                </Button>
                {allowance ? <p className="text-sm text-pretty text-muted">{allowance}</p> : null}
              </div>
            )}

            {message ? null : status}

            {kept && message ? (
              <>
                <OutreachFields
                  message={message}
                  subjectRef={subjectRef}
                  onEdit={(field, value) => actions.edit(jobKey, field, value)}
                  onSettle={() => actions.flush(jobKey)}
                />
                <OutreachSaveStatus
                  save={kept.save}
                  error={kept.error}
                  onRetry={() => actions.retry(jobKey)}
                />

                <OutreachSend
                  company={job.company}
                  title={job.title}
                  postText={kept.post || (post.status === "ready" ? post.text : "")}
                  message={message}
                />

                <div className="flex flex-col gap-3">
                  {resume ? (
                    <>
                      {postField}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start"
                        loading={busy || post.status === "loading"}
                        onClick={() => void write()}
                      >
                        <RotateCcw aria-hidden />
                        Write a new one
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onClick={studio.upload}
                    >
                      <Upload aria-hidden />
                      Upload a resume to write a new one
                    </Button>
                  )}
                  {status}
                </div>
              </>
            ) : null}
          </div>
        )}
      </Dialog>
      {/* Outside the dialog: a native <dialog> inside another passes its close events up. */}
      {writing.dialogs}
    </>
  );
}
